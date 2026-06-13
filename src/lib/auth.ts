import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { db } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: db,
  emailAndPassword: {
    enabled: true,
    // 'closed' fully disables self-signup; 'open'/'invite' allow the call
    // through and the invite code is enforced in the hook below.
    disableSignUp: env.SIGNUPS === "closed",
  },
  plugins: [username()],
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (env.SIGNUPS !== "invite") return { data: user };
          const code = ctx?.body?.inviteCode;
          if (!code || code !== env.INVITE_CODE) {
            throw new Error("A valid invite code is required to sign up.");
          }
          return { data: user };
        },
      },
    },
  },
});
