'use strict';

/* global Common, Settings, Formatting */

function ResetMenuDialog(container, viewManager) {
  this.id = container.id;
  this.container = container;
  this.viewManager = viewManager;
  this.dataUsage = {mobile:0, wifi:0};
  this.resetModes = ['wifi', 'mobile', 'all'];
  container.addEventListener('gaiamenu-cancel',
    this.closeResetMenuDialog.bind(this));
}

ResetMenuDialog.prototype.initializeResetModes = function(confirmResetDialog) {
  this.resetModes.forEach(function(resetMode) {
    var newButton = document.createElement('button');
    newButton.id = 'reset-' + resetMode + '-data-usage';
    newButton.type = 'button';
    newButton.classList.add('reset-data-button');
    newButton.dataset.l10nId = 'reset-' + resetMode;
    newButton.onclick = function() {
      this.updateConfirmDialog(resetMode, confirmResetDialog);
    }.bind(this);
    this.container.appendChild(newButton);
  }.bind(this));
};

ResetMenuDialog.prototype.updateConfirmDialog = function(type, confirmDialog) {
  var mobileUsage =
    Formatting.formatData(Formatting.roundData(this.dataUsage.mobile));
  var wifiUsage =
    Formatting.formatData(Formatting.roundData(this.dataUsage.wifi));
  var data = {
    mobileData: mobileUsage,
    wifiData: wifiUsage
  };
  var l10nId = 'reset-' + type + '-confirmation-warning';
  confirmDialog.setMessage(l10nId, data);
  function resetAction() {
    // Reset data type, take in count spent offsets to fix the charts
    Common.resetData(type);
    Settings.updateUI();
    confirmDialog.closeConfirmDialog();
  }
  confirmDialog.updateAcceptAction(resetAction);
  confirmDialog.showConfirmDialog();
};

ResetMenuDialog.prototype.showResetMenuDialog = function(dataUsage) {
  this.dataUsage = dataUsage;
  this.viewManager.changeViewTo(this.id, '#settings-view');
};

ResetMenuDialog.prototype.closeResetMenuDialog = function() {
  this.viewManager.closeCurrentView();
};
