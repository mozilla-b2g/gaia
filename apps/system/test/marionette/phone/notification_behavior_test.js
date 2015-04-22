'use strict';

/* globals Notification */

var assert = require('assert'),
    NotificationList = require('../lib/notification').NotificationList,
    fs = require('fs');

var SYSTEM_APP = 'app://system.gaiamobile.org';
var SOUND_PATH = '/test/path/to/sound/file';
var SHARED_PATH = __dirname + '/../../../../../shared/test/integration/';

marionette('notification behavior tests', function() {
  var client = marionette.client();
  var notificationList = new NotificationList(client);

  test('soundFile URL should be resolved properly', function(done) {
    client.switchToFrame();
    var result = client.executeAsyncScript(function() {
      var notification;
      notification = new Notification('testtitle', {mozbehavior: {}});
      window.addEventListener('mozChromeNotificationEvent', function(evt) {
        var rv = evt.detail.mozbehavior.soundFile === '';
        marionetteScriptFinished(rv);
      });
    });

    assert.equal(result, true, 'mozbehavior.soundFile should be empty string');

    result = client.executeAsyncScript(function(app_url, sound_path) {
      var notification;
      notification = new Notification('testtitle',
        {mozbehavior: {soundFile: sound_path}});
      window.addEventListener('mozChromeNotificationEvent', function(evt) {
        var sound_url = app_url + sound_path;
        var rv = evt.detail.mozbehavior.soundFile === sound_url;
        marionetteScriptFinished(rv);
      });
    }, [SYSTEM_APP, SOUND_PATH]);

    assert.equal(result, true, 'mozbehavior.soundFile should match');
    done();
  });

  test('noclear=true should prevent clearAll notifications', function(done) {
    client.switchToFrame();

    // close all the notifications
    var result = client.executeAsyncScript(function() {
      Notification.get().then(function(notifications) {
        notifications.map(function(n) { n.close(); });
        marionetteScriptFinished(true);
      });
    });

    notificationList.refresh();
    var count = notificationList.notifications.length;
    client.waitFor(function() {
      return count === 0;
    });
    assert.equal(count, 0, 'all notifications should be cleared');

    // create 2 notifications: one that cannot be cleared using the ClearAll
    // button and a regular notification
    result = client.executeAsyncScript(function() {
      var notification;
      notification = new Notification('title', {
        mozbehavior: {noclear:true}});
      window.addEventListener('mozChromeNotificationEvent', function(evt) {
        marionetteScriptFinished(evt.detail.mozbehavior.noclear);
      });
    });

    assert.equal(result, true, 'mozbehavior.noclear should be true');

    client.executeAsyncScript(function() {
      var notification;
      notification = new Notification('title2');
      notification.onshow = function() { marionetteScriptFinished(true); };
    });

    notificationList.refresh();
    assert.equal(notificationList.notifications.length, 2,
                 'unexpected number of notifications');
    // Adding a new notification (to be sure it's the last one),
    // once is shown triggers a `click` event on the `Clear all` button
    // which starts the closing animation.
    // The animation finish when the last `close` event is fired.
    client.executeAsyncScript(function() {
      var clearAll = document.getElementById('notification-clear');
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('click', true, true, {});
      var notification;
      notification = new Notification('title 3');
      notification.onclose = function(){ marionetteScriptFinished(true); };
      notification.onshow = function(){ clearAll.dispatchEvent(event); };
    });

    notificationList.refresh();
    assert.equal(notificationList.notifications.length, 1,
                 'unexpected number of notifications');
    done();
  });

  test('noscreen=true should prevent turning the screen on', function(done) {
    client.switchToFrame();
    client.executeScript(fs.readFileSync(
      SHARED_PATH + '/mock_navigator_vibrate.js', 'utf8'));

    client.executeScript(function() {
      window.wrappedJSObject.ScreenManager.turnScreenOff(true);
    });

    // create a notification that shouldn't turn the screen on
    var result = client.executeAsyncScript(function() {
      var notification;
      notification = new Notification('title', {
        mozbehavior: {noscreen:true}});
      window.addEventListener('mozChromeNotificationEvent', function(evt) {
        marionetteScriptFinished(evt.detail.mozbehavior.noscreen);
      });
    });
    assert.equal(result, true, 'mozbehavior.noscreen should be true');

    var screenEnabled = client.executeScript(function() {
      return window.wrappedJSObject.ScreenManager.screenEnabled;
    });
    assert.equal(screenEnabled, false, 'the screen should stay off');

    done();
  });

  test('vibrationPattern test', function(done) {
    client.switchToFrame();
    client.executeScript(fs.readFileSync(
      SHARED_PATH + '/mock_navigator_vibrate.js', 'utf8'));

    function sendNotification(pattern) {
      var notification;
      notification = new Notification('title', {
        mozbehavior: {vibrationPattern: pattern}});
      window.addEventListener('mozChromeNotificationEvent', function(evt) {
        var rv = JSON.stringify(evt.detail.mozbehavior.vibrationPattern) ===
          JSON.stringify(pattern);
        marionetteScriptFinished(rv);
      });
    }
    function getVibrationPattern() {
      return window.wrappedJSObject.__fakeVibrationPattern;
    }

    // the notification should vibrate the phone with the pattern [30, 200, 30]
    // and it should use the default pattern for the other 2.
    var patterns = [[30, 200, 30], [], [0, 200, 30]];
    for (var i = 0; i < patterns.length; ++i) {
      var result = client.executeAsyncScript(sendNotification, [patterns[i]]);
      assert.equal(result, true, 'mozbehavior.vibrationPattern should match');

      var pattern = client.executeScript(getVibrationPattern);

      if (i === 0) {
        assert.equal(JSON.stringify(pattern), '[30,200,30]',
                     'wrong vibration pattern');
      } else {
        assert.equal(JSON.stringify(pattern) !== JSON.stringify(patterns[i]),
                     true, 'the invalid pattern was used');
      }
    }

    done();
  });
});
