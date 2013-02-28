requireLib('utils/ordered_map.js');

suite('ordered_map', function() {

  var subject;

  setup(function() {
    subject = new Calendar.Utils.OrderedMap(
      [[8, 'foo'], [1, 'baz']], Calendar.compare
    );
  });

  test('initialization', function() {
    var stored = subject.items;

    assert.deepEqual(stored, [
      [1, 'baz'],
      [8, 'foo']
    ]);
  });

  test('#length', function() {
    assert.equal(subject.length, 2);
  });

  test('#has', function() {
    assert.isFalse(subject.has(999), 'looking for item not in list');
    assert.isTrue(subject.has(1), 'looking for valid item');
  });

  test('#get', function() {
    assert.deepEqual(subject.get(8), 'foo');
  });

  suite('#insertIndexOf', function() {
    test('before', function() {
      var idx = subject.insertIndexOf(0);
      assert.equal(idx, 0);
    });

    test('after', function() {
      var idx = subject.insertIndexOf(10);
      assert.equal(idx, 2);
    });
  });

  test('#remove', function() {
    subject.remove(8);
    assert.ok(!subject.get(8));
  });

  test('#indexOf', function() {
    assert.equal(subject.indexOf(8), 1);
    assert.equal(subject.indexOf(1), 0);
    assert.equal(subject.indexOf(77), null);
  });

  test('#next', function() {
    assert.equal(subject.next(1), 'foo');
    assert.equal(subject.next(8), null);
  });

  test('#previous', function() {
    assert.equal(subject.previous(8), 'baz');
    assert.equal(subject.previous(1), null);
  });

  suite('#set', function() {

    test('override', function() {
      subject.set(1, 'foo');
      assert.equal(subject.items[0][1], 'foo');
      assert.equal(
        subject.items[1][0], 8,
        'should not remove unrelated item'
      );
      assert.length(subject, 2);
    });

    test('before', function() {
      subject.set(0, 'zomg');
      assert.deepEqual(
        subject.items,
        [
          [0, 'zomg'],
          [1, 'baz'],
          [8, 'foo']
        ]
      );
    });

    test('after', function() {
      subject.set(77, 'foo');
      assert.deepEqual(
        subject.items,
        [
          [1, 'baz'],
          [8, 'foo'],
          [77, 'foo']
        ]
      );
    });
  });

  test('benchmark', function() {
    return;
    var max = 10000;
    var i = 0;


    // insert
    var now = window.performance.now();

    for (; i < max; i++) {
      subject.set('key-' + i, i);
    }

    console.log(
      'INSERT:', max,
      String(window.performance.now() - now) + 'ms'
    );

    now = window.performance.now();

    // find
    var key;
    var getMax = max / 2;

    for (i = 0; i < getMax; i++) {
      var rand = Math.floor((Math.random() * max));
      var key = 'key-' + rand;
      subject.next(key);
      subject.previous(key);
    }

    console.log(
      'GOT: ', max,
      String(window.performance.now() - now) + 'ms'
    );
  });

});

