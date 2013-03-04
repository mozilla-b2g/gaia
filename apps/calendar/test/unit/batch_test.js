requireApp('calendar/test/unit/helper.js', function() {
  requireLib('batch.js');
});

suite('batch', function() {

  var subject;

  function add() {
    return subject.action('group', 'action', 1);
  }

  setup(function() {
    subject = new Calendar.Batch({
      waitTime: 2000
    });
  });

  teardown(function() {
    subject.cancel();
  });


  suite('#action', function() {

    test('adding an action', function() {
      add();
      assert.deepEqual(
        subject.data.group.action,
        [1]
      );
    });

    test('with verify == false', function() {
      var calledWith;
      subject.verify = function() {
        calledWith = arguments;
        return false;
      };

      add();

      assert.deepEqual(subject.data, {});
      assert.deepEqual(calledWith, [
        'group',
        'action',
        1
      ]);
    });

    test('with timer', function(done) {
      var expected = {}, i = 0;
      // yes this is crazy long
      // something is wrong with our linode or
      // something on linux...
      this.timeout(50000);

      expected.one = {
        g1: {
          add: [1, 2]
        }
      };

      expected.two = {
        g1: {
          remove: [0]
        },
        g2: {
          set: [0]
        }
      };

      subject.handler = function(data) {
        i++;

        if (i == 1) {
          assert.deepEqual(expected.one, data);
          subject.action('g1', 'remove', 0);
          subject.action('g2', 'set', 0);

          assert.isTrue(subject.willRun());
        } else {
          assert.deepEqual(expected.two, data);
          done();
        }
      };

      subject.waitTime = 100;
      assert.isFalse(subject.willRun());

      subject.action('g1', 'add', 1);
      subject.action('g1', 'add', 2);

      assert.isTrue(subject.willRun());
    });

  });

  test('#clear', function() {
    subject.data = {foo: []};
    subject.clear();

    assert.deepEqual(subject.data, {});
  });

  suite('#cancel', function() {

    test('without timer', function() {
      subject.clear();
    });

    test('with timer', function(done) {
      setTimeout(function() {
        done();
      }, 10);

      subject.waitTime = 1;
      subject.handler = function() {
        throw new Error('should not fire handler');
      };
      add();

      assert.ok(subject._timer);
      subject.cancel();
    });
  });

});
