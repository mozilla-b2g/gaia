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


var Dialog = function(params) {
  // We need, at least, one cancel option string
  if (!params || !params.options || !params.options.cancel) {
    return;
  }
  var _ = navigator.mozL10n.get;
  var handlers = new WeakMap();
   // Create the structure
  this.form = document.createElement('form');
  this.form.dataset.type = 'confirm';
  this.form.setAttribute('role', 'dialog');

  // We fill the main info

  // The title should take into account localization as well
  var titleDOM = document.createElement('strong');
  var title = (!params.title.l10n) ? params.title.value : _(params.title.value);
  titleDOM.textContent = title;
  if (params.title.l10n) {
    titleDOM.dataset.l10nId = params.title.value;
  }
  // We make the same for the body
  var bodyDOM = document.createElement('small');
  var body = (!params.body.l10n) ? params.body.value : _(params.body.value);
  bodyDOM.textContent = body;
  if (params.body.l10n) {
    bodyDOM.dataset.l10nId = params.body.value;
  }

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
  var cancelButton = document.createElement('button');
  var cancelOption = params.options.cancel;
  var cancel = !cancelOption.text.l10n ?
      cancelOption.text.value : _(cancelOption.text.value);
  cancelButton.textContent = cancel;
  if (cancelOption.text.l10n) {
    cancelButton.dataset.l10nId = cancelOption.text.value;
  }
  handlers.set(cancelButton, cancelOption);

  if (params.options.confirm) {
    var confirmOption = params.options.confirm;
    var confirmButton = document.createElement('button');
    var confirm = !confirmOption.text.l10n ?
        confirmOption.text.value : _(confirmOption.text.value);
    confirmButton.textContent = confirm;
    cancelButton.className = 'recommend';
    if (confirmOption.text.l10n) {
      confirmButton.dataset.l10nId = confirmOption.text.value;
    }
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
};

Dialog.prototype.hide = function() {
  document.body.removeChild(this.form);
};
