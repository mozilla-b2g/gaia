requireLib('worker/manager.js');

/**
 * This test should over the basics of
 * both the manager and the thread.
 */
suite('worker/manager', function() {
  var subject;

  function MockWorker(handler) {
    return function(url) {
      this.url = url;
      this.onerror = this.onmessage = this.terminate = Math.min;
      this.sent = [];

      this.addEventListener = function(type, func) {
        if (type == 'error') this.onerror = func;
        else if (type == 'message') this.onmessage = func;
      };

      this.respond = function(message) {
        this.onmessage({data: message});
      };

      var self = this;
      this.postMessage = function(msg) {
        setTimeout(function() {handler.call(self, msg);}, 10);
      };
    };
  }

  setup(function() {
    subject = new Calendar.Worker.Manager();
    subject.Worker = MockWorker(Math.min);
  });

  teardown(function() {
  });

  suite('#add', function() {

    test('single role', function() {
      subject.add('test', 'foo.js');

      var result = subject._ensureActiveWorker('test').instance;
      assert.instanceOf(result, subject.Worker);
      assert.ok(result.url);
      assert.include(result.url, 'foo.js');
    });

    test('multi role', function() {
      subject.add(['one', 'two'], 'bar.js');

      var resultOne = subject._ensureActiveWorker('one');
      var resultTwo = subject._ensureActiveWorker('two');

      assert.ok(resultOne);
      assert.equal(resultOne, resultTwo);

      assert.throws(function() {
        subject._ensureActiveWorker('three');
      });
    });

  });

  suite('worker acceptance', function() {
    function mockHandler(message) {
      assert.equal(message[0], '_dispatch');
      var data = message[1], self = this;
      assert.equal(typeof data.id, 'number');

      if (data.payload[0] == 'explode') {
        self.onerror(new Error('BOOM'));
      } else if (data.payload[0] == 'stream') {
        self.respond([data.id + ' stream', 'data', 'data one']);
        setTimeout(function() {
          self.respond([data.id + ' stream', 'data', 'data two']);
          setTimeout(function() {
            self.respond([data.id + ' end', 'stream finito']);
          }, 20);
        }, 20);
      } else if (data.payload[0] == 'stream/explode') {
        self.respond([data.id + ' stream', 'data', 'data one']);
        setTimeout(function() {
          self.onerror(new Error('BOOM'));
        }, 20);
      } else {
        self.respond([data.id + ' end', 'response']);
      }
    }
    var obj = {prop: 'value'};

    setup(function() {
      subject.Worker = MockWorker(mockHandler);
      subject.add(
        'test', '/test/unit/fixtures/relay_worker.js'
      );
    });

    test('#request', function(done) {
      this.timeout(12000);
      subject.request('test', 'foobar', obj, function(data) {
        done(function() {
          assert.deepEqual(data, 'response');
        });
      });
    });

    test('#request /w error object', function(done) {
      this.timeout(12000);
      subject.request('test', 'explode', function(err) {
        done(function() {
          assert.instanceOf(err, Error);
          assert.equal(err.message, 'BOOM');
        });
      });
    });

    test('#stream', function(done) {
      this.timeout(12000);
      var stream = subject.stream('test', 'stream');
      var dataReceived = [], errorReceived = null;

      stream.on('data', function(data) { dataReceived.push(data); });
      stream.on('error', function(error) { errorReceived = error; });

      stream.request(function(data) {
        done(function() {
          assert.deepEqual(dataReceived, ['data one', 'data two']);
          assert.equal(data, 'stream finito');
          assert.equal(errorReceived, null);
        });
      });

      // can only request stream once
      assert.throws(function() {
        stream.request();
      });
    });

    test('#stream error', function(done) {
      this.timeout(12000);
      var stream = subject.stream('test', 'stream/explode');
      var dataReceived = [], errorReceived = null;

      stream.on('data', function(data) { dataReceived.push(data); });
      stream.on('error', function(error) { errorReceived = error; });

      stream.request(function(error) {
        done(function() {
          assert.deepEqual(dataReceived, ['data one']);
          assert.instanceOf(error, Error);
          assert.instanceOf(errorReceived, Error);
        });
      });
    });
  });
});
