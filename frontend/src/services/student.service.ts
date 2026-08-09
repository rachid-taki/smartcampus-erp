import api from "./../api/axios";

const token =
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export async function getCurrentStudent() {
    const res = await api.get("/student/profile", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        
    });

    console.log("RAW RESPONSE");
    console.log(res);
    console.log("DATA");
    console.log(res.data);
    return res.data;
}

export const getDashboard = async () => {
    const { data } = await api.get("/student/dashboard");
    return data;
};

export async function getRecentRequests() {
  const res = await api.get("/student/requests/recent", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  return res.data.requests;
}

export async function getRecentDocuments() {

    const res = await api.get("/student/documents/recent", {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
    });

    return res.data.documents;
}
export async function downloadDocument(id: string) {

    const response = await api.get(
        `/student/documents/${id}/download`,
        {
            responseType: "blob",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        }
    );

    return response.data;
}

export async function getRecentNotifications() {

    const res = await api.get(
        "/student/notifications/recent",
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        }
    );

    return res.data.notifications;

}

export async function getLatestAttestation() {

    const { data } = await api.get(
        "/student/attestation/latest",
        {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        }
    );
    

    return data.attestation;

}

export const getAllRequests = async () => {

    const res = await api.get("/student/requests");

    return res.data.requests;

};

export const getRequestTypes = async () => {

    const res = await api.get("/student/request-types");

    return res.data.types;

};

export const createRequest = async (payload: FormData) => {
  const res = await api.post("/student/requests", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data.request;
};
export const getProfile = async () => {
    const { data } = await api.get("/student/profile");
    return data;
};

export const updateProfilePhoto = (formData: FormData) =>
  api.patch("/student/profile/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updatePassword = (currentPassword: string, newPassword: string) =>
    api.patch("/student/profile/password", { currentPassword, newPassword });



export const getNotifications = () =>
    api.get("/student/notifications").then(
        (res: any) => res.data?.notifications ?? res.notifications
    );

export const markNotificationRead = (id: string) =>
    api.patch(`/student/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
    api.patch("/student/notifications/read-all");


export const getReclamationTypes = async () => {
    const res: any = await api.get("/student/reclamation-types");
    return res?.data?.types ?? res?.types;
};

export const getReclamations = async () => {
    const res: any = await api.get("/student/reclamations");
    return res?.data?.reclamations ?? res?.reclamations;
};

export const getProfessors = async () => {
    const res: any = await api.get("/student/reclamations/professors");
    return res?.data?.professors ?? res?.professors ?? [];
};

export const createReclamation = async (payload: FormData | any) => {
    const isFormData = payload instanceof FormData;
    const res: any = await api.post("/student/reclamations", payload, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res?.data?.reclamation ?? res?.reclamation;
};

export const searchKnowledge = async (query: string) => {
    const res: any = await api.get(`/student/knowledge/search?q=${encodeURIComponent(query)}`);
    return res?.data?.results ?? res?.results ?? [];
};

export const classifyReclamationText = async (text: string) => {
    const res: any = await api.post("/student/classify", { text });
    return res?.data?.classification ?? res?.classification;
};

export interface DocumentOfficiel {
    id: string;
    nom: string;
    type: string;
    categorie: string;
    taille: number;
    sizeKb: number;
    dateGeneration: string;
    dateExpiration?: string;
    nombreTelechargements: number;
    dernierTelechargement?: string;
    expired: boolean;
}

export const getDocumentsOfficiels = async (): Promise<DocumentOfficiel[]> => {
    const res: any = await api.get("/student/documents-officiels");
    return res?.data?.documents ?? res?.documents ?? [];
};

export const downloadDocumentOfficiel = async (id: string): Promise<Blob> => {
    const res = await api.get(`/student/documents-officiels/${id}/download`, {
        responseType: "blob",
    });
    return res.data;
};