'use strict';

var Rocketbar = require('./lib/rocketbar');
var Server = require('../../../../shared/test/integration/server');
var assert = require('chai').assert;

var NotificationList = require('./lib/notification').NotificationList;

marionette('Software Home Button - File Open Error', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': true
    }
  });
  var home, rocketbar, search, server, system, actions, utilityTray,
    notificationList;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    notificationList = new NotificationList(client);
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    utilityTray = client.loader.getAppClass('system', 'utility_tray');
    actions = client.loader.getActions();
    system.waitForStartup();
  });

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  test('Proper layout for file error dialog', function() {
    var url = server.url('invalid_file.html');

    // Navigate to the url.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    // Save the file.
    actions.longPress(client.helper.waitForElement('a'), 1).perform();
    client.switchToFrame();
    system.appContextMenuSaveLink.click();

    client.waitFor(function() {
      utilityTray.open();
      notificationList.refresh();
      var text = notificationList.notifications[0].title;
      var found = text.indexOf('Download complete') !== -1;
      if (!found) {
        utilityTray.close();
      }
      return found;
    });

console.log('Screenshot: ' + 'data:image/png;base64,' + client.screenshot());
    notificationList.tap(notificationList.notifications[0]);

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var dialogHeight = system.downloadDialog.size().height;
    var shbRect = system.softwareButtons.scriptWith(rect);

    assert.equal(dialogHeight, expectedDialogHeight());
    assert.equal(dialogHeight, shbRect.top);
  });

  function expectedDialogHeight() {
    var winHeight = client.findElement('body').size().height;
    var shbHeight = system.softwareButtons.size().height;
    return (winHeight - shbHeight);
  }
});
