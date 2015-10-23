'use strict';

define(function(require) {
  var SettingsPanel = require('modules/settings_panel');
  var FindMyDevice = require('panels/findmydevice/findmydevice');

  return function ctor_findmydevice_panel() {
    var elements;
    var findmydevice = FindMyDevice();

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          header: panel.querySelector('gaia-header'),
          login: panel.querySelector('.findmydevice-login'),
          loginButton: panel.querySelector('.findmydevice-login > button'),
          unverifiedError: panel.querySelector(
            '.findmydevice-fxa-unverified-error'),
          checkbox: panel.querySelector('.findmydevice-enabled gaia-switch'),
          status: panel.querySelector('.findmydevice-tracking'),
          signin: panel.querySelector('.findmydevice-signin'),
          settings: panel.querySelector('.findmydevice-settings')
        };
        findmydevice.onInit(elements);
      },
      onBeforeShow: function() {
        findmydevice.onBeforeShow();
      },
      onBeforeHide: function() {
        findmydevice.onBeforeHide();
      }
    });
  };
});
