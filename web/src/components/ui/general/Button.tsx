// components/ui/Button.tsx
import React from "react";
import { useThemeStore, type ColorScheme, type Size } from "@/stores/theme";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "solid" | "outline" | "ghost" | "link";
    colorScheme?: ColorScheme;
    size?: Size;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children: React.ReactNode;
}

const sizeClasses: Record<Size, string> = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl",
};

const colorSchemes: Record<
    ColorScheme,
    {
        solid: string;
        outline: string;
        ghost: string;
        link: string;
    }
> = {
    primary: {
        solid: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
        outline: "border-blue-600 text-blue-600 hover:bg-blue-50 ",
        ghost: "text-blue-600 hover:bg-blue-50 ",
        link: "text-blue-600 hover:text-blue-700 underline",
    },
    secondary: {
        solid: "bg-gray-600 hover:bg-gray-700 text-white border-gray-600",
        outline: "border-gray-600 text-gray-600 hover:bg-gray-50 ",
        ghost: "text-gray-600 hover:bg-gray-50 ",
        link: "text-gray-600 hover:text-gray-700 underline",
    },
    success: {
        solid: "bg-green-600 hover:bg-green-700 text-white border-green-600",
        outline: "border-green-600 text-green-600 hover:bg-green-50 ",
        ghost: "text-green-600 hover:bg-green-50 ",
        link: "text-green-600 hover:text-green-700 underline",
    },
    warning: {
        solid: "bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600",
        outline: "border-yellow-600 text-yellow-600 hover:bg-yellow-50 ",
        ghost: "text-yellow-600 hover:bg-yellow-50 ",
        link: "text-yellow-600 hover:text-yellow-700 underline",
    },
    error: {
        solid: "bg-red-600 hover:bg-red-700 text-white border-red-600",
        outline: "border-red-600 text-red-600 hover:bg-red-50 ",
        ghost: "text-red-600 hover:bg-red-50 ",
        link: "text-red-600 hover:text-red-700 underline",
    },
    info: {
        solid: "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600",
        outline: "border-cyan-600 text-cyan-600 hover:bg-cyan-50 ",
        ghost: "text-cyan-600 hover:bg-cyan-50 ",
        link: "text-cyan-600 hover:text-cyan-700 underline",
    },
};

const focusRingClasses: Record<ColorScheme, string> = {
    primary: "focus:ring-blue-500",
    secondary: "focus:ring-gray-500",
    success: "focus:ring-green-500",
    warning: "focus:ring-yellow-500",
    error: "focus:ring-red-500",
    info: "focus:ring-cyan-500",
};

export const Button: React.FC<ButtonProps> = ({
    variant = "solid",
    colorScheme = "primary",
    size = "md",
    loading = false,
    leftIcon,
    rightIcon,
    children,
    className = "",
    disabled,
    ...props
}) => {
    const { colorScheme: themeColorScheme } = useThemeStore();
    // In your current code colorScheme always wins; keeping that behaviour.
    const scheme: ColorScheme = colorScheme || themeColorScheme;

    const baseClasses =
        "inline-flex items-center justify-center font-medium rounded-md transition-colors " +
        "focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = colorSchemes[scheme][variant];
    const sizeClass = sizeClasses[size];
    const focusRingClass = focusRingClasses[scheme];

    const classes = `${baseClasses} ${variantClasses} ${sizeClass} ${focusRingClass} ${className}`;

    return (
        <button className={classes} disabled={disabled || loading} {...props}>
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
            {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
};
