import path from 'node:path';
import {readJson,stateDir,publish} from './io.mjs';
const state=await readJson(path.join(stateDir,'state.json'),null);
if(!state?.report)throw new Error('No durable report; refusing to publish the bundled seed over current data.');
await publish(state);
