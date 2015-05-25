/* global runFixture */
'use strict';
var assert = require('assert');

suite('reporter', function() {

  function event(input, callback) {
    var file, type;

    if (typeof input === 'string') {
      file = type = input;
    }

    if (typeof input === 'object') {
      file = input[0];
      type = input[1];
    }


    return test('event: ' + type, function(done) {
      runFixture(file, function(err, emit) {
        if (err) {
          return done(err);
        }

        callback(emit, done);
      });
    });
  }

  function isTest(input, obj) {
    assert.ok(input.fn.indexOf('function') !== -1, 'has function');
    assert.ok(input.title);
    assert.equal(input.type, 'test');
    assert.ok(input._slow);
    assert.ok(input._id, 'has _id');

    if (obj) {
      for (var key in obj) {
        assert.equal(input[key], obj[key], key);
      }
    }
  }

  function aggregateAll(events, emitter) {
    var result = {};

    function add(event, data, err) {
      if (err)
        data.eventErr = err;

      if (!result[data.title]) {
        result[data.title] = [];
      }

      result[data.title].push(data);
    }

    events.forEach(function(event) {
      emitter.on(event, add.bind(null, event));
    });

    return result;
  }

  function aggregate(event, emitter) {
    var result = {};
    emitter.on(event, function(data, err) {
      // copy the err property if available.
      if (err)
        data.sentErr = err;

      result[data.title] = data;
    });
    return result;
  }

  function isError(err, msg) {
    if (msg)
      assert.ok(err.msg.matches(msg), 'matches msg');

    assert.ok(err.stack, 'err.stack');
  }

  function testIdsMatch(list) {
    // usually a test event.
    var firstEvent = list[list.length - 1];

    // verify the id is valid
    assert.ok(firstEvent._id, 'has an _id');

    var id = firstEvent._id;

    // verify each id matches the other ids.
    list.forEach(function(item) {
      assert.equal(item._id, id);
    });
  }

  ['test', 'test end'].forEach(function(eventName) {
    event(['fail', eventName], function(emit, done) {
      var testEnd = aggregate(eventName, emit);

      emit.on('helper end', function() {
        assert.ok(!testEnd.sync.err, 'err is not set');
        assert.ok(!testEnd.async.err, 'err is not set');

        isTest(testEnd.sync);
        isTest(testEnd.async);
        done();
      });
    });
  });

  suite('fail', function() {
    event('fail', function(emit, done) {
      var fails = aggregate('fail', emit);

      emit.on('helper end', function() {
        isTest(fails.sync, { state: 'failed' });
        isTest(fails.async, { state: 'failed' });
        isTest(fails.uncaught, { state: 'failed' });

        assert.ok(fails.sync.sentErr, 'sync has err');
        assert.ok(fails.async.sentErr, 'async has err');

        isError(fails.sync.sentErr);
        isError(fails.async.sentErr);
        isError(fails.uncaught.sentErr);
        assert.ok(fails.uncaught.sentErr.uncaught, 'is uncaught');

        done();
      });
    });

    event(['fail', 'ids'], function(emit, done) {
      var results =
        aggregateAll(['test', 'test end', 'fail'], emit);

      emit.once('helper end', function() {
        testIdsMatch(results.sync);
        testIdsMatch(results.async);
        done();
      });
    });
  });


  suite('pass', function() {
    event('pass', function(emit, done) {
      var passed = aggregate('pass', emit);

      emit.on('helper end', function() {
        assert.ok(passed.sync, 'sync test');
        assert.ok(passed.async, 'async test');

        isTest(passed.sync, { state: 'passed' });
        isTest(passed.async, { state: 'passed' });
        done();
      });
    });

    event(['pass', 'ids'], function(emit, done) {
      var results =
        aggregateAll(['test', 'test end', 'pass'], emit);

      emit.once('helper end', function() {
        testIdsMatch(results.sync);
        testIdsMatch(results.async);
        done();
      });
    });
  });

  suite('pending', function() {
    event('pending', function(emit, done) {
      emit.once('pending', function(data) {
        assert.equal(data.title, 'mepending', 'title');
        assert.ok(data.pending, 'pending');
        done();
      });
    });

    event(['pending', 'ids'], function(emit, done) {
      var results =
        aggregateAll(['test end', 'pending'], emit);

      emit.once('helper end', function() {
        testIdsMatch(results.mepending);
        done();
      });
    });
  });

  /* TODO(gaye): Re-enable these...
  event('start', function(emit, done) {
    emit.once('start', function() {
      done();
    });
  });

  event('end', function(emit, done) {
    emit.once('end', function(data) {
      done();
    });
  });
  */

  event(['suites', 'suite (end)'], function(emit, done) {
    var events = [];
    var expected = [
      ['start', '', 1],
      ['start', 'a', 2],
      ['start', 'b', 3],
      ['start', 'c', 4],
      ['end', 'c', 4],
      ['end', 'b', 3],
      ['end', 'a', 2],
      ['end', '', 1]
    ];

    function add(type, data) {
      events.push([type, data.title, data._id]);
    }

    emit.on('suite', add.bind(null, 'start'));
    emit.on('suite end', add.bind(null, 'end'));

    emit.once('helper end', function() {
      assert.deepEqual(events, expected);
      done();
    });
  });

});
