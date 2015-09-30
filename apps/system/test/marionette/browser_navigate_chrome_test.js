'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var PinTheWeb = require('./lib/pinning_the_web');

marionette('Browser - Chrome on browser navigation',
  function() {

  var client = marionette.client({
    profile: {
      settings: {
        'dev.gaia.pinning_the_web': true
      }
    }
  });

  var home, rocketbar, search, server, system, pinTheWeb;

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
    pinTheWeb = new PinTheWeb(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('should show the progressbar', function() {
    var url = server.url('sample.html');
    server.cork(url);

    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);
    system.waitForBrowser(url);

    var progressBar = system.appChromeProgressBar;

    client.waitFor(function() {
      return progressBar.displayed();
    });

    server.uncork(url);
    client.helper.waitForElementToDisappear(progressBar);
  });

  test('should pin the chrome when navigating to a pinned site', function() {
    var url = server.url('sample.html');
    var url2 = server.url('darkpage.html');

    pinTheWeb.openAndPinSite(url);

    // Double tap, one for unpin and the second one
    // for opening the rocketbar
    client.switchToFrame();
    system.appUrlbar.tap();
    system.appUrlbar.tap();

    rocketbar.enterText(url2, true);
    system.waitForBrowser(url2);

    var classes = system.appChrome.getAttribute('class');

    assert(classes.indexOf('maximized') < 0);
    assert(classes.indexOf('collapsible') < 0);
  });
});
