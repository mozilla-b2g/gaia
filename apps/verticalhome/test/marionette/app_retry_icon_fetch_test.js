/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconSrc = require('./lib/icon_src');
var iconAppState = require('./lib/icon_app_state');
var launchIcon = require('./lib/launch_icon');

marionette('Vertical Home - Hosted app failed icon fetch', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
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
    subject = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  function expectAppState(icon, state) {
    client.waitFor(function() {
      var currentState = iconAppState(icon);
      return currentState === state;
    });
  }

  test('shows icon after a restart', function() {
    // go to the system app
    client.switchToFrame();

    // don't let the server send the zip archive
    server.cork(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var appIcon = subject.getIcon(server.packageManifestURL);
    expectAppState(appIcon, 'loading');

    // this helps marionette finding the icon: Bug 1046706
    subject.moveIconToIndex(appIcon, 0);

    // stop the download
    launchIcon(appIcon);
    subject.confirmDialog('pause');
    expectAppState(appIcon, 'paused');

    // Restart the download
    server.uncork(server.applicationZipUri);

    // resume the download from the ui
    launchIcon(appIcon);
    subject.confirmDialog('resume');

    // wait until we are showing our desired icon
    var iconURL = server.manifest.icons['128'];
    client.waitFor(function() {
      appIcon = subject.getIcon(server.packageManifestURL);
      var src = iconSrc(appIcon);
      return src && src.indexOf(iconURL) !== -1;
    });
  });

  test('fallback to default icon when icon fails', function() {
    var iconURL = server.manifest.icons['128'];
    // correctly install the app...
    client.switchToFrame();

    // ensure the icon fails to download!
    server.fail(iconURL);
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());

    var icon = subject.getIcon(server.manifestURL);

    // ensure the default icon is shown
    client.waitFor(function() {
      var src = iconSrc(icon);
      return src && src.indexOf('default') !== -1;
    });

    server.unfail(iconURL);

    // XXX: We don't have real network access but we can sorta emulate it by
    //      failing then switching back to an online state.
    client.executeScript(function() {
      window.dispatchEvent(new CustomEvent('online'));
    });

    // wait until we are showing our desired icon
    client.waitFor(function() {
      var src = iconSrc(icon);
      return src && src.indexOf(iconURL) !== -1;
    });

    // ensure the icon can be launched!
    subject.launchAndSwitchToApp(server.manifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});

