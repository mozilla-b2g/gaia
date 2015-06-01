'use strict';

var assert = require('assert');
var Rocketbar = require('./lib/rocketbar');

marionette('Software Home Button - Stealing input focus', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'software-button.enabled': true
      }
    }
  });

  var home, rocketbar, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Tapping container should not steal focus', function() {
    var container = client.findElement('#software-buttons');
    rocketbar.homescreenFocus();
    system.waitForKeyboard();
    container.tap(10, 10);
    try {
      system.waitForKeyboardToDisappear();
      assert(false, 'Keyboard should not dissappear when tapping SHB');
    } catch (e) {
      assert.equal(e.message, 'timeout exceeded!',
        'Should get timeout waiting for keyboard to disappear');
    }
  });

  test('Tapping SHB should dismiss keyboard', function() {
    var shb = client.findElement('#software-home-button');
    rocketbar.homescreenFocus();
    system.waitForKeyboard();
    shb.tap();
    system.waitForKeyboardToDisappear();
  });
});
