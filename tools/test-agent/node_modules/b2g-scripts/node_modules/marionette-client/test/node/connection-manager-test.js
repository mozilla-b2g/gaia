var FakeSocket = require('./support/socket'),
    sockets = [],
    EventEmitter = require('events').EventEmitter,
    CommandStream = require('../../lib/node/command-stream'),
    ConnectionManger = require('../../lib/node/connection-manager');


describe('connection-manager', function() {
  var RealSocket, subject, sockets = [];

  before(function() {
    RealSocket = ConnectionManger.Socket;
    ConnectionManger.Socket = FakeSocket;
    FakeSocket.sockets = sockets;
  });

  after(function() {
    ConnectionManger.Socket = RealSocket;
  });

  beforeEach(function() {
    sockets.length = 0;
    subject = new ConnectionManger();
  });

  describe('initialization', function() {
    it('should initialize .connections', function() {
      expect(subject.connections).to.eql({});
    });
  });

  describe('.remove', function() {
    it('should remove connection from list', function() {
      subject.open();
      expect(subject.connections[0]).to.be.ok();
      subject.close(0);
      expect(subject.connections[0]).not.to.be.ok();
    });
  });

  describe('.get', function() {

    it('should return an open connection', function() {
      var open = subject.open();

      expect(subject.get(open.id)).to.be(open.connection);
    });

  });

  describe('.open', function() {
    var result, con;

    beforeEach(function() {
      result = subject.open();
      con = subject.connections[0];
    });

    it('should initialize socket and stream', function() {
      expect(sockets[0]).to.be.ok();
      expect(con.socket).to.be(sockets[0]);
      expect(sockets[0].port).to.be(subject.defaultPort);

      expect(con).to.be.a(CommandStream);
    });

    it('should increment currentId', function() {
      expect(subject.currentId).to.be(1);
    });

    it('should return id and stream', function() {
      expect(result).to.eql({
        id: 0,
        connection: subject.connections[0]
      });
    });

    function isRemovedOnEvent(event) {
      describe('on socket ' + event, function() {

        beforeEach(function() {
          expect(subject.connections[0]).to.be.ok();
          con.socket.emit(event);
        });

        it('should remove itself from connections', function() {
          expect(subject.connections[0]).not.to.be.ok();
        });

      });
    }

    isRemovedOnEvent('close');
    isRemovedOnEvent('end');

  });

});
