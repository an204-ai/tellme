"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { loginSchema, registerSchema } from "@/lib/validation";
import { request, apiRepository } from "@/lib/api-repository";
import { useQueryClient } from "@tanstack/react-query";
import { Brand } from "@/components/ui/Primitives";

interface AuthInput {
  email: string;
  password: string;
  name: string;
}
export function AuthScreen({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<AuthInput>({
    resolver: zodResolver(register ? registerSchema : loginSchema),
    defaultValues: { email: "", password: "", name: "" },
  });
  const submit = form.handleSubmit(async (input) => {
    setError("");
    try {
      await request(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      apiRepository.clear();
      queryClient.clear();
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(
        next &&
          next.startsWith("/") &&
          !next.startsWith("//") &&
          !next.startsWith("/auth/")
          ? next
          : "/community/today",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Chưa đăng nhập được. Bạn thử lại nhé.",
      );
    }
  });
  return (
    <main className="auth-page">
      <section
        className="auth-visual"
        style={{
          backgroundImage: "url(/images/photo-1441974231531-c6227db76b6e.jpg)",
        }}
      >
        <Link href="/community/today" className="auth-brand">
          <Brand />
        </Link>
        <div className="auth-visual-copy">
          <h1>
            Một ngày của bạn.
            <br />
            Muôn vàn câu chuyện.
          </h1>
          <p>
            Chia sẻ những điều bình thường.
            <br />
            Tìm thấy những kết nối đặc biệt.
          </p>
          <span>Your day. Your stories.</span>
        </div>
        <span className="auth-photo-caption">
          Những khoảnh khắc luôn đáng được lưu giữ.
        </span>
      </section>
      <section className="auth-form-area">
        <Link href="/community/today" className="auth-mobile-brand">
          <Brand />
        </Link>
        <div className="uiv-form">
          <div className="container auth-card">
            <div className="heading">
              {register ? "Câu chuyện bắt đầu từ bạn." : "Mừng bạn trở lại."}
            </div>
            <p className="auth-description">
              {register
                ? "Cùng kể, cùng lắng nghe, cùng kết nối."
                : "Hôm nay, bạn có điều gì muốn kể?"}
            </p>
            <form className="form" onSubmit={submit} noValidate>
              {register && (
                <div>
                  <label className="sr-only" htmlFor="auth-name">
                    Tên hiển thị
                  </label>
                  <span className="auth-field">
                    <UserRound size={18} />
                    <input
                      id="auth-name"
                      className="input"
                      placeholder="Tên bạn muốn mọi người gọi"
                      autoComplete="nickname"
                      {...form.register("name")}
                    />
                  </span>
                  {form.formState.errors.name && (
                    <p className="field-error" role="alert">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="sr-only" htmlFor="auth-email">
                  Email
                </label>
                <span className="auth-field">
                  <Mail size={18} />
                  <input
                    id="auth-email"
                    className="input"
                    type="email"
                    placeholder="Email của bạn"
                    autoComplete="email"
                    {...form.register("email")}
                  />
                </span>
                {form.formState.errors.email && (
                  <p className="field-error" role="alert">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="sr-only" htmlFor="auth-password">
                  Mật khẩu
                </label>
                <span className="auth-field">
                  <LockKeyhole size={18} />
                  <input
                    id="auth-password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mật khẩu (từ 8 ký tự)"
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    {...form.register("password")}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
                {form.formState.errors.password && (
                  <p className="field-error" role="alert">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              {error && (
                <p className="field-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="login-button"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Đang mở…"
                  : register
                    ? "Bắt đầu câu chuyện"
                    : "Đăng nhập"}
                <ArrowRight size={17} />
              </button>
            </form>
            <p className="auth-switch">
              {register ? "Đã quen với Tellme?" : "Lần đầu bạn đến đây?"}{" "}
              <Link href={register ? "/auth/login" : "/auth/register"}>
                {register ? "Đăng nhập" : "Tạo tài khoản"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
