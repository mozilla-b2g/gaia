'use strict';

var helper = require('../../../../tests/js-marionette/helper.js');
var assert = require('chai').assert;

marionette('Software Home Button - Modal Dialog', function() {

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  });
  var home, system, actions;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    actions = client.loader.getActions();
    system.waitForStartup();
    helper.unlockScreen(client);
    home.waitForLaunch();
  });

  test('Proper layout for homescreen dialogs', function() {
    home.openContextMenu();
    var contextMenuHeight = home.contextMenu.size().height;
    client.switchToFrame();
    assert.ok(contextMenuHeight === expectedHeight());
  });

  test('Proper layout for collections edition', function() {
    var firstCollection = home.collections[0];
    actions.longPress(firstCollection, 1.5).perform();
    actions.tap(firstCollection.findElement('.remove')).perform();
    var contextMenuHeight = home.removeCollectionConfirm.size().height;
    client.switchToFrame();
    assert.ok(contextMenuHeight === expectedHeight());
  });

  function expectedHeight() {
    var winHeight = client.findElement('body').size().height;
    var shbHeight = system.softwareButtons.size().height;
    var statusbarHeight = system.statusbar.size().height;
    return (winHeight - statusbarHeight - shbHeight);
  }
});
