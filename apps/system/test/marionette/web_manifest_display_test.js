'use strict';

var assert = require('assert');

marionette('Web Manifest Display Modes >', function() {

  var client = marionette.client({
    profile: {
      apps: {
        'web_app_minimal_ui.gaiamobile.org':
          __dirname + '/../apps/web_app_minimal_ui',
        'web_app_standalone.gaiamobile.org':
          __dirname + '/../apps/web_app_standalone',
        'web_app_fullscreen.gaiamobile.org':
          __dirname + '/../apps/web_app_fullscreen'
      }
    }
  });

  var system, frame;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('minimal-ui', function() {
    var appOrigin = 'app://web_app_minimal_ui.gaiamobile.org';
    frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    var windowClass = system.currentWindow.getAttribute('class');
    assert.ok(windowClass.indexOf('collapsible') != -1);
    assert.ok(windowClass.indexOf('scrollable') != -1);
  });

  test('standalone', function() {
    var appOrigin = 'app://web_app_standalone.gaiamobile.org';
    frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    var windowClass = system.currentWindow.getAttribute('class');
    assert.ok(windowClass.indexOf('collapsible') == -1);
    assert.ok(windowClass.indexOf('scrollable') == -1);
  });

  test('fullscreen', function() {
    var appOrigin = 'app://web_app_fullscreen.gaiamobile.org';
    frame = system.waitForLaunch(appOrigin);
    client.switchToFrame(frame);
    client.helper.waitForElement('body');
    client.switchToFrame();
    var windowClass = system.currentWindow.getAttribute('class');
    assert.ok(windowClass.indexOf('collapsible') == -1);
    assert.ok(windowClass.indexOf('scrollable') == -1);
    assert.ok(windowClass.indexOf('fullscreen-app') != -1);
  });
});
