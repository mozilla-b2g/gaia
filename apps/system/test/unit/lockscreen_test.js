'use strict';
requireApp('system/test/unit/mock_clock.js', function() {
  window.realClock = window.Clock;
  window.Clock = MockClock;
requireApp('system/js/lockscreen.js');
});

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_mobile_connection.js');
requireApp('system/test/unit/mock_mobile_operator.js');
requireApp('system/test/unit/mock_ftu_launcher.js');


if (!this.MobileOperator) {
  this.MobileOperator = null;
}

if (!this.FtuLauncher) {
  this.FtuLauncher = null;
}

if (!this.IccHelper) {
  this.IccHelper = null;
}

suite('system/LockScreen >', function() {
  var subject;
  var realL10n;
  var realMobileOperator;
  var realMobileConnection;
  var realIccHelper;
  var realClock;
  var realFtuLauncher;
  var domConnstate;
  var domConnstateL1;
  var domConnstateL2;
  var DUMMYTEXT1 = 'foo';

  setup(function() {
    subject = window.LockScreen;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realMobileOperator = window.MobileOperator;
    window.MobileOperator = MockMobileOperator;

    realClock = window.Clock;
    window.Clock = MockClock;

    realFtuLauncher = window.FtuLauncher;
    window.FtuLauncher = MockFtuLauncher;

    realMobileConnection = window.navigator.mozMobileConnection;

    realIccHelper = window.IccHelper;

    domConnstate = document.createElement('div');
    domConnstate.id = 'lockscreen-connstate';
    domConnstateL1 = document.createElement('div');
    domConnstateL2 = document.createElement('div');
    domConnstate.appendChild(domConnstateL1);
    domConnstate.appendChild(domConnstateL2);
    document.body.appendChild(domConnstate);

    subject.connstate = domConnstate;

  });

  test('2G Mode: should update cell broadcast info on connstate Line 2',
  function() {
    window.navigator.mozMobileConnection = {
      voice: {
        connected: 'true',
        type: 'gsm'
      }
    };
    window.IccHelper = {enabled: true};
    subject.cellbroadcastLabel = DUMMYTEXT1;
    subject.updateConnState();
    assert.equal(domConnstateL2.textContent, DUMMYTEXT1);
  });

  test('3G Mode: should update carrier and region info on connstate Line 2',
  function() {
    window.navigator.mozMobileConnection = {
      voice: {
        connected: 'true',
        type: 'wcdma'
      }
    };
    window.IccHelper = {enabled: true};
    var carrier = 'TIM';
    var region = 'SP';
    var exceptedText = 'TIM SP';
    MobileOperator.mCarrier = carrier;
    MobileOperator.mRegion = region;
    subject.cellbroadcastLabel = DUMMYTEXT1;
    subject.updateConnState();
    assert.equal(domConnstateL2.textContent, exceptedText);
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    window.MobileOperator = realMobileOperator;
    window.navigator.mozMobileConnection = realMobileConnection;
    window.IccHelper = realIccHelper;
    window.Clock = window.realClock;
    window.FtuLauncher = realFtuLauncher;

    document.body.removeChild(domConnstate);
  });
});
