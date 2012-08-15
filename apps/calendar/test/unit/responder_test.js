/**
 * Responder is actually an downstream of test-agent
 * porting the handleEvent thing over here for now
 * to eventually be moved back with the other tweaks.
 */

requireApp('calendar/test/unit/helper.js');

suite('responder', function() {
  var subject;

  setup(function() {
    subject = new Calendar.Responder();
  });

  test('multi arg responder', function() {
    var calledWith;

    subject.on('test', function() {
      calledWith = arguments;
    });

    subject.respond(['test', 'one', 'two', 'three']);
    assert.deepEqual(calledWith, ['one', 'two', 'three']);
  });

  suite('handleEvent', function() {

    test('object', function() {
      var events = {};
      var target = {
        // mimic the actual eventTarget api's
        handleEvent: function(e) {
          var type = e.type;

          if (!(type in events)) {
            events[type] = [];
          }

          events[type].push(e.data);
        }
      };

      subject.on('foo', target);
      subject.on('foo', target);
      subject.on('bar', target);

      subject.emit('foo', 1);
      subject.emit('bar', 1, 2);

      assert.deepEqual(
        events['foo'],
        [[1], [1]]
      );

      assert.deepEqual(
        events['bar'],
        [[1, 2]]
      );
    });

  });
});
