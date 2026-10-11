import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Axios instance for API requests
const api = axios.create({
  baseURL: API_URL,
});

// Attach admin token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mudlay_admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Resolve product image paths
export const imageUrl = (path) => {
  if (!path) return "";

  // Already an absolute URL
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Remove trailing /api from the API base URL
  const serverUrl = API_URL.replace(/\/api\/?$/i, "").replace(/\/+$/, "");

  // Normalize the image path
  const imagePath = path.startsWith("/") ? path : `/${path}`;

  return `${serverUrl}${imagePath}`;
};

export default api;
