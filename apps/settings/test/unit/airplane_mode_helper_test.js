/* global MockNavigatorSettings, mocha, AirplaneModeHelper
 */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

mocha.globals(['AirplaneModeHelper']);

suite('AirplaneModeHelper > ', function() {
  var realMozSettings;
  var kEventName = 'statechange';
  var kCommunicationKey = 'airplaneMode.enabled';
  var kStatusKey = 'airplaneMode.status';

  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
  });

  suite('init > ', function() {
    setup(function(done) {
      this.sinon.spy(navigator.mozSettings, 'addObserver');
      require('/shared/js/airplane_mode_helper.js', done);
    });

    test('we added observers on ' + kStatusKey, function() {
      assert.isFunction(navigator.mozSettings.mObservers[kStatusKey][0]);
    });
  });

  suite('getStatus > ', function() {
    var fakeStatus;
    setup(function() {
      fakeStatus = 'disabling';
      AirplaneModeHelper._cachedStatus = fakeStatus;
    });
    test('getCurrentStatus returns right status', function() {
      assert.equal(AirplaneModeHelper.getStatus(), fakeStatus);
    });
  });

  suite('addEventListener > ', function() {
    var fakeEventName = 'thisIsFakeEventName';
    var fakeCallback = function() {};

    setup(function() {
      AirplaneModeHelper._callbacks = [];
    });

    suite('add event with wrong keyword', function() {
      setup(function() {
        AirplaneModeHelper.addEventListener(fakeEventName, fakeCallback);
      });
      test('can\'t add callbacks', function() {
        assert.equal(AirplaneModeHelper._callbacks.length, 0);
      });
    });

    suite('add event with right keyword', function() {
      setup(function() {
        AirplaneModeHelper.addEventListener(kEventName, fakeCallback);
      });
      test('can add callbacks', function() {
        assert.equal(AirplaneModeHelper._callbacks.length, 1);
      });
    });
  });

  suite('removeEventListener > ', function() {
    var fakeEventName = 'thisIsFakeEventName';
    var fakeCallback = function() {};

    setup(function() {
      AirplaneModeHelper._callbacks = [fakeCallback];
    });

    suite('remove event with wrong keyword', function() {
      setup(function() {
        AirplaneModeHelper.removeEventListener(fakeEventName, fakeCallback);
      });
      test('can\'t remove callbacks', function() {
        assert.equal(AirplaneModeHelper._callbacks.length, 1);
      });
    });

    suite('remove event with right keyword', function() {
      setup(function() {
        AirplaneModeHelper.removeEventListener(kEventName, fakeCallback);
      });
      test('can remove callbacks', function() {
        assert.equal(AirplaneModeHelper._callbacks.length, 0);
      });
    });
  });

  suite('setEnabled > ', function() {
    suite('setEnabled(true) when enabling', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'enabling';
        AirplaneModeHelper.setEnabled(true);
      });
      test('will do nothing', function() {
        assert.isUndefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(false) when enabling', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'enabling';
        AirplaneModeHelper.setEnabled(false);
      });
      test('will do nothing', function() {
        assert.isUndefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(true) when disabling', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'disabling';
        AirplaneModeHelper.setEnabled(true);
      });
      test('will do nothing', function() {
        assert.isUndefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(false) when disabling', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'disabling';
        AirplaneModeHelper.setEnabled(false);
      });
      test('will do nothing', function() {
        assert.isUndefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(true) when enabled', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'enabled';
        AirplaneModeHelper.setEnabled(true);
      });
      test('will do nothing', function() {
        assert.isUndefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(false) when disabled', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'disabled';
        AirplaneModeHelper.setEnabled(false);
      });
      test('will do nothing', function() {
        assert.isUndefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(true) when disabled', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'disabled';
        AirplaneModeHelper.setEnabled(true);
      });
      test('will change airplane mode status', function() {
        assert.isDefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });
    suite('setEnabled(false) when enabled', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'enabled';
        AirplaneModeHelper.setEnabled(false);
      });
      test('will change airplane mode status', function() {
        assert.isDefined(
          window.navigator.mozSettings.mSettings[kCommunicationKey]);
      });
    });

  });
});
