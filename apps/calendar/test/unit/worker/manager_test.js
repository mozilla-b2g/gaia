requireApp('calendar/test/unit/helper.js', function() {
  requireLib('worker/manager.js');
});

/**
 * This test should over the basics of
 * both the manager and the thread.
 */
suite('worker/manager', function() {
  var subject;

  function MockWorker(url) {

    this.url = url;
    this.events = {};
    this.sent = [];

    this.addEventListener = function() {
      var args = Array.prototype.slice.call(arguments);
      var event = args.shift();

      if (!(event in this.events)) {
        this.events[event] = [];
      }

      this.events[event].push(args);
    }

    this.postMessage = function() {
      this.sent.push(
        Array.prototype.slice.call(arguments)
      );
    }
  }

  setup(function() {
    subject = new Calendar.Worker.Manager();
    subject.Worker = MockWorker;
  });

  teardown(function() {
    var workers = subject.workers;
    var keys = Object.keys(workers);

    keys.forEach(function(key) {
      var worker = workers[key];
      if (worker instanceof Worker) {
        worker.terminate();
      }
    });
  });

  test('initializer', function() {
    assert.deepEqual(subject.roles, {});
    assert.equal(subject._lastId, 0);
    assert.deepEqual(subject.workers, {});
  });

  test('#_getId', function() {
    assert.equal(subject._getId(), 0);
    assert.equal(subject._getId(), 1);
  });

  suite('#add', function() {

    test('single role', function() {
      var id = subject._lastWorkerId;
      subject.add('test', 'foo.js');

      var result = subject.workers[id];

      assert.instanceOf(result, MockWorker);
      assert.ok(result.url);
      assert.include(result.url, 'foo.js');

      assert.ok(result.onmessage);
      assert.ok(result.onerror);
      assert.deepEqual(subject.roles.test, [id]);

      assert.equal(subject._lastWorkerId, id + 1);
    });

    test('multi role', function() {
      var id = subject._lastId;
      subject.add(['one', 'two'], 'bar.js');

      assert.deepEqual(subject.roles, {
        one: [id],
        two: [id]
      });
    });

    test('onmessage', function() {
      var calledWith;
      subject._workerReady = function() {
        calledWith = arguments;
      }

      subject.add('test', 'foo.js');
      var worker = subject.workers[0];
      worker.onmessage({ data: ['ready'] });

      assert.equal(calledWith[0], worker);
      assert.equal(calledWith[1], 0);
    });

  });

  suite('#_findWorker', function() {

    test('single worker', function() {
      var list = subject.roles['test'] = [];
      var worker = 'worker';
      list.push(worker);

      assert.equal(
        subject._findWorker('test'),
        worker
      );

      assert.equal(
        subject._findWorker('test'),
        subject._findWorker('test')
      );
    });

    test('multiple workers', function() {
      var list = subject.roles['test'] = [1, 2, 3];
      var checkList = [1, 2, 3];

      for (var i = 0; i < 30; i++) {
        if (checkList.length === 0) {
          break;
        }

        var result = subject._findWorker('test');
        var idx = checkList.indexOf(result);

        if (idx !== -1) {
          checkList.splice(idx, 1);
        }
      }

      if (checkList.length) {
        assert.ok(
          false,
          'failed to find indexes: [' +
            checkList.join(', ') + ']'
        );
      }
    });

  });

  suite('worker acceptance', function() {
    // this fail when the entire suite is run.
    test('TODO: fix acceptance tests', function() {});
    return;

    var obj = { magic: true };
    var events;

    function addEvent(type) {
      if (!(type in events)) {
        events[type] = [];
      }

      events[type].push(Array.prototype.slice.call(arguments, 1));
    }

    setup(function() {
      events = {};
      subject.Worker = Worker;
      subject.add(
        'test', '/test/unit/fixtures/relay_worker.js'
      );
    });

    test('#request', function(done) {
      this.timeout(12000);
      subject.request('test', 'relay', obj, function(data) {
        done(function() {
          assert.deepEqual(obj, data);
        });
      });
    });

    test('#request /w error object', function(done) {
      this.timeout(12000);
      subject.request('test', 'error', function(err) {
        done(function() {
          assert.equal(err.message, 'message');
          assert.ok(err.stack);
          assert.instanceOf(err, Error);
        });
      });
    });

    test('#stream', function(done) {
      this.timeout(12000);
      var stream = subject.stream('test', 'stream', obj);

      stream.on('data', addEvent.bind(this, 'data'));
      stream.on('error', addEvent.bind(this, 'error'));

      stream.request(function(data) {
        done(function() {
          assert.deepEqual(
            events.data,
            [[1], [2]],
            'should relay data event'
          );

          assert.deepEqual(
            events.error,
            [['err']],
            'should relay error event'
          );

          assert.deepEqual(
            data, [obj],
            'should send data over final callback'
          );

          // should clear all events...
          assert.deepEqual(subject._$events['0 stream'], []);
          assert.deepEqual(subject._$events['0 end'], []);
        });
      });

      // can only request stream once
      assert.throws(function() {
        stream.request();
      });
    });
  });
});
