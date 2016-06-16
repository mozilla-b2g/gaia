'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - Default app order', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Default app order is respected', function() {
    var expectedOrder = [
      // No icons expected at this time.
    ];
    var length = expectedOrder.length;

    var iconNames = home.visibleIcons.map(function(icon) {
      return home.getIconText(icon);
    }).slice(0, length);

    for (var i = 0; i < length; i++) {
      assert.equal(iconNames[i], expectedOrder[i]);
    }
  });

});
