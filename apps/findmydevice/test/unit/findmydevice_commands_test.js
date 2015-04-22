/* global MocksHelper */
/* global MockSettingsListener */
/* global MockGeolocation */
/* global Commands */
/* global FindMyDevice */
/* global MockNavigatorSettings */

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_device_storage.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/js/passcode_helper.js');

var mocksForFindMyDevice = new MocksHelper([
  'SettingsListener', 'SettingsURL', 'SettingsHelper', 'Audio',
  'DeviceStorage', 'Geolocation'
]).init();

suite('FindMyDevice >', function() {
  var realMozPower;
  var realMozApps;
  var fakeClock;
  var realMozSettings;

  mocksForFindMyDevice.attachTestHelpers();

  var subject;
  setup(function(done) {
    realMozPower = navigator.mozPower;
    navigator.mozPower = {
      factoryReset:function(reason) {}
    };
    sinon.stub(navigator.mozPower, 'factoryReset');

    realMozApps = navigator.mozApps;
    navigator.mozApps = {
      getSelf: function() {
        var app = {
          manifestURL: 'app://findmydevice.gaiamobile.org/manifest.webapp',
          origin: 'app://findmydevice.gaiamobile.org/'
        };

        var request = {result: app};
        setTimeout(function() {
          request.onsuccess.call(request);
        });

        return request;
      }
    };

    // replace shared/js/dump.js
    window.DUMP = function() {};

    fakeClock = this.sinon.useFakeTimers();

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    window.FindMyDevice = {
      beginHighPriority: this.sinon.stub(),
      endHighPriority: this.sinon.stub()
    };

    require('/js/commands.js', function() {
      subject = Commands;
      done();
    });
  });

  suite('Ring command', function() {
    var duration = 2;

    setup(function() {
      this.sinon.spy(window, 'setTimeout');
      this.sinon.spy(window, 'clearTimeout');
    });

    test('Basic invocation', function() {
      var ringtone = 'user selected ringtone';

      MockSettingsListener.mCallbacks['dialer.ringtone'](ringtone);

      Commands.invokeCommand('ring', [duration, function(retval) {
        var lock = MockSettingsListener.getSettingsLock().locks.pop();

        var channel = Commands._ringer.mozAudioChannelType;
        assert.equal(channel, 'ringer', 'use notification channel');
        assert.equal(lock['audio.volume.notification'], 15,
          'volume set to maximum');
        assert.equal(Commands._ringer.paused, false, 'must be playing');
        assert.equal(Commands._ringer.src, ringtone, 'must use ringtone');
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'command');
      }]);

      fakeClock.tick(duration * 1000);
      assert.equal(Commands._ringer.paused, true, 'must have stopped');
      sinon.assert.calledOnce(FindMyDevice.endHighPriority);
      sinon.assert.calledWith(FindMyDevice.endHighPriority, 'command');
    });

    test('Stop ringing if duration is zero', function() {
      Commands.invokeCommand('ring', [duration, function(retval) {
        assert.equal(Commands._ringer.paused, false, 'must be playing');
        sinon.assert.called(window.setTimeout);
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.notCalled(FindMyDevice.endHighPriority);
      }]);

      fakeClock.tick(duration/2 * 1000);

      var timeoutId = Commands._ringTimeoutId;
      assert.isFalse(Commands._ringer.paused, 'must not be done ringing');
      Commands.invokeCommand('ring', [0, function(retval) {}]);

      assert.equal(Commands._ringer.paused, true, 'must have stopped');
      assert.isNull(Commands._ringTimeoutId, 'timeout must have been canceled');
      sinon.assert.calledWith(window.clearTimeout, timeoutId);
      sinon.assert.calledTwice(FindMyDevice.beginHighPriority);
      sinon.assert.alwaysCalledWith(FindMyDevice.beginHighPriority, 'command');
      sinon.assert.calledTwice(FindMyDevice.endHighPriority);
      sinon.assert.alwaysCalledWith(FindMyDevice.endHighPriority, 'command');
    });

    test('Should do nothing if already ringing', function() {
      Commands.invokeCommand('ring', [duration, function(retval) {
        assert.isFalse(Commands._ringer.paused, 'must be playing');
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.notCalled(FindMyDevice.endHighPriority);
      }]);

      fakeClock.tick(duration/2 * 1000);

      assert.isFalse(Commands._ringer.paused, 'must not be done ringing');
      Commands.invokeCommand('ring', [duration, function(retval) {}]);

      fakeClock.tick(duration/2 * 1000);

      assert.isTrue(Commands._ringer.paused, 'must have stopped');
      assert.isNull(Commands._ringTimeoutId, 'no timeouts should be set');
      sinon.assert.calledTwice(FindMyDevice.beginHighPriority);
      sinon.assert.alwaysCalledWith(FindMyDevice.beginHighPriority, 'command');
      sinon.assert.calledTwice(FindMyDevice.endHighPriority);
      sinon.assert.alwaysCalledWith(FindMyDevice.endHighPriority, 'command');
    });

    test('Should do nothing if not ringing and duration is zero', function() {
      Commands.invokeCommand('ring', [0, function(retval) {}]);
      assert.isTrue(Commands._ringer.paused, 'must not have started');
      assert.isNull(Commands._ringTimeoutId);
      sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
      sinon.assert.alwaysCalledWith(FindMyDevice.beginHighPriority, 'command');
      sinon.assert.calledOnce(FindMyDevice.endHighPriority);
      sinon.assert.alwaysCalledWith(FindMyDevice.endHighPriority, 'command');
    });
  });

  test('Erase: ensure factoryReset is called with "wipe"', function(done) {
    subject.invokeCommand('erase', [function(retval, error) {
      assert.equal(navigator.mozPower.factoryReset.calledWith('wipe'), true);
      done();
    }]);
  });

  suite('Track command', function() {
    test('Track receives positions correctly', function() {
      // track for a period of time
      var duration = (subject.TRACK_UPDATE_INTERVAL_MS) / 1000;
      subject.invokeCommand('track', [duration, function(retval, position) {
        assert.equal(retval, true);
        // ensure, while tracking, the locations match what the mock makes
        assert.deepEqual(position, MockGeolocation.fakePosition ,
          'check the position is what the mock provided');
      }]);
      fakeClock.tick(2* subject.TRACK_UPDATE_INTERVAL_MS);
    });

    test('Track command', function() {
      // track for 3 intervals
      var duration = (3 * subject.TRACK_UPDATE_INTERVAL_MS) / 1000;
      subject.invokeCommand('track', [duration, function(retval, position) {}]);

      // after 2 intervals...
      fakeClock.tick(2 * subject.TRACK_UPDATE_INTERVAL_MS);
      // we're mid-track, check we have a watch and timeout IDs
      assert.notEqual(subject._watchPositionId, null);
      assert.notEqual(subject._trackTimeoutId, null);

      // after another interval...
      fakeClock.tick(1 * subject.TRACK_UPDATE_INTERVAL_MS);
      // .. tracking should have stopped.
      // ensure we no longer have track and watch IDs.
      assert.equal(subject._trackTimeoutId, null);
      assert.equal(subject._watchPositionId, null);

      sinon.assert.alwaysCalledWith(FindMyDevice.beginHighPriority, 'command');
      sinon.assert.alwaysCalledWith(FindMyDevice.endHighPriority, 'command');

      // check wakelock count
      var begin = FindMyDevice.beginHighPriority.callCount;
      var end = FindMyDevice.beginHighPriority.callCount;
      assert.equal(begin, end, 'begin and end count should match');
    });

    // We assume for this test that the interval used by the geolocation mock
    // is significantly smaller than TRACK_UPDATE_INTERVAL.
    test('Track command should throttle observed positions', function() {
      // track for a long duration (e.g. 10 intervals)
      var duration = 10 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      var positions = 0;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      // set the clock to just before the interval, ensure no locations are seen
      var amountBefore = 2;
      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS - amountBefore);
      assert.equal(positions, 0, 'no update intervals should have passed');
      // set the clock to almost two intervals, ensure only one location is seen
      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
      assert.equal(positions, 1, '1 update interval should have passed');
    });

    test('Track command should update its duration if invoked while running',
    function() {
      // track for a long duration (e.g. 10 intervals)
      var duration = 10 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      var positions = 0;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      // ensure the position count updates as expected (one position per
      // interval)
      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
      assert.equal(positions, 1, '1 update interval should have passed');

      // reset the duration to a shorter value:
      duration = 2 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      // allow the timer to progress to after the duration completes
      fakeClock.tick(5 * subject.TRACK_UPDATE_INTERVAL_MS);

      // ensure tracking stopped at the end of the new duration:
      // position count should be at 3
      assert.equal(positions, 3, '2 more (3) intervals should have passed');

      // and the track and watch IDs should be null
      assert.equal(subject._trackTimeoutId, null);
      assert.equal(subject._watchPositionId, null);

      // check wakelock count
      var begin = FindMyDevice.beginHighPriority.callCount;
      var end = FindMyDevice.beginHighPriority.callCount;
      assert.equal(begin, end, 'begin and end count should match');
    });

    test('Track command should stop if duration is zero',
    function() {
      // track for a long duration (e.g. 10 intervals)
      var duration = 10 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      var positions = 0;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);

      // after a single interval, stop the tracking
      subject.invokeCommand('track', [0, function(retval) {
        assert.equal(retval, true);
      }]);

      // allow more intervals to pass
      fakeClock.tick(2 * subject.TRACK_UPDATE_INTERVAL_MS);

      // and ensure the position count remains at 1
      assert.equal(positions, 1);

      // check the track and watch IDs should be null
      assert.equal(subject._trackTimeoutId, null);
      assert.equal(subject._watchPositionId, null);
    });

    test('track should not leak wakelocks with nonzero duration', function() {
      // start tracking
      var duration = 9 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      subject.invokeCommand('track', [duration, function() {}]);

      // once tracking is complete, check the wakelock call counts match
      fakeClock.tick(10 * subject.TRACK_UPDATE_INTERVAL_MS);
      var begin = FindMyDevice.beginHighPriority.callCount;
      var end = FindMyDevice.beginHighPriority.callCount;
      assert.equal(begin, end, 'begin and end count should match');
    });

    test('track should not leak wakelocks with zero duration', function() {
      subject.invokeCommand('track', [0, function() {}]);
      var begin = FindMyDevice.beginHighPriority.callCount;
      var end = FindMyDevice.beginHighPriority.callCount;
      assert.equal(begin, end, 'begin and end count should match');
    });

    test('track should not leak wakelocks if stopped mid-track', function() {
      // track for a long duration (e.g. 10 intervals)
      var duration = 10 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      subject.invokeCommand('track', [duration, function() {}]);

      // after a single interval, stop the tracking
      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
      subject.invokeCommand('track', [0, function(retval) {}]);

      // go past the original duration
      fakeClock.tick(10 * subject.TRACK_UPDATE_INTERVAL_MS);

      // check the wakelock call counts
      var begin = FindMyDevice.beginHighPriority.callCount;
      var end = FindMyDevice.beginHighPriority.callCount;
      assert.equal(begin, end, 'begin and end count should match');
    });
  });

  test('Bug 1027325 - correctly check that passcode lock is set', function() {
    MockSettingsListener.mTriggerCallback('lockscreen.enabled', true);
    MockSettingsListener.mTriggerCallback('lockscreen.passcode-lock.enabled',
      '1234');
    assert.equal(true, subject.deviceHasPasscode());
  });

  test('Bug 1027325 - correctly check that passcode lock is unset', function() {
    MockSettingsListener.mTriggerCallback('lockscreen.enabled', false);
    MockSettingsListener.mTriggerCallback('lockscreen.passcode-lock.enabled',
      false);
    assert.equal(false, subject.deviceHasPasscode());
  });

  test('Bug 1027325 - correctly check that lockscreen is set, but passcode ' +
       'lock is unset', function() {
    MockSettingsListener.mTriggerCallback('lockscreen.enabled', true);
    MockSettingsListener.mTriggerCallback('lockscreen.passcode-lock.enabled',
      false);
    assert.equal(false, subject.deviceHasPasscode());
  });

  test('List of accepted commands', function() {
    MockSettingsListener.mTriggerCallback('geolocation.enabled', true);

    var allCommands = ['track', 'erase', 'ring', 'lock'];
    var enabledCommands = subject.getEnabledCommands();
    assert.deepEqual(enabledCommands.sort(), allCommands.sort());

    // track should be disabled when geolocation is disabled
    MockSettingsListener.mTriggerCallback('geolocation.enabled', false);
    allCommands = ['erase', 'ring', 'lock'];
    enabledCommands = subject.getEnabledCommands();
    assert.deepEqual(enabledCommands.sort(), allCommands.sort());
  });

  teardown(function() {
    // clean up sinon.js stubs
    navigator.mozPower.factoryReset.restore();

    navigator.mozPower = realMozPower;
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;

    delete window.DUMP;

    fakeClock.restore();

    delete window.FindMyDevice;
  });
});



suite('FindMyDevice (with real clock) >', function() {
  var realMozSettings;

  mocksForFindMyDevice.attachTestHelpers();

  var subject;
  setup(function(done) {


        // replace shared/js/dump.js
    window.DUMP = function() {};

        realMozSettings = navigator.mozSettings;
    MockNavigatorSettings.mSetup();
    navigator.mozSettings = MockNavigatorSettings;

    window.FindMyDevice = {
      beginHighPriority: this.sinon.stub(),
      endHighPriority: this.sinon.stub()
    };

    require('/js/commands.js', function() {
      subject = Commands;
      done();
    });
  });

  test('Lock command', function(done) {
    var code = '1234', message = 'locked!';
    var DIGEST_VALUE = 'lockscreen.passcode-lock.digest.value';
    var l = MockSettingsListener.getSettingsLock();
    var oldDigest = l.get(DIGEST_VALUE);

    subject.invokeCommand('lock', [message, code, function(retval) {
      assert.equal(retval, true);
      sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'command');
      sinon.assert.calledWith(FindMyDevice.endHighPriority, 'command');
      var lock = MockSettingsListener.getSettingsLock().locks.pop();
      assert.deepEqual({
        'lockscreen.enabled': true,
        'lockscreen.notifications-preview.enabled': false,
        'lockscreen.passcode-lock.enabled': true,
        'lockscreen.lock-message': message,
        'lockscreen.lock-immediately': true
      }, lock, 'check that the correct settings were set');
      assert.notEqual(oldDigest, lock[DIGEST_VALUE],
        'check that Passcode digest changed');

      done();
    }]);

  });
  teardown(function() {
    // clean up sinon.js stubs
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();
    delete window.DUMP;
    delete window.FindMyDevice;
  });
});
