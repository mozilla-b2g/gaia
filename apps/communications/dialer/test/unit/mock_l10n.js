var MockMozL10n = {
  get: function get(key) {
    return key;
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
  get: function get(callback) {
    if (callback) {
      callback(function _(key) {
        return key;
      });
    }
  }
};
