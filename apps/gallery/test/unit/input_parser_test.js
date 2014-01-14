require('/shared/js/input_parser.js');

suite('input_parser', function() {
  var subject;

  setup(function() {
    subject = InputParser;
  });

  suite('#importTime', function() {
    var input = [
      '23:20',
      '23:20:15',
      '17:39:57.02',
      '01:01:01',
      '0:0',
      ''
    ];

    var expected = [
      { hours: 23, minutes: 20, seconds: 0 },
      { hours: 23, minutes: 20, seconds: 15 },
      { hours: 17, minutes: 39, seconds: 57 },
      { hours: 1, minutes: 1, seconds: 1 },
      { hours: 0, minutes: 0, seconds: 0 },
      { hours: 0, minutes: 0, seconds: 0 }
    ];

    input.forEach(function(item, idx) {
      test('parse: "' + item + '"', function() {
        var expect = expected[idx];
        assert.deepEqual(
          subject.importTime(item),
          expect
        );
      });
    });
  });

  suite('#exportTime', function() {
    var input = [
      new Date(2012, 0, 1, 7, 30, 45),
      new Date(2012, 0, 1)
    ];

    var expected = [
      '07:30:45',
      '00:00:00'
    ];

    input.forEach(function(item, idx) {
      test('parse: "' + item + '"', function() {
        var expect = expected[idx];
        assert.deepEqual(
          subject.exportTime(item),
          expect
        );
      });
    });
  });

  suite('#importDate', function() {
    var input = [
      '1997-12-01',
      '1997-01-31',
      '2011-08-01'
    ];

    var expected = [
      { year: 1997, month: 11, date: 1 },
      { year: 1997, month: 0, date: 31 },
      { year: 2011, month: 7, date: 1 }
    ];

    input.forEach(function(item, idx) {
      test('parse: "' + item + '"', function() {
        var expect = expected[idx];
        assert.deepEqual(
          subject.importDate(item),
          expect
        );
      });
    });
  });

  suite('#exportDate', function() {
    var input = [
      new Date(1997, 11, 1),
      new Date(1997, 0, 31),
      new Date(2011, 7, 1)
    ];

    var expected = [
      '1997-12-01',
      '1997-01-31',
      '2011-08-01'
    ];

    input.forEach(function(item, idx) {
      test('parse: "' + item + '"', function() {
        var expect = expected[idx];
        assert.deepEqual(
          subject.exportDate(item),
          expect
        );
      });
    });
  });


  test('#formatInputDate - with value < 10', function() {
    var newStart = new Date(2011, 7, 1);

    var startDate = subject.exportDate(newStart);
    var startTime = subject.exportTime(newStart);

    assert.deepEqual(
      subject.formatInputDate(startDate, startTime),
      newStart
    );
  });

  test('#formatInputDate', function() {
    var expected = new Date(
      2012, 0, 31, 7, 30, 45
    );

    var actual = subject.formatInputDate(
      subject.exportDate(expected),
      subject.exportTime(expected)
    );

    assert.deepEqual(expected, actual);
  });

});
