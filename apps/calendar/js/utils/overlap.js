/**
 * Conflict manager
 */
define(function(require, exports, module) {
'use strict';

/**
 * Module dependencies
 */
var ConflictSpan = require('conflict_span');
var IntervalTree = require('interval_tree');
var Timespan = require('timespan');

function Overlap() {
  this.reset();
}
module.exports = Overlap;

Overlap.prototype = {
  reset: function() {
    this.tree = new IntervalTree();
    this.conflicts = {};
    this.elements = {};
  },

  add: function(myBusytime, element) {
    this.tree.add(myBusytime);
    this.elements[myBusytime._id] = element;

    // Check for conflicts, bail if none
    var related = this._findRelated(myBusytime);
    if (0 === related.length) {
      return;
    }

    var myID = myBusytime._id;
    var myCS = this.conflicts[myID];

    var self = this;
    related.forEach(function(otherBusytime) {
      // Get the other's ID, skip the current
      var otherID = otherBusytime._id;
      if (otherID === myID) {
        return;
      }

      var otherCS = self.conflicts[otherID];
      if (!myCS && !otherCS) {
        // This is a brand new conflict.
        myCS = new ConflictSpan(self);
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
    //XXX: this is bad encapsulation but
    //     we generate these when we insert
    //     the points in the tree.
    var span = new Timespan(busytime._startDateMS, busytime._endDateMS);
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
    el.classList.remove('has-overlaps', 'many-overlaps');
  }
};

});
