/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var FakeMediaApp = require('./lib/fakemediaapp.js');
var FakeAlarmApp = require('./lib/fakealarmapp.js');
var FakeNotificationApp = require('./lib/fakenotificationapp.js');
var SoundToast = require('./lib/soundtoast.js');

marionette('Sound manager tests', function() {
  var apps = {};
  apps[FakeMediaApp.DEFAULT_ORIGIN] = __dirname + '/fakemediaapp';
  apps[FakeAlarmApp.DEFAULT_ORIGIN] = __dirname + '/fakealarmapp';
  apps[FakeNotificationApp.DEFAULT_ORIGIN] = __dirname + '/fakenotificationapp';

  var client = marionette.client({
    settings: {
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    },

    apps: apps
  });

  var soundToast;

  setup(function() {
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

      soundToast.waitForMediaVolumeShown(true);
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

      soundToast.waitForAlarmVolumeShown(true);
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

      soundToast.waitForNotificationVolumeShown(true);
    });

    test('Display notification volume bar for telephony', function() {
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
  });
});
