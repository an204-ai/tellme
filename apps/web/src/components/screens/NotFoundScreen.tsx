"use client";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { NotFoundArt } from "@/components/ui/SourceArt";
import { Brand, Button } from "@/components/ui/Primitives";

export function NotFoundScreen() {
  return (
    <main className="not-found-page">
      <Link href="/community/feed">
        <Brand />
      </Link>
      <div className="not-found-content">
        <div className="uiv-not-found">
          <div className="my-custom-face-container">
            <NotFoundArt />
          </div>
        </div>
        <div>
          <h1>Hình như mình lạc nhau một chút.</h1>
          <p>
            Trang bạn tìm không còn ở đây.
            <br />
            Nhưng những câu chuyện khác vẫn đang chờ bạn.
          </p>
          <Link href="/community/feed" className="not-found-home">
            <Home size={18} />
            Về Khám phá
          </Link>
          <button
            type="button"
            className="text-link"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={15} />
            Quay lại trang trước
          </button>
        </div>
      </div>
      <span className="not-found-footer">Your day. Your stories.</span>
    </main>
  );
}
