!function() {
  FFOS_RUNTIME.makeNavigatorShim('mozPower', {
    cpuSleepAllowed: false,
    screenBrightness: 1,
    screenEnabled: true,
    addWakeLockListener: function(callback) {
      console.log('power addWakeLockListener');
    }
  });
}();
