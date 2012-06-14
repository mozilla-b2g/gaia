requireApp('calendar/js/set.js');
requireApp('calendar/test/unit/helper.js');

suite('set', function() {

  var subject, support;

  suiteSetup(function() {
    support = testSupport.calendar;
  });

  test('initialize', function() {
    return;
    //multi args
    subject = new Calendar.Set('a', 1);
    assert.deepEqual(subject._obj, {a: true, 1: true});

    //array
    subject = new Calendar.Set(['a', 1]);
    assert.deepEqual(subject._obj, {a: true, 1: true});
  });

  test('set functionality', function() {
    var set = new Calendar.Set();
    assert.equal(set.size(), 0);

    set.add(1);
    set.add('1');

    assert.equal(set.size(), 2);

    assert.isTrue(set.has(1));
    assert.isTrue(set.has('1'));

    set.delete('1');

    assert.isFalse(set.has('1'));

    assert.equal(set.size(), 1);
  });

  suite('benchmarks', function() {

    test('lookup', function() {
      var items = 10000,
          i = 0,
          obj = Object.create(null),
          arr = [],
          set = new Set();

      for (; i < items; i++) {
        obj[i] = true;
        arr[i] = true;
        set.add(i);
      }

      var results = support.vs(1000000, {
        object: function() {
          obj[99];
          obj[777];
          obj[9999];
        },

        set: function() {
          set.has(99);
          set.has(777);
          set.has(9999);
        },

        array: function() {
          arr[99];
          arr[777];
          arr[9999];
        }
      });

    });
  });

});
