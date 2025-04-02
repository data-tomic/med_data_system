// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
// Импортируем apiClient для возможных запросов (например, проверка токена)
// import apiClient from '../services/api';

// Тип для данных пользователя (можно расширить)
interface User {
  // id: number; // Пример
  username: string; // Пример
  // Добавьте другие поля, если они получаются при логине или из токена
}

// Тип для значения контекста
interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null; // Добавим информацию о пользователе
  isLoading: boolean; // Флаг начальной загрузки/проверки токена
  login: (access: string, refresh: string) => void;
  logout: () => void;
  // Можно добавить функцию для обновления токена, если нужно вызывать ее извне
  // refreshAuthToken: () => Promise<void>;
}

// Создаем контекст с начальным значением undefined (или null)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Тип для пропсов провайдера
interface AuthProviderProps {
  children: ReactNode;
}

// Создаем компонент-провайдер
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null); // Состояние для пользователя
  const [isLoading, setIsLoading] = useState<boolean>(true); // Начинаем с загрузки
  const navigate = useNavigate(); // Для редиректа при logout

  // Эффект для проверки токенов при загрузке приложения
  useEffect(() => {
    console.log("AuthProvider: Checking tokens on mount...");
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRefreshToken) {
      console.log("AuthProvider: Found tokens in localStorage.");
      // Здесь можно добавить проверку валидности токена (например, запрос к /api/user/me/)
      // Если токен валиден:
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      // Можно попытаться декодировать токен для получения данных пользователя (небезопасно без проверки на сервере!)
      // Или сделать запрос на бэкенд для получения данных пользователя
      // setUser({ username: 'user_from_token_or_api' }); // Пример
      console.log("AuthProvider: User is considered authenticated (initial check).");
    } else {
      console.log("AuthProvider: No tokens found or invalid.");
      // Убедимся, что состояние чистое, если токенов нет
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
    setIsLoading(false); // Завершаем начальную загрузку
  }, []);

  // Функция для входа (вызывается из LoginPage)
  const login = useCallback((access: string, refresh: string) => {
    console.log("AuthProvider: login called.");
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    setAccessToken(access);
    setRefreshToken(refresh);
    // Здесь также можно получить данные пользователя
    // setUser({ username: 'user_from_login_or_token' });
    console.log("AuthProvider: User logged in, state updated.");
  }, []);

  // Функция для выхода (вызывается из App или компонента навигации)
  const logout = useCallback(() => {
    console.log("AuthProvider: logout called.");
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    console.log("AuthProvider: User logged out, state cleared.");
    // Перенаправляем на страницу входа
    navigate('/login', { replace: true });
  }, [navigate]);

  // Значение, которое будет передано через контекст
  const contextValue: AuthContextType = {
    isAuthenticated: !!accessToken, // Признак аутентификации - наличие access токена
    accessToken,
    refreshToken,
    user,
    isLoading,
    login,
    logout,
  };

  // Пока идет начальная проверка токена, можно ничего не рендерить или показать лоадер
  if (isLoading) {
    return <div>Загрузка аутентификации...</div>; // Или ваш компонент спиннера
  }

  // Передаем значение контекста всем дочерним компонентам
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Хук для удобного использования контекста в компонентах
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
