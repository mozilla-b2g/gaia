/* global __dirname */
'use strict';

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconAppState = require('./lib/icon_app_state');

marionette('Vertical Home - Packaged App Pending', function() {
  var client = marionette.client(Home2.clientOptions);

  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = new Home2(client);
    system = new System(client);
    appInstall = new AppInstall(client);

    system.waitForStartup();
    subject.waitForLaunch();
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

    var appIcon = subject.getIcon(server.packageManifestURL);
    // wait until the icon is spinning!
    client.waitFor(function() {
      return iconAppState(appIcon) === 'loading';
    });

    // let the rest of the app come through
    server.uncork(server.applicationZipUri);

    // wait until it is no longer loading
    client.waitFor(function() {
      return iconAppState(appIcon) !== 'loading';
    });
  });
});
