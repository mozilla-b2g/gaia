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

    if (resolvedOptions.dayperiod) {
      if (resolvedOptions.hour === undefined) {
        resolvedOptions.hour = 'numeric';
      }
    }

    if (resolvedOptions.hour !== undefined &&
        resolvedOptions.hour12 === undefined) {
      resolvedOptions.hour12 = navigator.mozHour12;
    }

    if (resolvedOptions.dayperiod === undefined &&
        resolvedOptions.hour12 === true) {
      resolvedOptions.dayperiod = true;
    }

    var intlFormat = new Intl.DateTimeFormat(locales, resolvedOptions);

    resolvedOptions.locale = intlFormat.resolvedOptions().locale;
    resolvedOptions.hour12 = intlFormat.resolvedOptions().hour12;

    // This is needed for a workaround for bug 1208808
    // Remove when that bug is fixed
    var hourFormatter;
    if (resolvedOptions.dayperiod !== undefined &&
        resolvedOptions.hour12 === true) {
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

        if (resolvedOptions.dayperiod === false &&
            resolvedOptions.hour12 === true) {
          dayPeriod = getDayPeriodTokenForDate(date, hourFormatter);
          string = string.replace(dayPeriod, '').trim();
        } else if (resolvedOptions.dayperiod === true &&
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
            resolvedOptions.hour12 === false) {
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
   * Currently accepted options:
   *  - maxUnit
   *  - minUnit
   * both can take values hour | minute | second | millisecond
   *
   * Examples:
   *
   * mozIntl.DurationFormat(navigator.languages, {
   *   minUnit: 'second',
   *   maxUnit: 'hour'
   * }).then(formatter =>
   *   formatter.format(milliseconds); // 02:12:34 in en-US
   * );
   *
   * mozIntl.DurationFormat(navigator.languages, {
   *   minUnit: 'millisecond',
   *   maxUnit: 'minute'
   * }).then(formatter =>
   *   formatter.format(milliseconds); // 12:34.80 in en-US
   * );
   *
   * @param {Array} An array of languages
   * @param {Array} Options object with `minUnit` and `maxUnit`
   * @returns {Promise} A promise of a formatter
   */
  DurationFormat: function(locales = navigator.languages, options = {}) {

    const resolvedOptions = Object.assign({
      locale: locales[0],
      maxUnit: 'hour',
      minUnit: 'second',
    }, options);

    const numFormatter = Intl.NumberFormat(locales, {
      style: 'decimal',
      useGrouping: false,
      minimumIntegerDigits: 2
    });

    const maxUnitIdx = getDurationUnitIdx(resolvedOptions.maxUnit, 0);
    const minUnitIdx = getDurationUnitIdx(resolvedOptions.minUnit,
      durationFormatOrder.length - 1);

    return navigator.mozL10n.formatValue('durationPattern').then(fmt => ({
      resolvedOptions: function() { return resolvedOptions; },
      format: function(input) {
        // Rounding minUnit to closest visible unit
        const minValue = durationFormatElements[resolvedOptions.minUnit].value;
        input = Math.round(input / minValue) * minValue;

        const duration = splitIntoTimeUnits(input, maxUnitIdx, minUnitIdx);

        var string = trimDurationPattern(fmt,
          resolvedOptions.maxUnit, resolvedOptions.minUnit);


        for (var unit in duration) {
          const token = durationFormatElements[unit].token;

          string = string.replace(token,
            numFormatter.format(duration[unit]));
        }

        if (input < 0) {
          return '-' + string;
        }
        return string;
      }
    }));
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
      resolvedOptions: function() { return options; },
      /*
       * ECMA 402 rev 3., 1.3.4, FormatRelativeTime
       *
       * Notes: This is a modified version of the function to use mozL10n
       * and simplified to match current data set in data.properties
       */
      format: function(x) {
        const {unit, value} = relativeTimeFormatId(x, options);
        return navigator.mozL10n.formatValue(unit, {
          value
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
    RelativeDate: function(locales, options) {
      const style = options && options.style || 'long';
      const maxFormatter = Intl.DateTimeFormat(locales, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const relativeFmtOptions = {
        unit: 'bestFit',
        style: style,
        minUnit: 'minute',
      };

      return {
        format: function(time, maxDiff) {
          maxDiff = maxDiff || 86400 * 10; // default = 10 days
          const secDiff = (Date.now() - time) / 1000;
          if (isNaN(secDiff)) {
            return navigator.mozL10n.formatValue('incorrectDate');
          }

          if (secDiff > maxDiff) {
            return Promise.resolve(maxFormatter.format(time));
          }

          const {unit, value} = relativeTimeFormatId(time, relativeFmtOptions);
          return navigator.mozL10n.formatValue(unit, {
            value
          });
        },
        formatElement: function(element, time, maxDiff) {
          maxDiff = maxDiff || 86400 * 10; // default = 10 days
          const secDiff = (Date.now() - time) / 1000;
          if (isNaN(secDiff)) {
            element.setAttribute('data-l10n-id', 'incorrectDate');
          }

          element.removeAttribute('data-l10n-id');
          if (secDiff > maxDiff) {
            element.textContent = maxFormatter.format(time);
          }

          const {unit, value} = relativeTimeFormatId(time, relativeFmtOptions);
          navigator.mozL10n.setAttributes(element, unit, {
            value
          });
        },
      };
    },
  }
};

/*
 * This data is used by DurationFormat
 */
/*jshint unused:false*/
const durationFormatOrder = ['hour', 'minute', 'second', 'millisecond'];
const durationFormatElements = {
  'hour': {value: 3600000, token: 'hh'},
  'minute': {value: 60000, token: 'mm'},
  'second': {value: 1000, token: 'ss'},
  // rounding milliseconds to tens
  'millisecond': {value: 10, token: 'SS'}
};

/*
 * This helper function is used by splitIntoTimeUnits
 */
function getDurationUnitIdx(name, defaultValue) {
  if (!name) {
    return defaultValue;
  }
  const pos = durationFormatOrder.indexOf(name);
  if (pos === -1) {
    throw new Error('Unknown unit type: ' + name);
  }
  return pos;
}

/*
 * This helper function is used by DurationFormat
 */
function splitIntoTimeUnits(v, maxUnitIdx, minUnitIdx) {
  const units = {};
  var input = Math.abs(v);


  for (var i = maxUnitIdx; i <= minUnitIdx; i++) {
    const key = durationFormatOrder[i];
    const {value} = durationFormatElements[key];
    units[key] = i == minUnitIdx ?
      Math.round(input / value) :
      Math.floor(input / value);
    input -= units[key] * value;
  }
  return units;
}

function trimDurationPattern(string, maxUnit, minUnit) {
  const maxToken = durationFormatElements[maxUnit].token;
  const minToken = durationFormatElements[minUnit].token;

  // We currently know of no format that would require reverse order
  // Even RTL languages use LTR duration formatting, so all we care
  // are separators.
  string = string.substring(
    string.indexOf(maxToken),
    string.indexOf(minToken) + minToken.length);
  return string;
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

function relativeTimeFormatId(x, options) {
  const ms = x - Date.now();
  const units = computeTimeUnits(ms);

  const unit = options.unit === 'bestFit' ?
    getBestMatchUnit(units) : options.unit;

  const v = units[unit];

  // CLDR uses past || future
  const tl = v < 0 ? '-ago' : '-until';
  const style = options.style || 'long';

  const entry = unit + 's' + tl + '-' + style;

  return {
    unit: entry,
    value: Math.abs(v)
  };
}

})(this);
