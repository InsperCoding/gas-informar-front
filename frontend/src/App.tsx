import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Usuarios from "./pages/Usuarios"
import Aulas from "./pages/Aulas"
import AulaDetail from "./pages/AulaDetail"
import DesempenhoPage from "./pages/Desempenho"
import MinhasRespostas from "./pages/MinhasRespostas"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/usuarios" element={<Usuarios />} /> 
        <Route path="/aulas" element={<Aulas />} />
        <Route path="/aulas/:id" element={<AulaDetail />} />
        <Route path="/desempenho" element={<DesempenhoPage />} />
        <Route path="/minhas-respostas" element={<MinhasRespostas />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
