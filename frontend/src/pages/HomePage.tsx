// frontend/src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Импортируем, чтобы показывать разное содержимое

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth(); // Получаем статус аутентификации

  return (
    <div style={{ padding: '20px' }}>
      <h1>Главная страница Системы Управления Данными</h1>

      {isAuthenticated ? (
        // Содержимое для аутентифицированного пользователя
        <div>
          <p>
            Добро пожаловать{user ? `, ${user.username}` : ''}! Вы вошли в систему.
            {/* Замените user.username на актуальное поле, если оно есть */}
          </p>
          <p>Вы можете перейти к списку пациентов или добавить нового:</p>
          <ul style={{ listStyle: 'none', paddingLeft: 0, display: 'flex', gap: '15px', marginTop: '15px' }}>
            <li>
              <Link to="/patients">
                <button>Список пациентов</button>
              </Link>
            </li>
            <li>
              <Link to="/patients/new">
                <button>Добавить пациента</button>
              </Link>
            </li>
          </ul>
          {/* Здесь можно добавить другие важные ссылки или информацию */}
        </div>
      ) : (
        // Содержимое для неаутентифицированного пользователя
        <div>
          <p>
            Эта система предназначена для систематизации и анализа данных пациентов
            онкологического профиля в период ремиссии.
          </p>
          <p>
            Для начала работы, пожалуйста, войдите в систему.
          </p>
          <Link to="/login">
            <button style={{ marginTop: '15px' }}>Перейти к странице входа</button>
          </Link>
        </div>
      )}

      <hr style={{ margin: '30px 0' }}/>

      <div>
          <h3>О системе:</h3>
          <p>Система позволяет:</p>
          <ul>
              <li>Накапливать структурированную информацию о течении заболевания.</li>
              <li>Определять прогноз неблагоприятных событий.</li>
              <li>Разрабатывать индивидуальные стратегии реабилитации.</li>
              <li>Оценивать эффективность наблюдения и мероприятий.</li>
              <li>Формировать данные для научного анализа.</li>
          </ul>
      </div>

    </div>
  );
};

export default HomePage;
