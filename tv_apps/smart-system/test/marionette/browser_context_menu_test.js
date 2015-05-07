'use strict';

var APP_NAME = 'contextmenuapp';
var APP_HOST = APP_NAME + '.gaiamobile.org';
var APP_URL = 'app://' + APP_HOST;

var Keys = {
  'enter': '\ue006',
  'right': '\ue014',
  'esc': '\ue00c'
};

var assert = require('chai').assert;
// We should use client.loader.getAppClass('system'); to load the system helper.
// But the current implementation of loader doesn't support tv_apps. We use
// normal require here and change to getAppClass() while bug 1163460 is fixed.
var SmartSystem = require(__dirname + '/lib/system');

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

  var client = marionette.client(opts);
  var actions;
  var system;
  var menuSelectors = [
    '.appWindow.active .contextmenu-list > div:nth-child(1) > smart-button',
    '.appWindow.active .contextmenu-list > div:nth-child(2) > smart-button'
  ];

  setup(function() {
    actions = client.loader.getActions();
    system = new SmartSystem(client);
  });

  function launchContextMenu() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);

    // Long press on a link
    var link = client.helper.waitForElement('#link');
    actions.longPress(link, 1.5).perform();

  }

  test('press enter on first menu', function() {
    launchContextMenu();
    client.switchToFrame();

    system.waitForEvent('appcontextmenu-shown');
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
  });

  test('press enter on second menu', function() {
    launchContextMenu();
    client.switchToFrame();

    system.waitForEvent('appcontextmenu-shown');
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
  });

  test('press esc after menu shown', function() {
    launchContextMenu();
    client.switchToFrame();

    system.waitForEvent('appcontextmenu-shown');
    // move focus to second one
    var menu = system.appChromeContextMenu;
    menu.sendKeys(Keys.esc);

    system.waitForEvent('appcontextmenu-hidden');
    assert.isFalse(menu.displayed());
  });

});
