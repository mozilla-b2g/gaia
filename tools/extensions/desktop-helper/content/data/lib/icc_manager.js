!function() {

  function debug(str) {
    //dump('mozIccManager: ' + str + '\n');
  }

  var iccs = {
    111: {
      _retryCount: 3,
      cardState: 'ready',
      iccInfo: {
        iccid: true,
        msisdn: '5555555555'
      },
      setCardLock: function() {
        debug('setCardLock');
      },
      getCardLock: FFOS_RUNTIME.domRequest({ enabled: false }),
      getCardLockRetryCount: function(type) {
        var request = {};
        setTimeout(function() {
          request.result = {
            retryCount: this._retryCount
          };
          request.onsuccess && request.onsuccess();
        }.bind(this));
        return request;
      },
      unlockCardLock: function() {
        // simulate invalid input
        if (this._retryCount > 1) {
          var request = {};
          setTimeout(function() {
            request.error = {
              retryCount: --this._retryCount,
              lockType: 'pin'
            };
            request.onerror && request.onerror();
          }.bind(this), 200);
          return request;
        }
        this.cardState = 'ready';
        return FFOS_RUNTIME.domRequest()();
      },
      addEventListener: function() {
        debug('addEventListener');
      },
      removeEventListener: function() {
        debug('removeEventListener');
      },
    },
    222: {
      _retryCount: 3,
      cardState: 'ready',
      iccInfo: {
        iccid: true
      },
      setCardLock: function() {
        debug('setCardLock');
      },
      getCardLock: FFOS_RUNTIME.domRequest({ enabled: false }),
      getCardLockRetryCount: function(type) {
        var request = {};
        setTimeout(function() {
          request.result = {
            retryCount: this._retryCount
          };
          request.onsuccess && request.onsuccess();
        }.bind(this));
        return request;
      },
      unlockCardLock: function() {
        this.cardState = 'ready';
        return FFOS_RUNTIME.domRequest()();
      },
      addEventListener: function() {
        debug('addEventListener');
      },
      removeEventListener: function() {
        debug('removeEventListener');
      },
    }
  };

  var iccManager = {
    addEventListener: function() {
      debug('addEventListener');
    },
    removeEventListener: function() {
      debug('removeEventListener');
    },
    getIccById: function(iccId) {
      return iccs[iccId];
    },
    iccIds: [111]
  };

  if (window._shimDualSim) {
    iccManager.iccId.push(222);
  }

  FFOS_RUNTIME.makeNavigatorShim('mozIccManager', iccManager, true);
}();
