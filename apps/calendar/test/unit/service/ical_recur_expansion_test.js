requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/ical.js');
  requireLib('ext/caldav.js');
  requireApp('calendar/test/unit/service/helper.js');
  requireLib('service/ical_recur_expansion.js');

  // indirect dep we use this for testing only...
  requireLib('service/caldav.js');
});

suite('service/ical_recur_expansion', function() {
  var fixtures;
  var subject;
  var parseEvent;
  var forEachLimit = 30;

  suiteSetup(function() {
    subject = Calendar.Service.IcalRecurExpansion;

    // replace the maximum iterators with a smaller
    // number suitable for tests.
    ServiceSupport.setExpansionLimit(forEachLimit);
  });

  suiteTeardown(function() {
    ServiceSupport.resetExpansionLimit();
  });

  // setup fixtures...
  suiteSetup(function(done) {
    fixtures = new ServiceSupport.Fixtures('ical');
    fixtures.load('recurring_event');
    fixtures.onready = done;

    var service = new Calendar.Service.Caldav(
      new Calendar.Responder()
    );

    parseEvent = service.parseEvent.bind(service);
  });

  test('initialization', function() {
    assert.ok(subject, 'exists');
  });

  suite('#forEach', function() {

    var minDate;
    var maxDate;
    var inclusiveDates = [];
    var iterator;

    suiteSetup(function() {
      // min will be the 5th date - 1 second
      // max will be the 14th + 1 secound
      // so 5-15 will be the range we expect.

      parseEvent(fixtures.recurringEvent, function(err, event) {
        var iter = event.iterator();
        var num = 15;
        var max = num;

        while (--num) {
          var last = iter.next();
          if (num === 1)
            maxDate = last;

          if (num === 10)
            minDate = last;

          if (num <= 10)
            inclusiveDates.push(last.toJSDate());
        }

        minDate.second -= 1;
        maxDate.second -= 1;
      });
    });

    // create closed scope for sent/each for re-usability.
    var verifyBounds = (function() {
      var sent = [];

      function each(item) {
        sent.push(item.toJSDate());
      };

      function verifyMinMax() {
        test('min & max', function() {
          sent.length = 0;

          var iter = subject.forEach(
            event,
            iterator,
            each,
            minDate,
            maxDate
          );

          assert.deepEqual(
            sent,
            inclusiveDates
          );

          assert.deepEqual(
            iter.last.toJSDate(),
            inclusiveDates[inclusiveDates.length - 1]
          );
        });
      }

      function verifyMax() {
        test('max', function() {
          sent.length = 0;

          var iter = subject.forEach(
            event,
            iterator,
            each,
            null,
            maxDate
          );

          assert.deepEqual(
            iter.last.toJSDate(),
            inclusiveDates[inclusiveDates.length - 1],
            'has last date'
          );
        });
      }

      function verifyMin() {
        test('min', function() {
          sent.length = 0;

          var iter = subject.forEach(
            event,
            iterator,
            each,
            minDate
          );

          assert.deepEqual(
            sent[0],
            inclusiveDates[0]
          );

          assert.length(sent, forEachLimit, 'limit bounds');
        });

        test('min verify exclusive', function() {
          sent.length = 0;
          var exclusiveMin = minDate.clone();
          exclusiveMin.second += 1;

          var iter = subject.forEach(
            event,
            iterator,
            each,
            exclusiveMin
          );

          assert.deepEqual(
            sent[0],
            inclusiveDates[1]
          );

          assert.length(sent, forEachLimit, 'limit bounds');
        });
      }

      return function verifyBounds() {
        suite('bounds', function() {
          verifyMax();
          verifyMin();
          verifyMinMax();
        });
      };
    }());


    var event;
    setup(function(done) {
      parseEvent(fixtures.recurringEvent, function(err, result) {
        event = result;
        done();
      });
    });

    suite('with a pre-existing iterator', function() {
      var last;

      setup(function() {
        iterator = event.iterator();
        iterator.next();
        last = iterator.next();
      });

      test('with a broken iterator', function() {
        // round trip the data so we can clone it.
        var iterStr = JSON.stringify(iterator);
        var iterClone = new ICAL.RecurExpansion(
          JSON.parse(iterStr)
        );

        var expected = [];

        subject.forEach(event, iterClone, function(item) {
          expected.push(item.toJSDate());
        }, minDate, maxDate);

        var sent = [];

        var iter = subject.forEach(event, {}, function(item) {
          sent.push(item.toJSDate());
        }, minDate, maxDate);

        assert.deepEqual(sent, expected);
      });

      test('resuming iteration', function() {

        var expectedIter = event.iterator();
        expectedIter.next();
        expectedIter.next();
        var expected = expectedIter.next();

        var sent = [];

        iterator = JSON.parse(
          JSON.stringify(iterator)
        );

        subject.forEach(event, iterator, function(item) {
          sent.push(item);
        });

        assert.deepEqual(
          sent[0].toJSDate(),
          expected.toJSDate()
        );

        assert.ok(
          sent[0].compare(sent[1]) < 0,
          'future instances are in the future'
        );
      });

      verifyBounds();
    });

    suite('without an iterator', function() {
      // ensure helpers have no iterators
      setup(function() {
        iterator = null;
      });

      test('without timeframe', function() {
        var sent = [];
        var iter = subject.forEach(event, null, function(last) {
          sent.push(last);
        });

        assert.instanceOf(iter, ICAL.RecurExpansion);
        assert.length(sent, forEachLimit);

        // test sanity we need an infinite recur iterator
        // or our tests simply suck...
        assert.isFalse(iter.complete, 'should be incomplete');
      });

      verifyBounds();
    });
  });
});
