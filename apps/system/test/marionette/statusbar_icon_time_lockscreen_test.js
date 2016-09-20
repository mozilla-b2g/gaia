'use strict';

var System = require('./lib/system');
var StatusBar = require('./lib/statusbar');
var Lockscreen = require('./lib/lockscreen');

marionette('Status Bar icons - Time on lockscreen', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true
    }
  });

  var system;
  var statusBar;
  var lockscreen;

  setup(function() {
    system = new System(client);
    statusBar = new StatusBar(client);
    lockscreen = new Lockscreen();
    lockscreen.start(client);
    system.waitForStartup();
  });

  test('should not be visible', function() {
    lockscreen.unlock();
    statusBar.time.show();
    statusBar.time.waitForIconToAppear();
    lockscreen.lock();
    statusBar.time.waitForIconToDisappear();
  });
});
