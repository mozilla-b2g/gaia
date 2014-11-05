/* global DsdsSettings */
/**
 * The apn settings panel
 */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsPanel = require('modules/settings_panel');
  var ApnSettingsManager = require('modules/apn/apn_settings_manager');
  var Toaster = require('shared/toaster');

  return function ctor_apn_settings_panel() {
    var _serviceId = 0;

    var _rootElement;
    var _warningDialog;
    var _warningDialogOkBtn;
    var _warningDialogCancelBtn;

    var _showResetApnWarningDialog = function(callback) {
      if (typeof callback !== 'function') {
        return;
      }

      if (!_warningDialog) {
        _warningDialog = _rootElement.querySelector('.reset-apn-warning');
        _warningDialogOkBtn = _warningDialog.querySelector('.ok-btn');
        _warningDialogCancelBtn = _warningDialog.querySelector('.cancel-btn');
      }

      _warningDialog.addEventListener('click', function onclick(event) {
        if (event.target == _warningDialogOkBtn) {
          _warningDialog.removeEventListener('click', onclick);
          _warningDialog.hidden = true;
          callback(true);
        } else if (event.target == _warningDialogCancelBtn) {
          _warningDialog.removeEventListener('click', onclick);
          _warningDialog.hidden = true;
          callback(false);
        }
      });
      _warningDialog.hidden = false;
    };

    var _browseApnItems = function(apnType) {
      SettingsService.navigate(
        'apn-list',
        {
          type: apnType,
          serviceId: _serviceId
        }
      );
    };

    var _resetApn = function() {
      _showResetApnWarningDialog(function(value) {
        if (value) {
          ApnSettingsManager.restore(_serviceId).then(function() {
            var toast = {
              messageL10nId: 'apnSettings-reset',
              latency: 3000,
              useTransition: true
            };
            Toaster.showToast(toast);
          });
        }
      });
    };

    return SettingsPanel({
      onInit: function asp_onInit(rootElement) {
        _rootElement = rootElement;
        var apnBtns = rootElement.querySelectorAll('a[data-apn-type]');
        var resetBtn = rootElement.querySelector('button.reset-apn');
        var header = rootElement.querySelector('gaia-header');

        if (DsdsSettings.getNumberOfIccSlots() > 1) {
          header.dataset.href = '#carrier-detail';
        } else {
          header.dataset.href = '#carrier';
        }

        Array.prototype.forEach.call(apnBtns, function(btn) {
          btn.onclick = _browseApnItems.bind(null, btn.dataset.apnType);
        });
        resetBtn.onclick = _resetApn;
      },
      onBeforeShow: function asp_onBeforeShow() {
        _serviceId = DsdsSettings.getIccCardIndexForCellAndDataSettings();
      }
    });
  };
});
