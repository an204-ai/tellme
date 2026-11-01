/** Three bouncing notes, adapted from the motion reference supplied by the user. */
export function MusicLoader({ label, compact = false }: { label?: string; compact?: boolean }) {
  return <span className={`music-note-loader ${compact ? "is-compact" : ""}`} role={label ? "status" : undefined} aria-hidden={label ? undefined : true}>
    <span className="music-note-icons" aria-hidden="true">
      {[0, 1, 2].map((note) => <span className="music-note-icon" key={note}><svg viewBox="0 0 100 100" fill="currentColor"><ellipse transform="rotate(-21.283 49.994 75.642)" cx="50" cy="75.651" rx="19.347" ry="16.432" /><path d="M58.474 7.5h10.258v63.568H58.474z" /></svg></span>)}
    </span>
    {label && <span className="music-loader-label">{label}</span>}
  </span>;
}
