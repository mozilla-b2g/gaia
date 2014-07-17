define(function(require) {
  'use strict';

  var View = require('view');

  function Errors() {
    View.apply(this, arguments);
    this.app.syncController.on('offline', this);
  }

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

  return Errors;
});
