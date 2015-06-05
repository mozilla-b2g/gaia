'use strict';

var SETTINGS_APP = 'app://settings.gaiamobile.org';
var SMS_APP = 'app://sms.gaiamobile.org';
var CALENDAR_APP = 'app://calendar.gaiamobile.org';
var MUSIC_APP = 'app://music.gaiamobile.org';

marionette('Statusbar background colors', function() {
  var client = marionette.client({
    profile: {
      settings: {
        'lockscreen.enabled': false
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Apps from the communications group should be green', function() {
    var expected = 'theme-communications';

    client.apps.launch(SMS_APP);
    client.switchToFrame();

    checkThemeGroup(expected);
    var color = getComputedColorForGroup(expected);
    checkAppStatusBarBackground(color);
  });

  test('Apps from the productivity group should be orange', function() {
    var expected = 'theme-productivity';

    client.apps.launch(CALENDAR_APP);
    client.switchToFrame();

    checkThemeGroup(expected);
    var color = getComputedColorForGroup(expected);
    checkAppStatusBarBackground(color);
  });

  test('Apps from the settings group should be gray', function() {
    var expected = 'theme-settings';

    client.apps.launch(SETTINGS_APP);
    client.switchToFrame();

    checkThemeGroup(expected);
    var color = getComputedColorForGroup(expected);
    checkAppStatusBarBackground(color);
  });

  test('Apps from the media group should be gray', function() {
    var expected = 'theme-media';

    client.apps.launch(MUSIC_APP);
    client.switchToFrame();

    checkThemeGroup(expected);
    var color = getComputedColorForGroup(expected);
    checkAppStatusBarBackground(color);
  });

  function checkThemeGroup(group) {
    client.waitFor(function() {
      var className = system.currentWindow.scriptWith(function(element) {
        return element.className;
      });
      return (className.indexOf(group) !== -1);
    });
  }

  function getComputedColorForGroup(group) {
    return client.executeScript(function(group) {
      var element = document.body;

      var fake = document.createElement('div');
      fake.classList.add(group);
      fake.style.backgroundColor = 'var(--header-background)';
      element.appendChild(fake);

      var computedStyle = window.getComputedStyle(fake);
      var bg = computedStyle['background-color'];

      fake.remove();
      return bg;
    }, [group]);
  }

  function checkAppStatusBarBackground(color) {
    client.waitFor(function() {
      var bg = system.appChrome.scriptWith(function(element) {
        var computedStyle = window.getComputedStyle(element);
        return computedStyle['background-color'];
      });
      return (bg == color);
    });
  }
});
