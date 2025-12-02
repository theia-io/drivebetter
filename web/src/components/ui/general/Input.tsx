import { ColorScheme, Size, useThemeStore } from "@/stores/theme";
import React from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    colorScheme?: ColorScheme;
    size?: Size;
}

const sizeClasses = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-4 py-3 text-lg",
    xl: "px-5 py-4 text-xl",
};

const colorSchemes = {
    primary: "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
    secondary: "border-gray-300 focus:border-gray-500 focus:ring-gray-500",
    success: "border-gray-300 focus:border-green-500 focus:ring-green-500",
    warning: "border-gray-300 focus:border-yellow-500 focus:ring-yellow-500",
    error: "border-red-300 focus:border-red-500 focus:ring-red-500",
    info: "border-gray-300 focus:border-cyan-500 focus:ring-cyan-500",
};

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    colorScheme = "primary",
    size = "md",
    className = "",
    id,
    ...props
}) => {
    const { colorScheme: themeColorScheme } = useThemeStore();
    const scheme = colorScheme || themeColorScheme;

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses =
        "block w-full rounded-md border shadow-sm transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed";
    const colorClass = error ? colorSchemes.error : colorSchemes[scheme];
    const sizeClass = sizeClasses[size];
    const iconPadding = leftIcon ? "pl-10" : rightIcon ? "pr-10" : "";

    const inputClasses = `${baseClasses} ${colorClass} ${sizeClass} ${iconPadding} ${className}`;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700 "
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">{leftIcon}</span>
                    </div>
                )}
                <input id={inputId} className={inputClasses} {...props} />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-400">{rightIcon}</span>
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600 ">{error}</p>}
            {helperText && !error && (
                <p className="mt-1 text-sm text-gray-500 ">{helperText}</p>
            )}
        </div>
    );
};
