'use strict';

//
// Utility API for manipulating config stored in local cookie.
//
(function() {
  var utils = window.utils = window.utils || {};
  utils.cookie = {};

  // Bump this number if the format of the cookie changes
  var COOKIE_VERSION = 2;

  // Default values for items stored in the configuration
  var COOKIE_DEFAULTS = {
    order: false,
    viewHeight: -1,
    rowsPerPage: -1,
    fbMigrated: false
  };

  // Only allow these properties to be stored in the config
  var COOKIE_PROPS = Object.keys(COOKIE_DEFAULTS);

  // Set as a constant in the far future to avoid calling new Date
  var EXPIRATION_DATE = 'Fri, 31 Dec 9999 23:59:59 GMT';
  var COOKIE_NAME = 'preferences';
  var COOKIE_NAME_EQ = COOKIE_NAME + '=';
  var COOKIE_NAME_LENGHT = COOKIE_NAME_EQ.length;

  // Parses the cookie returning the corresponding object
  // Returns null if the cookie string does not conform with expected format
  function _parseCookie(cookie) {
    // Expecting "preferences=<JSON value>"
    var index = cookie.indexOf(COOKIE_NAME_EQ);
    if (index === -1) {
      return null;
    }
    var cookieVal = cookie.substring(index + COOKIE_NAME_LENGHT);
    if (!cookieVal) {
      return null;
    }

    return JSON.parse(decodeURIComponent(cookieVal));
  }

  // Load and return the cookie config if present.  Returns null if the
  // cookie is missing, has an incorrect format or versions mismatch.
  utils.cookie.load = function() {
    if (!document.cookie) {
      return null;
    }

    var cookie = _parseCookie(document.cookie);

    // If the cookie is out-of-date, then we need to update it
    // and re-parse since the format might have changed.
    if (cookie && cookie.version !== COOKIE_VERSION) {
      _updateCookie(cookie);
      cookie = _parseCookie(document.cookie);
    }

    return cookie;
  };

  // Update the current cookie config with the given set of configuration
  // properties.  The passed in configuration properties can be a subset of
  // the values stored in the cookie.  Unspecified values will be unchanged.
  utils.cookie.update = function(cfg) {
    _updateCookie(utils.cookie.load(), cfg);
  };

  // Internal helper function that writes out a new cookie based on a set
  // of existing value, a set of new values, and defaults.
  function _updateCookie(oldCookie, cfg) {
    oldCookie = oldCookie || {};
    cfg = cfg || {};

    var newCookie = {version: COOKIE_VERSION};

    // For each allowed property in the config, pick the right value given
    // our input.  This intentionally removes old properties in the cookie
    // that may no longer be in our allowed COOKIE_PROPS.
    for (var i = 0, n = COOKIE_PROPS.length; i < n; ++i) {
      var prop = COOKIE_PROPS[i];
      // Prefer configuration overrides provided
      if (prop in cfg) {
        newCookie[prop] = cfg[prop];
      // Otherwise use previously set values
      } else if (prop in oldCookie) {
        newCookie[prop] = oldCookie[prop];
      // Finally, fall back to defaults
      } else {
        newCookie[prop] = COOKIE_DEFAULTS[prop];
      }
    }

    document.cookie = COOKIE_NAME + '=' +
                                encodeURIComponent(JSON.stringify(newCookie)) +
                                ';expires=' + EXPIRATION_DATE;

  }

  utils.cookie.getDefault = function(prop) {
    return COOKIE_DEFAULTS(prop);
  };
})();
