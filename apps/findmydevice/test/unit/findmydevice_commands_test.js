/* global MocksHelper */
/* global MockPermissionSettings */
/* global MockSettingsListener */
/* global MockGeolocation */
/* global Commands */
/* global FindMyDevice */

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
        'lockscreen.passcode-lock.code': code,
        'lockscreen.lock-immediately': true
      }, lock, 'check that the correct settings were set');

      done();
    }]);

    fakeClock.tick();
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
        assert.equal(channel, 'content', 'use content channel');
        assert.equal(lock['audio.volume.content'], 15, 'volume set to maximum');
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

  test('Track command', function(done) {
    // we want to make sure this is set to 'allow'
    MockPermissionSettings.permissions.geolocation = 'deny';

    var times = 0;
    var duration = (5 * subject.TRACK_UPDATE_INTERVAL_MS) / 1000;
    subject.invokeCommand('track', [duration, function(retval, position) {
      assert.equal(retval, true);
      assert.equal(MockPermissionSettings.permissions.geolocation, 'allow');
      assert.deepEqual(position, MockGeolocation.fakePosition);

      if (times++ === 3) {
        assert.notEqual(subject._trackIntervalId, null);
        assert.notEqual(subject._trackTimeoutId, null);
        fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
        assert.equal(retval, true);
        assert.equal(subject._trackTimeoutId, null);
        assert.equal(subject._trackIntervalId, null);
        sinon.assert.calledWith(FindMyDevice.endHighPriority, 'command');
        done();
      }

      fakeClock.tick(subject.TRACK_UPDATE_INTERVAL_MS);
    }]);

    sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'command');
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

      duration = 2 * subject.TRACK_UPDATE_INTERVAL_MS / 1000;
      subject.invokeCommand('track', [duration, function(retval, position) {
        positions++;
      }]);

      fakeClock.tick(5 * subject.TRACK_UPDATE_INTERVAL_MS);

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

    // clean up sinon.js stubs
    navigator.mozPower.factoryReset.restore();

    navigator.mozPower = realMozPower;
    navigator.mozApps = realMozApps;

    delete window.DUMP;

    fakeClock.restore();

    delete window.FindMyDevice;
  });
});
