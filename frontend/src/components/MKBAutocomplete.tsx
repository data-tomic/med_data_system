// frontend/src/components/MKBAutocomplete.tsx
import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import apiClient from '../services/api';

interface MKBCodeOption {
  code: string;
  name: string;
}

interface MKBAutocompleteProps {
  value: MKBCodeOption | null; // Выбранное значение (объект)
  onChange: (newValue: MKBCodeOption | null) => void; // Callback при изменении
  label?: string;
  error?: boolean;
  helperText?: string;
}

const MKBAutocomplete: React.FC<MKBAutocompleteProps> = ({
  value,
  onChange,
  label = "Диагноз МКБ",
  error,
  helperText
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly MKBCodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(''); // Текст, вводимый пользователем

  // Debounce для задержки запроса к API
  useEffect(() => {
    // Не делаем запрос, если нет ввода или открыт список с уже загруженными опциями
    if (inputValue === '' || (open && options.length > 0 && !loading)) {
        // Опционально: очищать опции при пустом вводе, если не хотим их кэшировать
        // setOptions([]);
        return undefined;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        console.log(`Searching MKB codes for: ${inputValue}`);
        const response = await apiClient.get<MKBCodeOption[]>(`/mkb-codes/?search=${encodeURIComponent(inputValue)}`);
        setOptions(response.data || []);
      } catch (err) {
        console.error("Error fetching MKB codes:", err);
        setOptions([]); // Очищаем опции при ошибке
      } finally {
        setLoading(false);
      }
    }, 500); // Задержка 500 мс

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, open, loading]); // Зависимости для debounce

  // Сбрасываем опции, когда выпадающий список закрывается
   useEffect(() => {
       if (!open) {
           setOptions([]);
       }
   }, [open]);

  return (
    <Autocomplete
      id="mkb-code-autocomplete"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, val) => option.code === val.code} // Как сравнивать опции
      getOptionLabel={(option) => `${option.code} - ${option.name}`} // Как отображать опцию в списке и поле
      options={options}
      loading={loading}
      loadingText="Загрузка..."
      noOptionsText="Ничего не найдено"
      value={value} // Текущее выбранное значение
      onChange={(event, newValue) => {
        setOptions(newValue ? [newValue, ...options] : options); // Hack to keep selected value in options list
        onChange(newValue); // Вызываем внешний callback
      }}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue); // Обновляем текст ввода
      }}
      // Для случая, когда нужно отобразить значение, которое еще не загружено в options
      // (например, при редактировании существующего пациента)
      renderOption={(props, option) => (
        <li {...props} key={option.code}>
          {option.code} - {option.name}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default MKBAutocomplete;
