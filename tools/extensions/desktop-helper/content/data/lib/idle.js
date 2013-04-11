!function() {
  FFOS_RUNTIME.makeNavigatorShim('addIdleObserver', function(callback) {
    console.log('Adding idle observer');
  });

  FFOS_RUNTIME.makeNavigatorShim('removeIdleObserver', function(callback) {
    console.log('Removing idle observer');
  });
}();
