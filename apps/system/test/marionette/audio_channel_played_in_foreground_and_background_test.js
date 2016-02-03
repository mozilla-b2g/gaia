/* jshint node: true*/
/* global marionette, setup, test*/
'use strict';

var AudioChannelTestApp = require('./lib/audio_channel_test_app.js');
var AudioChannelHelper = require('./lib/audio_channel_helper.js');

marionette('Audio channel played in foreground and background', function() {
  var client = marionette.client({
    profile: {
      apps: {
        'audiochanneltestapp.gaiamobile.org': __dirname +
          '/../apps/audio_channel_test_app'
      }
    }
  });

  var sys, testApp, helper;

  setup(function() {
    client.setScriptTimeout(20000);
    sys = client.loader.getAppClass('system');
    testApp = new AudioChannelTestApp(
      client, 'app://audiochanneltestapp.gaiamobile.org');
    helper = new AudioChannelHelper(client);
  });

  suite('Test audio channels', function() {
    suite('normal audio channel', function() {
      var audioChannel = 'normal';
      test('can be played in background', function() {
        playAudioChannelInBackground(audioChannel);
        client.switchToFrame();
        helper.isPlaying(testApp.origin, audioChannel, true);
      });

      test('can be played in foreground', function() {
        playAudioChannel(audioChannel);
      });
    });

  //   suite('content audio channel', function() {
  //     var audioChannel = 'content';
  //     test('can be played in foreground', function() {
  //       playAudioChannel(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });

  //     test('can be played in background', function() {
  //       playAudioChannelInBackground(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });
  //   });

  //   suite('alarm audio channel', function() {
  //     var audioChannel = 'alarm';
  //     test('can be played in foreground', function() {
  //       playAudioChannel(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });

  //     test('can be played in background', function() {
  //       playAudioChannelInBackground(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });
  //   });

  //   suite('system audio channel', function() {
  //     var audioChannel = 'system';
  //     test('can be played in foreground', function() {
  //       playAudioChannel(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });

  //     test('can be played in background', function() {
  //       playAudioChannelInBackground(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });
  //   });

  //   suite('ringer audio channel', function() {
  //     var audioChannel = 'ringer';
  //     test('can be played in foreground', function() {
  //       playAudioChannel(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });

  //     test('can be played in background', function() {
  //       playAudioChannelInBackground(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });
  //   });

  //   suite('telephony audio channel', function() {
  //     var audioChannel = 'telephony';
  //     test('can be played in foreground', function() {
  //       playAudioChannel(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });

  //     test('can be played in background', function() {
  //       playAudioChannelInBackground(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });
  //   });

  //   suite('notification audio channel', function() {
  //     var audioChannel = 'notification';
  //     test('can be played in foreground', function() {
  //       playAudioChannel(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });

  //     test('can be played in background', function() {
  //       playAudioChannelInBackground(audioChannel);
  //       helper.isPlaying(testApp.origin, audioChannel, true);
  //     });
  //   });
  });

  function playAudioChannelInBackground(audioChannel) {
    console.log('IN background');
    playAudioChannel(audioChannel);
    console.log('after play');
    sys.goHome();
    console.log('after go home');
  }

  function playAudioChannel(audioChannel) {
    sys.waitForLaunch(testApp.origin);
    sys.gotoBrowser(testApp.origin + '/index.html');
    console.log('tapping', testApp[audioChannel + 'Play']);
    testApp[audioChannel + 'Play'].tap();
    console.log('switchToFrame');
    client.switchToFrame();
    console.log('isPlaying?');
    helper.isPlaying(testApp.origin, audioChannel, true);
    console.log('isPlaying!');
  }
});
