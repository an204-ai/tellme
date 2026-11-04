export function getInstallPlatform() {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return /Android/i.test(navigator.userAgent) ? "android" : "desktop";
}

function getIOSBrowser() {
  const userAgent = navigator.userAgent;
  if (/GSA\//i.test(userAgent)) return "google-app";
  if (/CriOS\//i.test(userAgent)) return "chrome";
  if (/Safari\//i.test(userAgent)) return "safari";
  return "other";
}

export function installInstructions() {
  const platform = getInstallPlatform();
  switch (platform) {
    case "ios":
      if (getIOSBrowser() === "google-app") {
        return "Bạn đang mở Tellme trong ứng dụng Google. Để cài Tellme như ứng dụng web, hãy mở trang bằng Safari: Chia sẻ → Thêm vào Màn hình chính → bật Mở dưới dạng ứng dụng web → Thêm.";
      }
      if (getIOSBrowser() === "chrome") {
        return "Trong Chrome trên iPhone, nhấn Chia sẻ cạnh thanh địa chỉ → Thêm vào màn hình chính để tạo lối tắt. Muốn mở Tellme như ứng dụng web, hãy dùng Safari: Chia sẻ → Thêm vào Màn hình chính → bật Mở dưới dạng ứng dụng web → Thêm.";
      }
      return "Trong Safari, nhấn Chia sẻ → Thêm vào Màn hình chính → bật Mở dưới dạng ứng dụng web → Thêm.";
    case "android":
      return "Trên Android, mở menu ⋮ của Chrome rồi chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.";
    default:
      return "Mở menu trình duyệt và tìm mục Cài đặt Tellme hoặc Thêm vào màn hình chính.";
  }
}

export function installBannerDescription(platform: ReturnType<typeof getInstallPlatform>) {
  if (platform === "ios") return "Trên iPhone, dùng Safari để cài như ứng dụng web.";
  if (platform === "android") return "Mở Tellme nhanh từ màn hình chính.";
  return "Mở Tellme trong cửa sổ riêng.";
}
