/* jshint ignore:start */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
  'use strict';

  let BaseFormat = function () {
    function BaseFormat(locales = 'en-US', options = {}, defaultOptions = {}) {
      _classCallCheck(this, BaseFormat);

      const localeList = Array.isArray(locales) ? locales : [locales];

      this._resolvedOptions = Object.assign(defaultOptions, options);
      this._resolvedOptions.locale = localeList[0];
    }

    _createClass(BaseFormat, [{
      key: 'resolvedOptions',
      value: function resolvedOptions() {
        return this._resolvedOptions;
      }
    }]);

    return BaseFormat;
  }();

  function deconstructPattern(pattern, placeables) {
    const parts = pattern.split(/\{([^\}]+)\}/);
    const result = [];

    parts.forEach((part, i) => {
      if (i % 2 === 0) {
        if (part.length > 0) {
          result.push({ type: 'literal', value: part });
        }
      } else {
        const subst = placeables[part];
        if (!subst) {
          throw new Error(`Missing placeable: "${ part }"`);
        }
        if (Array.isArray(subst)) {
          result.push(...subst);
        } else {
          result.push(subst);
        }
      }
    });
    return result;
  }

  function constructParts(pattern, list) {
    if (list.length === 1) {
      return [{ type: 'element', value: list[0] }];
    }

    const elem0 = typeof list[0] === 'string' ? { type: 'element', value: list[0] } : list[0];

    let elem1;

    if (list.length === 2) {
      if (typeof list[1] === 'string') {
        elem1 = { type: 'element', value: list[1] };
      } else {
        elem1 = list[1];
      }
    } else {
      elem1 = constructParts(pattern, list.slice(1));
    }

    return deconstructPattern(pattern, {
      '0': elem0,
      '1': elem1
    });
  }

  function FormatToParts(type, style, list) {
    if (!Array.isArray(list)) {
      return Promise.resolve([{ type: 'element', value: list }]);
    }

    const length = list.length;

    if (length === 0) {
      return Promise.resolve([{ type: 'element', value: '' }]);
    }

    if (length === 1) {
      return Promise.resolve([{ type: 'element', value: list[0] }]);
    }

    if (type === 'unit' || type === 'number') {
      return document.l10n.formatValue(`listformat-${ type }`).then(pattern => {
        return constructParts(pattern, list);
      });
    }

    const strid = `listformat-${ type }-${ style }`;

    if (length === 2) {
      return document.l10n.formatValue(`${ strid }-2`).then(pattern => {
        return constructParts(pattern, list);
      });
    }

    return document.l10n.formatValues(`${ strid }-start`, `${ strid }-middle`, `${ strid }-end`).then(([start, middle, end]) => {
      let parts = constructParts(start, [list[0], constructParts(middle, list.slice(1, -1))]);

      parts = constructParts(end, [parts, list[list.length - 1]]);

      return parts;
    });
  }

  let ListFormat = function (_BaseFormat) {
    _inherits(ListFormat, _BaseFormat);

    function ListFormat(locales, options) {
      _classCallCheck(this, ListFormat);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(ListFormat).call(this, locales, options, {
        type: 'regular',
        style: 'long'
      }));
    }

    _createClass(ListFormat, [{
      key: 'format',
      value: function format(list) {
        const type = this._resolvedOptions.type;
        const style = this._resolvedOptions.style;
        return FormatToParts(type, style, list).then(parts => {
          return parts.reduce((string, part) => string + part.value, '');
        });
      }
    }, {
      key: 'formatToParts',
      value: function formatToParts(list) {
        const type = this._resolvedOptions.type;
        const style = this._resolvedOptions.style;
        return FormatToParts(type, style, list);
      }
    }]);

    return ListFormat;
  }(BaseFormat);

  function getCalendarInfo(token) {
    switch (token) {
      case 'firstDayOfTheWeek':
        return document.l10n.formatValue('firstDayOfTheWeek').then(firstDayOfTheWeek => parseInt(firstDayOfTheWeek) % 7);
      default:
        throw new Error('Unknown token: ' + token);
    }
  }

  const durationFormatOrder = ['hour', 'minute', 'second', 'millisecond'];
  const durationFormatElements = {
    'hour': { value: 3600000, token: 'hh' },
    'minute': { value: 60000, token: 'mm' },
    'second': { value: 1000, token: 'ss' },
    // rounding milliseconds to tens
    'millisecond': { value: 10, token: 'SS' }
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
  function splitIntoTimeUnits(v, maxUnitIdx, minUnitIdx, formatter) {
    const units = {};
    let input = Math.abs(v);

    for (let i = maxUnitIdx; i <= minUnitIdx; i++) {
      const key = durationFormatOrder[i];
      const { value, token } = durationFormatElements[key];
      const roundedValue = i === minUnitIdx ? Math.round(input / value) : Math.floor(input / value);
      units[token] = {
        type: key,
        value: formatter.format(roundedValue)
      };
      input -= roundedValue * value;
    }
    return units;
  }

  function trimDurationPattern(string, maxUnit, minUnit) {
    const maxToken = durationFormatElements[maxUnit].token;
    const minToken = durationFormatElements[minUnit].token;

    // We currently know of no format that would require reverse order
    // Even RTL languages use LTR duration formatting, so all we care
    // are separators.
    string = string.substring(string.indexOf('{' + maxToken + '}'), string.indexOf('{' + minToken + '}') + minToken.length + 2);
    return string;
  }

  function FormatToParts$1(minUnit, maxUnit, input) {
    return document.l10n.formatValue('durationformat-pattern').then(fmt => {
      // Rounding minUnit to closest visible unit
      const minValue = durationFormatElements[minUnit].value;
      input = Math.round(input / minValue) * minValue;

      const duration = splitIntoTimeUnits(input, this._maxUnitIdx, this._minUnitIdx, this._numFormatter);

      const string = trimDurationPattern(fmt, maxUnit, minUnit);

      const parts = deconstructPattern(string, duration);

      if (input < 0) {
        parts.unshift({ type: 'negativeSign', value: '-' });
      }
      return parts;
    });
  }

  let DurationFormat = function (_BaseFormat2) {
    _inherits(DurationFormat, _BaseFormat2);

    function DurationFormat(locales, options) {
      _classCallCheck(this, DurationFormat);

      var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(DurationFormat).call(this, locales, options, {
        maxUnit: 'hour',
        minUnit: 'second'
      }));

      _this2._numFormatter = new Intl.NumberFormat(locales, {
        style: 'decimal',
        useGrouping: false,
        minimumIntegerDigits: 2
      });

      _this2._maxUnitIdx = getDurationUnitIdx(_this2._resolvedOptions.maxUnit, 0);
      _this2._minUnitIdx = getDurationUnitIdx(_this2._resolvedOptions.minUnit, durationFormatOrder.length - 1);
      return _this2;
    }

    _createClass(DurationFormat, [{
      key: 'format',
      value: function format(input) {
        const minUnit = this._resolvedOptions.minUnit;
        const maxUnit = this._resolvedOptions.maxUnit;
        return FormatToParts$1.call(this, minUnit, maxUnit, input).then(parts => {
          return parts.reduce((string, part) => string + part.value, '');
        });
      }
    }, {
      key: 'formatToParts',
      value: function formatToParts(input) {
        const minUnit = this._resolvedOptions.minUnit;
        const maxUnit = this._resolvedOptions.maxUnit;
        return FormatToParts$1.call(this, minUnit, maxUnit, input);
      }
    }]);

    return DurationFormat;
  }(BaseFormat);

  function computeTimeUnits(v) {
    /*eslint no-magic-numbers: [0]*/
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

  function getBestMatchUnit(units) {
    /*eslint brace-style: [0]*/
    //if (Math.abs(units.second) < 45) { return 'second'; }
    if (Math.abs(units.minute) < 45) {
      return 'minute';
    }
    if (Math.abs(units.hour) < 22) {
      return 'hour';
    }
    // Intl uses 26 days here
    if (Math.abs(units.day) < 7) {
      return 'day';
    }
    if (Math.abs(units.week) < 4) {
      return 'week';
    }
    if (Math.abs(units.month) < 11) {
      return 'month';
    }
    //if (Math.abs(units.quarter) < 4) { return 'quarter'; }
    return 'year';
  }

  function relativeTimeFormatId(x, unit, style) {
    const ms = x - Date.now();

    const units = computeTimeUnits(ms);

    if (unit === 'bestFit') {
      unit = getBestMatchUnit(units);
    }

    const v = units[unit];

    // CLDR uses past || future
    const tl = v < 0 ? '-ago' : '-until';

    const entry = unit + 's' + tl + '-' + style;

    return {
      patternId: entry,
      value: Math.abs(v)
    };
  }

  function FormatToParts$2(unit, style, x) {
    const { patternId, value } = relativeTimeFormatId(x, unit, style);
    return document.l10n.formatValue(patternId, {
      value
    }).then(pattern => {
      return deconstructPattern(pattern, {
        value: { type: 'number', value }
      });
    });
  }

  let RelativeTimeFormat = function (_BaseFormat3) {
    _inherits(RelativeTimeFormat, _BaseFormat3);

    function RelativeTimeFormat(locales, options) {
      _classCallCheck(this, RelativeTimeFormat);

      return _possibleConstructorReturn(this, Object.getPrototypeOf(RelativeTimeFormat).call(this, locales, options, {
        style: 'long',
        unit: 'bestFit'
      }));
    }

    _createClass(RelativeTimeFormat, [{
      key: 'format',
      value: function format(x) {
        const unit = this._resolvedOptions.unit;
        const style = this._resolvedOptions.style;
        return FormatToParts$2(unit, style, x).then(parts => {
          return parts.reduce((string, part) => string + part.value, '');
        });
      }
    }, {
      key: 'formatToParts',
      value: function formatToParts(x) {
        const unit = this._resolvedOptions.unit;
        const style = this._resolvedOptions.style;
        return FormatToParts$2(unit, style, x);
      }
    }]);

    return RelativeTimeFormat;
  }(BaseFormat);

  const unitFormatGroups = {
    'duration': {
      'units': ['second', 'minute', 'hour', 'day', 'month'],
      'styles': ['narrow'],
      'rounding': 1
    },
    'digital': {
      'units': ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'],
      'styles': ['short'],
      'rounding': 0.8
    }
  };

  const unitFormatData = {
    /*eslint no-magic-numbers: [0]*/
    'duration': [{ 'name': 'second', 'value': 1 }, { 'name': 'minute', 'value': 60 }, { 'name': 'hour', 'value': 60 * 60 }, { 'name': 'day', 'value': 24 * 60 * 60 }, { 'name': 'month', 'value': 30 * 24 * 60 * 60 }],
    'digital': [{ 'name': 'byte', 'value': 1 }, { 'name': 'kilobyte', 'value': 1024 }, { 'name': 'megabyte', 'value': 1024 * 1024 }, { 'name': 'gigabyte', 'value': 1024 * 1024 * 1024 }, { 'name': 'terabyte', 'value': 1024 * 1024 * 1024 * 1024 }]
  };

  function getUnitFormatGroupName(unit) {
    /*eslint prefer-const: 0*/
    for (let groupName in unitFormatGroups) {
      if (unitFormatGroups[groupName].units.includes(unit)) {
        return groupName;
      }
    }

    return undefined;
  }

  function selectUnit(type, x) {
    const units = unitFormatData[type];

    let scale = 0;

    for (let i = 1; i < units.length; i++) {
      if (x < units[i].value * unitFormatGroups[type].rounding) {
        scale = i - 1;
        break;
      } else if (i === units.length - 1) {
        scale = i;
      }
    }

    const value = Math.round(x / units[scale].value * 100) / 100;

    return {
      unit: units[scale].name,
      value
    };
  }

  function FormatToParts$3(patternId, x) {
    return document.l10n.formatValue(patternId, {
      value: x
    }).then(pattern => {
      return deconstructPattern(pattern, {
        value: { type: 'number', value: x }
      });
    });
  }

  let UnitFormat = function (_BaseFormat4) {
    _inherits(UnitFormat, _BaseFormat4);

    function UnitFormat(locales, options) {
      _classCallCheck(this, UnitFormat);

      var _this4 = _possibleConstructorReturn(this, Object.getPrototypeOf(UnitFormat).call(this, locales, options, {
        unit: 'bestFit',
        style: 'long'
      }));

      if (_this4._resolvedOptions.unit !== 'bestFit') {
        _this4._resolvedOptions.type = getUnitFormatGroupName(_this4._resolvedOptions.unit);
      }

      if (_this4._resolvedOptions.type === undefined) {
        throw new RangeError(`invalid value ${ options.unit } for option unit`);
      }

      if (!unitFormatGroups[_this4._resolvedOptions.type].styles.includes(_this4._resolvedOptions.style)) {
        throw new RangeError(`invalid value ${ options.style } for option style`);
      }
      return _this4;
    }

    _createClass(UnitFormat, [{
      key: 'format',
      value: function format(x) {
        if (isNaN(parseInt(x))) {
          return Promise.resolve(undefined);
        }
        const type = this._resolvedOptions.type;
        let unit, value;
        if (this._resolvedOptions.unit === 'bestFit') {
          const vals = selectUnit(type, x);
          unit = vals.unit;
          value = vals.value;
        } else {
          unit = this._resolvedOptions.unit;
          value = x;
        }
        const style = this._resolvedOptions.style;
        const patternId = `unitformat-${ type }-${ unit }-${ style }`;

        return FormatToParts$3(patternId, value).then(parts => {
          return parts.reduce((string, part) => string + part.value, '');
        });
      }
    }, {
      key: 'formatToParts',
      value: function formatToParts(x) {
        return FormatToParts$3(this._patternId, x);
      }
    }]);

    return UnitFormat;
  }(BaseFormat);

  const DAY_IN_S = 86400;
  const SECOND_IN_MS = 1000;
  const MAX_DAYS = 10;
  // 10 days
  const DEFAULT_MAX_DIFF = DAY_IN_S * MAX_DAYS;

  const gaia = {
    // This is an internal Firefox OS function, not part of the future standard
    relativePart: function (milliseconds) {
      const units = computeTimeUnits(milliseconds);
      const unit = getBestMatchUnit(units);
      return {
        unit: unit + 's',
        value: Math.abs(units[unit])
      };
    },

    // This is an internal Firefox OS function, not part of the future standard
    RelativeDate: function (locales, options) {
      const style = options && options.style || 'long';
      const maxFormatter = Intl.DateTimeFormat(locales, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      const relativeFmtOptions = {
        unit: 'bestFit',
        style: style,
        minUnit: 'minute'
      };

      return {
        format: function (time, maxDiff) {
          maxDiff = maxDiff || DEFAULT_MAX_DIFF;
          const secDiff = (Date.now() - time) / SECOND_IN_MS;
          if (isNaN(secDiff)) {
            return document.l10n.formatValue('incorrectDate');
          }

          if (secDiff > maxDiff) {
            return Promise.resolve(maxFormatter.format(time));
          }

          const { patternId, value } = relativeTimeFormatId(time, relativeFmtOptions.unit, relativeFmtOptions.style);

          return document.l10n.formatValue(patternId, {
            value
          });
        },

        formatElement: function (element, time, maxDiff) {
          maxDiff = maxDiff || DEFAULT_MAX_DIFF;
          const secDiff = (Date.now() - time) / SECOND_IN_MS;
          if (isNaN(secDiff)) {
            element.setAttribute('data-l10n-id', 'incorrectDate');
          }

          if (secDiff > maxDiff) {
            element.removeAttribute('data-l10n-id');
            element.textContent = maxFormatter.format(time);
          }

          const { patternId, value } = relativeTimeFormatId(time, relativeFmtOptions.unit, relativeFmtOptions.style);

          document.l10n.setAttributes(element, patternId, {
            value
          });
        }
      };
    }
  };

  window.mozIntl = {
    ListFormat,
    DurationFormat,
    RelativeTimeFormat,
    UnitFormat,
    getCalendarInfo,
    _gaia: gaia
  };
})();
