/* exported console */
'use strict';

(function Console(exports) {
  
  function getString(a) {
    var out = '';
    for (var c = 0; c < a.length; c++) {
      out += a[c];
    }

    return out;
  }

  exports.console = {
    'error': function() {
      self.postMessage({
        type: 'error',
        data: getString(arguments)
      });
    },
    'log': function() {
      self.postMessage({
        type: 'trace',
        data: getString(arguments)
      });
    }
  };
})(self);
