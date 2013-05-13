describe('marionette/drivers/abstract', function() {
  var subject,
      Backend,
      sent = [];

  cross.require(
    'marionette/drivers/abstract',
    'Marionette.Drivers.Abstract', function(obj) {
      Backend = obj;
    }
  );

  beforeEach(function() {
    subject = new Backend();

    sent = [];

    subject._sendCommand = function() {
      sent.push(arguments);
    };
  });

  describe('initialization', function() {

    it('should setup ._sendQueue', function() {
      expect(subject._sendQueue).to.eql([]);
    });

    it('should not be ready', function() {
      expect(subject.ready).to.be(false);
    });

    it('should setup ._responseQueue', function() {
      expect(subject._responseQueue).to.be.a(Array);
    });

    it('should have timeout set to 10000', function() {
      expect(subject.timeout).to.be(10000);
    });

    it('should be _waiting', function() {
      expect(subject._waiting).to.be(true);
    });
  });

  describe('event: device response', function() {

    var callback,
        callbackResponse,
        response;

    beforeEach(function() {
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
      expect(subject._waiting).to.be(true);
    });

    describe('when response is for different device', function() {
      beforeEach(function() {
        subject.connectionId = 101;
        subject._onDeviceResponse(response);
      });

      it('should trigger response callbacks', function() {
        expect(callbackResponse).to.be(null);
      });
    });

    describe('when response is for device id', function() {
      var calledNext;

      beforeEach(function() {
        calledNext = false;
        subject._nextCommand = function() {
          calledNext = true;
          Backend.prototype._nextCommand.apply(this, arguments);
        };
        subject._onDeviceResponse(response);
      });

      it('should trigger response callbacks', function() {
        expect(callbackResponse[0]).to.eql(response.response);
      });

      it('should clear response queue', function() {
        expect(subject._responseQueue.length).to.be(0);
      });

      it('should not be waiting', function() {
        expect(subject._waiting).to.be(false);
      });

    });
  });

  describe('.close', function() {

    var calledClose;

    beforeEach(function() {
      calledClose = false;
      subject.ready = true;
      subject._responseQueue = [function() {}];
      subject._close = function() {
        calledClose = true;
      };
      subject.close();
    });

    it('should call _close', function() {
      expect(calledClose).to.be(true);
    });

    it('should not be ready', function() {
      expect(subject.ready).to.be(false);
    });

    it('should clean up _responseQueue', function() {
      expect(subject._responseQueue.length).to.be(0);
    });

  });

  describe('.connect', function() {
    var cmd, calledChild;

    beforeEach(function(done) {
      cmd = exampleCmds.connect();
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

      expect(subject._waiting).to.be(true);

      subject.connect(function() {
        done();
      });
    });

    it('should set .traits', function() {
      expect(subject.traits).to.eql([]);
    });

    it('should set .applicationType', function() {
      expect(subject.applicationType).to.be(cmd.applicationType);
    });

    it('should call _connect', function() {
      expect(calledChild).to.be(true);
    });

    it('should not be waiting', function() {
      expect(subject._waiting).to.be(false);
    });

    it('should be ready', function() {
      expect(subject.ready).to.be(true);
    });

  });

  describe('._nextCommand', function() {
    var cmd1, cmd2;

    beforeEach(function() {
      cmd1 = exampleCmds.newSession();
      cmd2 = exampleCmds.newSession({isOther: true});
      subject._sendQueue[0] = cmd1;
      subject._sendQueue[1] = cmd2;
    });

    describe('when waiting', function() {
      beforeEach(function() {
        subject._waiting = true;
        subject._nextCommand();
      });

      it('should not send command to server', function() {
        expect(sent.length).to.be(0);
      });
    });

    describe('when not waiting', function() {
      beforeEach(function() {
        subject._waiting = false;
        subject._nextCommand();
      });

      it('should be waiting', function() {
        expect(subject._waiting).to.be(true);
      });

      it('should send command to server', function() {
        expect(sent[0][0]).to.eql(cmd1);
      });

    });

    describe('when there are no comamnds and we are not waiting', function() {
      beforeEach(function() {
        //emulate connect
        subject._waiting = false;

        subject._responseQueue = [];
        subject._sendQueue = [];
        subject._nextCommand();
      });

      it('should not be waiting', function() {
        expect(subject._waiting).to.be(false);
      });
    });

  });

  describe('.send', function() {
    var cmd, cb = function() {};

    beforeEach(function() {
      cmd = exampleCmds.newSession();
    });

    describe('when device is not ready', function() {

      it('should throw an error', function() {
        expect(function() {
          subject.send({ type: 'newSession' });
        }).to.throwError(/not ready/);
      });
    });

    describe('when not waiting for a response', function() {
      beforeEach(function() {
        //emulate connect
        subject.ready = true;
        subject._waiting = false;

        subject.send(cmd, cb);
      });

      it('should send command', function() {
        expect(sent.length).to.be(1);
      });

      it('should be waiting', function() {
        expect(subject._waiting).to.be(true);
      });
    });

    describe('when waiting for a response', function() {

      var nextCalled;

      beforeEach(function() {
        subject.ready = true;
        subject._waiting = true;

        nextCalled = false;
        subject._nextCommand = function() {
          nextCalled = true;
        };

        subject.send(cmd, cb);
      });

      it('should call next', function() {
        expect(nextCalled).to.be(true);
      });

      it('should add send command to queue', function() {
        expect(subject._sendQueue[0]).to.be(cmd);
      });

      it('should add calback to response queue', function() {
        expect(subject._responseQueue[0]).to.be(cb);
      });
    });

  });


});

