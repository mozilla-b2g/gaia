/* global getSupportedNetworkInfo */
/**
 * PanelModel determines the current connecting mode based on the the voice type
 * and hardware supported network modes.
 *
 * @module panels/operator_settings/models/panel_model
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  const NETWORK_TYPE_CATEGORY = {
    'gprs': 'gsm',
    'edge': 'gsm',
    'umts': 'gsm',
    'hsdpa': 'gsm',
    'hsupa': 'gsm',
    'hspa': 'gsm',
    'hspa+': 'gsm',
    'lte': 'gsm',
    'gsm': 'gsm',
    'is95a': 'cdma',
    'is95b': 'cdma',
    '1xrtt': 'cdma',
    'evdo0': 'cdma',
    'evdoa': 'cdma',
    'evdob': 'cdma',
    'ehrpd': 'cdma'
  };

  /**
   * @class OperatorSettingsPanelModel
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @params {MozMobileConnection} conn
   * @returns {OperatorSettingsPanelModel}
   */
  var PanelModel = Module.create(function OperatorSettingsPanelModel(conn) {
    this.super(Observable).call(this);

    this._voiceType = conn.voice && conn.voice.type;
    getSupportedNetworkInfo(conn, (result) => {
      if (result.gsm || result.wcdma || result.lte) {
        this._hardwareSupportedMode = 'gsm';
      } else {
        this._hardwareSupportedMode = 'cdma';
      }
    });
    conn.addEventListener('voicechange', () => {
      this._voiceType = conn.voice && conn.voice.type;
    });
  }).extend(Observable);

  /**
   * An observable property indicating the hardware supported network mode.
   *
   * @access private
   * @memberOf OperatorSettingsPanelModel.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(PanelModel.prototype,
    '_hardwareSupportedMode', {
      value: null
  });

  /**
   * An observable property indicating the current connected voice type.
   *
   * @access private
   * @memberOf OperatorSettingsPanelModel.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(PanelModel.prototype, '_voiceType', {
    value: null
  });

  /**
   * An observable property indicating the current connecting mode. The possible
   * values are 'gsm' and 'cdma'.
   *
   * @access public
   * @memberOf OperatorSettingsPanelModel.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(PanelModel.prototype, 'connectingMode', {
    dependency: ['_voiceType', '_hardwareSupportedMode'],
    get: function() {
      if (this._voiceType) {
        return NETWORK_TYPE_CATEGORY[this._voiceType];     
      } else {
        return this._hardwareSupportedMode;
      }
    }
  });

  return PanelModel;
});
