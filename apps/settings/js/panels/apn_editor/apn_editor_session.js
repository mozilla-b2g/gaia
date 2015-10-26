/**
 * The apn editor session module
 */
define(function(require) {
  'use strict';

  var ApnSettingsManager = require('modules/apn/apn_settings_manager');
  var ApnEditorConst = require('panels/apn_editor/apn_editor_const');
  var ApnUtils = require('modules/apn/apn_utils');

  var APN_PROPERTIES = ApnEditorConst.APN_PROPERTIES;
  var VALUE_CONVERTERS = ApnEditorConst.VALUE_CONVERTERS;

  function ApnEditorSession(serviceId, mode, inputElements, apnItem) {
    this._serviceId = serviceId;
    this._mode = mode;
    this._inputElements = inputElements;
    this._apnItem = apnItem;
  }

  ApnEditorSession.prototype = {
    _convertValue: function ae_convertValue(value, converter) {
      if (converter) {
        return converter(value);
      } else {
        return value;
      }
    },
    _exportApnSetting: function aes_exportApnSetting(inputElements) {
      var newApnSetting = {};
      APN_PROPERTIES.forEach(function(name) {
        var inputElement = inputElements[name];
        if (inputElement && !inputElement.hidden && inputElement.value) {
          newApnSetting[name.toLowerCase()] = this._convertValue(
            inputElement.value, VALUE_CONVERTERS.TO_DATA[name]);
        }
      }, this);
      return newApnSetting;
    },
    _commitNew: function aes_commitNew() {
      var promises = [];
      var newApnSetting = this._exportApnSetting(this._inputElements);
      newApnSetting.types.slice().forEach(function(type) {
        // Clone new settings to make sure the promises do not all
        // point to the very last one
        var settingClone = ApnUtils.clone(newApnSetting);
        settingClone.types = [type];
        promises.push(
          ApnSettingsManager.addApn(this._serviceId, settingClone));
      }, this);
      return Promise.all(promises);
    },
    _commitEdit: function aes_commitEdit() {
      var promises = [];
      var newApnSetting = this._exportApnSetting(this._inputElements);
      if (newApnSetting.types.length === 1) {
        promises.push(ApnSettingsManager.updateApn(this._serviceId,
          this._apnItem.id, newApnSetting));
      } else {
        newApnSetting.types.forEach(function(type) {
          var settingClone = ApnUtils.clone(newApnSetting);
          settingClone.types = [type];
          if (type === this._apnItem.apn.types[0]) {
            promises.push(ApnSettingsManager.updateApn(this._serviceId,
              this._apnItem.id, settingClone));
          } else {
            promises.push(ApnSettingsManager.addApn(this._serviceId,
              settingClone));
          }
        }, this);
      }
      return Promise.all(promises);
    },
    commit: function aes_commit() {
      switch (this._mode) {
        case 'new':
          return this._commitNew();
        case 'edit':
          return this._commitEdit();
        default:
          console.error('invalid mode');
          return Promise.resolve();
      }
    },
    cancel: function aes_cancel() {
      APN_PROPERTIES.forEach(function(name) {
        this._inputElements[name].value = '';
      }, this);
      this._apnItem = null;
    },
    get mode() {
      return this._mode;
    }
  };

  return function ctor_apnESession(serviceId, mode, inputElements, apnItem) {
    return new ApnEditorSession(serviceId, mode, inputElements, apnItem);
  };
});
