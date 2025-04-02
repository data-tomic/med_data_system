// frontend/src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // <--- Используем хук useAuth

interface PrivateRouteProps {
  children: React.ReactElement;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth(); // <--- Получаем статус из контекста
  const location = useLocation();

  // Пока идет проверка токена при загрузке, показываем лоадер
  if (isLoading) {
    return <div>Проверка аутентификации...</div>; // Или спиннер
  }

  if (!isAuthenticated) {
    console.log('PrivateRoute: User not authenticated (from context), redirecting to login.');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
