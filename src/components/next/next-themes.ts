import { useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('dark');
  return { theme, setTheme };
}
