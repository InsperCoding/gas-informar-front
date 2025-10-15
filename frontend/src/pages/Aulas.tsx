// src/pages/Aulas.tsx
import React, { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { fetchJsonWithAuth, getToken } from "../lib/fetchWithAuth"
import { API_URL } from "../config"

type Aula = {
  id: number
  titulo: string
  descricao?: string | null
  autor_id?: number
  created_at?: string
}

const USER_ROLE_KEY = "user_role"

function capitalize(s?: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ""
}

/* Modal de criar/editar aula (titulo + descricao; blocos/exercicios vazios por enquanto) */
function AulaModal({
  open,
  onClose,
  onSaved,
  aulaToEdit,
}: {
  open: boolean
  onClose: () => void
  onSaved: (a: Aula, isNew: boolean) => void
  aulaToEdit?: Aula | null
}) {
  const isEdit = !!aulaToEdit
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && aulaToEdit) {
      setTitulo(aulaToEdit.titulo || "")
      setDescricao(aulaToEdit.descricao || "")
      setError(null)
    }
    if (!open && !aulaToEdit) {
      setTitulo("")
      setDescricao("")
      setError(null)
    }
  }, [open, aulaToEdit])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!titulo.trim()) {
      setError("Preencha o título da aula.")
      return
    }
    setLoading(true)
    try {
      if (isEdit && aulaToEdit) {
        const payload = { titulo: titulo.trim(), descricao: descricao.trim(), blocos: [], exercicios: [] }
        const updated: Aula = await fetchJsonWithAuth(`${API_URL}/aulas/${aulaToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        onSaved(updated, false)
      } else {
        const payload = { titulo: titulo.trim(), descricao: descricao.trim(), blocos: [], exercicios: [] }
        const created: Aula = await fetchJsonWithAuth(`${API_URL}/aulas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        onSaved(created, true)
      }
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || (err?.detail ?? "Erro ao salvar aula"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-w-2xl w-full bg-white rounded-lg shadow-lg p-6 z-10">
        <h2 className="text-lg font-semibold mb-4">{isEdit ? "Editar Aula" : "Criar Aula"}</h2>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
              rows={4}
            />
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

export default function AulasPage() {
  const [aulas, setAulas] = useState<Aula[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAula, setEditingAula] = useState<Aula | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; titulo: string } | null>(null)

  // filtros
  const [filterName, setFilterName] = useState("")

  const role = (localStorage.getItem(USER_ROLE_KEY) || "aluno").toLowerCase()
  const isAdmin = role === "admin"
  const isProfessor = role === "professor"
  const canEdit = isAdmin || isProfessor

  const navigate = useNavigate()

  const fetchAulas = async () => {
    setLoading(true)
    setError(null)
    try {
      const data: Aula[] = await fetchJsonWithAuth(`${API_URL}/aulas`)
      setAulas(data)
    } catch (err: any) {
      console.error(err)
      setError("Erro ao carregar aulas.")
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
    fetchAulas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase()
    if (!q) return aulas
    return aulas.filter((a) => a.titulo.toLowerCase().includes(q))
  }, [aulas, filterName])

  const handleSaved = (a: Aula, isNew: boolean) => {
    if (isNew) setAulas((prev) => [a, ...prev])
    else setAulas((prev) => prev.map((p) => (p.id === a.id ? a : p)))
  }

  const handleDelete = async (id: number) => {
    try {
      await fetchJsonWithAuth(`${API_URL}/aulas/${id}`, { method: "DELETE" })
      setAulas((prev) => prev.filter((x) => x.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      console.error(err)
      alert("Erro ao deletar aula. Verifique se o backend tem endpoint DELETE /aulas/{id} e permissões.")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Aulas</h1>
            <p className="text-sm text-gray-600">Selecione uma aula para visualizar o conteúdo</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              placeholder="Buscar por título..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border rounded"
              aria-label="Buscar por título"
            />

            <div className="ml-auto flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => { setEditingAula(null); setModalOpen(true) }}
                  className="bg-[#083D77] text-white px-4 py-2 rounded transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Criar Aula
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="p-6 bg-white rounded shadow">Carregando aulas...</div>}
        {error && <div className="p-6 bg-red-50 text-red-700 rounded">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="p-6 bg-white rounded shadow text-gray-600">Nenhuma aula encontrada.</div>
        )}

        {/* lista vertical de "botões" grandes */}
        <div className="space-y-4 mt-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <Link
                  to={`/aulas/${a.id}`}
                  className="block w-full px-6 py-6 text-left"
                  onClick={() => { /* navigate handled by Link */ }}
                >
                  <div className="text-lg font-semibold">Aula: {a.titulo}</div>
                  {a.descricao && <div className="mt-1 text-sm text-gray-500">{a.descricao}</div>}
                </Link>

                {/* ações (edit/delete) à direita */}
                {canEdit && (
                  <div className="flex items-center gap-2 pr-4">
                    <button
                      onClick={() => { setEditingAula(a); setModalOpen(true) }}
                      className="px-3 py-2 rounded bg-yellow-50 text-yellow-700 text-sm hover:shadow-sm transition"
                      aria-label="Editar aula"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => setConfirmDelete({ id: a.id, titulo: a.titulo })}
                      className="px-3 py-2 rounded bg-red-50 text-red-700 text-sm hover:shadow-sm transition"
                      aria-label="Excluir aula"
                    >
                      Deletar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <AulaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAula(null) }}
        onSaved={(a, isNew) => handleSaved(a, isNew)}
        aulaToEdit={editingAula}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded p-6 z-10 max-w-sm w-full">
            <h3 className="text-lg font-semibold">Confirmar exclusão</h3>
            <p className="mt-2 text-sm text-gray-600">Deletar aula <strong>{confirmDelete.titulo}</strong>?</p>
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
