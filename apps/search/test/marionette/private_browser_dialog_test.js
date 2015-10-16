'use strict';
var assert = require('assert');

marionette('Private Browser Trigger', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: true },
    profile: {
      settings: {
        'browser.private.default': true
      }
    }
  });

  var search, system;

  setup(function() {
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  function launchPrivateWindow() {
    var frame = system.waitForLaunch(search.URL);
    client.switchToFrame(frame);
  }

  test('launches private window', function() {
    // Assert that the dialog is visible and is dismissable.
    launchPrivateWindow();
    var dialog = client.helper.waitForElement(search.Selectors.privateDialog);
    client.helper.waitForElement(search.Selectors.privateDialogClose)
      .scriptWith(function(el) {
        el.wrappedJSObject.dispatchEvent(new CustomEvent('click'));
      });
    client.helper.waitForElementToDisappear(dialog);
    client.executeScript(function() {
      window.wrappedJSObject.close();
    });
    client.switchToFrame();

    // Assert that the dialog is visible if we relaunch the search app.
    launchPrivateWindow();
    dialog = client.helper.waitForElement(search.Selectors.privateDialog);
    // Tap the checkbox and close the dialog.
    client.helper.waitForElement(search.Selectors.privateDialogCheckbox)
      .scriptWith(function(el) {
        el.wrappedJSObject.checked = true;
      });
    client.helper.waitForElement(search.Selectors.privateDialogClose)
      .scriptWith(function(el) {
        el.wrappedJSObject.dispatchEvent(new CustomEvent('click'));
      });
    client.helper.waitForElementToDisappear(dialog);
    client.executeScript(function() {
      window.wrappedJSObject.close();
    });
    client.switchToFrame();

    // The next time we re-launch the browser the dialog should not appear.
    launchPrivateWindow();
    assert.ok(client.helper.waitForElement(
      search.Selectors.topSitesHeader).displayed());
  });
});
