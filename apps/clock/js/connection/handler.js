define(function(require, exports) {
'use strict';

var handlers = {
  'gaia_alarm': require('./alarm'),
  'gaia_timer': require('./timer')
};

exports.init = function() {
  navigator.mozSetMessageHandler('connection', req => {
    var port = req.port;
    var handler = handlers[req.keyword];

    if (!handler) {
      console.error(`can't find handler for connection "${req.keyword}"`);
      return;
    }

    // IACMessagePort don't support onstart & onclose events as of 2015-07-21
    // but for timer we do need to emulate this behavior
    if (handler.onstart) {
      handler.onstart(req);
    }

    if (handler.onmessage || handler.onclose) {
      port.onmessage = event => {
        if (event.data.type === 'close' && handler.onclose) {
          handler.onclose(req);
          return;
        }
        handler.onmessage && handler.onmessage(event, port);
      };
    }
  });
};

});
