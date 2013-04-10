!function() {

  FFOS_RUNTIME.makeNavigatorShim('mozMobileConnection', {
    iccInfo: {
      iccid: true
    },
    voice: {
      connected: false
    },
    cardState: 'absent',
    addEventListener: function() {
      console.log('mozMobileConnection.addEventListener');
    },
    removeEventListener: function() {
      console.log('mozMobileConnection.removeEventListener');
    }
  }, true);
}();
