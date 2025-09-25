import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../config"

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/")
      return
    }

    fetch(`${API_URL}/usuarios/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.clear()
        navigate("/")
      })
  }, [navigate])

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Dashboard</h1>
      {user && <p className="mt-4">Bem-vindo, {user.nome} ({user.role})</p>}
      <button
        onClick={() => {
          localStorage.clear()
          navigate("/")
        }}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Sair
      </button>
    </div>
  )
}
