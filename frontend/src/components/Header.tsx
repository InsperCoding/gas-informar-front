import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import logo from "../assets/logo.jpg"
import { logout } from "../lib/fetchWithAuth"

// chaves usadas no localStorage pelo fetchWithAuth
const USER_NAME_KEY = "user_name"
const USER_ROLE_KEY = "user_role"

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  // ler user a partir do localStorage (fallback se não houver contexto global)
  const user = {
    nome: localStorage.getItem(USER_NAME_KEY) || undefined,
    role: (localStorage.getItem(USER_ROLE_KEY) as string) || undefined,
  }

  // tenta scrollar para o elemento com id="exercicios" (se existir)
  const scrollToExercicios = () => {
    setTimeout(() => {
      const el = document.getElementById("exercicios")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
      }
    }, 120)
  }

  const handleExerciciosClick = () => {
    const aulaMatch = location.pathname.match(/^\/aulas\/(\d+)/)
    if (aulaMatch) {
      scrollToExercicios()
      return
    }
    navigate("/aulas")
    setTimeout(() => {
      scrollToExercicios()
    }, 500)
  }

  const handleLogout = () => {
    // logout() já limpa localStorage e faz redirect
    logout(true)
  }

  const role = user.role ?? "aluno"

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/aulas" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                Aulas
              </Link>

              <button
                onClick={handleExerciciosClick}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Exercícios
              </button>

              {role === "admin" && (
                <>
                  <Link to="/usuarios" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Usuários
                  </Link>
                  <Link to="/relatorios" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Relatórios
                  </Link>
                </>
              )}

              {role === "professor" && (
                <>
                  <Link
                    to="/minhas-aulas"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Minhas Aulas
                  </Link>
                  <Link
                    to="/desempenho"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Desempenho
                  </Link>
                </>
              )}

              {role === "aluno" && (
                <>
                  <Link to="/minhas-respostas" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Minhas Respostas
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right mr-4">
              <span className="text-sm font-medium text-gray-700">{user.nome ?? "Visitante"}</span>
              <span className="text-xs text-gray-500">{user.role ?? ""}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Sair
              </button>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => {
                  navigate("/aulas")
                }}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
                aria-expanded="false"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
