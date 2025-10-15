// src/pages/Usuarios.tsx
import React, { useEffect, useMemo, useState } from "react"
import { fetchJsonWithAuth, getToken } from "../lib/fetchWithAuth"
import { API_URL } from "../config"
import Header from "../components/Header"

type User = {
  id: number
  nome: string
  email: string
  role: "admin" | "professor" | "aluno" | string
}

const USER_ROLE_KEY = "user_role"

function capitalize(s?: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ""
}

/* Badge que aparece no canto superior direito do card */
function RoleBadge({ role }: { role: string }) {
  const base = "absolute top-3 right-3 flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium"
  if (role === "admin") {
    return (
      <div className={base + " bg-red-50 text-red-700 border border-red-100"}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" />
        </svg>
        Admin
      </div>
    )
  } else if (role === "professor") {
    return (
      <div className={base + " bg-blue-50 text-blue-700 border border-blue-100"}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
        </svg>
        Prof
      </div>
    )
  } else {
    return (
      <div className={base + " bg-green-50 text-green-700 border border-green-100"}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A9 9 0 1118.88 6.196 9 9 0 015.12 17.804z" />
        </svg>
        Aluno
      </div>
    )
  }
}

/**
 * Modal que funciona tanto para criar quanto para editar.
 * - Se `userToEdit` for undefined -> modo "create" (POST /usuarios)
 * - Se definido -> modo "edit" (PUT /usuarios/{id})
 */
function UserModal({
  open,
  onClose,
  onSaved,
  userToEdit,
}: {
  open: boolean
  onClose: () => void
  onSaved: (u: User, isNew: boolean) => void
  userToEdit?: User | null
}) {
  const isEdit = !!userToEdit
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "professor" | "aluno">("aluno")
  const [senha, setSenha] = useState("") // optional on edit
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && userToEdit) {
      setNome(userToEdit.nome || "")
      setEmail(userToEdit.email || "")
      setRole((userToEdit.role as any) || "aluno")
      setSenha("") // leave blank
      setError(null)
    }
    if (!open && !userToEdit) {
      setNome(""); setEmail(""); setRole("aluno"); setSenha(""); setError(null)
    }
  }, [open, userToEdit])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!nome || !email) {
      setError("Preencha nome e email.")
      return
    }
    if (!isEdit && !senha) {
      setError("Preencha a senha para criar usuário.")
      return
    }
    if (!isEdit && senha.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (isEdit && senha && senha.length > 0 && senha.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres.")
      return
    }

    setLoading(true)
    try {
      if (isEdit && userToEdit) {
        // PUT /usuarios/{id}
        const payload: any = { nome, email, role }
        if (senha) payload.senha = senha
        const updated: User = await fetchJsonWithAuth(`${API_URL}/usuarios/${userToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        onSaved(updated, false)
      } else {
        // POST /usuarios
        const payload = { nome, email, role, senha }
        const created: User = await fetchJsonWithAuth(`${API_URL}/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        onSaved(created, true)
      }
      onClose()
    } catch (err: any) {
      console.error(err)
      const maybeMsg = err?.message || (err?.detail ?? "Erro ao salvar usuário")
      setError(String(maybeMsg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-lg w-full bg-white rounded-lg shadow-lg p-6 z-10">
        <h2 className="text-lg font-semibold mb-4">{isEdit ? "Editar Usuário" : "Adicionar Usuário"}</h2>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 block w-full border rounded px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="mt-1 block w-full border rounded px-3 py-2">
              <option value="aluno">Aluno</option>
              <option value="professor">Professor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{isEdit ? "Senha (opcional)" : "Senha"}</label>
            <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" className="mt-1 block w-full border rounded px-3 py-2" />
            {isEdit && <div className="text-xs text-gray-400 mt-1">Deixe em branco para manter a senha atual.</div>}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-[#083D77] text-white hover:bg-[#062f63] transition">
              {loading ? (isEdit ? "Salvando..." : "Criando...") : isEdit ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; nome: string } | null>(null)

  // filtros
  const [filterName, setFilterName] = useState("")
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "professor" | "aluno">("all")

  const role = (localStorage.getItem(USER_ROLE_KEY) || "aluno").toLowerCase()
  const isAdmin = role === "admin"

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data: User[] = await fetchJsonWithAuth(`${API_URL}/usuarios`)
      setUsers(data)
    } catch (err: any) {
      console.error(err)
      if (err?.status === 403 || (err?.message && String(err.message).includes("403"))) {
        setError("Acesso negado. Apenas administradores podem listar usuários.")
      } else {
        setError("Erro ao carregar usuários.")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Usuário não autenticado.")
      setLoading(false)
      return
    }
    if (!isAdmin) {
      setError("Acesso negado. Apenas administradores podem ver esta página.")
      setLoading(false)
      return
    }
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // lista filtrada (memoizada)
  const filteredUsers = useMemo(() => {
    const name = filterName.trim().toLowerCase()
    return users.filter((u) => {
      if (filterRole !== "all" && u.role !== filterRole) return false
      if (name && !u.nome.toLowerCase().includes(name)) return false
      return true
    })
  }, [users, filterName, filterRole])

  const handleSaved = (u: User, isNew: boolean) => {
    if (isNew) {
      setUsers((prev) => [u, ...prev])
    } else {
      setUsers((prev) => prev.map((p) => (p.id === u.id ? u : p)))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetchJsonWithAuth(`${API_URL}/usuarios/${id}`, { method: "DELETE" })
      setUsers((prev) => prev.filter((x) => x.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      console.error(err)
      alert("Erro ao deletar usuário. Verifique se o backend tem endpoint DELETE /usuarios/{id}.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Usuários</h1>
            <p className="text-sm text-gray-600">Lista de usuários do sistema</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {/* filtros: busca por nome */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                placeholder="Buscar por nome..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 border rounded"
                aria-label="Buscar por nome"
              />
            </div>

            {/* filtro por role */}
            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-3 py-2 border rounded"
                aria-label="Filtrar por função"
              >
                <option value="all">Todos</option>
                <option value="admin">Admin</option>
                <option value="professor">Professor</option>
                <option value="aluno">Aluno</option>
              </select>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingUser(null)
                    setModalOpen(true)
                  }}
                  className="bg-[#083D77] text-white px-4 py-2 rounded transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Adicionar Usuário
                </button>
              )}
            </div>
          </div>
        </div>

        {/* estados */}
        {loading && <div className="p-6 bg-white rounded shadow">Carregando usuários...</div>}
        {error && <div className="p-6 bg-red-50 text-red-700 rounded">{error}</div>}

        {!loading && !error && filteredUsers.length === 0 && (
          <div className="p-6 bg-white rounded shadow text-gray-600">Nenhum usuário encontrado.</div>
        )}

        {/* grid de cards */}
        {!loading && !error && filteredUsers.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {filteredUsers.map((u) => (
              <div key={u.id} className="relative bg-white rounded-lg shadow p-6 flex flex-col justify-between h-auto md:h-56">
                <RoleBadge role={u.role} />
                <div>
                  <h3 className="text-lg font-semibold">{capitalize(u.nome)}</h3>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <div className="mt-2 text-xs text-gray-400">Role: {capitalize(u.role)}</div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!isAdmin) { alert("Apenas administradores podem editar usuários."); return }
                      setEditingUser(u)
                      setModalOpen(true)
                    }}
                    className="px-3 py-2 rounded bg-yellow-50 text-yellow-700 text-sm hover:shadow-sm transition"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => {
                      if (!isAdmin) { alert("Apenas administradores podem deletar usuários."); return }
                      setConfirmDelete({ id: u.id, nome: u.nome })
                    }}
                    className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm hover:shadow-sm transition"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* user modal (create/edit) */}
      <UserModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingUser(null)
        }}
        onSaved={(u, isNew) => handleSaved(u, isNew)}
        userToEdit={editingUser}
      />

      {/* delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded p-6 z-10 max-w-sm w-full">
            <h3 className="text-lg font-semibold">Confirmar exclusão</h3>
            <p className="mt-2 text-sm text-gray-600">Deletar usuário <strong>{confirmDelete.nome}</strong>?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 rounded border">Cancelar</button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
