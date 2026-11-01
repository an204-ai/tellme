import nodemailer from "nodemailer";
import { config } from "./config.js";

export type AccountEmailKind = "verify-email" | "reset-password" | "password-changed";
interface EmailTemplate {
  subject: string;
  heading: string;
  intro: string;
  code?: string;
  action?: { label: string; url: string };
  note: string;
}
const escapeHTML = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function renderAccountEmail(content: EmailTemplate) {
  const { subject, heading, intro, code, action, note } = content;
  const text = [heading, intro, code ? `Mã xác nhận: ${code}` : "", action ? `${action.label}: ${action.url}` : "", note, "Tellme · Email bảo mật tài khoản"].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(subject)}</title></head><body style="margin:0;background:#f4f6fa;color:#111;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHTML(intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fff;border-radius:12px"><tr><td style="padding:32px 32px 24px;border-bottom:1px solid #e8edf3"><span style="font-size:32px;font-weight:700;color:#07327f;letter-spacing:-1px">tellme</span><div style="font-size:12px;color:#111;margin-top:6px">Your day. Your stories.</div></td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.4">${escapeHTML(heading)}</h1><p style="margin:0 0 24px;font-size:15px;line-height:1.7">${escapeHTML(intro)}</p>${code ? `<div style="margin:0 0 24px;padding:20px 12px;background:#f1f5fc;border-radius:8px;text-align:center"><span style="display:block;font-size:12px;margin-bottom:10px">Mã xác nhận của bạn</span><strong style="font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:1.4;letter-spacing:8px;color:#07327f">${escapeHTML(code)}</strong></div>` : ""}${action ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px"><tr><td style="background:#07327f;border-radius:8px"><a href="${escapeHTML(action.url)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-weight:700;font-size:14px">${escapeHTML(action.label)}</a></td></tr></table>` : ""}<p style="margin:0;font-size:13px;line-height:1.8">${escapeHTML(note)}</p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #e8edf3;font-size:12px;line-height:1.7">Email bảo mật tài khoản · Tellme<br>Email tự động, vui lòng không trả lời.</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}
export function accountEmailContent(kind: AccountEmailKind, value?: string) {
  if (kind === "verify-email" || kind === "reset-password") {
    if (!value || !/^\d{6}$/.test(value)) throw new Error("Missing confirmation code");
    const verification = kind === "verify-email";
    return renderAccountEmail({
      subject: verification ? "Mã xác thực email Tellme" : "Mã khôi phục mật khẩu Tellme",
      heading: verification ? "Xác thực email của bạn" : "Khôi phục mật khẩu",
      intro: verification ? "Còn một bước nữa để bắt đầu chia sẻ trên Tellme. Nhập mã dưới đây vào màn hình xác thực email nhé." : "Bạn vừa yêu cầu đặt lại mật khẩu Tellme. Nhập mã dưới đây vào màn hình khôi phục mật khẩu.",
      code: value,
      note: `Mã có hiệu lực trong 10 phút, chỉ dùng một lần và cho phép nhập tối đa 5 lần. Không chia sẻ mã này với người khác. ${verification ? "Nếu bạn không tạo tài khoản Tellme, hãy bỏ qua email này." : "Nếu bạn không yêu cầu, hãy bỏ qua email; mật khẩu của bạn chưa bị thay đổi."}`,
    });
  }
  return renderAccountEmail({ subject: "Mật khẩu Tellme đã được thay đổi", heading: "Đã thay đổi mật khẩu", intro: "Mật khẩu tài khoản Tellme của bạn vừa được thay đổi. Các phiên đăng nhập cũ đã được đăng xuất.", action: { label: "Khôi phục mật khẩu", url: new URL("/auth/forgot-password", config.APP_URL).href }, note: "Nếu bạn vừa đổi mật khẩu, bạn không cần làm gì thêm. Nếu không phải bạn thực hiện, hãy khôi phục mật khẩu ngay." });
}
export function accountMailTransport() {
  if (!config.SMTP_URL) throw new Error("Account email is not configured");
  return nodemailer.createTransport(config.SMTP_URL, { from: config.EMAIL_FROM });
}
export async function sendAccountEmail(to: string, kind: AccountEmailKind, value?: string, messageId?: string) {
  const transport = accountMailTransport();
  try { await transport.sendMail({ to, ...accountEmailContent(kind, value), ...(messageId ? { messageId: `<${messageId}@tellme>` } : {}) }); }
  finally { transport.close(); }
}
