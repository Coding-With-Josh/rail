CREATE TYPE "public"."command_status" AS ENUM('pending', 'delivered', 'acknowledged', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pairing_state" AS ENUM('pending', 'approved', 'expired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'invited');--> statement-breakpoint
CREATE TABLE "command_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"issued_by" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"nonce" text NOT NULL,
	"status" "command_status" DEFAULT 'pending' NOT NULL,
	"acknowledged_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "command_logs_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"revoked_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"assigned_user_id" text,
	"secret_hash" text NOT NULL,
	"firmware_version" text NOT NULL,
	"capabilities" text[] DEFAULT '{}' NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "heartbeat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"battery" integer,
	"signal" integer,
	"uptime" integer,
	"status" text DEFAULT 'online' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pairing_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"hardware_id" text NOT NULL,
	"firmware_version" text NOT NULL,
	"capabilities" text[] DEFAULT '{}' NOT NULL,
	"pairing_code" text NOT NULL,
	"state" "pairing_state" DEFAULT 'pending' NOT NULL,
	"organization_id" text,
	"assigned_user_id" text,
	"approved_by" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pairing_sessions_pairing_code_unique" UNIQUE("pairing_code")
);
--> statement-breakpoint
CREATE TABLE "revoked_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"jti" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revoked_tokens_jti_unique" UNIQUE("jti")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"revoked_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "command_logs" ADD CONSTRAINT "command_logs_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_sessions" ADD CONSTRAINT "pairing_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_sessions" ADD CONSTRAINT "pairing_sessions_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pairing_sessions" ADD CONSTRAINT "pairing_sessions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_logs" ADD CONSTRAINT "telemetry_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_logs" ADD CONSTRAINT "telemetry_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;