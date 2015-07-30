/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var FakeMediaApp = require('./lib/fakemediaapp.js');
var FakeAlarmApp = require('./lib/fakealarmapp.js');
var FakeNotificationApp = require('./lib/fakenotificationapp.js');
var SoundToast = require('./lib/soundtoast.js');

marionette('Sound manager tests', function() {
  var apps = {};
  apps[FakeMediaApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakemediaapp';
  apps[FakeAlarmApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakealarmapp';
  apps[FakeNotificationApp.DEFAULT_ORIGIN] =
    __dirname + '/../apps/fakenotificationapp';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var soundToast;
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    soundToast = new SoundToast(client);
  });

  suite('Display correct volume bar for the apps', function() {
    var fakemediaapp;
    var fakealarmapp;
    var fakenotificationapp;

    setup(function() {
      fakemediaapp = new FakeMediaApp(client);
      fakealarmapp = new FakeAlarmApp(client);
      fakenotificationapp = new FakeNotificationApp(client);
    });

    test('Display media volume bar for media app', function() {
      fakemediaapp.launch();
      fakemediaapp.waitForTitleShown(true);

      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForMediaVolumeShown(true, false);
    });

    test('Display alarm volume bar for alarm app', function() {
      fakealarmapp.launch();
      fakealarmapp.waitForTitleShown(true);

      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        // Because mozAudioChannelManager only works on device, so here we
        // simulate the api to fire a same mozChromeEvent then trigger the
        // sound manager to activate the alarm volume.
        if (!navigator.mozAudioChannelManager) {
          var evt = new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'default-volume-channel-changed',
              channel: 'alarm'
            }
          });
          window.wrappedJSObject.dispatchEvent(evt);
        }

        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForAlarmVolumeShown(true, false);
    });

    test('Display notification volume bar for notification app', function() {
      fakenotificationapp.launch();
      fakenotificationapp.waitForTitleShown(true);

      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        // Because mozAudioChannelManager only works on device, so here we
        // simulate the api to fire a same mozChromeEvent then trigger the
        // sound manager to activate the notification volume.
        if (!navigator.mozAudioChannelManager) {
          var evt = new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'default-volume-channel-changed',
              channel: 'notification'
            }
          });
          window.wrappedJSObject.dispatchEvent(evt);
        }

        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForNotificationVolumeShown(true, false, true);
    });

    test('Display telephony volume bar', function() {
      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        // Simulate the telephony api to fire a same mozChromeEvent then trigger
        // the sound manager to activate the telephony volume.
        var evt = new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'default-volume-channel-changed',
            channel: 'telephony'
          }
        });
        window.wrappedJSObject.dispatchEvent(evt);

        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForTelephonyVolumeShown(true);
    });

    test('Display bluetooth SCO volume bar', function() {
      // Switch to system then fire bluetooth-volumeset to display the volume.
      client.switchToFrame();
      client.executeScript(function() {
        // Simulate the bluetooth api to fire a same mozChromeEvent then trigger
        // the sound manager to activate the bluetooth SCO volume.
        var evt = new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'bluetooth-volumeset',
            value: 8
          }
        });
        window.wrappedJSObject.dispatchEvent(evt);
      });

      soundToast.waitForBluetoothSCOVolumeShown(true);
    });
  });

  suite('Display correct muted volume bar for the apps', function() {
    var fakemediaapp;
    var fakealarmapp;
    var fakenotificationapp;

    setup(function() {
      fakemediaapp = new FakeMediaApp(client);
      fakealarmapp = new FakeAlarmApp(client);
      fakenotificationapp = new FakeNotificationApp(client);

      // Set the volumes to the one before mute.
      client.settings.set('audio.volume.content', 1);
      client.settings.set('audio.volume.alarm', 1);
      client.settings.set('audio.volume.notification', 0);
    });

    test('Display muted media volume bar for media app', function() {
      fakemediaapp.launch();
      fakemediaapp.waitForTitleShown(true);

      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForMediaVolumeShown(true, true);
    });

    test('Display muted alarm volume bar for alarm app', function() {
      fakealarmapp.launch();
      fakealarmapp.waitForTitleShown(true);

      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        // Because mozAudioChannelManager only works on device, so here we
        // simulate the api to fire a same mozChromeEvent then trigger the
        // sound manager to activate the alarm volume.
        if (!navigator.mozAudioChannelManager) {
          var evt = new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'default-volume-channel-changed',
              channel: 'alarm'
            }
          });
          window.wrappedJSObject.dispatchEvent(evt);
        }

        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForAlarmVolumeShown(true, true);
    });

    test(
      'Display muted notification volume bar for notification app', function() {
        fakenotificationapp.launch();
        fakenotificationapp.waitForTitleShown(true);

        // Switch to system then fire volumedown to display the volume bar.
        client.switchToFrame();
        client.executeScript(function() {
          // Because mozAudioChannelManager only works on device, so here we
          // simulate the api to fire a same mozChromeEvent then trigger the
          // sound manager to activate the notification volume.
          if (!navigator.mozAudioChannelManager) {
            var evt = new CustomEvent('mozChromeEvent', {
              detail: {
                type: 'default-volume-channel-changed',
                channel: 'notification'
              }
            });
            window.wrappedJSObject.dispatchEvent(evt);
          }

          window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
        });

        soundToast.waitForNotificationVolumeShown(true, true, false);
      }
    );
  });

  suite('Display vibration and muted volume bar for the apps', function() {
    var fakenotificationapp;

    setup(function() {
      fakenotificationapp = new FakeNotificationApp(client);

      client.settings.set('audio.volume.notification', 1);
    });

    test('Display vibration and muted notification volume bar', function() {
      fakenotificationapp.launch();
      fakenotificationapp.waitForTitleShown(true);

      // Switch to system then fire volumedown to display the volume bar.
      client.switchToFrame();
      client.executeScript(function() {
        // Because mozAudioChannelManager only works on device, so here we
        // simulate the api to fire a same mozChromeEvent then trigger the
        // sound manager to activate the notification volume.
        if (!navigator.mozAudioChannelManager) {
          var evt = new CustomEvent('mozChromeEvent', {
            detail: {
              type: 'default-volume-channel-changed',
              channel: 'notification'
            }
          });
          window.wrappedJSObject.dispatchEvent(evt);
        }

        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumedown'));
      });

      soundToast.waitForNotificationVolumeShown(true, true, true);
    });
  });

  suite('React to loud volume in media app', function() {
    var fakemediaapp;

    setup(function() {
      fakemediaapp = new FakeMediaApp(client);
      client.settings.set('audio.volume.content', 10);
    });

    test('Display loud volume warning', function() {
      fakemediaapp.launch();
      fakemediaapp.waitForTitleShown(true);

      // Switch to system then fire volumeup to trigger the warning.
      client.switchToFrame();
      client.executeScript(function() {
        var evt = new CustomEvent('mozChromeEvent', {
          detail: {
            type: 'headphones-status-changed',
            state: 'one'
          }
        });
        window.wrappedJSObject.dispatchEvent(evt);

        window.wrappedJSObject.dispatchEvent(new CustomEvent('volumeup'));
      });

      soundToast.waitForLoudWarningShown();
    });
  });
});
