!function() {

  function debug(str) {
    //dump('mozIccManager: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozIccManager', {
    cardState: 'absent',
    setCardLock: function() {
      debug('setCardLock');
    },
    getCardLock: function() {
      debug('getCardLock');
    },
    unlockCardLock: function() {
      debug('unlockCardLock');
    },
    addEventListener: function() {
      debug('addEventListener');
    },
    removeEventListener: function() {
      debug('removeEventListener');
    }
  }, true);
}();
