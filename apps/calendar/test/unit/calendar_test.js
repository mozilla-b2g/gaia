requireApp('calendar/js/calendar.js');
suite('calendar', function() {
  var subject;

  setup(function() {
    subject = Calendar;
  });

  suite('#ns', function() {
    test('create', function() {
      var ns = Calendar.ns('Provider.Calendar');
      assert.equal(Calendar.Provider.Calendar, ns);
    });

    test('check', function() {
      var ns = Calendar.ns('App');
      assert.isTrue(Calendar.ns('App', true), 'has app');
      assert.isFalse(
        Calendar.ns('Store.FoobarX', true),
        'does not have missing'
      );
    });
  });


  test('#compare', function() {
    assert.equal(subject.compare(0, 1), -1);
    assert.equal(subject.compare(1, 0), 1);
    assert.equal(subject.compare(10, 10), 0);
  });

  test('#nextTick', function(done) {
    var inc = 0;
    subject.nextTick(function() {
      assert.equal(inc, 1);
      subject.nextTick(function() {
        assert.equal(inc, 2);
        subject.nextTick(done);
      });
      inc++;
    });
    inc = 1;
  });

  // quick sanity check
  suite('binsearch', function() {
    suite('.insert', function() {
      var fn;

      suiteSetup(function() {
        fn = Calendar.binsearch.insert;
      });

      test('0', function() {
        assert.equal(
          fn([], 1, subject.compare),
          0
        );
      });

      test('8', function() {
        var list = [1, 3, 7, 9, 10];
        var result = fn(list, 4, subject.compare);

        assert.equal(result, 2);

        list.splice(result, 0, 4);
      });

      test('array inner search', function() {
        var list = [
          [1, null],
          [2, null],
          [4, null]
        ];

        var result = fn(list, 3, function(seek, inList) {
          var target = inList[0];

          if (seek === target)
            return 0;

          if (seek < target) {
            return -1;
          }

          return 1;
        });
        assert.equal(result, 2);
      });

    });
  });

});
