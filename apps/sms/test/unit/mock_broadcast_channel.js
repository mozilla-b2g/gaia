/*exported MockBroadcastChannel */

'use strict';

function MockBroadcastChannel() {}

MockBroadcastChannel.prototype.addEventListener = () => {};
MockBroadcastChannel.prototype.removeEventListener = () => {};
MockBroadcastChannel.prototype.postMessage = () => {};
MockBroadcastChannel.prototype.close = () => {};
