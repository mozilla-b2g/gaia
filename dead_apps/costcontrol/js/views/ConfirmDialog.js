'use strict';

/* global Common */

function ConfirmDialog(container, viewManager) {
  this.id = container.id;
  this.container = container;
  this.viewManager = viewManager;
  this.message = container.querySelector('p');

  this.okButton = container.querySelector('.danger');

  this.cancelButton = container.querySelector('.close-reset-dialog');
  this.cancelButton.onclick = this.closeConfirmDialog.bind(this);
}

ConfirmDialog.prototype.setMessage = function(l10nId, data) {
  Common.localize(this.message, l10nId, data || {});
};

ConfirmDialog.prototype.updateAcceptAction = function(acceptAction) {
  this.okButton.onclick = acceptAction;
};

ConfirmDialog.prototype.showConfirmDialog = function() {
  this.viewManager.changeViewTo(this.id, '#settings-view');
};

ConfirmDialog.prototype.closeConfirmDialog = function() {
  this.viewManager.closeCurrentView();
};
