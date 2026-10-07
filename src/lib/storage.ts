/**
 * Asks the browser not to evict IndexedDB under storage pressure.
 * Safari may still clear data for sites that aren't installed to the home
 * screen, which is why JSON export/import exists as well.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
