(function(exports) {
'use strict';

/*
 Generic confirm screen. Only 'cancel/default' is mandatory.  For having l10n
 you should define the key value and you have to set l10n to 'true'. Options
 should follow the following structure:

 {
  title: {
    value: 'foo Title',
    l10n: false
  },
  body: {
    value: 'foo Body',
    l10n: false
  },
  options: {
    // Cancel is a mandatory option. You need to define at least the text
    cancel: {
      text: {
        value: 'cancel',
        l10n: true
      }
    },
    // Confirm is an optional one. As in cancel, you could add as well a method
    // with params
    confirm: {
      text: {
        value: 'remove',
        l10n: true
      },
      method: function(params) {
        fooFunction(params);
      },
      params: [arg1, arg2,....]
    }
  }
*/

// helper to localize an element given parameters
function createLocalizedElement(tagName, param) {
  var element = document.createElement(tagName);

  // if we passed in a HTML Fragment, it is already localized
  if (param.value.nodeType) {
    element.appendChild(param.value);

  // otherwise if l10n is not false, we use the l10n localize method
  } else if (param.l10n !== false) {
    navigator.mozL10n.localize(element, param.value);

  // otherwise - stuff text in here...
  } else {
    element.textContent = param.value;
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

  // We fill the main info

  // take into account localization as well
  var titleDOM = createLocalizedElement('strong', params.title);
  var bodyDOM = createLocalizedElement('small', params.body);

  // Adding this elements to the DOM
  var infoSection = document.createElement('section');
  // We create the info container
  var infoContainer = document.createElement('p');
  infoContainer.appendChild(titleDOM);
  infoContainer.appendChild(bodyDOM);
  // We append to the section
  infoSection.appendChild(infoContainer);
  // At the end we have to append to the form
  this.form.appendChild(infoSection);

  // Adding options. In this case we have a maximum of 2, with different styles
  // per button
  var menu = document.createElement('menu');
  // Default button (Cancel button). It's mandatory
  var cancelOption = params.options.cancel;
  var cancelButton = createLocalizedElement('button', cancelOption.text);
  handlers.set(cancelButton, cancelOption);

  if (params.options.confirm) {
    var confirmOption = params.options.confirm;
    var confirmButton = createLocalizedElement('button', confirmOption.text);
    cancelButton.className = 'recommend';
    handlers.set(confirmButton, confirmOption);
    menu.appendChild(confirmButton);
  } else {
    // If there is only one item, we take the 100% of the space available
    cancelButton.style.width = '100%';
  }
  menu.appendChild(cancelButton);
  this.form.addEventListener('submit', function(event) {
    event.preventDefault();
  });

  menu.addEventListener('click', function(event) {
    var action = handlers.get(event.target);

    if (!action) {
      return;
    }

    var method = (action && action.method) || function() {};

    // Delegate operation to target method. This allows
    // for a custom "Cancel" to be provided by calling program
    method.apply(null, action.params || []);

    // Hide action menu when click is received
    this.hide();

  }.bind(this));
  // Appending the action menu to the form
  this.form.appendChild(menu);
};

// We prototype functions to show/hide the UI of action-menu
Dialog.prototype.show = function() {
  document.body.appendChild(this.form);
  this.form.focus();
};

Dialog.prototype.hide = function() {
  document.body.removeChild(this.form);
};

exports.Dialog = Dialog;

// end global closure
}(this));

