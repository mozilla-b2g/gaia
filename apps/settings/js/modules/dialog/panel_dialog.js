define(function(require) {
  'use strict';

  var BaseDialog = require('modules/dialog/base_dialog');

  var PanelDialog = function(panelDOM, options) {
    BaseDialog.call(this, panelDOM, options);
  };

  PanelDialog.prototype = Object.create(BaseDialog.prototype);
  PanelDialog.prototype.constructor = PanelDialog;
  PanelDialog.prototype.DIALOG_CLASS = 'panel-dialog';
  PanelDialog.prototype.TRANSITION_CLASS = 'fade';

  return function ctor_PanelDialog(panelDOM, options) {
    return new PanelDialog(panelDOM, options);
  };
});
