import { useState, useCallback } from "react"

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

export const useAsync = <T,>(asyncFunction: () => Promise<T>, immediate = true) => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
  })

  const execute = useCallback(async () => {
    setState({ data: null, isLoading: true, error: null })
    try {
      const response = await asyncFunction()
      setState({ data: response, isLoading: false, error: null })
      return response
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      })
      throw error
    }
  }, [asyncFunction])

  // Run immediately if requested
  if (immediate) {
    execute()
  }

  return { ...state, execute }
}

export const useAsyncCallback = <T, Args extends any[]>(
  asyncFunction: (...args: Args) => Promise<T>
) => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: Args) => {
      setState({ data: null, isLoading: true, error: null })
      try {
        const response = await asyncFunction(...args)
        setState({ data: response, isLoading: false, error: null })
        return response
      } catch (error) {
        setState({
          data: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        })
        throw error
      }
    },
    [asyncFunction]
  )

  return { ...state, execute }
}
