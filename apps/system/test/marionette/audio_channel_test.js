/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var FakeAlarm = require('./lib/fakealarmapp');
var FakeMusic = require('./lib/fake_music');
var System = require('./lib/system');

marionette('Audio channel', function() {
  var client = marionette.client({
    apps: {
      'fakealarmapp.gaiamobile.org': __dirname + '/fakealarmapp',
      'fakemusic.gaiamobile.org': __dirname + '/fakemusic'
    },
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
    }
  });

  var fakeAlarm, fakeMusic, sys;

  suite('Two apps play audio', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      fakeAlarm = new FakeAlarm(client);
      fakeMusic = new FakeMusic(client);
      sys = new System(client);
      addAudioChannelListener();
      client.fileManager.removeAllFiles();
      client.fileManager.add([
        { type: 'music', filePath: 'test_media/samples/Music/b2g.ogg' }
      ]);
    });

    test('Play alarm during content is playing', function() {
      sys.waitForLaunch(fakeMusic.origin);
      waitForAudioChannelChanged('content');
      sys.waitForLaunch(fakeAlarm.origin);
      waitForAudioChannelChanged('alarm');
    });
  });

  /**
   * Add a event listener to listen mozChromeEvent
   * to get the playing audio channel,
   * and put the channel name into `currentAudioChannel` dateset
   * of the body element.
   */
  function addAudioChannelListener() {
    client.executeScript(function() {
      window.addEventListener('mozChromeEvent', function(evt) {
        document.querySelector('body').
          dataset.currentAudioChannel = evt.detail.channel;
      });
    });
  }

  /**
   * Wait for audio channel changs to specified channel.
   */
  function waitForAudioChannelChanged(audioChannel) {
    client.waitFor(function() {
      return client.executeScript(function() {
        return document.querySelector('body').dataset.currentAudioChannel;
      }) === audioChannel;
    });
  }
});
