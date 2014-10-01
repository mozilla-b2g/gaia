/**
 * The apn constants
 */
define(function(require) {
  'use strict';

  var APN_TYPES = ['default', 'mms', 'supl', 'dun', 'ims'];

  var CP_APN_KEY = 'ril.data.cp.apns';
  var DEFAULT_APN_KEY = 'ril.data.default.apns';

  // Used for detecting if a new icc card has been inserted.
  var CACHED_ICCIDS_KEY = 'apn.cached.iccids';

  var APN_LIST_KEY = 'apn.list';
  var APN_SELECTIONS_KEY = 'apn.selections';
  var APN_SETTINGS_KEY = 'ril.data.apnSettings';
  var DEFAULT_APN_SETTINGS_KEY = 'ril.data.default.apnSettings';

  var MCC_SETTINGS_KEY = 'operatorvariant.mcc';
  var MNC_SETTINGS_KEY = 'operatorvariant.mnc';

  var EU_ROAMING_ENABLED_KEY = 'eu-roaming.enabled';
  var EU_ROAMING_FILE_PATH = '/resources/eu-roaming.json';

  var APN_PROPS = [
    'carrier', 'apn', 'user', 'passwd', 'httpproxyhost', 'httpproxyport',
    'mmsc', 'mmsproxy', 'mmsport', 'authtype', 'types', 'protocol',
    'roaming_protocol',
    /**
     * _id is an internal property for identifying apn items received via
     * client provisioning.
     */
    '_id'
  ];

  return {
    get APN_TYPES() { return APN_TYPES; },
    get CP_APN_KEY() { return CP_APN_KEY; },
    get DEFAULT_APN_KEY() { return DEFAULT_APN_KEY; },
    get CACHED_ICCIDS_KEY() { return CACHED_ICCIDS_KEY; },
    get APN_LIST_KEY() { return APN_LIST_KEY; },
    get APN_SELECTIONS_KEY() { return APN_SELECTIONS_KEY; },
    get APN_SETTINGS_KEY() { return APN_SETTINGS_KEY; },
    get DEFAULT_APN_SETTINGS_KEY() { return DEFAULT_APN_SETTINGS_KEY; },
    get MCC_SETTINGS_KEY() { return MCC_SETTINGS_KEY; },
    get MNC_SETTINGS_KEY() { return MNC_SETTINGS_KEY; },
    get EU_ROAMING_ENABLED_KEY() { return EU_ROAMING_ENABLED_KEY; },
    get EU_ROAMING_FILE_PATH() { return EU_ROAMING_FILE_PATH; },
    get APN_PROPS() { return APN_PROPS; }
  };
});
