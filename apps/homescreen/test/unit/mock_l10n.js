window.realL10n = window.navigator.mozL10n;

window.navigator.mozL10n = {
  get: function get(key) {
    var ret = key;

    if (key === 'shortTimeFormat') {
      ret = '%I:%M %p';
    } else if (key === 'longDateFormat') {
      ret = '%A, %B %e';
    }

    return ret;
  },

  DateTimeFormat: function() {
    this.localeFormat = function(date, format) {
      return '12:02PM';
    };
  },

  ready: function() {
  },

  language: {
    code: 'en-US',
    direction: 'LTR'
  },

  translate: function() {

  }
};
