import api from "./../api/axios";

export interface ScolariteEtudiant {
    id: string;
    nom: string;
    email: string;
    telephone?: string;
    cne?: string;
    cin?: string;
    codeApogee?: string;
    niveau?: string;
    groupe?: string;
    filiere?: string;
    departement?: string;
}

export interface ScolariteConversation {
    id: string;
    sujet: string;
    createdAt: string;
    statut: string;
    etudiant: ScolariteEtudiant;
    dernierMessage?: string;
    derniereActivite?: string;
    nonLus: number;
}

export const getScolariteConversations = async (): Promise<ScolariteConversation[]> => {
    const res: any = await api.get("/scolarite/messages/conversations");
    return res?.data?.conversations ?? res?.conversations ?? [];
};

export const getScolariteMessages = async (conversationId: string) => {
    const res: any = await api.get(`/scolarite/messages/conversations/${conversationId}`);
    return res?.data?.messages ?? res?.messages ?? [];
};

export const sendScolariteMessage = async (
    conversationId: string,
    contenu: string,
    files: File[] = []
) => {
    const formData = new FormData();
    formData.append("contenu", contenu);
    files.forEach((f) => formData.append("pieces", f));
    const res: any = await api.post(
        `/scolarite/messages/conversations/${conversationId}`,
        formData,
        {
            headers: { "Content-Type": "multipart/form-data" },
        }
    );
    return res?.data?.message ?? res?.message;
};

export const markScolariteConversationRead = async (conversationId: string) => {
    await api.patch(`/scolarite/messages/conversations/${conversationId}/read`);
};