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
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_device_storage.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_permission_settings.js');

var mocksForFindMyDevice = new MocksHelper([
  'SettingsListener', 'SettingsURL', 'Audio', 'DeviceStorage', 'Geolocation'
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

    subject.lock(message, code, function(retval) {
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
    });

    fakeClock.tick();
  });

  test('Ring command', function(done) {
    var duration = 2;
    var ringtone = 'user selected ringtone';

    MockSettingsListener.mCallbacks['dialer.ringtone'](ringtone);

    subject.ring(duration, function(retval) {
      var lock = MockSettingsListener.getSettingsLock().locks.pop();

      var ringer = subject._ringer;
      var channel = ringer.mozAudioChannel;
      assert.equal(channel, 'content', 'use content channel');
      assert.equal(lock['audio.volume.content'], 15, 'volume set to maximum');
      assert.equal(ringer.paused, false, 'must be playing');
      assert.equal(ringer.src, ringtone, 'must use ringtone');

      setTimeout(function() {
        assert.equal(ringer.paused, true, 'must have stopped');
        done();
      }, duration * 1000);

      fakeClock.tick(duration * 1000);
    });

    fakeClock.tick();
  });

  test('Erase command', function(done) {
    subject.erase(function(retval, error) {
      var instances = MockDeviceStorage.instances;
      for (var i = 0; i < instances.length; i++) {
        // check that we deleted everything on the device storage
        assert.deepEqual(instances[i].entries, []);
      }

      assert.equal(navigator.mozPower.factoryResetCalled, true);
      done();
    });

    fakeClock.tick();
  });

  test('Track command', function(done) {
    // we want to make sure this is set to 'allow'
    MockPermissionSettings.permissions.geolocation = 'deny';

    var times = 0;
    subject.track(30, function(retval, position) {
      assert.equal(retval, true);
      assert.equal(MockPermissionSettings.permissions.geolocation, 'allow');
      assert.equal(position.coords.latitude, MockGeolocation.latitude);
      assert.equal(position.coords.longitude, MockGeolocation.longitude);

      if (times++ === 3) {
        // stop tracking after a few positions
        subject.track(0, function(retval) {
          assert.equal(retval, true);
          assert.deepEqual(MockGeolocation.activeWatches, []);
          done();
        });
      }
    });

    fakeClock.tick();
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
