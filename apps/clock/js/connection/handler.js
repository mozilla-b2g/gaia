define(function(require, exports) {
'use strict';

var handlers = {
  'create_alarm': require('./create_alarm')
};

exports.init = function() {
  navigator.mozSetMessageHandler('connection', req => {
    var port = req.port;
    var handler = handlers[req.keyword];

    if (!handler) {
      console.error(`can't find handler for connection "${req.keyword}"`);
      return;
    }

    port.onmessage = event => handler(event, port);
  });
};

});
