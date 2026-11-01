"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCommunity } from "@/hooks/use-community";
import { useAppStore } from "@/stores/app.store";
import { localDay, personalInfoSchema } from "@/lib/validation";
import { Button, Input } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";

export function EditPersonalInfo() {
  const { data, update, saving } = useCommunity();
  const open = useAppStore((state) => state.open);
  const notify = useAppStore((state) => state.notify);
  const person = data?.people.find((entry) => entry.id === "me");
  const [error, setError] = useState("");
  const form = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      location: person?.location || "", birthday: person?.birthday || "",
      occupation: person?.occupation || "", interests: person?.interests || "",
      favoriteLunch: person?.favoriteLunch || "", favoriteDrink: person?.favoriteDrink || "",
    },
  });
  const busy = saving || form.formState.isSubmitting;
  if (!person) return null;
  return <Modal title="Một chút về mình" className="personal-info-dialog" onClose={() => { if (!busy) open(null); }}>
    <form className="dialog-body personal-info-form" onSubmit={form.handleSubmit(async (input) => {
      setError("");
      try {
        await update((draft) => { const me = draft.people.find((entry) => entry.id === "me"); if (me) Object.assign(me, input); });
        open(null);
        notify("Đã cập nhật những điều về bạn.");
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa lưu được thông tin. Bạn thử lại nhé."); }
    })}>
      <p>Chọn những điều bạn muốn chia sẻ trên hồ sơ. Tất cả đều không bắt buộc.</p>
      <fieldset disabled={busy} className="profile-personal-fields">
        <legend className="sr-only">Thông tin cá nhân</legend>
        <div className="profile-personal-form-grid">
          {([
            ["location", "Đang ở", "text", 60],
            ["birthday", "Ngày sinh", "date", undefined],
            ["occupation", "Công việc", "text", 60],
            ["interests", "Sở thích", "text", 80],
            ["favoriteLunch", "Món ăn trưa yêu thích", "text", 60],
            ["favoriteDrink", "Đồ uống quen thuộc", "text", 60],
          ] as const).map(([field, label, type, limit]) => <div key={field}>
            <label className="field-label" htmlFor={`personal-${field}`}>{label}</label>
            <Input id={`personal-${field}`} type={type} maxLength={limit} min={type === "date" ? "1900-01-01" : undefined} max={type === "date" ? localDay() : undefined} {...form.register(field)} aria-invalid={!!form.formState.errors[field]} aria-describedby={form.formState.errors[field] ? `personal-${field}-error` : undefined} />
            {form.formState.errors[field] && <p id={`personal-${field}-error`} className="field-error" role="alert">{form.formState.errors[field]?.message}</p>}
          </div>)}
        </div>
      </fieldset>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="personal-info-actions">
        <Button variant="secondary" type="button" disabled={busy} onClick={() => open(null)}>Hủy</Button>
        <Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</Button>
      </div>
    </form>
  </Modal>;
}
