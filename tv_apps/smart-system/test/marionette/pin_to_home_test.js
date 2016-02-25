'use strict';

var Server = require('../../../../shared/test/integration/server');

marionette('Test Pin to homescreen', function() {

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions, system, browserFrame, browser, server, home;

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
    actions = client.loader.getActions();
    system = client.loader.getAppClass('system');
    browser = client.loader.getAppClass('browser', 'browser', 'tv_apps');
    home = client.loader.getAppClass('smart-home', 'home', 'tv_apps');
    system.waitForStartup();
    system.waitForFullyLoaded();
    home.switchFrame();
    home.skipFte();
    client.switchToFrame();
    browserFrame = browser.launch();
  });

  test('pin to homescreen', { 'devices': ['tv'] }, function() {
    var url = server.url('sample.html');
    browser.switchFrame();
    browser.skipFte();
    browser.goToUrlAndPin(url);
    client.switchToFrame();
    system.waitForUrlLoaded(home.PATH);
    home.switchFrame();
    client.waitFor(function() {
      return home.existCardWithName('Sample page');
    });
  });


});
