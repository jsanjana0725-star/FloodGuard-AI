import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
//
// Same-origin proxy for official IMD district warnings. IMD's GeoServer does
// not send CORS headers, so a browser cannot read it directly from another
// origin. `warningsService.js` requests `/imd-warnings?...`; we forward that to
// IMD and strip the proxy prefix. In a static production build (no dev/preview
// server) this proxy does not exist, and the warnings service degrades
// gracefully to an explicit "unavailable" status — it never fabricates warnings.
const imdWarningsProxy = {
  '/imd-warnings': {
    target: 'https://reactjs.imd.gov.in/geoserver/imd/wfs',
    changeOrigin: true,
    secure: false,
    rewrite: (path) => path.replace(/^\/imd-warnings/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  server: { proxy: imdWarningsProxy },
  preview: { proxy: imdWarningsProxy },
})
