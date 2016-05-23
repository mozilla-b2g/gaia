/* global Awesomescreen */
/* global Browser */
/* global BrowserDB */
/* global Settings */
/* global SharedUtils */

/* exported BrowserDialog */

'use strict';

/**
 * The dialogs that are specific to the browser app.
 *
 * @namespace Dialog
 */
var BrowserDialog = {

  modalDialog: null,
  inputDialog: null,

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

    this.modalDialog =
      SharedUtils.createSmartDialog('modal', this.browserDialogBase);
    this.modalDialog.element.addEventListener('closed',
      this.handleClosedEvent.bind(this));
    this.inputDialog =
      SharedUtils.createSmartDialog('input', this.browserDialogBase);
    this.inputDialog.element.addEventListener('closed',
      this.handleClosedEvent.bind(this));
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
        }
      }, {
        textL10nId: 'LT_CANCEL',
        defaultFocus: true,
        onClick: () => {
          if (options.onCancel) {
            options.onCancel();
          }
        }
      }],
      onCancel: () => {
        if (options.onCancel) {
          options.onCancel();
        }
      }
    };

    this.modalDialog.open(dialogOptions);
  },

  openHomepageDialog: function dialog_openHomepageDialog(options) {
    // XXX: Better integrate validity check in the fxos-tv-input-dialog
    function checkUrlInput () {
      var button = BrowserDialog.inputDialog.element.querySelector('.confirm');
      var inputGroup = BrowserDialog.inputDialog.element
                                    .querySelector('.modal-dialog-input-group');
      if (!homepageInput.validity.valid &&
          !inputGroup.classList.contains('invalid')) {
        button.classList.remove('primary');
        button.classList.add('disabled');
        inputGroup.classList.add('invalid');
      } else if (homepageInput.validity.valid &&
                 inputGroup.classList.contains('invalid')) {
        button.classList.remove('disabled');
        button.classList.add('primary');
        inputGroup.classList.remove('invalid');
      }
    }
    this.inputDialog.element.addEventListener('opened', checkUrlInput);

    var homepageInput = this.inputDialog.element.querySelector('input');
    homepageInput.setAttribute('type', 'url');
    homepageInput.required = true;
    homepageInput.addEventListener('input', checkUrlInput);
    homepageInput.addEventListener('blur', checkUrlInput);

    var button = document.createElement('BUTTON');
    button.classList.add('settings-dialog-homepage-default');
    button.setAttribute('data-l10n-id', 'WB_LT_RESTORE_TO_DEFAULT');
    button.addEventListener('click', () => {
      homepageInput.value = options.defaultValue;
      checkUrlInput();
    });
    // XXX: Customize input dialog layout for homepage dialog
    this.inputDialog.element.querySelector('.modal-dialog-message-container')
        .style.marginBottom = '21rem';

    var dialogOptions = {
      message: { textL10nId: options.titleL10nId },
      initialInputValue: options.initialValue,
      customElementSettings: { element: button },
      buttonSettings: [{
        textL10nId: 'LT_WB_OK',
        class: options.buttonClass ? options.buttonClass : 'primary',
        defaultFocus: true,
        onClick: () => {
          options.onConfirm(homepageInput.value);
        }
      },{
        textL10nId: 'LT_CANCEL',
        class: 'cancel',
        onClick: () => {
          if (options.onCancel) {
            options.onCancel();
          }
        }
      }],
      onCancel: () => {
        if (options.onCancel) {
          options.onCancel();
        }
      },
      onReturned: () => {
        options.onConfirm(homepageInput.value);
      }
    };

    this.inputDialog.open(dialogOptions);
  },

  /**
   * create Dialog
   */
  createDialog: function dialog_createDialog(type, options) {
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

      case 'edit_homepage':
        this.openHomepageDialog({
          titleL10nId: 'WB_LT_SET_AS_HOMEPAGE',
          initialValue: options.currentHomepage,
          defaultValue: options.defaultHomepage,
          onConfirm: deferred.resolve,
          onCancel: deferred.reject
        });
        break;

      case 'exit_browser':
        this.openDialog({
          titleL10nId: 'LT_BROWSER_CONFIRM_EXIT2',
          buttonL10nId: 'ok',
          buttonClass: 'primary',
          onConfirm: deferred.resolve
        });
        break;

      default:
        break;
    }

    return promise;
  },

  isDisplayed: function dialog_isDisplayed() {
    return this.modalDialog.isOpened || this.inputDialog.isOpened;
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

    if (this.inputDialog.isOpened) {
      this.inputDialog.close();
    }
  },

  handleClosedEvent: function dialog_handleClosedEvent() {
    BrowserDialog.browserDialogBase.classList.add('hide');
    Browser.switchCursorMode(true);
  }
};
