// src/pages/Desempenho.tsx
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { fetchJsonWithAuth, getToken } from "../lib/fetchWithAuth";
import { API_URL } from "../config";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Link } from "react-router-dom"

type QuestaoDesempenho = {
  exercicio_id: number | string;
  enunciado: string;
  total_respondentes: number;
  total_acertos: number;
  taxa_acerto: number | string | null;
  distribuicao_respostas?: Record<string, number> | null;
};

type AulaDesempenho = {
  aula_id: number | string;
  id?: number | string;               // alias compatível com usos antigos
  titulo?: string;
  nome?: string;                      // alias compatível (antigo `nome`)
  nome_aluno?: string;                // alias opcional (compatibilidade)
  respondentes: number;
  media_pontuacao: number | string;
  percentual_conclusao: number | string;
  questoes: QuestaoDesempenho[] | null;
};

type AulaItem = { id: number | string; titulo: string; };

type DetalheAlunoResposta = {
  exercicio_id: number | string;
  enunciado: string;
  resposta_aluno?: string | null;
  alternativa_escolhida_id?: number | null;
  acertou: boolean;
  pontuacao_obtida: number;
};

type DesempenhoAluno = {
  aluno_id: number | string;
  nome: string;
  pontuacao_total: number;
  finalizada: boolean;
  responses: DetalheAlunoResposta[];
};

function shortText(s?: string, n = 40) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function exportToCsv(filename: string, rows: any[]) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function DesempenhoPage() {
  const [aulas, setAulas] = useState<AulaItem[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<number | string | null>(null);
  const [desempenho, setDesempenho] = useState<AulaDesempenho | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // aluno detail
  const [alunoIdQuery, setAlunoIdQuery] = useState<string>("");
  const [alunoDetail, setAlunoDetail] = useState<DesempenhoAluno | null>(null);
  const [loadingAluno, setLoadingAluno] = useState(false);
  const [showAlunoModal, setShowAlunoModal] = useState(false);

  // safe number formatter
  const toNumber = (v: any) => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };
  const formatPercent = (v: any) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toFixed(2) + "%";
  };

  // fetch aulas
  async function fetchAulas() {
    try {
      const data: any[] = await fetchJsonWithAuth(`${API_URL}/aulas`);
      const mapped = (Array.isArray(data) ? data : []).map((d) => ({ id: d.id ?? d.aula_id ?? d._id, titulo: d.titulo ?? d.nome ?? "Aula sem título" }));
      setAulas(mapped);
    } catch (err: any) {
      console.error(err);
      setError("Erro ao carregar aulas.");
    }
  }

  // fetch desempenho da aula selecionada
  async function fetchDesempenho(aulaId: number | string | null) {
    if (!aulaId) {
      setDesempenho(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: AulaDesempenho = await fetchJsonWithAuth(`${API_URL}/aulas/${aulaId}/desempenho`);
      // normalize minimal shape defensively and provide aliases (id, nome, nome_aluno)
      const normalized: AulaDesempenho = {
        aula_id: (res as any).aula_id ?? (res as any).id ?? aulaId,
        id: (res as any).id ?? (res as any).aula_id ?? aulaId,
        titulo: (res as any).titulo ?? (res as any).nome ?? "",
        nome: (res as any).nome ?? (res as any).titulo ?? (res as any).nome_aluno ?? "",
        nome_aluno: (res as any).nome_aluno ?? (res as any).titulo ?? "",
        respondentes: toNumber((res as any).respondentes),
        media_pontuacao: toNumber((res as any).media_pontuacao),
        percentual_conclusao: toNumber((res as any).percentual_conclusao),
        questoes: Array.isArray((res as any).questoes) ? (res as any).questoes : [],
      };
      setDesempenho(normalized);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao carregar desempenho da aula.");
      setDesempenho(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      setError("Usuário não autenticado.");
      return;
    }
    fetchAulas();
  }, []);

  useEffect(() => {
    fetchDesempenho(selectedAulaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAulaId]);

  const chartData = useMemo(() => {
    if (!desempenho || !desempenho.questoes) return [];
    return desempenho.questoes.map((q, i) => ({
      name: shortText(q.enunciado || `Q${i + 1}`, 30),
      taxa_acerto: Number(q.taxa_acerto ?? 0),
      total_respondentes: toNumber(q.total_respondentes),
      total_acertos: toNumber(q.total_acertos),
      exercicio_id: q.exercicio_id ?? i + 1,
    }));
  }, [desempenho]);

  async function handleBuscarAluno() {
    if (!selectedAulaId) return alert("Selecione uma aula primeiro.");
    if (!alunoIdQuery.trim()) return alert("Informe o ID do aluno.");
    setLoadingAluno(true);
    setAlunoDetail(null);
    try {
      const idNum = Number(alunoIdQuery);
      if (isNaN(idNum)) throw new Error("ID inválido");
      const res: DesempenhoAluno = await fetchJsonWithAuth(`${API_URL}/aulas/${selectedAulaId}/desempenho/${idNum}`);
      // normalize
      const normalized: DesempenhoAluno = {
        aluno_id: (res as any).aluno_id ?? (res as any).id ?? idNum,
        nome: (res as any).nome ?? (res as any).nome_aluno ?? "Aluno",
        pontuacao_total: toNumber((res as any).pontuacao_total),
        finalizada: !!(res as any).finalizada,
        responses: Array.isArray((res as any).responses) ? (res as any).responses : [],
      };
      setAlunoDetail(normalized);
      setShowAlunoModal(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erro ao buscar desempenho do aluno (verifique ID).");
    } finally {
      setLoadingAluno(false);
    }
  }

  function handleExportQuestionsCsv() {
    if (!desempenho || !desempenho.questoes || desempenho.questoes.length === 0) return alert("Sem questões para exportar.");
    const rows = desempenho.questoes.map((q) => ({
      exercicio_id: q.exercicio_id,
      enunciado: q.enunciado,
      total_respondentes: q.total_respondentes ?? 0,
      total_acertos: q.total_acertos ?? 0,
      taxa_acerto: Number(q.taxa_acerto ?? 0),
      distribuicao: q.distribuicao_respostas ? JSON.stringify(q.distribuicao_respostas) : "",
    }));
    exportToCsv(`desempenho_aula_${desempenho.id ?? desempenho.aula_id}_questoes.csv`, rows);
  }

  function handleExportAlunoCsv() {
    if (!alunoDetail || !alunoDetail.responses || alunoDetail.responses.length === 0) return alert("Sem respostas do aluno para exportar.");
    const rows = alunoDetail.responses.map((r) => ({
      aluno_id: alunoDetail.aluno_id,
      aluno_nome: alunoDetail.nome,
      exercicio_id: r.exercicio_id,
      enunciado: r.enunciado,
      resposta_aluno: r.resposta_aluno ?? "",
      alternativa_escolhida_id: r.alternativa_escolhida_id ?? "",
      acertou: r.acertou ? "1" : "0",
      pontuacao_obtida: r.pontuacao_obtida ?? 0,
    }));
    exportToCsv(`desempenho_aluno_${alunoDetail.aluno_id}.csv`, rows);
  }

  // refresh explicit
  async function handleRefresh() {
    await fetchDesempenho(selectedAulaId);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:underline">← Voltar para o dashboard</Link>
        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold">Análise de Desempenho</h1>
          <p className="text-sm text-gray-600">Visualize métricas e estatísticas da aula selecionada.</p>
        </div>

        <div className="bg-white p-4 rounded shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium">Aula</label>
              <select
                className="mt-1 block w-full border rounded px-3 py-2"
                value={selectedAulaId ?? ""}
                onChange={(e) => setSelectedAulaId(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : null)}
              >
                <option value="">-- selecione uma aula --</option>
                {aulas.map((a) => (
                  <option key={String(a.id)} value={a.id}>
                    {a.titulo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-stretch gap-2">
              <button
                onClick={handleRefresh}
                className="mt-7 px-4 py-2 rounded bg-[#083D77] text-white hover:bg-[#062f63]"
              >
                Atualizar
              </button>
              <button onClick={handleExportQuestionsCsv} className="mt-7 px-4 py-2 rounded border">
                Exportar Questões (CSV)
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">Respondentes</div>
                <div className="text-2xl font-bold">{desempenho ? desempenho.respondentes : "—"}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">Média de Pontuação</div>
                <div className="text-2xl font-bold">{desempenho ? Number(desempenho.media_pontuacao).toFixed(2) : "—"}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-500">% Conclusão</div>
                <div className="text-2xl font-bold">{desempenho ? formatPercent(desempenho.percentual_conclusao) : "—"}</div>
              </div>
            </div>

            <div className="sm:w-80">
              <label className="text-sm font-medium">Buscar aluno por ID</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-2"
                  value={alunoIdQuery}
                  onChange={(e) => setAlunoIdQuery(e.target.value)}
                  placeholder="ID do aluno (ex: 12)"
                />
                <button onClick={handleBuscarAluno} disabled={loadingAluno} className="px-3 py-2 rounded bg-[#083D77] text-white">
                  {loadingAluno ? "Buscando..." : "Buscar"}
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Informe o ID numérico do aluno para ver o detalhamento (professor/admin).
              </div>
            </div>
          </div>
        </div>

        {loading && <div className="p-6 bg-white rounded shadow">Carregando...</div>}
        {error && <div className="p-6 bg-red-50 text-red-700 rounded">{error}</div>}

        {desempenho && (
          <>
            <section className="bg-white p-4 rounded shadow mb-6">
              <h2 className="text-lg font-semibold mb-3">Taxa de acerto por questão</h2>
              {(!desempenho.questoes || desempenho.questoes.length === 0) ? (
                <div className="text-sm text-gray-500">Nenhuma questão registrada para esta aula.</div>
              ) : (
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} /> {/* ← escala fixa de 0 a 100 */}
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="taxa_acerto" name="% acerto" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="bg-white p-4 rounded shadow mb-6">
              <h2 className="text-lg font-semibold mb-3">Questões (detalhado)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="text-sm text-gray-600">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Enunciado</th>
                      <th className="px-3 py-2">Respondentes</th>
                      <th className="px-3 py-2">Acertos</th>
                      <th className="px-3 py-2">% Acerto</th>
                      <th className="px-3 py-2">Distribuição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(desempenho.questoes || []).map((q, i) => (
                      <tr key={String(q.exercicio_id ?? i)} className="border-t">
                        <td className="px-3 py-2 align-top">{i + 1}</td>
                        <td className="px-3 py-2 align-top max-w-xl">
                          <div className="text-sm font-medium">{shortText(q.enunciado, 180)}</div>
                        </td>
                        <td className="px-3 py-2 align-top">{q.total_respondentes ?? "—"}</td>
                        <td className="px-3 py-2 align-top">{q.total_acertos ?? "—"}</td>
                        <td className="px-3 py-2 align-top">{formatPercent(q.taxa_acerto)}</td>
                        <td className="px-3 py-2 align-top">
                          {q.distribuicao_respostas
                            ? Object.entries(q.distribuicao_respostas).map(([alt, cnt]) => (
                                <div key={alt} className="text-xs text-gray-700">
                                  Alt {alt}: {cnt}
                                </div>
                              ))
                            : <div className="text-xs text-gray-400">—</div>}
                        </td>
                      </tr>
                    ))}
                    {(!desempenho.questoes || desempenho.questoes.length === 0) && (
                      <tr><td colSpan={6} className="p-4 text-sm text-gray-500">Sem questões.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* modal aluno */}
        {showAlunoModal && alunoDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowAlunoModal(false)} />
            <div className="relative z-10 bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 overflow-y-auto max-h-[80vh]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Desempenho do aluno</h3>
                  <div className="text-sm text-gray-600">{alunoDetail.nome} — ID: {alunoDetail.aluno_id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { handleExportAlunoCsv(); }} className="px-3 py-2 rounded border">Exportar CSV</button>
                  <button onClick={() => setShowAlunoModal(false)} className="px-3 py-2 rounded bg-red-50 text-red-700">Fechar</button>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-2">Pontuação total: <strong>{alunoDetail.pontuacao_total}</strong> — Finalizada: {alunoDetail.finalizada ? "Sim" : "Não"}</div>

                <div className="space-y-3">
                  {alunoDetail.responses.map((r) => (
                    <div key={String(r.exercicio_id)} className="border rounded p-3 bg-gray-50">
                      <div className="text-sm font-medium">{shortText(r.enunciado, 200)}</div>
                      <div className="mt-1 text-sm text-gray-700">Resposta: {r.resposta_aluno ?? (r.alternativa_escolhida_id ?? "—")}</div>
                      <div className="mt-1 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${r.acertou ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{r.acertou ? "Acertou" : "Errou"}</span>
                        <span className="ml-2 text-sm text-gray-600">Pontuação: {r.pontuacao_obtida ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
