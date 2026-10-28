import React from "react";

export const PhotoGrid: React.FC<{ images: string[] }> = ({ images }) => {
  return (
    <div className={`photo-grid grid-${Math.min(images.length, 4)}`}>
      {images.map((img, i) => (
        <img key={i} src={img} alt="" loading="lazy" />
      ))}
    </div>
  );
};
