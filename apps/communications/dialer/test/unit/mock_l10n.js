var MockMozL10n = {
  get: function get(key) {
    return key;
  },
  translate: function(node) {

  },
  DateTimeFormat: function() {
    this.localeFormat = function(date, format) {
      return date;
    };
  },
  language: {
    code: 'en',
    dir: 'ltr'
  }
};

var MockLazyL10n = {
  keys: {},
  get: function get(callback) {
    if (callback) {
      callback(function _(key, params) {
        MockLazyL10n.keys[key] = params;
        return key;
      });
    }
  },
  translate: function(node) {

  }
};
