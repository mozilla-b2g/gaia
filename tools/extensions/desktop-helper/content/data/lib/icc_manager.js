!function() {

  function debug(str) {
    //dump('mozIccManager: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozIccManager', {
    iccInfo: {
      iccid: true
    },
    cardState: 'ready',
    setCardLock: function() {
      debug('setCardLock');
    },
    getCardLock: FFOS_RUNTIME.domRequest({ enabled: false }),
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
