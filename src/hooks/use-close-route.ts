import { useNavigate } from 'react-router'

/**
 * Closes a modal route (e.g. /spending/new). Goes back when the app pushed
 * it, so the previous scroll position is kept; otherwise replaces it with
 * `fallback`, so a direct link doesn't trap the user.
 */
export function useCloseRoute(fallback: string) {
  const navigate = useNavigate()
  return () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
