'use strict';

marionette('Find My Device lock >', function() {
  var assert = require('assert');

  var FINDMYDEVICE_TEST_APP = 'app://test-findmydevice.gaiamobile.org';
  var LOCKSCREEN_APP = 'app://lockscreen.gaiamobile.org';

  var client = marionette.client({
    prefs: {
      'dom.inter-app-communication-api.enabled': true
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
  });

  setup(function() {
    // launch the test app
    client.apps.launch(FINDMYDEVICE_TEST_APP);
    client.apps.switchToApp(FINDMYDEVICE_TEST_APP);
    client.helper.waitForElement('body');
  });

  test('Lock the screen through the test app', function() {
    var messageText = 'This phone is lost.';
    var messageInput = client.findElement('input[name="message"]');
    messageInput.sendKeys(messageText);

    var passcode = '4567';
    var passcodeInput = client.findElement('input[name="code"]');
    passcodeInput.sendKeys(passcode);

    var lockButton = client.findElement('#lock');
    lockButton.click();

    client.switchToFrame();
    client.apps.switchToApp(LOCKSCREEN_APP);
    var lockscreen = client.findElement('#lockscreen');
    client.waitFor(function() {
      return lockscreen.displayed();
    });

    var lockscreenMessage = client.findElement('#lockscreen-message');
    client.waitFor(function() {
      var text = lockscreenMessage.text();
      if (text !== '') {
        assert.equal(lockscreenMessage.text(), messageText);
        return true;
      }

      return false;
    });

    var settings = {
      'lockscreen.enabled': true,
      'lockscreen.passcode-lock.enabled': true,
      'lockscreen.notifications-preview.enabled': false,
      'lockscreen.lock-message': messageText,
      'lockscreen.passcode-lock.code': passcode
    };

    for (var s in settings) {
      assert.equal(client.settings.get(s), settings[s]);
    }
  });
});
