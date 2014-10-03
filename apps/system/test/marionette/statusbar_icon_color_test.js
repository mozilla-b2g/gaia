'use strict';

var Actions = require('marionette-client').Actions;
var System = require('../../../system/test/marionette/lib/system');
var helper = require('../../../../tests/js-marionette/helper.js');
var SETTINGS_APP = 'app://settings.gaiamobile.org';

marionette('Statusbar colors', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  });

  var system = new System(client);
  var actions = new Actions(client);

  setup(function() {
    system.waitForStartup();
  });

  test('statusbar icons are white in the lockscreen', function() {
    waitVisible();
    waitForColor(false);
  });

  test('statusbar icons remain white after dark app', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForColor(true);
    helper.lockScreen(client);
    waitForColor(false);
    helper.unlockScreen(client);
    waitForColor(true);
  });

  test('statusbar icons remain white after task switcher', function() {
    waitVisible();
    helper.unlockScreen(client);
    client.apps.launch(SETTINGS_APP);
    waitForColor(true);
    actions.longPress(system.softwareHome, 1).perform();
    waitForCardsView();
    helper.lockScreen(client);
    waitForColor(false);
    helper.unlockScreen(client);
    waitForColor(true);
  });

  function waitForCardsView() {
    client.waitFor(function() {
      var className = client.findElement('#screen').getAttribute('class');
      return className.indexOf('cards-view') > -1;
    });
  }

  function waitVisible() {
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  }

  function waitForColor(light) {
    client.waitFor(function() {
      var className = system.statusbar.scriptWith(function(element) {
        return element.className;
      });
      var index = className.indexOf('light');
      return light ? index > -1 : index === -1;
    });
  }

});
