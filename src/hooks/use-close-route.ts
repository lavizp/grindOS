import { useLocation, useNavigate } from 'react-router'

/**
 * Closes a modal route (e.g. /spending/new). Goes back when the app
 * navigated here, so the previous page and its scroll position return (even
 * if that was another page, like History); otherwise replaces it with
 * `fallback`, so a direct link doesn't trap the user.
 */
export function useCloseRoute(fallback: string) {
  const navigate = useNavigate()
  // The first location of a session has the key "default"; anything pushed after it doesn't.
  const { key } = useLocation()
  return () => {
    if (key !== 'default') navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
