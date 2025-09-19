"use client";

import { Button, Card, CardBody, Typography } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { ArrowRight, Car, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const { isAuthenticated, user, fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const resolvedUser = user || (await fetchMe());
      if (isAuthenticated || resolvedUser) {
        router.push("/dashboard");
      }
    })();
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const success = await login(email, password);
      if (success) {
        router.push("/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
            <Car className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <Typography
            variant="h2"
            className="text-2xl sm:text-3xl font-bold text-gray-900"
          >
            Welcome back
          </Typography>
          <Typography
            variant="body1"
            className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base"
          >
            Sign in to your DriveBetter account
          </Typography>
        </div>

        {/* Login Form */}
        <Card variant="elevated" className="shadow-2xl border-0">
          <CardBody className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm sm:text-base"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm sm:text-base"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                  <Typography
                    variant="body2"
                    className="text-red-800 text-center text-sm sm:text-base"
                  >
                    {error}
                  </Typography>
                </div>
              )}

              <Button
                type="submit"
                loading={isLoading}
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 sm:py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm sm:text-base"
                rightIcon={
                  !isLoading ? (
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : undefined
                }
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <Typography
            variant="body2"
            className="text-gray-500 text-xs sm:text-sm"
          >
            Don&apos;t have an account?{" "}
            <a
              href="#"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Contact support
            </a>
          </Typography>
        </div>
      </div>
    </div>
  );
}
