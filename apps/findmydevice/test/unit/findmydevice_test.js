/* global MocksHelper */
/* global MockPermissionSettings */
/* global MockSettingsListener */
/* global MockDeviceStorage */
/* global MockGeolocation */
/* global Commands */

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_device_storage.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_permission_settings.js');

var mocksForFindMyDevice = new MocksHelper([
  'SettingsListener', 'SettingsURL', 'SettingsHelper', 'Audio',
  'DeviceStorage', 'Geolocation'
]).init();

suite('FindMyDevice >', function() {
  var realL10n;
  var realPermissionSettings;
  var realMozPower;
  var realMozApps;
  var fakeClock;

  mocksForFindMyDevice.attachTestHelpers();

  var subject;
  setup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      once: function(callback) {
        callback();
      }
    };

    realPermissionSettings = navigator.mozPermissionSettings;
    navigator.mozPermissionSettings = MockPermissionSettings;
    MockPermissionSettings.mSetup();

    realMozPower = navigator.mozPower;
    navigator.mozPower = {
      factoryResetCalled: false,
      factoryReset: function() {
        this.factoryResetCalled = true;
      }
    };

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

    require('/js/commands.js', function() {
      subject = Commands;
      done();
    });
  });

  test('Lock command', function(done) {
    var code = '1234', message = 'locked!';

    subject.invokeCommand('lock', [message, code, function(retval) {
      assert.equal(retval, true);

      var lock = MockSettingsListener.getSettingsLock().locks.pop();
      assert.deepEqual({
        'lockscreen.enabled': true,
        'lockscreen.notifications-preview.enabled': false,
        'lockscreen.passcode-lock.enabled': true,
        'lockscreen.lock-message': message,
        'lockscreen.passcode-lock.code': code,
        'lockscreen.lock-immediately': true
      }, lock, 'check that the correct settings were set');

      done();
    }]);

    fakeClock.tick();
  });

  test('Ring command', function(done) {
    var duration = 2;
    var ringtone = 'user selected ringtone';

    MockSettingsListener.mCallbacks['dialer.ringtone'](ringtone);

    subject.invokeCommand('ring', [duration, function(retval) {
      var lock = MockSettingsListener.getSettingsLock().locks.pop();

      var ringer = subject._ringer;
      var channel = ringer.mozAudioChannelType;
      assert.equal(channel, 'content', 'use content channel');
      assert.equal(lock['audio.volume.content'], 15, 'volume set to maximum');
      assert.equal(ringer.paused, false, 'must be playing');
      assert.equal(ringer.src, ringtone, 'must use ringtone');

      setTimeout(function() {
        assert.equal(ringer.paused, true, 'must have stopped');
        done();
      }, duration * 1000);

      fakeClock.tick(duration * 1000);
    }]);

    fakeClock.tick();
  });

  test('Erase command', function(done) {
    // Meta-mock the mock getDeviceStorage so it returns null
    // for some storage types
    var mockGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = function(storage) {
      if (storage === 'apps' || storage == 'sdcard') {
        return null;
      }

      return mockGetDeviceStorage(storage);
    };

    subject.invokeCommand('erase', [function(retval, error) {
      var instances = MockDeviceStorage.instances;
      for (var i = 0; i < instances.length; i++) {
        // check that we deleted everything on the device storage
        assert.deepEqual(instances[i].entries, []);
      }

      assert.equal(navigator.mozPower.factoryResetCalled, true);
      navigator.getDeviceStorage = mockGetDeviceStorage;
      done();
    }]);

    fakeClock.tick();
  });

  test('Erase command with no device storages', function(done) {
    // Meta-mock the mock getDeviceStorage so it returns null
    // for all storage types. We must still factory reset in this case.
    var mockGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = function(storage) {
      return null;
    };

    subject.invokeCommand('erase', [function(retval, error) {
      assert.deepEqual(MockDeviceStorage.instances, []);
      assert.equal(navigator.mozPower.factoryResetCalled, true);
      navigator.getDeviceStorage = mockGetDeviceStorage;
      done();
    }]);

    fakeClock.tick();
  });

  test('Track command', function(done) {
    // we want to make sure this is set to 'allow'
    MockPermissionSettings.permissions.geolocation = 'deny';

    var times = 0;
    var duration = (3 * subject.TRACK_UPDATE_INTERVAL_MS)/ 1000;
    subject.invokeCommand('track', [duration, function(retval, position) {
      assert.equal(retval, true);
      assert.equal(MockPermissionSettings.permissions.geolocation, 'allow');
      assert.equal(position.coords.latitude, MockGeolocation.latitude);
      assert.equal(position.coords.longitude, MockGeolocation.longitude);

      if (times++ === 3) {
        assert.notEqual(subject._trackIntervalId, null);
        assert.notEqual(subject._trackTimeoutId, null);
        fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
        assert.equal(retval, true);
        assert.equal(subject._trackTimeoutId, null);
        assert.equal(subject._trackIntervalId, null);
        done();
      }

      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
    }]);

    fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
  });

  test('Track command should update its duration if invoked while running',
    function(done) {
      var duration = 10 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;

      var positions = 0;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);

      duration = (subject.TRACK_UPDATE_INTERVAL_MS - 1000)/ 1000;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      fakeClock.tick(2 * subject.TRACK_UPDATE_INTERVAL_MS);

      assert.equal(positions, 2);
      assert.equal(subject._trackTimeoutId, null);
      assert.equal(subject._trackIntervalId, null);
      done();
  });

  test('Track command should stop if duration is zero',
    function(done) {
      var duration = 10 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;

      var positions = 0;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);

      subject.invokeCommand('track', [0, function(retval) {
        assert.equal(retval, true);
        fakeClock.tick(2 * subject.TRACK_UPDATE_INTERVAL_MS);
        assert.equal(positions, 1);
        assert.equal(subject._trackTimeoutId, null);
        assert.equal(subject._trackIntervalId, null);
        done();
      }]);
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
    navigator.mozL10n = realL10n;

    MockPermissionSettings.mTeardown();
    navigator.mozPermissionSettings = realPermissionSettings;

    navigator.mozPower = realMozPower;
    navigator.mozApps = realMozApps;

    delete window.DUMP;

    fakeClock.restore();
  });
});
