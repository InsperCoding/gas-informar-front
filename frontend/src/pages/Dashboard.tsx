import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import Header from "../components/Header"
import { fetchJsonWithAuth, getToken, logout } from "../lib/fetchWithAuth"
import { API_URL } from "../config"

// localStorage keys used by fetchWithAuth
const USER_NAME_KEY = "user_name"
const USER_ROLE_KEY = "user_role"
const USER_ID_KEY = "user_id"

export default function Dashboard() {
  // prefill user from localStorage (avoids flash); will be updated from /usuarios/me
  const [user, setUser] = useState<any>(() => {
    const name = localStorage.getItem(USER_NAME_KEY)
    const role = localStorage.getItem(USER_ROLE_KEY)
    const id = localStorage.getItem(USER_ID_KEY)
    return name ? { id: id ? Number(id) : undefined, nome: name, role } : null
  })
  const [loading, setLoading] = useState<boolean>(!!getToken())
  const navigate = useNavigate()

  useEffect(() => {
    // if no token, redirect to login
    const token = getToken()
    if (!token) {
      navigate("/")
      return
    }

    (async () => {
      try {
        // fetch latest user data
        const data = await fetchJsonWithAuth(`${API_URL}/usuarios/me`)
        setUser(data)
        // persist basic user info (keeps Header in sync)
        if (data) {
          if (data.id !== undefined) localStorage.setItem(USER_ID_KEY, String(data.id))
          if (data.nome !== undefined) localStorage.setItem(USER_NAME_KEY, data.nome)
          if (data.role !== undefined) localStorage.setItem(USER_ROLE_KEY, data.role)
        }
      } catch (err) {
        console.error("Erro ao carregar usuário:", err)
        // fallback: logout and redirect
        logout(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

  useEffect(() => {
    if (!getToken()) {
      navigate("/")
    }
  }, [navigate])

  if (loading) return <div className="p-8">Carregando...</div>

  const role = user?.role ?? "aluno"

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-600">Bem-vindo, {user?.nome ?? "Usuário"}!</p>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Aulas</h3>
            <p className="mt-2 text-sm text-gray-600">Ver todas as aulas disponíveis.</p>
            <div className="mt-4">
              <Link to="/aulas" className="inline-block bg-[#083D77] text-white px-4 py-2 rounded">
                Ver Aulas
              </Link>
            </div>
          </div>

          {role === "professor" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Minhas Aulas</h3>
              <p className="mt-2 text-sm text-gray-600">Criar ou editar suas aulas.</p>
              <div className="mt-4">
                <Link to="/minhas-aulas" className="inline-block bg-[#083D77] text-white px-4 py-2 rounded">
                  Gerenciar Aulas
                </Link>
              </div>
            </div>
          )}

          {role === "admin" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold">Usuários</h3>
              <p className="mt-2 text-sm text-gray-600">Gerenciar usuários do sistema.</p>
              <div className="mt-4">
                <Link to="/usuarios" className="inline-block bg-[#083D77] text-white px-4 py-2 rounded">
                  Gerenciar Usuários
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold">Desempenho</h3>
            <p className="mt-2 text-sm text-gray-600">Ver desempenho dos alunos (professores/admin).</p>
            <div className="mt-4">
              <Link to="/desempenho" className="inline-block bg-[#083D77] text-white px-4 py-2 rounded">
                Ver Desempenho
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
