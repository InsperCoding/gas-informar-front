// src/pages/AulaDetail.tsx
import React, { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { fetchJsonWithAuth, getToken } from "../lib/fetchWithAuth"
import { API_URL } from "../config"
import { uploadImageFile } from "../utils/upload"

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function absUrl(u?: string) {
  if (!u) return undefined
  if (u.startsWith("http://") || u.startsWith("https://")) return u
  return `${API_URL.replace(/\/$/, "")}${u.startsWith("/") ? "" : "/"}${u}`
}

type ConteudoBlocoCreate = {
  id?: number
  localId?: string
  titulo?: string | null
  texto?: string | null
  ordem?: number
  imagem_url?: string | null
}

type ExercicioCreate = {
  id?: number
  titulo?: string | null
  enunciado: string
  tipo: "text" | "multiple_choice"
  resposta_modelo?: string | null
  pontos?: number
  ordem?: number
  alternativas?: string[] | null
  alternativas_certas?: number[] | null
}

type AlternativaFromServer = { id: number; texto: string; is_correta?: boolean }
type ExercicioFromServer = {
  id: number
  titulo?: string | null
  enunciado: string
  tipo: string
  resposta_modelo?: string | null
  pontos?: number
  alternativas?: AlternativaFromServer[] | null
  ordem?: number
}

type BlocoFromServer = { id: number; titulo?: string | null; texto?: string | null; ordem?: number; imagem_url?: string | null }

type AulaOut = {
  id: number
  titulo: string
  descricao?: string
  blocos?: BlocoFromServer[]
  exercicios?: ExercicioFromServer[]
  autor_id?: number
  created_at?: string
}

type RespostaOut = {
  id: number
  exercicio_id: number
  aluno_id: number
  enviado_em: string
  resposta_texto?: string | null
  alternativa_id?: number | null
  pontuacao: number
}

const USER_ROLE_KEY = "user_role"

export default function AulaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [aula, setAula] = useState<AulaOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [blocos, setBlocos] = useState<ConteudoBlocoCreate[]>([])
  const [exercicios, setExercicios] = useState<ExercicioCreate[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [selectedAlternative, setSelectedAlternative] = useState<Record<number, number | null>>({})
  const [answerText, setAnswerText] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({})
  const [lastResult, setLastResult] = useState<Record<number, { pontuacao: number; mensagem?: string }>>({})
  const [finalized, setFinalized] = useState<boolean>(false);

  const role = (localStorage.getItem(USER_ROLE_KEY) || "aluno").toLowerCase()
  const isAdmin = role === "admin"
  const isProfessor = role === "professor"
  const canEdit = isAdmin || isProfessor

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      try {
        const data: AulaOut = await fetchJsonWithAuth(`${API_URL}/aulas/${id}`)
        setAula(data)

        setBlocos(
          (data.blocos || []).map((b: BlocoFromServer, idx: number) => ({
            id: b.id,
            localId: b.id ? `srv-${b.id}` : makeId(),
            titulo: b.titulo ?? "",
            texto: b.texto ?? "",
            ordem: typeof b.ordem === "number" ? b.ordem : idx,
            imagem_url: b.imagem_url ? absUrl(b.imagem_url) : undefined,
          }))
        )

        setExercicios(
          (data.exercicios || []).map((e: ExercicioFromServer, idx: number) => ({
            id: e.id,
            titulo: e.titulo ?? "",
            enunciado: e.enunciado ?? "",
            tipo: e.tipo === "multiple_choice" ? "multiple_choice" : "text",
            resposta_modelo: e.resposta_modelo ?? "",
            pontos: e.pontos ?? 1,
            ordem: typeof e.ordem === "number" ? e.ordem : idx,
            alternativas: e.alternativas ? e.alternativas.map((a) => a.texto) : [],
            alternativas_certas: (e.alternativas || []).map((a, ai) => (a.is_correta ? ai : -1)).filter((n) => n >= 0) || [],
          }))
        )
      } catch (err: any) {
        console.error(err)
        setError("Erro ao carregar aula.")
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  // blocos helpers
  function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }
  function addBloco() {
    setBlocos((prev) => [...prev, { localId: makeId(), titulo: "", texto: "", ordem: prev.length }])
    setEditing(true)
  }
  function updateBloco(at: number, patch: Partial<ConteudoBlocoCreate>) {
    setBlocos((prev) => prev.map((b, i) => (i === at ? { ...b, ...patch } : b)))
    setEditing(true)
  }
  function removeBloco(at: number) {
    setBlocos((prev) => prev.filter((_, i) => i !== at))
    setEditing(true)
  }

  // exercícios helpers
  function addExercicio(type: "text" | "multiple_choice" = "text") {
    setExercicios((prev) => [
      ...prev,
      {
        titulo: "",
        enunciado: "",
        tipo: type,
        resposta_modelo: "",
        pontos: 1,
        ordem: prev.length,
        alternativas: type === "multiple_choice" ? ["", ""] : [],
        alternativas_certas: [],
      },
    ])
    setEditing(true)
  }
  function updateExercicio(at: number, patch: Partial<ExercicioCreate>) {
    setExercicios((prev) => prev.map((e, i) => (i === at ? { ...e, ...patch } : e)))
    setEditing(true)
  }
  function removeExercicio(at: number) {
    setExercicios((prev) => prev.filter((_, i) => i !== at))
    setEditing(true)
  }
  function addAlternative(exIdx: number) {
    setExercicios((prev) =>
      prev.map((e, i) => (i === exIdx ? { ...e, alternativas: [...(e.alternativas ?? []), ""] } : e))
    )
    setEditing(true)
  }
  function updateAlternative(exIdx: number, altIdx: number, text: string) {
    setExercicios((prev) =>
      prev.map((e, i) =>
        i === exIdx ? { ...e, alternativas: (e.alternativas ?? []).map((a, ai) => (ai === altIdx ? text : a)) } : e
      )
    )
    setEditing(true)
  }
  function removeAlternative(exIdx: number, altIdx: number) {
    setExercicios((prev) =>
      prev.map((e, i) => (i === exIdx ? { ...e, alternativas: (e.alternativas ?? []).filter((_, ai) => ai !== altIdx) } : e))
    )
    setEditing(true)
  }
  function toggleAlternativeCorrect(exIdx: number, altIdx: number) {
    setExercicios((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e
        const current = new Set(e.alternativas_certas || [])
        if (current.has(altIdx)) current.delete(altIdx)
        else current.add(altIdx)
        return { ...e, alternativas_certas: Array.from(current).sort((a, b) => a - b) }
      })
    )
    setEditing(true)
  }

  // salvar via PUT
  async function handleSaveAll() {
    if (!aula) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        titulo: aula.titulo,
        descricao: aula.descricao ?? "",
        blocos: blocos.map((b, i) => ({
          ...(b.id ? { id: b.id } : {}),
          titulo: b.titulo ?? "",
          texto: b.texto ?? "",
          ordem: i,
          imagem_url: b.imagem_url ?? null,
        })),
        exercicios: exercicios.map((ex, i) => ({
          titulo: ex.titulo ?? undefined,
          enunciado: ex.enunciado,
          tipo: ex.tipo === "multiple_choice" ? "multiple_choice" : "text",
          resposta_modelo: ex.resposta_modelo ?? undefined,
          pontos: ex.pontos ?? 1,
          ordem: i,
          alternativas: ex.alternativas ?? [],
          alternativas_certas: ex.alternativas_certas ?? [],
        })),
      }
      const updated = (await fetchJsonWithAuth(`${API_URL}/aulas/${aula.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })) as AulaOut

      setAula(updated)

      setBlocos(
        (updated.blocos || []).map((b: BlocoFromServer, idx: number) => ({
          titulo: b.titulo ?? "",
          texto: b.texto ?? "",
          ordem: typeof b.ordem === "number" ? b.ordem : idx,
          imagem_url: b.imagem_url ?? undefined,
        }))
      )

      setExercicios(
        (updated.exercicios || []).map((e: ExercicioFromServer, idx: number) => ({
          id: e.id,
          titulo: e.titulo ?? "",
          enunciado: e.enunciado ?? "",
          tipo: e.tipo === "multiple_choice" ? "multiple_choice" : "text",
          resposta_modelo: e.resposta_modelo ?? "",
          pontos: e.pontos ?? 1,
          ordem: typeof e.ordem === "number" ? e.ordem : idx,
          alternativas: e.alternativas ? e.alternativas.map((a) => a.texto) : [],
          alternativas_certas: (e.alternativas || []).map((a, ai) => (a.is_correta ? ai : -1)).filter((n) => n >= 0) || [],
        }))
      )

      setEditing(false)
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? "Erro ao salvar aula")
    } finally {
      setSaving(false)
    }
  }

  // deletar aula
  async function handleDeleteAula() {
    if (!aula) return
    if (!confirm("Deletar esta aula? Esta ação é irreversível.")) return
    try {
      await fetchJsonWithAuth(`${API_URL}/aulas/${aula.id}`, { method: "DELETE" })
      navigate("/aulas")
    } catch (err) {
      console.error(err)
      alert("Erro ao deletar aula.")
    }
  }

  async function handleEnviarTudo() {
    if (!aula) return;
    if (!confirm("Confirma finalizar a tentativa e enviar todas as respostas? Você não poderá alterar depois.")) return;

    // opcional: bloquear UI
    try {
      // 1) enviar todas as respostas pendentes (uma requisição por exercício)
      // montamos uma lista de exercícios para enviar
      for (const ex of aula.exercicios || []) {
        // se já existe uma resposta enviada localmente (opcional checar), aqui forçamos envio idempotente
        // montar payload de acordo com o tipo
        if (ex.tipo === "multiple_choice") {
          const selIdx = selectedAlternative[ex.id];
          // se usuário não selecionou nada, pulamos (ou enviamos vazio)
          if (typeof selIdx === "undefined" || selIdx === null) {
            // NÃO enviamos se não houver resposta
            continue;
          }
          // localmente ex.alternativas é array de objetos com id/texto
          const alt = (ex.alternativas || [])[selIdx];
          if (!alt) continue;
          const payload = { exercicio_id: ex.id, alternativa_id: alt.id };
          await fetchJsonWithAuth(`${API_URL}/aulas/responder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          const texto = (answerText[ex.id] ?? "").trim();
          if (!texto) continue; // pular questões sem resposta
          const payload = { exercicio_id: ex.id, resposta_texto: texto };
          await fetchJsonWithAuth(`${API_URL}/aulas/responder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }

      // 2) finalizar tentativa
      const finalizeResp = await fetchJsonWithAuth(`${API_URL}/aulas/${aula.id}/finalizar`, { method: "POST" });
      const totalPontuacao = finalizeResp?.pontuacao ?? 0;
      alert(`Tentativa finalizada. Pontuação total: ${totalPontuacao}`);

      // 3) buscar desempenho do próprio aluno para exibir pontuação por questão
      const userIdStr = localStorage.getItem("user_id");
      if (userIdStr) {
        try {
          const alunoIdNum = Number(userIdStr);
          const detalhe = await fetchJsonWithAuth(`${API_URL}/aulas/${aula.id}/desempenho/${alunoIdNum}`);
          // detalhe.responses -> array com pontuação por questão
          const newLast: Record<number, { pontuacao: number; mensagem?: string }> = {};
          detalhe.responses.forEach((r: any) => {
            newLast[r.exercicio_id] = { pontuacao: r.pontuacao_obtida ?? 0, mensagem: r.acertou ? "Acertou" : "Errou" };
          });
          setLastResult(newLast);
        } catch (e) {
          // não crítico
          console.warn("Não conseguiu buscar detalhe do aluno:", e);
        }
      }

      // 4) marcar UI como finalizada
      setFinalized(true);

      // 5) recarregar aula para refletir qualquer atualização do backend
      try {
        const updated = await fetchJsonWithAuth(`${API_URL}/aulas/${aula.id}`);
        setAula(updated);
      } catch { /* ignore */ }

    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Erro ao enviar ou finalizar tentativa. Tente novamente.");
    }
  }

  // responder exercício
  async function submitAnswer(exercicio_id: number) {
    setSubmitting((s) => ({ ...s, [exercicio_id]: true }))
    setError(null)
    try {
      const ex = (aula?.exercicios || []).find((e) => e.id === exercicio_id)
      if (!ex) throw new Error("Exercício não encontrado")
      if (ex.tipo === "multiple_choice") {
        const altIndex = selectedAlternative[exercicio_id]
        if (altIndex === undefined || altIndex === null) {
          alert("Selecione uma alternativa.")
          return
        }
        const alternativaObj = ex.alternativas ? ex.alternativas[altIndex] : undefined
        if (!alternativaObj) throw new Error("Alternativa inválida")
        const payload = { exercicio_id, alternativa_id: alternativaObj.id }
        const resp: RespostaOut = await fetchJsonWithAuth(`${API_URL}/aulas/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        setLastResult((r) => ({ ...r, [exercicio_id]: { pontuacao: resp.pontuacao, mensagem: `Pontuação: ${resp.pontuacao}` } }))
      } else {
        const texto = answerText[exercicio_id] ?? ""
        if (!texto.trim()) {
          alert("Escreva sua resposta antes de enviar.")
          return
        }
        const payload = { exercicio_id, resposta_texto: texto }
        const resp: RespostaOut = await fetchJsonWithAuth(`${API_URL}/aulas/responder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        setLastResult((r) => ({ ...r, [exercicio_id]: { pontuacao: resp.pontuacao, mensagem: `Pontuação: ${resp.pontuacao}` } }))
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message ?? "Erro ao enviar resposta")
    } finally {
      setSubmitting((s) => ({ ...s, [exercicio_id]: false }))
    }
  }

  if (loading) return <div className="p-8">Carregando...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!aula) return <div className="p-8">Aula não encontrada.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to="/aulas" className="text-sm text-gray-500 hover:underline">← Voltar para aulas</Link>
            <h1 className="text-2xl font-bold mt-4">{aula.titulo}</h1>
            {aula.descricao && <p className="mt-1 text-gray-600">{aula.descricao}</p>}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="px-3 py-2 rounded bg-yellow-50 text-yellow-700 hover:shadow-sm transition w-full sm:w-auto">
                Editar Conteúdo
              </button>
            )}
            {canEdit && editing && (
              <>
                <button onClick={() => { setEditing(false); /* opcional: reload para descartar */ }} className="px-3 py-2 rounded border w-full sm:w-auto">
                  Cancelar
                </button>
                <button onClick={handleSaveAll} disabled={saving} className="px-3 py-2 rounded bg-[#083D77] text-white hover:bg-[#062f63] transition w-full sm:w-auto">
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </>
            )}
            {isAdmin && (
              <button onClick={handleDeleteAula} className="px-3 py-2 rounded bg-red-50 text-red-700 hover:shadow-sm transition w-full sm:w-auto">
                Deletar Aula
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-6">
            <section className="bg-white p-4 rounded shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Blocos</h2>
                <button onClick={addBloco} className="px-3 py-1 rounded bg-[#083D77] text-white">Adicionar Bloco</button>
              </div>

              <div className="mt-4 space-y-4">
                {blocos.map((b, i) => (
                  <div key={b.localId} className="border rounded p-3">
                    {/* layout responsivo: coluna em mobile, row em sm+ */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Título</label>
                        <input value={b.titulo ?? ""} onChange={(e) => updateBloco(i, { titulo: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" />

                        <label className="text-sm font-medium mt-2">Texto (HTML permitido)</label>
                        <textarea value={b.texto ?? ""} onChange={(e) => updateBloco(i, { texto: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" rows={4} />
                      </div>
                      {/* coluna da imagem: use grid para alinhar com os labels da parte principal */}
                      <div className="w-full sm:w-48 flex-shrink-0">
                        <div className="mt-2">
                          <label className="text-sm font-medium block">Imagem (opcional)</label>

                          {/* Container do preview / input — mantém a largura controlada */}
                          <div className="mt-2 flex flex-col items-center sm:items-stretch gap-2">
                            {b.imagem_url ? (
                              <>
                                {/* preview com ratio fixo e overflow controlado */}
                                <div className="w-full sm:w-44 h-36 sm:h-28 rounded overflow-hidden border">
                                  <img src={b.imagem_url} alt={`Bloco ${i}`} className="w-full h-full object-cover" />
                                </div>

                                {/* botão alinhado diretamente abaixo do preview (sem sair do card) */}
                                <button
                                  type="button"
                                  onClick={() => updateBloco(i, { imagem_url: undefined })}
                                  className="mt-1 px-3 py-2 rounded bg-red-50 text-red-700 hover:bg-red-100 w-full sm:w-auto"
                                >
                                  Remover imagem
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (ev) => {
                                    const file = ev.target.files?.[0]
                                    if (!file) return
                                    if (file.size > 5 * 1024 * 1024) { alert("Arquivo muito grande (max 5MB)"); return }
                                    try {
                                      const url = await uploadImageFile(file)
                                      updateBloco(i, { imagem_url: url })
                                    } catch (err) {
                                      console.error(err)
                                      alert("Erro ao enviar imagem")
                                    }
                                  }}
                                  className="block w-full text-sm"
                                />
                                <span className="text-sm text-gray-500">PNG/JPG/WebP — max 5MB</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botão remover bloco em bottom (full width em mobile) */}
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => removeBloco(i)} className="px-3 py-2 rounded bg-red-50 text-red-700 w-full sm:w-auto">Remover Bloco</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-4 rounded shadow">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Exercícios</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => addExercicio("text")} className="px-3 py-1 rounded border">Adicionar Texto</button>
                  <button onClick={() => addExercicio("multiple_choice")} className="px-3 py-1 rounded bg-[#083D77] text-white">Adicionar Múltipla Escolha</button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {exercicios.map((ex, i) => (
                  <div key={i} className="border rounded p-3">
                    {/* form responsivo: conteúdo e ações empilhados em mobile */}
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Título (opcional)</label>
                        <input value={ex.titulo ?? ""} onChange={(e) => updateExercicio(i, { titulo: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" />
                        <label className="text-sm font-medium mt-2">Enunciado</label>
                        <textarea value={ex.enunciado ?? ""} onChange={(e) => updateExercicio(i, { enunciado: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" rows={3} />

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm font-medium">Tipo</label>
                            <select value={ex.tipo} onChange={(e) => updateExercicio(i, { tipo: e.target.value as any })} className="mt-1 block w-full border rounded px-3 py-2">
                              <option value="text">Resposta em texto</option>
                              <option value="multiple_choice">Múltipla escolha</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Pontos</label>
                            <input type="number" value={ex.pontos ?? 1} onChange={(e) => updateExercicio(i, { pontos: Number(e.target.value) || 1 })} className="mt-1 block w-full border rounded px-3 py-2" />
                          </div>
                        </div>

                        {ex.tipo === "text" && (
                          <div className="mt-2">
                            <label className="text-sm font-medium">Resposta modelo (opcional)</label>
                            <input value={ex.resposta_modelo ?? ""} onChange={(e) => updateExercicio(i, { resposta_modelo: e.target.value })} className="mt-1 block w-full border rounded px-3 py-2" />
                            <div className="text-xs text-gray-400 mt-1">Se preenchido, o sistema fará comparação simples (case-insensitive) ao submeter.</div>
                          </div>
                        )}

                        {ex.tipo === "multiple_choice" && (
                          <div className="mt-3">
                            <label className="text-sm font-medium">Alternativas</label>
                            <div className="mt-2 space-y-2">
                              {(ex.alternativas ?? []).map((alt, ai) => (
                                <div key={ai} className="flex flex-col sm:flex-row items-center gap-2">
                                  <input value={alt} onChange={(e) => updateAlternative(i, ai, e.target.value)} className="flex-1 border rounded px-3 py-2" />
                                  <div className="flex gap-2">
                                    <button onClick={() => toggleAlternativeCorrect(i, ai)} type="button" className={`px-3 py-1 rounded ${ex.alternativas_certas?.includes(ai) ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                                      {ex.alternativas_certas?.includes(ai) ? "Certa" : "Marcar"}
                                    </button>
                                    <button onClick={() => removeAlternative(i, ai)} type="button" className="px-3 py-1 rounded bg-red-50 text-red-700">Remover</button>
                                  </div>
                                </div>
                              ))}
                              <div>
                                <button onClick={() => addAlternative(i)} type="button" className="px-3 py-1 rounded border">Adicionar alternativa</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-full sm:w-auto flex-shrink-0 flex flex-col gap-2">
                        <button onClick={() => removeExercicio(i)} className="px-3 py-2 rounded bg-red-50 text-red-700 w-full sm:w-auto">Remover</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            {/* VIEW MODE */}
            {aula.blocos && aula.blocos.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Conteúdo</h2>
                <div className="space-y-4">
                  {aula.blocos.map((b) => (
                    <article key={b.id} className="bg-white p-4 rounded shadow">
                      {b.titulo && <div className="font-semibold">{b.titulo}</div>}
                      {b.imagem_url && (
                        <div className="mt-3">
                          <img src={b.imagem_url} alt={b.titulo ?? "Imagem do bloco"} className="w-full max-h-80 object-cover rounded" />
                        </div>
                      )}
                      {b.texto && <div className="mt-2 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: b.texto ?? "" }} />}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {aula.exercicios && aula.exercicios.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Exercícios</h2>
                <div className="space-y-4">
                  {aula.exercicios.map((ex) => (
                    <div key={ex.id} className="bg-white p-4 rounded shadow">
                      {ex.titulo && <div className="font-semibold">{ex.titulo}</div>}
                      <div className="mt-1 text-sm text-gray-700">{ex.enunciado}</div>

                      {ex.tipo === "multiple_choice" && ex.alternativas && (
                        <div className="mt-3 space-y-2">
                          {ex.alternativas.map((alt, ai) => {
                            const selected = selectedAlternative[ex.id] === ai
                            return (
                              <label key={alt.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                                <input
                                  type="radio"
                                  name={`ex-${ex.id}`}
                                  checked={selected}
                                  onChange={() => setSelectedAlternative((s) => ({ ...s, [ex.id]: ai }))}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">{alt.texto}</span>
                              </label>
                            )
                          })}
                          {/* controles simplificados: apenas mostrar feedback local (será preenchido após Enviar Tudo) */}
                          <div className="mt-3">
                            {lastResult[ex.id] ? (
                              <div className="text-sm text-green-600">Pontuação: {lastResult[ex.id].pontuacao}</div>
                            ) : (
                              <div className="text-sm text-gray-400">Selecione a alternativa e finalize no bloco abaixo.</div>
                            )}
                          </div>
                        </div>
                      )}

                      {ex.tipo !== "multiple_choice" && (
                        <div className="mt-3">
                          <textarea
                            value={answerText[ex.id] ?? ""}
                            onChange={(e) => setAnswerText((t) => ({ ...t, [ex.id]: e.target.value }))}
                            className="w-full border rounded px-3 py-2"
                            rows={4}
                          />
                          <div className="mt-2 text-sm text-gray-400">
                            Sua resposta será enviada quando você clicar em <strong>Enviar tudo</strong>.
                          </div>
                          {lastResult[ex.id] && <div className="mt-2 text-sm text-green-600">Pontuação: {lastResult[ex.id].pontuacao}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!canEdit && (
              <div className="mt-6 bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-2">Finalizar tentativa</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Ao clicar em <strong>Enviar tudo</strong>, sua tentativa será finalizada e você não poderá mais alterar respostas.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEnviarTudo}
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                    disabled={finalized}
                  >
                    {finalized ? "Finalizada" : "Enviar tudo"}
                  </button>


                  <button
                    onClick={async () => {
                      try {
                        const updated = await fetchJsonWithAuth(`${API_URL}/aulas/${aula?.id}`);
                        setAula(updated);
                        alert("Dados recarregados.");
                      } catch {
                        alert("Erro ao recarregar.");
                      }
                    }}
                    className="px-3 py-2 rounded border"
                  >
                    Recarregar
                  </button>

                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
