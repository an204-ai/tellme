export const PRESENCE_TTL = 75000;

/** Minimal Redis port; state changes and publication are one atomic operation. */
type RedisPort = {
  status: string;
  eval(script: string, keys: number, ...args: (string | number)[]): Promise<unknown>;
  zrangebyscore(key: string, min: string | number, max: string | number, limit: "LIMIT", offset: number, count: number): Promise<string[]>;
};
const change = `
local now=tonumber(ARGV[3]); local id=ARGV[1]; local channel=ARGV[6]
local previous=redis.call('ZSCORE',KEYS[2],id)
redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now)
if ARGV[5]=='touch' then
  redis.call('ZADD',KEYS[1],now+tonumber(ARGV[4]),ARGV[2])
  redis.call('PEXPIRE',KEYS[1],tonumber(ARGV[4])+30000)
elseif ARGV[5]=='leave' then redis.call('ZREM',KEYS[1],ARGV[2]) end
local newest=redis.call('ZREVRANGE',KEYS[1],0,0,'WITHSCORES')
if #newest>0 then
  redis.call('ZADD',KEYS[2],newest[2],id)
  if not previous or tonumber(previous)<=now then
    redis.call('PUBLISH',channel,cjson.encode({kind='presence',userId=id,online=true,at=now,revision=redis.call('INCR',KEYS[3])}))
    return 1
  end
else
  redis.call('DEL',KEYS[1])
  if redis.call('ZREM',KEYS[2],id)>0 then
    redis.call('PUBLISH',channel,cjson.encode({kind='presence',userId=id,online=false,at=now,revision=redis.call('INCR',KEYS[3])}))
    return -1
  end
end
return 0`;

export type PresenceSnapshot = { onlineIds: string[]; revision: number };
export interface PresenceStore {
  touch(userId: string, connectionId: string, now?: number): Promise<void>;
  leave(userId: string, connectionId: string, now?: number): Promise<void>;
  online(ids: string[], now?: number): Promise<PresenceSnapshot>;
  sweep(now?: number): Promise<void>;
}
export class RedisPresence implements PresenceStore {
  readonly channel: string;
  private index: string;
  private namespace: string;
  private client: RedisPort;
  constructor(client: RedisPort, namespace: string) {
    this.client = client; this.namespace = `${namespace}:presence`; this.index = `${this.namespace}:online`; this.channel = `${this.namespace}:events`;
  }
  private async update(userId: string, connectionId: string, action: string, now: number) {
    if (this.client.status !== "ready") throw new Error("Presence unavailable");
    await this.client.eval(change, 3, `${this.namespace}:user:${userId}`, this.index, `${this.namespace}:revision`, userId, connectionId, now, PRESENCE_TTL, action, this.channel);
  }
  async touch(userId: string, connectionId: string, now = Date.now()) { await this.update(userId, connectionId, "touch", now); }
  async leave(userId: string, connectionId: string, now = Date.now()) { await this.update(userId, connectionId, "leave", now); }
  async online(ids: string[], now = Date.now()) {
    if (this.client.status !== "ready") throw new Error("Presence unavailable");
    const value = await this.client.eval(`
      local found={}; local now=tonumber(ARGV[1])
      for i=2,#ARGV do
        local score=redis.call('ZSCORE',KEYS[1],ARGV[i])
        if score and tonumber(score)>now then table.insert(found,ARGV[i]) end
      end
      return cjson.encode({onlineIds=found,revision=tonumber(redis.call('GET',KEYS[2]) or '0')})
    `, 2, this.index, `${this.namespace}:revision`, now, ...new Set(ids));
    const result = JSON.parse(String(value)) as PresenceSnapshot;
    // Redis cjson encodes an empty Lua table as {}, not [].
    if (!Array.isArray(result.onlineIds)) result.onlineIds = [];
    return result;
  }

  async sweep(now = Date.now()) {
    if (this.client.status !== "ready") return;
    const stale = await this.client.zrangebyscore(this.index, "-inf", now, "LIMIT", 0, 200);
    await Promise.all(stale.map((id) => this.update(id, "", "sweep", now)));
  }
}
