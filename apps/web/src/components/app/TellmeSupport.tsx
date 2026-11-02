"use client";

import { useEffect, useState } from "react";
import { Check, Coffee, Copy, Download, HeartHandshake } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Primitives";
import { tellmeSupport } from "@/lib/support";
import { useAppStore } from "@/stores/app.store";
import { useBrandIntroFinished } from "./BrandIntro";

let seenThisSession = false;

/** One dismissible invitation per browser. Opening the QR always requires a click. */
export function SupportInvitation({ eligible }: { eligible: boolean }) {
  const introFinished = useBrandIntroFinished();
  const { overlay, viewedStory, musicStoryId, musicInvitationStoryId, open } = useAppStore();
  const [offer, setOffer] = useState(false);
  useEffect(() => {
    try { setOffer(!seenThisSession && !localStorage.getItem(tellmeSupport.invitationKey)); }
    catch { setOffer(!seenThisSession); }
  }, []);
  const visible = introFinished && offer && eligible && !overlay && !viewedStory && !musicStoryId && !musicInvitationStoryId;
  useEffect(() => {
    if (!visible) return;
    seenThisSession = true;
    try { localStorage.setItem(tellmeSupport.invitationKey, "seen"); } catch { /* In-memory suppression still prevents repeated prompts in this session. */ }
  }, [visible]);
  if (!visible) return null;
  return <SupportWelcome onClose={() => setOffer(false)} onSupport={() => { setOffer(false); open("support"); }} />;
}

export function SupportWelcome({ onClose, onSupport }: { onClose: () => void; onSupport: () => void }) {
  return <Modal title="Cùng chăm chút Tellme" className="support-welcome-dialog" onClose={onClose}>
    <div className="support-welcome-layout">
      <div className="support-welcome-art" aria-hidden="true">
        <img className="support-welcome-wordmark" src="/brand/logos/tellme-wordmark-on-dark.png" alt="" />
        <img className="support-welcome-love" src="/images/reactions/love.png" alt="" />
        <span className="support-welcome-coffee"><Coffee size={27} strokeWidth={1.7} /></span>
        <span className="support-welcome-art-copy">Your day.<br />Your stories.</span>
      </div>
      <div className="support-welcome-copy">
        <h3>Một chút ủng hộ.<br />Thêm nhiều chuyện để kể.</h3>
        <p>Tellme đang được chăm chút mỗi ngày. Nếu thích góc nhỏ này, bạn có thể gửi một ly cà phê để mình tiếp tục phát triển ứng dụng.</p>
        <Button onClick={onSupport}><HeartHandshake size={19} />Ủng hộ Tellme</Button>
        <button className="support-welcome-later" type="button" onClick={onClose}>Để lúc khác nhé</button>
        <span className="support-welcome-note">Có bạn ở đây đã là một niềm vui rồi.</span>
      </div>
    </div>
  </Modal>;
}

export function SupportModal() {
  const open = useAppStore((state) => state.open);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return <Modal title="Góp một chút cho Tellme" className="donation-dialog" onClose={() => open(null)}>
    <div className="donation-scroll">
      <p className="donation-intro">Nếu Tellme làm ngày đi làm của bạn vui hơn một chút, bạn có thể gửi một ly cà phê để mình tiếp tục chăm chút ứng dụng.</p>
      <div className="donation-layout">
        <div className="donation-qr"><img src={tellmeSupport.qr} alt="Mã VietQR ủng hộ Tellme, người nhận NGUYEN THANH AN, tài khoản 0765638196" /></div>
        <div className="donation-details">
          <div className="donation-mascot" aria-hidden="true"><img src="/brand/stickers/tellme-please.png" alt="" width="1254" height="1254" /></div>
          <div className="donation-recipient"><span>Người nhận</span><strong>{tellmeSupport.recipient}</strong><span>Số tài khoản</span><div><strong>{tellmeSupport.account}</strong><button type="button" className="donation-copy" aria-label={copied ? "Đã sao chép số tài khoản" : "Sao chép số tài khoản"} onClick={async () => {
            try { await navigator.clipboard.writeText(tellmeSupport.account); setCopied(true); setError(""); }
            catch { setError("Bạn nhấn giữ số tài khoản để sao chép nhé."); }
          }}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Đã chép" : "Sao chép"}</button></div></div>
          {error && <p className="field-error" role="alert">{error}</p>}
          <p className="donation-hint">Quét QR bằng ứng dụng ngân hàng. Nếu đang dùng điện thoại, lưu ảnh QR rồi chọn ảnh đó trong ứng dụng ngân hàng nhé.</p>
          <a className="donation-download" href={tellmeSupport.qr} download="tellme-vietqr.jpg"><Download size={17} />Lưu ảnh QR</a>
        </div>
      </div>
    </div>
    <footer className="donation-footer"><span><HeartHandshake size={18} />Cảm ơn bạn đã ở đây cùng Tellme.</span><Button variant="secondary" onClick={() => open(null)}>Để lúc khác</Button></footer>
  </Modal>;
}
