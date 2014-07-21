/**
 * Used to show Storage/Media Storage panel
 */
define(function(require) {
  'use strict';
  var SettingsPanel = require('modules/settings_panel');
  var DefaultMediaStorage = require('modules/media_storage');
  var MediaStorage = require('panels/media_storage/media_storage');

  return function ctor_media_storage_panel() {
    var media_storage = MediaStorage();
    return SettingsPanel({
      onInit: function(panel) {
        DefaultMediaStorage.init();
        media_storage.init({
          defaultMediaLocation: panel.querySelector('.defaultMediaLocation'),
          volumeListRootElement: panel.querySelector('.volume-list'),
          popup: panel.querySelector('.default-location-popup-container'),
          cancelBtn: panel.querySelector('.default-location-cancel-btn'),
          changeBtn: panel.querySelector('.default-location-change-btn')
        });
      },
      onBeforeShow: function() {
        // AppStorage.storage.observe('usedPercentage', _updateUsePercentage);

        // _updateElements();
      },
      onHide: function() {
        // AppStorage.storage.unobserve('usedPercentage', _updateUsePercentage);
      }
    });
  };
});
