requireApp('calendar/test/unit/helper.js', function() {
  requireLib('interval_tree.js');
  requireLib('timespan.js');
});

suite('interval_tree', function() {

  suite('playground - augmented tree search', function() {
    var id = 0;
    var ops;

    setup(function() {
      id = 0;
      ops = 0;
    });

    function compare(objA, objB) {
      var a = objA.start;
      var b = objB.start;

      if (a < b) {
        return -1;
      } else if (a > b) {
        return 1;
      } else {
        return 0;
      }
    }

    function Range(start, end) {
      this._id = id++;
      this.start = start;
      this.end = end;
    }

    function Node(center, list, left, right) {
      this.center = center;
      this.list = list;
      this.left = left;
      this.right = right;

      this.max = list.reduce(function(prev, cur) {
        if (!prev || cur.end > prev.end) {
          return cur;
        } else {
          return prev;
        }
      }).end;

      if (left && left.max > this.max) {
        this.max = left.max;
      }

      if (right && right.max > this.max) {
        this.max = right.max;
      }
    }

    Node.prototype = {
      search: function(span) {
        var results = [];
        var found;
        var seen = Object.create(null);

        return this.pointSearch(this, span, seen, []);
      },

      pointSearch: function(node, span, seen, results) {
        if (node.left && (span.start < node.center)) {
          //console.log('LEFT');
          this.pointSearch(node.left, span, seen, results);
        }

        var i = 0;
        var len = node.list.length;
        var item;

        for (; i < len; i++) {
          item = node.list[i];
          ops++;

          // we don't need to traverse
          // ranges that start after
          // the span ends... becuase
          // the tree is ordered we can optimize
          // this. reducing the # of operations.
          if (item.start > span.end) {
            //console.log('BREAK!')
            break;
          }

          if (span.overlaps(item.start, item.end)) {

            if (!seen[item._id]) {
              seen[item._id] = true;
              results.push(item);
            }
          }
        }

        if (node.right) {
          //console.log(span.end, node.right.center);
        }
        if (node.right && span.end >= node.right.center) {
          //console.log('RIGHT')
          this.pointSearch(node.right, span, seen, results);
        }

        return results;
      }
    };

    function normalCompare(a, b) {
      if (a < b) {
        return -1;
      } else if(a > b) {
        return 1;
      } else {
        return 0;
      }
    }

    function sortedAdd(item, list) {
      var idx = Calendar.binsearch.insert(list, item, normalCompare);
      list.splice(idx, 0, item);
    }

    function splitIntervals(list) {
      if (!list.length)
        return null;

      var left = [];
      var right = [];
      var center = [];

      var endpoints = [];

      // we need to find the center of all points.
      list.forEach(function(item) {
        sortedAdd(item.start, endpoints);
        sortedAdd(item.end, endpoints);
      });

      var median = endpoints[Math.floor(endpoints.length / 2)];

      list.forEach(function(item) {
        if (item.end < median) {
          left.push(item);
        } else if (item.start > median) {
          right.push(item);
        } else {
          center.push(item);
        }
      });

      left = splitIntervals(left);
      right = splitIntervals(right);

      return new Node(median, center, left, right);
    }

    test('splitIntervals', function() {
      var list = [];

      //100 out of bounds - before
      for (var i = 0; i < 1600; i++) {
        list.push(new Range(i, 119+i));
      }

      // 100 long running events (worst case)
      for (var i = 0; i < 1200; i++) {
        list.push(new Range(i, 1000+i));
      }

      var expected = [
        [100, 150],
        [150, 600],
        [151, 199],
        [151, 600],
        [152, 2000],
        [175, 201]
      ];

      list.push(new Range(100, 150));
      list.push(new Range(151, 199));
      list.push(new Range(175, 201));
      list.push(new Range(150, 600));
      list.push(new Range(151, 600));
      list.push(new Range(152, 2000));

      for (var i = 0; i < 600; i++) {
        list.push(new Range(200 + i, 1001));
      }

      list = list.sort(compare);

      var begin = window.performance.now();
      var node = splitIntervals(list);
      var span = new Calendar.Timespan(120, 200);
      var matches = node.search(span);

      var reduced = matches.sort(compare).map(function(item) {
        return [item.start, item.end];
      });

      matches.forEach(function(item) {
        //console.log(item, '<--');
      });

      console.log('TOTAL ITEMS:', list.length);
      console.log('RESULT:', matches.length);
      console.log('OPERATIONS:', ops);
      //assert.deepEqual(reduced, expected);
      console.log(window.performance.now() - begin);
    });
  });

  var subject;
  var items;
  var expectedRange;

  setup(function() {
    // we use this range as a baseline
    // through the less complicated tests
    expectedRange = {
      start: 1200,
      end: 1300
    };

    // setup the basic list of items
    items = {};

    items.before = {
      _id: 1,
      start: 1000,
      end: 1100
    }

    items.after = {
      _id: 2,
      start: 1500,
      end: 2000
    };

    items.middle = {
      _id: 3,
      start: 1250,
      end: 1280
    };

    items.overlapBefore = {
      _id: 4,
      start: 1050,
      end: 1400
    };

    // should be in order of start times
    items = [
      items.before,
      items.overlapBefore,
      items.middle,
      items.after
    ];

    subject = new Calendar.IntervalTree(items);
  });

  suite('node alignment', function() {

  });


});
