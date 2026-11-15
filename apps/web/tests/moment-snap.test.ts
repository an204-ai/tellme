import assert from 'node:assert/strict';
import { momentSnapDirection } from '../src/lib/moment-snap.ts';
assert.equal(momentSnapDirection(20, 4, 844), 0, 'A tiny flick returns to its photo, even when fast');
assert.equal(momentSnapDirection(60, .9, 844), 0, 'Accidental short drags do not change page');
assert.equal(momentSnapDirection(100, .1, 844), 0, 'A slow drag below the threshold snaps back');
assert.equal(momentSnapDirection(113, .1, 844), 1, 'A deliberate upward drag advances one page');
assert.equal(momentSnapDirection(-113, -.1, 844), -1, 'A deliberate downward drag returns one page');
assert.equal(momentSnapDirection(70, -.8, 844), 0, 'Reversing a short drag returns to the photo');
assert.equal(momentSnapDirection(70, .8, 844), 1, 'A sufficiently long quick flick can advance');
assert.equal(momentSnapDirection(73, .1, 360), 1, 'Short screens keep a usable threshold');
assert.equal(momentSnapDirection(5000, 10, 844), 1, 'A long fling still chooses only one adjacent page');
console.log('PASS: magnetic snap threshold, short-drag return, deliberate flick, both directions and one-page limit.');

// Regression: a new finger gesture during settlement must start from the committed
// destination, rather than being dropped or snapping to the same photo again.
const callbacks = new Map<number, FrameRequestCallback>();
let frameId = 0;
Object.assign(globalThis, {
  Element: class {},
  document: { documentElement: { classList: { contains: () => false } } },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (callback: FrameRequestCallback) => { callbacks.set(++frameId, callback); return frameId; },
  cancelAnimationFrame: (id: number) => callbacks.delete(id),
});
const { magneticMomentScroll } = await import('../src/lib/moment-snap.ts');
const listeners = new Map<string, (event: any) => void>();
const root = {
  scrollTop: 0, clientHeight: 844, dataset: {} as Record<string, string>,
  querySelectorAll: () => [0, 1, 2, 3].map((index) => ({ offsetTop: index * 844, offsetHeight: 844 })),
  addEventListener: (name: string, callback: (event: any) => void) => listeners.set(name, callback),
  removeEventListener: (name: string) => listeners.delete(name),
};
const controller = magneticMomentScroll(root as unknown as HTMLElement);
const touch = (name: string, y: number) => listeners.get(name)!({ touches: name === 'touchend' ? [] : [{ identifier: 1, clientX: 150, clientY: y }], target: null, cancelable: true, preventDefault() {} });
const paint = (elapsed: number) => { const pending = [...callbacks]; callbacks.clear(); pending.forEach(([, callback]) => callback(performance.now() + elapsed)); };
touch('touchstart', 600); touch('touchmove', 340); paint(16); touch('touchend', 340);
paint(50); // still in flight
assert.ok(root.scrollTop > 0 && root.scrollTop < 844);
touch('touchstart', 600); // immediately interrupt the first settlement
assert.equal(root.scrollTop, 844, 'Second swipe starts at the first committed destination');
touch('touchmove', 340); paint(16); touch('touchend', 340); paint(500);
assert.equal(root.scrollTop, 1688, 'Back-to-back swipes advance two consecutive photos');
touch('touchstart', 600); touch('touchmove', 400); paint(16);
listeners.get('touchstart')!({ touches: [{identifier: 1}, {identifier: 2}], target: null });
assert.equal(root.scrollTop, 1688, 'Adding a second finger cancels page dragging before camera pinch');
touch('touchend', 400); paint(500);
assert.equal(root.scrollTop, 1688, 'Pinch release cannot accidentally advance a photo');
touch('touchstart', 600); touch('touchmove', 340); paint(16); touch('touchend', 340); paint(500);
assert.equal(root.scrollTop, 2532, 'Scrolling resumes immediately after a pinch');
// A modal can be rendered inside the camera/card DOM. Its own scrolling must
// never be hijacked by the feed listener underneath the browser's top layer.
class ModalTarget extends Element { closest(selector: string) { return selector.includes('dialog') ? this : null; } }
const modalTarget = new ModalTarget();
controller.go(1, true);
let modalWheelPrevented = false;
listeners.get('wheel')!({ target: modalTarget, deltaX: 0, deltaY: 160, deltaMode: 0, preventDefault() { modalWheelPrevented = true; } });
paint(500);
assert.equal(modalWheelPrevented, false, 'Wheel inside a dialog remains native');
const modalTouch = (name: string, y: number) => listeners.get(name)!({ target: modalTarget, touches: name === 'touchend' ? [] : [{ identifier: 2, clientX: 150, clientY: y }], cancelable: true, preventDefault() { throw new Error('Dialog touch was intercepted'); } });
modalTouch('touchstart', 600); modalTouch('touchmove', 300); modalTouch('touchend', 300); paint(500);
assert.equal(root.scrollTop, 844, 'Dialog wheel/touch does not move the underlying feed');
controller.destroy();
assert.equal(callbacks.size, 0, 'Unmount cancels motion frames');
console.log('Back-to-back magnetic swipe and independent modal-scroll regressions passed.');
