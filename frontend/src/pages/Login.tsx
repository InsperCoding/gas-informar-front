import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import bgi from "../assets/backgroundlogin2.jpg"
import logoInformar from "../assets/logo.jpg"
import { API_URL } from "../config"

interface MeResponse {
  id: number
  nome: string
  username: string
  role: string
}

export default function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1) Obter token
      const tokenRes = await fetch(`${API_URL}/usuarios/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }),
      })

      if (!tokenRes.ok) {
        const payload = await tokenRes.json().catch(() => ({}))
        const msg = (payload as any)?.detail ?? tokenRes.statusText
        throw new Error(msg || "Erro ao autenticar")
      }

      const tokenJson = await tokenRes.json() as { access_token: string; token_type?: string; user?: MeResponse }
      const token = tokenJson.access_token
      if (!token) throw new Error("Token não retornado pelo servidor")

      // salvar token imediatamente (para permitir /me)
      localStorage.setItem("token", token)

      // 2) Buscar informações do usuário usando /usuarios/me
      //    Se seu backend já retorna `user` no token response, usamos esse objeto como fallback.
      let me: MeResponse | null = null
      if ((tokenJson as any).user) {
        me = (tokenJson as any).user as MeResponse
      } else {
        const meRes = await fetch(`${API_URL}/usuarios/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!meRes.ok) {
          // token inválido / problemas — limpar e lançar erro
          localStorage.removeItem("token")
          const payload = await meRes.json().catch(() => ({}))
          const msg = (payload as any)?.detail ?? meRes.statusText
          throw new Error(msg || "Falha ao obter usuário")
        }
        me = await meRes.json() as MeResponse
      }

      // 3) guardar dados do usuário (apenas dados mínimos)
      localStorage.setItem("user_id", String(me.id))
      localStorage.setItem("user_role", me.role)
      localStorage.setItem("user_name", me.nome)

      // redirecionar
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={bgi}
          alt="Background"
          className="w-full h-full object-cover filter blur-sm brightness-75"
        />
        <div className="absolute inset-0 bg-red-700 bg-opacity-40"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center h-full w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="bg-white bg-opacity-95 rounded-xl shadow-md w-full max-w-sm px-8 py-10"
        >
          <div className="flex flex-row items-center justify-center gap-4 mb-6">
            <img src={logoInformar} alt="Logo" className="w-64 object-contain" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004AAD]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: henrique01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#004AAD]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#083D77] text-white py-2 mt-6 rounded-md font-semibold hover:bg-[#416B98] transition-colors disabled:opacity-50"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm text-center font-medium">{error}</p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  )
}
