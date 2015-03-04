define(function(require) {
'use strict';

var Factory = require('test/support/factory');
var Overlap = require('utils/overlap');

suite('overlap', function() {
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
    subject.add(rec);
    return rec;
  }

  function addRecords(times) {
    var records = [];
    times.forEach(function(tm) {
      records.push(addRecord.apply(this, tm));
    });
    return records;
  }

  function conflictSpansFromRecords(records) {
    return records.map(subject._getConflict, subject);
  }

  function widthAndLeftFromRecords(records) {
    return records.map(function(r) {
      var el = r.element;
      if (!el) {
        return [null, null];
      } else {
        return [el.style.left, el.style.width];
      }
    });
  }

  function classNamesFromRecords(records) {
    return records.map(function(r) {
        var el = r.element;
        // make sure it is always in the same order
        return el ? el.className.trim().split(/\s+/).sort().join(' ') : null;
      });
  }

  setup(function() {
    subject = new Overlap();
  });

  teardown(function() {
    subject.reset();
  });

  test('initialize', function() {
    assert.deepEqual(
      subject._items,
      []
    );
    assert.deepEqual(
      subject._conflicts,
      []
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
        subject._items,
        records
      );
    });

    test('2 non-conflicting', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [2, 0, 3, 0]
      ]);
      assert.deepEqual(
        subject._items,
        records
      );
      assert.deepEqual(subject._conflicts, []);
    });

    test('2 in conflict', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 1, 2, 1]
      ]);
      // conflicts are only built after _updateConflicts
      subject._updateConflicts();
      var cs1 = subject._getConflict(records[0]);
      assert.ok(cs1, 'conflict found for record 0');
      var cs2 = subject._getConflict(records[1]);
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
      // conflicts are only built after _updateConflicts
      subject._updateConflicts();
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
      // conflicts are only built after _updateConflicts
      subject._updateConflicts();
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
        [3, 15, 4, 1],
        [1, 30, 3, 15]
      ]);

      // conflicts are only built after _updateConflicts
      subject._updateConflicts();
      // There should be one span, encompassing all events.
      var cs = conflictSpansFromRecords(records);
      cs.forEach(function(c) {
        assert.equal(c, cs[0]);
        assert.equal(c.columns.length, 3);
      });
    });

  });

  suite('#render', function() {

    setup(function() {
      subject.reset();
    });

    test('layout updates on each render call', function() {
      var records = addRecords([
        [1, 0, 2, 0],
        [1, 15, 2, 15],
        [1, 30, 2, 30],
        [3, 0, 4, 0],
        [3, 30, 4, 30],
        [6, 0, 7, 0]
      ]);
      subject.render();

      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['0%', '33.3333%'], ['33.3333%', '33.3333%'], ['66.6667%', '33.3333%'],
        ['0%', '50%'], ['50%', '50%'], ['0%', '100%']
      ], 'wid and left 1');

      assert.deepEqual(classNamesFromRecords(records), [
        'has-overlaps', 'has-overlaps', 'has-overlaps', 'has-overlaps',
        'has-overlaps', ''
      ], 'has-overlaps 1');

      var big1 = addRecord(1, 45, 7, 45);
      records.push(big1);
      subject.render();
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['0%', '25%'], ['25%', '25%'], ['50%', '25%'], ['0%', '25%'],
        ['25%', '25%'], ['0%', '25%'], ['75%', '25%']
      ], 'width and left 2');

      assert.deepEqual(classNamesFromRecords(records), [
        'has-overlaps', 'has-overlaps', 'has-overlaps', 'has-overlaps',
        'has-overlaps', 'has-overlaps', 'has-overlaps'
      ], 'has-overlaps 2');

      var big2 = addRecord(3, 45, 6, 30);
      records.push(big2);
      subject.render();
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['0%', '25%'], ['25%', '25%'], ['50%', '25%'], ['0%', '25%'],
        ['25%', '25%'], ['0%', '25%'], ['75%', '25%'], ['50%', '25%']
      ], 'width and left 3');

      assert.deepEqual(classNamesFromRecords(records), [
        'has-overlaps', 'has-overlaps', 'has-overlaps', 'has-overlaps',
        'has-overlaps', 'has-overlaps', 'has-overlaps', 'has-overlaps'
      ], 'has-overlaps 3');

      var big3 = addRecord(1, 15, 3, 15);
      records.push(big3);
      subject.render();
      assert.deepEqual(widthAndLeftFromRecords(records), [
        ['0%', '20%'], ['20%', '20%'], ['60%', '20%'], ['0%', '20%'],
        ['20%', '20%'], ['0%', '20%'], ['80%', '20%'], ['40%', '20%'],
        ['40%', '20%']
      ], 'width and left 4');

      assert.deepEqual(classNamesFromRecords(records), [
        'has-overlaps many-overlaps', 'has-overlaps many-overlaps',
        'has-overlaps many-overlaps', 'has-overlaps many-overlaps',
        'has-overlaps many-overlaps', 'has-overlaps many-overlaps',
        'has-overlaps many-overlaps', 'has-overlaps many-overlaps',
        'has-overlaps many-overlaps'
      ], 'has-overlaps 4');
    });
  });
});

});
