export const MOMENT_CAPTION_WORDS = 8;
export const MOMENT_CAPTION_CHARS = 40;
export const normalizeMomentCaption = (text) => text.replace(/\s+/gu, " ").trim();
export const validMomentCaption = (text) => {
  const value = normalizeMomentCaption(text);
  return [...value].length <= MOMENT_CAPTION_CHARS && (!value || value.split(" ").length <= MOMENT_CAPTION_WORDS);
};
/** Keep typing/pasting within the same limits as server writes, including Vietnamese. */
export const limitMomentCaption = (text) => {
  const value = [...text.replace(/\s+/gu, " ").trimStart()].slice(0, MOMENT_CAPTION_CHARS).join("");
  const words = value.trimEnd().split(" ");
  return words.length > MOMENT_CAPTION_WORDS ? words.slice(0, MOMENT_CAPTION_WORDS).join(" ") : value;
};
