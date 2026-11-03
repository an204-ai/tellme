"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppData } from "@/lib/types";
import { apiRepository, request } from "@/lib/api-repository";
import { displayWeather, freshWeather, weatherUpdateKey, weatherUpdateMessage, type WeatherReport } from "@/lib/weather";

type LocationState = "idle" | "locating" | "ready" | "denied" | "error";
type WeatherContext = {
  report?: WeatherReport; fresh?: WeatherReport; configured: boolean | undefined;
  announcement?: { id: number; message: string; expiresAt: number };
  state: LocationState; error: string; fetching: boolean;
  locate: () => void; forget: () => void; retry: () => void;
};
const Context = createContext<WeatherContext>({ configured: undefined, state: "idle", error: "", fetching: false, locate() {}, forget() {}, retry() {} });
export const useWeather = () => useContext(Context);

export function WeatherProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname(), client = useQueryClient();
  const active = path === "/community/today" || path === "/community/feed";
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [state, setState] = useState<LocationState>("idle");
  const [error, setError] = useState("");
  const generation = useRef(0);
  const account = useQuery<AppData>({ queryKey: ["tellme", "community"], queryFn: ({ signal }) => apiRepository.get(signal), enabled: false });
  const identity = account.data?.authenticated ? account.data.people.find((person) => person.id === "me")?.username : undefined;
  const reminders = account.data?.settings.notifySystem !== false;
  const [announcement, setAnnouncement] = useState<WeatherContext["announcement"]>();
  const baseline = useRef<{ coords: string; signature: string; observedAt: number } | undefined>(undefined);
  const registered = useRef("");
  const configuration = useQuery({ queryKey: ["weather-config"], queryFn: ({ signal }) => request<{ enabled: boolean }>("/weather/config", { signal }), enabled: active, staleTime: 60000, retry: false });
  const query = useQuery({
    queryKey: ["weather-local", coords?.lat, coords?.lon],
    queryFn: ({ signal }) => request<WeatherReport>(`/weather?lat=${coords!.lat}&lon=${coords!.lon}`, { signal }),
    enabled: active && !!coords && configuration.data?.enabled === true,
    staleTime: 15 * 60000, gcTime: 0, retry: false,
    refetchInterval: active ? 15 * 60000 : false,
    refetchIntervalInBackground: false,
  });
  const locate = useCallback(() => {
    if (!navigator.geolocation) { setState("error"); setError("Trình duyệt chưa hỗ trợ vị trí. Bạn thử trên HTTPS hoặc localhost nhé."); return; }
    const ticket = ++generation.current;
    setState("locating"); setError("");
    navigator.geolocation.getCurrentPosition((position) => {
      if (ticket !== generation.current) return;
      // Coarse coordinates stay in browser RAM; consented push watches expire in Redis after 24h.
      setCoords({ lat: Number(position.coords.latitude.toFixed(2)), lon: Number(position.coords.longitude.toFixed(2)) });
      setState("ready");
      try { localStorage.setItem("tellme-weather-location", "allowed"); } catch { /* Optional preference. */ }
    }, (failure) => {
      if (ticket !== generation.current) return;
      setState(failure.code === 1 ? "denied" : "error");
      setError(failure.code === 1 ? "Bạn chưa cho phép vị trí. Có thể mở quyền vị trí trong trình duyệt rồi thử lại." : "Chưa xác định được vị trí. Bạn thử lại nhé.");
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60000 });
  }, []);
  const forget = useCallback(() => {
    generation.current++; setCoords(null); setState("idle"); setError("");
    baseline.current = undefined; setAnnouncement(undefined); registered.current = "";
    void request("/weather/watch", { method: "DELETE" }).catch(() => undefined);
    try { localStorage.removeItem("tellme-weather-location"); } catch { /* Optional preference. */ }
    void client.cancelQueries({ queryKey: ["weather-local"] });
    client.removeQueries({ queryKey: ["weather-local"] });
  }, [client]);
  useEffect(() => {
    if (!active || coords || configuration.data?.enabled !== true || !navigator.permissions) return;
    let cancelled = false;
    void navigator.permissions.query({ name: "geolocation" }).then((permission) => {
      if (!cancelled && permission.state === "granted" && localStorage.getItem("tellme-weather-location") === "allowed") locate();
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [active, configuration.data?.enabled, coords, locate]);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => {
    if (!navigator.permissions || !coords) return;
    let disposed = false, permission: PermissionStatus | undefined;
    const changed = () => { if (permission && permission.state !== "granted") { forget(); setState(permission.state === "denied" ? "denied" : "idle"); setError("Quyền vị trí đã tắt. Tellme đã ngừng dùng vị trí của bạn."); } };
    void navigator.permissions.query({ name: "geolocation" }).then((result) => { if (!disposed) { permission = result; permission.addEventListener("change", changed); changed(); } }).catch(() => {});
    return () => { disposed = true; permission?.removeEventListener("change", changed); };
  }, [coords, forget]);
  useEffect(() => {
    const report = freshWeather(query.data);
    if (!report || query.isError || !coords) return;
    const place = `${coords.lat}:${coords.lon}`, signature = weatherUpdateKey(report), old = baseline.current;
    if (old?.coords === place && report.observedAt < old.observedAt) return;
    if (old?.coords === place && old.signature !== signature) {
      setAnnouncement({ id: Date.now(), message: weatherUpdateMessage(report), expiresAt: Date.now() + 10000 });
    }
    baseline.current = { coords: place, signature, observedAt: report.observedAt };
  }, [query.data, query.isError, coords]);
  useEffect(() => {
    if (!identity || !coords || !active || !reminders || configuration.data?.enabled !== true) return;
    const key = `${identity}:${coords.lat}:${coords.lon}:${Math.floor(Date.now() / (30 * 60000))}`;
    if (registered.current === key) return;
    let cancelled = false;
    const abort = new AbortController();
    // Authenticated, consented weather watches live in Redis for 24h, never a profile.
    const save = () => request("/weather/watch", { method: "PUT", signal: abort.signal, body: JSON.stringify(coords) }).then(() => { if (!cancelled) registered.current = key; }).catch(() => undefined);
    void save();
    // A temporary Redis outage must not silently disable the watch for the session.
    const retry = setInterval(() => { if (registered.current !== key) void save(); }, 60000);
    return () => { cancelled = true; abort.abort(); clearInterval(retry); };
  }, [identity, coords, active, reminders, configuration.data?.enabled, query.dataUpdatedAt]);
  // Reassess age while a tab stays open/offline, even if no query can finish.
  const [, tick] = useState(0);
  useEffect(() => { if (!active || !coords) return; const timer = setInterval(() => tick((value) => value + 1), 60000); return () => clearInterval(timer); }, [active, coords]);
  const report = coords ? displayWeather(query.data, query.isError) : undefined;
  return <Context.Provider value={{ report, fresh: freshWeather(report), configured: configuration.data?.enabled,
    announcement, state, error: error || (query.isError ? query.error.message : configuration.isError ? "Chưa kết nối được thời tiết. Bạn thử lại nhé." : ""),
    fetching: query.isFetching || configuration.isPending,
    locate, forget, retry: () => { if (!configuration.data?.enabled || configuration.isError) void configuration.refetch(); else if (!coords) locate(); else void query.refetch(); },
  }}>{children}</Context.Provider>;
}
