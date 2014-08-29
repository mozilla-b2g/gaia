/**
 * The apn editor module
 */
define(function(require) {
  'use strict';

  var ApnEditorConst = require('panels/apn_editor/apn_editor_const');
  var ApnEditorSession = require('panels/apn_editor/apn_editor_session');

  var APN_PROPERTIES = ApnEditorConst.APN_PROPERTIES;
  var APN_PROPERTY_DEFAULTS = ApnEditorConst.APN_PROPERTY_DEFAULTS;
  var VALUE_CONVERTERS = ApnEditorConst.VALUE_CONVERTERS;

  function ApnEditor(rootElement) {
    this._inputElements = {};
    APN_PROPERTIES.forEach(function(name) {
      this._inputElements[name] = rootElement.querySelector('.' + name);
    }, this);
  }

  ApnEditor.prototype = {
    _convertValue: function ae_convertValue(value, converter) {
      if (converter) {
        return converter(value);
      } else {
        return value;
      }
    },
    _fillInputElements: function ae_fillInputElements(inputElements, apn) {
      APN_PROPERTIES.forEach(function(name) {
        var inputElement = inputElements[name];
        if (inputElement) {
          var value = (apn && apn[name.toLowerCase()]) ||
            APN_PROPERTY_DEFAULTS[name];
          inputElement.value =
            this._convertValue(value, VALUE_CONVERTERS.TO_STRING[name]);
        }
      }, this);
    },
    createApn: function ae_createApn(serviceId, apnItem) {
      this._fillInputElements(this._inputElements, apnItem.apn);
      return ApnEditorSession(serviceId, 'new', this._inputElements, apnItem);
    },
    editApn: function ae_editApn(serviceId, apnItem) {
      this._fillInputElements(this._inputElements, apnItem.apn);
      return ApnEditorSession(serviceId, 'edit', this._inputElements, apnItem);
    }
  };

  return function ctor_apn_editor(rootElement) {
    return new ApnEditor(rootElement);
  };
});
