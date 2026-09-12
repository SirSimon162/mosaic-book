import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 7;

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    trustedOrigins: ["http://localhost:3000"],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    session: {
        expiresIn: SESSION_EXPIRES_IN,
        cookieCache: {
            enabled: true,
            maxAge: SESSION_EXPIRES_IN,
            strategy: "jwe",
            version: "1",
        },
    },
});