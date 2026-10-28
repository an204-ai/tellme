import { colors } from "./src/tokens/colors";
import { typography } from "./src/tokens/typography";

export const tellmeTailwindPreset = {
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        neutral: colors.neutral,
        tellme: {
          navy: "#07327F",
          white: "#FFFFFF",
          lightGray: "#E8EDF3",
          charcoal: "#2D3748"
        }
      },
      fontFamily: {
        sans: typography.fontFamily.sans
      }
    }
  }
};

