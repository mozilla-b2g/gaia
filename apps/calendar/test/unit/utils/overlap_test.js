requireLib('calc.js');
requireLib('timespan.js');
requireLib('interval_tree.js');
requireLib('utils/overlap.js');

suite('overlap', function() {

  var forever;
  var subject;
  var baseDate = new Date(2012, 0, 1);

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
    var r = {
      element: createEl(),
      busytime: Factory('busytime', {
        startDate: start,
        endDate: end
      })
    };
    r.element.id = r.busytime._id;
    return r;
  }

  function addRecord(startHour, startMin, endHour, endMin) {
    var rec = record(
      time(startHour, startMin),
      time(endHour, endMin)
    );
    subject.add(rec.busytime, rec.element);
    return rec;
  }

  function addRecords(times) {
    var records = [];
    times.forEach(function(tm) {
      records.push(addRecord.apply(this, tm));
    });
    return records;
  }

  function busytimesFromRecords(records) {
    return records.map(function(r) {
      return r.busytime;
    });
  }

  function conflictSpansFromRecords(records) {
    return records.map(function(r) {
      return subject.getConflictSpan(r.busytime);
    });
  }

  function elementsFromRecords(records) {
    return records.map(function(r) {
      return subject.getElement(r.busytime);
    });
  }

  function widthAndLeftFromRecords(records) {
    return records.map(function(r) {
      var el = subject.getElement(r.busytime);
      if (!el) {
        return [null, null];
      } else {
        return [el.style.left, el.style.width];
      }
    });
  }

  setup(function() {
    subject = new Calendar.Utils.Overlap();
    forever = new Calendar.Timespan(0, Infinity);
  });

  teardown(function() {
    subject.reset();
  });

  test('initialize', function() {
    assert.instanceOf(subject.tree, Calendar.IntervalTree);
    assert.deepEqual(
      subject.elements,
      {}
    );
  });

  suite('#add', function() {

    setup(function() {
      subject.reset();
    });

    test('single', function() {
      var records = addRecords([
        [1, 0, 2, 0]
      ]);
      assert.deepEqual(
        subject.tree.query(forever),
        busytimesFromRecords(records)
      );
    });

    test('2 non-conflicting', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [2, 0, 3, 0]
      ]);
      assert.deepEqual(
        subject.tree.query(forever),
        busytimesFromRecords(records)
      );
      assert.deepEqual(subject.conflicts, {});
    });

    test('2 in conflict', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 1, 2, 1]
      ]);
      var cs1 = subject.getConflictSpan(records[0].busytime);
      assert.ok(cs1, 'conflict found for record 0');
      var cs2 = subject.getConflictSpan(records[1].busytime);
      assert.ok(cs2, 'conflict found for record 1');
      assert.equal(cs1, cs2, 'records share the same conflict span');
      assert.equal(cs1.columns.length, 2);
    });

    test('3 in conflict', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 1, 2, 1],
        [1, 2, 2, 2]
      ]);
      var cs = conflictSpansFromRecords(records);
      var cs0 = cs[0];
      assert.deepEqual(cs, [cs0, cs0, cs0],
                       'records share the same conflict span');
      assert.equal(cs0.columns.length, 3);
    });

    test('3 in staggered conflict', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 30, 2, 30],
        [2, 0, 3, 0]
      ]);
      var cs = conflictSpansFromRecords(records);
      var cs0 = cs[0];
      assert.deepEqual(cs, [cs0, cs0, cs0],
                       'records share the same conflict span');
      assert.equal(cs0.columns.length, 2,
                   'staggered conflict results in 2 columns');
    });

    test('event add crossing spans should trigger merge', function() {
      // Compose events such that there are 2 separate conflict spans:
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 1, 2, 1],
        [3, 0, 3, 30],
        [3, 15, 4, 1]
      ]);

      // Ensure there are 2 separate conflict spans.
      var cs = conflictSpansFromRecords(records);
      assert.equal(cs[0], cs[1]);
      assert.equal(cs[2], cs[3]);
      assert.notEqual(cs[0], cs[2]);
      assert.equal(cs[0].columns.length, 2);
      assert.equal(cs[2].columns.length, 2);

      // Add an event that partly crosses the 2 spans, triggering a merge.
      records.push(addRecord(1, 30, 3, 15));

      // There should be one span, now, encompassing all events.
      var cs = conflictSpansFromRecords(records);
      cs.forEach(function(c) {
        assert.equal(c, cs[0]);
        assert.equal(c.columns.length, 3);
      });
    });

  });

  suite('#remove', function() {

    setup(function() {
      subject.reset();
    });

    test('span with a gap on event removal should split', function() {
      // Compose events such that there are 2 separate conflict spans:
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 1, 2, 1],
        // The gap goes here.
        [3, 0, 3, 30],
        [3, 15, 4, 1]
      ]);

      // Add an event that crosses the 2 spans, triggering a merge.
      var mergeRec = addRecord(1, 30, 3, 15);

      // There should be one span, now, encompassing all events.
      var cs = conflictSpansFromRecords(records);
      cs.forEach(function(c) {
        assert.equal(c, cs[0]);
        assert.equal(c.columns.length, 3);
      });

      // Removing the event that joins 2 hunks should result in a split.
      subject.remove(mergeRec.busytime);
      assert.ok(!subject.tree.byId[mergeRec.busytime._id]);

      // Ensure there are 2 separate conflict spans.
      var cs = conflictSpansFromRecords(records);
      assert.notEqual(cs[0].id, cs[2].id);
      assert.equal(cs[0], cs[1]);
      assert.equal(cs[2], cs[3]);

      // Columns in the new conflict spans should have collapsed to 2
      assert.equal(cs[0].columns.length, 2);
      assert.equal(cs[2].columns.length, 2);
    });

    test('span with no conflicts should self-destruct', function() {
      // Non-conflicting events
      var records = addRecords([
        [1, 0, 2, 0],
        [3, 0, 4, 0]
      ]);

      // Cause a staggered conflict.
      var conflict = addRecord(1, 30, 3, 30);

      // Ensure the conflict exists as expected.
      var cs = conflictSpansFromRecords(records);
      assert.equal(cs[0], cs[1]);
      assert.notEqual(cs[0], undefined);

      // Remove the event that causes all the conflict.
      subject.remove(conflict.busytime);

      // Now, none of the records should be a part of a conflict.
      cs = conflictSpansFromRecords(records);
      assert.deepEqual(cs, [undefined, undefined]);
    });

  });

  suite('#_updateLayout', function() {

    setup(function() {
      subject.reset();
    });

    test('layout updates triggered on #add and #remove', function() {

      var records = addRecords([
        [1, 0, 2, 0],
        [1, 15, 2, 15],
        [1, 30, 2, 30],
        [3, 0, 4, 0],
        [3, 30, 4, 30],
        [6, 0, 7, 0]
      ]);

      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['33.3333%', '33.3333%'], ['0%', '33.3333%'], ['66.6667%', '33.3333%'],
        ['50%', '50%'], ['0%', '50%'], ['', '']
      ]);

      var big1 = addRecord(1, 45, 7, 45);
      records.push(big1);

      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['25%', '25%'], ['0%', '25%'], ['50%', '25%'], ['25%', '25%'],
        ['0%', '25%'], ['0%', '25%'], ['75%', '25%']
      ]);

      var big2 = addRecord(3, 45, 6, 30);
      records.push(big2);
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['25%', '25%'], ['0%', '25%'], ['50%', '25%'], ['25%', '25%'],
        ['0%', '25%'], ['0%', '25%'], ['75%', '25%'], ['50%', '25%']
      ]);

      var big3 = addRecord(1, 15, 3, 15);
      records.push(big3);
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['20%', '20%'], ['0%', '20%'], ['40%', '20%'], ['20%', '20%'],
        ['0%', '20%'], ['0%', '20%'], ['60%', '20%'], ['40%', '20%'],
        ['80%', '20%']
      ]);

      subject.remove(big1.busytime);
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['25%', '25%'], ['0%', '25%'], ['50%', '25%'], ['25%', '25%'],
        ['0%', '25%'], ['0%', '25%'], [null, null], ['50%', '25%'],
        ['75%', '25%']
      ]);

      subject.remove(big2.busytime);
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['25%', '25%'], ['0%', '25%'], ['50%', '25%'], ['25%', '25%'],
        ['0%', '25%'], ['', ''], [null, null], [null, null], ['75%', '25%']
      ]);

      subject.remove(big3.busytime);
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['33.3333%', '33.3333%'], ['0%', '33.3333%'], ['66.6667%', '33.3333%'],
        ['0%', '50%'], ['50%', '50%'], ['', ''],
        [null, null], [null, null], [null, null]
      ]);

    });

    test('bug 817763 - collapse columns on conflict delete', function() {

      var records = addRecords([
        [1, 0, 1, 15],
        [1, 30, 2, 0]
      ]);

      var to_delete = addRecord(1, 0, 2, 0);
      records.push(to_delete);

      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['50%', '50%'], ['50%', '50%'], ['0%', '50%']
      ]);

      subject.remove(to_delete.busytime);

      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['', ''], ['', ''], [null, null]
      ]);

    });

  });

});
