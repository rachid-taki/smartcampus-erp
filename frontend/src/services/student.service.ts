import api from "./../api/axios";

export const getCurrentStudent = async () => {
    const { data } = await api.get("/student/profile");
    return data;
};

export const getDashboard = async () => {
    const { data } = await api.get("/student/dashboard");
    return data;
};