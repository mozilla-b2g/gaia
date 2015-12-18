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
        'audiochanneltestapp1.gaiamobile.org': __dirname +
          '/../apps/audio_channel_test_app',
        'audiochanneltestapp2.gaiamobile.org': __dirname +
          '/../apps/audio_channel_test_app'
      }
    }
  });

  var sys, testApp1, testApp2;

  suite('Normal audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
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

    test('Normal channel competes with notification channel', function() {
      assertPolicy3('normal', 'notification');
    });

    test('Normal channel competes with ' +
         'public notification channel', function() {
      assertPolicy3('normal', 'publicnotification');
    });
  });

  suite('Content audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    test('Content channel competes with normal channel', function() {
      assertPolicy1('content', 'normal');
    });

    test('Content channel competes with content channel', function() {
      assertPolicy2('content', 'content');
    });

    test('Content channel competes with alarm channel', function() {
      assertPolicy2('content', 'alarm');
    });

    test('Content channel competes with system channel', function() {
      assertPolicy0('content', 'system');
    });

    test('Content channel competes with ringer channel', function() {
      assertPolicy2('content', 'ringer');
    });

    test('Content channel competes with telephony channel', function() {
      assertPolicy2('content', 'telephony');
    });

    test('Content channel competes with notification channel', function() {
      assertPolicy3('content', 'notification');
    });

    test('Content channel competes with ' +
         'public notification channel', function() {
      assertPolicy3('content', 'publicnotification');
    });
  });

  suite('Alarm audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    test('Alarm channel competes with normal channel', function() {
      assertPolicy0('alarm', 'normal');
    });

    test('Alarm channel competes with content channel', function() {
      assertPolicy0('alarm', 'content');
    });

    test('Alarm channel competes with alarm channel', function() {
      assertPolicy1('alarm', 'alarm');
    });

    test('Alarm channel competes with system channel', function() {
      assertPolicy0('alarm', 'system');
    });

    test('Alarm channel competes with ringer channel', function() {
      assertPolicy3('alarm', 'ringer');
    });

    test('Alarm channel competes with telephony channel', function() {
      assertPolicy3('alarm', 'telephony');
    });

    test('Alarm channel competes with notification channel', function() {
      assertPolicy0('alarm', 'notification');
    });

    test('Alarm channel competes with public notification channel', function() {
      assertPolicy0('alarm', 'publicnotification');
    });
  });

  suite('System audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    test('System channel competes with normal channel', function() {
      assertPolicy0('system', 'normal');
    });

    test('System channel competes with content channel', function() {
      assertPolicy0('system', 'content');
    });

    test('System channel competes with alarm channel', function() {
      assertPolicy0('system', 'alarm');
    });

    test('System channel competes with system channel', function() {
      assertPolicy0('system', 'system');
    });

    test('System channel competes with ringer channel', function() {
      assertPolicy0('system', 'ringer');
    });

    test('System channel competes with telephony channel', function() {
      assertPolicy0('system', 'telephony');
    });

    test('System channel competes with notification channel', function() {
      assertPolicy0('system', 'notification');
    });

    test('System channel competes with ' +
         'public notification channel', function() {
      assertPolicy0('system', 'publicnotification');
    });
  });

  suite('Ringer audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    test('Ringer channel competes with normal channel', function() {
      assertPolicy0('ringer', 'normal');
    });

    test('Ringer channel competes with content channel', function() {
      assertPolicy0('ringer', 'content');
    });

    test('Ringer channel competes with alarm channel', function() {
      assertPolicy0('ringer', 'alarm');
    });

    test('Ringer channel competes with system channel', function() {
      assertPolicy0('ringer', 'system');
    });

    test('Ringer channel competes with ringer channel', function() {
      assertPolicy5('ringer', 'ringer');
    });

    test('Ringer channel competes with telephony channel', function() {
      assertPolicy0('ringer', 'telephony');
    });

    test('Ringer channel competes with notification channel', function() {
      assertPolicy0('ringer', 'notification');
    });

    test('Ringer channel competes with ' +
         'public notification channel', function() {
      assertPolicy0('ringer', 'publicnotification');
    });
  });

  suite('Telephony audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    test('Telephony channel competes with normal channel', function() {
      assertPolicy0('telephony', 'normal');
    });

    test('Telephony channel competes with content channel', function() {
      assertPolicy0('telephony', 'content');
    });

    test('Telephony channel competes with alarm channel', function() {
      assertPolicy6('telephony', 'alarm');
    });

    test('Telephony channel competes with system channel', function() {
      assertPolicy0('telephony', 'system');
    });

    test('Telephony channel competes with ringer channel', function() {
      assertPolicy6('telephony', 'ringer');
    });

    // There is no definition in the spec for telephony v.s. telephony.

    test('Telephony channel competes with notification channel', function() {
      assertPolicy6('telephony', 'notification');
    });

    test('Telephony channel competes with ' +
         'public notification channel', function() {
      assertPolicy0('telephony', 'publicnotification');
    });
  });

  suite('Notification audio channel competes with audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    test('Notification channel competes with normal channel', function() {
      assertPolicy4('notification', 'normal');
    });

    test('Notification channel competes with content channel', function() {
      assertPolicy4('notification', 'content');
    });

    test('Notification channel competes with alarm channel', function() {
      assertPolicy0('notification', 'alarm');
    });

    test('Notification channel competes with system channel', function() {
      assertPolicy0('notification', 'system');
    });

    test('Notification channel competes with ringer channel', function() {
      assertPolicy0('notification', 'ringer');
    });

    test('Notification channel competes with telephony channel', function() {
      assertPolicy0('notification', 'telephony');
    });

    test('Notification channel competes with notification channel', function() {
      assertPolicy0('notification', 'notification');
    });

    test('Notification channel competes with ' +
         'public notification channel', function() {
      assertPolicy0('notification', 'publicnotification');
    });
  });

  suite('Public notification audio channel competes with ' +
        'audio channels', function() {
    setup(function() {
      client.setScriptTimeout(20000);
      sys = new System(client);
      testApp1 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp1.gaiamobile.org');
      testApp2 = new AudioChannelTestApp(
        client, 'app://audiochanneltestapp2.gaiamobile.org');
    });

    // Fix it in Bug 1230069.
    test.skip('Public notification channel competes with ' +
              'normal channel', function() {
      assertPolicy4('publicnotification', 'normal');
    });

    // Fix it in Bug 1230069.
    test.skip('Public notification channel competes with ' +
              'content channel', function() {
      assertPolicy4('publicnotification', 'content');
    });

    test('Public notification channel competes with ' +
         'alarm channel', function() {
      assertPolicy0('publicnotification', 'alarm');
    });

    test('Public notification channel competes with ' +
         'system channel', function() {
      assertPolicy0('publicnotification', 'system');
    });

    test('Public notification channel competes with ' +
         'ringer channel', function() {
      assertPolicy0('publicnotification', 'ringer');
    });

    test('Public notification channel competes with ' +
         'telephony channel', function() {
      assertPolicy0('publicnotification', 'telephony');
    });

    test('Public notification channel competes with ' +
         'notification channel', function() {
      assertPolicy0('publicnotification', 'notification');
    });

    test('Public notification channel competes with ' +
         'public notification channel', function() {
      assertPolicy0('publicnotification', 'publicnotification');
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
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
    assert.ok(isPlaying(testApp2.origin, audioChannel2));
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
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isPlaying(testApp2.origin, audioChannel2));
    assert.ok(!isPlaying(testApp1.origin, audioChannel1));

    var testApp2Frame = sys.getAppIframe(testApp2.origin);
    client.switchToFrame(testApp2Frame);
    testApp2[audioChannel2 + 'Pause'].click();
    assert.ok(!isPlaying(testApp1.origin, audioChannel1));

    sys.waitForLaunch(testApp1.origin);
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
  }

  /**
   * Ensure the two audio channels can pass the policy 2 in the spec[1].
   * Policy 2: Pause the current channel,
   * resume the current channel after the new channel ends.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy2(audioChannel1, audioChannel2) {
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isPlaying(testApp2.origin, audioChannel2));
    assert.ok(!isPlaying(testApp1.origin, audioChannel1));

    var testApp2Frame = sys.getAppIframe(testApp2.origin);
    client.switchToFrame(testApp2Frame);
    testApp2[audioChannel2 + 'Pause'].click();
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
 
    client.switchToFrame(testApp2Frame);
    testApp2[audioChannel2 + 'Play'].click();
    assert.ok(isPlaying(testApp2.origin, audioChannel2));

    sys.waitForLaunch(testApp1.origin);
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
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
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isFadingOut(testApp1.origin, audioChannel1));
    assert.ok(isPlaying(testApp2.origin, audioChannel2));

    var testApp2Frame = sys.getAppIframe(testApp2.origin);
    client.switchToFrame(testApp2Frame);
    testApp2[audioChannel2 + 'Pause'].click();
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
    // Reenable it in Bug 1230074.
    // assert.ok(!isFadingOut(testApp1.origin, audioChannel1));
    assert.ok(!isPlaying(testApp2.origin, audioChannel2));
  }

  /**
   * Ensure the two audio channels can pass the policy 4 in the spec[1].
   * Policy 4: Volume down the new channel.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy4(audioChannel1, audioChannel2) {
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
    assert.ok(isFadingOut(testApp2.origin, audioChannel2));

    var testApp1Frame = sys.waitForLaunch(testApp1.origin);
    client.switchToFrame(testApp1Frame);
    testApp1[audioChannel1 + 'Pause'].click();
    assert.ok(!isPlaying(testApp1.origin, audioChannel1));
    assert.ok(!isFadingOut(testApp2.origin, audioChannel2));
    assert.ok(isPlaying(testApp2.origin, audioChannel2));
  }

  /**
   * Ensure the two audio channels can pass the policy 5 in the spec[1].
   * Policy 5: Vibrate the current channel.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy5(audioChannel1, audioChannel2) {
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isVibrating(testApp1.origin, audioChannel1));
    assert.ok(!isPlaying(testApp1.origin, audioChannel1));
    assert.ok(isPlaying(testApp2.origin, audioChannel2));

    // Reenable it in Bug 1230061.
    // var testApp2Frame = sys.getAppIframe(testApp2.origin);
    // client.switchToFrame(testApp2Frame);
    // testApp2[audioChannel2 + 'Pause'].click();
    // assert.ok(isPlaying(testApp1.origin, audioChannel1));
  }

  /**
   * Ensure the two audio channels can pass the policy 6 in the spec[1].
   * Policy 6: Vibrate the new channel.
   * [1]: https://bug1096163.bmoattachments.org/attachment.cgi?id=8691714#12
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function assertPolicy6(audioChannel1, audioChannel2) {
    playAudiosInDifferentApps(audioChannel1, audioChannel2);
    assert.ok(isPlaying(testApp1.origin, audioChannel1));
    assert.ok(isVibrating(testApp2.origin, audioChannel2));
    assert.ok(!isPlaying(testApp2.origin, audioChannel2));
  }

  /**
   * Play audios in different apps.
   * Play audioChannel1 in test app 1, and play audioChannel2 in test app2.
   *
   * @param {String} audioChannel1 An audio channel type.
   * @param {String} audioChannel2 An audio channel type.
   */
  function playAudiosInDifferentApps(audioChannel1, audioChannel2) {
    client.switchToFrame();

    var testApp1Frame = sys.waitForLaunch(testApp1.origin);
    client.switchToFrame(testApp1Frame);
    testApp1[audioChannel1 + 'Play'].click();

    client.switchToFrame();
    var testApp2Frame = sys.waitForLaunch(testApp2.origin);
    client.switchToFrame(testApp2Frame);
    testApp1[audioChannel2 + 'Play'].click();
  }

  /**
   * Check the audio channel is playing or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @return {Boolean} The audio channel is playing or not.
   */
  function isPlaying(url, audioChannel) {
    client.switchToFrame();
    return client.executeScript(function(url, audioChannel) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(audioChannel).isPlaying();
    }, [url, audioChannel]);
  }

  /**
   * Check the audio channel is fading out or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @return {Boolean} The audio channel is fading out or not.
   */
  function isFadingOut(url, audioChannel) {
    client.switchToFrame();
    return client.executeScript(function(url, audioChannel) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(audioChannel).isFadingOut();
    }, [url, audioChannel]);
  }

  /**
   * Check the audio channel is vibrating out or not.
   *
   * @param {String} url The App URL.
   * @param {String} audioChannel An audio channel type.
   * @return {Boolean} The audio channel is fading out or not.
   */
  function isVibrating(url, audioChannel) {
    client.switchToFrame();
    return client.executeScript(function(url, audioChannel) {
      return window.wrappedJSObject.core.appCore.appWindowManager
        .getApp(url).audioChannels.get(audioChannel).isVibrating();
    }, [url, audioChannel]);
  }
});
