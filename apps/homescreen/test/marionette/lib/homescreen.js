var Homescreen = function h_ctor(client) {
  this.client = client;
};

Homescreen.URL = 'app://homescreen.gaiamobile.org';

Homescreen.prototype = {
  launch: function() {
    this.client.apps.launch(Homescreen.URL);
    this.client.apps.switchToApp(Homescreen.URL);
  },

  close: function() {
    this.client.apps.close(Homescreen.URL);
  },

  backToApp: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(Homescreen.URL);
  }
};

module.exports = Homescreen;

