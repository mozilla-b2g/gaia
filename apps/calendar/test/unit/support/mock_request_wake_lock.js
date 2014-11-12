define(function(require, exports) {
'use strict';

var requestWakeLock;

exports.setup = function() {
  requestWakeLock = navigator.requestWakeLock;
  navigator.requestWakeLock = fakeRequestWakeLock;
};

exports.teardown = function() {
  navigator.requestWakeLock = requestWakeLock;
  locks = exports.locks = [];
};

var locks = exports.locks = [];
function fakeRequestWakeLock(type) {
  var lock = createFakeLock(type);
  locks.push(lock);
  return lock;
}

function createFakeLock(type) {
  return {
    type: type,
    unlocked: false,
    unlock: function() {
      this.unlocked = true;
    }
  };
}

});
