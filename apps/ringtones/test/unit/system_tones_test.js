/* global assert, MockNavigatorSettings, Promise, require, setup, suite,
   teardown, test */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/js/built_in_ringtones.js');
require('/js/system_tones.js');

function DummyTone(name, id, blob) {
  this.name = name;
  this.id = id;
  this.blob = blob;
}

DummyTone.prototype = {
  getBlob: function() {
    return new Promise(function(resolve, reject) {
      resolve(this.blob);
    }.bind(this));
  }
};

function getSettingsBase(toneType) {
  switch (toneType) {
  case 'ringtone':
    return 'dialer.ringtone';
  case 'alerttone':
    return 'notification.ringtone';
  default:
    throw new Error('tone type not supported');
  }
}

function getSettings(settingsKeys) {
  return Promise.all(settingsKeys.map(function(setting) {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozSettings.createLock().get(setting);
      req.onsuccess = function() {
        resolve(req.result[setting]);
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  }));
}

suite('system tones', function() {

  var nativeSettings;

  setup(function() {
    nativeSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    // Mock mozL10n so that setTone works.
    navigator.mozL10n = {
      once: function(callback) {
        callback();
      },

      get: function(key) {
        return null;
      }
    };
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    navigator.mozSettings = nativeSettings;
  });

  suite('systemTones.set()', function() {
    ['ringtone', 'alerttone'].forEach(function(toneType) {

      test(toneType, function(done) {
        var tone = new DummyTone('My Tone', 'id', null);
        var key = getSettingsBase(toneType);
        var settingsKeys = [key, key + '.name', key + '.id'];

        window.systemTones.set(toneType, tone).then(
          getSettings.bind(null, settingsKeys)
        ).then(
          function(settings) {
            done(function() {
              assert.equal(settings[0], null);
              assert.equal(settings[1], 'My Tone');
              assert.equal(settings[2], 'id');
            });
          },
          function(error) {
            done(error);
          }
        );
      });

    });
  });

  suite('systemTones.getDefault()', function() {
    var defaultIDs = {};

    setup(function(done) {
      var settings = {};
      settings[getSettingsBase('ringtone') + '.default.id'] =
        defaultIDs.ringtone = 'builtin:ringtone/ringer_firefox';
      settings[getSettingsBase('alerttone') + '.default.id'] =
        defaultIDs.alerttone = 'builtin:alerttone/notifier_firefox';

      var req = navigator.mozSettings.createLock().set(settings);
      req.onsuccess = function() { done(); };
      req.onerror = function() {
        done(req.error);
      };
    });

    ['ringtone', 'alerttone'].forEach(function(toneType) {

      test(toneType, function(done) {
        window.systemTones.getDefault(toneType).then(function(tone) {
          done(function() {
            assert.equal(tone.id, defaultIDs[toneType]);
            assert.equal(tone.shareable, true);
            assert.equal(tone.deletable, false);
          });
        }, function(error) {
          done(error);
        });
      });

    });
  });

  suite('systemTones.isInUse()', function() {
    ['ringtone', 'alerttone'].forEach(function(toneType) {

      test(toneType + ', in use', function(done) {
        var tone = new DummyTone('My Tone', 'id', null);

        window.systemTones.set(toneType, tone).then(function() {
          return window.systemTones.isInUse(tone);
        }).then(
          function(inUseAs) {
            done(function() {
              assert.equal(inUseAs.length, 1);
              assert.equal(inUseAs[0], toneType);
            });
          },
          function(error) {
            done(error);
          }
        );
      });

      test(toneType + ', not in use', function(done) {
        var tone = new DummyTone('My Tone', 'id', null);
        var unusedTone = new DummyTone('My Other Tone', 'id2', null);

        window.systemTones.set(toneType, tone).then(function() {
          return window.systemTones.isInUse(unusedTone);
        }).then(
          function(inUseAs) {
            done(function() {
              assert.equal(inUseAs.length, 0);
            });
          },
          function(error) {
            done(error);
          }
        );
      });

    });

    test('ringtone and alerttone, in use', function(done) {
      var tone = new DummyTone('My Tone', 'id', null);

      window.systemTones.set('ringtone', tone).then(function() {
        return window.systemTones.set('alerttone', tone);
      }).then(function() {
        return window.systemTones.isInUse(tone);
      }).then(
        function(inUseAs) {
          done(function() {
            assert.equal(inUseAs.length, 2);
            assert.equal(inUseAs[0], 'ringtone');
            assert.equal(inUseAs[1], 'alerttone');
          });
        },
        function(error) {
          done(error);
        }
      );
    });

  });

});
