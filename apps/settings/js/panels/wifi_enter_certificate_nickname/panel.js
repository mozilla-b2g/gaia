define(function(require) {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');

  return function ctor_wifiEnterCertificateNickname() {
    var elements = {};

    return DialogPanel({
      onInit: function(panel) {
        elements.panel = panel;
        elements.nicknameInput =
          panel.querySelector('.certificate-file-nickname');
        elements.submitButton = panel.querySelector('button[type=submit]');

        elements.nicknameInput.oninput = this._onInputChange;
      },
      onBeforeShow: function(panel, options) {
        elements.nicknameInput.value = options.certificateName;
      },
      onSubmit: function() {
        return Promise.resolve({
          nickname: elements.nicknameInput.value
        });
      },
      _onInputChange: function() {
        elements.submitButton.disabled = !this.value.length;
      }
    });
  };
});
