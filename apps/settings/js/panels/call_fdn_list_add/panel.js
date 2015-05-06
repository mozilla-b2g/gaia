define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');

  return function ctor_call_fdn_list_add() {
    return DialogPanel({
      onInit: function(panel) {
        this._submitable = false;
        this._mode = 'add';

        this._elements = {};
        this._elements.fdnNameInput = panel.querySelector('.fdnContact-name');
        this._elements.fdnNumberInput =
          panel.querySelector('.fdnContact-number');
        this._elements.fdnContactTitle =
          panel.querySelector('.fdnContact-title');
        this._elements.submitButton = panel.querySelector('.fdnContact-submit');

        // We have to make sure submit Button is clickable
        this._elements.fdnNameInput.oninput =
          this._checkContactInputs.bind(this);
        this._elements.fdnNumberInput.oninput =
          this._checkContactInputs.bind(this);
      },
      onBeforeShow: function(panel, options) {
        this._mode = options.mode || 'add';
        this._elements.fdnNameInput.value = options.name || '';
        this._elements.fdnNumberInput.value = options.number || '';

        if (this._mode === 'add') {
          this._elements.fdnContactTitle.setAttribute('data-l10n-id',
            'fdnAction-add');
        } else {
          this._elements.fdnContactTitle.setAttribute('data-l10n-id',
            'fdnAction-edit-header');
        }

        // make sure when onShow, the state of submitButton is okay
        this._checkContactInputs();
      },
      onShow: function() {
        this._elements.fdnNameInput.focus();
      },
      onSubmit: function() {
        if (this._submitable) {
          return Promise.resolve({
            name: this._elements.fdnNameInput.value,
            number: this._elements.fdnNumberInput.value
          });
        } else {
          return Promise.reject();
        }
      },
      _checkContactInputs: function() {
        if (this._elements.fdnNameInput.value === '' ||
          this._elements.fdnNumberInput.value === '') {
            this._submitable = false;
        } else {
          this._submitable = true;
        }
        this._elements.submitButton.disabled = !this._submitable;
      }
    });
  };
});
