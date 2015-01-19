'use strict';

var assert = require('chai').assert;

marionette('Software Home Button - Modal Dialog', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'software-button.enabled': true
      }
    }
  });
  var home, system, actions;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    actions = client.loader.getActions();
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Proper layout for homescreen dialogs', function() {
    home.openContextMenu();
    var contextMenuHeight = home.contextMenu.size().height;
    client.switchToFrame();
    assert.ok(contextMenuHeight === expectedHeight());
  });

  test('Proper layout for collections editing', function() {
    var firstCollection = home.collections[0];
    firstCollection.scriptWith(function(el) {
      el.scrollIntoView(false);
    });
    home.enterEditMode(firstCollection);
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
