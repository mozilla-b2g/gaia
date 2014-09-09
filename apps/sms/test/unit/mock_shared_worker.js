/*exported MockSharedWorker */

'use strict';

function MockSharedWorker() {}

MockSharedWorker.prototype.addEventListener = () => {};
MockSharedWorker.prototype.removeEventListener = () => {};
MockSharedWorker.prototype.port = {
  addEventListener: () => {},
  removeEventListener: () => {},
  start: () => {},
  postMessage: () => {},
  close: () => {}
};
