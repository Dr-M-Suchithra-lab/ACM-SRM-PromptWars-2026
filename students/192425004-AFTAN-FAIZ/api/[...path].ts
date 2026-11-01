// Export the existing Express request handler; Vercel owns the Node.js lifecycle.
// No listener, background worker, or local persistence is started by this entrypoint.
import { createApp } from '../server/app.js';
export default createApp();
