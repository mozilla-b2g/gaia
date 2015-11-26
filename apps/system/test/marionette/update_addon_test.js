'use strict';

var assert = require('assert');

var AppInstall = require('./lib/app_install');
var NotificationList = require('./lib/notification.js').NotificationList;
var createAppServer = require(
  '../../../../apps/homescreen/test/marionette/server/parent');

marionette('Update add-on', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'dom.apps.developer_mode': true
      },
      settings: {
        'addons.auto_update': true,
        'addons.update_notify': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var appInstall, server, system, notificationList;

  suiteSetup(function(done) {
    var app = __dirname + '/fixtures/template_addon';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  suiteTeardown(function(done) {
    server.close(done);
  });

  setup(function() {
    appInstall = new AppInstall(client);
    notificationList = new NotificationList(client);
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    client.switchToFrame();
  });

  test('Basic add-on update test', function() {

    server.setRoot(__dirname + '/fixtures/template_addon');
    appInstall.installPackage(server.webappUpdateURL);

    // Update the add-on.
    server.setRoot(__dirname + '/fixtures/template_addon_updated');
    appInstall.stageUpdate(server.webappUpdateURL);

    // We should get a notification on the first time an
    // add-on is automatically installed
    notificationList.waitForNotificationCount(2);

    var notifications = client.findElements(NotificationList.Selector.allItems);
    assert.ok(/Hello World Updated/.test(notifications[0].text()));
    assert.ok(/Add-on Updates are Automatic/.test(notifications[1].text()));

    // Get rid of current notifications
    notificationList.clear();

    // Update the add-on again
    server.setRoot(__dirname + '/fixtures/template_addon_updated_again');
    appInstall.stageUpdate(server.webappUpdateURL);

    // On the second update, we will only get one notification for
    // the addon being updated
    notificationList.waitForNotificationCount(1);
    notifications = client.findElements(NotificationList.Selector.allItems);
    assert.ok(/Hello World Updated/.test(notifications[0].text()));
  });

  test('Auto update disabled test', function() {

    server.setRoot(__dirname + '/fixtures/template_addon');
    client.settings.set('addons.auto_update', false);

    appInstall.installPackage(server.webappUpdateURL);

    // Update the manifest.
    server.setRoot(__dirname + '/fixtures/template_addon_updated');

    // Check for an update.
    appInstall.stageUpdate(server.webappUpdateURL);

    // Dont wait 30 seconds for the notification to show
    system.sendSystemUpdateNotification();

    notificationList.waitForNotificationCount(1);

    client.waitFor(function() {
      var update = client.findElement(NotificationList.Selector.systemUpdate);
      return /2 updates available./.test(update.text());
    });
  });

  test('Basic add-on update with no notifications', function() {

    server.setRoot(__dirname + '/fixtures/template_addon');
    client.settings.set('addons.update_notify', false);

    appInstall.installPackage(server.webappUpdateURL);

    // Update the add-on.
    server.setRoot(__dirname + '/fixtures/template_addon_updated');
    appInstall.stageUpdate(server.webappUpdateURL);

    // We should get a notification on the first time an
    // add-on is automatically installed
    notificationList.waitForNotificationCount(1);

    var notifications = client.findElements(NotificationList.Selector.allItems);
    assert.ok(/Add-on Updates are Automatic/.test(notifications[0].text()));

    // Get rid of current notifications
    notificationList.clear();

    // Ensure we only search for the notification we are not expecting
    // for 1 second (default is like 15)
    client.setSearchTimeout(1000);
    notifications = client.findElements(NotificationList.Selector.allItems);
    assert.ok(notifications.length === 0);
  });

});
