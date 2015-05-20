/**
 * Used to show Storage/App Storage panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var SettingsUtils = require('modules/settings_utils');
  var AppStorage = require('modules/app_storage');

  return function ctor_app_storage_panel() {
    var _spaceBarElement = null;
    var _totalSpaceText = null;
    var _usedSpaceText = null;
    var _freeSpaceText = null;

    var _updateUsePercentage = function() {
      _spaceBarElement.value = AppStorage.storage.usedPercentage;
    };

    var _refreshText = function(element, size) {
      SettingsUtils.DeviceStorageHelper.showFormatedSize(element,
        'storageSize', size);
    };
    var _updateTotalSize = function() {
      _refreshText(_totalSpaceText, AppStorage.storage.totalSize);
    };
    var _updateUsedSize = function() {
      _refreshText(_usedSpaceText, AppStorage.storage.usedSize);
    };
    var _updateFreeSize = function() {
      _refreshText(_freeSpaceText, AppStorage.storage.freeSize);
    };

    var _updateElements = function() {
      _updateUsePercentage();
      _updateTotalSize();
      _updateUsedSize();
      _updateFreeSize();
    };

    return SettingsPanel({
      onInit: function(panel) {
        _spaceBarElement = panel.querySelector('.apps-space-bar');
        _totalSpaceText = panel.querySelector('.apps-total-space');
        _usedSpaceText = panel.querySelector('.apps-used-space');
        _freeSpaceText = panel.querySelector('.apps-free-space');
      },

      onBeforeShow: function() {
        AppStorage.storage.observe('usedPercentage', _updateUsePercentage);
        AppStorage.storage.observe('totalSize', _updateTotalSize);
        AppStorage.storage.observe('usedSize', _updateUsedSize);
        AppStorage.storage.observe('freeSize', _updateFreeSize);

        _updateElements();
        AppStorage.updateInfo();
      },

      onHide: function() {
        AppStorage.storage.unobserve('usedPercentage', _updateUsePercentage);
        AppStorage.storage.unobserve('totalSize', _updateTotalSize);
        AppStorage.storage.unobserve('usedSize', _updateUsedSize);
        AppStorage.storage.unobserve('freeSize', _updateFreeSize);
      }
    });
  };
});
