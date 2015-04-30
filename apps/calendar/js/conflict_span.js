/**
 * Representation of conflicts over a span of time, organized into
 * non-overlapping columns tracked by IntervalTree instances.
 */
define(function(require, exports, module) {
'use strict';

var IntervalTree = require('interval_tree');
var Timespan = require('common/timespan');

// Smallest gap interval to use in splitting conflict spans
var MIN_SPLIT_INTERVAL = 5 * 60 * 1000;  // 5 minutes

// Auto-increment ID for instances
var _id = 0;

function ConflictSpan(parent) {
  this.id = (_id++);
  this.parent = parent;
  this.startTime = null;
  this.endTime = null;
  this.all = new IntervalTree();
  this.columnsByID = {};
  this.columns = [];
  this.addColumn();
}
module.exports = ConflictSpan;

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
    var tree = new IntervalTree();
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
    var span = new Timespan(busytime._startDateMS, busytime._endDateMS);
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
      var span = new Timespan(top, top + MIN_SPLIT_INTERVAL);
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
    var splitSpan = new Timespan(splitAt, Infinity);
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
    var newCS = new ConflictSpan(this.parent);
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
    var numCols = this.columns.length;
    var width = (100 / numCols);
    for (var cIdx = 0; cIdx < numCols; cIdx++) {
      var column = this.columns[cIdx];
      for (var k in column.byId) {
        var busytime = column.byId[k];
        var el = this.parent.getElement(busytime);
        el.style.width = width + '%';
        el.style.left = (width * cIdx) + '%';
        // we toggle the style based on amount of overlaps
        el.classList.toggle('many-overlaps', numCols > 4);
        el.classList.toggle('has-overlaps', numCols > 1);
      }
    }
  }
};

});
