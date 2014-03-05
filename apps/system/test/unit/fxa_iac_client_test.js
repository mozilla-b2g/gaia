'use strict';

require('/shared/js/fxa_iac_client.js');
requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_app.js');

suite('FirefoxOS Accounts IAC Client Suite', function() {
  var realMozApps;

  var port = {
    postMessage: function() {},

    methodName: null,

    _onmessage: null,

    set onmessage(cb) {
      port._onmessage = cb;
      setTimeout(function() {
        var msg = {
          data: {
            data: {}
          }
        };

        if (port.methodName !== null) {
          msg.data.methodName = port.methodName;
        }

        cb(msg);
      }, 0);
    }
  };
  var postMessageStub;

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockAppsMgmt;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
  });

  setup(function() {
    // For each test, setup the 'self' app, able to
    // do IAC
    var app = new MockApp({
      'connect': function(keyword) {
        var future = {
          'then': function(cb) {}
        };
        var connectStub = sinon.stub(future, 'then', function(cb) {
          cb([port]);
        });
        return future;
      }
    });
    navigator.mozApps.setSelf(app);
  });

  teardown(function() {
    if (postMessageStub && postMessageStub.restore) {
       postMessageStub.restore();
    }
  });

  test('Library integrity', function() {
    assert.isNotNull(FxAccountsIACHelper);
    assert.equal(Object.keys(FxAccountsIACHelper).length, 7);
  });

  ['getAccounts', 'openFlow', 'logout'].forEach(function(method) {
    suite(method + ' suite', function() {
      setup(function() {
        postMessageStub = sinon.stub(port, 'postMessage');
      });

      test('Check that we send the ' + method + ' message', function(done) {
        this.timeout(20000);
        port.methodName = method;
        FxAccountsIACHelper[method](
          function() {
            assert.ok(postMessageStub.called);
            var arg = postMessageStub.args[0][0];
            // We do have an id for this message
            assert.isNotNull(arg.id);
            assert.isNotNull(arg);
            // Remove the id, as it's automatically generated
            delete arg.id;

            assert.deepEqual(arg, {
              'name': method
            });
            done();
          },
          function() {
            // Break if we are called.
            assert.ok(false);
            done();
          }
        );
      });

      teardown(function() {
        postMessageStub.restore();
      });
    });
  });

  suite('addEventListener tests', function() {
    var callbackCalled = false;
    var otherCallbackCalled = false;

    var listener = function() {
      callbackCalled = true;
    };

    var otherListener = function() {
      otherCallbackCalled = true;
    };

    setup(function() {
      FxAccountsIACHelper.addEventListener('myEvent', listener);
      FxAccountsIACHelper.addEventListener('myOtherEvent', otherListener);

      port._onmessage({
        data: {
          data: {},
          eventName: 'myEvent'
        }
      });
    });

    test('Check that we trigger the appropriate callback', function() {
      assert.ok(callbackCalled);
      assert.ok(!otherCallbackCalled);
    });

    teardown(function() {
      FxAccountsIACHelper.removeEventListener('myEvent', listener);
      FxAccountsIACHelper.removeEventListener('myOtherEvent', otherListener);
    });
  });


  suite('removeEventListener tests', function() {
    var callbackCalled = false;
    var otherCallbackCalled = false;

    var listener = function() {
      callbackCalled = true;
    };

    var otherListener = function() {
      otherCallbackCalled = true;
    };

    setup(function() {
      FxAccountsIACHelper.addEventListener('myEvent', listener);
      FxAccountsIACHelper.addEventListener('myOtherEvent', otherListener);
      FxAccountsIACHelper.removeEventListener('myEvent', listener);

      port._onmessage({
        data: {
          data: {},
          eventName: 'myEvent'
        }
      });

      port._onmessage({
        data: {
          data: {},
          eventName: 'myOtherEvent'
        }
      });
    });

    test('Check that we trigger the appropriate callback', function() {
      assert.ok(!callbackCalled);
      assert.ok(otherCallbackCalled);
    });
  });
});
