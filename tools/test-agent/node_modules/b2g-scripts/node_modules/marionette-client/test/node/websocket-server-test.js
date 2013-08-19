var Server = require('../../lib/node/websocket-server'),
    EventEmitter = require('events').EventEmitter,
    CommandStream = require('../../lib/node/command-stream'),
    ConnectionManger = require('../../lib/node/connection-manager'),
    FakeSocket = require('./support/socket'),
    WSClient = require('./support/ws-client'),
    Agent = require('test-agent');


describe('websocket-server', function() {

  var subject, socket, sockets = [], RealSocket;

  before(function() {
    RealSocket = ConnectionManger.Socket;
    ConnectionManger.Socket = FakeSocket;
    FakeSocket.sockets = sockets;
  });

  after(function() {
    ConnectionManger.Socket = RealSocket;
  });

  function emitSocket() {
    var socket = new WSClient();
    subject.emit('connection', socket);
    subject.lastSocket = socket;
    return socket;
  }

  function send(event, data) {
    subject.emit(event, data, subject.lastSocket);
  }

  function lastDevice() {
    return subject.manager.get(subject.manager.currentId - 1);
  }

  beforeEach(function() {
    sockets.length = 0;
    subject = new Server();
    subject.listen();
  });

  describe('initialization', function() {
    it('should be an instance of test-agent/websocket-server', function() {
      expect(subject).to.be.a(Agent.WebsocketServer);
    });

    it('should initialize .manager', function() {
      expect(subject.manager).to.be.a(ConnectionManger);
    });
  });

  describe('event: use device', function() {
    var device;

    describe('without a port', function() {

      beforeEach(function() {
        socket = emitSocket();
        send('device create', {});
        device = lastDevice();
      });

      it('should have a device in the manager', function() {
        expect(subject.manager.get(0)).to.be.ok();
        expect(subject.manager.get(0).socket.port).to.be(2828);
      });

      it('should send deviceId to client', function() {
        expect(socket.sendCalls[0][0]).to.eql(subject.stringify(
          'device ready',
          { id: 0 }
        ));
      });
    });

    describe('when websocket closes', function() {
      beforeEach(function() {
        socket.emit('close');
      });

      it('should close device connection', function() {
        expect(device.socket.destroyed).to.be(true);
      });

    });

  });

  describe('event: device command', function() {

    describe('when device id is not found', function() {
      beforeEach(function() {
        socket = emitSocket();
        send('device command', { id: 777 });
      });

      it('should send error to client', function() {
        expect(socket.sendCalls[0][0]).to.eql(subject.stringify(
          'device response',
          { error: 'connection id 777 was not found' }
        ));
      });

    });

    describe('when device id is valid', function() {

      var sendCommandCall, device, data = {uniq: true};

      beforeEach(function() {
        sendCommandCall = null;
        socket = emitSocket();
        send('device create', {});
        device = lastDevice();

        device.send = function() {
          sendCommandCall = arguments;
        };

        send('device command', {id: 0, command: data});
      });

      it('should send command to device', function() {
        expect(sendCommandCall[0]).to.equal(data);
      });
    });

  });

  describe('event: device response', function() {

    var data = {'fooz': true}, deviceResponse, device;

    beforeEach(function() {
      socket = emitSocket();
      send('device create', {});

      device = lastDevice();
      device.emit('command', data);
    });

    it('should send message to client', function() {
      expect(socket.sendCalls[1][0]).to.eql(subject.stringify('device response', {
        id: 0,
        response: data
      }));
    });

  });

});
