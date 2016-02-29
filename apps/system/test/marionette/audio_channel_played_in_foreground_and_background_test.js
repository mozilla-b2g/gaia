/* jshint node: true*/
/* global marionette, setup, test*/
'use strict';

var System = require('./lib/system');
var AudioChannelTestApp = require('./lib/audio_channel_test_app.js');
var AudioChannelHelper = require('./lib/audio_channel_helper.js');

marionette('Audio channel played in foreground and background', function() {
  var client = marionette.client({
    profile: {
      apps: {
        'audiochanneltestapp.gaiamobile.org': __dirname +
          '/../apps/audio_channel_test_app'
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var sys, testApp, helper;

  setup(function() {
    client.setScriptTimeout(20000);
    sys = new System(client);
    testApp = new AudioChannelTestApp(
      client, 'app://audiochanneltestapp.gaiamobile.org');
    helper = new AudioChannelHelper(client);
  });

  ['normal', 'content', 'alarm', 'system', 'ringer', 'telephony',
   'notification', 'publicnotification'].forEach(function(audioChannel) {
    suite(audioChannel + ' audio channel', function() {
      test(audioChannel + ' audio channel can be played in foreground',
        function() {
        playAudioChannel(audioChannel);
        helper.isPlaying(testApp.origin, audioChannel, true);
      });

      test(audioChannel + ' audio channel can be played in background',
        function() {
        playAudioChannelInBackground(audioChannel);
        helper.isPlaying(testApp.origin, audioChannel, true);
      });
    });
  });

  function playAudioChannelInBackground(audioChannel) {
    playAudioChannel(audioChannel);
    sys.goHome();
  }

  function playAudioChannel(audioChannel) {
    client.switchToFrame();
    var testAppFrame = sys.waitForLaunch(testApp.origin);
    client.switchToFrame(testAppFrame);
    testApp[audioChannel + 'Play'].click();
  }
});
