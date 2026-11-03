import type { Query, QueryClient } from '@tanstack/react-query';

type Operation<T> = {
  scope: string;
  matches: (query: Query) => boolean;
  apply: (data: unknown) => unknown;
  execute: () => Promise<T>;
  reconcile?: (data: unknown, result: T) => unknown;
};
type Layer = Pick<Operation<unknown>, 'matches' | 'apply'>;
/** Merge only changed leaves from a manual cache edit into the server base.
 * Entity arrays are keyed by id so inserts/deletes do not shift unrelated edits. */
function mergeEdit(base: unknown, visible: unknown, incoming: unknown): unknown {
  if (visible === incoming) return base;
  if (base === undefined) return incoming;
  if (Array.isArray(visible) && Array.isArray(incoming) && Array.isArray(base)) {
    if ([...visible, ...incoming, ...base].every((entry) => entry && typeof entry === "object" && typeof entry.id === "string")) {
      const old = new Map(visible.map((entry) => [entry.id, entry]));
      const original = new Map(base.map((entry) => [entry.id, entry]));
      return incoming.flatMap((entry) => {
        const value = mergeEdit(original.get(entry.id), old.get(entry.id), entry);
        return value === undefined ? [] : [value];
      });
    }
    return incoming;
  }
  if (visible && incoming && typeof visible === "object" && typeof incoming === "object" && !Array.isArray(visible) && !Array.isArray(incoming)) {
    const previous = visible as Record<string, unknown>, next = incoming as Record<string, unknown>;
    const result = { ...(base as Record<string, unknown> || {}) };
    for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
      if (!(key in next)) delete result[key];
      else result[key] = mergeEdit(result[key], previous[key], next[key]);
    }
    return result;
  }
  return incoming;
}
/** Per-client journal: server base + ordered pending edits. Never restore a whole snapshot. */
export class OptimisticMutations {
  private layers: Layer[] = [];
  private bases = new Map<Query, unknown>();
  private rendered = new Map<Query, unknown>();
  private queues = new Map<string, Promise<unknown>>();
  private writing = false;
  private unsubscribe?: () => void;
  private client: QueryClient;
  constructor(client: QueryClient) { this.client = client; }
  private render(query: Query) {
    let value = this.bases.get(query);
    for (const layer of this.layers) if (layer.matches(query)) value = layer.apply(value);
    this.rendered.set(query, value);
    this.writing = true;
    try { this.client.setQueryData(query.queryKey, value); } finally { this.writing = false; }
  }
  run<T>(operation: Operation<T>): Promise<T> {
    if (!this.unsubscribe) this.unsubscribe = this.client.getQueryCache().subscribe((event) => {
      if (this.writing) return;
      if (event.type === 'removed') { this.bases.delete(event.query); this.rendered.delete(event.query); return; }
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      if (!this.layers.some((layer) => layer.matches(event.query))) return;
      this.bases.set(event.query, event.action.manual && this.bases.has(event.query)
        ? mergeEdit(this.bases.get(event.query), this.rendered.get(event.query), event.query.state.data)
        : event.query.state.data);
      this.render(event.query);
    });
    this.layers.push(operation);
    for (const query of this.client.getQueryCache().findAll({ predicate: operation.matches })) {
      if (!this.bases.has(query)) this.bases.set(query, query.state.data);
      this.render(query);
    }
    const finish = (success: boolean, result?: T) => {
      this.layers = this.layers.filter((layer) => layer !== operation);
      for (const [query, base] of this.bases) {
        if (success && operation.matches(query)) this.bases.set(query,
          operation.reconcile ? operation.reconcile(base, result!) : operation.apply(base));
        this.render(query);
        if (!this.layers.some((layer) => layer.matches(query))) { this.bases.delete(query); this.rendered.delete(query); }
      }
      if (!this.layers.length) { this.unsubscribe?.(); this.unsubscribe = undefined; }
    };
    // Same entity writes are ordered; unrelated entities execute concurrently.
    const previous = this.queues.get(operation.scope) || Promise.resolve();
    const request = previous.catch(() => {}).then(operation.execute);
    const settled = request.then(async (result) => {
      await this.client.cancelQueries({ predicate: operation.matches });
      finish(true, result); return result;
    }, (error) => { finish(false); throw error; });
    this.queues.set(operation.scope, settled);
    void settled.finally(() => { if (this.queues.get(operation.scope) === settled) this.queues.delete(operation.scope); }).catch(() => {});
    return settled;
  }
}
const clients = new WeakMap<QueryClient, OptimisticMutations>();
export function optimisticMutations(client: QueryClient) {
  let manager = clients.get(client);
  if (!manager) { manager = new OptimisticMutations(client); clients.set(client, manager); }
  return manager;
}
