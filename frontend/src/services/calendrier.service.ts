import axios from "axios";

const API = "http://localhost:3000/api/student";

export interface CalendrierEvent {
  id: string;
  title: string;
  type: "enseignement" | "controle" | "examen" | "deliberation" | "vacances" | "fete" | "soutenance";
  start: string;
  end: string;
  semester: "S1" | "S2" | "all";
  note?: string;
  annee?: string;
  metadata?: {
    cours_code?: string;
    professeur?: string;
    salle?: string;
    horaire?: string;
  };
}

export interface CalendrierResponse {
  filiere: {
    id: string;
    nom: string;
  };
  events: CalendrierEvent[];
  annees: string[];
}

export async function getCalendrier(): Promise<CalendrierResponse> {
  const token = localStorage.getItem("token");
  const res = await axios.get(`${API}/calendrier`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}