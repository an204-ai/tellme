import { PULL_MAX } from "./pull-refresh.ts";

/** This projection deliberately has no native scroll offset to get out of sync with. */
export function paintPullFeedback(content: HTMLElement, indicator: HTMLElement, distance: number, progress: number) {
  const boundedDistance = Number.isFinite(distance) ? Math.max(0, Math.min(PULL_MAX, distance)) : 0;
  const boundedProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  content.style.transform = `translate3d(0, ${boundedDistance.toFixed(2)}px, 0)`;
  indicator.style.opacity = String(boundedProgress);
  indicator.style.transform = `translate3d(0, ${(-10 * (1 - boundedProgress)).toFixed(2)}px, 0) scale(${(.85 + boundedProgress * .15).toFixed(3)})`;
}

/** Effect reinitialization / hot reload must not inherit a stale pull or loader phase. */
export function resetPullFeedback(root: HTMLElement, content: HTMLElement, indicator: HTMLElement) {
  root.dataset.state = "idle";
  delete root.dataset.spinning;
  delete root.dataset.loading;
  paintPullFeedback(content, indicator, 0, 0);
}
