requireLib('interval_tree.js');
requireLib('timespan.js');

suite('interval_tree', function() {

  var tree;
  var subject;
  var items;
  var list;
  var expectedRange;
  var span;
  var Node;

  function factory(id, start, end) {
    return {
      _id: id,
      _startDateMS: start,
      _endDateMS: end
    };
  }

  suiteSetup(function() {
    Node = Calendar.IntervalTree.Node;
  });

  setup(function() {
    Calendar.IntervalTree.overlapTime = 0;
    // we use this range as a baseline
    // through the less complicated tests
    expectedRange = {
      start: 1200,
      end: 1300
    };

    span = new Calendar.Timespan(
      expectedRange.start,
      expectedRange.end
    );

    // setup the basic list of items
    items = {};

    items.before = factory(1, 100, 800);
    items.overlapBefore = factory(4, 1050, 1400);
    items.middle = factory(3, 1250, 1280);
    items.after = factory(2, 1500, 2000);

    // should be in order of start times
    list = [
      items.before,
      items.overlapBefore,
      items.middle,
      items.after
    ];

    subject = new Calendar.IntervalTree(list);
  });

  test('integration', function() {
    var span = new Calendar.Timespan(
      100,
      800
    );

    var result = subject.query(span);
    assert.deepEqual(result, [items.before]);

    subject.remove(items.before);

    result = subject.query(span);
    assert.deepEqual(result, []);

    var added = factory(30, 400, 1200);

    subject.add(added);
    subject.add(factory(31, 1100, 1200));
    assert.isFalse(subject.synced);

    span.end = 1100;

    assert.deepEqual(
      subject.query(span),
      [
        added,
        items.overlapBefore
      ]
    );
  });

  test('initialization', function() {
    assert.deepEqual(subject.items, list);
    assert.ok(!subject.synced);
    assert.ok(!subject.rootNode);
    assert.deepEqual(subject.byId, {});
  });

  test('init without list', function() {
    var subject = new Calendar.IntervalTree();
    assert.deepEqual(subject.items, []);
  });

  test('#build', function() {
    subject.build();
    var node = subject.rootNode;

    assert.ok(subject.synced);
    assert.ok(node);

    subject.build();

    assert.equal(
      node, subject.rootNode,
      'should not rebuild tree when in sync'
    );
  });

  suite('#add', function() {

    setup(function() {
      // start from clean tree
      subject.items = [];
      subject.synced = true;

      subject.add(items.after);
    });

    test('re-add item with same _id', function() {
      var id = items.after._id;
      var obj = { _id: id };

      subject.add(obj);

      assert.deepEqual(
        subject.items,
        [items.after]
      );
    });

    test('first add', function() {
      assert.deepEqual(
        subject.items,
        [items.after]
      );

      assert.isFalse(subject.synced);
      assert.equal(
        subject.byId[items.after._id],
        items.after,
        'should add to byId cache'
      );
    });

    test('multiple adds', function() {
      subject.add(items.overlapBefore);
      subject.add(items.before);

      assert.isFalse(subject.synced);
      assert.deepEqual(
        subject.items,
        [
          items.before,
          items.overlapBefore,
          items.after
        ]
      );
    });
  });


  suite('#removeFutureIntervals', function() {
    var list;

    setup(function() {
      subject.items = [];
      list = {};
    });

    function add(name, start, end) {
      setup(function() {
        list[name] = factory(name, start, end);
        subject.add(list[name]);
      });
    }

    add('before', 10, 100);
    add('on', 50, 100);
    add('just after', 51, 100);
    add('after', 60, 100);

    test('when items need to be removed', function() {
      assert.isFalse(subject.synced, 'not synced');
      subject.synced = true;
      subject.removeFutureIntervals(50);

      var expectedIds = [
        'before',
        'on'
      ];

      assert.ok(!subject.byId['just after']);
      assert.ok(!subject.byId['after']);

      var ids = subject.items.map(function(item) {
        return item._id;
      });

      assert.deepEqual(ids, expectedIds);
      assert.isFalse(subject.synced, 'should be synced');
    });

    test('when last item needs to be removed', function() {
      subject.removeFutureIntervals(59);

      var expectedIds = [
        'before',
        'on',
        'just after'
      ];

     var ids = subject.items.map(function(item) {
        return item._id;
      });

      assert.deepEqual(ids, expectedIds);
    });

  });


  suite('#removePastIntervals', function() {
    var list;

    setup(function() {
      subject.items = [];
      list = {};
    });

    function add(name, start, end) {
      setup(function() {
        list[name] = factory(name, start, end);
        subject.add(list[name]);
      });
    }

    add('overlap all', 1, 1000);
    add('ends before', 2, 50);
    add('ends on 1', 3, 150);
    add('ends on 2', 4, 150);
    add('ends on 3', 5, 150);
    add('ends just after', 6, 151);
    add('ends after', 7, 200);

    test('when items need to be removed', function() {
      assert.isFalse(subject.synced, 'not synced');
      subject.synced = true;
      subject.removePastIntervals(150);

      var expectedIds = [
        'overlap all',
        'ends just after',
        'ends after'
      ];

      assert.ok(!subject.byId['ends on 1']);
      assert.ok(!subject.byId['ends on 2']);
      assert.ok(!subject.byId['ends on 3']);

      var ids = subject.items.map(function(item) {
        assert.ok(subject.byId[item._id], 'should have: ' + item._id);
        return item._id;
      });

      assert.deepEqual(ids, expectedIds);
      assert.isFalse(subject.synced, 'should be synced');
    });

  });

  suite('#remove', function() {

    test('when removing nonexisting item', function() {
      subject.synced = true;
      var result = subject.remove({ start: 100 });

      assert.isFalse(result, 'should return false when item is not removed');
      assert.isTrue(subject.synced, 'should not remark sync to false');
    });

    test('item that does not share start', function() {
      subject.synced = true;
      var result = subject.remove(items.middle);
      assert.isTrue(result, 'remove should return true');
      assert.isFalse(subject.synced);

      assert.deepEqual(
        subject.items,
        [
          items.before,
          items.overlapBefore,
          items.after
        ]
      );

    });

    suite('items that share start time', function() {
      var middle;
      var addedBefore;
      var addedAfter;

      setup(function() {
        middle = items.before;
        subject.items = [];
        subject.synced = false;

        addedBefore = factory(10, middle[subject.START], middle[subject.END]);
        addedAfter = factory(12, middle[subject.START], middle[subject.END]);

        // its going to shuffle
        // each item is going to displace
        // the next pushing it further in
        // the array.
        subject.add(addedBefore);
        subject.add(middle);
        subject.add(addedAfter);

        assert.deepEqual(
          subject.items,
          [
            addedAfter,
            middle,
            addedBefore
          ]
        );
      });

      test('remove last added item', function() {
        subject.remove(addedAfter);
        assert.deepEqual(
          subject.items,
          [
            middle,
            addedBefore
          ]
        );

        assert.ok(!subject.byId[addedAfter._id]);
      });

      test('remove first added item', function() {
        subject.remove(addedBefore);
        assert.deepEqual(
          subject.items,
          [
            addedAfter,
            middle
          ]
        );
      });

      test('remove middle item', function() {
        subject.remove(middle);
        assert.deepEqual(
          subject.items,
          [
            addedAfter,
            addedBefore
          ]
        );
      });
    });

  });

  suite('Node', function() {

    setup(function() {
      subject.build();
      subject = subject.rootNode;
    });

    suite('node alignment', function() {
      test('base alignment', function() {
        var left = subject.left;
        var right = subject.right;

        assert.isTrue(
          (left.median < subject.median),
          'lower values should be on the left'
        );

        assert.isTrue(
          (right.median > subject.median),
          'higher values should be on the right'
        );
      });
     });

    test('#traverse', function() {
      var results = [];

      subject.traverse(span, function(item, node) {
        results.push(item);
        assert.instanceOf(node, Calendar.IntervalTree.Node);
      });

      assert.deepEqual(
        results,
        [items.overlapBefore, items.middle]
      );
    });

    suite('#query', function() {
      var sublist;
      var id;

      setup(function() {
        id = 0;
        sublist = [];
      });

      function compare(aObj, bObj) {
        var a = aObj._startDateMS;
        var b = bObj._startDateMS;

        return Calendar.compare(a, b);
      }

      function orderedAdd(item, arr) {
        var idx = Calendar.binsearch.insert(
          arr,
          item,
          compare
        );
        arr.splice(idx, 0, item);
      }

      function add(start, end) {
        var item = factory(id++, start, end);
        orderedAdd(item, sublist);
        return item;
      }

      test('large dataset with gaps', function() {
        var expected = [];
        var i = 0;
        var id = 0;
        var list = [];

        // create some out of range in lower bounds
        for (i = 0; i < 1021; i++) {
          add(i, i + 200);
        }

        // create two really huge spans
        for (i = 0; i < 75; i++) {
          orderedAdd(add(i, 5500), expected);
        }

        for (i = 0; i < 1099; i++) {
          orderedAdd(add(5201 + i, 6000 + i), expected);
        }

        orderedAdd(add(7000, 7070), expected);
        orderedAdd(add(8000, 8100), expected);
        orderedAdd(add(9000, 9001), expected);

        // middle values
        orderedAdd(add(10200, 10500), expected);
        orderedAdd(add(10300, 10500), expected);
        orderedAdd(add(10400, 10500), expected);
        orderedAdd(add(10000, 10800), expected);

        // create some out of range in upper bounds
        for (i = 0; i < 1021; i++) {
          add(i + 2500, i + 2505);
        }

        subject = new Calendar.IntervalTree(sublist);
        var result = subject.query(new Calendar.Timespan(
          5201,
          11750
        ));

        // this deep equality assertion is more expensive
        // then the entire process of building
        // the tree and finding the results...
        assert.deepEqual(
          result,
          expected
        );
      });

      test('basic start range query', function() {
        var range = new Calendar.Timespan(
          80,
          900
        );

        assert.deepEqual(
          subject.query(range),
          [items.before]
        );
      });

      test('basic end range query', function() {
        var range = new Calendar.Timespan(
          1600,
          1800
        );

        assert.deepEqual(
          subject.query(range),
          [items.after]
        );
      });

      test('basic middle query', function() {
        var begin = window.performance.now();
        var range = new Calendar.Timespan(
          expectedRange.start,
          expectedRange.end
        );

        var results = subject.query(range);

        assert.deepEqual(
          results,
          [
            items.overlapBefore,
            items.middle
          ]
        );
      });

    });
  });

  suite('#createIndex / #index', function() {
    var one;
    var two;
    var three;
    setup(function() {
      one = Factory('busytime', { eventId: 'xxx' });
      two = Factory('busytime', { eventId: 'xxx' });
      three = Factory('busytime', { eventId: 'xxx' });

      subject.createIndex('eventId');

      subject.add(one);
      subject.add(two);
      subject.add(three);
    });

    test('add', function() {
      assert.deepEqual(
        subject.index('eventId', one.eventId),
        [one, two, three]
      );
    });

    test('remove middle', function() {
      subject.remove(two);
      assert.deepEqual(
        subject.index('eventId', one.eventId),
        [one, three]
      );
    });

    test('remove start', function() {
      subject.remove(one);
      assert.deepEqual(
        subject.index('eventId', one.eventId),
        [two, three]
      );
    });

    test('remove end', function() {
      subject.remove(three);
      assert.deepEqual(
        subject.index('eventId', one.eventId),
        [one, two]
      );
    });

    test('remove all', function() {
      subject.remove(one);
      subject.remove(two);
      subject.remove(three);

      assert.ok(!subject.index('eventId', one.eventId));
    });
  });
});
