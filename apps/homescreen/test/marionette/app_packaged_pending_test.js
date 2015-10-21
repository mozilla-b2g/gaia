/* global __dirname */
'use strict';

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Packaged App Pending', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var home, system, appInstall;
  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('app loading spinner', function() {
    // go to the system app
    client.switchToFrame();

    // don't let the server send the zip archive
    server.cork(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(server.packageManifestURL);
    // wait until the icon is spinning!
    client.waitFor(function() {
      return home.iconIsLoading(icon);
    });

    // let the rest of the app come through
    server.uncork(server.applicationZipUri);

    // wait until it is no longer loading
    client.waitFor(function() {
      return !home.iconIsLoading(icon);
    });
  });
});
