import { PassportStatic } from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import User from "../../../models/user.model";
import { signAccessToken, signRefreshToken } from "../tokens";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_CALLBACK_URL =
    process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/v1/oauth/google/callback";

export default function configureGoogleStrategy(passport: PassportStatic) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.warn("⚠️ Google OAuth not configured (missing client id/secret).");
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL,
            },
            // Verify callback
            async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value?.toLowerCase();
                    const name = profile.displayName || profile.name?.givenName || "User";
                    if (!email) return done(new Error("Google profile has no email"));

                    let user = await User.findOne({ email });
                    if (!user) {
                        user = await User.create({
                            name,
                            email,
                            roles: ["driver"], // default role; adjust if needed
                        });
                    }

                    const tokens = {
                        accessToken: signAccessToken({ id: user.id, email: user.email, roles: user.roles }),
                        refreshToken: signRefreshToken({ id: user.id, email: user.email, roles: user.roles }),
                    };

                    // Attach minimal object to req.user
                    return done(null, {
                        id: user.id,
                        email: user.email,
                        roles: user.roles,
                        tokens,
                    });
                } catch (err) {
                    return done(err as Error);
                }
            }
        )
    );
}
