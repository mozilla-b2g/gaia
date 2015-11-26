'use strict';
var Promise = require('es6-promise').Promise;   // jshint ignore:line

marionette('LockScreen: ensure passcode unlock works', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var LockScreenPasscodeUnlockActions, actions;
  var LockScreen = require('./lib/lockscreen.js');
  var lockScreen = (new LockScreen()).start(client);

  setup(function() {
    LockScreenPasscodeUnlockActions =
      require('./lib/lockscreen_passcode_unlock_actions.js');
    actions = (new LockScreenPasscodeUnlockActions()).start(client);
  });

  test('setup the passcode and lock it, to test if pressing keys can unlock',
  function(done) {
    var passcode = ['1', '3', '3', '7'];
    new Promise(function(resolve) {
      lockScreen.setPasscode(passcode.join(''), resolve);
    })
    .then(function(r) {
      actions.activateSlidingUnlock();
      passcode.forEach(function(keyChar) {
        actions.pressKey(keyChar);
      });
    })
    .then(function() {
      return actions.waitForUnlock();
    })
    .then(done)
    .catch(done);
  });

  test('setup the passcode and lock it, to test if pressing *wrong* ' +
       'keys cannot unlock',
  function(done) {
    var passcode = ['1', '3', '3', '7'];
    var wrongPasscode = ['1', '2', '3', '4'];
    new Promise(function(resolve) {
      lockScreen.setPasscode(passcode.join(''), resolve);
    })
    .then(function() {
      actions.activateSlidingUnlock();
      wrongPasscode.forEach(function(keyChar) {
        actions.pressKey(keyChar);
      });
    })
    .then(function() {
      return actions.notUnlock();
    })
    .then(done)
    .catch(done);
  });
});
