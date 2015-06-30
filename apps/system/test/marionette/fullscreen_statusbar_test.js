'use strict';

marionette('Fullscreen status bar >', function() {
  var assert = require('assert');

  var VIDEO_APP = 'app://video.gaiamobile.org';

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var actions, video, sys;

  setup(function() {
    actions = client.loader.getActions();
    sys = client.loader.getAppClass('system');
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

    actions.flick(top, 100, 0, 100, 250).perform();
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
