var Marionette = require('marionette-client');

function Driver() {

  if(!(this instanceof Driver)) {
    return new Driver();
  }

  this.backend = new Marionette.Drivers.Tcp();
  this.client = null;
}

Driver.prototype = {

  start: function(onReady) {
    var self = this;
    this.backend.connect(function() {

      self.driver = new Marionette.Client(self.backend, {
        defaultCallback: function() {}
      });

      self.driver.startSession(function() {
        onReady(self.driver);
      });
    });
  },

  stop: function(onReady) {
    this.driver.deleteSession(onReady || function() {});
  }

};

module.exports = Driver;
