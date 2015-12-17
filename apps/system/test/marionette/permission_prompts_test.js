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
  });

  function tapButton(id) {
    client.switchToFrame(permissionApp.iframe);
    var btn = client.findElement('#' + id);
    btn.tap();
  }

  function ensurePermissionDialog() {
    client.switchToFrame();
    client.helper.waitForElement('#permission-dialog');
  }

  test('Device Storage videos - ensure propmpt', function() {
    tapButton('videos');
    ensurePermissionDialog();
  });

  test('Device Storage pictures - ensure propmpt', function() {
    tapButton('pictures');
    ensurePermissionDialog();
  });

  test('Device Storage music - ensure propmpt', function() {
    tapButton('music');
    ensurePermissionDialog();
  });

  test('Device Storage sdcard - ensure propmpt', function() {
    tapButton('sdcard');
    ensurePermissionDialog();
  });

  test('Contacts - ensure prompt', function() {
    tapButton('contacts');
    ensurePermissionDialog();
  });
});
