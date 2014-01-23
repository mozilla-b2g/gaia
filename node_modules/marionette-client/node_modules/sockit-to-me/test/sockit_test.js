var assert = require('assert');
var ChildProcess = require('child_process');
var Net = require('net');

// Always use debug binary during testing.
var Sockit = require('..');

suite("Sockit Tests", function() {
  
  // Firing up a process can be slow on Travis CI so we allow a longer
  // timeout for our tests.
  this.timeout(10000);

  const host = '127.0.0.1';
  const port = 44321;
  const helo = 'HELO\r\n';
  const ackn = 'ACK\r\n';

  var server = null;
  var subject = null;
  
  setup(function(done) {
    subject = new Sockit.Sockit();
    // Start the child process.
    server = ChildProcess.fork(__dirname + '/../test_support/server.js');
    // Register listener 
    server.on('message', function(message) {
      // Server has actually started listening on the expected host and port.
      if(message.reply == 'started') {
        // Setup complete.
        done();
      }
    });
    // Ask server to start.
    server.send({ command: 'start' });
  });

  teardown(function(done) {
    // Close connection to server.
    subject.close();
    // Register listener to shutdown child process once the server has 
    // successfully closed it's listening socket.
    server.on('message', function(message) {
      // Server has actually stopped.
      if(message.reply == 'stopped') {
        // Disconnect child process.
        server.disconnect();
        // Teardown complete.
        done();
      }
    });
    // Ask server to stop.
    server.send({ command: 'stop' });
  });

  suite('#connect', function() {

    test('successful connections', function(done) {
      // Register a listener to ensure that we really did connect to the server
      // as we expected to.
      server.on('message', function(message) {
        if(message.reply == 'connected') {
          done();
        }
      });
      // Connect throws on error and is synchronous.
      subject.connect({ host: host, port: port });
    });

    suite('argument shape errors', function() {
      test('not enough arguments', function() {
        var err;

        try {
          assert.ok(subject.connect() instanceof Error);
        } catch(e) {
          err = e;
        }

        assert.ok(err instanceof Error);
      });

      test('argument of wrong type', function() {
        var err;

        try {
          assert.ok(subject.connect(23) instanceof Error);
        } catch(e) {
          err = e;
        }

        assert.ok(err instanceof Error);
      });

      test('argument without string "host" attribute', function() {
        var err;

        try {
          subject.connect({ port: 23 });
        } catch(e) {
          err = e;
        }

        assert.ok(err instanceof Error);
      });

      test('argument without number "port" attribute', function() {
        var err;

        try {
          subject.connect({ host: 'host' });
        } catch(e) {
          err = e;
        }

        assert.ok(err instanceof Error);
      });
    });

    test('error is thrown when connection cannot be established',
      function() {
      var err;

      // Connect throws on error and is synchronous.
      try {
        subject.connect({ host: host + 'garbage', port: port });
      } catch(e) {
        err = e;
      }

      assert.ok(err instanceof Error);
    });
  });

  suite('#read', function() {

    test('correct data is returned', function(done) {
      // Register a listener to ensure that the server really is ready to write
      // data when we ask it to.
      server.on('message', function(message) {
        // Connected, ask server to send data.
        if(message.reply == 'connected') {
          // Ask server to send 'helo'.
          server.send({ command: 'send', data: helo });

          // Read the response.
          var response = subject.read(helo.length);
          // Ensure we got the response we expected.
          assert.equal(helo, response.toString());

          done();
        }
      })

      // Connect to server.
      subject.connect({ host: host, port: port });
    });

    test('error is thrown when not connected', function() {
      var err;

      try {
        subject.read(1);
      } catch(e) {
        err = e;
      }

      assert.ok(err instanceof Error);
    });

    test('error is thrown when a number is not specified', function() {
      var err;
      subject.connect({ host: host, port: port });

      try {
        subject.read();
      } catch(e) {
        err = e;
      }

      assert.ok(err instanceof Error);
    });

  });

  suite('#write', function() {

    test('specified data is written', function(done) {
      // Register a litener to ensure that the server is really ready to read
      // data when we ask it to and to verify that it received what we sent.
      server.on('message', function(message) {
        if(message.reply == 'connected') {
          // Tell the server to expect data from the client.
          server.send({ command: 'recv', data: ackn });
          // Send data to server.
          subject.write(ackn);
        }
        else if(message.reply == 'expected') {
          done();
        }
      })
      // Connect to server.
      subject.connect({ host: host, port: port });
    });

    test('error is thrown when not connected', function() {
      var err;

      try {
        subject.write('data');
      } catch(e) {
        err = e;
      }

      assert.ok(err instanceof Error);
    });

    test('error is thrown when no argument is specified', function() {
      var err;
      subject.connect({ host: host, port: port });

      try {
        subject.write();
      } catch(e) {
        err = e;
      }

      assert.ok(err instanceof Error);
    });

    test('error is thrown when invalid argument is specified', function() {
      var err;
      subject.connect({ host: host, port: port });

      try {
        subject.write({});
      } catch(e) {
        err = e;
      }

      assert.ok(err instanceof Error);
    });

  });
});
