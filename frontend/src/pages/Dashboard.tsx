import { useEffect, useState } from "react";
import axios from "axios";
import { getToken, logout } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    axios
      .get("http://127.0.0.1:8000/usuarios/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUser(res.data))
      .catch(() => {
        logout();
        navigate("/");
      });
  }, [navigate]);

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Dashboard</h1>
      {user && (
        <p className="mt-4">Bem-vindo, {user.nome} ({user.role})</p>
      )}
      <button
        onClick={() => {
          logout();
          navigate("/");
        }}
        className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Sair
      </button>
    </div>
  );
}
