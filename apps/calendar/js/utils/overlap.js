define(function(require, exports, module) {
'use strict';

/**
 * Overlap is responsible for storing references to all the busytimes and DOM
 * elements for a given day and making sure they don't overlap each other.
 */
function Overlap() {
  this.reset();
}

module.exports = Overlap;

Overlap.prototype = {

  /**
   * clears internal state; remove references to all busytimes and elements
   */
  reset: function() {
    this._items = [];
    this._conflicts = [];
  },

  /**
   * add busytime and element to the overlap calculation
   * @param {object} item Object containing {busytime} and {element} properties
   */
  add: function(item) {
    this._items.push(item);
  },

  /**
   * update the element width, position and classList based on overlaps
   */
  render: function() {
    // we defer the conflict work till render to avoid calculating it multiple
    // times in a row (eg. multiple `add` calls)
    this._updateConflicts();
    this._getConflictItems().forEach(data => {
      var el = data.element;
      var nCols = data.nCols;
      var wid = (100 / nCols);
      el.style.width = wid + '%';
      // on LTR we show earlier events on the left, on RTL we do the opposite
      var position = document.documentElement.dir === 'rtl' ? 'right' : 'left';
      el.style[position] = (data.colIndex * wid) + '%';
      // we toggle the style based on amount of overlaps
      el.classList.toggle('many-overlaps', nCols > 4);
      el.classList.toggle('has-overlaps', nCols > 1);
    });
  },

  /**
   * (re)builds all the ConflictSpan
   */
  _updateConflicts: function() {
    // need to reset the conflicts since new items might be added between
    // multiple render calls
    this._conflicts = [];
    // sort by start date to avoid issues with larger events being added
    // afterwards and also to ensure events that started earlier are on the
    // left side on LTR and right side on RTL (if possible)
    this._items
      .sort((a, b) => a.busytime.startDate - b.busytime.startDate)
      .forEach(item => this._getConflict(item).add(item));
  },

  /**
   * gets ConflictSpan that can fit the item or create a new ConflictSpan
   */
  _getConflict: function(item) {
    var conflict = this._conflicts.find(c => c.intersects(item.busytime));

    // if no conflict intersects with busytime we create a new one
    if (!conflict) {
      conflict = new ConflictSpan();
      this._conflicts.push(conflict);
    }

    return conflict;
  },

  _getConflictItems: function() {
    return this._conflicts.reduce((items, conflict) => {
      return items.concat(conflict.getItems());
    }, []);
  },
};

/**
 * ConflictSpan packs events into the least amount of columns possible without
 * causing overlaps.
 */
function ConflictSpan() {
  this.startDate = Infinity;
  this.endDate = -Infinity;
  this.columns = [];
}

ConflictSpan.prototype = {

  add: function(item) {
    var {busytime} = item;
    this.startDate = Math.min(this.startDate, busytime.startDate);
    this.endDate = Math.max(this.endDate, busytime.endDate);
    this._getColumn(item).push(item);
  },

  /**
   * get a column that can fit the event or create a new column if needed - for
   * cases where we have multiple conflicts against same events in different
   * times of the day. (eg. 1-7pm, 1-2pm & 5-6pm)
   */
  _getColumn: function(item) {
    var column;

    var col, i = -1;
    while ((col = this.columns[++i])) {
      var canFit = !col.some(e => intersects(e.busytime, item.busytime));
      if (canFit) {
        column = col;
        break;
      }
    }

    if (!column) {
      column = [];
      this.columns.push(column);
    }
    return column;
  },

  intersects: function(busytime) {
    return intersects(this, busytime);
  },

  /**
   * returns all the items contained by this conflict span with a reference to
   * the column index (colIndex), amount of columns (nCols), busytime and
   * element.
   */
  getItems: function() {
    var nCols = this.columns.length;
    var items = [];

    this.columns.forEach((column, colIndex) => {
      column.forEach(item => {
        items.push({
          busytime: item.busytime,
          element: item.element,
          nCols: nCols,
          colIndex: colIndex
        });
      });
    });

    return items;
  }
};

function intersects(a, b) {
  return (Math.min(a.endDate, b.endDate) -
          Math.max(a.startDate, b.startDate)) > 0;
}

});
