define(function(require, exports) {
'use strict';

var IntlHelper = require('shared/intl_helper');

exports.init = function init() {
  IntlHelper.define('months-day-view-header-format', 'datetime', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  IntlHelper.define('multi-month-view-header-format', 'datetime', {
    month: 'short',
    year: 'numeric'
  });

  IntlHelper.define('day-view-header-format', 'datetime', {
    month: 'short',
    day: 'numeric',
    weekday: 'long'
  });

  IntlHelper.define('shortTimeFormat', 'datetime', {
    hour: 'numeric',
    minute: 'numeric'
  });
};

});
