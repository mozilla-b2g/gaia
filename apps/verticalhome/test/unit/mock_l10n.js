'use strict';

/* exported MockL10n */

var MockL10n = {
  translate: function() {},
  get: function(key, obj) {
    var ret = key;
    if (obj) {
      ret += JSON.stringify(obj);
    }
    return ret;
  }
};
