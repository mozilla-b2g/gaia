!function() {

  function debug(str) {
    //dump('mozMobileConnection: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozMobileConnection', {
    iccInfo: {
      iccid: true
    },
    voice: {
      connected: false
    },
    cardState: 'absent',
    addEventListener: function() {
      debug('addEventListener');
    },
    removeEventListener: function() {
      debug('removeEventListener');
    }
  }, true);
}();
