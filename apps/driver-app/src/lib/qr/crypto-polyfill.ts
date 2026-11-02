import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// Polyfill for React Native: Provide synchronous and asynchronous SHA-512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
ed.etc.sha512Async = async (...m) => sha512(ed.etc.concatBytes(...m));

export default ed;