import { useCallback, useState } from 'react'

/** Per-device convenience state (e.g. last used author). Safe when storage is unavailable. */
export function useLocalStorage(key: string, initial: string): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return window.localStorage.getItem(key) ?? initial
    } catch {
      return initial
    }
  })

  const update = useCallback(
    (next: string) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, next)
      } catch {
        // Storage may be blocked (private mode); the in-memory value still works.
      }
    },
    [key],
  )

  return [value, update]
}
