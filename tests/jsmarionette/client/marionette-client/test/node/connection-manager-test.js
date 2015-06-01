/* global assert */
'use strict';
var FakeSocket = require('../support/socket'),
    CommandStream = require('../../lib/marionette/command-stream'),
    ConnectionManger = require('../../lib/node/connection-manager');


suite('connection-manager', function() {
  var RealSocket, subject, sockets = [];

  suiteSetup(function() {
    RealSocket = ConnectionManger.Socket;
    ConnectionManger.Socket = FakeSocket;
    FakeSocket.sockets = sockets;
  });

  suiteTeardown(function() {
    ConnectionManger.Socket = RealSocket;
  });

  setup(function() {
    sockets.length = 0;
    subject = new ConnectionManger();
  });

  suite('initialization', function() {
    test('should initialize .connections', function() {
      assert.deepEqual(subject.connections, {});
    });
  });

  suite('.remove', function() {
    test('should remove connection from list', function() {
      subject.open();
      assert.ok(subject.connections[0]);
      subject.close(0);
      assert.notOk(subject.connections[0]);
    });
  });

  suite('.get', function() {

    test('should return an open connection', function() {
      var open = subject.open();

      assert.strictEqual(subject.get(open.id), open.connection);
    });

  });

  suite('.open', function() {
    var result, con;

    setup(function() {
      result = subject.open();
      con = subject.connections[0];
    });

    test('should initialize socket and stream', function() {
      assert.ok(sockets[0]);
      assert.strictEqual(con.socket, sockets[0]);
      assert.strictEqual(sockets[0].port, subject.defaultPort);

      assert.instanceOf(con, CommandStream);
    });

    test('should increment currentId', function() {
      assert.strictEqual(subject.currentId, 1);
    });

    test('should return id and stream', function() {
      assert.deepEqual(result, {
        id: 0,
        connection: subject.connections[0]
      });
    });

    function isRemovedOnEvent(event) {
      suite('on socket ' + event, function() {

        setup(function() {
          assert.ok(subject.connections[0]);
          con.socket.emit(event);
        });

        test('should remove itself from connections', function() {
          assert.notOk(subject.connections[0]);
        });

      });
    }

    isRemovedOnEvent('close');
    isRemovedOnEvent('end');

  });

});
