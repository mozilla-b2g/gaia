/*global WeakMap */

/* exported Dialog */

(function(exports) {
'use strict';

/*
 Generic confirm screen. Only 'cancel/default' is mandatory.

 Text fields are localized using commonly defined parameter structure:
 https://developer.mozilla.org/en-US/Firefox_OS/Developing_Gaia/
 localization_code_best_practices#Writing_APIs_that_operate_on_L10nIDs + 'raw'
 can be Node aw well.

 The constructor parameter should follow the following structure:

 {
  title: { raw: 'Non localizable title' },
  body: {
    id: 'localizableStringWithArgument',
    args: { n: count }
  },
  classes: ['specific-class'], // optional
  options: {
    // Cancel is a mandatory option. You need to define at least the text.
    cancel: {
      text: 'localizableCancelLabel'
    },
    confirm: {
      text: 'localizableRemoveLabel',
      method: function(params) {
        fooFunction(params);
      },
      params: [arg1, arg2,....],
      className: 'optionalClassName'
    }
  }
*/

// helper to localize an element given parameters
function createLocalizedElement(tagName, valueL10n) {
  var element = document.createElement(tagName);

  // if we passed an l10nId, use the l10n `setAttributes' method
  if (typeof valueL10n === 'string') {
    element.setAttribute('data-l10n-id', valueL10n);
  } else if (valueL10n.id) {
    navigator.mozL10n.setAttributes(element, valueL10n.id, valueL10n.args);
  // if we passed in a HTML Fragment, it is already localized
  } else if (valueL10n.raw && valueL10n.raw.nodeType) {
    element.appendChild(valueL10n.raw);
  // otherwise - stuff text in here...
  } else {
    element.textContent = valueL10n.raw;
  }
  return element;
}

var Dialog = function(params) {
  // We need, at least, one cancel option string
  if (!params || !params.options || !params.options.cancel) {
    return;
  }
  var handlers = new WeakMap();
   // Create the structure
  this.form = document.createElement('form');
  this.form.dataset.type = 'confirm';
  this.form.setAttribute('role', 'dialog');
  this.form.tabIndex = -1;
  // Pick up option_menu.css styling
  this.form.dataset.subtype = 'menu';

  if (params.classes) {
    this.form.classList.add(...params.classes);
  }

  var infoSection = document.createElement('section');
  infoSection.appendChild(createLocalizedElement('h1', params.title));
  infoSection.appendChild(createLocalizedElement('p', params.body));
  this.form.appendChild(infoSection);

  // Adding options. In this case we have a maximum of 2, with different styles
  // per button
  var menu = document.createElement('menu');
  // Default button (Cancel button). It's mandatory
  var cancelOption = params.options.cancel;
  var cancelButton = createLocalizedElement('button', cancelOption.text);
  handlers.set(cancelButton, cancelOption);

  // If we have only button, let's mark it as recommended action.
  if (!params.options.confirm) {
    cancelButton.className = 'recommend';
  }

  menu.appendChild(cancelButton);

  if (params.options.confirm) {
    var confirmOption = params.options.confirm;
    var confirmButton = createLocalizedElement('button', confirmOption.text);
    confirmButton.className = params.options.confirm.className || 'recommend';
    handlers.set(confirmButton, confirmOption);
    menu.appendChild(confirmButton);
  }

  this.form.addEventListener('submit', function(event) {
    event.preventDefault();
  });

  this.form.addEventListener('transitionend', function(event) {
    var form = event.target;
    if (!form.classList.contains('visible') && form.parentNode) {
      form.remove();
    } else {
      // Focus form for accessibility
      form.focus();
    }

    document.body.classList.remove('dialog-animating');
  });

  menu.addEventListener('click', function(event) {
    var action = handlers.get(event.target);
    if (!action) {
      return;
    }

    if (action.method) {
      // Delegate operation to target method. This allows
      // for a custom "Cancel" to be provided by calling program
      action.method.apply(null, action.params || []);
    }

    // Hide action menu when click is received
    this.hide();
  }.bind(this));
  // Appending the action menu to the form
  this.form.appendChild(menu);
};

// We prototype functions to show/hide the UI of action-menu
Dialog.prototype.show = function() {
  // Remove the focus to hide the keyboard asap
  document.activeElement && document.activeElement.blur();

  if (!this.form.parentNode) {
    document.body.appendChild(this.form);

    // Flush style on form so that the show transition plays once we add
    // the visible class.
    this.form.clientTop;
  }
  this.form.classList.add('visible');
  document.body.classList.add('dialog-animating');
};

Dialog.prototype.hide = function() {
  this.form.classList.remove('visible');
};

exports.Dialog = Dialog;

// end global closure
}(this));

