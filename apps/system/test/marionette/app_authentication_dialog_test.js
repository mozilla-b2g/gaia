'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('App Authentication Dialog',
  function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

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
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('cancel button works', function() {
    var url = server.url('sample.html');
    server.protect(url);

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    var authDialog;
    client.waitFor(function() {
      authDialog = system.appAuthDialog;
      return authDialog.displayed() &&
        system.appAuthDialogCancel.displayed() &&
        system.appAuthDialogLogin.displayed();
    });

    system.appAuthDialogCancel.tap(25, 25);
    client.waitFor(function() {
      return !authDialog.displayed();
    });
  });

  test('login button works', function() {
    var url = server.url('sample.html');
    server.protect(url);

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    var authDialog;
    client.waitFor(function() {
      authDialog = system.appAuthDialog;
      return authDialog.displayed();
    });

    server.unprotect(url);
    system.appAuthDialogLogin.tap();
    client.waitFor(function() {
      return !authDialog.displayed();
    });
  });

  test('user can login', function() {
    var url = server.url('sample.html');
    server.protect(url);

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    var authDialog;
    client.waitFor(function() {
      authDialog = system.appAuthDialog;
      return authDialog.displayed();
    });

    system.appAuthDialogUsername.sendKeys('username');
    system.appAuthDialogPassword.sendKeys('password');

    system.appAuthDialogLogin.tap();
    client.waitFor(function() {
      return !authDialog.displayed();
    });
  });

});
