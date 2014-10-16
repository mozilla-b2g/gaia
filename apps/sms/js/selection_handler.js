/*exported Selection */

(function(exports) {
'use strict';

var Selection = {
  onSelected: function sel_onSelected(event) {
  	var target = event.target;
    var value = target.value;
    var existed = this.selected.has(value);

    if (target.checked && !existed) {
      this.selected.set(value, target);
    } else if (!target.checked && existed) {
      this.selected.delete(value);
    } else {
      // No selection changes
      return;
    }

    this.checkInputs();
  },

  selectAll: function sel_selectAll(allData) {
    Array.prototype.forEach.call(allData, (data) => {
      this.selected.set(data.value, data);
    });
  },

  // Update check status of input elements in the container
  updateInputsUI: function sel_updateListUI() {
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
    var allInputs = this.allInputs;
    var allSelected = (selected === allInputs.length);

    if (allSelected) {
      this.selected.clear();
    } else {
      this.selectAll(this.allInputs);
    }

    this.updateInputsUI();

    this.checkInputs();
  },

  cleanForm: function sel_cleanForm() {
    // Reset all inputs
    this.selected.clear();
    
    this.updateInputsUI();

    // Reset vars for deleting methods
    this.checkInputs();
  },

  checkInputs: function sel_checkInputs() {
    var selected = this.selected.size;
    var allInputs = this.allInputs;

    var isAnySelected = selected > 0;
    var selectedId = this.EDIT_MODE_TITLE.selected;
    var unselectedId = this.EDIT_MODE_TITLE.unselected;

    // Manage buttons enabled\disabled state
    if (selected === allInputs.length) {
      this.checkUncheckAllButton.setAttribute('data-l10n-id', 'deselect-all');
    } else {
      this.checkUncheckAllButton.setAttribute('data-l10n-id', 'select-all');
    }

    if (isAnySelected) {
      this.deleteButton.disabled = false;
      navigator.mozL10n.setAttributes(this.editMode, selectedId,
        {n: selected});
    } else {
      this.deleteButton.disabled = true;
      navigator.mozL10n.setAttributes(this.editMode, unselectedId);
    }
  }
};

exports.Selection = Selection;

}(this));
