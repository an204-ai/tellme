import React from "react";
import { Avatar } from "../primitives/Avatar";

export const UserCard: React.FC<{ name: string; username: string; avatarUrl?: string }> = ({
  name,
  username,
  avatarUrl
}) => {
  return (
    <div className="user-card flex items-center gap-3">
      <Avatar src={avatarUrl} name={name} />
      <div>
        <p className="font-medium text-[#2D3748]">{name}</p>
        <p className="text-sm text-[#718096]">@{username}</p>
      </div>
    </div>
  );
};

