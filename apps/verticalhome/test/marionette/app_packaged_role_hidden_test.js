/* global __dirname */
'use strict';

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconAppState = require('./lib/icon_app_state');

marionette('Vertical Home - Packaged App Pending', function() {
  var client = marionette.client(require(__dirname + '/client_options.js'));

  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/role_homescreen';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    system.waitForFullyLoaded();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('app is displayed until determined role=homescreen', function() {
    // go to the system app
    client.switchToFrame();

    // don't let the server send the zip archive
    server.cork(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var appIcon = subject.getIcon(server.packageManifestURL);
    // wait until the icon is spinning!
    client.waitFor(function() {
      return iconAppState(appIcon) === 'loading';
    });

    // let the rest of the app come through
    server.uncork(server.applicationZipUri);

    // wait until the icon is hidden
    client.helper.waitForElementToDisappear(appIcon);
  });
});
