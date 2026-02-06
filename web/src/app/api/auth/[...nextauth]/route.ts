import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { JWT } from "next-auth/jwt";

/**
 * NextAuth configuration for ClawdFeed
 * Uses Twitter/X OAuth 2.0 for authentication
 */

// Validate required environment variables
const requiredEnvVars = [
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

/**
 * Refresh the access token using Twitter's OAuth 2.0 refresh endpoint
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const basicAuth = Buffer.from(
      `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken || "",
        client_id: process.env.TWITTER_CLIENT_ID!,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Failed to refresh access token:", refreshedTokens);
      throw new Error(refreshedTokens.error || "Failed to refresh token");
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "users.read tweet.read tweet.write offline.access",
        },
      },
      profile(profile) {
        return {
          id: profile.data.id,
          name: profile.data.name,
          handle: profile.data.username,
          image: profile.data.profile_image_url?.replace("_normal", "") || "",
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user, account }): Promise<JWT> {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          id: user.id,
          name: user.name || "",
          handle: (user as User & { handle: string }).handle || "",
          image: user.image || "",
          accessToken: account.access_token || "",
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : undefined,
        };
      }

      // Return previous token if the access token has not expired
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 60000 // 1 minute buffer
      ) {
        return token;
      }

      // Access token has expired, try to refresh it
      if (token.refreshToken) {
        return refreshAccessToken(token);
      }

      return token;
    },

    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          name: token.name,
          handle: token.handle,
          image: token.image,
          accessToken: token.accessToken,
        },
        error: token.error,
      };
    },

    async signIn({ user, account, profile }) {
      // Validate that we received the required user data
      if (!user?.id) {
        console.error("Sign in failed: No user ID received");
        return false;
      }

      if (!account?.access_token) {
        console.error("Sign in failed: No access token received");
        return false;
      }

      // Log successful sign in (sanitized)
      console.log(`User signed in: ${user.id.substring(0, 8)}...`);

      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },

  events: {
    async signIn({ user }) {
      console.log(`[NextAuth] User signed in: ${user.id}`);
    },
    async signOut({ token }) {
      console.log(`[NextAuth] User signed out: ${token.id}`);
    },
    async session({ session }) {
      // Session accessed - can be used for analytics
    },
  },

  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
