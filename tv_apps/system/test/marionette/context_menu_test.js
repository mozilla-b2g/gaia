/* global __dirname */

'use strict';

var Actions = require('marionette-client').Actions;

var APP_NAME = 'contextmenuapp';
var APP_HOST = APP_NAME + '.gaiamobile.org';
var APP_URL = 'app://' + APP_HOST;

marionette('Test Context Menu Events', function() {

  var opts = {
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {}
  };

  opts.apps[APP_HOST] = __dirname + '/' + APP_NAME;

  var client = marionette.client(opts);
  var actions = new Actions(client);

  test('Test basic context menu functionality', function() {

    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

    // Ensure the share and open tab menu items are present
    client.switchToFrame();
    client.helper.waitForElement('[data-id=open-in-new-tab]');
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

});
