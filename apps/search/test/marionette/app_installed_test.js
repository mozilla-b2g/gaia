'use strict';
/* global __dirname */

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var Home2 = require('../../../verticalhome/test/marionette/lib/home2');
var Rocketbar =
  require('../../../system/test/marionette/lib/rocketbar.js');
var createAppServer =
  require('../../../verticalhome/test/marionette/server/parent');

var CALENDAR_MANIFEST = 'app://calendar.gaiamobile.org/manifest.webapp';

marionette('Search - Installed Apps Test', function() {
  var client = marionette.client(Home2.clientOptions);
  var appInstall, home, rocketbar, search, server, system;

  setup(function(done) {
    appInstall = new AppInstall(client);
    home = new Home2(client);
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system.waitForStartup();

    var app = __dirname + '/fixtures/installed_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  test('app result after install/uninstall', function() {
    home.waitForLaunch();
    home.focusRocketBar();
    search.removeGeolocationPermission();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText('Calendar');
    search.goToResults();

    // Should only have the 'stock' calendar app.
    client.waitFor(function() {
      var calendar = search.getResult(CALENDAR_MANIFEST);
      var calendar2 = search.getResult(server.packageManifestURL);
      return calendar.length && !calendar2.length;
    });

    // Exit rocketbar and install the app.
    client.switchToFrame();
    system.tapHome();
    appInstall.installPackage(server.packageManifestURL);

    // Search again for the same term.
    client.switchToFrame(system.getHomescreenIframe());
    home.focusRocketBar();
    rocketbar.enterText('Calendar');
    search.goToResults();

    // Should now contain the newly installed app as well.
    client.waitFor(function() {
      var calendar = search.getResult(CALENDAR_MANIFEST);
      var calendar2 = search.getResult(server.packageManifestURL);
      return calendar.length && calendar2.length;
    });

    // Remove the installed app.
    client.switchToFrame();
    system.tapHome();
    appInstall.uninstall(server.packageManifestURL);
    home.confirmDialog('remove');

    // Should now contain only a single app.
    client.switchToFrame(system.getHomescreenIframe());
    home.focusRocketBar();
    rocketbar.enterText('Calendar');
    search.goToResults();
    client.waitFor(function() {
      var calendar = search.getResult(CALENDAR_MANIFEST);
      var calendar2 = search.getResult(server.packageManifestURL);
      return calendar.length && !calendar2.length;
    });
  });

});
