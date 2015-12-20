/* global DeviceInteraction, MockDriver, assert, exampleCmds, helper, setup */
'use strict';
suite('marionette/client', function() {

  var subject, driver, cb, cbResponse,
      device, Element, Client, Exception;

  helper.require('element', function(obj) {
    Element = obj;
  });

  helper.require('error', function(obj) {
    Exception = obj;
  });

  helper.require('client', function(obj) {
    Client = obj;
  });

  device = new DeviceInteraction(exampleCmds, function() {
    return subject;
  });

  function commandCallback(error, value) {
    commandCallback.error = error;
    commandCallback.value = value;
  }

  setup(function() {
    commandCallback.value = null;
    driver = new MockDriver();
    subject = new Client(driver);
    cb = function() {
      cbResponse = arguments;
    };
  });

  suite('initialization', function() {
    test('should save .driver', function() {
      assert.strictEqual(subject.driver, driver);
    });

    suite('without driver', function() {
      setup(function() {
        subject = new Client(null, { lazy: true });
      });

      test('should not explode', function() {
        assert.notOk(subject.driver);
      });
    });
  });

  suite('hooks', function() {

    test('should not fail running missing hooks', function(done) {
      subject.runHook('fakemissingyey', done);
    });

    test('should handle errors in hooks', function(done) {
      var myErr = new Error('err');
      // success
      subject.addHook('test', function(complete) {
        complete();
      });

      // failure
      subject.addHook('test', function(complete) {
        complete(myErr);
      });

      // after failure should not run
      subject.addHook('test', function(complete) {
        done(new Error('should not run hooks after error'));
      });

      subject.runHook('test', function(err) {
        assert.strictEqual(err, myErr);
        done();
      });
    });


    suite('success', function() {
      var called = [];

      function logSuccess(name) {
        return function(done) {
          process.nextTick(function() {
            called.push(name);
            done();
          });
        };
      }

      setup(function() {
        called.length = 0;
      });

      test('should handle adding a hook in a hook', function(done) {
        var calledHook = false;
        subject.addHook('test', function(hookOne) {
          hookOne();
          subject.addHook('test', function(hookTwo) {
            calledHook = true;
            hookTwo();
          });
        });

        subject.runHook('test', function() {
          assert.ok(calledHook);
          done();
        });
      });

      test('should run in context of client', function(done) {
        subject.addHook('test', function(completeHook) {
          assert.strictEqual(subject, this);
          completeHook();
        });

        subject.runHook('test', done);
      });

      test('should run all hooks', function(done) {
        subject.addHook('test', logSuccess('one'))
               .addHook('test', logSuccess('two'))
               .addHook('test', logSuccess('three'));

        subject.runHook('test', function() {
          assert.deepEqual(called, ['one', 'two', 'three']);
          done();
        });
      });

    });
  });

  suite('.plugin', function() {
    test('should allow chaining', function() {
      var one = {},
          two = {};

      function pluginOne() {
        return one;
      }

      function pluginTwo() {
        return two;
      }

      subject.plugin('one', pluginOne).
              plugin('two', pluginTwo);

      assert.strictEqual(subject.one, one);
      assert.strictEqual(subject.two, two);
    });

    test('should invoke plugin without name', function() {
      var calledPlugin;
      var options = {};

      function plugin(client, opts) {
        assert.strictEqual(client, subject);
        assert.strictEqual(opts, options);
        calledPlugin = true;
      }

      subject.plugin(null, plugin, options);
      assert.ok(calledPlugin);
    });

    test('should assign result to the given name', function() {
      var myObj = {};
      function plugin() {
        return myObj;
      }

      subject.plugin('yey', plugin);
      assert.strictEqual(subject.yey, myObj);
    });

    test('should work with .setup', function() {
      var myObj = {};
      function plugin() {}
      plugin.setup = function() {
        return myObj;
      };

      subject.plugin('woot', plugin);
      assert.strictEqual(subject.woot, myObj);
    });
  });

  suite('._handleCallback', function() {
    var calledWith;

    function usesCallback() {

      test('should handle number errors', function() {
        var calledWith, err;

        err = {
          status: 500,
          message: 'foo',
          stacktrace: 'bar'
        };

        subject._handleCallback(function() {
          calledWith = arguments;
        }, err, null);

        assert.instanceOf(calledWith[0], Exception);
        assert.include(calledWith[0].message, 'foo');
        assert.include(calledWith[0].stack, 'bar');
      });

      test('should handle string errors', function() {
        var calledWith, err;

        err = {
          status: 'no such element',
          message: 'foo',
          stacktrace: 'bar'
        };

        subject._handleCallback(function() {
          calledWith = arguments;
        }, err, null);

        assert.instanceOf(calledWith[0], Exception);
        assert.include(calledWith[0].message, 'foo');
        assert.include(calledWith[0].stack, 'bar');
      });

      test('should use callback when provided', function(done) {
        subject._handleCallback(function(err, val) {
          assert.instanceOf(err, Exception);
          assert.strictEqual(val, 2);
          done();
        }, {}, 2);
      });

      test('should call onScriptTimeout on script timeout', function(done) {
        subject.onScriptTimeout = function(err) {
          assert.strictEqual(err.type, 'ScriptTimeout');
          done();
        };

        var err = {
          error: 'script timeout',
          message: 'foo',
          stacktrace: 'bar'
        };

        subject._handleCallback(function() {}, err, null);
      });
    }

    suite('with default', function() {

      setup(function() {
        calledWith = null;
        subject.defaultCallback = function() {
          calledWith = arguments;
        };
      });

      test('should use default when no callback is provided', function() {
        subject._handleCallback(null, 1, 2);
        assert.instanceOf(calledWith[0], Exception);
        assert.strictEqual(calledWith[1], 2);
      });

      usesCallback();

    });

    usesCallback();
  });

  suite('.searchMethods', function() {
    test('should have a list of methods', function() {
      assert.instanceOf(subject.searchMethods, Array);
      assert.operator(subject.searchMethods.length, '>', 3);
    });
  });

  suite('protocol 1 .send', function() {
    suite('when session: is present', function() {
      var result;

      setup(function() {
        subject.sessionId = 'session';
        subject.actor = 'actor';
        result = subject.send({name: 'newSession'});
      });

      test('should be chainable', function() {
        assert.strictEqual(result, subject);
      });

      test('should add session to cmd', function() {
        assert.deepEqual(driver.sent[0], {
          to: subject.actor,
          session: subject.sessionId,
          name: 'newSession',
        });
      });
    });

    suite('when to: is not given', function() {
      suite('with an actor', function() {
        setup(function() {
          subject.actor = 'foo';
          subject.send({name: '_getActorId'}, cb);
        });

        test('should add to:', function() {
          assert.deepEqual(driver.sent[0], {
            to: 'foo',
            name: '_getActorId',
          });
        });
      });

      suite('without an actor', function() {
        setup(function() {
          subject.send({name: '_getActorId'}, cb);
        });

        test('should add to', function() {
          assert.deepEqual(driver.sent[0], {
            to: 'root',
            name: '_getActorId',
          });
        });
      });
    });
  });

  suite('protocol 2 .send', function() {
    var result;
    setup(function() {
      subject.protocol = 2;
      result = subject.send({name: 'get', parameters: {'url': 'about:blank'}});
    });

    test('should be chainable', function() {
      assert.strictEqual(result, subject);
    });

    test('sends exact packet', function() {
      assert.deepEqual(driver.sent[0], {
        name: 'get',
        parameters: {'url': 'about:blank'},
      });
    });
  });

  suite('.scope', function() {
    suite('first subscope', function() {
      var scope;
      var options = {
        scriptTimeout: 150,
        searchTimeout: 175,
        context: 'chrome'
      };

      setup(function() {
        scope = subject.scope(options);
        // trigger the new command.
        scope.goUrl();
      });

      Object.keys(options).forEach(function(key) {
        var value = options[key];
        test('should update .' + key, function() {
          assert.strictEqual(scope[key], value);
          // has scoping changes
          assert.strictEqual(scope._scope[key], value);
        });
      });

      test('should update the ._scope when state changes in scoped',
          function() {
        scope.setScriptTimeout(250);
        assert.strictEqual(scope._scope.scriptTimeout, 250);
      });

      test('should not update sibling scope', function() {
        var sibling = subject.scope(options);
        sibling.setScriptTimeout(999);

        assert.strictEqual(sibling._scope.scriptTimeout, 999);
        assert.notEqual(scope._scope.scriptTimeout, 999);
      });
    });
  });

  suite('.startSession protocol version 1', function() {
    var result;
    var desiredCapabilities = {desiredCapability: true};

    setup(function(done) {
      var firesHook = false;

      subject.addHook('startSession', function(complete) {
        firesHook = true;
        complete();
      });

      result = subject.startSession(function() {
        assert.ok(firesHook);
        done();
      }, desiredCapabilities);

      device.shouldSend({parameters: {capabilities: desiredCapabilities}});

      driver.respond(exampleCmds.getMarionetteIDResponse());
      driver.respond(exampleCmds.newSessionResponseProto1());
    });

    test('should be chainable', function() {
      assert.strictEqual(result, subject);
    });

    test('should have an actor property', function() {
      assert.property(subject, 'actor');
      assert.isNotNull(subject.actor);
    });

    test('should have a sessionId property', function() {
      assert.property(subject, 'sessionId');
      assert.isNotNull(subject.sessionId);
    });

    test('should have protocol version 1', function() {
      assert.property(subject, 'protocol');
      assert.strictEqual(subject.protocol, 1);
    });
  });

  suite('.startSession protocol version 2', function() {
    var result;
    var response = exampleCmds.newSessionResponseProto2();
    var desiredCapabilities = {desiredCapability: true};

    setup(function(done) {
      subject.protocol = 2;

      var hookFired = false;
      subject.addHook('startSession', function(done) {
        hookFired = true;
        done();
      });

      result = subject.startSession(function() {
        cbResponse = arguments;
        assert.ok(hookFired);
        done();
      }, desiredCapabilities);

      device.
        withProtocol(2).
        shouldSend({
        parameters: {capabilities: desiredCapabilities}
      });

      driver.respond(response);
    });

    test('should be chainable', function() {
      assert.strictEqual(result, subject);
    });

    test('should have an empty actor property', function() {
      assert.isNull(subject.actor);
    });

    test('should have sessionId property', function() {
      assert.property(subject, 'sessionId');
      assert.strictEqual(subject.sessionId, response.sessionId);
    });

    test('should have a capabilities property', function() {
      assert.property(subject, 'capabilities');
      assert.strictEqual(subject.capabilities, response.capabilities);
    });

    test('should send newSession', function() {
      assert.strictEqual(driver.sent[0].name, 'newSession');
    });

    test('should send callback response', function() {
      assert.deepEqual(cbResponse[1], response);
    });

    test('should have protocol version 2', function() {
      assert.property(subject, 'protocol');
      assert.strictEqual(subject.protocol, 2);
    });
  });

  suite('._getActorId', function() {
    device
      .issues('_getActorId')
      .shouldSend({name: 'getMarionetteID'})
      .serverResponds('getMarionetteIDResponse')
      .callbackReceives('id');

    test('should save actor ID', function() {
      var resp = exampleCmds.getMarionetteIDResponse();
      assert.strictEqual(subject.actor, resp.id);
    });
  });

  suite('._sendCommand', function() {
    var cmd, response,
        calledUnmarshal, result,
        calledWith;

    suite('on success', function() {

      setup(function(done) {
        cmd = exampleCmds.getUrl();
        response = exampleCmds.getUrlResponse();

        calledUnmarshal = false;
        subject._unmarshalWebElement = function(value) {
          calledUnmarshal = true;
          assert.strictEqual(value, response);
          return 'foo';
        };

        result = subject._sendCommand(cmd, function() {
          calledWith = arguments;
          done();
        });

        driver.respond(response);
      });

      test('should send given command and format the result', function() {
        assert.strictEqual(result, subject);
      });

      test('should send command through _unmarshalWebElement', function() {
        assert.strictEqual(calledUnmarshal, true);
        assert.strictEqual(calledWith[1], 'foo');
      });

    });

    suite('on number error from protocol 1', function() {
      setup(function(done) {
        calledWith = null;
        cmd = exampleCmds.getUrl();
        response = exampleCmds.numberError();

        subject._sendCommand(cmd, function(err, data) {
          calledWith = arguments;
          done();
        }, 'value');
        driver.respond(response);
      });

      test('should pass error to callback', function() {
        assert.ok(calledWith[0]);
        assert.notOk(calledWith[1]);
      });
    });

    suite('on string error from protocol 1', function() {
      setup(function(done) {
        calledWith = null;
        cmd = exampleCmds.getUrl();
        response = exampleCmds.stringError();

        subject._sendCommand(cmd, function(err, data) {
          calledWith = arguments;
          done();
        }, 'value');
        driver.respond(response);
      });

      test('should pass error to callback', function() {
        assert.ok(calledWith[0]);
        assert.notOk(calledWith[1]);
      });
    });

    suite('on modern error from protocol 2', function() {
      setup(function(done) {
        calledWith = null;
        cmd = exampleCmds.getUrl();
        response = exampleCmds.modernError();

        subject._sendCommand(cmd, function(err, data) {
          calledWith = arguments;
          done();
        }, 'value');

        driver.respond(response);
      });

      test('should pass error to callback', function() {
        assert.ok(calledWith[0]);
        assert.notOk(calledWith[1]);
      });
    });
  });

  suite('.deleteSession', function() {
    var result;
    var callsClose;

    setup(function(done) {
      callsClose = false;
      var callsHook = false;

      subject.actor = '1';
      subject.sessionId = 'session id';
      subject.capabilities = {capability: true};

      subject.driver.close = function() {
        assert.strictEqual(callsHook, true);
        callsClose = true;
      };

      subject.addHook('deleteSession', function(complete) {
        callsHook = true;
        complete();
        process.nextTick(function() {
          driver.respond(exampleCmds.ok());
        });
      });

      result = subject.deleteSession(done);
    });

    test('should set actorId to null', function() {
      assert.isNull(subject.actor);
    });

    test('should set sessionId to null', function() {
      assert.isNull(subject.sessionId);
    });

    test('should set capabilities to null', function() {
      assert.isNull(subject.capabilities);
    });

    test('should be chainable', function() {
      assert.strictEqual(result, subject);
    });

    test('should close the connection', function() {
      assert.strictEqual(callsClose, true);
    });
  });

  suite('.setSearchTimeout', function() {
    test('should have default .searchTimeout', function() {
      assert.ok(subject.searchTimeout);
    });

    suite('after setting with protocol 1', function() {
      device.
        issues('setSearchTimeout', 50).
        shouldSend({
          name: 'setSearchTimeout',
          parameters: {
            ms: 50
          }
        }).
        serverResponds('ok').
        callbackReceives();

      test('should set timeout', function() {
        assert.strictEqual(subject.searchTimeout, 50);
      });
    });

    suite('after setting with protocol 2', function() {
      device.
        withProtocol(2).
        issues('setSearchTimeout', 50).
        shouldSend({
          name: 'setSearchTimeout',
          parameters: {
            ms: 50
          }
        }).
        serverResponds('ok').
        callbackReceives();

      test('should set timeout', function() {
        assert.strictEqual(subject.searchTimeout, 50);
      });
    });
  });

  suite('.sessionCapabilities with protocol 1', function() {
    device.
      withProtocol(1).
      issues('sessionCapabilities').
      shouldSend({
        name: 'getSessionCapabilities'
      }).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.sessionCapabilities with protocol 2', function() {
    device.
      withProtocol(2).
      issues('sessionCapabilities').
      shouldSend({
        name: 'getSessionCapabilities'
      }).
      serverResponds('capabilities').
      callbackReceives('capabilities');
  });

  suite('.getWindow', function() {
    device.
      issues('getWindow').
      shouldSend({
        name: 'getWindow'
      }).
      serverResponds('getWindowResponse').
      callbackReceives('value');
  });

  suite('.setContext with protocol 1', function() {
    test('should have a default context', function() {
      assert.strictEqual(subject.context, 'content');
    });

    suite('after setting context', function() {
      device.
        issues('setContext', 'chrome').
        shouldSend({
          name: 'setContext',
          parameters: {
            value: 'chrome'
          }
        }).
        serverResponds('ok').
        callbackReceives();

      test('should remember context', function() {
        assert.strictEqual(subject.context, 'chrome');
      });
    });
  });

  suite('.setContext with protocol 2', function() {
    test('should have a default context', function() {
      assert.strictEqual(subject.context, 'content');
    });

    suite('after setting context', function() {
      device.
        withProtocol(2).
        issues('setContext', 'chrome').
        shouldSend({
          name: 'setContext',
          parameters: {
            value: 'chrome'
          }
        }).
        serverResponds('ok').
        callbackReceives();

      test('should remember context', function() {
        assert.strictEqual(subject.context, 'chrome');
      });
    });
  });

  suite('.getWindows with protocol 1', function() {
    device.
      withProtocol(1).
      issues('getWindows').
      shouldSend({
        name: 'getWindows'
      }).
      serverResponds('getWindowsResponseProto1').
      callbackReceives('value');
  });

  suite('.getWindows with protocol 2', function() {
    device.
      withProtocol(2).
      issues('getWindows').
      shouldSend({
        name: 'getWindows'
      }).
      serverResponds('getWindowsResponseProto2').
      callbackReceives();
  });

  suite('.switchToWindow with protocol 1', function() {
    device.
      issues('switchToWindow', '1-b2g').
      shouldSend({
        name: 'switchToWindow',
        parameters: {
          value: '1-b2g'
        }
      }).
      serverResponds('ok').
      callbackReceives();
  });

  suite('.switchToWindow with protocol 2', function() {
    device.
      withProtocol(2).
      issues('switchToWindow', '1-b2g').
      shouldSend({
        name: 'switchToWindow',
        parameters: {
          value: '1-b2g'
        }
      }).
      serverResponds('ok').
      callbackReceives();
  });

  suite('.getWindowType', function() {
    device.
      issues('getWindowType').
      shouldSend({
        name: 'getWindowType'
      }).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.switchToFrame', function() {
    suite('when given nothing', function() {
      device.
        issues('switchToFrame').
        shouldSend({ name: 'switchToFrame' }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when given a callback', function() {
      setup(function() {
        subject.switchToFrame(commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToFrame'
        }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when given an element', function() {
      var el;

      setup(function() {
        el = new Element('77', subject);
        subject.switchToFrame(el, commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToFrame',
          parameters: {
            element: '77'
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when given an object with ELEMENT', function() {
      var el;

      setup(function() {
        el = { ELEMENT: 'foo' };
        subject.switchToFrame(el, commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToFrame',
          parameters: {
            element: 'foo'
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when switch to a frame with options', function() {
      var el, options;

      setup(function() {
        el = { ELEMENT: 'foo' };
        options = { focus: true };
        subject.switchToFrame(el, options, commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToFrame',
          parameters: {
            element: 'foo',
            focus: true
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when switch to a frame with multiple options', function() {
      var el, options;

      setup(function() {
        el = {ELEMENT: 'foo'};
        options = {
          focus: true,
          testOption: 'hi'
        };
        subject.switchToFrame(el, options, commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToFrame',
          parameters: {
            element: 'foo',
            focus: true,
            testOption: 'hi'
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });
  });

  suite('.switchToShadowRoot', function() {
    suite('when given nothing', function() {
      device.
        issues('switchToShadowRoot').
        shouldSend({ name: 'switchToShadowRoot' }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when given a callback', function() {
      setup(function() {
        subject.switchToShadowRoot(commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToShadowRoot'
        }).
        serverResponds('ok').
        callbackReceives();
    });

    suite('when given an element', function() {
      var el;

      setup(function() {
        el = new Element('78', subject);
        subject.switchToShadowRoot(el, commandCallback);
      });

      device.
        shouldSend({
          name: 'switchToShadowRoot',
          parameters: {
            id: '78'
          }
        }).
        serverResponds('ok').
        callbackReceives();
    });
  });

  suite('.importScript', function() {
    device.
      issues('importScript', 'foo').
      shouldSend({
        name: 'importScript',
        parameters: {
          script: 'foo'
        }
      }).
      serverResponds('ok').
      callbackReceives();
  });

  suite('.setScriptTimeout', function() {
    test('should have a default timeout', function() {
      assert.ok(subject.scriptTimeout);
    });

    suite('after setting timeout', function() {
      device.
        issues('setScriptTimeout', 100).
        shouldSend({
          name: 'setScriptTimeout',
          parameters: {
            ms: 100
          }
        }).
        serverResponds('ok').
        callbackReceives();

      test('should update .scriptTimeout', function() {
        assert.strictEqual(subject.scriptTimeout, 100);
      });

      test('driver should have gotten it', function() {
        // this only work with the MockDevice.
        assert.strictEqual(subject.driver.timeout, 100);
      });
    });
  });

  suite('.title', function() {
    device.
      issues('title').
      shouldSend({
        name: 'getTitle'
      }).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.goUrl', function() {
    device.
      issues('goUrl', 'http://wow').
      shouldSend({
        name: 'goUrl',
        parameters: {
          url: 'http://wow'
        }
      }).
      serverResponds('ok').
      callbackReceives();
  });

  suite('.getUrl', function() {
    device.
      issues('getUrl').
      shouldSend({
        name: 'getUrl'
      }).
      serverResponds('getUrlResponse').
      callbackReceives('value');
  });

  suite('.goForward', function() {
    device.
      issues('goForward').
      shouldSend({
        name: 'goForward'
      }).
      serverResponds('ok').
      callbackReceives();
  });

  suite('.goBack', function() {
    device.
      issues('goBack').
      shouldSend({
        name: 'goBack'
      }).
      serverResponds('ok').
      callbackReceives();
  });

  suite('script executing commands', function() {
    var calledWith,
        script = 'return null;';

    setup(function() {
      calledWith = null;
      subject._executeScript = function() {
        calledWith = arguments;
      };
    });

    suite('.executeScript', function() {
      test('should call _executeScript', function() {
        subject.executeScript(script, commandCallback);
        assert.deepEqual(calledWith, [
          {
            name: 'executeScript',
            parameters: {
              script: script,
              args: null,
              sandbox: 'default',
            }
          },
          commandCallback
        ]);
      });

      test('should call _executeScript with arguments', function() {
        subject.executeScript(script, ['foo'], commandCallback);
        assert.deepEqual(calledWith, [
          {
            name: 'executeScript',
            parameters: {
              script: script,
              args: ['foo'],
              sandbox: 'default',
            }
          },
          commandCallback
        ]);
      });

      test('should call _executeScript with custom sandbox', function() {
        subject.executeScript(script, null, commandCallback, 'foo');
        assert.deepEqual(calledWith, [
          {
            name: 'executeScript',
            parameters: {
              script: script,
              args: null,
              sandbox: 'foo',
            }
          },
          commandCallback
        ]);
      });
    });

    suite('.executeJsScript', function() {
      setup(function() {
        subject.executeJsScript(script, commandCallback);
      });

      test('should call _executeScript', function() {
        assert.deepEqual(calledWith, [{
          name: 'executeJSScript',
          parameters: {
            script: script,
            timeout: true,
            args: null,
            sandbox: 'simpletest',
          }
        }, commandCallback]);
      });
    });

    suite('.executeAsyncScript', function() {
      test('should call _executeScript', function() {
        subject.executeAsyncScript(script, commandCallback);
        assert.deepEqual(calledWith, [
          {
            name: 'executeAsyncScript',
            parameters: {
              script: script,
              args: null,
              sandbox: 'default',
            }
          },
          commandCallback
        ]);
      });

      test('should call _executeScript with arguments', function() {
        subject.executeAsyncScript(script, ['foo'], commandCallback);
        assert.deepEqual(calledWith, [
          {
            name: 'executeAsyncScript',
            parameters: {
              script: script,
              args: ['foo'],
              sandbox: 'default',
            }
          },
          commandCallback
        ]);
      });

      test('should call _executeScript with custom sandbox', function() {
        subject.executeAsyncScript(script, null, commandCallback, 'foo');
        assert.deepEqual(calledWith, [
          {
            name: 'executeAsyncScript',
            parameters: {
              script: script,
              args: null,
              sandbox: 'foo',
            }
          },
          commandCallback
        ]);
      });
    });
  });

  suite('.refresh', function() {
    device.
      issues('refresh').
      serverResponds('ok').
      shouldSend({ name: 'refresh' }).
      callbackReceives();
  });

  suite('.log', function() {
    device.
      issues('log', 'wow', 'info').
      shouldSend({ name: 'log', parameters: {value: 'wow', level: 'info' }}).
      serverResponds('ok').
      callbackReceives();
  });

  suite('.getLogs with protocol 1', function() {
    device.
      issues('getLogs').
      shouldSend({name: 'getLogs'}).
      serverResponds('getLogsResponseProto1').
      callbackReceives('value');
  });

  suite('.getLogs with protocol 2', function() {
    device.
      withProtocol(2).
      issues('getLogs').
      shouldSend({name: 'getLogs'}).
      serverResponds('getLogsResponseProto2').
      callbackReceives();
  });

  suite('.pageSource', function() {
    device.
      issues('pageSource').
      shouldSend({ name: 'getPageSource' }).
      serverResponds('value').
      callbackReceives('value');
  });

  suite('.screenshot', function() {

    suite('without options', function() {
      device.
        issues('screenshot').
        shouldSend({ name: 'screenShot' }).
        serverResponds('screenshotResponse').
        callbackReceives('value');
    });

    suite('with options', function() {
      device.
        issues('screenshot', {
          name: 'untrusted',
          element: { id: 33 },
          highlights: [ { id: 23 }, { id: 99 } ],
        }).
        shouldSend({
          name: 'screenShot',
          parameters: {
            id: 33,
            highlights: [ 23, 99 ]
          },
        }).
        serverResponds('screenshotResponse').
        callbackReceives('value');
    });
  });

  suite('._findElement', function() {

    function receivesElement() {
      var els;

      suite('callback argument', function() {
        setup(function() {
          var value = device.commandCallback.value;

          if (!(value instanceof Element) && !(value instanceof Array))
            throw new Error(
                'Result is not an array or an Element instance: ' + value);

          if (value instanceof Array)
            els = value;
          else
            els = [value];
        });

        test('should be an instance of Marionette.Element', function() {
          els.forEach(function(el) {
            assert.instanceOf(el, Element);
            assert.strictEqual(el.client, subject);
            assert.include(el.id, '{');
          });
        });
      });
    }

    suite('with overriden Element', function() {
      var MyElement;

      setup(function() {
        MyElement = function() {
          Element.apply(this, arguments);
        };

        MyElement.prototype = { __proto__: Element.prototype };
        subject.Element = MyElement;
      });

      device.
        issues('_findElement', 'findElement', '#wow').
        shouldSend({
          name: 'findElement',
          parameters: {
            value: '#wow',
            using: 'css selector'
          }
        }).
        serverResponds('findElementResponse');

      test('should return an instance of MyElement', function() {
        var el = device.commandCallback.value;
        assert.instanceOf(el, MyElement);
      });
    });

    suite('simple find with defaults', function() {
      device.
        issues('_findElement', 'findElement', '#wow').
        shouldSend({
          name: 'findElement',
          parameters: {
            value: '#wow',
            using: 'css selector'
          }
        }).
        serverResponds('findElementResponse');

      receivesElement();
    });

    suite('find with all options', function() {
      device.
        issues('_findElement', 'findElements', 'wow', 'class name', 1).
        shouldSend({
          name: 'findElements',
          parameters: {
            value: 'wow',
            using: 'class name',
            element: 1
          }
        }).
        serverResponds('findElementResponse');

      receivesElement();
    });

    suite('trying to find with invalid \'using\'', function() {

      test('should fail', function() {
        assert.throws(function() {
          subject._findElement(
            'findElement', 'wow', 'fake', function() {}
          );
        }, /invalid option for using/);
      });
    });

  });

  suite('element finders', function() {
    var calledWith;

    function delegatesToFind(type) {
      suite('.' + type, function() {
        setup(function() {
          subject[type]('#query', commandCallback);
        });

        test('should call _findElement', function() {
          assert.deepEqual(calledWith, [
            type, '#query', commandCallback
          ]);
        });
      });
    }

    setup(function() {
      subject._findElement = function() {
        calledWith = arguments;
      };
    });

    delegatesToFind('findElement');
    delegatesToFind('findElements');
  });

  suite('._executeScript', function() {
      var cmd = 'return window.location',
          args = [{1: true}],
          sandbox = 'default',
          type = 'executeScript';

    suite('with args', function() {
      var request = {
        name: type,
        parameters: {
          script: cmd,
          args: args,
          sandbox: sandbox
        }
      };

      device.
        issues('_executeScript', request).
        shouldSend(request).
        serverResponds('getUrlResponse').
        callbackReceives('value');
    });

    suite('without args', function() {
      var request = {
        name: type,
        parameters: {
          script: cmd,
          sandbox: sandbox
        }
      };

      device.
        issues('_executeScript', request).
        shouldSend({
          name: type,
          parameters: {
            script: cmd,
            args: [],
            sandbox: sandbox
          }
        }).
        serverResponds('getUrlResponse').
        callbackReceives('value');
    });
  });

  suite('._newSession', function() {
    var desiredCapabilities = {desiredCapability: true};
    var response = exampleCmds.newSessionResponseProto1();

    setup(function(done) {
      subject._newSession(function() {
        cbResponse = arguments;
        done();
      }, desiredCapabilities);

      device.shouldSend({parameters: {capabilities: desiredCapabilities}});
      driver.respond(response);
    });

    test('should send newSession', function() {
      assert.strictEqual(driver.sent[0].name, 'newSession');
    });

    test('should save session ID', function() {
      assert.strictEqual(subject.sessionId, response.value);
    });

    test('should send callback response', function() {
      assert.deepEqual(cbResponse[1], response);
    });
  });

  suite('._convertFunction', function() {
    var result;
    var fn = function() { return true; };

    setup(function() {
      result = subject._convertFunction(fn);
      result = result.replace(/\n|\s/g, '');
    });

    test('should format function to call immediately', function() {
      var expected;
      expected = 'return (function() { return true;}.apply(this, arguments));';
      expected = expected.replace(/\n|\s/g, '');
      assert.strictEqual(result, expected);
    });

    test('should not format strings', function() {
      assert.strictEqual(subject._convertFunction('foo'), 'foo');
    });

  });

  suite('._unmarshalWebElement', function() {
    var result;
    suite('when it is an element', function() {
      setup(function() {
        result = subject._unmarshalWebElement({'ELEMENT': 'foo'});
      });

      test('should return an instance of element', function() {
        assert.instanceOf(result, Element);
        assert.strictEqual(result.id, 'foo');
      });
    });

    suite('when it is not an element', function() {
      var obj = {'foo': true};

      setup(function() {
        result = subject._unmarshalWebElement(obj);
      });

      test('should return same object', function() {
        assert.strictEqual(result, obj);
      });
    });
  });

  suite('._prepareArguments', function() {
    var args, result;

    setup(function() {
      args = [
        new Element('{uuid}', subject),
        'wow',
        true
      ];

      result = subject._prepareArguments(args);
    });

    test('should process Marionette.Element instances into uuids', function() {
      assert.deepEqual(result, [
        {'ELEMENT': '{uuid}'},
        'wow',
        true
      ]);
    });

  });
});
