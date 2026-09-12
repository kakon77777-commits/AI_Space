declare namespace React {
  type Key = string | number
  type ReactNode = unknown
  interface Attributes { key?: Key | null }
  interface FormEvent<T = Element> {
    preventDefault(): void
    readonly currentTarget: T
  }
  interface ChangeEvent<T = Element> {
    readonly target: T
    readonly currentTarget: T
  }
}

declare namespace JSX {
  interface IntrinsicAttributes extends React.Attributes {}
  interface IntrinsicElements {
    [elementName: string]: any
  }
}

declare module 'react' {
  export const StrictMode: any
  export function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T
  export function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void]
}

declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment): {
    render(node: unknown): void
  }
}

declare module 'react/jsx-runtime' {
  export const Fragment: any
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
}
