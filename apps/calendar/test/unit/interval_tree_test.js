requireApp('calendar/test/unit/helper.js', function() {
  requireLib('interval_tree.js');
  requireLib('timespan.js');
});

suite('interval_tree', function() {

  var tree;
  var subject;
  var items;
  var list;
  var expectedRange;
  var span;
  var Node;

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

    items.before = {
      _id: 1,
      start: 100,
      end: 800
    };

    items.overlapBefore = {
      _id: 4,
      start: 1050,
      end: 1400
    };

    items.middle = {
      _id: 3,
      start: 1250,
      end: 1280
    };

    items.after = {
      _id: 2,
      start: 1500,
      end: 2000
    };

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

    var added = {
      _id: 30,
      start: 400,
      end: 1200
    };

    subject.add(added);
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

    test('first add', function() {
      assert.deepEqual(
        subject.items,
        [items.after]
      );
      assert.isFalse(subject.synced);
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

  suite('remove', function() {

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

        addedBefore = {
          _id: 10,
          start: middle.start,
          end: middle.end
        };

        addedAfter = {
          _id: 11,
          start: middle.start,
          end: middle.end
        };

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
        var a = aObj.start;
        var b = bObj.start;

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
        var item = {
          _id: id++,
          start: start,
          end: end
        };

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



        var begin = window.performance.now();
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


});
