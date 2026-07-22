import api from "../api/axios";

export const login = async (email: string, password: string) => {
  const { data } = await api.post("/auth/login", {
    email,
    password,
  });

  return data;
};

export const register = async (user: any) => {
  const { data } = await api.post("/auth/register", user);

  return data;
};

export const forgotPassword = async (email: string) => {
  const { data } = await api.post("/auth/forgot-password", {
    email,
  });

  return data;
};

export const resetPassword = async (
  token: string,
  password: string
) => {
  const { data } = await api.post("/auth/reset-password", {
    token,
    password,
  });

  return data;
};