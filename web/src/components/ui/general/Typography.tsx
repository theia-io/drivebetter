import React from "react";
import { useThemeStore, ColorScheme } from "@/stores/theme";

interface TypographyProps {
    children: React.ReactNode;
    variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body1" | "body2" | "caption" | "overline";
    colorScheme?: ColorScheme | "inherit" | "muted";
    className?: string;
    as?: keyof JSX.IntrinsicElements;
}

const variantClasses = {
    h1: "text-4xl font-bold leading-tight",
    h2: "text-3xl font-bold leading-tight",
    h3: "text-2xl font-semibold leading-snug",
    h4: "text-xl font-semibold leading-snug",
    h5: "text-lg font-medium leading-normal",
    h6: "text-base font-medium leading-normal",
    body1: "text-base leading-relaxed",
    body2: "text-sm leading-relaxed",
    caption: "text-xs leading-normal",
    overline: "text-xs font-medium uppercase tracking-wider leading-normal",
};

const colorSchemes = {
    primary: "text-blue-600 dark:text-blue-400",
    secondary: "text-gray-600 dark:text-gray-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
    info: "text-cyan-600 dark:text-cyan-400",
    inherit: "text-inherit",
    muted: "text-gray-500 dark:text-gray-400",
};

const defaultElements = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    h6: "h6",
    body1: "p",
    body2: "p",
    caption: "span",
    overline: "span",
};

export const Typography: React.FC<TypographyProps> = ({
    children,
    variant = "body1",
    colorScheme = "inherit",
    className = "",
    as,
}) => {
    const { colorScheme: themeColorScheme } = useThemeStore();
    const scheme = colorScheme === "inherit" ? themeColorScheme : colorScheme;

    const variantClass = variantClasses[variant];
    const colorClass = colorSchemes[scheme];
    const Element = as || defaultElements[variant];

    const classes = `${variantClass} ${colorClass} ${className}`;

    return React.createElement(Element, { className: classes }, children);
};

// Convenience components
export const Heading: React.FC<
    Omit<TypographyProps, "variant"> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }
> = ({ level = 1, ...props }) => {
    const variant = `h${level}` as TypographyProps["variant"];
    return <Typography variant={variant} {...props} />;
};

export const Text: React.FC<
    Omit<TypographyProps, "variant"> & { size?: "body1" | "body2" | "caption" }
> = ({ size = "body1", ...props }) => {
    return <Typography variant={size} {...props} />;
};
