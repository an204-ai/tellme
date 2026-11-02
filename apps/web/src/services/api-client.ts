import axios from "axios";

export const apiClient = axios.create({
  baseURL:
    typeof window === "undefined"
      ? `${process.env.API_INTERNAL_URL || "http://127.0.0.1:4000"}/api`
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
});
