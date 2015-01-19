/* globals MockNavigatorSettings, PasscodeHelper */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/passcode_helper.js');

suite('PasscodeHelper:', function() {
  var realMozSettings;
  suiteSetup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    //MockNavigatorSettings.mSyncRepliesOnly = true;
    MockNavigatorSettings.mSetup();
    const SET_DIGEST_VALUE = 'lockscreen.passcode-lock.digest.value';
    const SET_DIGEST_SALT = 'lockscreen.passcode-lock.digest.salt';
    const SET_DIGEST_ITERATIONS = 'lockscreen.passcode-lock.digest.iterations';
    const SET_DIGEST_ALGORITHM = 'lockscreen.passcode-lock.digest.algorithm';

    // constant salt for easier testing
    var phSettings = {};
    // digest for PIN '1337' with salt as below.
    var digestNums = [195, 174, 33, 98, 39, 43, 135, 112,
      126, 176, 82, 150, 236, 112, 87, 54,
      96, 60, 208, 18, 86, 178, 19, 20,
      129, 91, 168, 134, 241, 138, 59, 210];
    var digest1337 = new Uint8Array(digestNums);
    phSettings[SET_DIGEST_VALUE] = digest1337;
    phSettings[SET_DIGEST_SALT] = new Uint8Array([4, 8, 15, 16,
      23, 42, 108, 0]);
    phSettings[SET_DIGEST_ITERATIONS] = 1000;
    phSettings[SET_DIGEST_ALGORITHM] = 'SHA-1';

    var lock = navigator.mozSettings.createLock();
    var request = lock.set(phSettings);
    request.then(() => {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();
  });

  test('checkPasscode with constant salt', function(done) {
    var ph = new PasscodeHelper();
    var promise = ph.checkPasscode('1337');
    assert.equal(typeof promise.then, 'function',
      'checkPasscode returns a then-able');
    function onSuccess(bool) {
      assert.isBoolean(bool, 'Expecting a boolean');
      assert.equal(bool, true, 'Expecting a boolean true');
      //done();
    }
    function onError(err) {
      assert.fail(err, true, 'checkPasscode has thrown');
      //done();
    }
    promise.then(onSuccess).catch(onError).then(done).catch(done);
  });

  test('setPasscode and checkPasscode new password', function(done) {
    var ph = new PasscodeHelper();
    var setPromise = ph.setPasscode('0000');
    assert.equal(typeof setPromise.then, 'function',
      'setPasscode returns a then-able');
    function onSet() {
      var checkPromise = ph.checkPasscode('0000');
      assert.equal(typeof checkPromise.then, 'function',
        'checkPasscode returns a then-able');
      function onCheck(bool) {
        assert.ok(bool);
      }
      function onCheckError(err) {
        assert.fail(err, true, 'Checking the passcode has thrown');
      }
      checkPromise.then(onCheck, onCheckError);
    }
    function onSetError(err) {
      assert.fail(err, '(no exception)', 'Setting the passcode has thrown');
    }
    setPromise.then(onSet, onSetError).then(done, done);
  });
});
