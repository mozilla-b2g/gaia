/**
 * The interval tree is a structure
 * designed and optimized for storing
 * (possibly) overlapping intervals in
 * such a way that we can optimally query them.
 *
 * To store an item in the tree the item
 * must have both `start`, `end` and `_id` properties
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

  function compareObject(a, b) {
    return Calendar.compare(a.start, b.start);
  }

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
   * Internal function to create an endpoint
   * list. Assumed this is the array to insert
   * endpoint values into.
   *
   * @param {Object} item object with .start & .end properties.
   */
  function buildEndpoints(item) {
    addOrdered(item.start, this);
    addOrdered(item.end, this);
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

        if (item.start > span.end) {
          break;
        }

        if (span.overlaps(item.start, item.end)) {
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
    this.items = list.concat([]);
    this.synced = false;
  };

  IntervalTree.prototype = {

    build: function() {
      if (!this.synced) {
        this.rootNode = this._nodeFromList(this.items);
        this.synced = true;
      }
    },

    /**
     * Adds an item to the tree
     */
    add: function(item) {
      var idx = Calendar.binsearch.insert(
        this.items,
        item,
        compareObject
      );

      this.items.splice(idx, 0, item);
      this.synced = false;
    },

    /**
     * Removes an item to the list.
     * Must be same === item as as the
     * one you are trying to remove.
     */
    remove: function(item) {
      var idx = Calendar.binsearch.find(
        this.items,
        item.start,
        compareObject
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
            if (current && current.start === item.start) {
              if (current === item) {
                this.items.splice((prevIdx), 1);
                this.synced = false;
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
            this.items.splice(idx, 1);
            this.synced = false;
            return true;
          }

          current = this.items[++idx];

          if (!current || current.start !== item.start) {
            return false;
          }
        }
      }

      return false;
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

        if (item.end < median) {
          left.push(item);
        } else if (item.start > median) {
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
