/*exported MockSelectionHandler */
'use strict';

function MockSelectionHandler(options) {
  this.selected = null;
}

MockSelectionHandler.prototype = {
  get selectedCount() {
    return this.selected.size;
  },

  get selectedList() {
    return Array.from(this.selected);
  },

  select: function() {},
  unselect: function() {},
  toggleCheckedAll: function() {},
  cleanForm: function() {},
  allSelected: function() {}
};
