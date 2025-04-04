// frontend/src/types/data.ts

// Интерфейс для объекта диагноза МКБ, который может возвращать API
export interface DiagnosisMKB {
  code: string; // Код МКБ (например, "C71.0")
  name: string; // Название диагноза
  // Добавьте другие поля, если ваш API их возвращает для диагноза
}

// Интерфейс для данных пациента, получаемых из API
export interface PatientDetails {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string | null; // Отчество может отсутствовать
  date_of_birth: string; // Дата в формате 'YYYY-MM-DD'
  clinic_id?: string | null; // ID в клинике, если есть
  primary_diagnosis_mkb: DiagnosisMKB | string | null; // Может быть объектом, строкой (кодом) или null
  primary_diagnosis_mkb_name?: string | null; // Имя диагноза (если бэкенд передает отдельно)
  created_at?: string; // ISO строка даты-времени
  updated_at?: string; // ISO строка даты-времени
  // Добавьте другие поля, если ваш PatientSerializer их возвращает
}

// Интерфейс для кода параметра (из справочника)
export interface ParameterCode {
  code: string; // Уникальный код ('HB', 'WEIGHT')
  name: string; // Отображаемое имя ('Гемоглобин', 'Вес')
  unit?: string | null; // Единица измерения ('г/л', 'кг')
  description?: string | null; // Описание параметра
}

// --- ДОБАВЛЕН ИНТЕРФЕЙС ДЛЯ ЭПИЗОДА ГОСПИТАЛИЗАЦИИ ---
export interface HospitalizationEpisode {
  id: number;
  patient: number; // ID пациента
  patient_display?: string; // ФИО пациента (если сериализатор возвращает)
  start_date: string; // Дата начала в формате 'YYYY-MM-DD'
  end_date?: string | null; // Дата окончания 'YYYY-MM-DD' или null
  created_at?: string; // ISO строка даты-времени
  // Добавьте другие поля, если ваш HospitalizationEpisodeSerializer их возвращает
}
// ----------------------------------------------------

// Интерфейс для данных одного наблюдения (из API /api/observations/ или /api/patients/.../dynamics/)
export interface ObservationData {
  id: number; // Уникальный ID наблюдения
  patient: number; // ID пациента
  parameter: string; // Код параметра ('HB')
  parameter_display?: string; // Имя параметра (если сериализатор возвращает)
  value: string; // Исходное строковое значение
  value_numeric?: number | null; // Числовое значение (если применимо)
  timestamp: string; // ISO строка даты-времени
  episode?: number | null; // ID связанного эпизода
  episode_display?: string | null; // Отображение эпизода (если сериализатор возвращает)
  recorded_by?: number | null; // ID пользователя, добавившего запись
  recorded_by_display?: string | null; // Имя пользователя
}

// Интерфейс для данных, подготовленных для графика Recharts
export interface ChartDataPoint {
  timestamp: number; // Временная метка в миллисекундах (Unix timestamp) для оси X
  // Динамические ключи - это коды параметров ('HB', 'WEIGHT', etc.)
  // Значения должны быть числами для построения графика или undefined/null для пропуска точки (connectNulls)
  [parameterCode: string]: number | undefined | null;
}

// Интерфейс для данных медицинского теста (из API /api/medical-tests/ или /api/patients/.../tests/)
export interface MedicalTestData {
  id: number;
  patient: number; // ID пациента
  patient_display?: string;
  test_name: string;
  test_date: string; // 'YYYY-MM-DD'
  score?: number | null;
  result_text?: string | null;
  uploaded_file?: string; // Может содержать путь к файлу на сервере (если API возвращает)
  file_url?: string | null; // Абсолютный URL для скачивания файла
  file_name?: string | null; // Имя файла
  uploaded_by?: string | null; // Может быть ID или username пользователя
  uploaded_by_display?: string | null; // Имя пользователя (если API возвращает)
  created_at?: string; // ISO строка даты-времени
}

// Вы можете добавить другие общие типы здесь, если они понадобятся
// Например, для данных пользователя после логина:
// export interface UserProfile {
//   id: number;
//   username: string;
//   email?: string;
//   first_name?: string;
//   last_name?: string;
//   // другие поля...
// }
