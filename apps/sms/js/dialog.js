/*global Settings */

(function(exports) {
'use strict';

/*
 Generic confirm screen. Only 'cancel/default' is mandatory.

 Text field are localized when their `l10nId' parameter is set -- in which case,
 the optional `l10nArgs' parameter is applied. Without `l10nId', the `value'
 parameter will be used: it can be either an HTML node or plain text.

 Options should follow the following structure:

 {
  title: {
    value: 'foo Title'
  },
  body: {
    l10nId: 'showMessageCount',
    l10nArgs: { n: count }
  },
  options: {
    // Cancel is a mandatory option. You need to define at least the text.
    cancel: {
      text: {
        l10nId: 'cancel'
      }
    },
    // Confirm is an optional one. As in cancel, you could add as well a method
    // with params.
    confirm: {
      text: {
        l10nId: 'remove'
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

  // if we passed an l10nId, use the l10n `localize' method
  if (param.l10nId) {
    navigator.mozL10n.localize(element, param.l10nId, param.l10nArgs);

  // if we passed in a HTML Fragment, it is already localized
  } else if (param.value.nodeType) {
    element.appendChild(param.value);

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
    confirmButton.className = 'recommend';
    handlers.set(confirmButton, confirmOption);

    menu.appendChild(cancelButton);
    if (confirmOption.position === 'left') {
      menu.insertBefore(confirmButton, cancelButton);
    } else {
      menu.appendChild(confirmButton);
    }
  } else {
    // If there is only one item, we take the 100% of the space available
    cancelButton.style.width = '100%';
    menu.appendChild(cancelButton);
  }

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

/*
 Error confirm screen. Handling all the message error code and corresponding
 discription/behavior.

 Options should follow the following structure:
 {
   recipients: ['foo', 'bar'], // For showing the recipient information
   messageId : 123             // For message retrieval
 }
*/

// Define each error type with specific prefix for showing error dialog
var ERRORS = {
  NoSimCardError: {
    prefix: 'sendMissingSimCard',
    showRecipient: false,
    showDsdsStatus: false,
    hasHandler: false
  },
  RadioDisabledError: {
    prefix: 'sendFlightMode',
    showRecipient: false,
    showDsdsStatus: false,
    hasHandler: false
  },
  FdnCheckError: {
    prefix: 'fdnBlocked',
    showRecipient: true,
    showDsdsStatus: false,
    hasHandler: false
  },
  NonActiveSimCardError: {
    prefix: 'nonActiveSim',
    showRecipient: false,
    showDsdsStatus: true,
    hasHandler: true
  },
  NoSignalError: {
    prefix: 'sendNoSignalError',
    showRecipient: false,
    showDsdsStatus: false,
    hasHandler: false
  },
  NotFoundError: {
    prefix: 'sendNotFoundError',
    showRecipient: false,
    showDsdsStatus: false,
    hasHandler: false
  },
  InvalidAddressError: {
    prefix: 'sendInvalidAddressError',
    showRecipient: false,
    showDsdsStatus: false,
    hasHandler: false
  }
  // The error type below will be represented as "GeneralError" in dialog:
  // 'UnknownError'
  // 'InternalError'
};

function errorParamsGenerator(actions, opts) {
  var prefix = actions.prefix;
  var messageTitle = prefix + 'Title';
  var messageBody = prefix + 'Body';
  var messageBodyParams = {};
  var buttonLabel = prefix + 'BtnOk';
  var options = {
    cancel: {
      text: {
        l10nId: buttonLabel
      }
    }
  };

  if (actions.showRecipient) {
    messageBodyParams = {
      n: opts.recipients.length,
      numbers: opts.recipients.join('<br />')
    };
  }
  if (actions.showDsdsStatus) {
    var mmsServiceId = Settings.mmsServiceId;
    if (mmsServiceId !== null) {
      // mmsServiceId = 0 => default Service is SIM 1
      // mmsServiceId = 1 => default Service is SIM 2

      switch (mmsServiceId) {
        case 0:
          messageBodyParams = {
            active: 'SIM 1',
            nonactive: 'SIM 2'
          };
          break;
        case 1:
          messageBodyParams = {
            active: 'SIM 2',
            nonactive: 'SIM 1'
          };
          break;
        default:
          console.error('MMS ServiceId(' + mmsServiceId + ') is not matched!');
      }
    } else {
      console.error('Settings unavailable');
    }
  }

  if (opts && opts.confirmHandler && actions.hasHandler) {
    options.confirm = {
      text: {
        l10nId: prefix + 'Confirm'
      },
      method: opts.confirmHandler
    };
  }

  return {
    title: {
      l10nId: messageTitle
    },
    body: {
      l10nId: messageBody,
      l10nArgs: messageBodyParams
    },
    options: options
  };
}

function ErrorDialog(errorName, opts) {
  var actions = ERRORS[errorName] || {
    prefix: 'sendGeneralError',
    showRecipient: false,
    showDsdsStatus: false,
    hasHandler: false
  };
  Dialog.call(this, errorParamsGenerator(actions, opts));
}

ErrorDialog.prototype = Object.create(Dialog.prototype);

exports.ErrorDialog = ErrorDialog;

// end global closure
}(this));

