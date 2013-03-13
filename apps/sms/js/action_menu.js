'use strict';

/*
 Generic action menu. Options should have the following structure:

   var options = new OptionMenu({
    'items': [
      {
        name: 'Lorem ipsum',
        method: function optionMethod(param1, param2) {
          // Method and params if needed
        },
        params: ['param1', '123123123']
      },
      ....
      ,
      {
        name: 'Cancel',
        method: function optionMethod(param) {
          // Method and param if needed
        },
        params: ['Optional params']
      }

    ]
  });

  Last option has a different UI compared with the previous one.
  This is because it's recommended to use as a 'Cancel' option

*/


var OptionMenu = function(options) {
  if (!options || !options.items || options.items.length === 0) {
    return;
  }
  // Create a private, weakly held entry for
  // this instances DOM object references
  // More info:
  // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/WeakMap
  var _buttonHandlers = new WeakMap();
  // Retrieve items to be rendered
  var _items = options.items;
  // Create the structure
  this.actionMenu = document.createElement('form');
  this.actionMenu.dataset.type = 'action';
  this.actionMenu.setAttribute('role', 'dialog');
  // We append title if needed
  if (options.title && options.title.length > 0) {
    var _header = document.createElement('header');
    _header.textContent = options.title;
    this.actionMenu.appendChild(_header);
  }
  // We append a menu with the list of options
  var _menu = document.createElement('menu');

  // For each option, we append the item and listener
  _items.forEach(function renderOption(item) {
    if (item.name && item.name.length > 0) {
      var button = document.createElement('button');
      button.textContent = item.name;
      _menu.appendChild(button);
      // Add a mapping from the button object
      // directly to its options item.
      _buttonHandlers.set(button, item);
    }
  });

  this.actionMenu.addEventListener('submit', function(event) {
    event.preventDefault();
  });

  _menu.addEventListener('click', function(event) {
    var action = _buttonHandlers.get(event.target);
    var method = (action && action.method) || function() {};

    // Delegate operation to target method. This allows
    // for a custom "Cancel" to be provided by calling program
    if (action) {
      method.apply(null, action.params || []);
    }
    // Hide action menu when click is received
    this.hide();
  }.bind(this));
  // Appending the action menu to the form
  this.actionMenu.appendChild(_menu);
};

// We prototype functions to show/hide the UI of action-menu
OptionMenu.prototype.show = function() {
  // We append the element to body
  document.body.appendChild(this.actionMenu);
};

OptionMenu.prototype.hide = function() {
  // We remove the element to body
  document.body.removeChild(this.actionMenu);
};
