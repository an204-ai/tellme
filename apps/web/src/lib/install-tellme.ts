export function getInstallPlatform() {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  return /Android/i.test(navigator.userAgent) ? "android" : "desktop";
}

export function installInstructions() {
  switch (getInstallPlatform()) {
    case "ios":
      return "Trong Safari, mở menu Chia sẻ, chọn Thêm vào MH chính, bật Mở dưới dạng ứng dụng web rồi chọn Thêm.";
    case "android":
      return "Trong Chrome, mở menu ⋮, chọn Thêm vào màn hình chính rồi chọn Cài đặt nếu có.";
    default:
      return "Mở menu trình duyệt và tìm mục Cài đặt Tellme hoặc Thêm vào màn hình chính.";
  }
}
