// vitest 5 changed `Assertion` to take two type parameters (<R, T>), which no
// longer merges with @testing-library/jest-dom's own `Assertion<T = any>`
// augmentation (types/vitest.d.ts). Re-declare it with vitest 5's signature.
// Remove once jest-dom ships vitest 5 compatible types.
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface Assertion<R = any, T = any> extends TestingLibraryMatchers<any, T> {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
}
