requireApp('calendar/js/calendar.js');

suite('calendar', function() {

  test('#ns', function() {
    var ns = Calendar.ns('Provider.Calendar');
    assert.equal(Calendar.Provider.Calendar, ns);
  });

  // quick sanity check
  suite('binsearch', function() {
    suite('.insert', function() {
      var fn;

      suiteSetup(function() {
        fn = Calendar.binsearch.insert;
      });

      function compare(a, b) {
        if (a === b)
          return 0;

        if (a < b) {
          return -1;
        } else {
          return 1;
        }
      }

      test('0', function() {
        assert.equal(
          fn([], 1, compare),
          0
        );
      });

      test('8', function() {
        var list = [1, 3, 7, 9, 10];
        var result = fn(list, 4, compare);

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
