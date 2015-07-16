'use strict';

/* global require, Notification, marionette, setup, suite, test, __dirname */

var assert = require('assert'),
    NotificationList = require('./lib/notification').NotificationList,
    System = require('./lib/system.js');

var SYSTEM_APP = 'app://system.gaiamobile.org';
var SOUND_PATH = '/test/path/to/sound/file';

marionette('notification behavior tests', function() {
  var client = marionette.client();
  var notificationList;
  var system;

  suite('notifications behavior', function() {
    setup(function() {
      notificationList = new NotificationList(client);
      system = new System(client);

      client.contentScript.inject(__dirname +
          '/mocks/mock_navigator_vibrate.js');
    });

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

      assert.equal(result, true, 'mozbehavior.soundFile should be empty');

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
        window.addEventListener('mozChromeNotificationEvent', function(evt) {
          marionetteScriptFinished(true);
        });
      });

      // should timeout when failing
      client.waitFor(function() {
        notificationList.refresh();
        return notificationList.notifications.length === 2;
      });

      client.executeScript(function() {
        var clearAll = document.getElementById('notification-clear');
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('click', true, true, {});
        clearAll.dispatchEvent(event);
      });

      // should timeout when failing
      client.waitFor(function() {
        notificationList.refresh();
        return notificationList.notifications.length === 1;
      });

      done();
    });

    test('noscreen=true should prevent turning the screen on', function(done) {
      client.waitFor(function() {
        return system.getScreenState() != null;
      });
      system.turnScreenOff();

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

      assert.equal(system.getScreenState(), false, 'the screen should be off');

      done();
    });

    test('vibrationPattern test', function(done) {
      client.switchToFrame();

      var rv = client.executeAsyncScript(function(pattern) {
        var notification;
        notification = new Notification('title', {
          mozbehavior: {vibrationPattern: pattern}});
        window.addEventListener('mozChromeNotificationEvent', function(evt) {
          var rv = JSON.stringify(evt.detail.mozbehavior.vibrationPattern) ===
            JSON.stringify(pattern);
          marionetteScriptFinished(rv);
        });
      }, [[100, 100, 100]]);

      assert.equal(rv, true, 'mozbehavior.vibrationPattern should match');

      done();
    });

    test('mozbehavior.silent should prevent vibrating and playing any sound',
         function(done) {
      client.switchToFrame();

      function sendNotification() {
        var notification;
        notification = new Notification('title', {
          mozbehavior: {silent: true}});
        window.addEventListener('mozChromeNotificationEvent', function(evt) {
          var rv = evt.detail.mozbehavior.silent === true;
          marionetteScriptFinished(rv);
        });
      }

      function phoneVibrated() {
        return window.wrappedJSObject.__fakeVibrationsNo !== 0;
      }

      var result = client.executeAsyncScript(sendNotification);
      assert.equal(result, true, 'mozbehavior.silent should be true');

      var vibrated = client.executeScript(phoneVibrated);
      assert.equal(vibrated, false, 'behavior.silent should prevent vibration');

      done();
    });
  });
});
