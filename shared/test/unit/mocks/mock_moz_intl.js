(function(global) {
'use strict';


global.MockMozIntl = {
  ListFormat: function(locales, options) {
    return {
      format: function(input) {
        return Promise.resolve(
          input.join(', ')
        );
      },
      formatToParts: function(input) {
        return Promise.resolve([]);
      }
    };
  },
  getCalendarInfo: function(token) {
    return Promise.resolve(0);
  },
  DurationFormat: function(locales, options) {
    return {
      format: function(input) {
        return Promise.resolve(
          JSON.stringify({ value: input, options: options })
        );
      },
      formatToParts: function(input) {
        return Promise.resolve([]);
      }
    };
  },
  RelativeTimeFormat: function(locales, options) {
    return {
      format: function(input) {
        return Promise.resolve(
          JSON.stringify({ value: input, options: options })
        );
      },
      formatToParts: function(input) {
        return Promise.resolve([]);
      }
    };
  },
  UnitFormat: function(locales, options) {
    return {
      format: function(input) {
        return Promise.resolve(
          JSON.stringify({ value: input, options: options })
        );
      },
      formatToParts: function(input) {
        return Promise.resolve([]);
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
    _stringifyUnit(type, style, v) {
      var args = JSON.stringify({value: parseInt(v)});
      return `${type}-selected-${style}${args}`;
    }
  }
};

}(this));
