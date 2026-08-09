import api from "./../api/axios";

export interface Conversation {
    id: string;
    sujet: string;
    createdAt: string;
    statut: string;
    dernierMessage?: string;
    derniereActivite?: string;
    nonLus: number;
}

export interface MessagePiece {
    id_document: string;  
    nom: string;
    type: string;
    taille: number;
    url: string;  
}


export interface Message {
    id: string;
    contenu: string;
    dateEnvoi: string;
    lu: boolean;
    isMine: boolean;
    expediteur: string;
    piecesJointes: MessagePiece[];
}

export const getConversations = async (): Promise<Conversation[]> => {
    const res: any = await api.get("/student/messages/conversations");
    return res?.data?.conversations ?? res?.conversations ?? [];
};

export const createConversation = async (sujet: string): Promise<Conversation> => {
    const res: any = await api.post("/student/messages/conversations", { sujet });
    return res?.data?.conversation ?? res?.conversation;
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const res: any = await api.get(`/student/messages/conversations/${conversationId}`);
    return res?.data?.messages ?? res?.messages ?? [];
};

export const sendMessage = async (conversationId: string, contenu: string, files: File[] = []) => {
    const formData = new FormData();
    formData.append("contenu", contenu);
    files.forEach((f) => formData.append("pieces", f));
    const res: any = await api.post(`/student/messages/conversations/${conversationId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res?.data?.message ?? res?.message;
};

export const markConversationRead = async (conversationId: string) => {
    await api.patch(`/student/messages/conversations/${conversationId}/read`);
};