'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Chrome on browser navigation',
  function() {

  var client = marionette.client();

  var home, rocketbar, search, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('should show the progressbar', function() {
    var url = server.url('sample.html');
    server.cork(url);

    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    client.waitFor(function() {
      return system.appChrome.displayed();
    });

    var progressBar = system.appChromeProgressBar;
    assert.ok(progressBar.displayed());
    server.uncork(url);
    client.helper.waitForElementToDisappear(progressBar);
  });
});
