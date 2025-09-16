export async function sendVerificationEmail(email: string, token: string) {
    const link = `${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/api/v1/auth/verify-email?token=${token}`;
    console.log("📧 [verify-email] to:", email, "link:", link);
}

export async function sendPasswordResetEmail(email: string, token: string) {
    const link = `${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/api/v1/auth/reset-password?token=${token}`;
    console.log("📧 [reset-password] to:", email, "link:", link);
}

export async function sendOtpEmail(email: string, code: string) {
    console.log("📧 [otp-code] to:", email, "code:", code);
}
