/* global MozActivity, DsdsSettings, SupportedNetworkTypeHelper */

/*
 * SettingsUtils is a singleton that we will provide all needed methods
 * when doing panel related actions.
 *
 * @module SettingsUtils
 */
define(function(require) {
  'use strict';

  // TODO
  // We need to move utils.js to SettingsUtils step by step
  var LazyLoader = require('shared/lazy_loader');

  var SettingsUtils = {
    /**
     * We will use LazyLoader to help us load settings' used templates
     * and then return the html to callback
     *
     * @memberOf SettingsUtils
     * @param {String} panelId - ID of target panel
     * @param {Function} callback - with html as its first parameter
     */
    loadTemplate: function su_loadTemplate(panelId, callback) {
      var templateElement = document.getElementById(panelId);
      if (!templateElement) {
        callback(null);
      } else {
        LazyLoader.load([templateElement], function() {
          callback(templateElement.innerHTML);
        });
      }
    },

    /**
     * Re-runs the font-fit title
     * centering logic.
     *
     * The gaia-header has mutation observers
     * that listen for changes in the header
     * title and re-run the font-fit logic.
     *
     * If buttons around the title are shown/hidden
     * then these mutation observers won't be
     * triggered, but we want the font-fit logic
     * to be re-run.
     *
     * This is a deficiency of <gaia-header>. If
     * anyone knows a way to listen for changes
     * in visibility, we won't need this anymore.
     *
     * @param {GaiaHeader} header
     * @private
     */
    runHeaderFontFit: function su_runHeaderFontFit(header) {
      var titles = header.querySelectorAll('h1');
      [].forEach.call(titles, function(title) {
        title.textContent = title.textContent;
      });
    },

    /**
     * Move settings to foreground
     */
    reopenSettings: function() {
      navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
        var app = evt.target.result;
        app.launch('settings');
      };
    },

    /**
     * Open a link with a web activity
     */
    openLink: function(url) {
      /* jshint -W031 */
      if (url.startsWith('tel:')) { // dial a phone number
        new MozActivity({
          name: 'dial',
          data: { type: 'webtelephony/number', number: url.substr(4) }
        });
      } else if (!url.startsWith('#')) { // browse a URL
        new MozActivity({
          name: 'view',
          data: { type: 'url', url: url }
        });
      }
    },

    /**
     * These so-called "dialog boxes" are just standard Settings panels
     * (<section role="region" />) with reset/submit buttons: these buttons
     * both return to the previous panel when clicked,
     * and each button has its own (optional) callback.
     */
    openDialog: function(dialogID, onSubmit, onReset) {
      if ('#' + dialogID === Settings.currentPanel) {
        return;
      }

      var origin = Settings.currentPanel;

      // Load dialog contents and show it.
      Settings.currentPanel = dialogID;

      var dialog = document.getElementById(dialogID);
      var submit = dialog.querySelector('[type=submit]');
      if (submit) {
        submit.onclick = function onsubmit() {
          if (typeof onSubmit === 'function') {
            (onSubmit.bind(dialog))();
          }
          Settings.currentPanel = origin; // hide dialog box
        };
      }

      var reset = dialog.querySelector('[type=reset]');
      if (reset) {
        reset.onclick = function onreset() {
          if (typeof onReset === 'function') {
            (onReset.bind(dialog))();
          }
          Settings.currentPanel = origin; // hide dialog box
        };
      }
    },

    openIncompatibleSettingsDialog: function(dialogId, newSetting,
      oldSetting, callback) {
      var headerL10nMap = {
        'ums.enabled': 'is-warning-storage-header',
        'tethering.usb.enabled': 'is-warning-tethering-header',
        'tethering.wifi.enabled': 'is-warning-wifi-header'
      };
      var messageL10nMap = {
        'ums.enabled': {
          'tethering.usb.enabled': 'is-warning-storage-tethering-message'
        },
        'tethering.usb.enabled': {
          'ums.enabled': 'is-warning-tethering-storage-message',
          'tethering.wifi.enabled': 'is-warning-tethering-wifi-message'
        },
        'tethering.wifi.enabled': {
          'tethering.usb.enabled': 'is-warning-wifi-tethering-message'
        }
      };

      var headerL10n = headerL10nMap[newSetting];
      var messageL10n =
        messageL10nMap[newSetting] && messageL10nMap[newSetting][oldSetting];

      var $ = function(sel) {
        return document.querySelector(sel);
      };

      var dialogElement = $('.incompatible-settings-dialog');
      var dialogHead = $('.is-warning-head');
      var dialogMessage = $('.is-warning-message');
      var okBtn = $('.incompatible-settings-ok-btn');
      var cancelBtn = $('.incompatible-settings-cancel-btn');

      dialogHead.setAttribute('data-l10n-id', headerL10n);
      dialogMessage.setAttribute('data-l10n-id', messageL10n);

      // User has requested enable the feature so the old feature
      // must be disabled
      function onEnable(evt) {
        evt.preventDefault();
        var lock = Settings.mozSettings.createLock();
        var cset = {};

        cset[newSetting] = true;
        cset[oldSetting] = false;
        lock.set(cset);

        enableDialog(false);

        if (callback) {
          callback();
        }
      }

      function onCancel(evt) {
        evt.preventDefault();
        var lock = Settings.mozSettings.createLock();
        var cset = {};

        cset[newSetting] = false;
        cset[oldSetting] = true;
        lock.set(cset);

        enableDialog(false);
      }

      var enableDialog = function enableDialog(enabled) {
        if (enabled) {
          okBtn.addEventListener('click', onEnable);
          cancelBtn.addEventListener('click', onCancel);
          dialogElement.hidden = false;
        } else {
          okBtn.removeEventListener('click', onEnable);
          cancelBtn.removeEventListener('click', onCancel);
          dialogElement.hidden = true;
        }
      };
      enableDialog(true);
    },

    /**
     * Helper class for getting available/used storage
     * required by *_storage.js
     */
    DeviceStorageHelper: (() => {
      function getReadableFileSize(bytes, digits) { // in: size in Bytes
        if (bytes === undefined) {
          return {};
        }

        var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var size, e;
        if (bytes) {
          e = Math.floor(Math.log(bytes) / Math.log(1024));
          size = (bytes / Math.pow(1024, e)).toFixed(digits || 0);
        } else {
          e = 0;
          size = '0';
        }

        return {
          size: size,
          unit: units[e]
        };
      }

      function showFormatedSize(element, l10nId, size) {
        if (size === undefined || isNaN(size)) {
          element.textContent = '';
          return;
        }

        // KB - 3 KB (nearest ones), MB, GB - 1.29 MB (nearest hundredth)
        var fixedDigits = (size < 1024 * 1024) ? 0 : 2;
        var sizeInfo = getReadableFileSize(size, fixedDigits);

        var _ = navigator.mozL10n.get;
        navigator.mozL10n.setAttributes(element, l10nId, {
          size: sizeInfo.size,
          unit: _('byteUnit-' + sizeInfo.unit)
        });
      }

      return {
        showFormatedSize: showFormatedSize
      };
    })(),

    /**
     * The function returns an object of the supporting state of category of
     * network types. The categories are 'gsm', 'cdma', and 'lte'.
     */
    getSupportedNetworkInfo: (function() {
      var supportedNetworkTypeHelpers = [];

      var helperFuncReady = function(callback) {
        if (window.SupportedNetworkTypeHelper) {
          if (typeof callback === 'function') {
            callback();
          }
        } else {
          LazyLoader.load(['js/supported_network_type_helper.js'], function() {
            if (typeof callback === 'function') {
              callback();
            }
          });
        }
      };

      var getMobileConnectionIndex = function(mobileConnection) {
        return Array.prototype.indexOf.call(navigator.mozMobileConnections,
          mobileConnection);
      };

      var getSupportedNetworkInfo = function(mobileConnection, callback) {
        if (!navigator.mozMobileConnections) {
          if (typeof callback === 'function') {
            callback();
          }
        }

        helperFuncReady(function ready() {
          var index = getMobileConnectionIndex(mobileConnection);
          var supportedNetworkTypeHelper = supportedNetworkTypeHelpers[index];
          if (!supportedNetworkTypeHelper) {
            supportedNetworkTypeHelpers[index] =
            supportedNetworkTypeHelper =
              SupportedNetworkTypeHelper(
                mobileConnection.supportedNetworkTypes);
          }
          if (typeof callback === 'function') {
            callback(supportedNetworkTypeHelper);
          }
        });
      };

      return getSupportedNetworkInfo;
    })(),

    /**
     * Retrieve current ICC by a given index. If no index is provided, it will
     * use the index provided by `DsdsSettings.getIccCardIndexForCallSettings`,
     * which is the default. Unless there are very specific reasons to provide
     * an index, this function should always be invoked with no parameters
     * in order to use the currently selected ICC index.
     *
     * @param {Number} index index of the mobile connection to get the ICC from
     * @return {object}
     */
    getIccByIndex: function(index) {
      if (index === undefined) {
        index = DsdsSettings.getIccCardIndexForCallSettings();
      }
      var iccObj;

      if (navigator.mozMobileConnections[index]) {
        var iccId = navigator.mozMobileConnections[index].iccId;
        if (iccId) {
          iccObj = navigator.mozIccManager.getIccById(iccId);
        }
      }

      return iccObj;
    }
  };

  return SettingsUtils;
});
