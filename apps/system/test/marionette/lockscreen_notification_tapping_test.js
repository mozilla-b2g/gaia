'use strict';

var dirapps = require('path').resolve(__dirname + '/../../../');
var Settings = require(dirapps + '/settings/test/marionette/app/app'),
    LockScreen = require('./lib/lockscreen'),
    Promise = require('es6-promise').Promise, // jshint ignore:line
    assert = require('assert');

marionette('LockScreen > ', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var system;
  var settingsApp;
  var screenLockPanel;
  var lockScreen;
  var actions;
  var unlockActions;

  setup(function() {
    system = client.loader.getAppClass('system');
    lockScreen = (new LockScreen()).start(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the ScreenLock menu
    screenLockPanel = settingsApp.screenLockPanel;
    screenLockPanel.setupScreenLock();
    screenLockPanel.toggleScreenLock();
    var LockScreenNotificationActions =
      require('./lib/lockscreen_notification_actions');
    actions = (new LockScreenNotificationActions());
    var LockScreenPasscodeUnlockActions =
      require('./lib/lockscreen_passcode_unlock_actions.js');
    unlockActions = new LockScreenPasscodeUnlockActions();
  });

  var setupPasscode = function() {
    screenLockPanel.togglePasscodeLock();
    screenLockPanel.typePasscode('1234', '1234');
    screenLockPanel.tapCreatePasscode();
    settingsApp.close();
    actions.start(client);
    unlockActions.start(client);
  };

  var setupWithoutPasscode = function() {
    settingsApp.close();
    lockScreen.lock();
    actions.start(client);
  };

  var fireNotification = function() {
    var details = {
     tag: 'test tag',
     title: 'test title',
     body: 'test body',
     dir: 'rtl',
     lang: 'en'
    };
    actions
      .fireNotification(details);
  };

  test('without passcode, tapping on notification "open" should unlock it',
  function() {
    setupWithoutPasscode();
    client.switchToFrame();

    // No notifcation at this time.
    assert.ok(client.executeScript(function() {
      return null === document.querySelector(
        '#notifications-lockscreen-container .notification');
    }));
    fireNotification();

    assert.ok(client.executeScript(function() {
      return null !== document.querySelector(
        '#notifications-lockscreen-container .notification');
    }));

    // Check if it hasn't been clicked.
    assert.ok(client.executeScript(function() {
      var notification = document.querySelector(
        '#notifications-lockscreen-container .notification');
      return !notification.classList.contains('__test_notification_clicked');
    }));

    // If we need to test the element exists or not, we cannot find it because
    // `findElement` will throw exception while there is no such element
    // (on the contrary `querySelector` will only return null).
    // So we need to check it first, and then find the element to use later.
    client.findElement(
        '#notifications-lockscreen-container .notification').tap();


    assert.ok(client.executeScript(function() {
      return null !== document.querySelector(
        '#notifications-lockscreen-container .notification .button-actionable');
    }));


    client.findElement(
        '#notifications-lockscreen-container .notification .button-actionable')
      .tap();


    // Check if it was clicked.
    assert.ok(client.executeScript(function() {
      var notification = document.querySelector(
        '#notifications-lockscreen-container .notification');
      return notification.classList.contains('__test_notification_clicked');
    }));


   lockScreen.waitForUnlock(); 
  });

  test('with passcode, tapping on notification "open" with correct passcode ' +
       'later should unlock it',
  function() {
    setupPasscode();
    client.switchToFrame();

    // No notifcation at this time.
    assert.ok(client.executeScript(function() {
      return null === document.querySelector(
        '#notifications-lockscreen-container .notification');
    }));
    fireNotification();

    assert.ok(client.executeScript(function() {
      return null !== document.querySelector(
        '#notifications-lockscreen-container .notification');
    }));

    // Check if it hasn't been clicked.
    assert.ok(client.executeScript(function() {
      var notification = document.querySelector(
        '#notifications-lockscreen-container .notification');
      return !notification.classList.contains('__test_notification_clicked');
    }));

    // If we need to test the element exists or not, we cannot find it because
    // `findElement` will throw exception while there is no such element
    // (on the contrary `querySelector` will only return null).
    // So we need to check it first, and then find the element to use later.
    client.findElement(
        '#notifications-lockscreen-container .notification').tap();

    assert.ok(client.executeScript(function() {
      return null !== document.querySelector(
        '#notifications-lockscreen-container .notification .button-actionable');
    }));

    client.findElement(
        '#notifications-lockscreen-container .notification .button-actionable')
      .tap();
    unlockActions.waitForPasscodePanel();

    unlockActions.pressKey('1');
    unlockActions.pressKey('2');
    unlockActions.pressKey('3');
    unlockActions.pressKey('4');

    // Immediately check if it is activated.
    // Since unlocking will dismiss the notifications
    // in the screen locker container.
    client.waitFor(function() {
      return client.executeScript(function() {
        var notification = document.querySelector(
          '#notifications-lockscreen-container .notification');
        if (null === notification) { return false; }
        return notification.classList.contains('__test_notification_clicked');
      });
    });

    lockScreen.waitForUnlock();
  });

  test('with passcode, tapping on notification "open" with incorrect passcode' +
       ' later should NOT unlock it',
  function() {
    setupPasscode();
    client.switchToFrame();

    // No notifcation at this time.
    assert.ok(client.executeScript(function() {
      return null === document.querySelector(
        '#notifications-lockscreen-container .notification');
    }));
    fireNotification();

    assert.ok(client.executeScript(function() {
      return null !== document.querySelector(
        '#notifications-lockscreen-container .notification');
    }));

    // Check if it hasn't been clicked.
    assert.ok(client.executeScript(function() {
      var notification = document.querySelector(
        '#notifications-lockscreen-container .notification');
      return !notification.classList.contains('__test_notification_clicked');
    }));

    // If we need to test the element exists or not, we cannot find it because
    // `findElement` will throw exception while there is no such element
    // (on the contrary `querySelector` will only return null).
    // So we need to check it first, and then find the element to use later.
    client.findElement(
        '#notifications-lockscreen-container .notification').tap();

    assert.ok(client.executeScript(function() {
      return null !== document.querySelector(
        '#notifications-lockscreen-container .notification .button-actionable');
    }));

    client.findElement(
        '#notifications-lockscreen-container .notification .button-actionable')
      .tap();

    unlockActions.waitForPasscodePanel();
    unlockActions.pressKey('9');
    unlockActions.pressKey('9');
    unlockActions.pressKey('9');
    unlockActions.pressKey('9');

    assert.ok(client.findElement('#lockscreen-passcode-code').displayed());
    // Check if it wasn't clicked since passcode is incorrect.
    assert.ok(client.executeScript(function() {
      var notification = document.querySelector(
        '#notifications-lockscreen-container .notification');
      return !notification.classList.contains('__test_notification_clicked');
    }));
  });

});
