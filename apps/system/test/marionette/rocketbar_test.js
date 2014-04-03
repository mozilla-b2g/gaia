'use strict';
/* global __dirname */

var System = require('../../../system/test/marionette/lib/system');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar');
var Server = require('../../../../shared/test/integration/server');

marionette('Rocketbar', function() {
  var client = marionette.client(Rocketbar.clientOptions);
  var rocketbar, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
    system = new System(client);
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    rocketbar = new Rocketbar(client);
    system.waitForStartup();
  });

  test('Focus', function() {
    rocketbar.focus();
  });

  test('Navigate to URL', function() {
    var url = server.url('sample.html');
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006'); // Enter the URL with enter key
    rocketbar.switchToBrowserFrame(url);
  });
});
