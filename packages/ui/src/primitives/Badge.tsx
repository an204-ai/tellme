import React from "react";

export const Badge: React.FC<{ children: React.ReactNode; variant?: "default" | "accent" }> = ({
  children,
  variant = "default"
}) => {
  return <span className={`badge badge-${variant}`}>{children}</span>;
};
