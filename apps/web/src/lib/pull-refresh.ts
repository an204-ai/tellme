export const PULL_THRESHOLD = 64;
export const PULL_MAX = 88;
export type PullState = { distance: number; progress: number; ready: boolean; captured: boolean };
const idle = (): PullState => ({ distance: 0, progress: 0, ready: false, captured: false });

/** Pointer / touch drag state. Only explicit release can authorize a refresh. */
export class PullRefreshGesture {
  private active = false;
  private eligible = false;
  private axisCancelled = false;
  private origin = { x: 0, y: 0 };
  private state: PullState = idle();

  cancel() { this.active = false; this.eligible = false; this.axisCancelled = false; this.state = idle(); }
  begin(x: number, y: number, atTop: boolean) {
    this.cancel(); this.active = true; this.origin = { x, y }; this.eligible = atTop;
  }
  move(x: number, y: number, atTop: boolean): PullState {
    if (!this.active || this.axisCancelled) return idle();
    const dx = Math.abs(x - this.origin.x), dy = y - this.origin.y;
    if (!this.state.captured && dx > 8 && dx > Math.abs(dy)) { this.axisCancelled = true; this.eligible = false; return idle(); }
    if (!this.eligible) {
      this.eligible = atTop && dy > 0;
      this.origin = { x, y };
      return idle();
    }
    if (!this.state.captured && (!atTop || dy < -8)) { this.axisCancelled = true; this.eligible = false; this.state = idle(); return this.state; }
    if (!this.state.captured && (dy < 2 || dy < dx * 1.2)) return idle();
    const distance = PULL_MAX * (1 - Math.exp(-Math.max(0, dy) * .52 / PULL_MAX));
    const threshold = this.state.ready ? PULL_THRESHOLD - 8 : PULL_THRESHOLD;
    this.state = { distance, progress: Math.min(1, distance / PULL_THRESHOLD), ready: distance >= threshold, captured: distance > 0 };
    return this.state;
  }
  blocksNativeScroll() { return this.active && this.eligible; }
  release() { const refresh = this.eligible && this.state.ready; this.cancel(); return refresh; }
}
