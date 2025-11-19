import React from "react";
import { useThemeStore, ColorScheme } from "@/stores/theme";

interface CardProps {
    children: React.ReactNode;
    variant?: "elevated" | "outlined" | "filled";
    colorScheme?: ColorScheme;
    className?: string;
    padding?: "none" | "sm" | "md" | "lg";
    onClick?: React.MouseEventHandler<HTMLDivElement>; // <-- add this
}

const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
};

const variantClasses = {
    elevated: "shadow-lg bg-white dark:bg-gray-800",
    outlined: "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
    filled: "bg-gray-50 dark:bg-gray-800",
};

const colorSchemes = {
    primary: "border-blue-200 dark:border-blue-800",
    secondary: "border-gray-200 dark:border-gray-700",
    success: "border-green-200 dark:border-green-800",
    warning: "border-yellow-200 dark:border-yellow-800",
    error: "border-red-200 dark:border-red-800",
    info: "border-cyan-200 dark:border-cyan-800",
};

export const Card: React.FC<CardProps> = ({
    children,
    variant = "elevated",
    colorScheme = "secondary",
    className = "",
    padding = "md",
    onClick, // <-- destructure
}) => {
    const { colorScheme: themeColorScheme } = useThemeStore();
    const scheme = colorScheme || themeColorScheme;

    const baseClasses = "rounded-lg transition-colors";
    const variantClass = variantClasses[variant];
    const paddingClass = paddingClasses[padding];
    const colorClass = variant === "outlined" ? colorSchemes[scheme] : "";

    const classes = `${baseClasses} ${variantClass} ${paddingClass} ${colorClass} ${className}`;

    return (
        <div className={classes} onClick={onClick}>
            {" "}
            {/* <-- forward onClick */}
            {children}
        </div>
    );
};

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "" }) => {
    return <div className={`mb-4 ${className}`}>{children}</div>;
};

interface CardBodyProps {
    children: React.ReactNode;
    className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = "" }) => {
    return <div className={className}>{children}</div>;
};

interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = "" }) => {
    return <div className={`mt-4 ${className}`}>{children}</div>;
};
