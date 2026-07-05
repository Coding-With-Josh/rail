#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <TinyGPS++.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ── Display ──────────────────────────────────────────────────────────────────
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET   -1
Adafruit_SH1106G display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ── Persistent storage ───────────────────────────────────────────────────────
Preferences prefs;
#define PREF_NS        "rail"
#define KEY_DEVICE_ID  "deviceId"
#define KEY_SECRET     "secret"
#define KEY_TOKEN      "token"
#define KEY_REFRESH    "refresh"

// ── Hardware ID ──────────────────────────────────────────────────────────────
String hardwareId() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "ESP32-%02X%02X%02X%02X%02X%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

// ── Device state ─────────────────────────────────────────────────────────────
enum DeviceState { BOOT, WIFI_CONNECT, BOOTSTRAPPING, PAIRING, WAITING_APPROVAL, GETTING_TOKEN, ACTIVE, ERROR_STATE };
DeviceState state = BOOT;

String pairingCode = "";
String deviceId    = "";
String deviceSecret= "";
String accessToken = "";
String refreshToken= "";

// ── GPS (NEO-6M on UART2) ────────────────────────────────────────────────────
#define GPS_RX_PIN 16   // ESP32 RX2  <- GPS TX  (data flows GPS -> ESP32)
#define GPS_TX_PIN 17   // ESP32 TX2  -> GPS RX
#define GPS_BAUD   9600 // NEO-6M default

TinyGPSPlus  gps;
HardwareSerial GPSserial(2);   // use hardware UART2
double lastLat = 0.0, lastLng = 0.0;
bool   hasFix  = false;

// Pump every available byte from the GPS into the parser. MUST be called often —
// the UART RX buffer overflows (and we drop fixes) if we block for too long.
void feedGps() {
  while (GPSserial.available() > 0) gps.encode(GPSserial.read());
  if (gps.location.isValid()) {
    lastLat = gps.location.lat();
    lastLng = gps.location.lng();
    hasFix  = true;
  }
}

// delay() replacement that keeps draining the GPS while we wait.
void smartDelay(unsigned long ms) {
  unsigned long start = millis();
  do { feedGps(); } while (millis() - start < ms);
}

// ── UI helpers ────────────────────────────────────────────────────────────────

// Small WiFi icon (8x8)
static const unsigned char PROGMEM wifi_icon[] = {
  0x1C, 0x22, 0x41, 0x1C, 0x22, 0x00, 0x08, 0x00
};

// Small check icon (8x8)
static const unsigned char PROGMEM check_icon[] = {
  0x00, 0x01, 0x03, 0x46, 0x4C, 0x38, 0x10, 0x00
};

// Small lock icon (8x8)
static const unsigned char PROGMEM lock_icon[] = {
  0x18, 0x24, 0x24, 0x7E, 0x7E, 0x66, 0x66, 0x7E
};

// Small signal icon (8x8)
static const unsigned char PROGMEM signal_icon[] = {
  0x00, 0x40, 0x60, 0x70, 0x78, 0x7C, 0x7E, 0x7F
};

void drawProgressBar(int x, int y, int w, int h, int pct) {
  display.drawRect(x, y, w, h, SH110X_WHITE);
  int fill = ((w - 2) * pct) / 100;
  if (fill > 0) display.fillRect(x + 1, y + 1, fill, h - 2, SH110X_WHITE);
}

void drawSpinner(int x, int y, int frame) {
  const char* frames[] = {"|", "/", "-", "\\"};
  display.setCursor(x, y);
  display.print(frames[frame % 4]);
}

// Animated dots (0-3)
void drawDots(int x, int y, int frame) {
  for (int i = 0; i < 3; i++) {
    if (i <= (frame % 4)) display.fillCircle(x + i * 6, y, 1, SH110X_WHITE);
    else display.drawCircle(x + i * 6, y, 1, SH110X_WHITE);
  }
}

void drawHeader(const char* title) {
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.print(F("RAIL"));
  // right-align title
  int tx = SCREEN_WIDTH - strlen(title) * 6;
  display.setCursor(tx, 0);
  display.print(title);
  display.drawFastHLine(0, 10, SCREEN_WIDTH, SH110X_WHITE);
}

void drawStatusLine(int y, const char* label, const char* value, bool ok = true) {
  display.setTextSize(1);
  display.setCursor(0, y);
  display.print(label);
  if (ok) display.drawBitmap(SCREEN_WIDTH - 10, y, check_icon, 8, 8, SH110X_WHITE);
  else {
    display.setCursor(SCREEN_WIDTH - 12, y);
    display.print(F(".."));
  }
  if (value && strlen(value) > 0) {
    display.setCursor(0, y + 9);
    display.setTextColor(SH110X_WHITE);
    display.print(value);
  }
}

// ── Screens ───────────────────────────────────────────────────────────────────

void screenBoot(int frame) {
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);

  // Big RAIL logo
  display.setTextSize(3);
  display.setCursor(28, 10);
  display.print(F("RAIL"));

  display.setTextSize(1);
  display.setCursor(22, 38);
  display.print(F("Device Runtime v1.0"));

  // Animated dots
  drawDots(56, 56, frame);
  display.display();
}

void screenWifi(int frame, int progress) {
  display.clearDisplay();
  drawHeader("WIFI");

  display.drawBitmap(0, 14, wifi_icon, 8, 8, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 15);
  display.print(F("Connecting"));
  drawDots(90, 19, frame);

  display.setCursor(0, 28);
  display.print(F("SSID: "));
  display.print(WIFI_SSID);

  drawProgressBar(0, 42, SCREEN_WIDTH, 8, progress);

  display.setCursor(0, 54);
  display.print(F("Please wait..."));
  display.display();
}

void screenWifiOk() {
  display.clearDisplay();
  drawHeader("WIFI");

  display.drawBitmap(0, 14, wifi_icon, 8, 8, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 15);
  display.print(F("Connected!"));

  display.setCursor(0, 28);
  display.print(F("IP: "));
  display.print(WiFi.localIP());

  drawProgressBar(0, 42, SCREEN_WIDTH, 8, 100);
  display.drawBitmap(SCREEN_WIDTH - 10, 42, check_icon, 8, 8, SH110X_WHITE);
  display.display();
  delay(1200);
}

void screenBootstrapping(int frame) {
  display.clearDisplay();
  drawHeader("INIT");

  display.drawBitmap(0, 14, signal_icon, 8, 8, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 15);
  display.print(F("Registering device"));
  drawDots(90, 19, frame);

  display.setCursor(0, 30);
  display.print(F("ID: "));
  String hid = hardwareId();
  display.print(hid.substring(0, 18));

  drawSpinner(60, 48, frame);
  display.setCursor(0, 48);
  display.print(F("Contacting API"));
  display.display();
}

void screenPairing() {
  display.clearDisplay();
  drawHeader("PAIR");

  display.setTextSize(1);
  display.setCursor(0, 14);
  display.print(F("Pairing code:"));

  // Big pairing code
  display.setTextSize(2);
  int cx = (SCREEN_WIDTH - pairingCode.length() * 12) / 2;
  display.setCursor(cx, 26);
  display.print(pairingCode);

  display.setTextSize(1);
  display.setCursor(0, 46);
  display.print(F("Approve in dashboard"));

  display.drawRect(0, 44, SCREEN_WIDTH, 12, SH110X_WHITE);
  display.display();
}

void screenWaitingApproval(int frame) {
  display.clearDisplay();
  drawHeader("PAIR");

  display.setTextSize(2);
  int cx = (SCREEN_WIDTH - pairingCode.length() * 12) / 2;
  display.setCursor(cx, 14);
  display.print(pairingCode);

  display.setTextSize(1);
  display.setCursor(0, 34);
  display.print(F("Waiting for admin"));
  drawDots(104, 38, frame);

  // Animated progress bar (bouncing)
  int pos = (frame * 4) % (SCREEN_WIDTH - 20);
  display.fillRect(pos, 48, 20, 4, SH110X_WHITE);
  display.drawRect(0, 46, SCREEN_WIDTH, 8, SH110X_WHITE);

  display.display();
}

void screenGettingToken(int frame) {
  display.clearDisplay();
  drawHeader("AUTH");

  display.drawBitmap(0, 14, lock_icon, 8, 8, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 15);
  display.print(F("Authenticating"));
  drawDots(90, 19, frame);

  display.setCursor(0, 30);
  display.print(F("Device: "));
  display.print(deviceId.substring(0, 12));

  drawProgressBar(0, 44, SCREEN_WIDTH, 8, min(100, frame * 10));
  display.display();
}

void screenActive() {
  display.clearDisplay();
  drawHeader("LIVE");

  display.drawBitmap(0, 14, check_icon, 8, 8, SH110X_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 15);
  display.print(F("Device online"));

  display.setCursor(0, 28);
  display.print(F("ID: "));
  display.print(deviceId);

  display.setCursor(0, 40);
  if (hasFix) {
    display.print(lastLat, 5);
    display.print(F(","));
    display.print(lastLng, 5);
  } else {
    display.print(F("GPS: acquiring..."));
  }

  display.setCursor(0, 52);
  display.print(F("Sats: "));
  display.print((unsigned long)gps.satellites.value());
  display.display();
}

void screenError(const char* msg) {
  display.clearDisplay();
  drawHeader("ERR");

  display.setTextSize(1);
  display.setCursor(0, 16);
  display.print(F("! Error"));

  display.setCursor(0, 30);
  display.print(msg);

  display.setCursor(0, 50);
  display.print(F("Restarting in 5s..."));
  display.display();
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

// Build a full URL from API_URL + path, tolerating a trailing slash on the
// base and/or a missing leading slash on the path. Without this, a stray
// trailing slash in credentials.ini produces "//device/..." which Fastify
// treats as a different (non-existent) route and returns 404.
String apiUrl(const String& path) {
  String base = String(API_URL);
  while (base.endsWith("/")) base.remove(base.length() - 1);
  String p = path;
  if (!p.startsWith("/")) p = "/" + p;
  return base + p;
}

String apiPost(const char* path, const String& body) {
  HTTPClient http;
  String url = apiUrl(path);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  if (accessToken.length() > 0) {
    http.addHeader("Authorization", "Bearer " + accessToken);
  }
  int code = http.POST(body);
  String resp = (code > 0) ? http.getString() : "";
  http.end();
  Serial.printf("[HTTP] %s -> %d\n", path, code);
  return resp;
}

// ── State machine ─────────────────────────────────────────────────────────────

void doBootstrap() {
  JsonDocument doc;
  doc["hardwareId"]      = hardwareId();
  doc["firmwareVersion"] = "1.0.0";
  JsonArray caps = doc["capabilities"].to<JsonArray>();
  caps.add("display");
  caps.add("wifi");

  String body;
  serializeJson(doc, body);
  String resp = apiPost("/device/bootstrap", body);

  if (resp.length() == 0) { state = ERROR_STATE; return; }

  JsonDocument res;
  if (deserializeJson(res, resp) || !res["pairingCode"].is<const char*>()) {
    state = ERROR_STATE; return;
  }

  pairingCode = res["pairingCode"].as<String>();
  state = PAIRING;
}

void doPollForApproval() {
  HTTPClient http;
  String url = apiUrl("/device/pairing/status?code=" + pairingCode);
  http.begin(url);
  int code = http.GET();
  if (code <= 0) { http.end(); return; }

  String resp = http.getString();
  http.end();
  Serial.printf("[HTTP] /device/pairing/status -> %d\n", code);

  JsonDocument res;
  if (deserializeJson(res, resp)) return;

  const char* stateStr = res["state"] | "";
  if (strcmp(stateStr, "approved") != 0) return;

  const char* id  = res["deviceId"] | "";
  const char* sec = res["secret"]   | "";
  if (strlen(id) == 0 || strlen(sec) == 0) return;

  deviceId     = String(id);
  deviceSecret = String(sec);

  prefs.begin(PREF_NS, false);
  prefs.putString(KEY_DEVICE_ID, deviceId);
  prefs.putString(KEY_SECRET,    deviceSecret);
  prefs.end();

  state = GETTING_TOKEN;
}

void doGetToken() {
  JsonDocument doc;
  doc["deviceId"] = deviceId;
  doc["secret"]   = deviceSecret;

  String body;
  serializeJson(doc, body);
  String resp = apiPost("/device/token", body);

  if (resp.length() == 0) { state = ERROR_STATE; return; }

  JsonDocument res;
  if (deserializeJson(res, resp)) { state = ERROR_STATE; return; }

  if (res["error"].is<const char*>()) {
    Serial.println(res["error"].as<String>());
    state = ERROR_STATE; return;
  }

  accessToken  = res["accessToken"].as<String>();
  refreshToken = res["refreshToken"].as<String>();

  prefs.begin(PREF_NS, false);
  prefs.putString(KEY_TOKEN,   accessToken);
  prefs.putString(KEY_REFRESH, refreshToken);
  prefs.end();

  state = ACTIVE;
}

void doHeartbeat() {
  JsonDocument doc;
  doc["status"] = "online";
  doc["uptime"] = millis() / 1000;
  // battery placeholder
  doc["battery"] = 85;

  // Attach last-known GPS fix so the dashboard can plot the device.
  if (hasFix) {
    doc["lat"] = lastLat;
    doc["lng"] = lastLng;
    Serial.printf("[GPS] %.6f, %.6f (sats %lu)\n", lastLat, lastLng, gps.satellites.value());
  } else {
    Serial.printf("[GPS] no fix yet (sats %lu, chars %lu)\n",
                  gps.satellites.value(), gps.charsProcessed());
  }

  String body;
  serializeJson(doc, body);
  apiPost("/device/heartbeat", body);
}

// ── Setup & Loop ──────────────────────────────────────────────────────────────

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  // Big RX buffer so a blocking WiFi/HTTP call can't overflow the UART and
  // drop GPS bytes mid-sentence (which fails checksums → no fix is ever parsed).
  GPSserial.setRxBufferSize(2048);
  GPSserial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  if (!display.begin(0x3C, true)) {
    Serial.println(F("Display not found"));
    for (;;);
  }
  display.clearDisplay();
  display.display();

  // Boot animation
  for (int i = 0; i < 12; i++) {
    screenBoot(i);
    delay(120);
  }

  // Load stored credentials
  prefs.begin(PREF_NS, true);
  deviceId     = prefs.getString(KEY_DEVICE_ID, "");
  deviceSecret = prefs.getString(KEY_SECRET, "");
  accessToken  = prefs.getString(KEY_TOKEN, "");
  refreshToken = prefs.getString(KEY_REFRESH, "");
  prefs.end();

  // If we already have a token, skip straight to active
  if (accessToken.length() > 0) {
    state = WIFI_CONNECT; // still need WiFi, but skip bootstrap
  }

  state = WIFI_CONNECT;
}

unsigned long lastHeartbeat = 0;
int frame = 0;

void loop() {
  frame++;
  feedGps();   // keep the GPS parser fed on every iteration

  switch (state) {

    case WIFI_CONNECT: {
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        screenWifi(frame++, min(100, attempts * 3));
        delay(300);
        attempts++;
      }
      if (WiFi.status() != WL_CONNECTED) {
        screenError("WiFi failed");
        delay(5000);
        ESP.restart();
        return;
      }
      screenWifiOk();

      // If we have a token already, go active
      if (accessToken.length() > 0 && deviceId.length() > 0) {
        state = ACTIVE;
      } else if (deviceId.length() > 0 && deviceSecret.length() > 0) {
        state = GETTING_TOKEN;
      } else {
        state = BOOTSTRAPPING;
      }
      break;
    }

    case BOOTSTRAPPING:
      screenBootstrapping(frame);
      delay(80);
      doBootstrap();
      break;

    case PAIRING:
      screenPairing();
      delay(3000);
      state = WAITING_APPROVAL;
      break;

    case WAITING_APPROVAL:
      screenWaitingApproval(frame);
      delay(100);
      // Check every 5 seconds
      if (frame % 50 == 0) doPollForApproval();
      break;

    case GETTING_TOKEN:
      screenGettingToken(frame % 11);
      delay(80);
      doGetToken();
      break;

    case ACTIVE:
      screenActive();
      // Heartbeat every 10 seconds
      if (millis() - lastHeartbeat > 10000) {
        doHeartbeat();
        feedGps();        // drain anything that arrived during the blocking POST
        lastHeartbeat = millis();
      }
      smartDelay(1000);   // keep reading GPS instead of blocking
      break;

    case ERROR_STATE:
      screenError("Auth failed");
      delay(5000);
      // Clear stored tokens and restart
      prefs.begin(PREF_NS, false);
      prefs.clear();
      prefs.end();
      ESP.restart();
      break;
  }
}
