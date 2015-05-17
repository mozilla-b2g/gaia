define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');

  return function ctor_call_forwarding_details() {
    return DialogPanel({
      onInit: function(panel) {
        this._elements = {};
        this._elements.telInput = panel.querySelector('input[type="tel"]');
        this._elements.checkboxInput =
          panel.querySelector('input[type="checkbox"]');
      },
      onBeforeShow: function(panel, options) {
        this._elements.telInput.value = options.number || '';
        this._elements.checkboxInput.checked = !!options.enabled;
      },
      onShow: function() {
        this._elements.telInput.focus();
      },
      onSubmit: function() {
        return Promise.resolve({
          number: this._elements.telInput.value,
          enabled: this._elements.checkboxInput.checked
        });
      }
    });
  };
});
