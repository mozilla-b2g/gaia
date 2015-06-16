/*exported MockThreads, MockThread */

'use strict';

var MockThreads = {
  currentId: null,
  active: null,

  registerMessage: () => {},
  unregisterMessage: () => {},
  has: () => false,
  set: () => {},
  get: () => new MockThread(),
  delete: () => {},
  clear: () => {},
  keys: () => [],

  mTeardown: function mt_mTeardown() {
    this.active = null;
    this.currentId = null;
  }
};

MockThreads.Messages = {
  get: () => {}
};

function MockThread(thread) {
  Object.assign(this, thread);
}

MockThread.prototype.getDraft = () => null;
MockThread.create = () => {};
