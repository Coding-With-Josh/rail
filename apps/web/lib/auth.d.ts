import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      organizationId: string;
    };
  }

  interface User {
    role: string;
    organizationId: string;
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    role: string;
    organizationId: string;
  }
}
