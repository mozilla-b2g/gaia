'use strict';

var FakeApp = require('./lib/fakeapp');

var PERMISSION_APP = 'permissionprompts.gaiamobile.org';
var PERMISSION_APP_DIR =  __dirname + '/../apps/permissionprompts';

function getAppsObject() {
  var apps = {};
  apps[PERMISSION_APP] = PERMISSION_APP_DIR;
  return apps;
}

marionette('Permission Prompts', function() {
  var client = marionette.client({
    profile: {
      apps: getAppsObject()
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var system, permissionApp;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    permissionApp = new FakeApp(client, 'app://' + PERMISSION_APP);
    permissionApp.launch();
    client.switchToFrame(permissionApp.iframe);
  });

  test('Contacts - ensure prompt', function() {
    var contactsButton = client.findElement('#contacts');
    contactsButton.tap();
    client.switchToFrame();
    client.helper.waitForElement('#permission-dialog');
  });
});
