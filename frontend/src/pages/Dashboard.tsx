// frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { fetchWithAuth, logout } from "../lib/fetchWithAuth"
import { API_URL } from "../config"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/")
      return
    }

    (async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/usuarios/me`)
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error("Erro ao obter usuário:", err)
        // logout já faz redirect; se quiser tratar sem redirect:
        // logout(false); navigate("/");
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Dashboard</h1>
      {user && <p className="mt-4">Bem-vindo, {user.nome} ({user.role})</p>}
      <button
        onClick={() => {
          logout(true) // limpa e redireciona para login
        }}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Sair
      </button>
    </div>
  )
}
