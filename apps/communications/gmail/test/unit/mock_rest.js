'use strict';

/*
  Mocking the Rest utility class, it's configurable to behave
  differently via the configure method
*/
var MockRest = (function MockRest() {

  var config = {
    // Values are success, error, timeout (the possible callbacks)
    'type': 'success',
    // Whatever you want to return on the 'type' callback
    'value': {}
  };

  var configure = function configure(conf) {
    if (conf.type) {
      config.type = conf.type;
    }

    if (conf.value) {
      config.value = conf.value;
    }
  };

  var get = function get(url, callbacks, options) {
    switch (config.type) {
      case 'success':
        callbacks.success(config.value);
      break;
      case 'error':
        callbacks.error(config.value);
      break;
      case 'timeout':
      default:
        callbacks.timeout(config.value);
      break;
    }
  };

  return {
    'get': get,
    'configure': configure
  };

})();
