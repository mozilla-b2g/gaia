/* global MuteIcon, MockL10n */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/mute_icon.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('system/MuteIcon', function() {
  var subject, realL10n, MockSoundManager;

  setup(function() {
    MockSoundManager = {
      vibrationEnabled: false,
      currentVolume: {
        notification: 10
      }
    };
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    subject = new MuteIcon(MockSoundManager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  test('Vibration disabled and notification volume is 0', function() {
    MockSoundManager.vibrationEnabled = false;
    MockSoundManager.currentVolume.notification = 0;
    this.sinon.stub(MockL10n, 'get');
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.isFalse(subject.element.classList.contains('vibration'));
    assert.equal(MockL10n.getAttributes(subject.element).id,
      'statusbarIconOn-mute');
  });

  test('Vibration enabled and notification volume is 0"', function() {
    MockSoundManager.vibrationEnabled = true;
    MockSoundManager.currentVolume.notification = 0;
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.isTrue(subject.element.classList.contains('vibration'));
    assert.equal(MockL10n.getAttributes(subject.element).id,
      'statusbarIconOn-vibration');
  });

  test('Vibration disabled and notification is not muted', function() {
    MockSoundManager.vibrationEnabled = false;
    MockSoundManager.currentVolume.notification = 11;
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
