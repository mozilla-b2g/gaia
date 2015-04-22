'use strict';
var Settings = require('../../app/app'),
    assert = require('assert');

marionette('manipulate screenLock settings', function() {
  var client = marionette.client();
  var settingsApp;
  var screenLockPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the ScreenLock menu
    screenLockPanel = settingsApp.screenLockPanel;
    screenLockPanel.setupScreenLock();
  });

  test('lockscreen is enabled', function() {
    screenLockPanel.toggleScreenLock();

    assert.ok(screenLockPanel.isScreenLockEnabled(),
      'screenlock is enabled');
    assert.ok(screenLockPanel.isScreenLockChecked(),
      'screenlock is checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip('passcode can\'t be enabled when passcode is wrong', function() {
    screenLockPanel.toggleScreenLock();
    screenLockPanel.togglePasscodeLock();
    screenLockPanel.typePasscode('1234', '5678');

    assert.ok(screenLockPanel.isPasscodeNotMatched());
    assert.ok(!screenLockPanel.isPasscodeLockEnabled(),
      'passcode is not enabled');
    assert.ok(!screenLockPanel.isPasscodeChecked(),
      'passcode is not checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip(
    'passcode is enabled, and we want to disable passcode ' +
    'but failed to enter the right code',
    function() {
      var oldCode = '1234';
      var newCode = '4567';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(oldCode, oldCode);
      screenLockPanel.tapCreatePasscode();

      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is checked');
      assert.equal(screenLockPanel.getPasscode(), oldCode,
        'passcode is right');

      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(newCode);

      assert.ok(screenLockPanel.isPasscodeIncorrect(),
        'passcode is not correct');
      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is still enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is still checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip('passcode is enabled, and get disabled successfully', function() {
    var rightCode = '1234';
    screenLockPanel.toggleScreenLock();
    screenLockPanel.togglePasscodeLock();
    screenLockPanel.typePasscode(rightCode, rightCode);
    screenLockPanel.tapCreatePasscode();

    assert.ok(screenLockPanel.isPasscodeLockEnabled(),
      'passcode is enabled');
    assert.ok(screenLockPanel.isPasscodeChecked(),
      'passcode is checked');
    assert.equal(screenLockPanel.getPasscode(), rightCode,
      'passcode is right');

    screenLockPanel.togglePasscodeLock();
    screenLockPanel.typePasscode(rightCode);

    assert.ok(!screenLockPanel.isPasscodeLockEnabled(),
      'passcode is disabled');
    assert.ok(!screenLockPanel.isPasscodeChecked(),
      'passcode is not checked');
  });

  test(
    'passcode is enabled and won\'t get disabled if you tap back button ' +
    'when we try to disable passcode directly',
    function() {
      var code = '1234';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(code, code);
      screenLockPanel.tapCreatePasscode();

      screenLockPanel.togglePasscodeLock();
      screenLockPanel.tapBackButton();

      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is still enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is still checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip(
    'passcode is enabled and won\'t get disabled if you tap back button ' +
    'when we try to disable screenlock directly',
    function() {
      var code = '1234';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(code, code);
      screenLockPanel.tapCreatePasscode();

      screenLockPanel.toggleScreenLock();
      screenLockPanel.tapBackButton();

      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is still enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is still checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip(
    'passcode is enabled and won\'t get disabled if you tap back button ' +
    'when we try to edit passcode',
    function() {
      var code = '1234';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(code, code);
      screenLockPanel.tapCreatePasscode();

      screenLockPanel.tapEditPasscode();
      screenLockPanel.tapBackButton();

      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is still enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is still checked');
  });

  test(
    'passcode is enabled, and we want to edit passcode ' +
    'but failed to enter the right code',
    function() {
      var oldCode = '1234';
      var newCode = '4567';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(oldCode, oldCode);
      screenLockPanel.tapCreatePasscode();

      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is checked');
      assert.equal(screenLockPanel.getPasscode(), oldCode,
        'passcode is right (with old code)');

      screenLockPanel.tapEditPasscode(newCode);

      assert.ok(screenLockPanel.isPasscodeIncorrect(),
        'passcode is not correct');
      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is still enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is still checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip('passcode is enabled, then get changed successfully', function() {
    var oldCode = '1234';
    var newCode = '4567';
    screenLockPanel.toggleScreenLock();
    screenLockPanel.togglePasscodeLock();
    screenLockPanel.typePasscode(oldCode, oldCode);
    screenLockPanel.tapCreatePasscode();

    assert.ok(screenLockPanel.isPasscodeLockEnabled(),
      'passcode is enabled');
    assert.ok(screenLockPanel.isPasscodeChecked(),
      'passcode is checked');
    assert.equal(screenLockPanel.getPasscode(), oldCode,
      'passcode is right (with old code)');

    screenLockPanel.tapEditPasscode(oldCode);
    screenLockPanel.typePasscode(newCode, newCode);
    screenLockPanel.tapChangePasscode();

    assert.equal(screenLockPanel.getPasscode(), newCode,
      'passcode is right (with new code)');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip(
    'passcode is enabled, and we want to disable lockscreen directly ' +
    'but failed to enter the right code',
    function() {
      var rightCode = '1234';
      var wrongCode = '5678';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(rightCode, rightCode);
      screenLockPanel.tapCreatePasscode();

      screenLockPanel.toggleScreenLock();
      screenLockPanel.typePasscode(wrongCode);

      assert.ok(screenLockPanel.isPasscodeIncorrect(),
        'passcode is not correct');
      assert.ok(screenLockPanel.isPasscodeLockEnabled(),
        'passcode is still enabled');
      assert.ok(screenLockPanel.isPasscodeChecked(),
        'passcode is still checked');
  });

  // Disabled for intermittent failures. Bug 983171
  test.skip('passcode is enabled, and we want to disable lockscreen directly',
    function() {
      var code = '1234';
      screenLockPanel.toggleScreenLock();
      screenLockPanel.togglePasscodeLock();
      screenLockPanel.typePasscode(code, code);
      screenLockPanel.tapCreatePasscode();

      screenLockPanel.toggleScreenLock();
      screenLockPanel.typePasscode(code);

      assert.ok(!screenLockPanel.isScreenLockEnabled(),
        'screenlock is not enabled');
      assert.ok(!screenLockPanel.isScreenLockChecked(),
        'screenlock is not checked');
  });
});
