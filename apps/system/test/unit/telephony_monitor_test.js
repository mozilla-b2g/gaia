/* global BaseModule, MockNavigatorMozTelephony */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/telephony_monitor.js');

suite('system/TelephonyMonitor', function() {
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('TelephonyMonitor',
      MockNavigatorMozTelephony);
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('Should be active if there is active call', function() {
    MockNavigatorMozTelephony.active = {
      serviceId: 0
    };
    assert.isTrue(subject.hasActiveCall());
    assert.isFalse(subject.hasActiveCall(1));
    assert.isTrue(subject.hasActiveCall(0));
    MockNavigatorMozTelephony.active = false;
  });

  test('Callschanged', function() {
    assert.isFalse(subject.inCall);
    MockNavigatorMozTelephony.calls = [{}];
    MockNavigatorMozTelephony.mTriggerCallsChanged();
    assert.isTrue(subject.inCall);
    MockNavigatorMozTelephony.calls = [];
    MockNavigatorMozTelephony.mTriggerCallsChanged();
    assert.isFalse(subject.inCall);
  });
});
