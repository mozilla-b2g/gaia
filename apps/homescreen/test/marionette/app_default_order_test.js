'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - Default app order', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options_bookmarks.js')
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Default app order is respected', function() {
    var expectedOrder = [
      'Phone',
      'Messages',
      'Contacts',
      'E-Mail',
      'Browser',
      'Camera',
      'Gallery',
      'Music',
      'Video',
      'Marketplace',
      'Calendar',
      'Clock',
      'Settings',
      'FM Radio',
      'BuddyUp',
      'Bugzilla Lite',
      'Facebook',
      'Twitter',
      'Notes',
      'Calculator',
      'Usage'
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
