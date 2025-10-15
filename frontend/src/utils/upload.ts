import { API_URL } from "../config"
import { fetchJsonWithAuth } from "../lib/fetchWithAuth"

export async function uploadImageFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetchJsonWithAuth(`${API_URL}/uploads`, {
    method: "POST",
    body: fd,
  })
  if (!res || !res.url) throw new Error("Upload retornou sem URL")
  const url: string = res.url as string
  // se backend retornou caminho relativo, prefixe com API_URL
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  // remove possíveis barras duplicadas
  return `${API_URL.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`
}
