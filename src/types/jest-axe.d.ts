declare module 'jest-axe' {
  export function configureAxe(options?: any): (context?: any, options?: any) => Promise<any>;
  export function axe(context?: any, options?: any): Promise<any>;
  export const toHaveNoViolations: (...args: any[]) => any;
}

declare global {
  namespace jest {
    interface JestMatchers<R> {
      toHaveNoViolations(): R;
    }
  }
}

export {};


