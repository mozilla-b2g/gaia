Calendar.ns('Views').Errors = (function() {

  function Errors() {
    Calendar.View.apply(this, arguments);
    this.app.syncController.on('offline', this);
  }

  Errors.prototype = {
    __proto__: Calendar.View.prototype,

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
}());
