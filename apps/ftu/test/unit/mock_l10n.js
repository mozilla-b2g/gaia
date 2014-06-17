'use strict';

var MockL10n = {
  get: function(key, params) {
    if (params) {
      return key + JSON.stringify(params);
    }
    return key;
  },
  localize: function(element, label, args) {
    if (label == 'learn-more-privacy') {
      element.textContent = args.link;
    } else {
      element.textContent = label;
    }
  },
  DateTimeFormat: function () {
  },
  ready: function ready(cb) {
    cb();
  }
};

MockL10n.DateTimeFormat.prototype = {
  localeFormat: function mockLocaleFormat(time, strFormat) {
    return '' + time;
  }
};
