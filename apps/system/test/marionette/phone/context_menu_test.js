/* global __dirname */

'use strict';

var APP_NAME = 'contextmenuapp';
var APP_HOST = APP_NAME + '.gaiamobile.org';
var APP_URL = 'app://' + APP_HOST;

var ENTER_CHAR = '\ue006';

var assert = require('chai').assert;

marionette('Test Context Menu Events', function() {

  var opts = {
    apps: {}
  };

  opts.apps[APP_HOST] = __dirname + '/../../apps/' + APP_NAME;

  var client = marionette.client(opts);
  var actions;

  test('Test basic context menu functionality', function() {
    actions = client.loader.getActions();

    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

    // Ensure the share and open tab menu items are present
    client.switchToFrame();
    client.helper.waitForElement('[data-id=open-in-new-window]');
    client.helper.waitForElement('[data-id=share-link]');

    // Cancel the context menu
    var cancel = client.helper.waitForElement('#ctx-cancel-button');
    cancel.click();

    // Long press on an image
    client.apps.switchToApp(APP_URL);
    var image = client.helper.waitForElement('#image');
    actions.longPress(image, 1.5).perform();

    client.switchToFrame();
    client.helper.waitForElement('[data-id=share-image]');

  });

  test('Close context menu with keyboard', function() {
    actions = client.loader.getActions();

    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

    // Ensure the share and open tab menu items are present
    client.switchToFrame();
    client.helper.waitForElement('[data-id=open-in-new-window]');
    client.helper.waitForElement('[data-id=share-link]');

    // Cancel the context menu
    var cancel = client.helper.waitForElement('#ctx-cancel-button');

    assert.isTrue(cancel.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'cancel button should be focused.');

    cancel.sendKeys(ENTER_CHAR);

    client.helper.waitForElementToDisappear(cancel);

  });

});
