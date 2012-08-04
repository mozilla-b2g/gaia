requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
});

suite('timespan', function() {

  var subject;
  var startDate;
  var endDate;

  setup(function() {
    startDate = new Date(2012, 1, 1);
    endDate = new Date(2012, 12, 1);

    subject = new Calendar.Timespan(
      startDate,
      endDate
    );
  });

  test('initializer', function() {
    assert.equal(
      subject.start,
      startDate.valueOf()
    );

    assert.equal(
      subject.end,
      endDate.valueOf()
    );
  });

  suite('#contains', function() {
    var dates;

    suiteSetup(function() {
      dates = {
        'day of': {
          assert: true,
          value: new Date(2012, 1, 1)
        },

        'one day after': {
          assert: true,
          value: new Date(2012, 1, 2)
        },

        'day of end range': {
          assert: true,
          value: new Date(2012, 12, 1)
        },

        'day before range': {
          assert: false,
          value: new Date(2011, 12, 31)
        },

        'day after range': {
          assert: false,
          value: new Date(2012, 12, 2)
        }
      };
    });

    test('date', function() {
      var key;
      for (key in dates) {
        if (dates.hasOwnProperty(key)) {
          assert.equal(
            subject.contains(dates[key].value),
            dates[key].assert,
            key
          );
        }
      }
    });
  });

});
