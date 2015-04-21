'use strict';
/* global __dirname */

var Rocketbar = require('../../../../system/test/marionette/lib/rocketbar');
var Server = require('../../../../../shared/test/integration/server');

marionette('Rocketbar', function() {
  var client = marionette.client(Rocketbar.clientOptions);
  var rocketbar, search, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/../fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test.skip('Focus', function() {
    rocketbar.waitForLoad();
    var screen = rocketbar.screen;
    // Check that focussed Rocketbar is in the focused state
    rocketbar.focus();
    client.waitFor(function() {
      var screenClass = screen.getAttribute('class');
      return screenClass.indexOf('rocketbar-focused') != -1;
    });
  });

  // Skip test as it conflicts with master behaviour.
  // We no longer have web results to display, and can't go to the browser
  // because that will no longer be opened with a MozActivity in 2.1.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1009855
  test.skip('show results on submit', function() {
    rocketbar.waitForLoad();
    rocketbar.focus();
    rocketbar.enterText('\uE006');
    client.waitFor(function() {
      return rocketbar.results.displayed();
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

  test.skip('Cancel Rocketbar', function() {
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
