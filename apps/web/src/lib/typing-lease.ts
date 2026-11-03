/** A short renewable lease; keystrokes stay local between renewals. */
export class TypingLease {
  private active = false;
  private last = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private emit: (active: boolean) => void, private now = Date.now,
    // Browser timer functions require the Window receiver. Keep native calls on
    // globalThis instead of storing them as methods of this lease instance.
    private schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> =
      (callback, delay) => globalThis.setTimeout(callback, delay),
    private cancel: (timer: ReturnType<typeof setTimeout> | undefined) => void =
      (timer) => globalThis.clearTimeout(timer)) {}
  input(text: string) {
    if (!text.trim()) { this.stop(); return; }
    if (!this.active || this.now() - this.last >= 3000) {
      this.emit(true); this.last = this.now(); this.active = true;
    }
    this.cancel(this.timer); this.timer = this.schedule(() => this.stop(), 1800);
  }
  stop() {
    this.cancel(this.timer);
    if (this.active) this.emit(false);
    this.active = false; this.last = 0;
  }
}
