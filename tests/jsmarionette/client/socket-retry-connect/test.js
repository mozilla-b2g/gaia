suite('socket retry connect', function() {
  var PORT = 60012;
  var assert = require('assert'),
      subject = require('./index').waitForSocket,
      net = require('net');

  var _server;
  function createServer(onConnect) {
    onConnect = onConnect || function() {};
    // saves reference to last server
    return _server = net.createServer(onConnect).listen(PORT);
  }

  teardown(function() {
    // make sure we actually close the thing
    try {
      _server.close();
    } catch (e) {}
  });

  function returnsSocket(callback) {
    callback = callback || function() {};
    return function(err, socket) {
      assert.ok(!err, err && err.message);
      assert.ok(socket instanceof net.Socket);
      callback();
    }
  }

  test('socket is open', function(done) {
    var pending = 2;
    function next() {
      if (--pending === 0) {
        done();
      }
    }
    var didConnect = false;
    // verify that both the server gets hit and socket callback fires.
    var server = createServer(next);
    subject({ port: PORT }, returnsSocket(next));
  });

  test('waits before connection is open', function(done) {
    this.timeout('5s');
    setTimeout(createServer, 575);
    subject({ port: PORT }, returnsSocket(done));
  });

  test('fails to connect after retires', function(done) {
    this.timeout('3s');
    subject({ port: PORT, tries: 2 }, function(err) {
      assert.ok(err);
      assert.ok(err.message.match(/socket/));
      done();
    });
  });
});
