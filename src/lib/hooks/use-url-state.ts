"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo, useRef } from "react"

/**
 * Configuration for URL state serialization
 */
interface UrlStateConfig<T extends object> {
  /** Default values when params are missing */
  defaultValues: T
  /** Serialize state value to URL string (optional, uses JSON.stringify by default) */
  serialize?: (key: keyof T, value: T[keyof T]) => string | undefined
  /** Deserialize URL string to state value (optional, handles common cases) */
  deserialize?: (key: keyof T, value: string | null, defaultValue: T[keyof T]) => T[keyof T]
}

/**
 * Default serializer - converts value to URL-safe string
 */
function defaultSerialize<T extends object>(key: keyof T, value: T[keyof T]): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  if (typeof value === "number") {
    return String(value)
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (typeof value === "string") {
    return value || undefined
  }
  // For objects/arrays, use JSON
  return JSON.stringify(value)
}

/**
 * Default deserializer - converts URL string back to typed value
 */
function defaultDeserialize<T extends object>(
  key: keyof T,
  value: string | null,
  defaultValue: T[keyof T]
): T[keyof T] {
  if (value === null || value === undefined) {
    return defaultValue
  }

  // Infer type from default value
  const defaultType = typeof defaultValue

  if (defaultType === "number") {
    const num = Number(value)
    return (isNaN(num) ? defaultValue : num) as T[keyof T]
  }

  if (defaultType === "boolean") {
    return (value === "true") as T[keyof T]
  }

  if (defaultType === "string") {
    return value as T[keyof T]
  }

  // Try JSON parse for objects/arrays
  try {
    return JSON.parse(value) as T[keyof T]
  } catch {
    return defaultValue
  }
}

/**
 * Hook for syncing state with URL search params
 *
 * Features:
 * - Bidirectional sync between state and URL
 * - Type-safe with generics
 * - Handles serialization/deserialization
 * - Immediate updates without blocking (no startTransition)
 * - Preserves other URL params not managed by this hook
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useUrlState({
 *   defaultValues: {
 *     page: 1,
 *     pageSize: 10,
 *     search: "",
 *     category: 0,
 *   }
 * })
 *
 * // URL: ?page=2&search=test
 * // filters = { page: 2, pageSize: 10, search: "test", category: 0 }
 *
 * setFilters({ ...filters, page: 3 })
 * // URL becomes: ?page=3&search=test
 * ```
 */
export function useUrlState<T extends object>(
  config: UrlStateConfig<T>
): [T, (newState: T | ((prev: T) => T)) => void] {
  const { defaultValues, serialize = defaultSerialize, deserialize = defaultDeserialize } = config

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse current URL params into state
  const state = useMemo(() => {
    const result = {} as T

    for (const key of Object.keys(defaultValues) as (keyof T)[]) {
      const urlValue = searchParams.get(String(key))
      result[key] = deserialize(key, urlValue, defaultValues[key])
    }

    return result
  }, [searchParams, defaultValues, deserialize])

  // Use ref to access current state in callback without adding it to dependencies
  // This prevents setState from changing reference on every state change.
  // Sync the ref during render (not in an effect) so that setState always reads
  // the latest state, even when called from other effects in the same cycle.
  const stateRef = useRef(state)
  stateRef.current = state

  // Update URL with new state - NO startTransition for immediate updates
  const setState = useCallback(
    (newStateOrUpdater: T | ((prev: T) => T)) => {
      const currentState = stateRef.current
      const newState =
        typeof newStateOrUpdater === "function"
          ? (newStateOrUpdater as (prev: T) => T)(currentState)
          : newStateOrUpdater

      const params = new URLSearchParams()

      // Copy existing params not managed by this hook
      searchParams.forEach((value, key) => {
        if (!(key in defaultValues)) {
          params.set(key, value)
        }
      })

      // Set new state params
      for (const key of Object.keys(defaultValues) as (keyof T)[]) {
        const value = newState[key]
        const serialized = serialize(key, value)

        // Only add to URL if different from default and has a value
        if (serialized !== undefined && value !== defaultValues[key]) {
          params.set(String(key), serialized)
        }
      }

      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname

      // Use replace for immediate update without adding to history for every keystroke
      // This also prevents the "back button" from going through every filter change
      router.replace(newUrl, { scroll: false })
    },
    [searchParams, defaultValues, serialize, pathname, router]
  )

  return [state, setState]
}

/**
 * Create a URL state hook with preset configuration
 * Useful for creating typed hooks for specific use cases
 *
 * @example
 * ```tsx
 * // In hooks/use-uom-filters.ts
 * export const useUOMFilters = createUrlStateHook({
 *   defaultValues: {
 *     page: 1,
 *     pageSize: 10,
 *     search: "",
 *     category: UOMCategory.UOM_CATEGORY_UNSPECIFIED,
 *     activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
 *   }
 * })
 *
 * // In page component
 * const [filters, setFilters] = useUOMFilters()
 * ```
 */
export function createUrlStateHook<T extends object>(
  config: UrlStateConfig<T>
) {
  return function useConfiguredUrlState() {
    return useUrlState(config)
  }
}
