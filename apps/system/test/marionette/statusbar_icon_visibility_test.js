'use strict';

var Actions = require('marionette-client').Actions;
var SETTINGS_APP = 'app://settings.gaiamobile.org';

marionette('Statusbar Visibility', function() {
  var client = marionette.client();

  var actions = new Actions(client);
  var halfScreenHeight, system, grippyHeight;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    halfScreenHeight = client.executeScript(function() {
      return window.innerHeight;
    }) / 2;
    var grippy = client.findElement('#utility-tray-grippy');
    grippyHeight = grippy.size().height;
  });

  test('Visibility of date in utility tray', function() {
    actions
      .press(system.topPanel)
      .moveByOffset(0, halfScreenHeight)
      .release()
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var visibility = system.statusbarOperator.scriptWith(function(element) {
        return window.getComputedStyle(element).visibility;
      });
      return (visibility == 'visible');
    });
  });

  test('Filter is none when passing the grippyHeight', function() {
    client.apps.launch(SETTINGS_APP);
    actions
      .press(system.topPanel)
      .moveByOffset(0, grippyHeight + 1)
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var filter = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).filter;
      });
      return (filter == 'none');
    });
  });

  test('Filter is applied before passing the grippyHeight', function() {
    client.apps.launch(SETTINGS_APP);
    actions
      .press(system.topPanel)
      .moveByOffset(0, grippyHeight - 1)
      .perform();
    client.waitFor(function() {
      // The element is rendered with moz-element so we can't use
      // marionette's .displayed()
      var filter = system.statusbar.scriptWith(function(element) {
        return window.getComputedStyle(element).filter;
      });
      return (filter != 'none');
    });
  });
});
