// frontend/src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>404</h1>
      <h2>Страница не найдена</h2>
      <p>Извините, запрошенная вами страница не существует.</p>
      <Link to="/">
        <button>Вернуться на главную</button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
