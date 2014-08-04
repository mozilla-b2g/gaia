'use strict';

marionette('Fullscreen status bar >', function() {
  var assert = require('assert');
  var Actions = require('marionette-client').Actions;
  var System = require('./lib/system.js');

  var VIDEO_APP = 'app://video.gaiamobile.org';

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var sys = new System(client);
  var actions = new Actions(client);

  var video;

  setup(function() {
    video = sys.waitForLaunch(VIDEO_APP);
    var titlebar = sys.appTitlebar;
    var statusbarHeight = titlebar.size().height;
    client.waitFor(function() {
      return (titlebar.location().y <= (-1 * statusbarHeight));
    });
  });

  test('Swiping from the top should open the statusbar', function() {
    var top = sys.topPanel;
    var titlebar = sys.appTitlebar;

    actions.press(top, 100, 0).moveByOffset(0, 250).release().perform();
    client.waitFor(function() {
      var rect = titlebar.scriptWith(function(el) {
        return el.getBoundingClientRect();
      });
      var expectedHeight = 30;
      return (rect.bottom >= expectedHeight);
    });
    assert(titlebar.displayed(), 'The status bar is visible');
  });
});
