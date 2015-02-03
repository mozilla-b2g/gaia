'use strict';

/*
 Generic action menu. Options should have the following structure:


  new OptionMenu(options);

  options {

    items: An array of menu options to render
    eg.
    [
      {
        name: 'Lorem ipsum',
        l10nId: 'lorem',
        l10nArgs: 'ipsum',
        method: function optionMethod(param1, param2) {
          // Method and params if needed
        },
        params: ['param1', '123123123']
      },
      ....
      ,


      Last option has a different UI compared with the previous one.
      This is because it's recommended to use as a 'Cancel' option
      {
        name: 'Cancel',
        l10nId: 'Cancel'
        method: function optionMethod(param) {
          // Method and param if needed
        },
        params: ['Optional params'],

        // Optional boolean flag to tell the
        // menu button handlers that this option
        // will not execute the "complete" callback.
        // Defaults to "false"

        incomplete: false [true]
      }
    ],

    // Optional header text or node
    header: ...,

    // additional classes on the dialog, as an array of strings
    classes: ...

    // Optional section text or node
    section: ...

    // Optional data-type: confirm or action
    type: 'confirm'

    // Optional callback to be invoked when a
    // button in the menu is pressed. Can be
    // overridden by an "incomplete: true" set
    // on the menu item in the items array.
    complete: function() {...}
  }
*/


var OptionMenu = function(options) {
  if (!options || !options.items || options.items.length === 0) {
    return;
  }
  // Create a private, weakly held entry for
  // this instances DOM object references
  // More info:
  // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/WeakMap
  var handlers = new WeakMap();
  // Retrieve items to be rendered
  var items = options.items;
  // Create the structure
  this.form = document.createElement('form');
  this.form.dataset.type = options.type || 'action';
  this.form.dataset.subtype = 'menu';
  this.form.setAttribute('role', 'dialog');
  this.form.tabIndex = -1;

  var classList = this.form.classList;

  if (options.classes) {
    classList.add.apply(classList, options.classes);
  }

  // We append title if needed
  if (options.header) {
    var header = document.createElement('header');

    if (typeof options.header === 'string') {
      header.textContent = options.header || '';
    } else if (options.header.l10nId) {
      header.setAttribute('data-l10n-id', options.header.l10nId);
    } else {
      header.appendChild(options.header);
    }

    this.form.appendChild(header);
  }
  if (options.section) {
    var section = document.createElement('section');

    if (typeof options.section === 'string') {
      section.textContent = options.section || '';
    } else {
      section.appendChild(options.section);
    }

    this.form.appendChild(section);
  }

  // We append a menu with the list of options
  var menu = document.createElement('menu');
  menu.dataset.items = items.length;

  // For each option, we append the item and listener
  items.forEach(function renderOption(item) {
    var button = document.createElement('button');
    button.type = 'button';
    if (item.l10nId) {
      navigator.mozL10n.setAttributes(button, item.l10nId, item.l10nArgs);
    } else if (item.name && item.name.length) {
      button.textContent = item.name || '';
    } else {
      // no l10n or name, just empty item, don't add to the menu
      return;
    }
    menu.appendChild(button);
    // Add a mapping from the button object
    // directly to its options item.
    item.incomplete = item.incomplete || false;

    handlers.set(button, item);
  });

  this.form.addEventListener('submit', function(event) {
    event.preventDefault();
  });

  this.form.addEventListener('transitionend', function(event) {
    if (event.target !== this.form) {
      return;
    }

    if (!this.form.classList.contains('visible') && this.form.parentNode) {
      this.form.remove();
    } else {
      // Focus form for accessibility
      this.form.focus();
    }

    // If we add a class, the animation will not be perform properly.
    // see Bug 1095338 for further information
    document.body.style.pointerEvents = 'initial';
  }.bind(this));

  menu.addEventListener('click', function(event) {
    var action = handlers.get(event.target);
    var method;

    // Delegate operation to target method. This allows
    // for a custom "Cancel" to be provided by calling program.
    //
    // Further operations should only be processed if
    // an actual button was pressed.
    if (typeof action !== 'undefined') {
      method = action.method || function() {};

      method.apply(null, action.params || []);

      // Hide action menu when click is received
      this.hide();

      if (typeof options.complete === 'function' && !action.incomplete) {
        options.complete();
      }
    }
  }.bind(this));
  // Appending the action menu to the form
  this.form.appendChild(menu);
};

// We prototype functions to show/hide the UI of action-menu
OptionMenu.prototype.show = function() {
  // Remove the focus to hide the keyboard asap
  document.activeElement && document.activeElement.blur();

  if (!this.form.parentNode) {
    document.body.appendChild(this.form);

    // Flush style on form so that the show transition plays once we add
    // the visible class.
    this.form.clientTop;
  }
  this.form.classList.add('visible');
  // Prevent to execute another action.
  // If we add a class, the animation will not be perform properly.
  // see Bug 1095338 for further information
  document.body.style.pointerEvents = 'none';
};

OptionMenu.prototype.hide = function() {
  this.form.classList.remove('visible');
};
