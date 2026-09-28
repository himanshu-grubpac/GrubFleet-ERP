/**
 * Central Auth Context
 *
 * All frontend modules should import auth primitives from THIS file only:
 *
 *   import { useAuth } from "@/lib/auth-context";
 *
 * This ensures a single source of truth. If the provider ever moves,
 * only this file needs updating.
 *
 * Available hooks:
 *   useAuth()         — main hook (alias of useGrubpacAuth)
 *   useGrubpacAuth()  — main hook
 *
 * Each returns:
 *   token            — JWT access token (string | null)
 *   user             — { id, email, name, fullName }
 *   organizationId   — active org UUID (string | null)
 *   isAuthenticated  — boolean
 *   isLoading        — boolean
 *   permissions      — Set<string> of permission keys
 *   moduleAccess     — Record<moduleId, accessLevel>
 *   login()          — (email, password) => Promise<{ success, token, user }>
 *   logout()         — () => Promise<void>
 *   refreshSession() — () => Promise<boolean>
 *   refetchMe()      — () => Promise<boolean>
 *
 * Providers (already mounted in root layout):
 *   GrubpacAuthProvider / AuthProvider — wrap entire app
 *   ProtectedRoute — redirects unauthenticated users to /login
 */

export {
    useAuth,
    useGrubpacAuth,
    GrubpacAuthProvider,
    AuthProvider,
    ProtectedRoute,
    type GrubpacAuthContextType,
} from "@/providers/auth-provider";
