"use client";
import Link from "next/link";
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
import { authDestination } from "@/lib/auth-navigation";
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
      const result = await request<{ verificationRequired?: boolean; verificationEmailSent?: boolean }>(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      apiRepository.clear();
      queryClient.clear();
      if (result.verificationRequired) {
        window.location.replace(`/auth/verify-email${result.verificationEmailSent === false ? "?delivery=failed" : ""}`);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      // A document navigation discards a prefetched unauthenticated RSC redirect.
      // Cookies are already committed by the successful login response.
      window.location.replace(authDestination(next));
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
      <section className="auth-visual" aria-label="Giới thiệu Tellme">
        <Link href="/community/today" className="auth-brand">
          <Brand />
        </Link>

      </section>
      <section className="auth-form-area">
        <div className="uiv-form">
          <div className="container auth-card">
            <div className="heading">
              {register ? "Tạo tài khoản" : "Đăng nhập"}
            </div>
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
                    placeholder={register ? "Mật khẩu (từ 8 ký tự)" : "Mật khẩu"}
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
                  ? "Đang đăng nhập…"
                  : register
                    ? "Tạo tài khoản"
                    : "Đăng nhập"}
                <ArrowRight size={17} />
              </button>
            </form>
            {!register && <Link className="auth-forgot-link" href="/auth/forgot-password">Quên mật khẩu?</Link>}
            <p className="auth-switch">
              {register ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
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
