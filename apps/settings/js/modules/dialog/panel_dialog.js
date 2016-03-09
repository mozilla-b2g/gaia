/* global SpatialNavigationHelper */
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
    var dialog = new PanelDialog(panelDOM, options);
    const SN_ROOT = 'body.spatial-navigation .current.' + dialog.DIALOG_CLASS;
    // Support keyboard navigation in PanelDialog
    SpatialNavigationHelper.add({
      id: 'panel-dialog',
      selector: SN_ROOT + ' .focusable,' +
                SN_ROOT + ' .action-button,' +
                SN_ROOT + ' gaia-header button,' +
                SN_ROOT + ' li a.menu-item,' +
                SN_ROOT + ' li .button,' +
                SN_ROOT + ' li button,' +
                SN_ROOT + ' li input,' +
                SN_ROOT + ' li gaia-radio,' +
                SN_ROOT + ' li gaia-checkbox,' +
                SN_ROOT + ' li gaia-switch',
      restrict: 'self-only',
      enterTo: 'last-focused'
    });
    dialog.spatialNavigationId = dialog.DIALOG_CLASS;
    return dialog;
  };
});
