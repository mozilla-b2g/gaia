requireApp('calendar/test/unit/helper.js', function() {
  requireLib('set.js');
});

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
    var iter = 5000;

    test('add', function() {
      var set = new Set(),
          obj = Object.create(null),
          setI = 0,
          objI = 0;

      var results = support.vs(iter, {
        set: function() {
          set.add(setI++);
        },

        object: function() {
          obj[objI++] = true;
        }
      });
    });

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

      //oddly enough obj is faster then set

      var results = support.vs(iter, {
        object: function() {
          (99 in obj);
          (777 in obj);
          (9999 in obj);
        },

        set: function() {
          set.has(99);
          set.has(777);
          set.has(9999);
        },

        array: function() {
          (99 in arr);
          (7777 in arr);
          (9999 in arr);
        }
      });

    });
  });

});
