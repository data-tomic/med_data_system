// frontend/src/pages/PatientListPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

// Предполагаем, что ваш компонент списка находится здесь:
// Если он написан на JS, импорт будет без .tsx
// import PatientList from '../components/PatientList'; // или '../components/PatientList.tsx'
// ЗАМЕНИТЕ НА ПРАВИЛЬНЫЙ ПУТЬ И РАСШИРЕНИЕ:
import PatientList from '../components/PatientList.js'; // Пример, если компонент на JS

// Используем стили или UI-компоненты для кнопки, если нужно
// import Button from '@mui/material/Button'; // Пример для Material UI

const PatientListPage: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}> {/* Добавляем немного отступов */}
      <h1>Список Пациентов</h1>

      {/* Ссылка-кнопка для перехода на страницу создания */}
      <Link to="/patients/new" style={{ textDecoration: 'none' }}>
        {/* Можно использовать обычную кнопку или компонент из UI-библиотеки */}
        <button style={{ marginBottom: '20px', padding: '10px 15px', cursor: 'pointer' }}>
          Добавить нового пациента
        </button>
        {/* Пример с MUI: */}
        {/* <Button variant="contained" color="primary" style={{ marginBottom: '20px' }}>
          Добавить нового пациента
        </Button> */}
      </Link>

      <hr style={{ marginBottom: '20px' }} />

      {/* Вставляем компонент, который загружает и отображает список */}
      <PatientList />

    </div>
  );
};

export default PatientListPage;
