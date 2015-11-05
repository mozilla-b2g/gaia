/*exported MockThreads, MockThread */

'use strict';

var MockThreads = {
  registerMessage: () => {},
  unregisterMessage: () => {},
  has: () => false,
  set: () => {},
  get: () => new MockThread(),
  delete: () => {},
  clear: () => {},
  keys: () => []
};

MockThreads.Messages = {
  get: () => {}
};

function MockThread(thread) {
  Object.assign(this, { messages: new Map() }, thread);
}

MockThread.prototype.getDraft = () => null;
MockThread.create = () => {};
