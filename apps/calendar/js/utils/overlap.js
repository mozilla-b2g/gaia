/**
 * Representation of conflicts over a span of time, organized into
 * non-overlapping columns tracked by IntervalTree instances.
 */
Calendar.ConflictSpan = (function() {

  // Smallest gap interval to use in splitting conflict spans
  var MIN_SPLIT_INTERVAL = 5 * 60 * 1000;  // 5 minutes

  // Auto-increment ID for instances
  var _id = 0;

  function ConflictSpan(parent) {
    this.id = (_id++);
    this.parent = parent;
    this.startTime = null;
    this.endTime = null;
    this.all = new Calendar.IntervalTree();
    this.columnsByID = {};
    this.columns = [];
    this.addColumn();
  };

  ConflictSpan.prototype = {

    /**
     * Get a list of all the busytime IDs in this span.
     *
     * @return {Array} List of all the busytime IDs.
     */
    getIDs: function() {
      return Object.keys(this.all.byId);
    },

    /**
     * Add a new column tracked by an IntervalTree
     *
     * @return {Object} IntervalTree tracking the column.
     */
    addColumn: function() {
      var tree = new Calendar.IntervalTree();
      this.columns.push(tree);
      return tree;
    },

    /**
     * Find a column where the given busytime fits without conflict, adding a
     * new column if necessary.
     *
     * @param {Object} busytime full busytime object.
     * @return {Object} IntervalTree column that can accept the busytime.
     */
    findColumn: function(busytime, skipAdd) {
      var column = null;
      var span = new Calendar.Timespan(
        busytime._startDateMS,
        busytime._endDateMS
      );
      for (var i = 0; i < this.columns.length; i++) {
        var curr = this.columns[i];
        if (!curr.query(span).length) {
          column = curr;
          break;
        }
      }
      if (!column && !skipAdd) {
        column = this.addColumn();
      }
      return column;
    },

    /**
     * Add a busytime to the conflict span
     *
     * @param {Object} busytime full busytime object.
     */
    add: function(busytime) {
      var id = busytime._id;

      this.parent.conflicts[id] = this;
      this.all.add(busytime);

      var column = this.findColumn(busytime);
      column.add(busytime);
      this.columnsByID[id] = column;

      this._updateTimes(busytime);
      this._updateLayout();
      return this;
    },

    /**
     * Remove a busytime from the conflict span
     *
     * @param {Object} busytime full busytime object.
     * @param {Boolean} skipMaintenance skip post-removal maintenance.
     */
    remove: function(busytime, skipMaintenance) {
      var id = busytime._id;

      this.all.remove(busytime);
      var column = this.columnsByID[id];
      if (!column) { return; }

      column.remove(busytime);
      delete this.columnsByID[id];
      delete this.parent.conflicts[id];

      // Removing a single item requires maintenance after. But, this can be
      // skipped during a split, which does its own cleanup after multiple
      // removes & adds between spans.
      if (skipMaintenance) { return this; }

      this._splitIfNecessary();
      var boom = this._selfDestructIfNecessary();
      if (!boom) {
        this._resetTimes();
        this._purgeEmptyColumns();
        this._updateLayout();
      }

      return this;
    },

    /**
     * Absorb the given conflict span into this one
     *
     * @param {Object} ConflictSpan to be absorbed.
     */
    absorb: function(otherCS) {
      var self = this;
      var otherIDs = otherCS.getIDs();
      otherIDs.forEach(function(otherID) {
        var otherBusytime = self.parent.tree.byId[otherID];
        self.add(otherBusytime);
        // Cheat: skip removing from the other span, since references go away.
      });
    },

    /**
     * Update the start/end times for this span from a new busytime.
     *
     * @param {Object} busytime full busytime object.
     */
    _updateTimes: function(busytime) {
      var start = busytime._startDateMS;
      if (null === this.startTime || start < this.startTime) {
        this.startTime = start;
      }
      var end = busytime._endDateMS;
      if (null === this.endTime || end > this.endTime) {
        this.endTime = end;
      }
    },

    /**
     * Reset times with a complete re-scan of all events in the span.
     */
    _resetTimes: function() {
      this.startTime = this.endTime = null;
      var byId = this.all.byId;
      for (var k in byId) {
        this._updateTimes(byId[k]);
      }
    },

    /**
     * Scan through the events in this span. If a significant gap is found,
     * presumably after a removal, split this span in two.
     *
     * @param {Object} busytime full busytime object.
     */
    _splitIfNecessary: function() {
      var start = this.startTime;
      var end = this.endTime;

      // Scan for the end of the first gap, if any.
      var splitAt = false;
      var prevHits = null;
      for (var top = start; top < end; top += MIN_SPLIT_INTERVAL) {
        var span = new Calendar.Timespan(top, top + MIN_SPLIT_INTERVAL);
        var hits = this.all.query(span).length;
        if (0 === prevHits && hits > 0) {
          // Transition from empty to non-empty is where we split.
          splitAt = top; break;
        }
        prevHits = hits;
      }

      // Bail if we never found a gap.
      if (splitAt === false) { return; }

      // Remove & collect the post-gap items for new split.
      var newItems = [];
      var splitSpan = new Calendar.Timespan(splitAt, Infinity);
      var splitItems = this.all.query(splitSpan);
      var self = this;
      splitItems.forEach(function(item) {
        self.remove(item, true);
        newItems.push(item);
      });

      // Perform partial post-removal maintenance
      var boom = this._selfDestructIfNecessary();
      if (!boom) {
        this._resetTimes();
        this._purgeEmptyColumns();
        this._updateLayout();
      }

      // Bail if there's just one item for new split - no conflict.
      if (newItems.length == 1) {
        this.parent._clearLayout(newItems[0]);
        return;
      }

      // Otherwise, populate a new span with the conflicting items.
      var newCS = new Calendar.ConflictSpan(this.parent);
      newItems.forEach(function(item) {
        newCS.add(item);
      });

      // Finally, recurse into the new span and split further, if necessary.
      newCS._splitIfNecessary();
    },

    /**
     * If this span has only one event left, then self-destruct because there's
     * no longer a conflict.
     */
    _selfDestructIfNecessary: function() {
      var keys = this.getIDs();
      if (keys.length > 1) {
        // There's still a conflict, so bail.
        return false;
      }
      if (keys.length == 1) {
        // Exactly one left, so clean up.
        var busytime = this.all.byId[keys[0]];
        this.remove(busytime, true);
        this.parent._clearLayout(busytime);
      }
      return true;
    },

    /**
     * Purge empty columns from the conflict span.
     */
    _purgeEmptyColumns: function() {
      var newColumns = [];
      for (var i = 0; i < this.columns.length; i++) {
        var column = this.columns[i];
        if (Object.keys(column.byId).length > 0) {
          newColumns.push(column);
        }
      }
      this.columns = newColumns;
    },

    /**
     * Update layout for all events participating in this conflict span.
     */
    _updateLayout: function() {
      // We don't have any "conflicts" in the month's day view.
      var numCols = this.columns.length;
      var width = (100 / numCols);
      for (var cIdx = 0; cIdx < numCols; cIdx++) {
        var column = this.columns[cIdx];
        for (var k in column.byId) {
          var busytime = column.byId[k];
          var el = this.parent.getElement(busytime);
          el.style.width = width + '%';
          el.style.left = (width * cIdx) + '%';
        }
      }
    }

  };

  return ConflictSpan;
}());

/**
 * Conflict manager
 */
Calendar.ns('Utils').Overlap = (function() {

  function Overlap() {
    this.reset();
  };

  Overlap.prototype = {

    reset: function() {
      this.tree = new Calendar.IntervalTree();
      this.conflicts = {};
      this.elements = {};
    },

    add: function(myBusytime, element) {
      this.tree.add(myBusytime);
      this.elements[myBusytime._id] = element;

      // Check for conflicts, bail if none
      var related = this._findRelated(myBusytime);
      if (0 === related.length) return;

      var myID = myBusytime._id;
      var myCS = this.conflicts[myID];

      var self = this;
      related.forEach(function(otherBusytime) {
        // Get the other's ID, skip the current
        var otherID = otherBusytime._id;
        if (otherID == myID) return;

        var otherCS = self.conflicts[otherID];
        if (!myCS && !otherCS) {
          // This is a brand new conflict.
          myCS = new Calendar.ConflictSpan(self);
          myCS.add(myBusytime).add(otherBusytime);
        } else if (myCS && !otherCS) {
          // Other time can join this one's existing span
          myCS.add(otherBusytime);
        } else if (!myCS && otherCS) {
          // This time can join the other's existing span
          myCS = otherCS.add(myBusytime);
        } else if (myCS && otherCS && myCS != otherCS) {
          // Both already in different spans, so absorb other into this
          myCS.absorb(otherCS);
        }
      });

    },

    /**
     * Remove a busytime from the collection.
     * Unlike other methods you must pass a real
     * busytime object.
     *
     * @param {Object} busytime full busytime object.
     */
    remove: function(busytime) {
      this._clearLayout(busytime);
      this.tree.remove(busytime);
      delete this.elements[busytime._id];
      var myID = busytime._id;
      var myCS = this.conflicts[myID];
      if (myCS) {
        myCS.remove(busytime);
      }
    },

    /**
     * Get the ConflictSpan associated with this busytime, if any.
     *
     * @param {Object|String} busytime id or busytime object.
     * @return {Object} associated ConflictSpan, if any.
     */
    getConflictSpan: function(busytime) {
      var id = this._busytimeId(busytime);
      return this.conflicts[id];
    },

    /**
     * @param {Object|String} busytime id or busytime object.
     * @return {HTMLElement} associated dom element.
     */
    getElement: function(busytime) {
      var id = this._busytimeId(busytime);
      return this.elements[id];
    },

    /** private */

    _busytimeId: function(busytime) {
      return (typeof(busytime) === 'string') ? busytime : busytime._id;
    },

    /**
     * Search tree for busytimes that overlap with the given.
     */
    _findRelated: function(busytime) {
      var span = new Calendar.Timespan(
        //XXX: this is bad encapsulation but
        //     we generate these when we insert
        //     the points in the tree.
        busytime._startDateMS,
        busytime._endDateMS
      );

      return this.tree.query(span);
    },

    /**
     * Clear the layout from a busytime element, presumably because it has just
     * been removed from conflict.
     *
     * @param {Object} busytime full busytime object.
     */
    _clearLayout: function(busytime) {
      var el = this.elements[busytime._id];
      el.style.width = '';
      el.style.left = '';
    }

  };

  return Overlap;
}());
