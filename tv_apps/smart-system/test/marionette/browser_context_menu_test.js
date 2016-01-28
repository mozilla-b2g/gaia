'use strict';

var APP_NAME = 'contextmenuapp';
var APP_HOST = APP_NAME + '.gaiamobile.org';
var APP_URL = 'app://' + APP_HOST;

var Keys = {
  'enter': '\ue006',
  'right': '\ue014',
  'esc': '\ue00c',
  'backspace': '\ue003'
};

var assert = require('chai').assert;

// Bug 1207453 - Skip the test due to unknown test enviroment issue for now.
// We should investigate the issue and re-enable the test later.
marionette('Test Context Menu Events', function() {

  var opts = {
    apps: {},
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  opts.apps[APP_HOST] = __dirname + '/../apps/' + APP_NAME;

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions;
  var system;
  var menuSelectors = [
    '.appWindow.active .modal-dialog-button-group smart-button:nth-child(1)',
    '.appWindow.active .modal-dialog-button-group smart-button:nth-child(2)'
  ];

  setup(function() {
    actions = client.loader.getActions();
    system = client.loader.getAppClass('smart-system', 'system', 'tv_apps');
  });

  function launchContextMenu() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

  }

  test('press enter on first menu', { 'devices': ['tv'] }, function() {
    launchContextMenu();
    client.switchToFrame();

    system.waitForEvent('appcontextmenu-shown');

    var container = system.appChromeContextMenuContainer;
    // find the first context menu
    var firstMenu = client.helper.waitForElement(menuSelectors[0]);
    // check focus
    assert.isTrue(firstMenu.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'first smart button should be focused.');
    // press enter and close it
    firstMenu.sendKeys(Keys.enter);

    system.waitForEvent('appcontextmenu-hidden');
    assert.isFalse(firstMenu.displayed());
    assert.isFalse(container.displayed());
  });

  test('press enter on second menu', { 'devices': ['tv'] }, function() {
    launchContextMenu();
    client.switchToFrame();

    system.waitForEvent('appcontextmenu-shown');

    var container = system.appChromeContextMenuContainer;

    // wait for second menu
    var secondMenu = client.helper.waitForElement(menuSelectors[1]);
    // move focus to second one
    var menu = system.appChromeContextMenu;
    menu.sendKeys(Keys.right);

    assert.isTrue(secondMenu.scriptWith(function(el) {
      return document.activeElement === el;
    }), 'second smart button should be focused.');
    // press enter and close it
    secondMenu.sendKeys(Keys.enter);

    system.waitForEvent('appcontextmenu-hidden');
    assert.isFalse(menu.displayed());
    assert.isFalse(container.displayed());
  });

  test('press back after menu shown', { 'devices': ['tv'] }, function() {
    launchContextMenu();
    client.switchToFrame();

    system.waitForEvent('appcontextmenu-shown');

    var container = system.appChromeContextMenuContainer;

    // move focus to second one
    var menu = system.appChromeContextMenu;
    menu.sendKeys(Keys.backspace);

    system.waitForEvent('appcontextmenu-hidden');
    assert.isFalse(menu.displayed());
    assert.isFalse(container.displayed());
  });

});
