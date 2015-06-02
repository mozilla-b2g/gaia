'use strict';
var LockScreen = require('./lib/lockscreen.js');
var StatusBar = require('./lib/statusbar.js');

marionette('Secure app (camera from lockscreen) statusbar icons', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      },
      apps: {
        'fullscreen_request.gaiamobile.org':
          __dirname + '/../apps/fullscreen_request'
      }
    }
  });

  var system, lockscreen, statusbar;

  setup(function() {
    system = client.loader.getAppClass('system');
    lockscreen = (new LockScreen()).start(client);
    statusbar = new StatusBar(client);

    system.waitForFullyLoaded();
  });

  function launchApp(url) {
    client.apps.launch(url);
    system.waitForLaunch(url);
  }

  test('statusbar icons display on lockscreen with camera', function() {
    statusbar.waitForAppear();
    launchApp('app://fullscreen_request.gaiamobile.org');
    statusbar.waitForDisappear();
    lockscreen.relock();
    statusbar.waitForAppear();
  });

});
