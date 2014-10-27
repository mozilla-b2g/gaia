/*exported Selection */

(function(exports) {
'use strict';

var Selection = {
  isSelected: function sel_isSelected(value) {
    return this.selected.indexOf(value) > -1;
  },

  selectedList: function sel_selectedList() {
    return Array.from(this.selected);
  },

  onSelected: function sel_onSelected(event) {
    var target = event.target;
    var value = target.value;
    var index = this.selected.indexOf(value);

    if (target.checked && index === -1) {
      this.selected.push(value);
    } else if (!target.checked && index > -1) {
      this.selected.splice(index, 1);
    } else {
      // No selection changes
      return;
    }

    this.checkInputs();
  },

  // if no message or few are checked : select all the messages
  // and if all messages are checked : deselect them all.
  toggleCheckedAll: function sel_toggleCheckedAll() {
    var selected = this.selected.length;
    var allInputs = this.getAllInputs();
    var allSelected = (selected === allInputs.length);

    this.selected = [];
    if (!allSelected) {
      Array.prototype.forEach.call(allInputs, (data) => {
        this.selected.push(data.value);
      });
    }

    this.updateInputsUI();

    this.checkInputs();
  },

  cleanForm: function sel_cleanForm() {
    // Reset all inputs
    this.selected = [];
    
    this.updateInputsUI();

    // Reset vars for deleting methods
    this.checkInputs();
  }
};

exports.SelectionHandler = {
  mixin: function(target, methods) {
    if (!target || typeof target !== 'object') {
      throw new Error('Object to mix into should be valid object!');
    }

    var thisInstance = {
      selected: []
    };

    methods.forEach((method) => {
      if (!target[method]) {
        throw new Error('Required method does not exist in target!');
      }

      thisInstance[method] = target[method].bind(target); 
    });

    Object.keys(Selection).forEach(function(method) {
      if (typeof target[method] !== 'undefined') {
        throw new Error(
          'Object to mix into already has "' + method + '" property defined!'
        );
      }
      target[method] = Selection[method].bind(this);
    }, thisInstance);

    return target;
  }
};

}(this));
