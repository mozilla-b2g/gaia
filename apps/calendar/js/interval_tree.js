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
   * The tree is dynamic and you can add and
   * remove items from the tree.
   *
   *
   *    tree.add({ start: 0, end: 50 });
   *
   *    // record should be === to record
   *    // stored in the tree.
   *    tree.remove(savedRecord);
   *
   */
  function Node(list) {
    var left = [];
    var right = [];

    this.max = 0;
    this.list = [];

    var median;

    var endpoints = [];

    //1. build endpoints to calculate median
    //   endpoints are the middle value of
    //   all start/end points in the current list.
    list.forEach(buildEndpoints, endpoints);

    median = this.median = endpoints[Math.floor(endpoints.length / 2)];

    list.forEach(function(item) {

      if (item.end > this.max) {
        this.max = item.end;
      }

      if (item.end < median) {
        left.push(item);
      } else if (item.start > median) {
        right.push(item);
      } else {
        this.list.push(item);
      }
    }, this);

    // recurse - create left/right nodes.
    if (left.length)
      this.left = new Node(left);

    if (right.length)
      this.right = new Node(right);
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
     * Find all overlapping records via a Calendar.Timespan.
     *
     * @param {Calendar.Timespan} span timespan.
     * @return {Array} results sorted by start time.
     */
    query: function(span) {
      var results = [];
      var seen = Object.create(null);

      return this._search(span, seen, results);
    },

    _search: function(span, seen, results) {
      if (this.left && (span.start < this.median)) {
        this.left._search(span, seen, results);
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
          if (!seen[item._id]) {
            seen[item._id] = true;
            results.push(item);
          }
        }
      }


      if (this.right && span.end > this.median) {
        this.right._search(span, seen, results);
      }

      return results;
    },

    add: function(record) {

    },

    remove: function(record) {

    }

  };

  return Node;

}());
