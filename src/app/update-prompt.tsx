import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an open app checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000
const UPDATE_TOAST_ID = 'app-update'

/**
 * Registers the service worker. A new version waits until the person taps
 * Reload, so nothing reloads in the middle of logging something.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // An installed app can stay open for days; look for updates now and then.
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast('A new version of grindOS is ready', {
      id: UPDATE_TOAST_ID,
      duration: Infinity,
      action: { label: 'Reload', onClick: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, updateServiceWorker])

  useEffect(() => {
    if (!offlineReady) return
    toast.success('grindOS now works offline')
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady])

  return null
}
