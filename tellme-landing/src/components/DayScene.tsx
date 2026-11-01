'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronRight, Clock3, Globe2, MessageCircle, Plus, Send } from 'lucide-react';
import { moments } from '@/lib/content';
import { useDayDemo } from '@/lib/store';

export function DayScene({ compact = false }: { compact?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const moment = useDayDemo((state) => state.moment);
  const choose = useDayDemo((state) => state.choose);
  const current = moments[moment];
  useEffect(() => {
    const element = root.current;
    if (!element || compact || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { const box = element.getBoundingClientRect(); element.style.setProperty('--px', `${((event.clientX - box.left) / box.width - .5) * 11}px`); element.style.setProperty('--py', `${((event.clientY - box.top) / box.height - .5) * 8}px`); });
    };
    const reset = () => { element.style.setProperty('--px', '0px'); element.style.setProperty('--py', '0px'); };
    const observer = new IntersectionObserver(([entry]) => element.classList.toggle('is-paused', !entry.isIntersecting)); observer.observe(element);
    const visibility = () => element.classList.toggle('is-paused', document.hidden);
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', reset); document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', reset); document.removeEventListener('visibilitychange', visibility); };
  }, [compact]);

  return <div ref={root} className={`day-scene ${compact ? 'scene-compact' : ''}`}>
    {!compact && <>
      <img className="scene-sticker scene-sticker-camera" src="/brand/stickers/camera-moment.png" alt="" aria-hidden="true" width="1254" height="1254" />
      <img className="scene-sticker scene-sticker-chat" src="/brand/stickers/conversation-bubbles.png" alt="" aria-hidden="true" width="1254" height="1254" />
      <img className="scene-sticker scene-sticker-plane" src="/brand/stickers/paper-plane-heart.png" alt="" aria-hidden="true" width="1254" height="1254" />
      <img className="scene-sticker scene-sticker-calendar" src="/brand/stickers/daily-calendar-heart.png" alt="" aria-hidden="true" width="1254" height="1254" />
      <img className="orbit-reaction orbit-love" src="/reactions/love.webp" alt="" width="220" height="220" />
      <img className="orbit-reaction orbit-haha" src="/reactions/haha.webp" alt="" width="220" height="220" />
      <span className="orbit-note"><img src="/reactions/like.webp" alt="" width="44" height="44" />Một ngày rất mình.</span>
    </>}
    <div className="phone"><div className="phone-notch" /><div className="phone-screen"><div className="phone-status"><span>9:41</span><span className="phone-status-bars" aria-hidden="true">▮ ▮ ▮</span></div>
      <div className="phone-nav"><img src="/brand/logos/tellme-wordmark-on-light.png" alt="Tellme" width="367" height="115" /><Camera size={18} /></div>
      <div className="phone-greeting">Ngày của Mai <span><Globe2 size={11} /> Hôm nay</span></div>
      <div className="phone-photo">
        <img key={current.id} src={current.image} alt={current.alt} width="900" height="1125" />
        <span>{current.time}</span><div className="phone-photo-caption">{current.caption}</div>
      </div>
      <div className="phone-timeline" role="group" aria-label="Xem ba khoảnh khắc trong ngày">{moments.map((item, index) => <button type="button" aria-pressed={index === moment} key={item.id} onClick={() => choose(index)}><span />{item.tab}</button>)}</div>
      <div className="phone-reply"><span>Kể tiếp với Mai…</span><Send size={15} /></div>
    </div></div>
  </div>;
}

export function DaySwitcher() {
  const active = useDayDemo((state) => state.moment); const choose = useDayDemo((state) => state.choose);
  return <section className="day-section section-shell"><div className="day-copy"><h2>Không cần ngày đặc biệt.<br /><span>Ngày của bạn là đủ.</span></h2><p>Ly cà phê đầu ca. Bữa trưa quen thuộc. Một đoạn đường tan ca. Gom lại từng chút, thành một ngày có chuyện để nhớ.</p><div className="day-tabs" role="group" aria-label="Chọn thời điểm trong ngày">{moments.map((item, index) => <button type="button" key={item.id} aria-pressed={index === active} onClick={() => choose(index)}>{item.tab}<ChevronRight size={17} /></button>)}</div><a href="/tell-me-now/" className="text-link">Làm quen với Tell me now <ChevronRight size={18} /></a></div><div className="day-feature day-feature-timeline"><div className="timeline-heading"><img src="/brand/stickers/daily-calendar-heart.png" alt="" width="1254" height="1254" /><div><span>Một ngày, ba nhịp</span><strong>Cứ kể theo cách của bạn.</strong></div></div><div className="timeline-entries">{moments.map((item, index) => <button type="button" key={item.id} className={index === active ? 'is-current' : ''} aria-pressed={index === active} onClick={() => choose(index)}><span className="timeline-entry-time"><Clock3 size={15} />{item.time}</span><span className="timeline-entry-copy"><strong>{item.tab}</strong><span>{item.caption}</span></span><img src={`/reactions/${item.reaction}.webp`} alt="" width="85" height="85" /></button>)}</div></div></section>;
}

export function MomentSteps() {
  const [step, setStep] = useState(0);
  const steps = [{ title: 'Chụp ngay lúc này', text: 'Mở camera điện thoại hoặc webcam, giữ lại điều đang diễn ra. Xem lại một lần, chưa ưng thì chụp lại.', icon: Camera }, { title: 'Kể thêm một chút', text: 'Một câu chú thích, một giai điệu cho cả ngày. Chọn ai được xem, rồi chia sẻ khi bạn thấy sẵn sàng.', icon: MessageCircle }, { title: 'Gom lại thành một ngày', text: 'Những ảnh chụp tiếp theo tự nối vào chuỗi hôm nay. Bạn bè có thể gửi lời nhắn riêng từ một khoảnh khắc.', icon: Plus }];
  return <section className="steps-section section-shell"><div className="step-select">{steps.map((item, index) => { const Icon = item.icon; return <button key={item.title} type="button" aria-pressed={step === index} onClick={() => setStep(index)}><Icon size={24} /><span><strong>{item.title}</strong><span>{item.text}</span></span><ChevronRight size={21} /></button>; })}</div><div className="step-preview" aria-live="polite"><div className="step-preview-art"><span className="step-preview-time">{moments[0].time}</span><img src="/moments/workday-coffee.png" alt="Đồng nghiệp uống cà phê bên laptop trước giờ làm." width="736" height="1308" /><div className="step-preview-copy"><strong>{steps[step].title}</strong><p>Một ngày thường cũng có điều để kể.</p></div></div></div></section>;
}
