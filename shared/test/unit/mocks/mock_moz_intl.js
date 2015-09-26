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
  DurationFormat: function(locales, options) {
    return Promise.resolve({
      format: function(input) {
        return JSON.stringify({ value: input, options: options });
      }
    });
  }
};

}(this));
