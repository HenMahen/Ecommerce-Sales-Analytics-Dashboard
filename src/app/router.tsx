import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_ROUTE, matchRoute, type AppRoute } from './routes'

/**
 * Dependency-free internal router (blueprint decision B4): History API + state.
 * Four static routes do not justify shipping a routing library.
 */
interface RouterContextValue {
  route: AppRoute
  pathname: string
  navigate: (path: string) => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(currentPath)

  useEffect(() => {
    const onPopState = () => setPathname(currentPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((path: string) => {
    if (path === currentPath()) return
    window.history.pushState(null, '', path)
    setPathname(path)
    window.scrollTo({ top: 0 })
  }, [])

  const value = useMemo<RouterContextValue>(() => {
    const route = matchRoute(pathname) ?? DEFAULT_ROUTE
    return { route, pathname, navigate }
  }, [pathname, navigate])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterContextValue {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRouter harus dipakai di dalam <RouterProvider>.')
  return value
}
