suite('runtime/requests', function() {
  var mock = mockProcessSend(),
      subject = require('../../lib/runtime/requests').Requests;

  suite('emit', function() {
    test('single emit', function(done) {
      var pending = Object.keys(subject.pending).length;
      var expectedValue = 1;

      mock.sent.once('do stuff', function(responseId) {
        process.emit('message', ['response', responseId, expectedValue]);
      });

      subject.emit('do stuff', function(gotValue) {
        assert.equal(gotValue, expectedValue);
        assert.equal(Object.keys(subject.pending).length, pending);
        done();
      });
    });

    test('in parallel', function(done) {
      var event = 'i can sendz',
          pending = 3;


      // because requests is a singleton we need to keep track of global state.
      var pendingAtStart = Object.keys(subject.pending).length;

      // fired when all callbacks complete
      function complete() {
        assert.equal(Object.keys(subject.pending).length, pendingAtStart);
        done();
      }

      // helper to verify the value of each emit/respond flow
      function expect(expectedValue) {
        return function(input) {
          assert.equal(expectedValue, input);
          if (--pending === 0)
            complete();
        }
      }

      var lastReqId = NaN;
      mock.sent.on('do stuff', function(reqId, value) {
        if (reqId === lastReqId) {
          throw new Error('duplicate request ids');
        }

        lastReqId = reqId;

        process.nextTick(function() {
          process.emit('message', ['response', reqId, value]);
        });
      });

      // sent arguments in each call
      var one = 77,
          two = 33,
          three = 99;

      subject.emit('do stuff', two, expect(two));
      subject.emit('do stuff', one, expect(one));
      subject.emit('do stuff', three, expect(three));
    });

  });

});
