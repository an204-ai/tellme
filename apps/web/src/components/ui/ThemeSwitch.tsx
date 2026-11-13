"use client";

import { useTheme } from "@/providers/ThemeProvider";

/** The owner's sun/moon switch, scaled to fit the shared header. Checked means daylight. */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return <label className="theme-toggle" title={theme === "light" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}>
    <span className="switch">
      <input type="checkbox" role="switch" aria-label="Chế độ sáng" checked={theme === "light"} onChange={(event) => setTheme(event.target.checked ? "light" : "dark")} />
      <span className="slider" aria-hidden="true">
        <span className="moons-hole">{[0, 1, 2].map((i) => <span className="moon-hole" key={i} />)}</span>
        <span className="black-clouds">{[0, 1, 2].map((i) => <span className="black-cloud" key={i} />)}</span>
        <span className="clouds">{[0, 1, 2, 3, 4, 5, 6].map((i) => <span className="cloud" key={i} />)}</span>
        <span className="stars">{[0, 1, 2, 3, 4].map((i) => <svg className="star" key={i} viewBox="0 0 20 20"><path d="M0 10C10 10 10 10 0 10C10 10 10 10 10 20C10 10 10 10 20 10C10 10 10 10 10 0C10 10 10 10 0 10Z" /></svg>)}</span>
      </span>
    </span>
  </label>;
}
