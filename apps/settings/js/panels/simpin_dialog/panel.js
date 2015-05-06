define(function() {
  'use strict';

  var DialogPanel = require('modules/dialog_panel');
  var SimPinDialog = require('panels/simpin_dialog/simpin_dialog');

  return function ctor_simpin_dialog() {
    var elements = {};
    return DialogPanel({
      onInit: function(panel) {
        this._method = '';
        this._simpinDialog = null;
        elements.panel = panel;
        elements.dialogTitle = panel.querySelector('gaia-header h1');
        elements.dialogDone = panel.querySelector('button[type="submit"]');
        elements.triesLeftMsg = panel.querySelector('.sim-triesLeft');
        elements.errorMsg = panel.querySelector('.sim-errorMsg');
        elements.errorMsgHeader = panel.querySelector('.sim-messageHeader');
        elements.errorMsgBody = panel.querySelector('.sim-messageBody');
        elements.pinArea = panel.querySelector('.sim-pinArea');
        elements.pinInput = elements.pinArea.querySelector('input');
        elements.pukArea = panel.querySelector('.sim-pukArea');
        elements.pukInput = elements.pukArea.querySelector('input');
        elements.newPinArea = panel.querySelector('.sim-newPinArea');
        elements.newPinInput = elements.newPinArea.querySelector('input');
        elements.confirmPinArea = panel.querySelector('.sim-confirmPinArea');
        elements.confirmPinInput =
          elements.confirmPinArea.querySelector('input');
      },
      onBeforeShow: function(panel, options) {
        options.cardIndex = options.cardIndex || 0;
        options.pinOptions = options.pinOptions || {};

        this._method = options.method;
        this._simpinDialog = SimPinDialog(elements);
        this._simpinDialog.init(options);
      },
      onShow: function() {
        if (this._method === 'unlock_puk' || this._method === 'unlock_puk2') {
          elements.pukInput.focus();
        } else {
          elements.pinInput.focus();
        } 
      },
      onSubmit: function() {
        return this._simpinDialog.verify();
      },
      onHide: function() {
        this._simpinDialog.clear();
      }
    });
  };
});
