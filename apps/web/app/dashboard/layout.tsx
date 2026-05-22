"use client"

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { CommandPalette } from "@/components/command-palette";
import { ChevronLeft, ChevronRight, SidebarClose, SidebarOpen } from "lucide-react";
import { signOutAction } from "@/lib/actions";
import { useState } from "react";

const navLinks = [
  {
    href: "/dashboard", label: "Overview", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <desc>
        Home 1 Streamline Icon: https://streamlinehq.com
      </desc>
      <g id="home-1--home-house-roof-shelter">
        <path id="Union" fill="currentColor" fillRule="evenodd" d="M27.6273 2.26967c-2.3085 -1.02623 -4.946 -1.02623 -7.2544 0C12.9011 5.59128 7.25144 9.94474 4.32616 12.4638c-1.88447 1.6227 -2.89807 3.9277 -3.02284 6.3103C1.16627 21.3912 1 25.4892 1 29.9767c0 3.4524 0.09841 6.781 0.20599 9.3897 0.16699 4.0493 3.39305 7.2569 7.44202 7.3953 3.48229 0.119 8.63959 0.2378 15.35209 0.2378 6.7124 0 11.8696 -0.1188 15.3519 -0.2378 4.0491 -0.1384 7.2751 -3.3461 7.4421 -7.3955 0.1075 -2.6086 0.2059 -5.9371 0.2059 -9.3895 0 -4.4874 -0.1662 -8.5854 -0.3032 -11.2025 -0.1247 -2.3826 -1.1384 -4.6877 -3.0229 -6.3105 -2.9253 -2.51904 -8.5749 -6.87245 -16.0466 -10.19403Zm-5.6295 3.6551c1.274 -0.56636 2.7306 -0.56636 4.0046 0C33 9.03559 38.3189 13.131 41.0638 15.4948c0.9812 0.8448 1.5653 2.0914 1.6385 3.4885 0.1347 2.5736 0.2977 6.5978 0.2977 10.9934 0 3.3812 -0.0965 6.6519 -0.2025 9.2247 -0.0809 1.962 -1.6273 3.4958 -3.5821 3.5626 -3.4384 0.1175 -8.5501 0.2355 -15.2153 0.2355 -6.6654 0 -11.777 -0.118 -15.21545 -0.2355 -1.95478 -0.0668 -3.50115 -1.6005 -3.58205 -3.5625C5.09649 36.6286 5 33.3579 5 29.9767c0 -4.3957 0.16308 -8.4198 0.29785 -10.9934 0.07316 -1.3971 0.65731 -2.6436 1.63841 -3.4885C9.68119 13.1311 15 9.03562 21.9978 5.92477ZM16 34.4887c-1.3807 0 -2.5 1.1193 -2.5 2.5s1.1193 2.5 2.5 2.5h16c1.3807 0 2.5 -1.1193 2.5 -2.5s-1.1193 -2.5 -2.5 -2.5H16Z" clipRule="evenodd" strokeWidth="1"></path>
      </g>
    </svg>
  },
  {
    href: "/dashboard/devices", label: "Devices", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" id="Watch-2--Streamline-Flex-Remix" height="14" width="14">
      <desc>
        Watch 2 Streamline Icon: https://streamlinehq.com
      </desc>
      <g id="watch-2--device-square-timepiece-electronics-face-blank-watch-smart">
        <path id="Union" fill="currentColor" fill-rule="evenodd" d="M5.54759 0.198962C5.97493 0.10379 6.47451 0 6.99954 0c0.52503 0 1.0246 0.10379 1.45194 0.198961 0.71236 0.158648 1.25066 0.77563 1.30253 1.511679 0.01165 0.16535 0.02343 0.35874 0.03483 0.6237 1.03346 0.30193 1.81736 1.20763 1.93466 2.30597 0.0802 0.75095 0.1515 1.54388 0.1515 2.3596s-0.0713 1.60864 -0.1515 2.35959c-0.1172 1.0973 -0.8997 2.0024 -1.9318 2.3051 -0.01131 0.2731 -0.02309 0.4661 -0.03486 0.6267 -0.05395 0.7361 -0.5944 1.3514 -1.30538 1.5097 -0.42734 0.0952 -0.92691 0.199 -1.45194 0.199 -0.52504 0 -1.02461 -0.1038 -1.45195 -0.199 -0.71091 -0.1583 -1.25151 -0.7736 -1.3054 -1.5097 -0.01175 -0.1605 -0.02351 -0.3536 -0.0348 -0.6269 -1.0316 -0.3031 -1.81372 -1.2079 -1.93089 -2.3049 -0.0802 -0.75095 -0.15148 -1.54387 -0.15148 -2.35959 0 -0.81572 0.07128 -1.60865 0.15148 -2.3596 0.11727 -1.098 0.90072 -2.00348 1.93372 -2.30569 0.01138 -0.26535 0.02315 -0.4588 0.0348 -0.62399C4.29689 0.974518 4.83529 0.357597 5.54759 0.198962ZM4.88023 3.47714c-0.02624 0.00293 -0.05248 0.00588 -0.07873 0.00885 -0.67001 0.07577 -1.21074 0.61904 -1.28208 1.28707 -0.07908 0.74039 -0.14442 1.47973 -0.14442 2.22685 0 0.74711 0.06534 1.48646 0.14441 2.22685 0.07135 0.66802 0.61208 1.21134 1.28209 1.28704 0.7329 0.0829 1.46216 0.152 2.1985 0.152 0.73634 0 1.4656 -0.0691 2.1985 -0.152 0.67001 -0.0757 1.2107 -0.61902 1.2821 -1.28704 0.0791 -0.74039 0.1444 -1.47974 0.1444 -2.22685 0 -0.74712 -0.0653 -1.48646 -0.1444 -2.22685 -0.0714 -0.66803 -0.61209 -1.2113 -1.2821 -1.28707 -0.02597 -0.00294 -0.05194 -0.00586 -0.0779 -0.00876 -0.0038 -0.00035 -0.00761 -0.00074 -0.01141 -0.00117 -0.70311 -0.07839 -1.4032 -0.14193 -2.10932 -0.14193 -0.70628 0 -1.40654 0.06357 -2.1098 0.14199 -0.00328 0.00036 -0.00656 0.0007 -0.00984 0.00102Z" clipRule="evenodd" strokeWidth="1"></path>
      </g>
    </svg>
  },
  { href: "/dashboard/alerts", label: "Alerts", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 014 4v3l1 2H3l1-2V6a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg> },
  { href: "/dashboard/pair", label: "Pair Device", icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  {
    href: "/dashboard/map", label: "Live Map", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <desc>
        Map Location Streamline Icon: https://streamlinehq.com
      </desc>
      <g id="map-location--map-location-pin-navigation-gps-travel">
        <g id="Group 5507">
          <path id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M13.0859 5.68932c0.0059 -1.17342 -0.0955 -2.34731 -0.305 -3.50167 -0.0929 -0.51177 -0.1667 -1.06908 -0.5328 -1.438531 -0.1042 -0.105074 -0.2249 -0.176025 -0.3571 -0.163785 -0.4874 0.045127 -1.0086 0.179647 -1.3801 0.282077 -0.4321 0.119142 -0.92722 0.362439 -1.41072 0.593919 -0.20835 0.09975 -0.44519 0.12094 -0.66882 0.06306L4.91299 0.613889c-0.61176 -0.14298 -1.55238 0.094126 -2.13045 0.253522 -0.36108 0.099566 -0.76621 0.285839 -1.17178 0.479459 -0.14592 0.06967 -0.26988 0.24899 -0.36395 0.43131 -0.16237 0.31471 -0.22914 0.66723 -0.291315 1.01585l-0.049546 0.27783c-0.407151 2.28311 -0.407151 4.62024 0 6.90335 0.095081 0.53319 0.157191 1.13119 0.562511 1.49039 0.09782 0.0867 0.20892 0.1384 0.32906 0.1155 0.36809 -0.0702 0.74535 -0.2212 1.14776 -0.3587 0.59107 -0.202 1.18203 -0.4305 1.72915 -0.5805 0.15597 -0.0427 0.32035 -0.0396 0.47692 0.0009l1.16129 0.3006" strokeWidth="1"></path>
          <path id="Intersect" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M5.06367 10.6357c-0.07132 -0.0179 -0.14417 -0.0275 -0.21699 -0.028V0.741015c0 -0.042172 0.00254 -0.083924 0.00749 -0.125048l3.67407 0.919263c0.10378 0.02597 0.2103 0.03392 0.31516 0.02385v3.88013" strokeWidth="1"></path>
          <g id="Group 5402">
            <path id="Ellipse 45" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M13.3997 9.73134c0 1.98236 -2.2949 3.69886 -2.5421 3.69886 -0.2472 0 -2.54217 -1.7165 -2.54217 -3.69886 0 -1.40398 1.13815 -2.54213 2.54217 -2.54213 1.4039 0 2.5421 1.13815 2.5421 2.54213Z" strokeWidth="1"></path>
            <path id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m10.8574 9.78181 0 -0.15144" strokeWidth="1"></path>
          </g>
        </g>
      </g>
    </svg>
  },
  {
    href: "/dashboard/settings", label: "Settings", icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <desc>
        Sun Streamline Icon: https://streamlinehq.com
      </desc>
      <g id="sun--photos-light-camera-mode-brightness-sun-photo-full">
        <path id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M12.8149 6.22077c0.5257 0.38646 0.5257 1.172 0 1.55846v0c-0.8698 0.63934 -1.3123 1.71184 -1.1492 2.77897v0c0.0988 0.6471 -0.4604 1.2063 -1.1075 1.1075v0c-1.06713 -0.1631 -2.13963 0.2794 -2.77897 1.1492v0c-0.38646 0.5257 -1.172 0.5257 -1.55846 0v0c-0.63934 -0.8698 -1.71184 -1.3123 -2.77896 -1.1492v0c-0.6471 0.0988 -1.20635 -0.4604 -1.10748 -1.1075v0c0.16303 -1.06713 -0.27941 -2.13963 -1.14922 -2.77897v0c-0.525758 -0.38646 -0.525758 -1.172 0 -1.55846v0c0.86981 -0.63934 1.31225 -1.71184 1.14922 -2.77896v0c-0.09887 -0.6471 0.46038 -1.20635 1.10748 -1.10748v0c1.06712 0.16303 2.13962 -0.27941 2.77896 -1.14922v0c0.38646 -0.525758 1.172 -0.525758 1.55846 0v0c0.63934 0.86981 1.71184 1.31225 2.77897 1.14922v0c0.6471 -0.09887 1.2063 0.46038 1.1075 1.10748v0c-0.1631 1.06712 0.2794 2.13962 1.1492 2.77896v0Z" strokeWidth="1"></path>
        <path id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M6.99976 9.54077c1.62609 0 2.54077 -0.91468 2.54077 -2.54077s-0.91468 -2.54077 -2.54077 -2.54077c-1.6261 0 -2.54078 0.91468 -2.54078 2.54077s0.91468 2.54077 2.54078 2.54077Z" strokeWidth="1"></path>
      </g>
    </svg>
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="flex h-screen dark:bg-[#0f0f0f] bg-[#d9d9d9] overflow-hidden">
      <CommandPalette />

      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — fixed drawer on mobile, inline on md+ */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -256, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -256, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed md:relative z-40 md:z-auto inset-y-0 left-0 w-64 shrink-0 flex flex-col gap-6 p-4 overflow-hidden h-full dark:bg-[#0f0f0f] bg-[#d9d9d9] md:bg-transparent md:dark:bg-transparent"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-md bg-black border border-muted-foreground dark:border-muted flex items-center justify-center text-xs font-bold text-white">R</div>
                <span className="text-sm font-medium text-black/60 dark:text-white/50 whitespace-nowrap">Rail</span>
              </div>
              <SidebarClose className="size-4 text-black/60 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer" onClick={() => setSidebarOpen(false)} />
            </div>

            <nav className="flex flex-col gap-1">
              {navLinks.map((l) => {
                const active = l.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(l.href);
                return (
                  <a key={l.href} href={l.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${active
                      ? "bg-black/10 dark:bg-white/10 text-black dark:text-white font-medium"
                      : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                      }`}>
                    {l.icon}{l.label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-auto">
              <form action={signOutAction}>
                <button type="submit" className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors whitespace-nowrap">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Sign out
                </button>
              </form>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Content panel */}
      <motion.div
        layout
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="flex-1 p-3 overflow-hidden min-w-0"
      >
        {!sidebarOpen && (
          <div className="absolute m-5 z-10">
            <SidebarOpen className="size-4 text-black/60 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors cursor-pointer" onClick={() => setSidebarOpen(true)} />
          </div>
        )}
        <div className="h-full w-full dark:bg-[#161616] bg-[#f0f0f0] rounded-2xl border border-black/10 dark:border-muted overflow-hidden flex flex-col">
          <div className="flex items-center gap-4 px-7 pt-7 pb-2 shrink-0">
            <ChevronLeft className="size-3.5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer" strokeWidth={3} />
            <ChevronRight className="size-3.5 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors cursor-pointer" strokeWidth={3} />
          </div>
          <div className={`flex-1 min-h-0 w-full ${pathname === "/dashboard/map" ? "overflow-hidden" : "overflow-auto px-4 md:pl-10 pb-10"}`}>
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
