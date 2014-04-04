/**
 * The interval tree is a structure
 * designed and optimized for storing
 * (possibly) overlapping intervals in
 * such a way that we can optimally query them.
 *
 * To store an item in the tree the item
 * must have `START`, `END` and `_id` properties
 * both properties must be numeric and start
 * must always be < then end. ID should be unique
 * to each interval though it should be possible
 * to store multiple intervals with the same
 * start/end times.
 *
 * Trees should be created by providing an
 * array of items sorted by their start
 * times.
 *
 *
 *    // _start is a constant see below
 *    var list = [
 *      { start: 100, end: 200 },
 *      { start: 120, end: 150 },
 *      ...
 *    ];
 *
 *    var tree = new Calendar.Node(list);
 *
 *
 * The tree _should-be_ dynamic and you can add and
 * remove items from the tree.
 *
 * For the present the tree will rebuild itself
 * after add/removal before the next query operation.
 *
 *
 *    tree.add({ start: 0, end: 50 });
 *
 *    // record should be === to record
 *    // stored in the tree.
 *    tree.remove(savedRecord);
 *
 *
 * TODO: Implement self-balancing and real tree mutations.
 */
Calendar.IntervalTree = (function() {

  /**
   * Internal function to add an item
   * to an array via binary search insert.
   * Keeps items in order as they are inserted.
   *
   * @private
   */
  function addOrdered(item, array) {
    var idx = Calendar.binsearch.insert(
      array,
      item,
      Calendar.compare
    );

    array.splice(idx, 0, item);
  }


  /**
   * TODO: change these hard coded values.
   *       into a more flexible system later.
   */

  const START = '_startDateMS';
  const END = '_endDateMS';

  function compareObjectStart(a, b) {
    return Calendar.compare(a[START], b[START]);
  }

  function compareObjectEnd(a, b) {
    return Calendar.compare(a[END], b[END]);
  }

  IntervalTree.compareObjectStart = compareObjectStart;
  IntervalTree.compareObjectEnd = compareObjectEnd;

  /**
   * Internal function to create an endpoint
   * list. Assumed this is the array to insert
   * endpoint values into.
   *
   * @param {Object} item object with [START] & [END] properties.
   */
  function buildEndpoints(item) {
    addOrdered(item[START], this);
    addOrdered(item[END], this);
  }

  function Node() {
    this.list = [];
  }

  Node.prototype = {

    /**
     * Node to the left null or a node.
     */
    left: null,

    /**
     * Node to the right null or a node.
     */
    right: null,

    /**
     * List of objects that overlap current node.
     *
     * @type Array
     */
    list: null,

    /**
     * Center point of this node.
     */
    median: null,

    /**
     * Highest value of this node & subnodes.
     */
    max: null,

    /**
     * Iterates through matching items.
     * Will be roughly ordered by start
     * time but exact sort order is not
     * guaranteed.
     *
     * @param {Calendar.Timespan} span timespan.
     * @param {Function} callback first argument is matching
     *                            record second is the node in the
     *                            tree where record was found.
     */
    traverse: function(span, fn) {
      if (this.left && (span.start < this.median)) {
        this.left.traverse(span, fn);
      }

      var i = 0;
      var len = this.list.length;
      var item;

      for (; i < len; i++) {
        item = this.list[i];

        if (item[START] > span.end) {
          break;
        }

        if (span.overlaps(item[START], item[END])) {
          fn(item, this);
        }
      }

      if (this.right && span.end > this.median) {
        this.right.traverse(span, fn);
      }
    },

    /**
     * Find all overlapping records via a Calendar.Timespan.
     *
     * @param {Calendar.Timespan} span timespan.
     * @return {Array} results sorted by start time.
     */
    query: function(span) {
      var results = [];
      var seen = Object.create(null);

      this.traverse(span, function(item) {
        ///XXX: we probably want to order
        // these by start time via bin search
        // order by sort at the end.
        if (!seen[item._id]) {
          results.push(item);
        }
      });

      return results;
    }

  };

  IntervalTree.Node = Node;

  /**
   * Start point for creation of the tree
   * this is optimized for the most balanced tree
   * when possible. The idea is the majority of
   * operations will be read and traversal.
   *
   * NOTE: Currently we discard the tree and
   * mark the object as synced=false after mutations
   * The next time the object is queried the tree is rebuilt.
   */
  function IntervalTree(list) {
    if (typeof(list) === 'undefined') {
      this.items = [];
    } else {
      this.items = list.concat([]);
    }

    /**
     * Properties to index by when fields are added.
     */
    this._indexes = Object.create(null);

    // method aggregates
    this._indexOnAdd = [];
    this._indexOnRemove = [];

    this.byId = Object.create(null);
    this.synced = false;
  };

  IntervalTree.prototype = {

    START: START,
    END: END,

    build: function() {
      if (!this.synced) {
        this.rootNode = this._nodeFromList(this.items);
        this.synced = true;
      }
    },

    _getId: function(item) {
      return item._id;
    },

    /**
     * Returns all values in the given index.
     *
     * @param {String} property name of index.
     * @param {String} [value] to filter index on (optional).
     * @return {Null|Array}
     */
    index: function(property, value) {
      var items = this._indexes[property];

      if (items && value)
        return items[value];

      return items;
    },

    /**
     * Create index on property.
     *
     * @param {String} property to index on.
     */
    createIndex: function(property) {
      var index = this._indexes[property] = {};

      // remember this will be invoked later with the context
      // of |this| always...
      function addToIndex(object) {
        var value = object[property];

        // create array for index possibilities
        if (!index[value])
          index[value] = [];

        // and push single object to index
        index[value].push(object);
      }

      function removeFromIndex(object) {
        // object given should always be same instance stored.
        var value = object[property];
        var valueGroup = index[value];

        if (valueGroup) {
          var idx = valueGroup.indexOf(object);
          valueGroup.splice(idx, 1);
          if (valueGroup.length === 0) {
            delete index[value];
          }
        }
      }

      this._indexOnAdd.push(addToIndex);
      this._indexOnRemove.push(removeFromIndex);
    },

    /**
     * Adds an item to the tree
     */
    add: function(item) {
      var id = this._getId(item);

      if (id in this.byId)
        return;


      if (!item[START] && item.startDate) {
        item[START] = item.startDate.valueOf();
      }

      if (!item[END] && item.endDate) {
        item[END] = item.endDate.valueOf();
      }

      if (!item[START] || !item[END]) {
        console.trace();
        console.log(
          '(Calendar interval tree) invalid input skipping record',
          JSON.stringify(item)
        );
        return;
      }

      var idx = Calendar.binsearch.insert(
        this.items,
        item,
        compareObjectStart
      );

      this.items.splice(idx, 0, item);
      this.byId[id] = item;
      this.synced = false;

      var len = this._indexOnAdd.length;
      for (var i = 0; i < len; i++) {
        this._indexOnAdd[i].call(this, item);
      }

      return item;
    },

    indexOf: function(item) {
      var query = {};
      query[START] = item[START];
      var idx = Calendar.binsearch.find(
        this.items,
        query,
        compareObjectStart
      );

      var prevIdx;
      var current;

      if (idx !== null) {
        // we want to start idx at earliest
        // point in list that matches start time.
        // When there are multiple start times
        // the binsearch may start us at any point
        // in the range of matching items.


        // Iterate backwards.
        if (idx > 0) {
          prevIdx = idx;
          while (prevIdx > -1) {
            prevIdx--;
            current = this.items[prevIdx];
            if (current && current[START] === item[START]) {
              if (current === item) {
                return prevIdx;
              }
            } else {
              break;
            }
          }
        }

        //Iterate forwards.
        current = this.items[idx];
        while (current) {
          if (current === item) {
            return idx;
          }

          current = this.items[++idx];

          if (!current || current[START] !== item[START]) {
            return null;
          }
        }
      }

      return null;
    },

    /**
     * Removes an item to the list.
     * Must be same === item as as the
     * one you are trying to remove.
     */
    remove: function(item) {

      var idx = this.indexOf(item);

      if (idx !== null) {
        this._removeIds(this.items[idx]);

        this.items.splice(idx, 1);
        this.synced = false;
        return true;
      }

      return false;
    },

    _removeIds: function(item) {
      if (Array.isArray(item)) {
        item.forEach(this._removeIds, this);
      } else {
        var len = this._indexOnRemove.length;
        for (var i = 0; i < len; i++) {
          this._indexOnRemove[i].call(this, item);
        }

        var id = this._getId(item);
        delete this.byId[id];
      }
    },

    /**
     * Remove all intervals that start
     * after a particular time.
     *
     *    // assume we have a list of the
     *    // following intervals
     *    1-2 4-10 5-10 6-8 8-9
     *
     *    tree.removeFutureIntervals(5);
     *
     *    // now we have: 1-2, 4-10 5-10
     *
     * @param {Numeric} start last start point.
     */
    removeFutureIntervals: function(start) {
      var query = {};
      query[START] = start;

      var idx = Calendar.binsearch.insert(
        this.items,
        query,
        compareObjectStart
      );

      var max = this.items.length - 1;

      if (!this.items[idx])
        return;


      // for duplicate values we need
      // to find the very last one
      // before the split point.
      while (this.items[idx] && this.items[idx][START] <= start) {
        idx++;
        if (idx === max) {
          break;
        }
      }

      this.synced = false;
      var remove = this.items.splice(
        idx, this.items.length - idx
      );

      this._removeIds(remove);
      return remove;
    },

    /**
     * Remove all intervals that end
     * before a particular time.
     *
     * For example is you have:
     *
     *    // assume we have a list of the
     *    // following intervals
     *    1-10, 2-3, 3-4, 4-5
     *
     *    tree.removePastIntervals(4);
     *
     *    // now we have: 1-10, 4-5
     *
     * @param {Numeric} end last end point.
     */
    removePastIntervals: function(end) {
      // 1. first re-sort to end dates.
      var items = this.items.sort(compareObjectEnd);

      // 2. find index of the last date ending
      // on or before end.
      var endQuery = {};
      endQuery[END] = end;
      var idx = Calendar.binsearch.insert(
        items,
        endQuery,
        compareObjectEnd
      );

      var max = items.length - 1;

      if (!items[idx])
        return;

      // for duplicate values we need
      // to find the very last one
      // before the split point.
      while (items[idx][END] <= end) {
        idx++;
        if (idx === max) {
          break;
        }
      }

      this.synced = false;
      var remove = items.slice(0, idx);
      this.items = items.slice(idx).sort(
        compareObjectStart
      );

      this._removeIds(remove);

      return remove;
    },

    /**
     * Executes a query on all nodes.
     * Rebuilds tree if in unclean state first.
     *
     * @param {Calendar.Timespan} span timespan.
     */
    query: function(span) {
      this.build();
      return this.rootNode.query(span);
    },

    _nodeFromList: function(list) {
      var rootNode = new Node();

      var left = [];
      var right = [];

      var median;
      var endpoints = [];

      //1. build endpoints to calculate median
      //   endpoints are the middle value of
      //   all start/end points in the current list.
      list.forEach(buildEndpoints, endpoints);
      median = rootNode.median = endpoints[Math.floor(endpoints.length / 2)];

      list.forEach(function(item) {

        if (item[END] < median) {
          left.push(item);
        } else if (item[START] > median) {
          right.push(item);
        } else {
          rootNode.list.push(item);
        }
      }, this);

      // recurse - create left/right nodes.
      if (left.length)
        rootNode.left = this._nodeFromList(left);

      if (right.length)
        rootNode.right = this._nodeFromList(right);

      return rootNode;
    }

  };

  return IntervalTree;

}());
