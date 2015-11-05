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
  var DialogService = require('modules/dialog_service');

  return function ctor_apn_settings_panel() {
    var _serviceId = 0;

    var _rootElement;

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
      DialogService.confirm('reset-apn-warning-message', {
        title: 'reset-apn-warning-title',
        submitButton: { id: 'reset', style: 'danger' },
        cancelButton: 'cancel'
      }).then((result) => {
        if (result.type === 'submit') {
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
