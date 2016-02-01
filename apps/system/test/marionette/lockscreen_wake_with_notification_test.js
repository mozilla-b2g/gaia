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
  var notificationTitle = 'TestNotificationBar_TITLE';
  var notificationBody = 'TestNotificationBar_BODY';

  setup(function() {
    system = client.loader.getAppClass('system');
    lockScreen = (new LockScreen()).start(client);
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the ScreenLock menu
    screenLockPanel = settingsApp.screenLockPanel;
    screenLockPanel.setupScreenLock();
  });

  test('create a notification after locking the device, and to see if it shows',
  function() {
    screenLockPanel.toggleScreenLock();
    settingsApp.close();
    lockScreen.lock();

    client.switchToFrame();
    client.executeScript(function(title, body) {
      new Notification(title, {'body': body});  // jshint ignore:line
    }, [notificationTitle, notificationBody]);
    lockScreen.waitForNotificationChange(1);
    var notification = client
      .findElement('#notifications-lockscreen-container .notification');

    var notificationTitleElement = client
      .findElement('#notifications-lockscreen-container .notification ' +
                    '.title-container .title');
    var notificationDetailElement = client
      .findElement('#notifications-lockscreen-container .notification ' +
                    '.detail .detail-content');

    assert.ok(notification.displayed());
    assert.equal(notificationTitleElement.text(), notificationTitle);
    assert.equal(notificationDetailElement.text(), notificationBody);
  });
});
