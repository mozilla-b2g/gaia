requireApp('calendar/test/unit/helper.js', function() {
  requireLib('calc.js');
  requireLib('timespan.js');
  requireLib('interval_tree.js');
  requireLib('overlap.js');
});

suite('overlap', function() {

  var forever;
  var subject;
  var baseDate = new Date(
    2012, 0, 1
  );

  function createEl() {
    return document.createElement('span');
  }

  // all time is based on the same
  // day each overlap instance is expected
  // to only cover a single date.
  function time(hours=0, minutes=0, seconds=0) {
    var date = new Date(baseDate.valueOf());

    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(seconds);

    return date;
  }

  function record(start, end) {
    return {
      element: createEl(),
      busytime: Factory('busytime', {
        startDate: start,
        endDate: end
      })
    };
  }

  function add(start, end) {
    var item = record(start, end);
    subject.add(item.busytime, item.element);
    return item;
  }

  function conflicts(element) {
    if (element.busytime)
      element = element.element;

    return element.dataset.conflicts;
  }

  /**
   * Check whether the given item has the given ID in its conflict set. Default
   * to the item's own ID, if none given.
   */
  function inConflictIDs(item, otherID) {
    var id = item.busytime._id;
    if (!otherID) otherID = id;
    var details = subject.getDetails(id);
    if (!details) return false;
    return (otherID in details.conflictIDs);
  }

  function overlaps(element) {
    if (element.busytime)
      element = element.element;

    return element.dataset.overlaps;
  }

  setup(function() {
    subject = new Calendar.Overlap();
    forever = new Calendar.Timespan(0, Infinity);
  });

  teardown(function() {
    subject.elements = null;
  });

  test('initialize', function() {
    assert.instanceOf(subject.tree, Calendar.IntervalTree);
    assert.deepEqual(
      subject.elements,
      {}
    );
  });

  suite('basic add/remove', function() {
    var list = [];

    setup(function() {
      list.length = 0;

      // 30 minutes
      list.push(record(
        time(0, 30),
        time(1)
      ));

      list.push(record(
        time(),
        time(2, 30)
      ));

      subject.add(list[0].busytime, list[0].element);
      subject.add(list[1].busytime, list[1].element);
    });

    test('#add', function() {
      var treeItems = subject.tree.query(
        forever
      );

      assert.deepEqual(
        treeItems,
        [list[1].busytime, list[0].busytime],
        'adds busytimes'
      );

      list.forEach(function(item) {
        assert.equal(
          subject.getElement(item.busytime),
          item.element,
          'element for #' + item._id
        );
      });
    });

    test('#remove', function() {
      var busy = list[0].busytime;

      subject.remove(busy);

      assert.ok(
        !subject.getElement(busy),
        'removes record of element'
      );

      var result = subject.tree.query(forever);
      assert.deepEqual(result, [list[1].busytime], 'tree items');
    });
  });

  suite('overlap', function() {
    test('three overlaps', function() {
      // ordering is intentional to reduce the
      // chances things work simply due to insertion order.
      var c = add(time(2, 40), time(6, 00));
      var b = add(time(2), time(4));
      var a = add(time(0, 30), time(5, 00));

      assert.ok(!overlaps(a), 'a - no overlap');
      assert.equal(overlaps(b), '1', 'b - overlap 1');
      assert.equal(overlaps(c), '2', 'c - overlap 2');

      subject.remove(b.busytime);

      assert.ok(!overlaps(b), 'remove b');
      assert.equal(overlaps(c), '1', 'c - post remove b');

      subject.remove(c.busytime);

      assert.ok(!overlaps(c), 'removes c');
    });

  });

  suite('conflict', function() {
    test('max drift', function() {
      var list = [];
      var i = 0;

      for (; i < 5; i++) {
        list.push(add(
          time(0, i),
          time(5)
        ));
      }

      var list3ID = list[3].busytime._id;

      // add
      list.forEach(function(item, idx) {
        assert.equal(item.element.dataset.conflicts, '4', 'hour #' + idx);
        assert.ok(inConflictIDs(item, list3ID));
      });

      subject.remove(list[3].busytime);

      list.forEach(function(item, idx) {
        assert.equal(item.element.dataset.conflicts, '3', 'hour #' + idx);
        assert.ok(!inConflictIDs(item, list3ID));
      });
    });

    test('none', function() {
      var record = add(time(0), time(1));
      assert.ok(!conflicts(record));
    });

    test('two conflict', function() {
      var a = add(time(), time(1, 1));
      var b = add(time(), time(2, 1));

      assert.equal(conflicts(a), '1');
      assert.equal(conflicts(b), '1');

      assert.ok(inConflictIDs(a));
      assert.ok(inConflictIDs(b));

      assert.equal(a.element.style.left, '0%');
      assert.equal(a.element.style.width, '50%');
      assert.equal(b.element.style.left, '50%');
      assert.equal(b.element.style.width, '50%');

      subject.remove(b.busytime);

      assert.ok(!inConflictIDs(a));

      assert.equal(a.element.style.left, '');
      assert.equal(a.element.style.width, '');

      assert.ok(!conflicts(a), 'removes a conflicts');
      assert.ok(!conflicts(b), 'removes b conflicts');
    });

    test('two with small drift', function() {
      var a = add(time(0, 1), time(5));
      var b = add(time(0, 3), time(5));

      assert.equal(conflicts(a), '1');
      assert.equal(conflicts(b), '1');

      assert.ok(inConflictIDs(a));
      assert.ok(inConflictIDs(b));
      assert.ok(inConflictIDs(a, b.busytime._id));
      assert.ok(inConflictIDs(b, a.busytime._id));

      assert.equal(a.element.style.left, '0%');
      assert.equal(a.element.style.width, '50%');
      assert.equal(b.element.style.left, '50%');
      assert.equal(b.element.style.width, '50%');

      subject.remove(b.busytime);

      assert.ok(!inConflictIDs(a));

      assert.equal(a.element.style.left, '');
      assert.equal(a.element.style.width, '');

      assert.ok(!conflicts(a), 'removes a conflicts');
      assert.ok(!conflicts(b), 'removes b conflicts');
    });
  });


  suite('integration', function() {

    test('mixed overlap/conflict', function() {
      // create one big event that overlaps everything
      var main = add(time(0), time(18));

      // conflicts in main
      var con1 = add(time(5, 30), time(7));
      var con2 = add(time(5, 28), time(7));
      var con3 = add(time(5, 32), time(7));

      // overlap during conflict
      var overlap = add(time(5), time(7));

      // nested x3 overlap
      var nestedOverlap = add(time(6), time(7, 30));

      assert.ok(!overlaps(main), 'main - overlap');
      assert.ok(!conflicts(main), 'main - conflict');

      [con1, con2, con3].forEach(function(item, idx) {
        // remember 'overlap' overlaps here too
        assert.equal(conflicts(item), '2', 'conflict' + (idx + 1));
        assert.equal(overlaps(item), '2', 'conflict' + (idx + 1) + ' overlap');
      });

      assert.ok(!conflicts(overlap), 'overlap conflict');
      assert.equal(overlaps(overlap), '1', 'overlap depth');

      assert.ok(!conflicts(nestedOverlap), 'nested overlap conflcit');
      assert.equal(overlaps(nestedOverlap), '3', 'nested overlap depth');

      // DOM seems to cut off repeating decimals early, plain math fails here
      var expectedWidth = '33.';
      var cases = [[con1, '0'], [con2, '33.'], [con3, '66.']];
      cases.forEach(function(item, idx) {
        var con = item[0];
        var expectedLeft = item[1];
        var cStyle = con.element.style;
        assert.ok(inConflictIDs(con));
        assert.include(cStyle.width, expectedWidth, 'expected width');
        assert.include(cStyle.left, expectedLeft, 'expected left');
      });

      subject.remove(con2.busytime);
      subject.remove(con3.busytime);

      assert.ok(!inConflictIDs(con1));

      assert.equal(con1.element.style.width, '');
      assert.equal(con1.element.style.left, '');

      assert.equal(
        overlaps(nestedOverlap), '3',
        'nested partial remove conflict'
      );

      subject.remove(con1.busytime);

      assert.equal(overlaps(nestedOverlap), '2', 'nested full remove conflict');
      assert.equal(overlaps(overlap), '1', 'full remove conflict');
    });
  });

});
