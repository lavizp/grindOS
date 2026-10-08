export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Hands a file to the person. On iOS (and anywhere that can share files)
 * this opens the share sheet, so it can go to Files, AirDrop or a message;
 * elsewhere it downloads.
 */
export async function saveFile(file: File): Promise<SaveOutcome> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      return 'shared'
    } catch (error) {
      // Closing the share sheet isn't a failure, and shouldn't count as a backup.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Sharing can be refused (e.g. no user gesture left); a download still works.
    }
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
