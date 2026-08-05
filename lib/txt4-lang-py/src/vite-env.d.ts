// This package expects to be consumed by a Vite-compatible bundler, which
// supplies `import.meta.env` at build time — declared locally instead of via
// `vite/client` so this package doesn't need vite itself as a dependency.
interface ImportMetaEnv {
  readonly VITE_PYODIDE_INDEX_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
