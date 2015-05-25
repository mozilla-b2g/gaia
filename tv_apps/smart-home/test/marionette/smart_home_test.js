'use strict';

var APP_URL = 'app://smart-home.gaiamobile.org';

var Keys = {
  'up': '\ue013',
  'right': '\ue014',
  'down': '\ue015',
  'left': '\ue012',
  'enter': '\ue006',
  'esc': '\ue00c'
};

var assert = require('chai').assert;

var containsClass = function(elem, className) {
  if (elem) {
    return elem.getAttribute('class').indexOf(className) > -1;
  }
  return false;
};

marionette('Smart Home', function() {

  var opts = {
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client({ profile: opts });

  setup(function() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  suite('> Card Filter', function() {
    test('Hide card filter when enter edit mode and show card filter when' +
        ' exit edit mode ', { devices: ['tv'] }, function () {

      var editButton = client.findElement('#edit-button');
      var element = client.findElement('#main-section');
      var searchButton = client.findElement('#search-button');
      client.waitFor(function() {
        return containsClass(searchButton, 'focused');
      });

      element.sendKeys(Keys.right);
      client.waitFor(function() {
        return containsClass(editButton, 'focused');
      });

      element.sendKeys(Keys.enter);
      client.waitFor(function() {
        return element.getAttribute('data-mode') === 'edit';
      });
      var cardFilter = client.findElement('#filter-tab-group');
      assert.isTrue(containsClass(cardFilter, 'hidden'));

      element.sendKeys(Keys.up);
      element.sendKeys(Keys.enter);
      assert.isFalse(containsClass(cardFilter, 'hidden'));
    });
  });

});
