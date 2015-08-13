/*exported MockBroadcastChannel */

'use strict';

function MockBroadcastChannel(name) {
  this.name = name;
}

MockBroadcastChannel.prototype.addEventListener = () => {};
MockBroadcastChannel.prototype.removeEventListener = () => {};
MockBroadcastChannel.prototype.postMessage = () => {};
MockBroadcastChannel.prototype.close = () => {};
