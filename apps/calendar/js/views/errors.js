define(function(require, exports, module) {
'use strict';

var View = require('view');

require('dom!errors');

function Errors() {
  View.apply(this, arguments);
  this.app.syncController.on('offline', this);
}
module.exports = Errors;

Errors.prototype = {
  __proto__: View.prototype,

  selectors: {
    status: '*[role="application"] > section[role="status"]',
    errors: '*[role="application"] > section > .errors'
  },

  handleEvent: function(event) {
    switch (event.type) {
      case 'offline':
        this.showErrors([{name: 'offline'}]);
        break;
    }
  }
};

});
