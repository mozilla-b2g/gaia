!function() {
  FFOS_RUNTIME.makeNavigatorShim('addIdleObserver', function addIdleObserver(callback) {
    console.log('Adding idle observer');
  });

  FFOS_RUNTIME.makeNavigatorShim('removeIdleObserver', function removeIdleObserver(callback) {
    console.log('Removing idle observer');
  });
}();
