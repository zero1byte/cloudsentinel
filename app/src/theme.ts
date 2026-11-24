export const themes = ['midnight', 'light', 'forest', 'violet'] as const

export type Theme = (typeof themes)[number]

export const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: 'midnight', label: 'Midnight' },
  { value: 'light', label: 'Light' },
  { value: 'forest', label: 'Forest' },
  { value: 'violet', label: 'Violet' },
]

export function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme === value)
}

export function readTheme(): Theme {
  const savedTheme = window.localStorage.getItem('cloudsentinel-theme')
  return isTheme(savedTheme) ? savedTheme : 'midnight'
}
