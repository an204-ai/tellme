const storageKey = "tellme:interface-sounds";
const volume = .22;
const listeners = new Set<() => void>();
let enabled = true;
let audio: AudioContext | undefined;
let output: GainNode | undefined;
let resuming = false;
let pendingCue: (() => void) | undefined;
let lastPlayed = -Infinity;

// Synthesized cues also cover the interval before chat samples finish loading.
const cues = {
  tap: { from: 450, to: 320, duration: .055, level: .19 },
  pop: { from: 380, to: 720, duration: .105, level: .23 },
  slide: { from: 420, to: 190, duration: .15, level: .14 },
  sent: { from: 540, to: 810, duration: .12, level: .2 },
  replyDrag: { from: 360, to: 510, duration: .06, level: .16 },
  notification: { from: 640, to: 960, duration: .2, level: .26 },
} as const;

const sampleFiles = {
  replyDrag: "/sounds/drag-start.wav",
  sent: "/sounds/mixkit-long-pop-2358.wav",
  reaction: "/sounds/uisfx/reaction.wav",
  reactionBurst: "/sounds/bubble-rise.wav",
  blocked: "/sounds/uisfx/lock.wav",
  typing: "/sounds/uisfx/typing.wav",
  notification: "/sounds/uisfx/notification.wav",
  success: "/sounds/uisfx/success.wav",
  weather: "/sounds/uisfx/info.wav",
} as const;
type SampleName = keyof typeof sampleFiles;
type CueName = keyof typeof cues | SampleName;
const samples = new Map<CueName, AudioBuffer>();
const loadingSamples = new Set<SampleName>();
const cooldowns = { reactionBurst: 1000, typing: 5000, notification: 2500, weather: 60000 } as const;
const lastCue = new Map<CueName, number>();

function preloadSounds(names: SampleName[]) {
  if (!enabled) return;
  const unloaded = names.filter((name) => !samples.has(name) && !loadingSamples.has(name));
  if (!unloaded.length) return;
  let decoder: BaseAudioContext;
  try { decoder = audio ?? new OfflineAudioContext(1, 1, 24000); } catch { return; }
  for (const name of unloaded) {
    loadingSamples.add(name);
    void fetch(sampleFiles[name]).then(async (response) => {
      if (response.ok) samples.set(name, await decoder.decodeAudioData(await response.arrayBuffer()));
    }).catch(() => {}).finally(() => { loadingSamples.delete(name); });
  }
}

export function preloadMessageSounds() {
  preloadSounds(["replyDrag", "sent", "typing"]);
}

function preloadSharedSounds() {
  preloadSounds(["reaction", "reactionBurst", "blocked", "notification", "success", "weather"]);
}

export const getInterfaceSoundsEnabled = () => enabled;
export const getDefaultInterfaceSoundsEnabled = () => true;

export function subscribeToInterfaceSounds(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function applyPreference(next: boolean) {
  if (enabled === next) return;
  enabled = next;
  if (!next) pendingCue = undefined;
  if (output && audio) output.gain.setValueAtTime(next ? volume : 0, audio.currentTime);
  listeners.forEach((listener) => listener());
}

export function setInterfaceSoundsEnabled(next: boolean) {
  applyPreference(next);
  try { localStorage.setItem(storageKey, next ? "on" : "off"); } catch { /* Keep the in-memory preference. */ }
}

function unlockAudio(event: Event) {
  if (!enabled || !event.isTrusted || document.hidden) return;
  if (event.type === "pointerdown" && (event as PointerEvent).pointerType !== "mouse") return;
  if (event.type === "keydown" && (event as KeyboardEvent).repeat) return;
  if (navigator.userActivation?.isActive === false) return;
  const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return;
  try {
    if (!audio) {
      audio = new Audio();
      output = audio.createGain();
      output.gain.value = volume;
      output.connect(audio.destination);
    }
    if (audio.state !== "running" && !resuming) {
      const resumed = audio.resume();
      resuming = true;
      void resumed.catch(() => undefined).finally(() => {
        resuming = false;
        const playPending = pendingCue;
        pendingCue = undefined;
        playPending?.();
      });
    }
  } catch { /* Audio support must never interrupt an interaction. */ }
}

export function enableInterfaceSoundGestures() {
  try { applyPreference(localStorage.getItem(storageKey) !== "off"); } catch { /* Storage is optional. */ }
  preloadSharedSounds();
  const unsubscribe = subscribeToInterfaceSounds(preloadSharedSounds);
  const syncPreference = (event: StorageEvent) => {
    if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) {
      applyPreference(event.newValue !== "off");
    }
  };
  const gestures = ["pointerdown", "pointerup", "touchend", "keydown", "click"] as const;
  gestures.forEach((type) => window.addEventListener(type, unlockAudio, { capture: true, passive: true }));
  window.addEventListener("storage", syncPreference);
  return () => {
    gestures.forEach((type) => window.removeEventListener(type, unlockAudio, true));
    window.removeEventListener("storage", syncPreference);
    unsubscribe();
  };
}

export function playInterfaceSound(name: CueName) {
  const cooldown = cooldowns[name as keyof typeof cooldowns] ?? 0;
  if (!enabled || !audio || document.hidden) return;
  const requested = performance.now();
  const play = () => {
    if (!enabled || !audio || !output || audio.state !== "running" || document.hidden
        || performance.now() - requested > 200 || requested - lastPlayed < 45
        || requested - (lastCue.get(name) ?? -Infinity) < cooldown) return;
    try {
      const sample = samples.get(name);
      if (sample) {
        const source = audio.createBufferSource();
        const gain = audio.createGain();
        gain.gain.value = .45;
        source.buffer = sample;
        source.connect(gain).connect(output);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start();
        lastPlayed = requested;
        if (cooldown) lastCue.set(name, requested);
        return;
      }
      const cue = cues[name === "reaction" ? "pop" : name as keyof typeof cues];
      if (!cue) return;
      const { from, to, duration, level } = cue;
      const time = audio.currentTime;
      const tone = audio.createOscillator();
      const envelope = audio.createGain();
      tone.type = "sine";
      tone.frequency.setValueAtTime(from, time);
      tone.frequency.exponentialRampToValueAtTime(to, time + duration * .75);
      envelope.gain.setValueAtTime(.001, time);
      envelope.gain.exponentialRampToValueAtTime(level, time + .009);
      envelope.gain.exponentialRampToValueAtTime(.001, time + duration);
      tone.connect(envelope).connect(output);
      tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
      tone.start(time);
      tone.stop(time + duration);
      lastPlayed = requested;
      if (cooldown) lastCue.set(name, requested);
    } catch { /* Sound is optional feedback. */ }
  };
  if (audio.state === "running") play();
  else if (resuming) pendingCue = play;
}
