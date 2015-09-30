(function(global) {
'use strict';

global.MockMozIntl = {
  formatList: function(list) {
    return Promise.resolve(list.join(', '));
  },
  DateTimeFormat: function(locales, options) {
    var formatter = Intl.DateTimeFormat(locales, options);
    return {
      // we need this because mozIntl options extend Intl options
      resolvedOptions() { return options; },
      format: formatter.format.bind(formatter)
    };
  },
  calendarInfo: function(token) {
    return Promise.resolve(0);
  },
  DurationFormat: function(locales, options) {
    return Promise.resolve({
      format: function(input) {
        return JSON.stringify({ value: input, options: options });
      }
    });
  },
  RelativeTimeFormat: function(locales, options) {
    return {
      format: function(value) {
        return Promise.resolve();
      }
    };
  },
  _gaia: {
    relativeParts: function(ms) {
      return {
        unit: 'minutes',
        value: 5
      };
    },
    RelativeDate: function(locales, options) {
      return {
        format: function(value) {
          return Promise.resolve();
        }
      };
    },
  }
};

}(this));
