/*exported SelectionHandler */

(function(exports) {
'use strict';

var SelectionHandler = function constructor(options) {
  for(var name in options) {
    this[name] = options[name];
  }

  this.selected = new Set();

  this.container.addEventListener(
    'click', this.onSelected.bind(this)
  );
  this.checkUncheckAllButton.addEventListener(
    'click', this.toggleCheckedAll.bind(this)
  );
};

SelectionHandler.prototype = {
  get size() {
    return this.selected.size;
  },

  get selectedList() {
    return Array.from(this.selected);
  },

  onSelected: function sel_onSelected(event) {
    if (!this.isInEditMode()) {
      return;
    }
  	var target = event.target;
    var value = target.value;
    var existed = this.selected.has(value);

    if (target.checked && !existed) {
      this.selected.add(value);
    } else if (!target.checked && existed) {
      this.selected.delete(value);
    } else {
      // Don't emit event if no selection change
      return;
    }

    this.checkInputs();
  },

  // Update check status of input elements in the container
  updateCheckboxes: function sel_updateCheckboxes() {
    var inputs = this.container.querySelectorAll('input[type=checkbox]');
    var length = inputs.length;

    for (var i = 0; i < length; i++) {
      inputs[i].checked = this.selected.has(inputs[i].value);
    }
  },

  // if no message or few are checked : select all the messages
  // and if all messages are checked : deselect them all.
  toggleCheckedAll: function sel_toggleCheckedAll() {
    var selected = this.selected.size;
    var allInputs = this.getAllInputs();
    var allSelected = (selected === allInputs.length);

    if (allSelected) {
      this.selected.clear();
    } else {
      Array.prototype.forEach.call(allInputs, (data) => {
        this.selected.add(data.value);
      });
    }

    this.updateCheckboxes();

    this.checkInputs();
  },

  cleanForm: function sel_cleanForm() {
    // Reset all inputs
    this.selected.clear();
    
    this.updateCheckboxes();

    // Reset vars for deleting methods
    this.checkInputs();
  }
};

exports.SelectionHandler = SelectionHandler;

}(this));
