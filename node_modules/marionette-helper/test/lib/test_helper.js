var Marionette = require('marionette-client');


global.assert = require('assert');
global.fs = require('fs');
global.path = require('path');
global.sinon = require('sinon');


/**
 * wrapper for marionette.client but with async/sync switching.
 *
 * @return {Marionette.Client} client instance.
 */
global.createClient = function() {
  // profile
  var profile = {
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  };

  var Driver = (process.env.SYNC) ?
      Marionette.Drivers.TcpSync : Marionette.Drivers.Tcp;
  return marionette.client(profile, Driver);
};
