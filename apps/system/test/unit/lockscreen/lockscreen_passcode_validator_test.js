'use strict';

/* global LockScreenPasscodeValidator */

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/lockscreen_passcode_validator.js');

var mocksForLockScreen = new window.MocksHelper([
  'SettingsListener'
]).init();

suite('LockScreenPasscodeValidator > ', function() {
  var subject;
  mocksForLockScreen.attachTestHelpers();
  setup(function() {
    subject = new LockScreenPasscodeValidator();
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('it shoud validate the passcode and call onsuccess when it passed',
  function() {
    var stubOnSuccess = this.sinon.stub(),
        stubOnError = this.sinon.stub(),
        event = new CustomEvent('lockscreen-request-passcode-validate', {
        detail: {
          passcode: 'foobar',
          onsuccess: stubOnSuccess,
          onerror: stubOnError
        }});
    subject.states.passcode = 'foobar';
    subject.handleEvent(event);
    assert.isTrue(stubOnSuccess.called);
    assert.isFalse(stubOnError.called);
  });

  test('it shoud validate the passcode and call onerror when it failed',
  function() {
    var stubOnSuccess = this.sinon.stub(),
        stubOnError = this.sinon.stub(),
        event = new CustomEvent('lockscreen-request-passcode-validate', {
        detail: {
          passcode: 'foobar',
          onsuccess: stubOnSuccess,
          onerror: stubOnError
        }});
    subject.states.passcode = 'notfoobar';
    subject.handleEvent(event);
    assert.isTrue(stubOnError.called);
    assert.isFalse(stubOnSuccess.called);
  });
});
