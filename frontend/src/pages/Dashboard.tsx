import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import Header from "../components/Header"
import { fetchJsonWithAuth, getToken, logout } from "../lib/fetchWithAuth"
import { API_URL } from "../config"

const USER_NAME_KEY = "user_name"
const USER_ROLE_KEY = "user_role"
const USER_ID_KEY = "user_id"

export default function Dashboard() {
  const [user, setUser] = useState<any>(() => {
    const name = localStorage.getItem(USER_NAME_KEY)
    const role = localStorage.getItem(USER_ROLE_KEY)
    const id = localStorage.getItem(USER_ID_KEY)
    return name ? { id: id ? Number(id) : undefined, nome: name, role } : null
  })
  const [loading, setLoading] = useState<boolean>(!!getToken())
  const navigate = useNavigate()

  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate("/")
      return
    }

    ;(async () => {
      try {
        const data = await fetchJsonWithAuth(`${API_URL}/usuarios/me`)
        setUser(data)
        if (data) {
          if (data.id !== undefined) localStorage.setItem(USER_ID_KEY, String(data.id))
          if (data.nome !== undefined) localStorage.setItem(USER_NAME_KEY, data.nome)
          if (data.role !== undefined) localStorage.setItem(USER_ROLE_KEY, data.role)
        }
      } catch (err) {
        console.error("Erro ao carregar usuário:", err)
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

  const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ""

  // classes base para os botões com hover/transition
  const btnClasses =
    "inline-block bg-[#083D77] text-white px-4 py-2 rounded mt-4 self-start transition transform hover:-translate-y-0.5 hover:shadow-md hover:bg-[#062f63] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#083D77]"

  // card base responsivo: auto em mobile, altura fixa md+
  const cardBaseClasses = "bg-white rounded-lg shadow p-6 flex flex-col justify-between h-auto md:h-56"

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-600">
              Bem-vindo, {user?.nome ? capitalize(user.nome) : "Usuário"}!
            </p>
          </div>
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aulas */}
          <div className={cardBaseClasses}>
            <div>
              <h3 className="text-lg font-semibold">Aulas</h3>
              <p className="mt-2 text-sm text-gray-600">Ver todas as aulas disponíveis.</p>
            </div>
            <Link to="/aulas" className={btnClasses}>Ver Aulas</Link>
          </div>

          {/* Usuários (admin) */}
          {role === "admin" && (
            <div className={cardBaseClasses}>
              <div>
                <h3 className="text-lg font-semibold">Usuários</h3>
                <p className="mt-2 text-sm text-gray-600">Gerenciar usuários do sistema.</p>
              </div>
              <Link to="/usuarios" className={btnClasses}>Gerenciar Usuários</Link>
            </div>
          )}

          {/* Desempenho — SOMENTE para professor ou admin */}
          {["professor", "admin"].includes(role) && (
            <div className={cardBaseClasses}>
              <div>
                <h3 className="text-lg font-semibold">Desempenho</h3>
                <p className="mt-2 text-sm text-gray-600">Ver desempenho dos alunos (professores/admin).</p>
              </div>
              <Link to="/desempenho" className={btnClasses}>Ver Desempenho</Link>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
