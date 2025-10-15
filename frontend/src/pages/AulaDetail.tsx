// src/pages/AulaDetail.tsx
import React, { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import Header from "../components/Header"
import { fetchJsonWithAuth } from "../lib/fetchWithAuth"
import { API_URL } from "../config"

type ConteudoBloco = { id: number; titulo?: string; texto?: string; ordem?: number }
type Alternativa = { id: number; texto: string }
type Exercicio = { id: number; titulo?: string; enunciado: string; tipo: string; alternativas?: Alternativa[]; pontos?: number }

type AulaOut = {
  id: number
  titulo: string
  descricao?: string
  blocos?: ConteudoBloco[]
  exercicios?: Exercicio[]
  autor_id?: number
  created_at?: string
}

export default function AulaDetail() {
  const { id } = useParams<{ id: string }>()
  const [aula, setAula] = useState<AulaOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      try {
        const data: AulaOut = await fetchJsonWithAuth(`${API_URL}/aulas/${id}`)
        setAula(data)
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar aula.")
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="p-8">Carregando...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>
  if (!aula) return <div className="p-8">Aula não encontrada.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/aulas" className="text-sm text-gray-500 hover:underline">← Voltar para Aulas</Link>
        </div>

        <h1 className="text-2xl font-bold">{aula.titulo}</h1>
        {aula.descricao && <p className="mt-2 text-gray-600">{aula.descricao}</p>}

        <section className="mt-6 space-y-6">
          {aula.blocos && aula.blocos.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold">Conteúdo</h2>
              <div className="mt-2 space-y-4">
                {aula.blocos.map((b) => (
                  <div key={b.id} className="bg-white p-4 rounded shadow">
                    {b.titulo && <div className="font-semibold">{b.titulo}</div>}
                    {b.texto && <div className="mt-1 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: b.texto }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {aula.exercicios && aula.exercicios.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold">Exercícios</h2>
              <div className="mt-2 space-y-4">
                {aula.exercicios.map((ex) => (
                  <div key={ex.id} className="bg-white p-4 rounded shadow">
                    {ex.titulo && <div className="font-semibold">{ex.titulo}</div>}
                    <div className="mt-1 text-sm text-gray-700">{ex.enunciado}</div>
                    {ex.tipo === "multiple_choice" && ex.alternativas && (
                      <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                        {ex.alternativas.map((alt) => <li key={alt.id}>{alt.texto}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
