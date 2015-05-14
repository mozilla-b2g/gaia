'use strict';

var APP_URL = 'app://dashboard.gaiamobile.org';

var Keys = {
  'up': '\ue013',
  'right': '\ue014',
  'down': '\ue015',
  'left': '\ue012'
};

var assert = require('chai').assert;

marionette('Test Arrow Key Events', function() {

  var opts = {
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client(opts);

  setup(function() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  test('Display top widget after pressing up', function () {
    client.helper.waitForElement('#main-section', function (err, element) {
      element.sendKeys(Keys.up);
      assert.equal(element.dataset.activeDirection, 'up');
    });
  });

  test('Hide top widget after pressing down when top widget is displayed',
    function () {
    client.helper.waitForElement('#main-section', function (err, element) {
      element.sendKeys(Keys.up);
      assert.equal(element.dataset.activeDirection, 'up');
      element.sendKeys(Keys.down);
      assert.equal(element.dataset.activeDirection, '');
    });
  });

});
