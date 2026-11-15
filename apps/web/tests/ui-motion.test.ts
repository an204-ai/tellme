import assert from 'node:assert/strict';
import { animateSurface, installMotionSystem } from '../src/lib/ui-motion.ts';

// A positioned picker may already use a translate matrix. Motion must not
// discard that anchor or leave an earlier animation fighting new input.
let reduce = false;
class Surface {
  frames: Keyframe[] = [];
  options: KeyframeAnimationOptions = {};
  cancellations = 0;
  getBoundingClientRect() { return { left: 40, top: 80, width: 240, height: 200 }; }
  querySelectorAll() { return []; }
  animate(frames: Keyframe[], options: KeyframeAnimationOptions) {
    this.frames = frames; this.options = options;
    return { cancel: () => { this.cancellations++; } } as Animation;
  }
}
const anchor = 'matrix(1, 0, 0, 1, -120, -100)';
Object.assign(globalThis, { HTMLElement: Surface, matchMedia: () => ({ matches: reduce }),
  getComputedStyle: () => ({ transform: anchor }), document: { activeElement: null, documentElement: { classList: { contains: () => false } } } });
const node = new Surface();
animateSurface(node as unknown as HTMLElement, 'arrive', 'panel');
assert.equal(node.frames.at(-1)?.transform, anchor, 'Picker ends at its existing CSS anchor');
assert.ok(String(node.frames[0]?.transform).startsWith(anchor), 'Picker travel is relative to that anchor');
animateSurface(node as unknown as HTMLElement, 'leave', 'panel');
assert.equal(node.cancellations, 1, 'New intent cancels the preceding motion immediately');
assert.equal(node.frames.at(-1)?.opacity, 0, 'Dismissed surface ends invisible');
assert.equal(node.options.fill, 'forwards', 'Keep the invisible final frame until React removes the surface');
reduce = true;
animateSurface(node as unknown as HTMLElement, 'arrive', 'modal');
assert.equal(node.options.duration, 100);
assert.equal(node.frames[0]?.transform, undefined, 'Reduced motion does not shrink or travel');
assert.equal(node.frames.at(-1)?.transform, anchor, 'Accessibility preference preserves layout');
reduce = false;
animateSurface(node as unknown as HTMLElement, 'arrive', 'page');
assert.ok(node.frames.every(frame => !frame.transform || frame.transform === 'none'), 'Route motion never changes fixed-control containing blocks');
console.log('PASS: anchored picker geometry, interruptible motion, reduced movement and stable fixed route controls.');

const listeners = new Map<string, Set<(event: any) => void>>();
const inputRoot = { dataset: {} as Record<string, string>, classList: { contains: () => false } };
Object.assign(globalThis, { Element: Surface, document: { documentElement: inputRoot,
  addEventListener: (type: string, handler: (event: any) => void) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type)!.add(handler); },
  removeEventListener: (type: string, handler: (event: any) => void) => listeners.get(type)?.delete(handler),
  querySelectorAll: () => [],
} });
const dispose = installMotionSystem();
const emit = (type: string, event: any) => listeners.get(type)?.forEach(handler => handler(event));
assert.equal(inputRoot.dataset.inputMethod, 'pointer');
emit('keydown', { key: 'Tab' }); assert.equal(inputRoot.dataset.inputMethod, 'keyboard');
emit('keydown', { key: 'a' }); assert.equal(inputRoot.dataset.inputMethod, 'keyboard', 'Typing does not erase keyboard context');
emit('pointerdown', { target: null }); assert.equal(inputRoot.dataset.inputMethod, 'pointer', 'Tapping clears the keyboard-ring heuristic before programmatic focus');
dispose(); assert.equal(inputRoot.dataset.inputMethod, undefined);
assert.ok([...listeners.values()].every(handlers => handlers.size === 0));
console.log('PASS: touch/pointer and keyboard focus cues stay distinct, with complete event cleanup.');
