!function() {

  function debug(str) {
    //dump('mozTelephony: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozTelephony', {
    calls: [],
    addEventListener: function() {
      debug('addEventListener');
    },
    removeEventListener: function() {
      debug('removeEventListener');
    }
  }, true);
}();
