import React from "react";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = "md" }) => {
  return (
    <div className={`avatar avatar-${size}`}>
      {src ? <img src={src} alt={name} /> : <span>{name.charAt(0).toUpperCase()}</span>}
    </div>
  );
};
