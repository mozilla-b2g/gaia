/* global Awesomescreen */
/* global Browser */
/* global BrowserDB */
/* global FxosTvModalDialog */
/* global Settings */

/* exported BrowserDialog */

'use strict';

/**
 * The dialogs that are specific to the browser app.
 *
 * @namespace Dialog
 */
var BrowserDialog = {

  modalDialog: null,

  /** Get all elements when inited. */
  getAllElements: function dialog_getAllElements() {
    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'browser-dialog-base'
    ];

    // Loop and add element with camel style name to Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  /** Initialization. Get DOM elements and add listeners. */
  init: function dialog_init() {
    // Get all elements initially.
    this.getAllElements();

    this.modalDialog = new FxosTvModalDialog(this.browserDialogBase);
  },

  openDialog: function dialog_openDialog(options) {
    var span;
    if (options.messageL10nId) {
      span = document.createElement('SPAN');
      span.classList.add('browser-dialog-message');
      span.setAttribute('data-l10n-id', options.messageL10nId);
    }

    var dialogOptions = {
      message: {
        textL10nId: options.titleL10nId
      },
      customElementSettings: span ? { element: span } : null,
      buttonSettings: [{
        textL10nId: options.buttonL10nId ? options.buttonL10nId : 'WB_LT_CLEAR',
        class: options.buttonClass ? options.buttonClass : 'primary',
        onClick: () => {
          options.onConfirm();
          this.cancelDialog();
        }
      }, {
        textL10nId: 'LT_CANCEL',
        defaultFocus: true,
        onClick: () => {
          if (options.onCancel) {
            options.onCancel();
          }
          this.cancelDialog();
        }
      }],
      onCancel: () => {
        if (options.onCancel) {
          options.onCancel();
        }
        this.cancelDialog();
      }
    };

    this.modalDialog.open(dialogOptions);
  },

  /**
   * create Dialog
   */
  createDialog: function dialog_createDialog(type) {
    this.browserDialogBase.classList.remove('hide');
    Browser.switchCursorMode(false);

    var promise;
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    promise = deferred.promise;

    switch(type) {
      case 'del_cookie':
        this.openDialog({
          titleL10nId: 'WB_LT_CONFIRM_DELETE_COOKIES',
          buttonClass: 'danger',
          onConfirm: this.clearCookies.bind(this)
        });
        break;

      case 'clear_history':
        this.openDialog({
          titleL10nId: 'WB_LT_CLEAR_ALL_HISTORY',
          buttonClass: 'danger',
          onConfirm: this.clearHistory.bind(this)
        });
        break;

      case 'signout_confirm':
        this.openDialog({
          titleL10nId: 'fxsync-confirm-sign-out-title',
          messageL10nId: 'fxsync-confirm-sign-out-detail',
          buttonL10nId: 'fxsync-sign-out',
          buttonClass: 'danger',
          onConfirm: deferred.resolve,
          onCancel: deferred.reject
        });
        break;

      default:
        break;
    }

    return promise;
  },

  isDisplayed: function dialog_isDisplayed() {
    return this.modalDialog.isOpened;
  },

  // XXX: Move this function to Settings
  clearCookies: function dialog_clearCookies() {
    var request = navigator.mozApps.getSelf();
    request.onsuccess = function() {
      var rtn = request.result.clearBrowserData();
      rtn.onsuccess = function() {
        console.log('success');
      };
      rtn.onerror = function() {
        Settings.clearCookieFailed();
      };
    };
    request.onerror = function() {
      Settings.clearCookieFailed();
    };
  },

  // XXX: Move this function to Settings
  clearHistory: function dialog_clearHistory() {
    BrowserDB.clearHistory();
    Awesomescreen.selectTopSites();
  },

  /**
   * cancel confirm dialog
   */
  cancelDialog: function dialog_cancelDialog() {
    if (this.modalDialog.isOpened) {
      this.modalDialog.close();
    }

    BrowserDialog.browserDialogBase.classList.add('hide');
    Browser.switchCursorMode(true);
  }
};
