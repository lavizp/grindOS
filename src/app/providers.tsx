import type { ReactNode } from 'react'
import { UpdatePrompt } from '@/app/update-prompt'
import { Toaster } from '@/components/ui/sonner'
import { useThemeSync } from '@/hooks/use-theme'

export function Providers({ children }: { children: ReactNode }) {
  const theme = useThemeSync()

  return (
    <>
      {children}
      <UpdatePrompt />
      <Toaster
        theme={theme}
        position="top-center"
        offset={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      />
    </>
  )
}
