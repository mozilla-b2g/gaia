'use strict';

var Messages = require('../../../../sms/test/marionette/lib/messages.js');

var assert = require('assert');

var SETTINGS_APP = 'app://settings.gaiamobile.org';
var SMS_APP = 'app://sms.gaiamobile.org';

marionette('Keyboard and edge gestures >', function() {
  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1,
      'focusmanager.testmode': true
    }
  });

  var sys, actions;
  var settings, sms, smsLib;
  var quarterWidth, topHalf;

  setup(function() {
    actions = client.loader.getActions();

    sys = client.loader.getAppClass('system');
    sys.waitForStartup();

    settings = sys.waitForLaunch(SETTINGS_APP);
    sms = sys.waitForLaunch(SMS_APP);

    smsLib = Messages.create(client);

    // Making sure the opening transition for the sms app is over.
    client.waitFor(function() {
      return sms.displayed() && !settings.displayed();
    });

    var width = client.executeScript(function() {
      return window.innerWidth;
    });
    quarterWidth = width / 4;

    var height = client.executeScript(function() {
      return window.innerHeight;
    });
    topHalf = height / 2 - 100;
  });

  test('Swiping from an app displaying the keyboard', function() {
    // Focusing the keyboard in the sms app
    client.switchToFrame(sms);
    var initialHeight = client.executeScript(function() {
      return window.wrappedJSObject.innerHeight;
    });
    smsLib.ThreadList.navigateToComposer();
    var composer = smsLib.Composer;
    composer.messageInput.tap();

    client.switchToFrame();
    sys.waitForKeyboard();

    // Quick swipe to the settings app
    actions.flick(sys.leftPanel, 0, topHalf, quarterWidth,
                  topHalf, 50).perform();
    assert(true, 'swiped to settings');

    // The sms app should still get resized to full height
    client.switchToFrame(sms);
    client.waitFor(function() {
      var height = client.executeScript(function() {
        return window.wrappedJSObject.innerHeight;
      });
      return height == initialHeight;
    });
    assert(true, 'the sms window was resized to full height');
  });
});
