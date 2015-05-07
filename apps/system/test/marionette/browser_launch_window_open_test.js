'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Launch the same origin after navigating away',
  function() {

  var client = marionette.client();
  client.scope({ searchTimeout: 20000 });
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

  test('opens a new sheet with window.open()', function() {
    var url = server.url('windowopen.html');

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    // Switch to the app, and navigate to a different url.
    var frame = client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');
    client.switchToFrame(frame);

    client.switchToFrame();
    var browsers = client.findElements( 'iframe[data-url*="http://localhost"]');
    assert.equal(browsers.length, 1);

    client.switchToFrame(frame);
    client.findElement('#trigger1').click();

    // Validate that a new sheet opens.
    client.switchToFrame();

    client.waitFor(function() {
      browsers = client.findElements('iframe[data-url*="http://localhost"]');
      return browsers.length === 2;
    });
  });

  test('checks for web compat issues', function() {
    var url = server.url('windowopen.html');
    // rest condition, the alert might be show up quciker than new page
    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    // Switch to the app, and navigate to a different url.
    system.gotoBrowser(url);
    client.helper.waitForElement('#trigger2').tap();
    client.switchToFrame();

    client.waitFor(function() {
      return client.findElement(
        '.appWindow .modal-dialog-alert-message')
        .text()
        .indexOf('caller received') !== -1;
    });
  });
});
