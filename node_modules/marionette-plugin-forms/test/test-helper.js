var Marionette = require('marionette-client');
global.assert = require('assert');
global.createClient = function() {
  var profile = {
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  };

  var Driver = process.env.SYNC ?
    Marionette.Drivers.TcpSync : Marionette.Drivers.Tcp;
  return marionette.client(profile, Driver);
};
