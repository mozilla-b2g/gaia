(function(global) {
'use strict';

global.mozIntl = {
  /**
   * Format an Array of strings using locale specific separators.
   * Currently it only uses middle separator resulting in a local
   * equivalent of 'X, Y, Z'.
   *
   * In the Intl API it will support start/end separators allowing for
   * things like 'X, Y and Z'.
   *
   * @param {Array} An array of strings to be formatted
   * @returns {Promise} A promise of a string
   */
  formatList: function(list) {
    return navigator.mozL10n.formatValue('listSeparator_middle').then(
      sep => list.join(sep)
    );
  },

  /**
   * Overload of Intl.DateTimeFormat that extends with future features.
   *
   * 1) dayperiod token
   *
   * `dayperiod` token allows to decide whether the formatted time should
   * contain dayperiod token. The value may be true or false.
   *
   * Example:
   *
   * mozIntl.DateTimeFormat(navigator.languages, {
   *   dayperiod: true,
   *   hour12: navigator.mozHour12,
   *   hour: 'numeric',
   *   minute: 'numeric'
   * });
   *
   * 2) Token formatting
   *
   * This feature allows for formatting of tokens in the result string.
   *
   * Example:
   *
   * var f = mozIntl.DateTimeFormat(navigator.languages, {
   *   weekday: 'long',
   *   day: 'numeric',
   *   month: 'long'
   * });
   * 
   * f.format(date, {
   *  day: '<strong>$&</strong>',
   * });
   *
   * Warning: Current implementation is very fragile. Be very careful when
   * choosing tokens to be formatted. The formatter will replace the
   * first occurrence of the returned string, so if you try to format
   * dayperiod ('am') in a string that also contains weekday that has this
   * string, you may end up with bad formatting. Example:
   *
   * French for Saturday is "samedi". So formatting weekday in the same string
   * as dayperiod will result in "s<strong>am</strong>edi, 8:53 am".
   *
   * It's best to make sure that your formatted token is the only number or
   * the only string. Examples:
   *
   * * dayperiod in Hour:Minute am/pm
   * * day in "Saturday, July 23"
   *
   */
  DateTimeFormat: function(locales, options) {
    const resolvedOptions = Object.assign({}, options);

    if (options.dayperiod) {
      if (!('hour' in options)) {
        resolvedOptions.hour = 'numeric';
      }
    }

    if (resolvedOptions.hour &&
        !options.hasOwnProperty('hour12')) {
      resolvedOptions.hour12 = navigator.mozHour12;
    }

    var intlFormat = new Intl.DateTimeFormat(locales, resolvedOptions);

    // This is needed for a workaround for bug 1208808
    // Remove when that bug is fixed
    var hourFormatter;
    if (options.dayperiod === true || options.dayperiod === false &&
        intlFormat.resolvedOptions().hour12 === true) {
      hourFormatter = Intl.DateTimeFormat(locales, {
        hour: 'numeric',
        hour12: false
      });
    }

    return {
      resolvedOptions() { return resolvedOptions; },
      format: function(date, tokenFormats) {
        var dayPeriod;

        var string = intlFormat.format(date);

        if (options.dayperiod === false &&
            intlFormat.resolvedOptions().hour12 === true) {
          dayPeriod = getDayPeriodTokenForDate(date, hourFormatter);
          string = string.replace(dayPeriod, '').trim();
        } else if (options.dayperiod === true &&
           options.hour === undefined) {
          dayPeriod = getDayPeriodTokenForDate(date, hourFormatter);
          const hour = date.toLocaleString(navigator.languages, {
            hour12: true,
            hour: 'numeric'
          }).replace(dayPeriod, '').trim();
          string = string.replace(hour, '').trim();
        }

        for (var token in tokenFormats) {
          if (token === 'dayperiod' &&
            intlFormat.resolvedOptions().hour12 === false) {
            continue;
          }
          const localOptions = {
            [token]: resolvedOptions[token],
          };

          var formatter = global.mozIntl.DateTimeFormat(
            navigator.languages, localOptions);
          var tokenString = formatter.format(date);
          string = string.replace(tokenString, tokenFormats[token]);
        }
        return string;
      },
    };
  },

  /**
   * Return locale specific infromation about calendar system.
   *
   * Currently supports:
   *   * firstDayOfTheWeek: 0 - Sunday, 1 - Monday, etc.
   *
   * @param {String} Identifier of a token to be retrieved
   * @returns {Promise} A promise of value corresponding to a token
   */
  calendarInfo: function(token) {
    switch (token) {
      case 'firstDayOfTheWeek':
        return navigator.mozL10n.formatValue('firstDayOfTheWeek').then(
          firstDayOfTheWeek => parseInt(firstDayOfTheWeek) % 7);
      default:
        throw new Error('Unknown token: ' + token);
    }
  },

  /**
   * Duration formatter.
   * Formats an integer with milliseconds into locale specific duration string.
   *
   * The shim differs from Intl API formatters in that it returns a Promise
   * because it relies on L20n so it has to be asynchronous.
   * Intl API will probably be synchronous.
   *
   * Currently accepted tokens:
   *
   * 1) hms - Hours, Minutes, Seconds
   *
   * mozIntl.DurationFormat(navigator.languages, {
   *   type: 'hmS'
   * }).then(formatter =>
   *   formatter.format(milliseconds); // 02:12:34 in en-US
   * );
   *
   * 2) msS - Minutes, Seconds, Milliseconds
   *
   * mozIntl.DurationFormat(navigator.languages, {
   * }).then(formatter =>
   *   formatter.format(milliseconds); // 12:34.80 in en-US
   * );
   *
   * @param {Array} An array of languages
   * @param {Array} Options object with `type`
   * @returns {Promise} A promise of a formatter
   */
  DurationFormat: function(locales, options) {
    const type = options.type;

    if (!durationFormats.hasOwnProperty(type)) {
      throw new Error('Unknown formatting type: ' + type);
    }

    const numFormatter = Intl.NumberFormat(locales, {
      style: 'decimal',
      useGrouping: false,
      minimumIntegerDigits: 2
    });

    return navigator.mozL10n.formatValue('timePattern_' + type).then(fmt => {
      return {
        format: function(input) {
          const format = durationFormats[type];
          const duration = splitIntoTimeUnits(input, format.max, format.min);

          if (duration.hasOwnProperty('millisecond')) {
            // We round milliseconds to 2-digit
            duration.millisecond =
              Math.round(duration.millisecond / 10);
          }

          var string = fmt;

          format.tokens.forEach(([token, unit]) =>
            string = string.replace(token, numFormatter.format(duration[unit]))
          );
          return string;
        }
      };
    });
  },

  /**
   * RelativeTime formatter.
   * Formats an integer with milliseconds into locale specific relative time 
   * string.
   *
   * Currently accepted options:
   *
   * * style - long | short
   *
   * Defines whether the string will be long "1 minute ago" or short "1 min. 
   * ago"
   *
   * * minUnit - (default) millisecond
   * * maxUnit - (default) year
   * * unit - second | minute | hour | day | week | month | year
   *          (default) bestFit
   *
   * Example:
   *
   * const formatter = new Intl.RelativeTimeFormat(navigator.languages, {
   *   unit: 'bestFit',
   *   style: long'
   * });
   *
   * var ms = Date.now() - 2 * 1000;
   *
   * formatter.format(ms); // "2 seconds ago"
   *
   * @param {Array} An array of languages
   * @param {Array} Options object
   * @returns An object with a formatter that returns Promises of strings
   */
  RelativeTimeFormat: function(locales, options) {
    return {
      /*
       * ECMA 402 rev 3., 1.3.4, FormatRelativeTime
       *
       * Notes: This is a modified version of the function to use mozL10n
       * and simplified to match current data set in data.properties
       */
      format: function(x) {
        const ms = x - Date.now();
        const units = computeTimeUnits(ms);

        const unit = options.unit === 'bestFit' ?
          getBestMatchUnit(units) : options.unit;

        const v = units[unit];

        // CLDR uses past || future
        const tl = v < 0 ? '-ago' : '-until';
        const style = options.style || 'long';

        const entry = unit + 's' + tl + '-' + style;

        return navigator.mozL10n.formatValue(entry, {
          value: Math.abs(v)
        });
      },
    };
  },

  _gaia: {
    // This is an internal Firefox OS function, not part of the future standard
    relativePart: function(milliseconds) {
      const units = computeTimeUnits(milliseconds);
      const unit = getBestMatchUnit(units);
      return {
        unit: unit + 's',
        value: Math.abs(units[unit])
      };
    },

    // This is an internal Firefox OS function, not part of the future standard
    relativeDate: function(time, useCompactFormat, maxDiff) {
      maxDiff = maxDiff || 86400 * 10; // default = 10 days
      const secDiff = (Date.now() - time) / 1000;
      if (isNaN(secDiff)) {
        return navigator.mozL10n.formatValue('incorrectDate');
      }

      if (secDiff > maxDiff) {
        const dateString = new Date(time).toLocaleString(navigator.languages, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        return Promise.resolve(dateString);
      }

      const formatter = global.mozIntl.RelativeTimeFormat(navigator.languages, {
        unit: 'bestFit',
        style: useCompactFormat ? 'short' : 'long',
        minUnit: 'minute',
      });

      return formatter.format(time);
    },
  }
};

/*
 * This data is used by DurationFormat
 */
const durationUnits = [
  ['year', 3600000 * 24 * 365], // 1000 * 60 * 60 * 24 * 365
  ['month', 3600000 * 24 * 30], // 1000 * 60 * 60 * 24 * 30
  ['week', 3600000 * 24 * 7], // 1000 * 60 * 60 * 24 * 7
  ['day', 3600000 * 24], // 1000 * 60 * 60 * 24
  ['hour', 3600000], // 1000 * 60 * 60
  ['minute', 60000], // 1000 * 60
  ['second', 1000],
  ['millisecond', 1],
];

/*
 * This data is used by DurationFormat
 */
/*jshint unused:false*/
const durationFormats = {
  'hms': {
    max: 'hour',
    min: 'second',
    tokens: [
      ['hh', 'hour'],
      ['mm', 'minute'],
      ['ss', 'second']
    ]
  },
  'msS': {
    max: 'minute',
    min: 'millisecond',
    tokens: [
      ['mm', 'minute'],
      ['ss', 'second'],
      ['SS', 'millisecond']
    ]
  },
};

/*
 * This helper function is used by splitIntoTimeUnits
 */
function getDurationUnitIdx(name, defaultValue) {
  if (!name) {
    return defaultValue;
  }
  const pos = durationUnits.findIndex(unit => unit[0] === name);
  if (pos === -1) {
    throw new Error('Unknown unit type: ' + name);
  }
  return pos;
}


/**
 * This helper function is used by mozIntl.DateTimeFormat
 *
 * This is necessary because sometimes toLocaleFormat
 * uses different timezone than Intl API
 * which leads to it resolving %p to 'PM' while Intl is in 'AM'
 * 
 * So what we do here, is we force the same hour in toLocaleFormat API
 * as we use in Intl API, to enforce the same dayperiod to remove it.
 * Remove once bug 1208808 is fixed
 */
function getDayPeriodTokenForDate(date, hourFormatter) {
  const hourToken = hourFormatter.format(date);
  const newDate = new Date(date);
  newDate.setHours(parseInt(hourToken));
  return newDate.toLocaleFormat('%p');
}

/*
 * ECMA 402 rev 3., 1.3.4, ComputeTimeUnits
 */
function computeTimeUnits(v) {
  const units = {};
  const millisecond = Math.round(v);
  const second = Math.round(millisecond / 1000);
  const minute = Math.round(second / 60);
  const hour = Math.round(minute / 60);
  const day = Math.round(hour / 24);
  const rawYear = day * 400 / 146097;
  units.millisecond = millisecond;
  units.second = second;
  units.minute = minute;
  units.hour = hour;
  units.day = day;
  units.week = Math.round(day / 7);
  units.month = Math.round(rawYear * 12);
  units.quarter = Math.round(rawYear * 4);
  units.year = Math.round(rawYear);
  return units;
}

/*
 * This helper function is used by DurationFormat
 */
function splitIntoTimeUnits(v, maximumUnit, minimumUnit) {
  const units = {};
  var input = Math.abs(v);

  const maxUnitIdx = getDurationUnitIdx(maximumUnit, 0);
  const minUnitIdx =
    getDurationUnitIdx(minimumUnit, durationUnits.length - 1);

  for (var i = maxUnitIdx; i <= minUnitIdx; i++) {
    const [key, value] = durationUnits[i];
    units[key] = i == minUnitIdx ? 
      Math.round(input / value) :
      Math.floor(input / value);
    input -= units[key] * value;
  }
  return units;
}

/*
 * ECMA 402 rev 3., 1.3.4, GetBestMatchUnit
 */
function getBestMatchUnit(units) {
  //if (Math.abs(units.second) < 45) { return 'second'; }
  if (Math.abs(units.minute) < 45) { return 'minute'; }
  if (Math.abs(units.hour) < 22) { return 'hour'; }
  // Intl uses 26 days here
  if (Math.abs(units.day) < 7) { return 'day'; }
  if (Math.abs(units.week) < 4) { return 'week'; }
  if (Math.abs(units.month) < 11) { return 'month'; }
  //if (Math.abs(units.quarter) < 4) { return 'quarter'; }
  return 'year';
}

})(this);
