'use strict';

marionette('Fullscreen status bar >', function() {
  var titlebar;

  var VIDEO_APP = 'app://video.gaiamobile.org';

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var actions, video, sys;

  setup(function() {
    actions = client.loader.getActions();
    sys = client.loader.getAppClass('system');
    video = sys.waitForLaunch(VIDEO_APP);
    client.waitFor(function() {
      titlebar = client.findElement('.appWindow.active .titlebar');
      return titlebar;
    });
    var statusbarHeight = titlebar.size().height;
    client.waitFor(function() {
      return (titlebar.location().y <= (-1 * statusbarHeight));
    });
  });

  test('Swiping from the top should open the statusbar', function() {
    var top = sys.topPanel;

    actions.flick(top, 100, 0, 100, 250).perform();
    client.waitFor(function() {
      return (titlebar.location().y === 0);
    });
  });
});
