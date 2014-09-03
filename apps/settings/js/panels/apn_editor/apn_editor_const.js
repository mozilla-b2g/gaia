/**
 * The apn editor const
 */
define(function(require) {
  'use strict';

  var APN_PROPERTY_DEFAULTS = {
    'apn': '',
    'user': '',
    'password': '',
    'proxy': '',
    'port': '',
    'mmsc': '',
    'mmsproxy': '',
    'mmsport': '',
    'authtype': 'notDefined',
    'types': ['default'],
    'protocol': 'notDefined',
    'roaming_protocol': 'notDefined'
  };

  var APN_PROPERTIES = Object.keys(APN_PROPERTY_DEFAULTS);

  var VALUE_CONVERTERS = {
    'TO_STRING': {
      'types': function(types) {
        if (types && Array.isArray(types) && types.length) {
          return types.join(', ');
        } else {
          return 'default';
        }
      }
    },
    'TO_DATA': {
      'types': function(string) {
        return string.split(',').map((str) => str.trim());
      }
    }
  };

  return {
    get APN_PROPERTIES() { return APN_PROPERTIES; },
    get APN_PROPERTY_DEFAULTS() { return APN_PROPERTY_DEFAULTS; },
    get VALUE_CONVERTERS() { return VALUE_CONVERTERS; }
  };
});
