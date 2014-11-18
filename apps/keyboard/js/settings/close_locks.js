'use strict';

/**
 * CloseLockManager manages requests from multiple modules on whether we
 * should close ourselves *now* or wait for the "stayAwake" lock to unlock.
 * The "requestClose" request is a lock too because one might ask to close
 * the app but decide not to do that later.
 *
 * Examples:
 *
 * 1. If there is no stayAwake lock exist and one ask for a requestClose lock,
 *    the app will be closed immediately.
 * 2. If there is a stayAwake lock exist, app will close only until the existing
 *    stayAwake lock unlocks.
 * 2.1. Or, you could cancel the request by unlock your requestClose lock.
 *
 */
(function(exports) {

var CloseLock = function(manager, topic) {
  this._manager = manager;
  this._topic = topic;
};
CloseLock.prototype.unlock = function() {
  this._manager.releaseLock(this, this._topic);
};

var CloseLockManager = function CloseLockManager() {
  this._closeLocks = null;
  this._awakeLocks = null;
  this.waitForUnlock = false;
};

CloseLockManager.prototype.start = function() {
  this._closeLocks = new Set();
  this._awakeLocks = new Set();
  this.waitForUnlock = false;
};

CloseLockManager.prototype.stop = function() {
  this._closeLocks = null;
  this._awakeLocks = null;
  this.waitForUnlock = false;
};

CloseLockManager.prototype.requestLock = function(topic) {
  var lock = new CloseLock(this, topic);
  switch (topic) {
    case 'requestClose':
      this._closeLocks.add(lock);
      break;

    case 'stayAwake':
      this._awakeLocks.add(lock);
      break;

    default:
      throw 'CloseLockManager: Undefined topic ' + topic;
  }

  this._maybeCloseNow();

  return lock;
};

CloseLockManager.prototype.releaseLock = function(lock, topic) {
  if (!(lock instanceof CloseLock)) {
    throw 'CloseLockManager: releaseLock need a lock.';
  }

  var set;
  switch (topic) {
    case 'requestClose':
      set = this._closeLocks;
      break;

    case 'stayAwake':
      set = this._awakeLocks;
      break;

    default:
      throw 'CloseLockManager: Undefined topic ' + topic;
  }

  if (!set.has(lock)) {
    // Already released
    return;
  }

  set.delete(lock);

  this._maybeCloseNow();
};

CloseLockManager.prototype._maybeCloseNow = function() {
  // If there is no stayAwake lock present and there is a requestClose lock,
  // we should close now.
  if (this._awakeLocks.size === 0 && this._closeLocks.size !== 0) {
    window.close();
  }
};

exports.CloseLockManager = CloseLockManager;
exports.CloseLock = CloseLock;

})(window);
