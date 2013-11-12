!function() {

  function debug(str) {
    //dump('mozMobileConnection: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozMobileConnection', {
    voice: {
      connected: false
    },
    addEventListener: function() {
      debug('addEventListener');
    },
    removeEventListener: function() {
      debug('removeEventListener');
    }
  }, true);
}();
