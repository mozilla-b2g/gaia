suite('server', function() {
  var server = require('../lib/server'),
      net = require('net'),
      jsonWire = require('json-wire-protocol');


  var subject;
  var lastNet;
  setup(function(done) {
    server.create(function(err, _server) {
      subject = _server;
      done(err);
    });
  });

  teardown(function() {
    subject.net.close();
  });

  /**
   * Internal helper for connecting to the server and waiting for both the
   * socket and server to be ready.
   *
   * @private
   * @return {Object}
   */
  function connect() {
    var result = {};
    setup(function(done) {
      var pending = 2;
      function next() {
        if (--pending === 0) done();
      }
      subject.once('ready', next);
      result.socket = net.connect(subject.port, next);
    });
    return result;
  }

  suite('#create', function() {
    test('#port', function() {
      assert.ok(subject.port, 'has port');
      assert.ok(typeof subject.port === 'number', 'is a number');
    });

    test('can connect to server', function(done) {
      net.connect(subject.port, done);
    });
  });

  suite('event: ready', function() {
    var client = connect();

    test('.ready === true', function() {
      assert.strictEqual(subject.ready, true);
    });
  });

  suite('event: close', function() {
    var client = connect();
    test('will emit close event when socket is closed', function(done) {
      subject.once('close', function() {
        assert.ok(!subject.ready, 'subject is not ready');
        assert.ok(!subject.client, 'client is falsy');
        done();
      });

      client.socket.end();
    });
  });

  suite('#request', function() {
    var client = connect();
    var content = {
      name: 'do foo',
      details: {
        user: 'foo',
        password: 'xfoo'
      }
    };

    var response = {
      somuchyey: true
    };

    var givenResponse;

    setup(function(done) {
      // handle the response
      client.socket.once('data', function(data) {
        var parsed = jsonWire.parse(data);
        // send the formal response
        client.socket.write(jsonWire.stringify(
          [parsed[0], response]
        ));
      });

      // issue the request
      subject.request(content, function(err, _response) {
        givenResponse = _response;
        done(err);
      });
    });

    test('should recieve response', function() {
      assert.deepEqual(givenResponse, response);
    });
  });

  test('#close', function(done) {
    // mock close.
    subject.net.close = function() {
      subject.net.close = function() {};
      done();
    };
    subject.close();
  });
});
