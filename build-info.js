import pkg from './package.json' with { type: 'json' }

/** Values compiled into the app and shown in its footer. Shared by the Vite and Vitest configs. */
export const buildDefines = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
}
