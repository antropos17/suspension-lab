import {parentPort} from 'node:worker_threads';
import {createPhysicsHost} from '../../src/physics-host.js';
const handle=createPhysicsHost(message=>parentPort.postMessage(message));
parentPort.on('message',handle);
