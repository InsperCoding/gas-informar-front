// trecho para AulaDetalhes.tsx (cole no final, onde renderiza os exercicios)
import { useEffect } from "react"
import { useLocation } from "react-router-dom"

export default function AulaDetalhes({ aula }: { aula: any }) {
  const location = useLocation()

  useEffect(() => {
    if (location.hash === "#exercicios") {
      setTimeout(() => {
        const el = document.getElementById("exercicios")
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 80)
    }
  }, [location])

  return (
    <div>
      {/* ... conteúdo da aula, blocos, etc ... */}

      {/* Seção de exercícios — coloque o id aqui */}
      <section id="exercicios" className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Exercícios</h2>

        {aula.exercicios?.map((ex: any) => (
          <div key={ex.id} className="mb-4 p-4 border rounded bg-white shadow-sm">
            <h3 className="font-medium">{ex.titulo ?? "Exercício"}</h3>
            <p className="text-sm text-gray-700 mt-2">{ex.enunciado}</p>

            {/* render de alternativas se for multiple_choice */}
            {ex.tipo === "multiple_choice" && (
              <ul className="mt-2 list-disc pl-6">
                {ex.alternativas?.map((alt: any) => (
                  <li key={alt.id}>{alt.texto}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
