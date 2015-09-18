'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var Settings = require('../../../settings/test/marionette/app/app');

marionette('Service Workers - Unregister when clear private data', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'dom.serviceWorkers.testing.enabled': true
      }
    }
  });

  var actions, home, rocketbar, server, system, settings;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/sw/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    settings = new Settings(client);
    system.waitForFullyLoaded();
  });

  test('Clear cookies and data should remove registered service workers',
       function() {

    function openSiteAndGetBackgroundColor() {
      // Use the home-screen search box to open up the system browser
      var url = server.url('index.html');
      rocketbar.homescreenFocus();
      rocketbar.enterText(url, true);

      // The test site has the following code of colors:
      // - Yellow: No service worker registered (default).
      // - Green: Service worker registered.
      // - Red: Service worker intercepted request.

      // Switch to the site and wait until the service worker is registered.
      var frame = client.helper.waitForElement(
        'div[transition-state="opened"] iframe[src="' + url + '"]');
      client.switchToFrame(frame);
      return client.executeScript(function() {
        return window.wrappedJSObject.document
                     .querySelector('.color-div').style.backgroundColor;
      });
    }

    function closeSiteWindow() {
      // Open the context menu and click show windows
      client.switchToFrame();
      system.appChromeContextLink.click();
      assert.ok(system.appChromeContextMenu.displayed());

      var showWindowsLink = system.appChromeContextMenuShowWindows;
      assert.ok(showWindowsLink.displayed());
      showWindowsLink.click();

      // Close the browser window.
      var close = client.helper.waitForElement(
        'button[data-l10n-id="closeCard"]'
      );
      close.tap();
      // XXX For some weird reason, I need to do this twice... otherwise the
      //     test will halt. Marionette is like Mordor to me.
      //     If you find the reason or a better way, please change this!
      close = client.helper.waitForElement('button[data-l10n-id="closeCard"]');
      close.tap();
    }

    var color = openSiteAndGetBackgroundColor();
    // The service worker is successfully registered.
    assert.equal(color, 'green', 'Background should be green');

    // We need to close and reopen the site to activate the service worker.
    closeSiteWindow();

    color = openSiteAndGetBackgroundColor();
    // The service worker intercepts requests.
    assert.equal(color, 'red', 'Background should be red');

    closeSiteWindow();

    // Open Settings app and clear cookies and private data.
    // This should unregister the service worker.
    var settingsFrame = system.waitForLaunch(Settings.ORIGIN);
    client.switchToFrame(settingsFrame);
    client.helper.waitForElement(Settings.Selectors.menuItemsSection);
    var panel = settings.browsingPrivacyPanel;
    panel.clearCookiesAndStoredData();
    var clear = client.helper.waitForElement('button.clear-dialog-ok.danger');
    clear.click();

    client.apps.close(Settings.ORIGIN);

    // Check that the service worker was unregistered.
    color = openSiteAndGetBackgroundColor();
    assert.equal(color, 'green', 'Background should be green');
  });
});
