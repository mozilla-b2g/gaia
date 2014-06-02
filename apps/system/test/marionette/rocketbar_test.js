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

  test('Rocketbar is expanded on homescreen', function() {
    // Check that Rocketbar is expanded
    var element = rocketbar.rocketbar;
    var screen = rocketbar.screen;
    client.waitFor(function() {
      var rocketbarClass = element.getAttribute('class');
      return rocketbarClass.indexOf('expanded') != -1;
    });
    // Check that Rocketbar is in the home state
    client.waitFor(function() {
      var screenClass = screen.getAttribute('class');
      return screenClass.indexOf('on-homescreen') != -1;
    });
  });

  test('Focus', function() {
    rocketbar.waitForLoad();
    var screen = rocketbar.screen;
    // Check that focussed Rocketbar is in the focused state
    rocketbar.focus();
    client.waitFor(function() {
      var screenClass = screen.getAttribute('class');
      return screenClass.indexOf('rocketbar-focused') != -1;
    });
  });

  // Skip test as it conflicts with master behaviour
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1009855
  test.skip('Navigate to URL', function() {
    rocketbar.waitForLoad();
    var element = rocketbar.rocketbar;
    var url = server.url('sample.html');
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006'); // Enter the URL with enter key
    rocketbar.switchToBrowserFrame(url);
    client.switchToFrame();
    client.waitFor(function() {
      var rocketbarClass = element.getAttribute('class');
      return rocketbarClass.indexOf('expanded') != -1;
    });
  });

  test('Cancel Rocketbar', function() {
    rocketbar.waitForLoad();

    // Check that cancel button appears
    rocketbar.focus();
    var cancel = rocketbar.cancel;
    client.waitFor(function() {
      return cancel.displayed();
    });

    // Check that clicking cancel returns to non-active state
    cancel.click();
    var title = rocketbar.title;
    client.waitFor(function() {
      return title.displayed();
    });
  });

  // Skip test since it fails to handle the geolocation permission dialog
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1018925
  test.skip('Cancel Rocketbar with backdrop', function() {
    rocketbar.waitForLoad();

    // Check that scrim appears
    rocketbar.focus();
    var backdrop = rocketbar.backdrop;
    client.waitFor(function() {
      return backdrop.displayed();
    });

    // Check that clicking scrim returns to non-active state
    backdrop.click();
    var title = rocketbar.title;
    client.waitFor(function() {
      return title.displayed();
    });
  });

});
