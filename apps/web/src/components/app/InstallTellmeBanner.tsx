"use client";

import { useCallback, useContext, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Primitives";
import { getInstallPlatform, installBannerDescription, installInstructions } from "@/lib/install-tellme";
import { InstallContext } from "@/providers/InstallProvider";
import { useBrandIntroFinished } from "./BrandIntro";
import styles from "./InstallTellmeBanner.module.css";

const dismissalKey = "tellme-install-banner-dismissed";

export function InstallTellmeBanner() {
  const { standalone, canPrompt, install } = useContext(InstallContext);
  const introFinished = useBrandIntroFinished();
  const [platform, setPlatform] = useState<ReturnType<typeof getInstallPlatform>>();
  const [dismissed, setDismissed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const headingId = useId();
  const guideId = useId();

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissalKey, "1");
    } catch {
      // The banner can still be dismissed in this tab.
    }
  }, []);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissalKey) === "1");
    } catch {
      // Storage can be unavailable in private contexts.
    }
    setPlatform(getInstallPlatform());
    window.addEventListener("appinstalled", dismiss);
    return () => window.removeEventListener("appinstalled", dismiss);
  }, [dismiss]);

  if (!introFinished || !platform || dismissed || standalone ||
      (platform === "desktop" && !canPrompt && !guideOpen)) {
    return null;
  }

  return (
    <section className={styles.banner} aria-labelledby={headingId}>
      <img className={styles.icon} src="/brand/app-icons/tellme-192.png" width={44} height={44} alt="" />
      <div className={styles.copy}>
        <h2 id={headingId}>
          <span className={styles.desktopTitle}>Cài ứng dụng Tellme</span>
          <span className={styles.mobileTitle}>Thêm Tellme</span>
        </h2>
        <p>{installBannerDescription(platform)}</p>
      </div>
      <Button
        className={styles.action}
        type="button"
        aria-controls={canPrompt ? undefined : guideId}
        aria-expanded={canPrompt ? undefined : guideOpen}
        onClick={async () => {
          if (!canPrompt) {
            setGuideOpen(!guideOpen);
            return;
          }
          const outcome = await install();
          if (outcome === "accepted") dismiss();
          else if (!outcome) setGuideOpen(true);
        }}
      >
        <span className={styles.desktopAction}>{guideOpen && !canPrompt ? "Ẩn hướng dẫn" : "Cài Tellme"}</span>
        <span className={styles.mobileAction}>{guideOpen && !canPrompt ? "Đóng" : "Cài"}</span>
      </Button>
      <IconButton className={styles.close} label="Đóng lời mời cài Tellme" tooltip={false} onClick={dismiss}>
        <X size={18} />
      </IconButton>
      <p className={styles.guide} id={guideId} hidden={!guideOpen}>
        {guideOpen ? installInstructions() : null}
      </p>
    </section>
  );
}
