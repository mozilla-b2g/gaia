/* jshint node: true*/
/* global marionette, setup, suite, test*/
'use strict';

var System = require('./lib/system');
var assert = require('assert');
var AudioChannelTestApp = require('./lib/audio_channel_test_app.js');

marionette('Audio channel competing', function() {
  var client = marionette.client({
    profile: {
      apps: {
        'audiochanneltest1.gaiamobile.org': __dirname +
          '/../apps/audio_channel_test_app',
        'audiochanneltest2.gaiamobile.org': __dirname +
          '/../apps/audio_channel_test_app'
      }
    }
  });

  var sys, audioChannelTestApp1, audioChannelTestApp2;

  suite('Normal audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      audioChannelTestApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltest1.gaiamobile.org');
      audioChannelTestApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltest2.gaiamobile.org');
    });

    test('Normal channel competes with normal channel', function() {
      assertPolicy1('normal', 'normal');
    });

    test('Normal channel competes with content channel', function() {
      assertPolicy1('normal', 'content');
    });

    test('Normal channel competes with alarm channel', function() {
      assertPolicy1('normal', 'alarm');
    });

    test('Normal channel competes with system channel', function() {
      assertPolicy0('normal', 'system');
    });

    test('Normal channel competes with ringer channel', function() {
      assertPolicy1('normal', 'ringer');
    });

    test('Normal channel competes with telephony channel', function() {
      assertPolicy1('normal', 'telephony');
    });

    // Fix it in Bug 1228925.
    test.skip('Normal channel competes with notification channel', function() {
      assertPolicy3('normal', 'notification');
    });

    // Fix it in Bug 1228925.
    test.skip('Normal channel competes with' +
         'public notification channel', function() {
      assertPolicy3('normal', 'publicnotification');
    });
  });

  /**
   * Ensure the two audio channels can pass the policy 0 in the spec[1].
   * Policy 0: Play both the current and the new channels.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy0(audioChannel1, audioChannel2) {
    var testApp = sys.waitForLaunch(audioChannelTestApp1.origin);
    client.switchToFrame(testApp);
    audioChannelTestApp1[audioChannel1 + 'Play'].click();
    audioChannelTestApp1[audioChannel2 + 'Play'].click();

    client.switchToFrame();
    var isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel1]);
    assert.ok(isPlaying);
    isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel2]);
    assert.ok(isPlaying);
  }

  /**
   * Ensure the two audio channels can pass the policy 1 in the spec[1].
   * Policy 1: Pause the current channel,
   * resume the current channel after the new channel ends and
   * when app comes to foreground.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy1(audioChannel1, audioChannel2) {
    // Play an audio channel in Test App 1, and ensure it can be played.
    var testApp1 = sys.waitForLaunch(audioChannelTestApp1.origin);
    client.switchToFrame(testApp1);
    audioChannelTestApp1[audioChannel1 + 'Play'].click();

    client.switchToFrame();
    var isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel1]);
    assert.ok(isPlaying);

    // Play an audio channel in Test App 2.
    // Ensure the new audio channel can be played,
    // and the current audio channel is paused.
    var testApp2 = sys.waitForLaunch(audioChannelTestApp2.origin);
    client.switchToFrame(testApp2);
    audioChannelTestApp2[audioChannel2 + 'Play'].click();

    client.switchToFrame();
    isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp2.origin, audioChannel2]);
    assert.ok(isPlaying);
    isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel1]);
    assert.ok(!isPlaying);

    // Pause the new audio channel in Test App 2,
    // and ensure the current audio channel is still paused.
    client.switchToFrame(testApp2);
    audioChannelTestApp2[audioChannel2 + 'Pause'].click();

    client.switchToFrame();
    isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel1]);
    assert.ok(!isPlaying);

    // Open Test App 1, and ensure the current audio channel can be played.
    sys.waitForLaunch(audioChannelTestApp1.origin);

    isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel1]);
    assert.ok(isPlaying);
  }

  /**
   * Ensure the two audio channels can pass the policy 3 in the spec[1].
   * Policy 3: Volume down the current channel.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy3(audioChannel1, audioChannel2) {
    var testApp = sys.waitForLaunch(audioChannelTestApp1.origin);
    client.switchToFrame(testApp);
    audioChannelTestApp1[audioChannel1 + 'Play'].click();
    audioChannelTestApp1[audioChannel2 + 'Play'].click();

    client.switchToFrame();
    var isFadingOut = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isFadingOut();
    }, [audioChannelTestApp1.origin, audioChannel1]);
    assert.ok(isFadingOut);
    var isPlaying = client.executeScript(function(url, type) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(type).isPlaying();
    }, [audioChannelTestApp1.origin, audioChannel2]);
    assert.ok(isPlaying);
  }
});
