"use client";
import Image from "next/image";
import { forwardRef, useId } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Check, Globe2, LockKeyhole, Search, Users, X } from "lucide-react";
import type { Person, Privacy } from "@/lib/types";
import { LoaderArt } from "./SourceArt";
import { usePresenceStore } from "@/stores/presence.store";

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <span className={`uiv-button button-wrap ${className}`}>
      <button className={`button button-${variant}`} {...props}>
        {children}
      </button>
    </span>
  );
}
export function IconButton({
  children,
  label,
  tooltip = true,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tooltip?: boolean }) {
  return (
    <button
      className={`icon-button ${tooltip ? "uiv-tooltip" : ""} ${className}`}
      type="button"
      aria-label={label}
      data-tooltip={tooltip ? label : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
export function Avatar({
  person,
  size = "md",
  className = "",
}: {
  person?: Pick<Person, "name" | "avatar"> & Partial<Pick<Person, "id">>;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const online = usePresenceStore((state) => !!person?.id && !!state.online[person.id]);
  return (
    <span className={`avatar avatar-${size} ${className}`}>
      {person?.avatar.startsWith("/images/group-avatars/") ? <Image src={person.avatar} alt={person.name} width={120} height={120} sizes="120px" /> : <img
        src={person?.avatar}
        alt={person?.name || "Thành viên Tellme"}
        loading="lazy"
        onLoad={(event) => {
          event.currentTarget.style.opacity = "1";
        }}
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
      }
      <span className="avatar-fallback" aria-hidden="true">
        {person?.name.charAt(0) || "T"}
      </span>
      {online && <span className="avatar-online" role="img" aria-label="Đang hoạt động" title="Đang hoạt động" />}
    </span>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <img
      className={`brand-wordmark ${compact ? "compact" : ""}`}
      src="/brand/logos/tellme-wordmark-on-light.png"
      width={367}
      height={115}
      alt="Tellme — Your day. Your stories."
    />
  );
}
export function Loader({
  label = "Đang tải câu chuyện…",
  small = false,
}: {
  label?: string;
  small?: boolean;
}) {
  return (
    <div className={`loading-state ${small ? "small" : ""}`} role="status" data-route-loading={small ? undefined : "true"}>
      <span className="uiv-loading">
        <LoaderArt />
      </span>
      <span>{label}</span>
    </div>
  );
}
export function ImageUploadSpinner() {
  return (
    <span className="uiv-image-loader" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
export function ImageUploadStatus({
  label = "Đang tải ảnh lên Tellme…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className={`image-upload-status ${compact ? "compact" : ""}`} role="status">
      <ImageUploadSpinner />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode }
>(function Input({ className = "", leading, ...props }, ref) {
  return (
    <span className={`uiv-input input-wrap ${className}`}>
      <span className="cir-search">
        {leading}
        {/* Accessible name is supplied through aria-label or an associated label. */}
        <input ref={ref} className="cir-search__field" {...props} />
      </span>
    </span>
  );
});
export const SearchInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function SearchInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="search"
      leading={<Search size={18} aria-hidden="true" />}
      {...props}
    />
  );
});
export const privacyNames: Record<Privacy, string> = {
  public: "Công khai",
  connections: "Bạn bè",
  private: "Chỉ mình tôi",
};
export function PrivacyIcon({
  value,
  size = 13,
}: {
  value: Privacy;
  size?: number;
}) {
  return value === "public" ? (
    <Globe2 size={size} />
  ) : value === "connections" ? (
    <Users size={size} />
  ) : (
    <LockKeyhole size={size} />
  );
}
export function AudiencePicker({
  value,
  onChange,
}: {
  value: Privacy;
  onChange: (value: Privacy) => void;
}) {
  const name = useId();
  return (
    <fieldset className="uiv-radio">
      <legend className="field-label">Ai có thể xem?</legend>
      <div className="radio-inputs">
        {(["public", "connections", "private"] as const).map((choice) => (
          <label key={choice}>
            <input
              type="radio"
              name={name}
              value={choice}
              checked={value === choice}
              onChange={() => onChange(choice)}
              className="radio-input"
            />
            <span className="radio-tile">
              <span className="radio-icon">
                <PrivacyIcon value={choice} size={18} />
              </span>
              <span className="radio-label">{privacyNames[choice]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="uiv-toggle">
      <label className="switch">
        <input
          type="checkbox"
          role="switch"
          aria-label={label}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="slider">
          <span className="circle">
            <X className="cross" size={7} />
            <Check className="checkmark" size={12} />
          </span>
        </span>
      </label>
    </span>
  );
}
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label = "Lọc nội dung",
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  const selected = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );
  return (
    <div className="uiv-tabs">
      <div className="tabs" role="group" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.value}
            type="button"
            className="tab"
            aria-pressed={value === item.value}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                return;
              event.preventDefault();
              const next =
                (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
                items.length;
              const entry = items[next];
              if (entry) {
                onChange(entry.value);
                (
                  event.currentTarget.parentElement?.children[
                    next
                  ] as HTMLButtonElement
                )?.focus();
              }
            }}
          >
            {item.label}
          </button>
        ))}
        <span
          aria-hidden="true"
          className="glider"
          style={{
            width: `calc((100% - 8px) / ${items.length})`,
            transform: `translateX(${selected * 100}%)`,
          }}
        />
      </div>
    </div>
  );
}
export function HeartButton({
  active,
  onClick,
  count = 0,
  label,
}: {
  label?: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <span className={`uiv-heart-tooltip ${active ? "is-liked" : ""}`}>
      <span className="tooltip">
        <button
          type="button"
          aria-label={
            label
              ? active
                ? "Bỏ thích bài viết"
                : "Thích bài viết"
              : active
                ? "Bỏ thả tim"
                : "Thả tim"
          }
          aria-pressed={active}
          className={label ? "trigger with-label" : "sizer trigger"}
          onClick={onClick}
        >
          <span className="heart-icon" aria-hidden="true">
            <svg
              className="sizer heart"
              aria-hidden="true"
              viewBox="0 0 256 256"
              fill="currentColor"
            >
              <path
                opacity="0.2"
                className="fill"
                d="M232,102c0,66-104,122-104,122S24,168,24,102A54,54,0,0,1,78,48c22.59,0,41.94,12.31,50,32,8.06-19.69,27.41-32,50-32A54,54,0,0,1,232,102Z"
              />
              <path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z" />
            </svg>
            <svg
              className="sizer checkround"
              aria-hidden="true"
              viewBox="0 0 44 44"
            >
              <path
                transform="translate(-2,-2)"
                d="M39.74,11.59C35.28,6.53 30.03,4 24,4C12.95,4 4,12.95 4,24C4,35.05 12.95,44 24,44C35.05,44 44,35.05 44,24C44,19.3 42.58,15.16 39.74,11.59"
              />
            </svg>
          </span>
          {label && (
            <span className="heart-label">{active ? "Đã thích" : label}</span>
          )}
        </button>
        <span className="content">
          {active ? "Đã thả tim" : "Thả tim"} · {count}
        </span>
      </span>
    </span>
  );
}
