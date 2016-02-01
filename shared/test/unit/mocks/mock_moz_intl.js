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
  UnitFormat: function(locales, options) {
    return {
      format: function(value) {
        return Promise.resolve();
      }
    };
  },
  _gaia: {
    relativePart: function(ms) {
      return {
        unit: 'minutes',
        value: Math.abs(parseInt(ms / 1000 / 60))
      };
    },
    RelativeDate: function(locales, options) {
      return {
        format: function(value) {
          return Promise.resolve('pretty date');
        },
        formatElement: function(element, time, maxDiff) {}
      };
    },
    getFormattedUnit(type, style, v) {
      var returnVal = global.MockMozIntl._gaia._stringifyUnit(type, style, v);
      return Promise.resolve(returnVal);
    },
    _stringifyUnit(type, style, v) {
      var args = JSON.stringify({value: parseInt(v)});
      return `${type}-selected-${style}${args}`;
    }
  }
};

}(this));
