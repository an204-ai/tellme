import React from "react";

export const TopicTag: React.FC<{ title: string; count?: number; onClick?: () => void }> = ({
  title,
  count,
  onClick
}) => {
  return (
    <button onClick={onClick} className="topic-tag">
      <span>#{title}</span>
      {count !== undefined && <span className="topic-count">{count}</span>}
    </button>
  );
};
