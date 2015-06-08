/* global assert, exampleCmds, helper */
'use strict';
suite('marionette/drivers/abstract', function() {
  var subject,
      Backend,
      sent = [];

  helper.require('drivers/abstract', function(obj) {
    Backend = obj;
  });

  setup(function() {
    subject = new Backend();

    sent = [];

    subject._sendCommand = function() {
      sent.push(arguments);
    };
  });

  suite('initialization', function() {

    test('should setup ._sendQueue', function() {
      assert.deepEqual(subject._sendQueue, []);
    });

    test('should not be ready', function() {
      assert.strictEqual(subject.ready, false);
    });

    test('should setup ._responseQueue', function() {
      assert.instanceOf(subject._responseQueue, Array);
    });

    test('should have timeout set to 10000', function() {
      assert.strictEqual(subject.timeout, 10000);
    });

    test('should be _waiting', function() {
      assert.strictEqual(subject._waiting, true);
    });
  });

  suite('event: device response', function() {

    var callback,
        callbackResponse,
        response;

    setup(function() {
      callbackResponse = null;
      response = {
        id: 10,
        response: {
          from: 'marionette',
          value: 'hit'
        }
      };

      //emulate connect
      subject.connectionId = 10;
      subject.ready = true;
      subject._waiting = false;

      callback = function() {
        callbackResponse = arguments;
      };

      subject.send(exampleCmds.newSession(), callback);
      assert.strictEqual(subject._waiting, true);
    });

    suite('when response is for different device', function() {
      setup(function() {
        subject.connectionId = 101;
        subject._onDeviceResponse(response);
      });

      test('should trigger response callbacks', function() {
        assert.strictEqual(callbackResponse, null);
      });
    });

    suite('when response is for device id', function() {
      var calledNext;

      setup(function() {
        calledNext = false;
        subject._nextCommand = function() {
          calledNext = true;
          Backend.prototype._nextCommand.apply(this, arguments);
        };
        subject._onDeviceResponse(response);
      });

      test('should trigger response callbacks', function() {
        assert.deepEqual(callbackResponse[0], response.response);
      });

      test('should clear response queue', function() {
        assert.strictEqual(subject._responseQueue.length, 0);
      });

      test('should not be waiting', function() {
        assert.strictEqual(subject._waiting, false);
      });

    });
  });

  suite('.close', function() {

    var calledClose;

    setup(function() {
      calledClose = false;
      subject.ready = true;
      subject._responseQueue = [function() {}];
      subject._close = function() {
        calledClose = true;
      };
      subject.close();
    });

    test('should call _close', function() {
      assert.strictEqual(calledClose, true);
    });

    test('should not be ready', function() {
      assert.strictEqual(subject.ready, false);
    });

    test('should clean up _responseQueue', function() {
      assert.strictEqual(subject._responseQueue.length, 0);
    });

  });

  suite('.connect with protocol 1', function() {
    var cmd, calledChild;

    setup(function(done) {
      cmd = exampleCmds.connectProto1();
      calledChild = false;

      subject._connect = function() {
        subject.connectionId = 10;
        calledChild = true;
        //this will cause connect to callback to fire
        subject._onDeviceResponse({
          id: 10,
          response: cmd
        });
      };

      assert.strictEqual(subject._waiting, true);

      subject.connect(function() {
        done();
      });
    });

    test('should set .marionetteProtocol', function() {
      assert.property(subject, 'marionetteProtocol');
      assert.strictEqual(subject.marionetteProtocol, 1 /* fallback */);
    });

    test('should set .applicationType', function() {
      assert.property(subject, 'applicationType');
      assert.strictEqual(subject.applicationType, cmd.applicationType);
    });

    test('should set .traits', function() {
      assert.property(subject, 'traits');
      assert.strictEqual(subject.traits, cmd.traits);
    });

    test('should call _connect', function() {
      assert.strictEqual(calledChild, true);
    });

    test('should not be waiting', function() {
      assert.strictEqual(subject._waiting, false);
    });

    test('should be ready', function() {
      assert.strictEqual(subject.ready, true);
    });
  });

  suite('.connect with protocol 2', function() {
    var cmd, calledChild;

    setup(function(done) {
      cmd = exampleCmds.connectProto2();
      calledChild = false;

      subject._connect = function() {
        subject.connectionId = 10;
        calledChild = true;
        //this will cause connect to callback to fire
        subject._onDeviceResponse({
          id: 10,
          response: cmd
        });
      };

      assert.strictEqual(subject._waiting, true);

      subject.connect(function() {
        done();
      });
    });

    test('should set .marionetteProtocol', function() {
      assert.property(subject, 'marionetteProtocol');
      assert.strictEqual(subject.marionetteProtocol, cmd.marionetteProtocol);
    });

    test('should set .applicationType', function() {
      assert.property(subject, 'applicationType');
      assert.strictEqual(subject.applicationType, cmd.applicationType);
    });

    test('should call _connect', function() {
      assert.strictEqual(calledChild, true);
    });

    test('should not be waiting', function() {
      assert.strictEqual(subject._waiting, false);
    });

    test('should be ready', function() {
      assert.strictEqual(subject.ready, true);
    });
  });

  suite('._nextCommand', function() {
    var cmd1, cmd2;

    setup(function() {
      cmd1 = exampleCmds.newSession();
      cmd2 = exampleCmds.newSession({isOther: true});
      subject._sendQueue[0] = cmd1;
      subject._sendQueue[1] = cmd2;
    });

    suite('when waiting', function() {
      setup(function() {
        subject._waiting = true;
        subject._nextCommand();
      });

      test('should not send command to server', function() {
        assert.strictEqual(sent.length, 0);
      });
    });

    suite('when not waiting', function() {
      setup(function() {
        subject._waiting = false;
        subject._nextCommand();
      });

      test('should be waiting', function() {
        assert.strictEqual(subject._waiting, true);
      });

      test('should send command to server', function() {
        assert.deepEqual(sent[0][0], cmd1);
      });

    });

    suite('when there are no comamnds and we are not waiting', function() {
      setup(function() {
        //emulate connect
        subject._waiting = false;

        subject._responseQueue = [];
        subject._sendQueue = [];
        subject._nextCommand();
      });

      test('should not be waiting', function() {
        assert.strictEqual(subject._waiting, false);
      });
    });

  });

  suite('.send', function() {
    var cmd, cb = function() {};

    setup(function() {
      cmd = exampleCmds.newSession();
    });

    suite('when device is not ready', function() {
      test('should throw an error', function() {
        assert.throws(function() {
          subject.send({ type: 'newSession' });
        }, /not ready/);
      });
    });

    suite('when not waiting for a response', function() {
      setup(function() {
        //emulate connect
        subject.ready = true;
        subject._waiting = false;

        subject.send(cmd, cb);
      });

      test('should send command', function() {
        assert.strictEqual(sent.length, 1);
      });

      test('should be waiting', function() {
        assert.strictEqual(subject._waiting, true);
      });
    });

    suite('when waiting for a response', function() {

      var nextCalled;

      setup(function() {
        subject.ready = true;
        subject._waiting = true;

        nextCalled = false;
        subject._nextCommand = function() {
          nextCalled = true;
        };

        subject.send(cmd, cb);
      });

      test('should call next', function() {
        assert.strictEqual(nextCalled, true);
      });

      test('should add send command to queue', function() {
        assert.strictEqual(subject._sendQueue[0], cmd);
      });

      test('should add calback to response queue', function() {
        assert.strictEqual(subject._responseQueue[0], cb);
      });
    });

  });


});
