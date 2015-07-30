/* exported SupportedNetworkTypeHelper */

'use strict';

(function(exports) {
  // The network types displayed on the list for user selection
  var NETWORK_TYPES = [
    'wcdma/gsm',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'cdma/evdo',
    'cdma',
    'evdo',
    'wcdma/gsm/cdma/evdo',
    'lte/cdma/evdo',
    'lte/wcdma/gsm',
    'lte/wcdma/gsm/cdma/evdo',
    'lte',
    'lte/wcdma'
  ];

  // The string map from network types to user friendly strings, which is
  // the combination of the three categories: 'GSM', 'CDMA', and 'LTE'.
  // The mapping is determined by the hardware supported types.
  var NETWORK_TYPE_STRING_MAP = {
    'CDMA': {
      'cdma/evdo': 'operator-networkType-auto',
      'cdma': 'operator-networkType-CDMA',
      'evdo': 'operator-networkType-EVDO'
    },
    'LTE': {
      'lte': 'operator-networkType-LTE'
    },
    'GSM': {
      'wcdma/gsm': 'operator-networkType-prefer3G',
      'gsm': 'operator-networkType-2G',
      'wcdma': 'operator-networkType-3G',
      'wcdma/gsm-auto': 'operator-networkType-auto'
    },
    'GSM,LTE': {
      'lte/wcdma/gsm': 'operator-networkType-auto',
      'lte/wcdma': 'operator-networkType-auto-3G-4G',
      'gsm': 'operator-networkType-2G',
      'wcdma': 'operator-networkType-3G',
      'wcdma/gsm-auto': 'operator-networkType-auto-2G-3G',
      'wcdma/gsm': 'operator-networkType-prefer3G',
      'lte': 'operator-networkType-LTE'
    },
    'CDMA,LTE': {
      'lte/cdma/evdo': 'operator-networkType-auto',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      'cdma': 'operator-networkType-CDMA',
      'evdo': 'operator-networkType-EVDO',
      'lte': 'operator-networkType-LTE'
    },
    'GSM,CDMA': {
      'wcdma/gsm': 'operator-networkType-preferWCDMA',
      'gsm': 'operator-networkType-GSM',
      'wcdma': 'operator-networkType-WCDMA',
      'wcdma/gsm-auto': 'operator-networkType-auto-WCDMA-GSM',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      'cdma': 'operator-networkType-CDMA',
      'evdo': 'operator-networkType-EVDO',
      'wcdma/gsm/cdma/evdo': 'operator-networkType-auto'
    },
    'GSM,CDMA,LTE': {
      'wcdma/gsm': 'operator-networkType-preferWCDMA',
      'gsm': 'operator-networkType-GSM',
      'wcdma': 'operator-networkType-WCDMA',
      'wcdma/gsm-auto': 'operator-networkType-auto-WCDMA-GSM',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      'cdma': 'operator-networkType-CDMA',
      'evdo': 'operator-networkType-EVDO',
      'wcdma/gsm/cdma/evdo': 'operator-networkType-auto-WCDMA-GSM-CDMA-EVDO',
      'lte': 'operator-networkType-LTE',
      'lte/wcdma/gsm': 'operator-networkType-auto-LTE-WCDMA-GSM',
      'lte/wcdma': 'operator-networkType-auto-LTE-WCDMA',
      'lte/cdma/evdo': 'operator-networkType-auto-LTE-CDMA-EVDO',
      'lte/wcdma/gsm/cdma/evdo': 'operator-networkType-auto'
    },
    // Default value, the same as 'GSM,CDMA'.
    '': {
      'wcdma/gsm': 'operator-networkType-preferWCDMA',
      'gsm': 'operator-networkType-GSM',
      'wcdma': 'operator-networkType-WCDMA',
      'wcdma/gsm-auto': 'operator-networkType-auto-WCDMA-GSM',
      'cdma/evdo': 'operator-networkType-auto-CDMA-EVDO',
      'cdma': 'operator-networkType-CDMA',
      'evdo': 'operator-networkType-EVDO',
      'wcdma/gsm/cdma/evdo': 'operator-networkType-auto'
    }
  };

  /**
   * SupportedNetworkTypeHelper helps map the supported network types to user
   * friendly strings.
   *
   * @param {Array} hwSupportedTypes Array of hardware supported types. The
   *                                 posssible values of the type are 'gsm',
   *                                 'cdma', 'wcdma', 'evdo', and 'lte'.
   */
  var SupportedNetworkTypeHelper = function ctor_snth(hwSupportedTypes) {
    var _hwSupportedTypeMap = {
      gsm: hwSupportedTypes.indexOf('gsm') !== -1,
      cdma: hwSupportedTypes.indexOf('cdma') !== -1,
      wcdma: hwSupportedTypes.indexOf('wcdma') !== -1,
      evdo: hwSupportedTypes.indexOf('evdo') !== -1,
      lte: hwSupportedTypes.indexOf('lte') !== -1
    };

    // Get all supported network types based on the hardware supported types.
    var _networkTypes = NETWORK_TYPES.filter(function(type) {
      return type.split('/').every(function(subtype) {
        return _hwSupportedTypeMap[subtype.split('-')[0]];
      });
    });

    // Compose the string for NETWORK_TYPE_STRING_MAP table lookup.
    var _stringMap = NETWORK_TYPE_STRING_MAP[
      ['GSM', 'CDMA', 'LTE'].filter(function(category) {
        switch (category) {
          case 'GSM':
            return _hwSupportedTypeMap.gsm || _hwSupportedTypeMap.wcdma;
          case 'CDMA':
            return _hwSupportedTypeMap.cdma || _hwSupportedTypeMap.evdo;
          case 'LTE':
            return _hwSupportedTypeMap.lte;
        }
    }).toString()];

    return {
      get gsm() {
        return _hwSupportedTypeMap.gsm;
      },
      get cdma() {
        return _hwSupportedTypeMap.cdma;
      },
      get wcdma() {
        return _hwSupportedTypeMap.wcdma;
      },
      get evdo() {
        return _hwSupportedTypeMap.evdo;
      },
      get lte() {
        return _hwSupportedTypeMap.lte;
      },
      get networkTypes() {
        return _networkTypes;
      },
      l10nIdForType: function(type) {
        return _stringMap[type];
      }
    };
  };

  exports.SupportedNetworkTypeHelper = SupportedNetworkTypeHelper;
})(window);
