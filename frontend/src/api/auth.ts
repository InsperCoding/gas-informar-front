import axios from "axios";

const API_URL = "http://127.0.0.1:8000"; // seu backend local

export async function login(email: string, senha: string) {
  const formData = new FormData();
  formData.append("username", email);
  formData.append("password", senha);

  const response = await axios.post(`${API_URL}/usuarios/token`, formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (response.data.access_token) {
    localStorage.setItem("token", response.data.access_token);
  }

  return response.data;
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}
