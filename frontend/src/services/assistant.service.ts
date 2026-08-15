import api from "./../api/axios";

const token =
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

export interface ChatPayload {
    conversationId?: string;
    message: string;
}

export interface ChatResponse {
    conversationId: string;
    categorie: string;
    answer: string;
    action: { label: string; url: string } | null;
    quickReplies: string[];
}

export interface AssistantMessage {
    id: string;
    role: "User" | "Assistant" | "System";
    contenu: string;
    dateEnvoi: string;
    action?: { label: string; url: string } | null;
    quickReplies?: string[];
}



export interface AssistantConversation {
    id: string;
    titre: string;
    createdAt: string;
    statut: string;
}

export const chatWithAssistant = async (payload: ChatPayload): Promise<ChatResponse> => {
    const res = await api.post("/student/assistant/chat", payload);
    return res.data;
};

export const getAssistantConversations = async (): Promise<AssistantConversation[]> => {
    const res = await api.get("/student/assistant/conversations");
    return res.data.conversations;
};

export const getAssistantMessages = async (conversationId: string): Promise<AssistantMessage[]> => {
    const res = await api.get(`/student/assistant/conversations/${conversationId}/messages`);
    return res.data.messages;
};