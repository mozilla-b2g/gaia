!function() {
  FFOS_RUNTIME.makeNavigatorShim('mozSetMessageHandler', function(name, callback) {
    console.log('navigator.mozSetMessageHandler');
  }, true);
}();
