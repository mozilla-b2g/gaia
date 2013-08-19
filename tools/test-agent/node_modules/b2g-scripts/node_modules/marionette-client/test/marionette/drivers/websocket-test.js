describe('marionette/drivers/websocket', function() {
  var WSClient,
      Abstract,
      Driver;

  cross.require(
    'test-agent/websocket-client',
    'TestAgent.WebsocketClient', function(obj) {
      WSClient = obj;
    }
  );

  cross.require(
    'marionette/drivers/abstract',
    'Marionette.Drivers.Abstract', function(obj) {
      Abstract = obj;
    }
  );


  cross.require(
    'marionette/drivers/websocket',
    'Marionette.Drivers.Websocket', function(obj) {
      Driver = obj;
    }
  );

  var subject,
      sent = [],
      clientSent = [],
      url = 'ws://foo';

  beforeEach(function() {
    subject = new Driver({
      url: url
    });

    sent = [];
    clientSent = [];

    subject.client.send = function() {
      clientSent.push(arguments);
    };

    subject._sendCommand = function() {
      sent.push(arguments);
      Driver.prototype._sendCommand.apply(this, arguments);
    };
  });

  describe('initialization', function() {
    it('should initialize .client with a websocket', function() {
      expect(subject.client).to.be.a(WSClient);
    });

    it('should pass client params along', function() {
      expect(subject.client.url).to.be(url);
    });

    it('should be an instance of Abstract', function() {
      expect(subject).to.be.a(Abstract);
    });

  });

  describe('event: device response', function() {

    var callback,
        callbackResponse,
        response;

    beforeEach(function(done) {
      callbackResponse = null;
      response = {
        id: 10,
        response: {
          from: 'marionette',
          value: 'hit'
        }
      };

      subject.connectionId = 10;
      subject.ready = true;

      callback = function() {
        callbackResponse = arguments;
        done();
      };

      subject.send(exampleCmds.newSession(), callback);
      expect(subject._waiting).to.be(true);

      subject.client.emit('device response', response);
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

  describe('._sendCommand', function() {
    beforeEach(function() {
      subject.connectionId = 10;
      subject.ready = true;
      subject._sendCommand(exampleCmds.newSession());
    });

    it('should send command to server', function() {
      expect(clientSent[0]).to.eql(['device command', {
        id: 10,
        command: exampleCmds.newSession()
      }]);
    });
  });

  describe('._close', function() {
    var closed;
    beforeEach(function() {
      closed = false;
      subject.client.close = function() {
        closed = true;
      };
      subject.close();
    });

    it('should close client', function() {
      expect(closed).to.be(true);
    });
  });

  describe('._connect', function() {

    var openArgs,
        wsStart,
        serverSent;

    beforeEach(function(done) {
      openArgs = null;
      wsStart = false;
      serverSent = exampleCmds.connect();

      subject.client.start = function() {
        wsStart = true;
      };

      subject.connect(function() {
        openArgs = arguments;
        done();
      });

      subject.client.emit('open');

      subject.client.emit('device ready', { id: 1 });
      subject.client.emit('device response', {
        id: 1,
        response: serverSent
      });
    });

    it('should start websocket client', function() {
      expect(wsStart).to.be(true);
    });

    it('should set connectionId to 1', function() {
      expect(subject.connectionId).to.be(1);
    });

    it('should send device create', function() {
      expect(clientSent[0][0]).to.eql('device create');
    });

    it('should be open', function() {
      expect(subject.ready).to.be(true);
    });

  });

});
