/* global DeviceStorageHelper, MozActivity */
/**
 * Used to show Storage/App Storage panel
 */
define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var AppStorage = require('modules/app_storage');

  return function ctor_app_storage_panel() {
    var _storageStatus = null;
    var _spaceBarElement = null;
    var _totalSpaceText = null;
    var _usedSpaceText = null;
    var _freeSpaceLabel = null;
    var _freeSpaceText = null;
    var _lowDiskSpace = null;
    var _mediaStorage = null;

    var _updateUsePercentage = function() {
      _spaceBarElement.value = AppStorage.usedPercentage;
    };

    var _refreshText = function(element, size) {
      DeviceStorageHelper.showFormatedSize(element,
        'storageSize', size);
    };
    var _updateTotalSize = function() {
      _refreshText(_totalSpaceText, AppStorage.totalSize);
    };
    var _updateUsedSize = function() {
      _refreshText(_usedSpaceText, AppStorage.usedSize);
    };
    var _updateFreeSize = function() {
      _refreshText(_freeSpaceText, AppStorage.freeSize);
    };
    var _updateStorageStatus = function() {
      var lowDiskSpace = AppStorage.lowDiskSpace;
      _storageStatus.className =
        lowDiskSpace ? 'apps-storage-status-low' : 'apps-storage-status';
      _freeSpaceLabel.setAttribute('data-l10n-id',
        lowDiskSpace ? 'apps-available-space' : 'apps-free-space');
    };

    var _updateElements = function() {
      _updateUsePercentage();
      _updateTotalSize();
      _updateUsedSize();
      _updateFreeSize();
      _updateStorageStatus();
    };

    var _openMediaStorage = function() {
      return new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'mediaStorage'
        }
      });
    };

    return SettingsPanel({
      onInit: function(panel) {
        _storageStatus = panel.querySelector('.apps-storage-status');
        _spaceBarElement = panel.querySelector('.apps-space-bar');
        _totalSpaceText = panel.querySelector('.apps-total-space');
        _usedSpaceText = panel.querySelector('.apps-used-space');
        _freeSpaceLabel = panel.querySelector('.apps-free-space-label');
        _freeSpaceText = panel.querySelector('.apps-free-space');
        _lowDiskSpace = panel.querySelector('.apps-low-disk-space');
        _mediaStorage = panel.querySelector('.media-storage');
      },

      onBeforeShow: function() {
        AppStorage.observe('usedPercentage', _updateUsePercentage);
        AppStorage.observe('totalSize', _updateTotalSize);
        AppStorage.observe('usedSize', _updateUsedSize);
        AppStorage.observe('freeSize', _updateFreeSize);
        AppStorage.observe('lowDiskSpace', _updateStorageStatus);

        _updateElements();
        AppStorage.updateInfo();
        _mediaStorage.addEventListener('click', _openMediaStorage);
      },

      onHide: function() {
        AppStorage.unobserve('usedPercentage', _updateUsePercentage);
        AppStorage.unobserve('totalSize', _updateTotalSize);
        AppStorage.unobserve('usedSize', _updateUsedSize);
        AppStorage.unobserve('freeSize', _updateFreeSize);
        AppStorage.unobserve('lowDiskSpace', _updateStorageStatus);
      }
    });
  };
});
