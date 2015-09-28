(function(global) {
'use strict';
/* global mozIntl */

const helperCache = new Map();

global.MockIntlHelper = {
  define: function(name, type, options) {
    helperCache.set(name, {options, type});
  },
  get: function(name) {
    if (!helperCache.has(name)) {
      throw new Error('Intl Object with name "' + name + '" is not defined');
    }
    var formatter = helperCache.get(name);
    switch (formatter.type) {
      case 'number':
        return Intl.NumberFormat(navigator.languages, formatter.options);
      case 'datetime':
        return Intl.DateTimeFormat(navigator.languages, formatter.options);
      case 'mozdatetime':
        return mozIntl.DateTimeFormat(navigator.languages, formatter.options);
      case 'mozduration':
        return mozIntl.DurationFormat(navigator.languages, formatter.options);
    }
  },
  observe: function() {},
  unobserve: function() {},
};

}(this));
