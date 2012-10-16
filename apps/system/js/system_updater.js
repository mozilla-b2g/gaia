/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var SystemUpdater = {
  get updateStatus() {
    delete this.updateStatus;
    return this.updateStatus = document.getElementById('system-update-status');
  },

  init: function su_init() {
    window.addEventListener('mozChromeEvent', this);
    SettingsListener.observe('gaia.system.checkForUpdates', false,
                             this.checkForUpdates.bind(this));
  },

  checkForUpdates: function su_checkForUpdates(shouldCheck) {
    if (!shouldCheck) {
      return;
    }

    this._dispatchEvent('force-update-check');
  },

  showDownloadPrompt: function su_showDownloadPrompt() {
    var _ = navigator.mozL10n.get;

    var cancel = {
      title: _('later'),
      callback: this.declineDownload.bind(this)
    };

    var confirm = {
      title: _('download'),
      callback: this.acceptDownload.bind(this)
    };

    CustomDialog.show(_('updateAvailable'), _('wantToDownload'),
                      cancel, confirm);
  },

  declineDownload: function su_declineDownload() {
    CustomDialog.hide();
    this._dispatchEvent('update-available-result', 'wait');
  },

  acceptDownload: function su_acceptDownload() {
    CustomDialog.hide();
    this._dispatchEvent('update-available-result', 'download');

    this.showStatus();
    UtilityTray.show();
  },

  showStatus: function su_showStatus() {
    this.updateStatus.classList.add('displayed');
  },

  updateProgress: function su_updateProgress(value) {
    var _ = navigator.mozL10n.get;

    var progressEl = this.updateStatus.querySelector('progress');
    progressEl.value = value;

    if (value === 1) {
      this.updateStatus.classList.add('applying');
    }
  },

  hideStatus: function su_hideStatus() {
    this.updateStatus.classList.remove('displayed');
    this.updateStatus.classList.remove('applying');

    var progressEl = this.updateStatus.querySelector('progress');
    progressEl.value = 0;
  },

  showApplyPrompt: function su_showApplyPrompt() {
    var _ = navigator.mozL10n.get;

    var cancel = {
      title: _('later'),
      callback: this.declineInstall.bind(this)
    };

    var confirm = {
      title: _('installNow'),
      callback: this.acceptInstall.bind(this)
    };

    UtilityTray.hide();
    CustomDialog.show(_('updateReady'), _('wantToInstall'),
                      cancel, confirm);
  },

  declineInstall: function su_declineInstall() {
    CustomDialog.hide();
    this._dispatchEvent('update-prompt-apply-result', 'wait');
  },

  acceptInstall: function su_acceptInstall() {
    CustomDialog.hide();
    this._dispatchEvent('update-prompt-apply-result', 'restart');
  },

  handleEvent: function su_handleEvent(evt) {
    if (evt.type !== 'mozChromeEvent')
      return;

    var _ = navigator.mozL10n.get;

    var detail = evt.detail;
    if (!detail.type)
      return;

    switch (detail.type) {
      case 'update-available':
        NotificationHelper.send(_('updateAvailable'), _('getIt'),
                                'style/system_updater/images/download.png',
                                this.showDownloadPrompt.bind(this),
                                this.declineDownload.bind(this));
        break;
      case 'update-downloaded':
        this.hideStatus();
        NotificationHelper.send(_('updateApplyTitle'), _('updateApplyBody'),
                                'style/system_updater/images/download.png',
                                this.showApplyPrompt.bind(this));
        break;
      case 'update-prompt-apply':
        this.showApplyPrompt();
        break;
      case 'update-progress':
        var progress = detail.progress / detail.total;
        this.updateProgress(progress);
        break;
    }
  },

  _dispatchEvent: function su_dispatchEvent(type, result) {
    var event = document.createEvent('CustomEvent');
    var data = { type: type };
    if (result) {
      data.result = result;
    }

    event.initCustomEvent('mozContentEvent', true, true, data);
    window.dispatchEvent(event);
  }
};

SystemUpdater.init();
