'use strict';

var assert = require('assert');
var Homescreen = require('./lib/home2');
var Actions = require('marionette-client').Actions;
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');
var iconAppState = require('./lib/icon_app_state');
var launchIcon = require('./lib/launch_icon');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Statusbar', function() {
  var appInstall, home, system;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'homescreen.manifestURL':
        'app://verticalhome.gaiamobile.org/manifest.webapp'
    }
  });

  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  setup(function() {
    home = new Homescreen(client);
    system = new System(client);
    appInstall = new AppInstall(client);
    system.waitForStartup();
    home.waitForLaunch();
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

  function isOpaque() {
    return home.containsClass(
      System.Selector.statusbarBackground, 'opaque');
  }

  function waitForOpaqueStatusbar() {
    client.switchToFrame();
    client.waitFor(isOpaque);
    client.switchToFrame(system.getHomescreenIframe());
  }

  function waitForTransparentStatusbar() {
    client.switchToFrame();
    client.waitFor(function() {
      return !isOpaque();
    });
    client.switchToFrame(system.getHomescreenIframe());
  }

  suite(' Scrolling > ', function() {
    test('Confirm dialog at top of vertical homescreen', function() {
      // Enter a confirmation dialog at the top of the vertical homescreen
      // and ensure that the statusbar remains in the correct state.
      client.switchToFrame();
      server.cork(server.applicationZipUri);
      appInstall.installPackage(server.packageManifestURL);
      client.switchToFrame(system.getHomescreenIframe());

      var icon = home.getIcon(server.packageManifestURL);
      home.moveIconToIndex(icon, 0);

      launchIcon(icon);
      waitForOpaqueStatusbar();

      home.confirmDialog('pause');
      icon = home.getIcon(server.packageManifestURL);
      expectAppState(icon, 'paused');
      waitForTransparentStatusbar();
    });

    test('The statusbar changes the appearance properly', function() {
      var body = client.helper.waitForElement('body');
      var actions = new Actions(client);
      actions.flick(body, 200, 300, 200, 200);
      actions.perform();
      client.helper.wait(2000); // Waiting for scroll animation
      assert.equal(home.getThemeColor(), 'black');
      waitForOpaqueStatusbar();

      // Launch an app to make sure the statusbar turns opaque.
      var settingsOrigin = 'app://settings.gaiamobile.org';
      var icon = home.getIcon(settingsOrigin + '/manifest.webapp');
      icon.tap();
      assert.equal(home.getThemeColor(), 'black');
      client.switchToFrame();
      client.waitFor(isOpaque);
      client.apps.close(settingsOrigin);
      assert.ok(isOpaque());

      // We can't trust our panning physics on B2G desktop using Actions.
      // The same scroll down may not result in the same upward scroll.
      // We may be able to use a larger upward scroll, but to be 100% sure we
      // simply continue flicking until victorious.
      client.waitFor(function() {
        client.apps.switchToApp(Homescreen.URL);
        actions.flick(body, 200, 200, 200, 300);
        actions.perform();

        client.waitFor(function() {
          return (home.getThemeColor() == 'transparent');
        });
        assert.ok(true, 'meta updated');
        client.switchToFrame();
        return !isOpaque();
      });

      // Bug 1034657 : Install an app, enter edit mode, scrol down, open the
      // confirm dialog, then scroll to the top and check statusbar state.
      appInstall.installPackage(server.packageManifestURL);
      client.switchToFrame(system.getHomescreenIframe());
      home.waitForSystemBanner();
      icon = home.getIcon(server.packageManifestURL);
      icon.scriptWith(function(el) {
        el.scrollIntoView(false);
      });
      home.enterEditMode(icon);

      var remove = icon.findElement('.remove');
      remove.click();
      home.confirmDialog('remove');

      // Scroll until we reach the top and verify statusbar state.
      client.waitFor(function() {
        body = client.helper.waitForElement('body');
        actions.flick(body, 200, 200, 200, 500);
        actions.perform();
        return parseInt(client.findElement('.scrollable')
          .getAttribute('scrollTop'), 10) === 0;
      });
      waitForOpaqueStatusbar();
    });
  });
});
