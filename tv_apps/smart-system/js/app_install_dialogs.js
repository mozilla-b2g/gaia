/* global SmartModalDialog, Promise, focusManager */
(function(exports) {
  'use strict';

  function AppInstallDialogs(containerElement) {
    this.containerElement = containerElement;
  }

  var TYPES = Object.freeze({
    'InstallDialog': 'install',
    'InstallCancelDialog': 'installcancel',
    'UninstallDialog': 'uninstall',
    'DownloadCancelDialog': 'downloadcancel',
    'SetupAppDialog': 'setupapp'
  });

  AppInstallDialogs.TYPES = TYPES;

  var proto = AppInstallDialogs.prototype;

  proto.start = function aid_start() {
    this.containerElement.addEventListener('modal-dialog-closed', this);
    this.containerElement.addEventListener('modal-dialog-will-open', this);
    this._visibleDialogs = [];
    this._dialogs = [];
  };

  proto.stop = function aid_stop() {
    this.containerElement.removeEventListener('modal-dialog-closed', this);
    this.containerElement.removeEventListener('modal-dialog-will-open', this);
    this._visibleDialogs = [];
    this.dialogs.forEach(function(dialog) {
      if (dialog.isOpened) {
        dialog.close();
      }
    });
    this._dialogs = [];

    this._installDialog = null;
    this._installCancelDialog = null;
    this._uninstallDialog = null;
    this._setupAppDialog = null;

    this.containerElement.innerHTML = '';
  };

  // install dialog
  proto._renderInstallDialog = function aid__renderInstallDialog() {
    if (this._installDialog) {
      return;
    }
    this._installDialog = new SmartModalDialog(this.containerElement);
    this._installDialog.element.classList.add('app-install-dialog');
    this._dialogs.push(this._installDialog);
  };

  proto._showInstallDialog = function aid__showInstallDialog(options) {
    return new Promise(function(resolve, reject) {
      this._renderInstallDialog();
      this._installDialog.open({
        'onCancel': reject,
        'message': {
          'textL10nId': {
            'id': 'install-app',
            'args': {'name': options.manifest.name }
          }
        },
        'buttonSettings': [
          {
            'textL10nId': 'cancel',
            'onClick': reject
          }, {
            'textL10nId': 'install',
            'onClick': resolve,
            'defaultFocus': true,
            'class': 'primary'
          }
        ]
      });

    }.bind(this));
  };
  // end of install dialog

  // install cancel dialog
  proto._renderInstallCancelDialog = function aid__renderInstallDialog() {
    if (this._installCancelDialog) {
      return;
    }
    this._installCancelDialog = new SmartModalDialog(this.containerElement);
    this._installCancelDialog.element.classList.add(
      'app-install-cancel-dialog');
    this._dialogs.push(this._installCancelDialog);
  };

  proto._showInstallCancelDialog = function aid__showInstallDialog(options) {
    return new Promise(function(resolve, reject) {
      this._renderInstallCancelDialog();
      var message = document.createElement('div');
      var lines = [ document.createElement('h1'),
                    document.createElement('h1'),
                    document.createElement('h1') ];
      lines[0].setAttribute('data-l10n-id', 'cancelling-will-not-refund');
      lines[1].setAttribute('data-l10n-id', 'apps-can-be-installed-later');
      lines[2].setAttribute('data-l10n-id', 'are-you-sure-you-want-to-cancel');
      lines.forEach(message.appendChild.bind(message));

      this._installCancelDialog.open({
        'onCancel': reject,
        'customElementSettings': {
          'element': message
        },
        'buttonSettings': [
          {
            'textL10nId': 'cancel-install-button',
            'onClick': resolve,
            'defaultFocus': true
          }, {
            'textL10nId': 'resume',
            'onClick': reject
          }
        ]
      });
    }.bind(this));
  };
  // end of install cancel dialog

  // uninstall dialog
  proto._renderUninstallDialog = function aid__renderUninstallDialog() {
    if (this._uninstallDialog) {
      return;
    }
    this._uninstallDialog = new SmartModalDialog(this.containerElement);
    this._uninstallDialog.element.classList.add('app-uninstall-dialog');
    this._dialogs.push(this._uninstallDialog);
  };

  proto._showUninstallDialog = function aid__showUninstallDialog(options) {
    return new Promise(function(resolve, reject) {
      this._renderUninstallDialog();
      var message = options.unrecoverable ? 'unrecoverable-error-body' : {
          'id': 'delete-body',
          'args': {'name': options.manifest.name }
        };

      var buttons = options.unrecoverable ? [{
            'textL10nId': 'delete',
            'onClick': resolve,
            'class': 'danger'
          }] : [
          {
            'textL10nId': 'cancel',
            'onClick': reject,
            'defaultFocus': true
          }, {
            'textL10nId': 'delete',
            'onClick': resolve,
            'class': 'danger'
          }
        ];
      if (options.unrecoverable) {
        this._uninstallDialog.element.classList.add('unrecoverable');
      } else {
        this._uninstallDialog.element.classList.remove('unrecoverable');
      }

      this._uninstallDialog.open({
        'onCancel': reject,
        'message': {
          'textL10nId': message
        },
        'buttonSettings': buttons
      });
    }.bind(this));
  };
  // end of uninstall dialog

  // setup installed app dialog
  proto._renderSetupAppDialog = function aid__renderUninstallDialog() {
    if (this._setupAppDialog) {
      return;
    }
    this._setupAppDialog = new SmartModalDialog(this.containerElement);
    this._setupAppDialog.element.classList.add('setup-app-dialog');
    this._dialogs.push(this._setupAppDialog);
  };

  proto._showSetupAppDialog = function aid__showUninstallDialog(options) {
    return new Promise(function(resolve, reject) {
      this._renderSetupAppDialog();

      var message = document.createElement('div');
      var lines = [ document.createElement('h1'),
                    document.createElement('p')];
      navigator.mozL10n.setAttributes(lines[0], 'app-install-success',
                                      { 'appName': options.manifest.name });
      lines[1].textContent = options.manifest.description;
      lines.forEach(message.appendChild.bind(message));
      this._setupAppDialog.open({
        'onCancel': reject,
        'customElementSettings': {
          'element': message
        },
        'buttonSettings': [
          {
            'textL10nId': 'later',
            'onClick': reject,
            'defaultFocus': true
          }, {
            'textL10nId': 'setup',
            'onClick': resolve,
            'class': 'primary'
          }
        ]
      });
    }.bind(this));
  };
  // end of uninstall dialog

  proto.show = function aid_show(type, options) {
    switch(type) {
      case TYPES.InstallDialog:
        return this._showInstallDialog(options);
      case TYPES.InstallCancelDialog:
        return this._showInstallCancelDialog(options);
      case TYPES.UninstallDialog:
        return this._showUninstallDialog(options);
      case TYPES.DownloadCancelDialog:
        // do nothing because we don't have such UI to trigger it.
        return Promise.resolve();
      case TYPES.SetupAppDialog:
        return this._showSetupAppDialog(options);
      default:
        return Promise.reject();
    }
  };

  proto.handleEvent = function aid_handleEvent(evt) {
    switch(evt.type) {
      case 'modal-dialog-will-open':
        this._visibleDialogs.push(evt.detail);
        focusManager.focus();
        break;
      case 'modal-dialog-closed':
        var idx = this._visibleDialogs.indexOf(evt.detail);
        if (idx > -1) {
          this._visibleDialogs.splice(idx, 1);
        }
        focusManager.focus();
        break;
    }
  };

  proto.focus = function aid_focus() {
    var topMost = this.getTopMostDialogElement();
    if (topMost) {
      document.activeElement.blur();
      topMost.focus();
    }
  };

  proto.getTopMostDialogElement = function aid_getTopMostDialogElement() {
    return (this._visibleDialogs.length > 0) ?
      this._visibleDialogs[this._visibleDialogs.length - 1].element : null;
  };

  proto.hasVisibleDialog = function aid_hasVisibleDialog() {
    return this._visibleDialogs.length > 0;
  };

  proto.hideAll = function aid_hideAll() {
    this._visibleDialogs.forEach(function(dialog) {
      dialog.close();
    });
  };

  exports.AppInstallDialogs = AppInstallDialogs;

})(window);
