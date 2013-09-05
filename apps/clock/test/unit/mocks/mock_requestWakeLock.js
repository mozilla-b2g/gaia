(function(exports) {
  'use strict';

  function MockLock(type) {
    this.type = type;
    this.locked = true;
    this.unlocks = 0;
  }

  MockLock.prototype = {
    unlock: function() {
      this.locked = false;
      this.unlocks++;
    }
  };

  function MockRequestWakeLock() {
    this.issued = new Map();
  }

  MockRequestWakeLock.prototype = {

    requestWakeLock: function mock_requestWakeLock(type) {
      var lock = new MockLock(type);
      this.issued.set(lock, true);
      return lock;
    },

    getissued: function mock_getissued() {
      var ret = [];
      for (var el of this.issued) {
        ret.push(el[0]);
      }
      return ret;
    },

    reset: function() {
      this.issued.clear();
    }

  };

  exports.MockRequestWakeLock = MockRequestWakeLock;

})(this);
