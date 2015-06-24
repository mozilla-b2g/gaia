/**
 * The Media Storages panel
 */
define(function(require) {
  'use strict';

  var DeviceStorageManager = require('modules/storage/device_storage_manager');
  var MediaStorageTemplateFactory = 
    require('panels/media_storages/media_storage_template_factory');
  // var DialogService = require('modules/dialog_service');
  var ListView = require('modules/mvvm/list_view');
  var SettingsPanel = require('modules/settings_panel');

  // const MAX_DEVICE_NAME_LENGTH = 20;

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function msp_debug(msg) {
      console.log('--> [MediaStorage][Panel]: ' + msg);
    };
  }

  return function ctor_bluetooth() {
    var elements;
    var mediaStorageTemplate;
    var _mediaStoragesListView;

    return SettingsPanel({
      onInit: function(panel) {
        Debug('onInit():');

        // Init bounding instances for observe/un-observe property.
        // this._boundUpdateEnableCheckbox = this._updateEnableCheckbox.bind(this);

        elements = {
          panel: panel,
          volumeList: panel.querySelector('.volume-list'),
          defaultVolume: {
            item: panel.querySelector('.default-media-location'),
            button: panel.querySelector('.default-media-location button'),
            select: panel.querySelector('.default-media-location select')
          }
        };

        // element related events
        elements.defaultVolume.button.addEventListener('click',
          this._onDefaultVolumeButtonClick.bind(this));

        // paired devices list item click events
        mediaStorageTemplate =
          MediaStorageTemplateFactory(this._onVolumeItemClick.bind(this));

        // create found devices list view
        _mediaStoragesListView = ListView(elements.volumeList,
                                          DeviceStorageManager.getVolumesList(),
                                          mediaStorageTemplate);
      },

      onBeforeShow: function() {
        Debug('onBeforeShow():');

        // paired devices header
        // BtContext.observe('hasPairedDevice',
        //   this._boundUpdatePairedDevicesHeader);
        // this._updatePairedDevicesHeader(BtContext.hasPairedDevice);

        // paired devices list
        // BtContext.observe('state', this._boundUpdatePairedDevicesList);
        // this._updatePairedDevicesList(BtContext.state);

        _mediaStoragesListView.enabled = true;
      },

      onShow: function() {
        Debug('onShow():');
      },

      onBeforeHide: function() {
        Debug('onBeforeHide():');
        // BtContext.unobserve('hasPairedDevice',
        //   this._boundUpdatePairedDevicesHeader);
        // BtContext.unobserve('state', this._boundUpdatePairedDevicesList);
      },

      onHide: function() {
        Debug('onHide():');
        if (_mediaStoragesListView) {
          _mediaStoragesListView.enabled = false;
        }
      },

      _onDefaultVolumeButtonClick: function() {
        // var checkbox = elements.enableCheckbox;
        Debug('_onDefaultVolumeButtonClick(): clicked');
        // TODO: show default-location-popup-container
      },

      _updatePairedDevicesHeader: function(hasPairedDevice) {
        // Debug('_updatePairedDevicesHeader(): ' +
        //       'callback from observe "hasPairedDevice" = ' + hasPairedDevice);
        // elements.paired.pairedDevicesHeader.hidden =
        //   (hasPairedDevice && (BtContext.state === 'enabled')) ? false : true;
      }
    });
  };
});
