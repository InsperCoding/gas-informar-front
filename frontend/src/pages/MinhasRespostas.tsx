// src/pages/MinhasRespostas.tsx
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { fetchJsonWithAuth, getToken } from "../lib/fetchWithAuth"
import { API_URL } from "../config"

type AulaSimples = {
  id: number
  titulo: string
  descricao?: string | null
  category?: string | null
}

type RespostaDetalhada = {
  exercicio_id: number
  enunciado: string
  resposta_aluno?: string | null
  alternativa_escolhida_id?: number | null
  acertou: boolean
  pontuacao_obtida: number
  resposta_modelo?: string | null
  feedback_professor?: string | null
}

type DesempenhoAula = {
  aula_id: number
  aluno_id: number
  pontuacao_total: number
  finalizada: boolean
  responses: RespostaDetalhada[]
}

const USER_ID_KEY = "user_id"

export default function MinhasRespostas() {
  const [aulas, setAulas] = useState<AulaSimples[]>([])
  const [selectedAulaId, setSelectedAulaId] = useState<number | null>(null)
  const [desempenho, setDesempenho] = useState<DesempenhoAula | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDesempenho, setLoadingDesempenho] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const userId = localStorage.getItem(USER_ID_KEY)

  useEffect(() => {
    if (!getToken()) {
      navigate("/")
      return
    }
    fetchAulas()
  }, [navigate])

  const fetchAulas = async () => {
    setLoading(true)
    setError(null)
    try {
      const data: AulaSimples[] = await fetchJsonWithAuth(`${API_URL}/aulas`)
      setAulas(data)
    } catch (err: any) {
      console.error(err)
      setError("Erro ao carregar aulas.")
    } finally {
      setLoading(false)
    }
  }

  const fetchDesempenho = async (aulaId: number) => {
    if (!userId) {
      setError("ID do usuário não encontrado.")
      return
    }

    setLoadingDesempenho(true)
    setError(null)
    try {
      const data: DesempenhoAula = await fetchJsonWithAuth(
        `${API_URL}/aulas/${aulaId}/desempenho/${userId}`
      )
      setDesempenho(data)
      setSelectedAulaId(aulaId)
    } catch (err: any) {
      console.error(err)
      setError("Erro ao carregar desempenho desta aula.")
      setDesempenho(null)
    } finally {
      setLoadingDesempenho(false)
    }
  }

  const handleAulaClick = (aulaId: number) => {
    fetchDesempenho(aulaId)
  }

  const capitalize = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ""

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:underline mb-4 inline-block">
          ← Voltar para o dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Minhas Respostas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Veja seu desempenho e respostas em cada aula
          </p>
        </div>

        {loading && (
          <div className="p-6 bg-white rounded shadow">Carregando aulas...</div>
        )}

        {error && !loading && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {!loading && aulas.length === 0 && (
          <div className="p-6 bg-white rounded shadow text-gray-600">
            Nenhuma aula disponível.
          </div>
        )}

        {!loading && aulas.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Aulas */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Aulas</h2>
                <div className="space-y-2">
                  {aulas.map((aula) => (
                    <button
                      key={aula.id}
                      onClick={() => handleAulaClick(aula.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition ${
                        selectedAulaId === aula.id
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                      }`}
                    >
                      <div className="font-medium text-sm">{aula.titulo}</div>
                      {aula.category && (
                        <div className="text-xs text-gray-500 mt-1">
                          {capitalize(aula.category)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detalhes do Desempenho */}
            <div className="lg:col-span-2">
              {!selectedAulaId && (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  Selecione uma aula para ver suas respostas
                </div>
              )}

              {loadingDesempenho && (
                <div className="bg-white rounded-lg shadow p-6">
                  Carregando desempenho...
                </div>
              )}

              {selectedAulaId && !loadingDesempenho && desempenho && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold">
                      {aulas.find((a) => a.id === selectedAulaId)?.titulo}
                    </h2>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Pontuação:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {desempenho.pontuacao_total}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            desempenho.finalizada
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {desempenho.finalizada ? "Finalizada" : "Em andamento"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Respostas */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg mb-3">Suas Respostas</h3>
                    {desempenho.responses.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        Você ainda não respondeu nenhuma questão desta aula.
                      </p>
                    )}

                    {desempenho.responses.map((resp, idx) => (
                      <div
                        key={resp.exercicio_id}
                        className={`border rounded-lg p-4 ${
                          resp.acertou
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            Questão {idx + 1}
                          </h4>
                          <div className="flex items-center gap-2">
                            {resp.acertou ? (
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )}
                            <span className="text-sm font-medium">
                              {resp.pontuacao_obtida} pts
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          <strong>Enunciado:</strong> {resp.enunciado}
                        </p>

                        {resp.resposta_aluno && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-600">
                              <strong>Sua resposta:</strong> {resp.resposta_aluno}
                            </p>
                          </div>
                        )}

                        {resp.alternativa_escolhida_id !== null &&
                          resp.alternativa_escolhida_id !== undefined && (
                            <div className="mb-2">
                              <p className="text-sm text-gray-600">
                                <strong>Alternativa escolhida:</strong> ID{" "}
                                {resp.alternativa_escolhida_id}
                              </p>
                            </div>
                          )}

                        {resp.resposta_modelo && (
                          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-900">
                              <strong>Resposta modelo:</strong> {resp.resposta_modelo}
                            </p>
                          </div>
                        )}

                        {resp.feedback_professor && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-900">
                              <strong>Feedback do professor:</strong>{" "}
                              {resp.feedback_professor}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Botão para ir para a aula */}
                  <div className="mt-6 pt-4 border-t">
                    <Link
                      to={`/aulas/${selectedAulaId}`}
                      className="inline-block bg-[#083D77] text-white px-4 py-2 rounded hover:bg-[#062f63] transition"
                    >
                      Ir para a aula
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}