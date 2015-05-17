'use strict';
/* global __dirname */

marionette('Find My Device lock >', function() {
  var assert = require('assert');

  var FINDMYDEVICE_TEST_APP = 'app://test-findmydevice.gaiamobile.org';

  var client = marionette.client({
    apps: {
      'test-findmydevice.gaiamobile.org':
        __dirname + '/fixtures/test-findmydevice',
    }
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

    // XXX: After we make LockScreen as an iframe or app, this should be the
    // line to switch to LockScreen frame.
    client.switchToFrame();
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

    // sanity-check the settings we should have set
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

    client.switchToFrame();

    // now unlock the screen and re-lock it, the message should disappear
    client.executeScript(function() {
      window.wrappedJSObject.Service.request('unlock');
    });

    client.waitFor(function() {
      return client.executeScript(function() {
        return !window.wrappedJSObject.Service.locked;
      });
    });

    client.executeScript(function() {
      window.wrappedJSObject.Service.request('lock');
    });

    // XXX: After we make LockScreen as an iframe or app, this should be the
    // line to switch to LockScreen frame.
    client.switchToFrame();
    lockscreen = client.findElement('#lockscreen');
    client.waitFor(function() {
      return lockscreen.displayed();
    });

    lockscreenMessage = client.findElement('#lockscreen-message');
    client.waitFor(function() {
      return !lockscreenMessage.displayed();
    });

    assert.equal(client.settings.get('lockscreen.lock-message'), '');
  });
});
