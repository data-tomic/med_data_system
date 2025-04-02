// frontend/src/App.tsx
import React from 'react';
// Добавляем useNavigate для logout, если он не в контексте
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './contexts/AuthContext';

// --- Импорты Компонентов и Страниц ---
import PrivateRoute from './components/PrivateRoute';
import PatientListPage from './pages/PatientListPage';
import CreatePatientPage from './pages/CreatePatientPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage'; // Убедитесь, что файл существует
import PatientDetailPage from './pages/PatientDetailPage'; // Убедитесь, что файл существует
import NotFoundPage from './pages/NotFoundPage'; // Убедитесь, что файл существует
import ResearchPage from './pages/ResearchPage'; // <--- ДОБАВЛЕН ИМПОРТ НОВОЙ СТРАНИЦЫ
// ------------------------------------

function App() {
  // Получаем статус, функцию выхода и статус загрузки из контекста
  const { isAuthenticated, logout, isLoading } = useAuth();
  // const navigate = useNavigate(); // Используем logout из контекста

  // Пока контекст проверяет токен, показываем лоадер
   if (isLoading) {
       return <div>Инициализация приложения...</div>;
   }

  // Если logout не находится в контексте, можно определить его здесь
  // const handleLogout = () => {
  //   localStorage.removeItem('accessToken');
  //   localStorage.removeItem('refreshToken');
  //   navigate('/login', { replace: true });
  // };

  return (
    <div>
      {/* --- Навигация --- */}
      <nav style={{ background: '#f0f0f0', padding: '10px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '15px' }}>
          <li><Link to="/">Главная</Link></li>

          {/* Показываем ссылки только для залогиненных пользователей */}
          {isAuthenticated && (
            <> {/* Используем фрагмент */}
              <li><Link to="/patients">Пациенты</Link></li>
              <li><Link to="/patients/new">Добавить Пациента</Link></li>
              <li><Link to="/research">Исследования</Link></li> {/* <--- ДОБАВЛЕНА ССЫЛКА */}
            </>
          )}

          {/* Показываем "Вход" или "Выход" */}
          {isAuthenticated ? (
            <li>
              <button
                onClick={logout} // Используем logout из контекста
                style={{ /* ... стили кнопки ... */ }}
              >
                Выход
              </button>
            </li>
          ) : (
            <li><Link to="/login">Вход</Link></li>
          )}
        </ul>
      </nav>
      {/* --- /Навигация --- */}

      <hr />

      {/* --- Основное содержимое страницы (маршруты) --- */}
      <main style={{ padding: '20px' }}>
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Защищенные маршруты */}
          <Route path="/patients" element={<PrivateRoute><PatientListPage /></PrivateRoute>} />
          <Route path="/patients/new" element={<PrivateRoute><CreatePatientPage /></PrivateRoute>} />
          <Route path="/patients/:patientId" element={<PrivateRoute><PatientDetailPage /></PrivateRoute>} />

          {/* --- ДОБАВЛЕН МАРШРУТ ДЛЯ ИССЛЕДОВАНИЙ --- */}
          <Route
            path="/research"
            element={
              <PrivateRoute>
                <ResearchPage />
              </PrivateRoute>
            }
          />
          {/* ----------------------------------------- */}

          {/* Маршрут для не найденных страниц (должен быть последним) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {/* --- /Основное содержимое --- */}
    </div>
  );
}

export default App;
