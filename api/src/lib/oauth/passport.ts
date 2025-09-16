import passport from "passport";
import configureGoogleStrategy from "./strategies/google";

// Simple (stateless) passport setup: no sessions, we issue JWTs
export function initPassport() {
    configureGoogleStrategy(passport);

    // Optional: lightweight serialize/deserialize (not used without sessions)
    passport.serializeUser((user: any, done) => done(null, user));
    passport.deserializeUser((obj: any, done) => done(null, obj));

    return passport;
}
