import { createPhysicsHost } from './physics-host.js';
const handle=createPhysicsHost(message=>self.postMessage(message));
self.onmessage=event=>handle(event.data);
