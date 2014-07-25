/* global MockNavigatorSettings, AirplaneModeHelper, Promise
 */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

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

  teardown(function() {
    window.navigator.mozSettings.mTeardown();
    AirplaneModeHelper._callbacks = [];
    // After |mozSettings.mTeardown| is called, observers are cleared, we
    // need to re-initialize the AirplaneModeHelper to add them back.
    AirplaneModeHelper.init();
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

  suite('ready > ', function() {
    var fakeCallback = sinon.spy();

    suite('without _cachedStatus', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = '';
        this.sinon.stub(AirplaneModeHelper, 'addEventListener');
        AirplaneModeHelper.ready(fakeCallback);
      });
      test('we would register on eventListener', function() {
        assert.ok(AirplaneModeHelper.addEventListener.called);
        assert.isFalse(fakeCallback.called);
      });
    });
    suite('with _cachedStatus', function() {
      setup(function() {
        AirplaneModeHelper._cachedStatus = 'enabled';
        AirplaneModeHelper.ready(fakeCallback);
      });
      test('we would execute the callback directly', function() {
        assert.ok(fakeCallback.called);
      });
    });

    suite('invoked times', function() {
      function runTestSuite(withCachedStatus) {
        return function() {
          var readyCallback = sinon.spy();

          setup(function() {
            AirplaneModeHelper._cachedStatus =
              withCachedStatus ? 'disabled' : '';
            AirplaneModeHelper.ready(readyCallback);
          });

          test('we would execute the callback only once', function(done) {
            function updateSettings(enabled, status) {
              return new Promise(function(resolve) {
                var obj = {};
                obj[kCommunicationKey] = enabled;
                obj[kStatusKey] = status;
                var req = window.navigator.mozSettings.createLock().set(obj);
                req.onsuccess = function() {
                  resolve();
                };
              });
            }

            // Enable airplane mode.
            updateSettings(true, 'enabled').then(function() {
              // Disable airplane mode.
              return updateSettings(false, 'disabled');
            }).then(function() {
              assert.isTrue(readyCallback.calledOnce);
              done();
            });
          });
        };
      }

      suite('with _cachedStatus', runTestSuite(true));
      suite('without _cachedStatus', runTestSuite(false));
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
    suite('we would call ready first', function() {
      setup(function() {
        this.sinon.stub(AirplaneModeHelper, 'ready');
        AirplaneModeHelper._cachedStatus = 'enabled';
        AirplaneModeHelper.setEnabled(true);
      });
      test('to make sure _cachedStatus is ready', function() {
        assert.ok(AirplaneModeHelper.ready.called);
      });
    });
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
