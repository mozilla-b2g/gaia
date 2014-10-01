'use strict';

requireApp('system/test/unit/mock_apps_mgmt.js');
requireApp('system/test/unit/mock_app.js');
mocha.globals(['FxAccountsIACHelper']);

// Return a function that is the partial application of the function f over its
// initial arguments.  This allows us to construct methods to invoke for IAC
// calls where we know the last two arguments (success and error callbacks),
// but we don't know whether there may be additional initial arguments (as in
// the case of getAssertionForSignedInUser).
function partial(f) {
  let as = Array.prototype.slice.call(arguments, 1);
  return function() {
    return f.apply(this, as.concat(Array.prototype.slice.call(arguments)));
  };
}

// XXX consider moving this to a separate file if it gets much more complex

// arthurcc's suggested replacement:
var port = {
  postMessage: function(message) {
    var msg = {
      data: {
        data: {},
        methodName: message.name
      }
    };
    setTimeout(function() {
      port._onmessage(msg);
    });
  },
  _onmessage: null,
  set onmessage(cb) {
    port._onmessage = cb;
  }
};

suite('FirefoxOS Accounts IAC Client Suite', function() {
  var realMozApps;

  var postMessageSpy;

  // Return a callback to be invoked on success of an IAC method.
  // Ensure that the IAC message is equal to expected, then call done.
  function getSuccessCallback(done, expected) {
    return function() {
      assert.ok(postMessageSpy.called);
      var arg = postMessageSpy.args[0][0];
      // We do have an id for this message
      assert.isNotNull(arg.id);
      assert.isNotNull(arg);
      // Remove the id, as it's automatically generated
      delete arg.id;

      assert.deepEqual(arg, expected);
      done();
    };
  }

  // Return a callback to be invoked on failure of an IAC method.
  function getFailureCallback(done) {
    return function() {
      // Break if we are called.
      assert.ok(false);
      done();
    };
  }

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockAppsMgmt;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
  });

  setup(function(done) {
    // For each test, setup the 'self' app, able to
    // do IAC
    var app = new MockApp({
      'connect': function(keyword) {
        var future = {
          'then': function(cb) {}
        };
        sinon.stub(future, 'then', function(cb) {
          cb([port]);
        });
        return future;
      }
    });
    navigator.mozApps.setSelf(app);
    // XXX we have to require() the system under test *after* we define the
    //     MockApp, because the code calls app.connect() as soon as it is loaded
    require('/shared/js/fxa_iac_client.js', done);
  });

  teardown(function() {
    if (postMessageSpy && postMessageSpy.restore) {
       postMessageSpy.restore();
    }
  });

  test('Library integrity', function() {
    assert.isNotNull(FxAccountsIACHelper);
    assert.equal(Object.keys(FxAccountsIACHelper).length, 10);
  });

  // Test methods that accept no args other than success and error callbacks
  test('IAC Methods', function() {
    // The dictionary of expected results needs to be defined in this test so
    // it will be constructed after setup() executes and the
    // FxAccountsIACHelper is defined.
    var expectedResults = {
      'getAccounts': {
        method: FxAccountsIACHelper.getAccounts,
        message: {name: 'getAccounts'}
      },
      'getAssertionForSignedInUser': {
        method: partial(
                    FxAccountsIACHelper.getAssertionForSignedInUser,
                    'https://example.org',
                    {foo: 42}),
        message: {
          name: 'getAssertionForSignedInUser',
          audience: 'https://example.org',
          options: {foo: 42}
        }
      },
      'openFlow': {
        method: FxAccountsIACHelper.openFlow,
        message: {name: 'openFlow'}
      },
      'logout': {
        method: FxAccountsIACHelper.logout,
        message: {name: 'logout'}
      }
    };
    var expected;

    Object.keys(expectedResults).forEach(function(method) {
      suite(method + ' suite', function() {
        setup(function() {
          postMessageSpy = sinon.spy(port, 'postMessage');
          expected = expectedResults[method];
        });

        test('Check that we send the ' + method + ' message', function(done) {
          this.timeout(20000);
          port.methodName = method;
          expected.method(
            getSuccessCallback(done, expected.message),
            getFailureCallback(done)
          );
        });

        teardown(function() {
          postMessageSpy.restore();
        });
      });
    });
  });

  suite('refreshAuthentication suite', function() {
    setup(function() {
      postMessageSpy = sinon.spy(port, 'postMessage');
    });

    test('Check that we send the refreshAuth message', function(done) {
      this.timeout(20000);
      port.methodName = 'refreshAuthentication';
      FxAccountsIACHelper.refreshAuthentication('dummy@domain.org',
        function() {
          assert.ok(postMessageSpy.called);
          var arg = postMessageSpy.args[0][0];
          // We do have an id for this message
          assert.isNotNull(arg.id);
          assert.isNotNull(arg);
          // Remove the id, as it's automatically generated
          delete arg.id;

          assert.deepEqual(arg, {
            'name': 'refreshAuthentication',
            'email': 'dummy@domain.org'
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
      postMessageSpy.restore();
    });
  });

  suite('resendVerificationEmail suite', function() {
    setup(function() {
      postMessageSpy = sinon.spy(port, 'postMessage');
    });

    test('Check that we send the resend message', function(done) {
      this.timeout(20000);
      port.methodName = 'resendVerificationEmail';
      FxAccountsIACHelper.resendVerificationEmail('dummy@domain.org',
        function() {
          assert.ok(postMessageSpy.called);
          var arg = postMessageSpy.args[0][0];
          // We do have an id for this message
          assert.isNotNull(arg.id);
          assert.isNotNull(arg);
          // Remove the id, as it's automatically generated
          delete arg.id;

          assert.deepEqual(arg, {
            'name': 'resendVerificationEmail',
            'email': 'dummy@domain.org'
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
      postMessageSpy.restore();
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


  suite('Startup race condition tests - bug 974108', function() {
    var callbackCalled, otherCallbackCalled;

    var listener = function() {
      callbackCalled = true;
    };

    var otherListener = function() {
      otherCallbackCalled = true;
    };

    setup(function() {
      this.clock = sinon.useFakeTimers();
      var callbackCalled = false;
      var otherCallbackCalled = false;
      // we are testing that postmessage requests are queued, not overwritten,
      // during the period between starting the Helper and the port being open.
      // we need to clear out the port, add 2 new subscribers, then check both
      // are called.
      var app = new MockApp({
        'connect': function(keyword) {
          var future = {
            'then': function(cb) {}
          };
          sinon.stub(future, 'then', function(cb) {
            // wait a turn so that we can queue up multiple requests
            setTimeout(function() {
              cb([port]);
            }, 0);
          });
          return future;
        }
      });
      navigator.mozApps.setSelf(app);
      FxAccountsIACHelper.reset();
    });

    teardown(function() {
      this.clock.restore();
    });

    test('Should queue multiple requests until port is opened', function() {
      callbackCalled = false;
      otherCallbackCalled = false;
      // reset() will destroy the existing port, forcing message requests
      // to be queued up.
      FxAccountsIACHelper.reset();
      // two requests -- one to be sent as soon as the connection's ready,
      // the other after that.
      FxAccountsIACHelper.logout(otherListener);
      FxAccountsIACHelper.getAccounts(listener);
      this.clock.tick(1000);
      assert.isTrue(callbackCalled);
      assert.isTrue(otherCallbackCalled);
    });

    test('Should queue multiple callbacks for one request', function() {
      callbackCalled = false;
      otherCallbackCalled = false;
      FxAccountsIACHelper.reset();
      FxAccountsIACHelper.getAccounts(listener);
      FxAccountsIACHelper.getAccounts(otherListener);
      this.clock.tick(1000);
      assert.isTrue(callbackCalled);
      assert.isTrue(otherCallbackCalled);
    });
  });
});
