import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "@OSI_User";

export const authService = {
  // Guarda os dados do utilizador após o login
  saveUser: async (userData: any) => {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error("Erro ao guardar user", e);
    }
  },

  // Recupera o utilizador logado
  getUser: async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(USER_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      return null;
    }
  },

  // Logout
  logout: async () => {
    await AsyncStorage.removeItem(USER_KEY);
  },
};
