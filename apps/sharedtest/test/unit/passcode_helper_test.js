/* globals MockNavigatorSettings, PasscodeHelper */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/passcode_helper.js');

suite('PasscodeHelper:', function() {
  var realMozSettings;
  suiteSetup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();
    const SET_DIGEST_VALUE = 'lockscreen.passcode-lock.digest.value';
    const SET_DIGEST_SALT = 'lockscreen.passcode-lock.digest.salt';
    const SET_DIGEST_ITERATIONS = 'lockscreen.passcode-lock.digest.iterations';
    const SET_DIGEST_ALGORITHM = 'lockscreen.passcode-lock.digest.algorithm';

    var phSettings = {};
    // digest for PIN '1337' with salt as below.
    var digestNums = [40, 160, 226, 54, 163, 95, 75, 200,
      40, 227, 57, 44, 141, 118, 230, 64,
      0, 101, 103, 249];
    var digest1337 = new Uint8Array(digestNums);
    phSettings[SET_DIGEST_VALUE] = digest1337;
    // constant salt for easier testing
    phSettings[SET_DIGEST_SALT] = new Uint8Array([108, 85, 195, 7,
                                                  89, 243, 87, 87]);
    // picking 100 iterations, to test that a follow-up set() will
    // properly upgrade to a stronger default.
    phSettings[SET_DIGEST_ITERATIONS] = 100;
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

  test('check Passcode with constant salt', function(done) {
    var promise = PasscodeHelper.check('1337');
    assert.equal(typeof promise.then, 'function',
      'Passcode.check returns a then-able');
    function onSuccess(bool) {
      assert.isBoolean(bool, 'Expecting a boolean');
      assert.equal(bool, true, 'Expecting a boolean true');
      //done();
    }
    function onError(err) {
      assert.fail(err, true, 'Passcode.check has thrown');
      //done();
    }
    promise.then(onSuccess).catch(onError).then(done).catch(done);
  });

  test('Passcode.set() & Passcode.check() for new password', function(done) {
    var setPromise = PasscodeHelper.set('0000');
    assert.equal(typeof setPromise.then, 'function',
      'Passcode.set() returns a then-able');
    function onSet() {
      var checkPromise = PasscodeHelper.check('0000');
      assert.equal(typeof checkPromise.then, 'function',
        'Passcode.check() returns a then-able');
      function onCheck(bool) {
        assert.ok(bool, 'check() was OK');

        // setting and checking worked. let's see if this
        // updated security to 1000 iterations.
        var lock = navigator.mozSettings.createLock();
        var req = lock.get('lockscreen.passcode-lock.digest.iterations');
        req.then((result) => {
          var iter = result['lockscreen.passcode-lock.digest.iterations'];
          assert.equal(iter, 1000, 'new passcode set()s update properly');
          done();
        });
      }
      function onCheckError(err) {
        assert.fail(err, true, 'Checking the passcode has thrown');
        done();
      }
      checkPromise.then(onCheck, onCheckError);
    }
    function onSetError(err) {
      assert.fail(err, '(no exception)', 'Setting the passcode has thrown');
      done();
    }
    setPromise.then(onSet, onSetError);
  });
});
