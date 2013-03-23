'use strict';

/*
  Mocking the Rest utility class, it's configurable to behave
  differently via the configure method
*/
var MockRest = (function MockRest() {

  var config = {
    // Values are success, error, timeout (the possible callbacks)
    'type': 'success'
    // Follow with a series of 'urls' and the values returned
  };

  var configure = function configure(conf) {
    config = conf;
  };

  var get = function get(url, callbacks, options) {
    if (!config[url]) {
      callbacks.error('No matching for url ' + url);
      return;
    }

    switch (config.type) {
      case 'success':
        callbacks.success(config[url]);
      break;
      case 'error':
        callbacks.error(config[url]);
      break;
      case 'timeout':
      default:
        callbacks.timeout(config[url]);
      break;
    }
  };

  return {
    'get': get,
    'configure': configure
  };

})();
