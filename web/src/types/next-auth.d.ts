import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

/**
 * Extended types for NextAuth session and JWT
 * Includes Twitter/X specific user data
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      handle: string;
      image: string;
      accessToken: string;
    } & DefaultSession["user"];
    error?: "RefreshAccessTokenError";
  }

  interface User extends DefaultUser {
    id: string;
    name: string;
    handle: string;
    image: string;
  }

  interface Profile {
    data?: {
      id: string;
      name: string;
      username: string;
      profile_image_url: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    name: string;
    handle: string;
    image: string;
    accessToken: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: "RefreshAccessTokenError";
  }
}
