import React from "react";

interface ContainerProps {
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
    center?: boolean;
    className?: string;
}

const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
};

export const Container: React.FC<ContainerProps> = ({
    children,
    maxWidth = "full",
    center = true,
    className = "",
}) => {
    const baseClasses = "w-full px-4 sm:px-6 lg:px-8";
    const maxWidthClass = maxWidthClasses[maxWidth];
    const centerClass = center ? "mx-auto" : "";

    const classes = `${baseClasses} ${maxWidthClass} ${centerClass} ${className}`;

    return <div className={classes}>{children}</div>;
};
