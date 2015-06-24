define(function(require, exports, module) {
'use strict';

var View = require('view');
var core = require('core');

require('dom!errors');

function Errors() {
  View.apply(this, arguments);
  core.syncListener.on('syncOffline', this);
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
      case 'syncOffline':
        this.showErrors([{name: 'offline'}]);
        break;
    }
  }
};

});
