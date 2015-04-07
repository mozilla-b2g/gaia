/* global getSupportedNetworkInfo */
/**
 * NetworkTypeManager provides a supported network type list of a mobile
 * connection. It wraps setPreferredNetworkType and is responsible for updating
 * the settings field when setting preferred network types.
 *
 * @module panels/operator_settings/models/network_type_manager
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');
  var SettingsHelper = require('shared/settings_helper');

  const SETTINGS_KEY = 'ril.radio.preferredNetworkType';

  /**
   * @class NetworkTypeManager
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @requires module:modules/mvvm/observable_array
   * @requires module:shared/settings_helper
   * @params {MozMobileConnection} conn
   * @returns {NetworkTypeManager}
   */
  var NetworkTypeManager = Module.create(function NetworkTypeManager(conn) {
    if (!conn.setPreferredNetworkType) {
      this.throw(`mobile connection does not support settings preferred network
        type`);
    }
    this.super(Observable).call(this);

    this._conn = conn;
    this._serviceId = [].indexOf.call(navigator.mozMobileConnections, conn);
    this._networkTypes = ObservableArray([]);
    this._supportedNetworkInfo = null;
    this._settingsHelper = SettingsHelper(SETTINGS_KEY);

    this._init(conn);
  }).extend(Observable);

  /**
   * Available network types.
   *
   * @access public
   * @readonly
   * @memberOf NetworkTypeManager.prototype
   * @type {ObservableArray.<String>}
   */
  Object.defineProperty(NetworkTypeManager.prototype, 'networkTypes', {
    enumerable: true,
    get: function() {
      return this._networkTypes;
    }
  });

  /**
   * An observable property indicating the preferred network type.
   *
   * @access public
   * @readonly
   * @memberOf NetworkTypeManager.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(NetworkTypeManager.prototype,
    'preferredNetworkType', {
      readonly: true,
      value: null
  });

  /**
   * Initialize the supported network type list.
   *
   * @access private
   * @memberOf NetworkTypeManager.prototype
   * @returns {Promise}
   */
  NetworkTypeManager.prototype._init = function() {
    this.getSupportedNetworkInfo().then((info) => {
      if (!info.networkTypes) {
        return Promise.reject('not-supported');
      }
      this._networkTypes.reset(info.networkTypes);
      return this._conn.getPreferredNetworkType();
    }).then((preferredNetworkType) => {
      this._preferredNetworkType = preferredNetworkType;
    }).catch((error) => {
      if (error === 'not-supported') {
        this.debug('_init: not-supported');
      } else {
        this.error('_init: could not retrieve network type: ' + error);
      }
    });
  };

  /**
   * Get the supported network types of the mobile connection. The object also
   * contains a method for get a proper l10n id for each network type.
   *
   * @access public
   * @memberOf NetworkTypeManager.prototype
   * @returns {Promise}
   */
  NetworkTypeManager.prototype.getSupportedNetworkInfo = function() {
    if (this._supportedNetworkInfo) {
      return Promise.resolve(this._supportedNetworkInfo);
    } else {
      return new Promise((resolve) => {
        getSupportedNetworkInfo(this._conn, (info) => {
          this._supportedNetworkInfo = info;
          resolve(info);
        });
      });
    }
  };

  /**
   * Set the preferred newtork type and update the settings field accordingly.
   *
   * @access public
   * @memberOf NetworkTypeManager.prototype
   * @params {String} networkType
   * @returns {Promise}
   */
  NetworkTypeManager.prototype.setPreferredNetworkType = function(networkType) {
    return this._conn.setPreferredNetworkType(networkType).then(() => {
      this._settingsHelper.get((values) => {
        values[this._serviceId] = networkType;
        this._settingsHelper.set(values);
      });
      this._preferredNetworkType = networkType;
    }, (error) => {
      this.error('setPreferredNetworkType: ' + error);
    });
  };

  return NetworkTypeManager;
});
