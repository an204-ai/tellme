import assert from 'node:assert/strict';
import { installPopoverFallback } from '../src/lib/popover-fallback.ts';
class Node {
  dataset: Record<string,string> = {};
  attrs: Record<string,string> = { popover: 'auto' };
  trigger: Node | null = null;
  events: Event[] = [];
  visibilityAtEvent: (string | undefined)[] = [];
  getAttribute(name: string) { return this.attrs[name] ?? null; }
  contains(target: unknown) { return target === this; }
  dispatchEvent(event: Event) { this.events.push(event); this.visibilityAtEvent.push(this.dataset.fallbackOpen); return true; }
  closest() { return this.trigger; }
}
const first = new Node(), second = new Node();
const handlers: Record<string, (event: any) => void> = {};
Object.assign(globalThis, { HTMLElement: Node, Element: Node, document: {
  querySelectorAll: () => [first,second].filter(node=>node.dataset.fallbackOpen === 'true'),
  getElementById: (id: string) => id === 'first' ? first : second,
  addEventListener: (name: string, callback: (event: any) => void) => { handlers[name] = callback; },
} });
installPopoverFallback();
const a = first as unknown as HTMLElement, b = second as unknown as HTMLElement;
a.showPopover();
assert.equal(first.dataset.fallbackOpen, 'true');
b.showPopover();
assert.equal(first.dataset.fallbackOpen, undefined, 'Opening another auto popover closes the previous');
assert.equal(second.dataset.fallbackOpen, 'true');
handlers.click!({target:new Node()});
assert.equal(second.dataset.fallbackOpen, undefined, 'Outside taps dismiss');
const trigger = new Node(); trigger.attrs = {popovertarget:'first'}; trigger.trigger=trigger;
handlers.click!({target:trigger, preventDefault(){}});
assert.equal(first.dataset.fallbackOpen, 'true', 'Declarative trigger works without browser support');
handlers.keydown!({key:'Escape'});
assert.equal(first.dataset.fallbackOpen, undefined);
assert.equal(first.events.at(-2)?.type, 'beforetoggle', 'Exit motion gets a notification before hiding');
assert.equal(first.visibilityAtEvent.at(-2), 'true', 'The outgoing panel is still measurable when exit is captured');
assert.equal(first.visibilityAtEvent.at(-1), undefined);
assert.equal((first.events.at(-1) as Event & {newState:string}).newState, 'closed');
console.log('PASS: Safari fallback hides by default, auto exclusivity, trigger toggle, outside tap and Escape.');
