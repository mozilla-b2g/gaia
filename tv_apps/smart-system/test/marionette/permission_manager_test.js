'use strict';

var assert = require('chai').assert;
var PermissionManager = require('./lib/permission_manager');

marionette('Test Permission Manager', function() {
  var Keys = {
    'enter': '\ue006',
    'up': '\ue013',
    'down': '\ue015',
    'left': '\ue012',
    'right': '\ue014',
    'esc': '\ue00c',
    'backspace': '\ue003'
  };

  var testOptions = { devices: ['tv'] };

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };
  opts.apps[PermissionManager.APP_HOST] =
    __dirname + '/../apps/' + PermissionManager.APP_NAME;

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var system;
  var permissionManager;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    system.waitForFullyLoaded();
    system.waitForLaunch(PermissionManager.APP_URL);
    permissionManager = new PermissionManager(client);
    client.switchToFrame();
  });

  test('Should open and close', testOptions, function () {
    permissionManager.waitForPermissionDialogOpened();
    permissionManager.noBtn.sendKeys(Keys.enter);
    permissionManager.waitForPermissionDialogClosed();
  });

  test('Should focus on yes button', testOptions, function () {
    permissionManager.waitForPermissionDialogOpened();
    permissionManager.noBtn.sendKeys(Keys.right);
    permissionManager.yesBtn.scriptWith(function(yesBtn) {
      return document.activeElement === yesBtn;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on yes button');
    });
    permissionManager.yesBtn.sendKeys(Keys.enter);
    permissionManager.waitForPermissionDialogClosed();
  });

  test('Should toggle more info', testOptions, function () {
    permissionManager.waitForPermissionDialogOpened();

    // Move focus to showMoreInfo button
    permissionManager.noBtn.sendKeys(Keys.up);
    permissionManager.noBtn.sendKeys(Keys.up);
    permissionManager.showMoreInfoBtn.scriptWith(function(showMoreInfoBtn) {
      return document.activeElement === showMoreInfoBtn;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on showMoreInfo button');
    });

    // Open more info
    permissionManager.showMoreInfoBtn.sendKeys(Keys.enter);
    permissionManager.watiForMoreInfoOpened();
    permissionManager.hiddeMoreInfoBtn.scriptWith(function(hiddeMoreInfoBtn) {
      return document.activeElement === hiddeMoreInfoBtn;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on hiddeMoreInfo button');
    });

    // Close more info
    permissionManager.hiddeMoreInfoBtn.sendKeys(Keys.enter);
    permissionManager.watiForMoreInfoClosed();
    permissionManager.showMoreInfoBtn.scriptWith(function(showMoreInfoBtn) {
      return document.activeElement === showMoreInfoBtn;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on showMoreInfo button');
    });

    // Move focus back to no button
    permissionManager.showMoreInfoBtn.sendKeys(Keys.down);
    permissionManager.showMoreInfoBtn.sendKeys(Keys.down);
    permissionManager.noBtn.scriptWith(function(noBtn) {
      return document.activeElement === noBtn;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on no button');
    });
    permissionManager.noBtn.sendKeys(Keys.enter);
    permissionManager.waitForPermissionDialogClosed();
  });

  test('Should toggle remember checkbox', testOptions, function () {
    permissionManager.waitForPermissionDialogOpened();
    permissionManager.watiForRememberCheckboxChecked(); // Checked by default

    // Move focus to remember section
    permissionManager.noBtn.sendKeys(Keys.up);
    permissionManager.rememberSection.scriptWith(function(rememberSection) {
      return document.activeElement === rememberSection;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on rememberSection');
    });

    // Toggle remember checkbox
    permissionManager.rememberSection.sendKeys(Keys.enter);
    permissionManager.watiForRememberCheckboxUnchecked();
    permissionManager.rememberSection.sendKeys(Keys.enter);
    permissionManager.watiForRememberCheckboxChecked();

    // Move focus back to no button
    permissionManager.rememberSection.sendKeys(Keys.down);
    permissionManager.noBtn.scriptWith(function(noBtn) {
      return document.activeElement === noBtn;
    }, function (err, focused) {
      assert.ok(focused, 'Not focus on no button');
    });
    permissionManager.noBtn.sendKeys(Keys.enter);
    permissionManager.waitForPermissionDialogClosed();
  });
});
