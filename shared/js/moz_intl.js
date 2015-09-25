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
    return navigator.mozL10n.formatValue('listSeparator_middle').then(sep => {
      return list.join(sep);
    });
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

    return {
      format: function(date, tokenFormats) {
        var dayPeriod;

        var string = intlFormat.format(date);

        if (options.dayperiod === false &&
            intlFormat.resolvedOptions().hour12 === true) {
          dayPeriod = date.toLocaleFormat('%p');
          string = string.replace(dayPeriod, '').trim();
        } else if (options.dayperiod === true &&
           options.hour === undefined) {
          dayPeriod = date.toLocaleFormat('%p');
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
   * }).then(formatter => {
   *   formatter.format(milliseconds); // 02:12:34 in en-US
   * });
   *
   * 2) msS - Minutes, Seconds, Milliseconds
   *
   * mozIntl.DurationFormat(navigator.languages, {
   * }).then(formatter => {
   *   formatter.format(milliseconds); // 12:34.80 in en-US
   * });
   *
   * @param {Array} An array of languages
   * @param {Array} Options object with `type`
   * @returns {Promise} A promise of a formatter
   */
  DurationFormat: function(locales, options) {
    const type = options.type;

    if (type !== 'hms' && type !== 'msS') {
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
          var hour, min, sec, ms;
          var totalTime = input;

          hour = Math.floor(totalTime / (1000 * 60 * 60));
          totalTime -= hour * (1000 * 60 * 60);
          min = Math.floor(totalTime / (1000 * 60));
          totalTime -= min * (1000 * 60);
          if (type === 'hms') {
            sec = Math.round(totalTime / 1000);
          } else {
            sec = Math.floor(totalTime / 1000);
            totalTime -= sec * 1000;
            // here we take tens of a msec only
            ms = Math.round(totalTime / 10);
          }

          var string = fmt;
          if (type === 'hms') {
            string = string.replace('hh', numFormatter.format(hour));
          }
          string = string.replace('mm', numFormatter.format(min));
          string = string.replace('ss', numFormatter.format(sec));
          if (type === 'msS') {
            string = string.replace('SS', numFormatter.format(ms));
          }
          return string;
        }
      };
    });
  }
};

})(this);
