Calendar.Overlap = (function() {

  /**
   * This class handles the logic to determine
   * which busytimes conflict with others and manages
   * special 'data-conflicts' and 'data-overlaps' attributes.
   *
   * We define a conflict as two events which start
   * roughly at the same time (see .conflictDistance).
   *
   * We define an overlap as events which occupy a similar
   * space to that of their counter part but do not start
   * at the same time.
   */
  function Overlap() {
    this.tree = new Calendar.IntervalTree();

    // used to map busytime ids to dom elements.
    this.elements = Object.create(null);

    // used to map busytime conflicts & overlaps.
    this.details = Object.create(null);
  }

  Overlap.prototype = {

    /**
     * Anything that starts within 5 minutes of each other is a conflict.
     */
    conflictDistance: Calendar.Calc.MINUTE * 5,

    add: function(busytime, element) {
      this.tree.add(busytime);
      this.elements[busytime._id] = element;

      var related = this._findRelated(busytime);

      // items with no relations don't incur the extra
      // calculations costs though we did need to do
      // the full interval tree query.
      if (related.length > 1) {
        this._processSet(busytime, related);
      }
    },

    /**
     * Remove a busytime from the collection.
     * Unlike other methods you must pass a real
     * busytime object.
     *
     * @param {Object} busytime full busytime object.
     */
    remove: function(busytime) {
      var id = busytime._id;

      var related = this._findRelated(busytime);
      var pending = Object.create(null);
      var start = busytime._startDateMS;
      var conflicts;
      var myDetails = this.getDetails(id);

      if (myDetails) {
        conflicts = myDetails.conflicts;
      }

      var i = 0;
      var len = related.length;

      for (; i < len; i++) {
        var otherTime = related[i];
        var otherDetails = this.getDetails(otherTime);
        var otherStart = otherTime._startDateMS;


        if (!otherDetails)
          continue;

        if (this._conflicts(start, otherStart)) {
          otherDetails.conflicts--;
          pending[otherTime._id] = true;
        } else {

          // don't modify overlap details for
          // elements that conflict.
          if (conflicts) {
            continue;
          }

          if (start < otherStart) {
            otherDetails.overlaps--;
            pending[otherTime._id] = true;
          } else {
            myDetails.overlaps--;
            pending[busytime._id] = true;
          }
        }
      }

      // update dom attributes
      this._updatePending(pending);

      // we do the in-memory removal after the element
      // attribute update so we have all the information
      // when we need it.
      delete this.details[id];
      delete this.elements[id];
      this.tree.remove(busytime);
    },

    /**
     * @param {Object|String} busytime id or busytime object.
     * @return {Object} associated conflict details.
     */
    getDetails: function(busytime) {
      var id;
      if (typeof(busytime) === 'string') {
        id = busytime;
      } else {
        id = busytime._id;
      }
      return this.details[id];
    },

    /**
     * @param {Object|String} busytime id or busytime object.
     * @return {HTMLElement} associated dom element.
     */
    getElement: function(busytime) {
      var id;
      if (typeof(busytime) === 'string') {
        id = busytime;
      } else {
        id = busytime._id;
      }
      return this.elements[id];
    },

    /** private */

    _conflicts: function(aStart, bStart) {
      var diff = Math.abs(
        aStart - bStart
      );
      return diff < this.conflictDistance;
    },

    _processSet: function(busytime, related) {
      // enter record for new busytime
      var myDetails = {};
      this.details[busytime._id] = myDetails;

      // pending for later
      var pending = Object.create(null);

      // cache start & end times.
      var start = busytime._startDateMS;
      var end = busytime._endDateMS;

      var len = related.length;
      for (var i = 0; i < len; i++) {
        var otherTime = related[i];

        // skip the current time
        if (otherTime === busytime)
          continue;

        // other details
        var otherDetails = this.getDetails(otherTime);
        var otherStart = otherTime._startDateMS;

        if (!otherDetails) {
          // create the other details if they do not exist.
          otherDetails = this.details[otherTime._id] = {};
        }

        if (this._conflicts(start, otherTime._startDateMS)) {
          // conflict
          var curLevel = 0;

          // check of one conflict level is greater then
          // other if so use that as basis.
          if (otherDetails && myDetails) {

            // set other as default if present
            if (otherDetails.conflicts) {
              curLevel = otherDetails.conflicts;
            }

            // if I have conflicts and they are greater then default
            // that is now the current level.
            if (myDetails.conflicts && myDetails.conflicts < curLevel) {
              curLevel = myDetails.conflicts;
            }
          }

          curLevel++;

          // conflicts always share the same level
          otherDetails.conflicts = curLevel;
          myDetails.conflicts = curLevel;

          // always update both the newly found conflict
          // and the current busytime.
          pending[otherTime._id] = true;
          pending[busytime._id] = true;

        } else {
          // overlaps - we determine how they overlap based on start times.
          if (start < otherStart) {
            otherDetails.overlaps = this._overlapLevel(otherDetails, myDetails);
            pending[otherTime._id] = true;
          } else {
            myDetails.overlaps = this._overlapLevel(myDetails, otherDetails);
            pending[busytime._id] = true;
          }
        }
      }

      // flush pending changes to the dom
      this._updatePending(pending);
    },

    _overlapLevel: function(myDetails, otherDetails) {
      var level = myDetails.overlaps || 0;
      level++;

      // prevents wild incrementing of overlaps when many conflicts
      // for the same time are in place.
      if (otherDetails.overlaps && level > otherDetails.overlaps) {
        level = otherDetails.overlaps + 1;
      }

      return level;
    },

    _updateConflictAttr: function(el, type, value) {
      // selector performance be damned (for now anyway)
      if (value || value === 0) {
        // one means no conflicts
        if (value > 0) {
          el.dataset[type] = value;
        } else {
          el.removeAttribute('data-' + type);
        }
      }
    },

    /**
     * Given an object
     *
     *    {
     *      'busytimeId': true
     *    }
     *
     * Will update the conflicts & overlaps on the associated
     * busytime's element. Will remove attributes when values are zero.
     */
    _updatePending: function(pending) {
      for (var id in pending) {
        var el = this.getElement(id);
        var details = this.getDetails(id);

        if ('conflicts' in details) {
          this._updateConflictAttr(el, 'conflicts', details.conflicts);
        }

        if ('overlaps' in details) {
          this._updateConflictAttr(el, 'overlaps', details.overlaps);
        }
      }
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
    }

  };

  return Overlap;
}());
