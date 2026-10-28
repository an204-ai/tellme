export const colors = {
  brand: {
    navy: "#07327F", // Chủ đạo - Tin cậy, Chuyên nghiệp, Ổn định
    navyHover: "#052561",
    navyLight: "#EBF1FA",
    primary: "#07327F",
    primaryHover: "#052561",
    primaryLight: "#EBF1FA",
  },
  neutral: {
    white: "#FFFFFF", // Tinh khiết, Rõ ràng, Tối giản
    lightGray: "#E8EDF3", // Xám nhạt - Hiện đại, Cân bằng, Thân thiện
    charcoal: "#2D3748", // Xám than - Chuyên sâu, Vững chắc, Tinh tế
    muted: "#718096",
    border: "#E8EDF3",
    borderDark: "#CBD5E0",
    surface: "#FFFFFF",
    surfaceSubtle: "#E8EDF3"
  }
} as const;

export type BrandColors = typeof colors.brand;
export type NeutralColors = typeof colors.neutral;

