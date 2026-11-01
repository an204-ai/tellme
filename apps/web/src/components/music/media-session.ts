export const musicActiveEvent = "tellme:music-active";
export function pauseMusic() { window.dispatchEvent(new CustomEvent(musicActiveEvent)); }
