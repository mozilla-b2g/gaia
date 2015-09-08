'use strict';

requireApp('system/lockscreen/js/lockscreen_powerbutton_manager.js');

/* global MocksHelper */

require('/shared/test/unit/mocks/mock_custom_event.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

var mocks = new MocksHelper([
  'CustomEvent', 'SettingsListener'
]).init();

suite('LockScreenPowerbuttonManager >', function() {
  var subject;

  // .attackTestHelpers() registers its own suite setup and teardown
  // functions.
  mocks.attachTestHelpers();

  suiteSetup(function() {
    subject = new window.LockScreenPowerbuttonManager();
  });

  suite('startup behavior >', function() {
    var stubObserver;
    var stubListener;
    setup(function() {
      stubObserver = sinon.stub(window.SettingsListener, 'observe');
      stubListener = sinon.stub(window, 'addEventListener');
    });
    teardown(function() {
      stubObserver.restore();
      stubListener.restore();
    });
    test('registers settings observers and event listener',
      function () {
        subject.start();
        assert.isTrue(stubObserver.calledWith(
          'lockscreen.passcode-lock.powerbutton-behavior'),
          'does not register behavior settings observer');
        assert.isTrue(stubObserver.calledWith(
            'lockscreen.enabled'),
          'does not register LS enabled settings observer');
        assert.isTrue(stubListener.calledWith('sleep'),
          'does not register event listener');
      });
  });

  suite('settings observers >', function() {
    test('behavior value setter works as expected', function() {
      subject.buttonBehavior = 'DUMMY_FOR_OVERWRITE_TEST';
      subject.setPowerbuttonLockBehavior('screen-lock');
      assert.isTrue(subject.buttonBehavior === 'screen-lock',
        'does not correctly handle \'screen-lock\' value');
      subject.setPowerbuttonLockBehavior('passcode-lock');
      assert.isTrue(subject.buttonBehavior === 'passcode-lock',
        'does not correctly handle \'passcode-lock\' value');
      subject.setPowerbuttonLockBehavior(0);
      assert.isTrue(subject.buttonBehavior === 'screen-lock',
        'does not correctly handle invalid value');
    });
    test('LS enabled value setter works as expected', function() {
      subject.lockScreenEnabled = 'DUMMY_FOR_OVERWRITE_TEST';
      subject.setLockScreenEnabled(false);
      assert.isTrue(subject.lockScreenEnabled === false,
        'does not correctly handle false value');
      subject.setLockScreenEnabled(true);
      assert.isTrue(subject.lockScreenEnabled === true,
        'does not correctly handle true value');
      subject.setLockScreenEnabled(0);
      assert.isTrue(subject.lockScreenEnabled === false,
        'does not correctly handle invalid value');
    });
  });

  suite('handles \'sleep\' event >', function() {
    var spySettingsSet;
    suiteSetup(function() {
      spySettingsSet = sinon.spy(window.MockLock, 'set');
    });
    suiteTeardown(function() {
      spySettingsSet.restore();
    });
    setup(function() {
      spySettingsSet.reset();
    });

    test('sets \'lock-immediately\' when it should',
      function() {
        subject.buttonBehavior = 'passcode-lock';
        subject.lockScreenEnabled = true;
        subject.handleEvent(new CustomEvent('sleep'));
        assert.isTrue(spySettingsSet.calledWith({
            'lockscreen.lock-immediately': true
          }),
          'fails to set \'lock-immediately\' setting');
      });

    test('no \'lock-immediately\' when lockscreen disabled',
      function() {
        subject.lockScreenEnabled = false;
        subject.buttonBehavior = 'passcode-lock';
        subject.handleEvent(new CustomEvent('sleep'));
        assert.isFalse(spySettingsSet.called,
          'sends \'lock-immediately\' to disabled lockscreen');
      });

    test('no \'lock-immediately\' in screen-lock mode',
      function() {
        subject.lockScreenEnabled = true;
        subject.buttonBehavior = 'screen-lock';
        subject.handleEvent(new CustomEvent('sleep'));
        assert.isFalse(spySettingsSet.called,
          'sends \'lock-immediately\' in screen-lock mode');
      });
  });

});
