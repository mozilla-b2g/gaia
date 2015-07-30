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

  var client = marionette.client({
    profile: opts,
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  setup(function() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  test('Display and hide top widget after pressing up/down',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');
    element.sendKeys(Keys.up);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
    element.sendKeys(Keys.down);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), '');
  });

  test('Display and hide right widget after pressing right/left',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');
    element.sendKeys(Keys.right);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'right');
    element.sendKeys(Keys.left);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), '');
  });

  test('Display and hide bottom widget after pressing down/up',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');
    element.sendKeys(Keys.down);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'down');
    element.sendKeys(Keys.up);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), '');
  });

  test('Display and hide left widget after pressing left/right',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');
    element.sendKeys(Keys.left);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'left');
    element.sendKeys(Keys.right);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), '');
  });

  test('Doesn\'t hide top widgets after pressing up when top widget is visible',
       { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');
    // test top widget
    element.sendKeys(Keys.up);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
    element.sendKeys(Keys.up);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
  });

  test('Doesn\'t hide top widgets after pressing right or left ' +
       'when top widget is visible', { devices: ['tv'] }, function () {
    var element = client.helper.waitForElement('body');
    // test top widget
    element.sendKeys(Keys.up);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
    element.sendKeys(Keys.right);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
    element.sendKeys(Keys.left);
    assert.equal(element.scriptWith(function(elem) {
      return elem.dataset.activeDirection;
    }), 'up');
  });

});
