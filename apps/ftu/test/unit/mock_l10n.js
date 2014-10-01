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
  setAttributes: function(element, id, args) {
    element.setAttribute('data-l10n-id', id);
    if (args) {
      element.setAttribute('data-l10n-args', JSON.stringify(args));
    }
  },
  getAttributes: function(element) {
    return {
      id: element.getAttribute('data-l10n-id'),
      args: JSON.parse(element.getAttribute('data-l10n-args'))
     };
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
