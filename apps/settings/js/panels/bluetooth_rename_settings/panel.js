define(function(require) {
  'use strict';

  var BtContext = require('modules/bluetooth/bluetooth_context');
  var DialogPanel = require('modules/dialog_panel');

  const MAX_DEVICE_NAME_LENGTH = 20;

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btrs_debug(msg) {
      console.log('--> [Bluetooth][RenameSettings][Panel]: ' + msg);
    };
  }

  return function ctor_bluetooth_rename_settings() {
    return DialogPanel({
      onInit: function(panel) {
        this._elements = {
          submitButton: panel.querySelector('button[type=submit]'),
          nameInput: panel.querySelector('.new-device-name'),
          overlengthErrorMsg:
            panel.querySelector('.bluetooth-rename-overlength-error-msg')
        };
        this._boundOnNameInput = this._onNameInput.bind(this);
      },
      onBeforeShow: function() {
        this._elements.nameInput.value = BtContext.name;
        this._elements.nameInput.oninput = this._boundOnNameInput;
      },
      onShow: function() {
        // For better UX
        var cursorPos = this._elements.nameInput.value.length;
        this._elements.nameInput.focus();
        this._elements.nameInput.setSelectionRange(0, cursorPos);
      },
      onBeforeHide: function() {
        this._elements.nameInput.onchange = null;
      },
      onSubmit: function() {
        var nameEntered = this._elements.nameInput.value;
        // Only set non-empty string to be new name. 
        // Otherwise, set name by product model.
        if (nameEntered !== '') {
          Debug('onSubmit(): set new name = ' + nameEntered);
          BtContext.setName(nameEntered).then(() => {
            Debug('onSubmit(): setName = ' + nameEntered + ' successfully');
          }, (reason) => {
            Debug('onSubmit(): setName = ' + nameEntered + ' failed, ' +
                  'reason = ' + reason);
          });
        } else {
          Debug('onSubmit(): set name by product model');
          BtContext.setNameByProductModel();
        }
      },
      _onNameInput: function() {
        var isNameEnteredOverlength =
          this._isNameEnteredOverlength(this._elements.nameInput.value);
        Debug('_isNameEnteredOverlength return = ' + isNameEnteredOverlength);
        this._elements.submitButton.disabled = isNameEnteredOverlength;
        this._elements.overlengthErrorMsg.hidden = !isNameEnteredOverlength;
      },
      _isNameEnteredOverlength: function(nameEntered) {
        Debug('_isNameEnteredOverlength(): nameEntered = ' + nameEntered);
        // Before set the entered name to platform, we check length of name is 
        // over threshold or not.
        nameEntered = nameEntered.replace(/^\s+|\s+$/g, '');
        return (nameEntered.length > MAX_DEVICE_NAME_LENGTH);
      }
    });
  };
});
