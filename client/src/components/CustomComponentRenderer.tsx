import { lazy, Suspense } from 'react'

interface CustomComponentProps {
  componentName: string
  props: Record<string, any>
  onComplete: (data?: any) => void
  onFail: (reason?: string) => void
}

// Component registry
const COMPONENTS: Record<string, React.LazyExoticComponent<any>> = {
  // Example components will be added here
  // CountdownTimer: lazy(() => import('./custom/CountdownTimer')),
  // DrawingPad: lazy(() => import('./custom/DrawingPad')),
}

export function CustomComponentRenderer({
  componentName,
  props,
  onComplete,
  onFail
}: CustomComponentProps) {
  const Component = COMPONENTS[componentName]

  if (!Component) {
    console.error(`Custom component "${componentName}" not found in registry`)
    onFail(`Component "${componentName}" not found`)
    return (
      <div style={{ color: 'green', padding: '2rem', textAlign: 'center' }}>
        Error: Component "{componentName}" not found
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div style={{ color: 'green', padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    }>
      <Component
        {...props}
        onComplete={onComplete}
        onFail={onFail}
      />
    </Suspense>
  )
}
