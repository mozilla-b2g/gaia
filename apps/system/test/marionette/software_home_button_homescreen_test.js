'use strict';

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var System = require('./lib/system');
var Actions = require('marionette-client').Actions;
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
    home = new Home(client);
    system = new System(client);
    actions = new Actions(client);
    system.waitForStartup();
    helper.unlockScreen(client);
    home.waitForLaunch();
  });

  test('Proper layout for homescreen dialogs', function() {
    actions.longPress(home.dividers[0], 1.5).perform();
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
