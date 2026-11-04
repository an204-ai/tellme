"use client";

import { useContext, useId, useState } from "react";
import { Button } from "@/components/ui/Primitives";
import { installInstructions } from "@/lib/install-tellme";
import { InstallContext } from "@/providers/InstallProvider";

export function InstallTellmeSetting() {
  const { standalone, canPrompt, install } = useContext(InstallContext);
  const [instructions, setInstructions] = useState<string | null>(null);
  const instructionsId = useId();

  return (
    <>
      <div className="setting-toggle-row">
        <div>
          <strong>Cài Tellme</strong>
          <p>{standalone ? "Bạn đang dùng ứng dụng Tellme." : "Mở Tellme từ màn hình chính."}</p>
        </div>
        {!standalone && (
          <Button
            type="button"
            variant="secondary"
            aria-expanded={canPrompt ? undefined : !!instructions}
            aria-controls={canPrompt ? undefined : instructionsId}
            onClick={async () => {
              if (canPrompt) {
                setInstructions(null);
                if (await install()) return;
                setInstructions(installInstructions());
              } else {
                setInstructions(instructions ? null : installInstructions());
              }
            }}
          >
            {instructions && !canPrompt ? "Đóng hướng dẫn" : "Cài Tellme"}
          </Button>
        )}
      </div>
      {!standalone && (
        <p id={instructionsId} className="muted text-sm pb-3" hidden={!instructions}>
          {instructions}
        </p>
      )}
    </>
  );
}
