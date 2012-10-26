/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */

if (typeof(ICAL) === 'undefined')
  (typeof(window) !== 'undefined') ? this.ICAL = {} : ICAL = {};

/**
 * Helper functions used in various places within ical.js
 */
ICAL.helpers = {
  initState: function initState(aLine, aLineNr) {
    return {
      buffer: aLine,
      line: aLine,
      lineNr: aLineNr,
      character: 0,
      currentData: null,
      parentData: []
    };
  },

  initComponentData: function initComponentData(aName) {
    return {
      name: aName,
      type: "COMPONENT",
      value: []
    };
  },

  /**
   * Creates or returns a class instance
   * of a given type with the initialization
   * data if the data is not already an instance
   * of the given type.
   *
   *
   * Example:
   *
   *    var time = new ICAL.icaltime(...);
   *    var result = ICAL.helpers.formatClassType(time, ICAL.icaltime);
   *
   *    (result instanceof ICAL.icaltime)
   *    // => true
   *
   *    result = ICAL.helpers.formatClassType({}, ICAL.icaltime);
   *    (result isntanceof ICAL.icaltime)
   *    // => true
   *
   *
   * @param {Object} data object initialization data.
   * @param {Object} type object type (like ICAL.icaltime).
   */
  formatClassType: function formatClassType(data, type) {
    if (typeof(data) === 'undefined')
      return undefined;

    if (data instanceof type) {
      return data;
    }
    return new type(data);
  },

  binsearchInsert: function(list, seekVal, cmpfunc) {
    if (!list.length)
      return 0;

    var low = 0, high = list.length - 1,
        mid, cmpval;

    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(seekVal, list[mid]);

      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        break;
    }

    if (cmpval < 0)
      return mid; // insertion is displacing, so use mid outright.
    else if (cmpval > 0)
      return mid + 1;
    else
      return mid;
  },

  dumpn: function() {
    if (!ICAL.debug) {
      return null;
    }

    if (typeof (console) !== 'undefined' && 'log' in console) {
      ICAL.helpers.dumpn = function consoleDumpn(input) {
        return console.log(input);
      }
    } else {
      ICAL.helpers.dumpn = function geckoDumpn(input) {
        dump(input + '\n');
      }
    }

    return ICAL.helpers.dumpn(arguments[0]);
  },

  mixin: function(obj, data) {
    if (data) {
      for (var k in data) {
        obj[k] = data[k];
      }
    }
    return obj;
  },

  isArray: function(o) {
    return o && (o instanceof Array || typeof o == "array");
  },

  clone: function(aSrc, aDeep) {
    if (!aSrc || typeof aSrc != "object") {
      return aSrc;
    } else if (aSrc instanceof Date) {
      return new Date(aSrc.getTime());
    } else if ("clone" in aSrc) {
      return aSrc.clone();
    } else if (ICAL.helpers.isArray(aSrc)) {
      var result = [];
      for (var i = 0; i < aSrc.length; i++) {
        result.push(aDeep ? ICAL.helpers.clone(aSrc[i], true) : aSrc[i]);
      }
      return result;
    } else {
      var result = {};
      for (var name in aSrc) {
        if (aSrc.hasOwnProperty(name)) {
          this.dumpn("Cloning " + name + "\n");
          if (aDeep) {
            result[name] = ICAL.helpers.clone(aSrc[name], true);
          } else {
            result[name] = aSrc[name];
          }
        }
      }
      return result;
    }
  },

  unfoldline: function unfoldline(aState) {
    // Section 3.1
    // if the line ends with a CRLF
    // and the next line starts with a LINEAR WHITESPACE (space, htab, ...)

    // then remove the CRLF and the whitespace to unsplit the line
    var moreLines = true;
    var line = "";

    while (moreLines) {
      moreLines = false;
      var pos = aState.buffer.search(/\r?\n/);
      if (pos > -1) {
        var len = (aState.buffer[pos] == "\r" ? 2 : 1);
        var nextChar = aState.buffer.substr(pos + len, 1);
        if (nextChar.match(/^[ \t]$/)) {
          moreLines = true;
          line += aState.buffer.substr(0, pos);
          aState.buffer = aState.buffer.substr(pos + len + 1);
        } else {
          // We're at the end of the line, copy the found chunk
          line += aState.buffer.substr(0, pos);
          aState.buffer = aState.buffer.substr(pos + len);
        }
      } else {
        line += aState.buffer;
        aState.buffer = "";
      }
    }
    return line;
  },

  foldline: function foldline(aLine) {
    var result = "";
    var line = aLine || "";

    while (line.length) {
      result += ICAL.newLineChar + " " + line.substr(0, ICAL.foldLength);
      line = line.substr(ICAL.foldLength);
    }
    return result.substr(ICAL.newLineChar.length + 1);
  },

  ensureKeyExists: function(obj, key, defvalue) {
    if (!(key in obj)) {
      obj[key] = defvalue;
    }
  },

  hasKey: function(obj, key) {
    return (obj && key in obj && obj[key]);
  },

  pad2: function pad(data) {
    return ("00" + data).substr(-2);
  },

  trunc: function trunc(number) {
    return (number < 0 ? Math.ceil(number) : Math.floor(number));
  }
};
(typeof(ICAL) === 'undefined')? ICAL = {} : '';

(function() {
  ICAL.serializer = {
    serializeToIcal: function(obj, name, isParam) {
      if (obj && obj.icalclass) {
        return obj.toString();
      }

      var str = "";

      if (obj.type == "COMPONENT") {
        str = "BEGIN:" + obj.name + ICAL.newLineChar;
        for (var subkey in obj.value) {
          str += this.serializeToIcal(obj.value[subkey]) + ICAL.newLineChar;
        }
        str += "END:" + obj.name;
      } else {
        str += ICAL.icalparser.stringifyProperty(obj);
      }
      return str;
    }
  };
}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */

// TODO validate known parameters
// TODO make sure all known types don't contain junk
// TODO tests for parsers
// TODO SAX type parser
// TODO structure data in components
// TODO enforce uppercase when parsing
// TODO optionally preserve value types that are default but explicitly set
// TODO floating timezone
(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  /* NOTE: I'm not sure this is the latest syntax...

     {
       X-WR-CALNAME: "test",
       components: {
         VTIMEZONE: { ... },
         VEVENT: {
             "uuid1": {
                 UID: "uuid1",
                 ...
                 components: {
                     VALARM: [
                         ...
                     ]
                 }
             }
         },
         VTODO: { ... }
       }
     }
     */

  // Exports

  function ParserError(aState, aMessage) {
    this.mState = aState;
    this.name = "ParserError";
    if (aState) {
      var lineNrData = ("lineNr" in aState ? aState.lineNr + ":" : "") +
                       ("character" in aState && !isNaN(aState.character) ?
                         aState.character + ":" :
                         "");

      var message = lineNrData + aMessage;
      if ("buffer" in aState) {
        if (aState.buffer) {
          message += " before '" + aState.buffer + "'";
        } else {
          message += " at end of line";
        }
      }
      if ("line" in aState) {
        message += " in '" + aState.line + "'";
      }
      this.message = message;
    } else {
      this.message = aMessage;
    }

    // create stack
    try {
      throw new Error();
    } catch (e) {
      var split = e.stack.split('\n');
      split.shift();
      this.stack = split.join('\n');
    }
  }

  ParserError.prototype = {
    __proto__: Error.prototype,
    constructor: ParserError
  };

  var parser = {
    Error: ParserError
  };
  ICAL.icalparser = parser;


  parser.lexContentLine = function lexContentLine(aState) {
    // contentline   = name *(";" param ) ":" value CRLF
    // The corresponding json object will be:
    // { name: "name", parameters: { key: "value" }, value: "value" }
    var lineData = {};

    // Parse the name
    lineData.name = parser.lexName(aState);

    // Read Paramaters, if there are any.
    if (aState.buffer.substr(0, 1) == ";") {
      lineData.parameters = {};
      while (aState.buffer.substr(0, 1) == ";") {
        aState.buffer = aState.buffer.substr(1);
        var param = parser.lexParam(aState);
        lineData.parameters[param.name] = param.value;
      }
    }

    // Read the value
    parser.expectRE(aState, /^:/, "Expected ':'");
    lineData.value = parser.lexValue(aState);
    parser.expectEnd(aState, "Junk at End of Line");
    return lineData;
  };

  parser.lexName = function lexName(aState) {
    function parseIanaToken(aState) {
      var match = parser.expectRE(aState, /^([A-Za-z0-9-]+)/,
                                  "Expected IANA Token");
      return match[1];
    }

    function parseXName(aState) {
      var error = "Expected XName";
      var value = "X-";
      var match = parser.expectRE(aState, /^X-/, error);

      // Vendor ID
      if ((match = parser.expectOptionalRE(aState, /^([A-Za-z0-9]+-)/, error))) {
        value += match[1];
      }

      // Remaining part
      match = parser.expectRE(aState, /^([A-Za-z0-9-]+)/, error);
      value += match[1];

      return value;
    }
    return parser.parseAlternative(aState, parseXName, parseIanaToken);
  };

  parser.lexValue = function lexValue(aState) {
    // VALUE-CHAR = WSP / %x21-7E / NON-US-ASCII
    // ; Any textual character

    if (aState.buffer.length === 0) {
      return aState.buffer;
    }

    // TODO the unicode range might be wrong!
    var match = parser.expectRE(aState,
                                /*  WSP|%x21-7E|NON-US-ASCII  */
                                /^([ \t\x21-\x7E\u00C2-\uF400]+)/,
                                "Invalid Character in value");

    return match[1];
  };

  parser.lexParam = function lexParam(aState) {
    // read param name
    var name = parser.lexName(aState);
    parser.expectRE(aState, /^=/, "Expected '='");

    // read param value
    var values = parser.parseList(aState, parser.lexParamValue, ",");
    return {
      name: name,
      value: (values.length == 1 ? values[0] : values)
    };
  };

  parser.lexParamValue = function lexParamValue(aState) {
    // CONTROL = %x00-08 / %x0A-1F / %x7F
    // ; All the controls except HTAB
    function parseQuotedString(aState) {
      parser.expectRE(aState, /^"/, "Expecting Quote Character");
      // QSAFE-CHAR    = WSP / %x21 / %x23-7E / NON-US-ASCII
      // ; Any character except CONTROL and DQUOTE

      var match = parser.expectRE(aState, /^([^"\x00-\x08\x0A-\x1F\x7F]*)/,
                                  "Invalid Param Value");
      parser.expectRE(aState, /^"/, "Expecting Quote Character");
      return match[1];
    }

    function lexParamText(aState) {
      // SAFE-CHAR     = WSP / %x21 / %x23-2B / %x2D-39 / %x3C-7E / NON-US-ASCII
      // ; Any character except CONTROL, DQUOTE, ";", ":", ","
      var match = parser.expectRE(aState, /^([^";:,\x00-\x08\x0A-\x1F\x7F]*)/,
                                  "Invalid Param Value");
      return match[1];
    }

    return parser.parseAlternative(aState, parseQuotedString, lexParamText);
  };

  parser.parseContentLine = function parseContentLine(aState, aLineData) {

    switch (aLineData.name) {
    case "BEGIN":
      var newdata = ICAL.helpers.initComponentData(aLineData.value);
      if (aState.currentData) {
        // If there is already data (i.e this is not the top level
        // component), then push the new data to its values and
        // stack the parent data.
        aState.currentData.value.push(newdata);
        aState.parentData.push(aState.currentData);
      }

      aState.currentData = newdata; // set the new data array
      break;
    case "END":
      if (aState.currentData.name != aLineData.value) {
        throw new ParserError(aState, "Unexpected END:" + aLineData.value +
                              ", expected END:" + aState.currentData.name);
      }
      if (aState.parentData.length) {
        aState.currentData = aState.parentData.pop();
      }
      break;
    default:
      ICAL.helpers.dumpn("parse " + aLineData.toString());
      parser.detectParameterType(aLineData);
      parser.detectValueType(aLineData);
      ICAL.helpers.dumpn("parse " + aLineData.toString());
      aState.currentData.value.push(aLineData);
      break;
    }
  },

  parser.detectParameterType = function detectParameterType(aLineData) {
    for (var name in aLineData.parameters) {
      var paramType = "TEXT";

      if (name in ICAL.design.param && "valueType" in ICAL.design.param[name]) {
        paramType = ICAL.design.param[name].valueType;
      }
      var paramData = {
        value: aLineData.parameters[name],
        type: paramType
      };

      aLineData.parameters[name] = paramData;
    }
  };

  parser.detectValueType = function detectValueType(aLineData) {
    var valueType = "TEXT";
    var defaultType = null;
    if (aLineData.name in ICAL.design.property &&
        "defaultType" in ICAL.design.property[aLineData.name]) {
      valueType = ICAL.design.property[aLineData.name].defaultType;
    }

    if ("parameters" in aLineData && "VALUE" in aLineData.parameters) {
      var valueParam = aLineData.parameters.VALUE;
      if (typeof(valueParam) === 'string') {
        valueType = aLineData.parameters.VALUE.toUpperCase();
      } else if(typeof(valueParam) === 'object') {
        valueType = valueParam.value.toUpperCase();
      }
    }

    if (!(valueType in ICAL.design.value)) {
      throw new ParserError(aLineData, "Invalid VALUE Type '" + valueType);
    }

    aLineData.type = valueType;

    // It could be a multi-value value, we have to take that apart first
    function unwrapMultiValue(x, separator) {
      var values = [];

      function replacer(s, a) {
        values.push(a);
        return "";
      }
      var re = new RegExp("(.*?[^\\\\])" + separator, "g");
      values.push(x.replace(re, replacer));
      return values;
    }

    if (aLineData.name in ICAL.design.property) {
      if (ICAL.design.property[aLineData.name].multiValue) {
        aLineData.value = unwrapMultiValue(aLineData.value, ",");
      } else if (ICAL.design.property[aLineData.name].structuredValue) {
        aLineData.value = unwrapMultiValue(aLineData.value, ";");
      } else {
        aLineData.value = [aLineData.value];
      }
    } else {
      aLineData.value = [aLineData.value];
    }

    if ("unescape" in ICAL.design.value[valueType]) {
      var unescaper = ICAL.design.value[valueType].unescape;
      for (var idx in aLineData.value) {
        aLineData.value[idx] = unescaper(aLineData.value[idx], aLineData.name);
      }
    }

    return aLineData;
  }

  parser.validateValue = function validateValue(aLineData, aValueType,
                                                aValue, aCheckParams) {
    var propertyData = ICAL.design.property[aLineData.name];
    var valueData = ICAL.design.value[aValueType];

    // TODO either make validators just consume the value, then check for end
    // here (possibly requires returning remainder or renaming buffer<->value
    // in the states) validators don't really need the whole linedata

    if (!aValue.match) {
      ICAL.helpers.dumpn("MAAA: " + aValue + " ? " + aValue.toString());
    }

    if (valueData.matches) {
      // Test against regex
      if (!aValue.match(valueData.matches)) {
        throw new ParserError(aLineData, "Value '" + aValue + "' for " +
                              aLineData.name + " is not " + aValueType);
      }
    } else if ("validate" in valueData) {
      // Validator throws an error itself if needed
      var objData = valueData.validate(aValue);

      // Merge in extra value data, if it exists
      ICAL.helpers.mixin(aLineData, objData);
    } else if ("values" in valueData) {
      // Fixed list of values
      if (valueData.values.indexOf(aValue) < 0) {
        throw new ParserError(aLineData, "Value for " + aLineData.name +
                              " is not a " + aValueType);
      }
    }

    if (aCheckParams && "requireParam" in valueData) {
      var reqParam = valueData.requireParam;
      for (var param in reqParam) {
        if (!("parameters" in aLineData) ||
            !(param in aLineData.parameters) ||
            aLineData.parameters[param] != reqParam[param]) {

          throw new ParserError(aLineData, "Value requires " + param + "=" +
                                valueData.requireParam[param]);
        }
      }
    }

    return aLineData;
  };

  parser.parseValue = function parseValue(aStr, aType) {
    var lineData = {
      value: [aStr]
    };
    return parser.validateValue(lineData, aType, aStr, false);
  };

  parser.decorateValue = function decorateValue(aType, aValue) {
    if (aType in ICAL.design.value && "decorate" in ICAL.design.value[aType]) {
      return ICAL.design.value[aType].decorate(aValue);
    } else {
      return ICAL.design.value.TEXT.decorate(aValue);
    }
  };

  parser.stringifyProperty = function stringifyProperty(aLineData) {
    ICAL.helpers.dumpn("Stringify: " + aLineData.toString());
    var str = aLineData.name;
    if (aLineData.parameters) {
      for (var key in aLineData.parameters) {
        str += ";" + key + "=" + aLineData.parameters[key].value;
      }
    }

    str += ":" + parser.stringifyValue(aLineData);

    return ICAL.helpers.foldline(str);
  };

  parser.stringifyValue = function stringifyValue(aLineData) {
    function arrayStringMap(arr, func) {
      var newArr = [];
      for (var idx in arr) {
        newArr[idx] = func(arr[idx].toString());
      }
      return newArr;
    }

    if (aLineData) {
      var values = aLineData.value;
      if (aLineData.type in ICAL.design.value &&
          "escape" in ICAL.design.value[aLineData.type]) {
        var escaper = ICAL.design.value[aLineData.type].escape;
        values = arrayStringMap(values, escaper);
      }

      var separator = ",";
      if (aLineData.name in ICAL.design.property &&
          ICAL.design.property[aLineData.name].structuredValue) {
        separator = ";";
      }

      return values.join(separator);
    } else {
      return null;
    }
  };

  parser.parseDateOrDateTime = function parseDateOrDateTime(aState) {
    var data = parser.parseDate(aState);

    if (parser.expectOptionalRE(aState, /^T/)) {
      // This has a time component, parse it
      var time = parser.parseTime(aState);

      if (parser.expectOptionalRE(aState, /^Z/)) {
        data.timezone = "Z";
      }
      ICAL.helpers.mixin(data, time);
    }
    return data;
  };

  parser.parseDateTime = function parseDateTime(aState) {
    var data = parser.parseDate(aState);
    parser.expectRE(aState, /^T/, "Expected 'T'");

    var time = parser.parseTime(aState);

    if (parser.expectOptionalRE(aState, /^Z/)) {
      data.timezone = "Z";
    }

    ICAL.helpers.mixin(data, time);
    return data;
  };

  parser.parseDate = function parseDate(aState) {
    var dateRE = /^((\d{4})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01]))/;
    var match = parser.expectRE(aState, dateRE, "Expected YYYYMMDD Date");
    return {
      year: parseInt(match[2], 10),
      month: parseInt(match[3], 10),
      day: parseInt(match[4], 10)
    };
    // TODO timezone?
  };

  parser.parseTime = function parseTime(aState) {
    var timeRE = /^(([01][0-9]|2[0-3])([0-5][0-9])([0-5][0-9]|60))/;
    var match = parser.expectRE(aState, timeRE, "Expected HHMMSS Time");
    return {
      hour: parseInt(match[2], 10),
      minute: parseInt(match[3], 10),
      second: parseInt(match[4], 10)
    };
  };

  parser.parseDuration = function parseDuration(aState) {
    var error = "Expected Duration Value";

    function parseDurSecond(aState) {
      var secMatch = parser.expectRE(aState, /^((\d+)S)/, "Expected Seconds");
      return {
        seconds: parseInt(secMatch[2], 10)
      };
    }

    function parseDurMinute(aState) {
      var data = {};
      var minutes = parser.expectRE(aState, /^((\d+)M)/, "Expected Minutes");
      try {
        data = parseDurSecond(aState);
      } catch (e) {
        // seconds are optional, its ok
        if (!(e instanceof ParserError)) {
          throw e;
        }
      }
      data.minutes = parseInt(minutes[2], 10);
      return data;
    }

    function parseDurHour(aState) {
      var data = {};
      var hours = parser.expectRE(aState, /^((\d+)H)/, "Expected Hours");
      try {
        data = parseDurMinute(aState);
      } catch (e) {
        // seconds are optional, its ok
        if (!(e instanceof ParserError)) {
          throw e;
        }
      }

      data.hours = parseInt(hours[2], 10);
      return data;
    }

    function parseDurWeek(aState) {
      return {
        weeks: parseInt(parser.expectRE(aState, /^((\d+)W)/, "Expected Weeks")[2], 10)
      };
    }

    function parseDurTime(aState) {
      parser.expectRE(aState, /^T/, "Expected Time Value");
      return parser.parseAlternative(aState, parseDurHour,
                                     parseDurMinute, parseDurSecond);
    }

    function parseDurDate(aState) {
      var days = parser.expectRE(aState, /^((\d+)D)/, "Expected Days");
      var data;

      try {
        data = parseDurTime(aState);
      } catch (e) {
        // Its ok if this fails
        if (!(e instanceof ParserError)) {
          throw e;
        }
      }

      if (data) {
        data.days = parseInt(days[2], 10);
      } else {
        data = {
          days: parseInt(days[2], 10)
        };
      }
      return data;
    }

    var factor = parser.expectRE(aState, /^([+-]?P)/, error);

    var durData = parser.parseAlternative(aState, parseDurDate,
                                          parseDurTime, parseDurWeek);
    parser.expectEnd(aState, "Junk at end of DURATION value");

    durData.factor = (factor[1] == "-P" ? -1 : 1);
    return durData;
  };

  parser.parsePeriod = function parsePeriod(aState) {
    var dtime = parser.parseDateTime(aState);
    parser.expectRE(aState, /\//, "Expected '/'");

    var dtdur = parser.parseAlternative(aState, parser.parseDateTime,
                                        parser.parseDuration);
    var data = {
      start: dtime
    };
    if ("factor" in dtdur) {
      data.duration = dtdur;
    } else {
      data.end = dtdur;
    }
    return data;
  },

  parser.parseRecur = function parseRecur(aState) {
    // TODO this function is quite cludgy, maybe it should be done differently
    function parseFreq(aState) {
      parser.expectRE(aState, /^FREQ=/, "Expected Frequency");
      var ruleRE = /^(SECONDLY|MINUTELY|HOURLY|DAILY|WEEKLY|MONTHLY|YEARLY)/;
      var match = parser.expectRE(aState, ruleRE, "Exepected Frequency Value");
      return {
        "FREQ": match[1]
      };
    }

    function parseUntil(aState) {
      parser.expectRE(aState, /^UNTIL=/, "Expected Frequency");
      var untilDate = parser.parseDateOrDateTime(aState);
      return {
        "UNTIL": untilDate
      };
    }

    function parseCount(aState) {
      parser.expectRE(aState, /^COUNT=/, "Expected Count");
      var match = parser.expectRE(aState, /^(\d+)/, "Expected Digit(s)");
      return {
        "COUNT": parseInt(match[1], 10)
      };
    }

    function parseInterval(aState) {
      parser.expectRE(aState, /^INTERVAL=/, "Expected Interval");
      var match = parser.expectRE(aState, /^(\d+)/, "Expected Digit(s)");
      return {
        "INTERVAL": parseInt(match[1], 10)
      };
    }

    function parseBySecond(aState) {
      function parseSecond(aState) {
        var secondRE = /^(60|[1-5][0-9]|[0-9])/;
        var value = parser.expectRE(aState, secondRE, "Expected Second")[1];
        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYSECOND=/, "Expected BYSECOND");
      var seconds = parser.parseList(aState, parseSecond, ",");
      return {
        "BYSECOND": seconds
      };
    }

    function parseByMinute(aState) {
      function parseMinute(aState) {
        var minuteRE = /^([1-5][0-9]|[0-9])/;
        var value = parser.expectRE(aState, minuteRE, "Expected Minute")[1];
        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYMINUTE=/, "Expected BYMINUTE");
      var minutes = parser.parseList(aState, parseMinute, ",");
      return {
        "BYMINUTE": minutes
      };
    }

    function parseByHour(aState) {
      function parseHour(aState) {
        var hourRE = /^(2[0-3]|1[0-9]|[0-9])/;
        var value = parser.expectRE(aState, hourRE, "Expected Hour")[1];
        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYHOUR=/, "Expected BYHOUR");
      var hours = parser.parseList(aState, parseHour, ",");
      return {
        "BYHOUR": hours
      };
    }

    function parseByDay(aState) {
      function parseWkDayNum(aState) {
        var value = "";
        var match = parser.expectOptionalRE(aState, /^([+-])/);
        if (match) {
          value += match[1];
        }

        match = parser.expectOptionalRE(aState, /^(5[0-3]|[1-4][0-9]|[1-9])/);
        if (match) {
          value += match[1];
        }

        var wkDayRE = /^(SU|MO|TU|WE|TH|FR|SA)/;
        match = parser.expectRE(aState, wkDayRE, "Expected Week Ordinals");
        value += match[1];
        return value;
      }
      parser.expectRE(aState, /^BYDAY=/, "Expected BYDAY Rule");
      var wkdays = parser.parseList(aState, parseWkDayNum, ",");
      return {
        "BYDAY": wkdays
      };
    }

    function parseByMonthDay(aState) {
      function parseMoDayNum(aState) {
        var value = "";
        var match = parser.expectOptionalRE(aState, /^([+-])/);
        if (match) {
          value += match[1];
        }

        match = parser.expectRE(aState, /^(3[01]|[12][0-9]|[1-9])/);
        value += match[1];
        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYMONTHDAY=/, "Expected BYMONTHDAY Rule");
      var modays = parser.parseList(aState, parseMoDayNum, ",");
      return {
        "BYMONTHDAY": modays
      };
    }

    function parseByYearDay(aState) {
      function parseYearDayNum(aState) {
        var value = "";
        var match = parser.expectOptionalRE(aState, /^([+-])/);
        if (match) {
          value += match[1];
        }

        var yrDayRE = /^(36[0-6]|3[0-5][0-9]|[12][0-9][0-9]|[1-9][0-9]|[1-9])/;
        match = parser.expectRE(aState, yrDayRE);
        value += match[1];
        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYYEARDAY=/, "Expected BYYEARDAY Rule");
      var yrdays = parser.parseList(aState, parseYearDayNum, ",");
      return {
        "BYYEARDAY": yrdays
      };
    }

    function parseByWeekNo(aState) {
      function parseWeekNum(aState) {
        var value = "";
        var match = parser.expectOptionalRE(aState, /^([+-])/);
        if (match) {
          value += match[1];
        }

        match = parser.expectRE(aState, /^(5[0-3]|[1-4][0-9]|[1-9])/);
        value += match[1];
        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYWEEKNO=/, "Expected BYWEEKNO Rule");
      var weeknos = parser.parseList(aState, parseWeekNum, ",");
      return {
        "BYWEEKNO": weeknos
      };
    }

    function parseByMonth(aState) {
      function parseMonthNum(aState) {
        var moNumRE = /^(1[012]|[1-9])/;
        var match = parser.expectRE(aState, moNumRE, "Expected Month number");
        return parseInt(match[1], 10);
      }
      parser.expectRE(aState, /^BYMONTH=/, "Expected BYMONTH Rule");
      var monums = parser.parseList(aState, parseMonthNum, ",");
      return {
        "BYMONTH": monums
      };
    }

    function parseBySetPos(aState) {
      function parseSpList(aState) {
        var spRE = /^(36[0-6]|3[0-5][0-9]|[12][0-9][0-9]|[1-9][0-9]|[1-9])/;
        var value = parser.expectRE(aState, spRE)[1];

        return parseInt(value, 10);
      }
      parser.expectRE(aState, /^BYSETPOS=/, "Expected BYSETPOS Rule");
      var spnums = parser.parseList(aState, parseSpList, ",");
      return {
        "BYSETPOS": spnums
      };
    }

    function parseWkst(aState) {
      parser.expectRE(aState, /^WKST=/, "Expected WKST");
      var wkstRE = /^(SU|MO|TU|WE|TH|FR|SA)/;
      var match = parser.expectRE(aState, wkstRE, "Expected Weekday Name");
      return {
        "WKST": match[1]
      };
    }

    function parseRulePart(aState) {
      return parser.parseAlternative(aState,
      parseFreq, parseUntil, parseCount, parseInterval,
      parseBySecond, parseByMinute, parseByHour, parseByDay,
      parseByMonthDay, parseByYearDay, parseByWeekNo,
      parseByMonth, parseBySetPos, parseWkst);
    }

    // One or more rule parts
    var value = parser.parseList(aState, parseRulePart, ";");
    var data = {};
    for (var key in value) {
      ICAL.helpers.mixin(data, value[key]);
    }

    // Make sure there's no junk at the end
    parser.expectEnd(aState, "Junk at end of RECUR value");
    return data;
  };

  parser.parseUtcOffset = function parseUtcOffset(aState) {
    var utcRE = /^(([+-])([01][0-9]|2[0-3])([0-5][0-9])([0-5][0-9])?)$/;
    var match = parser.expectRE(aState, utcRE, "Expected valid utc offset");
    return {
      factor: (match[2] == "-" ? -1 : 1),
      hours: parseInt(match[3], 10),
      minutes: parseInt(match[4], 10)
    };
  };

  parser.parseAlternative = function parseAlternative(aState /*, parserFunc, ... */) {
    var tokens = null;
    var args = Array.prototype.slice.call(arguments);
    var parser;
    args.shift();
    var errors = [];

    while (!tokens && (parser = args.shift())) {
      try {
        tokens = parser(aState);
      } catch (e) {
        if (e instanceof ParserError) {
          errors.push(e);
          tokens = null;
        } else {
          throw e;
        }
      }
    }

    if (!tokens) {
      var message = errors.join("\nOR ") || "No Tokens found";
      throw new ParserError(aState, message);
    }

    return tokens;
  },

  parser.parseList = function parseList(aState, aElementFunc, aSeparator) {
    var listvals = [];

    listvals.push(aElementFunc(aState));
    var re = new RegExp("^" + aSeparator + "");
    while (parser.expectOptionalRE(aState, re)) {
      listvals.push(aElementFunc(aState));
    }
    return listvals;
  };

  parser.expectOptionalRE = function expectOptionalRE(aState, aRegex) {
    var match = aState.buffer.match(aRegex);
    if (match) {
      var count = ("1" in match ? match[1].length : match[0].length);
      aState.buffer = aState.buffer.substr(count);
      aState.character += count;
    }
    return match;
  };

  parser.expectRE = function expectRE(aState, aRegex, aErrorMessage) {
    var match = parser.expectOptionalRE(aState, aRegex);
    if (!match) {
      throw new ParserError(aState, aErrorMessage);
    }
    return match;
  };

  parser.expectEnd = function expectEnd(aState, aErrorMessage) {
    if (aState.buffer.length > 0) {
      throw new ParserError(aState, aErrorMessage);
    }
  }

  /* Possible shortening:
      - pro: retains order
      - con: datatypes not obvious
      - pro: not so many objects created

    {
      "begin:vcalendar": [
        {
          prodid: "-//Example Inc.//Example Client//EN",
          version: "2.0"
          "begin:vtimezone": [
            {
              "last-modified": [{
                type: "date-time",
                value: "2004-01-10T03:28:45Z"
              }],
              tzid: "US/Eastern"
              "begin:daylight": [
                {
                  dtstart: {
                    type: "date-time",
                    value: "2000-04-04T02:00:00"
                  }
                  rrule: {
                    type: "recur",
                    value: {
                      freq: "YEARLY",
                      byday: ["1SU"],
                      bymonth: ["4"],
                    }
                  }
                }
              ]
            }
          ],
          "begin:vevent": [
            {
              category: [{
                type: "text"
                // have icalcomponent take apart the multivalues
                value: "multi1,multi2,multi3"
              },{
                type "text"
                value: "otherprop1"
              }]
            }
          ]
        }
      ]
    }
    */
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */

(typeof(ICAL) === 'undefined')? ICAL = {} : '';

/**
 * Design data used by the parser to decide if data is semantically correct
 */
ICAL.design = {
  param: {
    // Although the syntax is DQUOTE uri DQUOTE, I don't think we should
    // enfoce anything aside from it being a valid content line.
    // "ALTREP": { ... },

    // CN just wants a param-value
    // "CN": { ... }

    "CUTYPE": {
      values: ["INDIVIDUAL", "GROUP", "RESOURCE", "ROOM", "UNKNOWN"],
      allowXName: true,
      allowIanaToken: true
    },

    "DELEGATED-FROM": {
      valueType: "CAL-ADDRESS",
      multiValue: true
    },
    "DELEGATED-TO": {
      valueType: "CAL-ADDRESS",
      multiValue: true
    },
    // "DIR": { ... }, // See ALTREP
    "ENCODING": {
      values: ["8BIT", "BASE64"]
    },
    // "FMTTYPE": { ... }, // See ALTREP
    "FBTYPE": {
      values: ["FREE", "BUSY", "BUSY-UNAVAILABLE", "BUSY-TENTATIVE"],
      allowXName: true,
      allowIanaToken: true
    },
    // "LANGUAGE": { ... }, // See ALTREP
    "MEMBER": {
      valueType: "CAL-ADDRESS",
      multiValue: true
    },
    "PARTSTAT": {
      // TODO These values are actually different per-component
      values: ["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE",
               "DELEGATED", "COMPLETED", "IN-PROCESS"],
      allowXName: true,
      allowIanaToken: true
    },
    "RANGE": {
      values: ["THISANDFUTURE"]
    },
    "RELATED": {
      values: ["START", "END"]
    },
    "RELTYPE": {
      values: ["PARENT", "CHILD", "SIBLING"],
      allowXName: true,
      allowIanaToken: true
    },
    "ROLE": {
      values: ["REQ-PARTICIPANT", "CHAIR",
               "OPT-PARTICIPANT", "NON-PARTICIPANT"],
      allowXName: true,
      allowIanaToken: true
    },
    "RSVP": {
      valueType: "BOOLEAN"
    },
    "SENT-BY": {
      valueType: "CAL-ADDRESS"
    },
    "TZID": {
      matches: /^\//
    },
    "VALUE": {
      values: ["BINARY", "BOOLEAN", "CAL-ADDRESS", "DATE", "DATE-TIME",
               "DURATION", "FLOAT", "INTEGER", "PERIOD", "RECUR", "TEXT",
               "TIME", "URI", "UTC-OFFSET"],
      allowXName: true,
      allowIanaToken: true
    }
  },

  // When adding a value here, be sure to add it to the parameter types!
  value: {

    "BINARY": {
      matches: /^([A-Za-z0-9+\/]{4})*([A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/,
      requireParam: {
        "ENCODING": "BASE64"
      },
      decorate: function(aString) {
        return ICAL.icalbinary.fromString(aString);
      }
    },
    "BOOLEAN": {
      values: ["TRUE", "FALSE"],
      decorate: function(aValue) {
        return ICAL.icalvalue.fromString(aValue, "BOOLEAN");
      }
    },
    "CAL-ADDRESS": {
      // needs to be an uri
    },
    "DATE": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parseDate(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of DATE value");
        return data;
      },
      decorate: function(aValue) {
        return ICAL.icaltime.fromString(aValue);
      }
    },
    "DATE-TIME": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parseDateTime(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of DATE-TIME value");
        return data;
      },

      decorate: function(aValue) {
        return ICAL.icaltime.fromString(aValue);
      }
    },
    "DURATION": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parseDuration(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of DURATION value");
        return data;
      },
      decorate: function(aValue) {
        return ICAL.icalduration.fromString(aValue);
      }
    },
    "FLOAT": {
      matches: /^[+-]?\d+\.\d+$/,
      decorate: function(aValue) {
        return ICAL.icalvalue.fromString(aValue, "FLOAT");
      }
    },
    "INTEGER": {
      matches: /^[+-]?\d+$/,
      decorate: function(aValue) {
        return ICAL.icalvalue.fromString(aValue, "INTEGER");
      }
    },
    "PERIOD": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parsePeriod(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of PERIOD value");
        return data;
      },

      decorate: function(aValue) {
        return ICAL.icalperiod.fromString(aValue);
      }
    },
    "RECUR": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parseRecur(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of RECUR value");
        return data;
      },

      decorate: function decorate(aValue) {
        return ICAL.icalrecur.fromString(aValue);
      }
    },

    "TEXT": {
      matches: /.*/,
      decorate: function(aValue) {
        return ICAL.icalvalue.fromString(aValue, "TEXT");
      },
      unescape: function(aValue, aName) {
        return aValue.replace(/\\\\|\\;|\\,|\\[Nn]/g, function(str) {
          switch (str) {
          case "\\\\":
            return "\\";
          case "\\;":
            return ";";
          case "\\,":
            return ",";
          case "\\n":
          case "\\N":
            return "\n";
          default:
            return str;
          }
        });
      },

      escape: function escape(aValue, aName) {
        return aValue.replace(/\\|;|,|\n/g, function(str) {
          switch (str) {
          case "\\":
            return "\\\\";
          case ";":
            return "\\;";
          case ",":
            return "\\,";
          case "\n":
            return "\\n";
          default:
            return str;
          }
        });
      }
    },

    "TIME": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parseTime(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of TIME value");
        return data;
      }
    },

    "URI": {
      // TODO
      /* ... */
    },

    "UTC-OFFSET": {
      validate: function(aValue) {
        var state = {
          buffer: aValue
        };
        var data = ICAL.icalparser.parseUtcOffset(state);
        ICAL.icalparser.expectEnd(state, "Junk at end of UTC-OFFSET value");
        return data;
      },

      decorate: function(aValue) {
        return ICAL.icalutcoffset.fromString(aValue);
      }
    }
  },

  property: {
    decorate: function decorate(aData, aParent) {
      return new ICAL.icalproperty(aData, aParent);
    },
    "ATTACH": {
      defaultType: "URI"
    },
    "ATTENDEE": {
      defaultType: "CAL-ADDRESS"
    },
    "CATEGORIES": {
      defaultType: "TEXT",
      multiValue: true
    },
    "COMPLETED": {
      defaultType: "DATE-TIME"
    },
    "CREATED": {
      defaultType: "DATE-TIME"
    },
    "DTEND": {
      defaultType: "DATE-TIME",
      allowedTypes: ["DATE-TIME", "DATE"]
    },
    "DTSTAMP": {
      defaultType: "DATE-TIME"
    },
    "DTSTART": {
      defaultType: "DATE-TIME",
      allowedTypes: ["DATE-TIME", "DATE"]
    },
    "DUE": {
      defaultType: "DATE-TIME",
      allowedTypes: ["DATE-TIME", "DATE"]
    },
    "DURATION": {
      defaultType: "DURATION"
    },
    "EXDATE": {
      defaultType: "DATE-TIME",
      allowedTypes: ["DATE-TIME", "DATE"]
    },
    "EXRULE": {
      defaultType: "RECUR"
    },
    "FREEBUSY": {
      defaultType: "PERIOD",
      multiValue: true
    },
    "GEO": {
      defaultType: "FLOAT",
      structuredValue: true
    },
    /* TODO exactly 2 values */"LAST-MODIFIED": {
      defaultType: "DATE-TIME"
    },
    "ORGANIZER": {
      defaultType: "CAL-ADDRESS"
    },
    "PERCENT-COMPLETE": {
      defaultType: "INTEGER"
    },
    "REPEAT": {
      defaultType: "INTEGER"
    },
    "RDATE": {
      defaultType: "DATE-TIME",
      allowedTypes: ["DATE-TIME", "DATE", "PERIOD"]
    },
    "RECURRENCE-ID": {
      defaultType: "DATE-TIME",
      allowedTypes: ["DATE-TIME", "DATE"]
    },
    "RESOURCES": {
      defaultType: "TEXT",
      multiValue: true
    },
    "REQUEST-STATUS": {
      defaultType: "TEXT",
      structuredValue: true
    },
    "PRIORITY": {
      defaultType: "INTEGER"
    },
    "RRULE": {
      defaultType: "RECUR"
    },
    "SEQUENCE": {
      defaultType: "INTEGER"
    },
    "TRIGGER": {
      defaultType: "DURATION",
      allowedTypes: ["DURATION", "DATE-TIME"]
    },
    "TZOFFSETFROM": {
      defaultType: "UTC-OFFSET"
    },
    "TZOFFSETTO": {
      defaultType: "UTC-OFFSET"
    },
    "TZURL": {
      defaultType: "URI"
    },
    "URL": {
      defaultType: "URI"
    }
  },

  component: {
    decorate: function decorate(aData, aParent) {
      return new ICAL.icalcomponent(aData, aParent);
    },
    "VEVENT": {}
  }
};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icalcomponent = function icalcomponent(data, parent) {
    this.wrappedJSObject = this;
    this.parent = parent;
    this.fromData(data);
  }

  ICAL.icalcomponent.prototype = {

    data: null,
    name: "",
    components: null,
    properties: null,

    icalclass: "icalcomponent",

    clone: function clone() {
      return new ICAL.icalcomponent(this.undecorate(), this.parent);
    },

    fromData: function fromData(data) {
      if (!data) {
        data = ICAL.helpers.initComponentData(null);
      }
      this.data = data;
      this.data.value = this.data.value || [];
      this.data.type = this.data.type || "COMPONENT";
      this.components = {};
      this.properties = {};

      // Save the name directly on the object, as we want this accessed
      // from the outside.
      this.name = this.data.name;
      delete this.data.name;

      var value = this.data.value;

      for (var key in value) {
        var keyname = value[key].name;
        if (value[key].type == "COMPONENT") {
          value[key] = new ICAL.icalcomponent(value[key], this);
          ICAL.helpers.ensureKeyExists(this.components, keyname, []);
          this.components[keyname].push(value[key]);
        } else {
          value[key] = new ICAL.icalproperty(value[key], this);
          ICAL.helpers.ensureKeyExists(this.properties, keyname, []);
          this.properties[keyname].push(value[key]);
        }
      }
    },

    undecorate: function undecorate() {
      var newdata = [];
      for (var key in this.data.value) {
        newdata.push(this.data.value[key].undecorate());
      }
      return {
        name: this.name,
        type: "COMPONENT",
        value: newdata
      };
    },

    getFirstSubcomponent: function getFirstSubcomponent(aType) {
      var comp = null;
      if (aType) {
        var ucType = aType.toUpperCase();
        if (ucType in this.components &&
            this.components[ucType] &&
            this.components[ucType].length > 0) {
          comp = this.components[ucType][0];
        }
      } else {
        for (var thiscomp in this.components) {
          comp = this.components[thiscomp][0];
          break;
        }
      }
      return comp;
    },

    getAllSubcomponents: function getAllSubcomponents(aType) {
      var comps = [];
      if (aType && aType != "ANY") {
        var ucType = aType.toUpperCase();
        if (ucType in this.components) {
          for (var compKey in this.components[ucType]) {
            comps.push(this.components[ucType][compKey]);
          }
        }
      } else {
        for (var compName in this.components) {
          for (var compKey in this.components[compName]) {
            comps.push(this.components[compName][compKey]);
          }
        }
      }
      return comps;
    },

    addSubcomponent: function addSubcomponent(aComp, aCompName) {
      var ucName, comp;
      var comp;
      if (aComp.icalclass == "icalcomponent") {
        ucName = aComp.name;
        comp = aComp.clone();
        comp.parent = this;
      } else {
        ucName = aCompName.toUpperCase();
        comp = new ICAL.icalcomponent(aComp, ucName, this);
      }

      this.data.value.push(comp);
      ICAL.helpers.ensureKeyExists(this.components, ucName, []);
      this.components[ucName].push(comp);
    },

    removeSubcomponent: function removeSubComponent(aName) {
      var ucName = aName.toUpperCase();
      for (var key in this.components[ucName]) {
        var pos = this.data.value.indexOf(this.components[ucName][key]);
        if (pos > -1) {
          this.data.value.splice(pos, 1);
        }
      }

      delete this.components[ucName];
    },

    hasProperty: function hasProperty(aName) {
      var ucName = aName.toUpperCase();
      return (ucName in this.properties);
    },

    getFirstProperty: function getFirstProperty(aName) {
      var prop = null;
      if (aName) {
        var ucName = aName.toUpperCase();
        if (ucName in this.properties && this.properties[ucName]) {
          prop = this.properties[ucName][0];
        }
      } else {
        for (var p in this.properties) {
          prop = this.properties[p];
          break;
        }
      }
      return prop;
    },

    getFirstPropertyValue: function getFirstPropertyValue(aName) {
      // TODO string value?
      var prop = this.getFirstProperty(aName);
      return (prop ? prop.getFirstValue() : null);
    },

    getAllProperties: function getAllProperties(aName) {
      var props = [];
      if (aName && aName != "ANY") {
        var ucType = aName.toUpperCase();
        if (ucType in this.properties) {
          props = this.properties[ucType].concat([]);
        }
      } else {
        for (var propName in this.properties) {
          props = props.concat(this.properties[propName]);
        }
      }
      return props;
    },

    /**
     * Adds or replaces a property with a given value.
     * Suitable for use when updating properties which
     * are expected to only have a single value (like DTSTART, SUMMARY, etc..)
     *
     * @param {String} aName property name.
     * @param {Object} aValue property value.
     */
    updatePropertyWithValue: function updatePropertyWithValue(aName, aValue) {
      if (!this.hasProperty(aName)) {
        return this.addPropertyWithValue(aName, aValue);
      }

      var prop = this.getFirstProperty(aName);

      var lineData = ICAL.icalparser.detectValueType({
        name: aName.toUpperCase(),
        value: aValue
      });

      prop.setValues(lineData.value, lineData.type);

      return prop;
    },

    addPropertyWithValue: function addStringProperty(aName, aValue) {
      var ucName = aName.toUpperCase();
      var lineData = ICAL.icalparser.detectValueType({
        name: ucName,
        value: aValue
      });

      var prop = ICAL.icalproperty.fromData(lineData);
      ICAL.helpers.dumpn("Adding property " + ucName + "=" + aValue);
      return this.addProperty(prop);
    },

    addProperty: function addProperty(aProp) {
      var prop = aProp;
      if (aProp.parent) {
        prop = aProp.clone();
      }
      aProp.parent = this;

      ICAL.helpers.ensureKeyExists(this.properties, aProp.name, []);
      this.properties[aProp.name].push(aProp);
      ICAL.helpers.dumpn("DATA IS: " + this.data.toString());
      this.data.value.push(aProp);
      ICAL.helpers.dumpn("Adding property " + aProp);
    },

    removeProperty: function removeProperty(aName) {
      var ucName = aName.toUpperCase();
      for (var key in this.properties[ucName]) {
        var pos = this.data.value.indexOf(this.properties[ucName][key]);
        if (pos > -1) {
          this.data.value.splice(pos, 1);
        }
      }
      delete this.properties[ucName];
    },

    clearAllProperties: function clearAllProperties() {
      this.properties = {};
      for (var i = this.data.value.length - 1; i >= 0; i--) {
        if (this.data.value[i].type != "COMPONENT") {
          delete this.data.value[i];
        }
      }
    },

    _valueToJSON: function(value) {
      if (value && value.icaltype) {
        return value.toString();
      }

      if (typeof(value) === 'object') {
        return this._undecorateJSON(value);
      }

      return value;
    },

    _undecorateJSON: function(object) {
      if (object instanceof Array) {
        var result = [];
        var len = object.length;

        for (var i = 0; i < len; i++) {
          result.push(this._valueToJSON(object[i]));
        }

      } else {
        var result = {};
        var key;

        for (key in object) {
          if (object.hasOwnProperty(key)) {
            result[key] = this._valueToJSON(object[key]);
          }
        }
      }

      return result;
    },

    /**
     * Exports the components values to a json friendly
     * object. You can use JSON.stringify directly on
     * components as a result.
     */
    toJSON: function toJSON() {
      return this._undecorateJSON(this.undecorate());
    },

    toString: function toString() {
      var str = ICAL.helpers.foldline("BEGIN:" + this.name) + ICAL.newLineChar;
      for (var key in this.data.value) {
        str += this.data.value[key].toString() + ICAL.newLineChar;
      }
      str += ICAL.helpers.foldline("END:" + this.name);
      return str;
    }
  };

  ICAL.icalcomponent.fromString = function icalcomponent_from_string(str) {
    return ICAL.icalcomponent.fromData(ICAL.parse(str));
  };

  ICAL.icalcomponent.fromData = function icalcomponent_from_data(aData) {
    return new ICAL.icalcomponent(aData);
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icalproperty = function icalproperty(data, parent) {
    this.wrappedJSObject = this;
    this.parent = parent;
    this.fromData(data);
  }

  ICAL.icalproperty.prototype = {
    parent: null,
    data: null,
    name: null,
    icalclass: "icalproperty",

    clone: function clone() {
      return new ICAL.icalproperty(this.undecorate(), this.parent);
    },

    fromData: function fromData(aData) {
      if (!aData.name) {
        ICAL.helpers.dumpn("Missing name: " + aData.toString());
      }
      this.name = aData.name;
      this.data = aData;
      this.setValues(this.data.value, this.data.type);
      delete this.data.name;
    },

    undecorate: function() {
      var values = [];
      for (var key in this.data.value) {
        var val = this.data.value[key];
        if ("undecorate" in val) {
          values.push(val.undecorate());
        } else {
          values.push(val);
        }
      }
      var obj = {
        name: this.name,
        type: this.data.type,
        value: values
      };
      if (this.data.parameters) {
        obj.parameters = this.data.parameters;
      }
      return obj;
    },

    toString: function toString() {
      return ICAL.icalparser.stringifyProperty({
        name: this.name,
        type: this.data.type,
        value: this.data.value,
        parameters: this.data.parameters
      });
    },

    getStringValue: function getStringValue() {
      ICAL.helpers.dumpn("GV: " + ICAL.icalparser.stringifyValue(this.data));
      return ICAL.icalparser.stringifyValue(this.data);
    },

    setStringValue: function setStringValue(val) {
      this.setValue(val, this.data.type);
      // TODO force TEXT or rename method to something like setParseValue()
    },

    getFirstValue: function getValue() {
      return (this.data.value ? this.data.value[0] : null);
    },

    getValues: function getValues() {
      return (this.data.value ? this.data.value : []);
    },

    setValue: function setValue(aValue, aType) {
      return this.setValues([aValue], aType);
    },

    setValues: function setValues(aValues, aType) {
      var newValues = [];
      var newType = null;
      for (var key in aValues) {
        var value = aValues[key];
        if (value.icalclass && value.icaltype) {
          if (newType && newType != value.icaltype) {
            throw new Error("All values must be of the same type!");
          } else {
            newType = value.icaltype;
          }
          newValues.push(value);
        } else {
          var type;
          if (aType) {
            type = aType;
          } else if (typeof value == "string") {
            type = "TEXT";
          } else if (typeof value == "number") {
            type = (Math.floor(value) == value ? "INTEGER" : "FLOAT");
          } else if (typeof value == "boolean") {
            type = "BOOLEAN";
            value = (value ? "TRUE" : "FALSE");
          } else {
            throw new ParserError(null, "Invalid value: " + value);
          }

          if (newType && newType != type) {
            throw new Error("All values must be of the same type!");
          } else {
            newType = type;
          }
          ICAL.icalparser.validateValue(this.data, type, "" + value, true);
          newValues.push(ICAL.icalparser.decorateValue(type, "" + value));
        }
      }

      this.data.value = newValues;
      this.data.type = newType;
      return aValues;
    },

    getValueType: function getValueType() {
      return this.data.type;
    },

    getName: function getName() {
      return this.name;
    },

    getParameterValue: function getParameter(aName) {
      var value = null;
      var ucName = aName.toUpperCase();
      if (ICAL.helpers.hasKey(this.data.parameters, ucName)) {
        value = this.data.parameters[ucName].value;
      }
      return value;
    },

    getParameterType: function getParameterType(aName) {
      var type = null;
      var ucName = aName.toUpperCase();
      if (ICAL.helpers.hasKey(this.data.parameters, ucName)) {
        type = this.data.parameters[ucName].type;
      }
      return type;
    },

    setParameter: function setParameter(aName, aValue, aType) {
      // TODO autodetect type by name
      var ucName = aName.toUpperCase();
      ICAL.helpers.ensureKeyExists(this.data, "parameters", {});
      this.data.parameters[ucName] = {
        type: aType || "TEXT",
        value: aValue
      };

      if (aName == "VALUE") {
        this.data.type = aValue;
        // TODO revalidate value
      }
    },

    countParameters: function countParmeters() {
      // TODO Object.keys compatibility?
      var dp = this.data.parameters;
      return (dp ? Object.keys(dp).length : 0);
    },

    removeParameter: function removeParameter(aName) {
      var ucName = aName.toUpperCase();
      if (ICAL.helpers.hasKey(this.data.parameters, ucName)) {
        delete this.data.parameters[ucName];
      }
    }
  };

  ICAL.icalproperty.fromData = function(aData) {
    return new ICAL.icalproperty(aData);
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icalvalue = function icalvalue(aData, aParent, aType) {
    this.parent = aParent;
    this.fromData(aData, aType);
  };

  ICAL.icalvalue.prototype = {

    data: null,
    parent: null,
    icaltype: null,

    fromData: function icalvalue_fromData(aData, aType) {
      var type = (aType || (aData && aData.type) || this.icaltype);
      this.icaltype = type;

      if (aData && type) {
        aData.type = type;
      }

      this.data = aData;
    },

    fromString: function icalvalue_fromString(aString, aType) {
      var type = aType || this.icaltype;
      this.fromData(ICAL.icalparser.parseValue(aString, type), type);
    },

    undecorate: function icalvalue_undecorate() {
      return this.toString();
    },

    toString: function() {
      return this.data.value.toString();
    }
  };

  ICAL.icalvalue.fromString = function icalvalue_fromString(aString, aType) {
    var val = new ICAL.icalvalue();
    val.fromString(aString, aType);
    return val;
  };

  ICAL.icalvalue._createFromString = function icalvalue__createFromString(ctor) {
    ctor.fromString = function icalvalue_derived_fromString(aStr) {
      var val = new ctor();
      val.fromString(aStr);
      return val;
    };
  };

  ICAL.icalbinary = function icalbinary(aData, aParent) {
    ICAL.icalvalue.call(this, aData, aParent, "BINARY");
  };

  ICAL.icalbinary.prototype = {

    __proto__: ICAL.icalvalue.prototype,

    icaltype: "BINARY",

    decodeValue: function decodeValue() {
      return this._b64_decode(this.data.value);
    },

    setEncodedValue: function setEncodedValue(val) {
      this.data.value = this._b64_encode(val);
    },

    _b64_encode: function base64_encode(data) {
      // http://kevin.vanzonneveld.net
      // +   original by: Tyler Akins (http://rumkin.com)
      // +   improved by: Bayron Guevara
      // +   improved by: Thunder.m
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   bugfixed by: Pellentesque Malesuada
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   improved by: Rafał Kukawski (http://kukawski.pl)
      // *     example 1: base64_encode('Kevin van Zonneveld');
      // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
      // mozilla has this native
      // - but breaks in 2.0.0.12!
      //if (typeof this.window['atob'] == 'function') {
      //    return atob(data);
      //}
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                "abcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = "",
        tmp_arr = [];

      if (!data) {
        return data;
      }

      do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1 << 16 | o2 << 8 | o3;

        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
      } while (i < data.length);

      enc = tmp_arr.join('');

      var r = data.length % 3;

      return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);

    },

    _b64_decode: function base64_decode(data) {
      // http://kevin.vanzonneveld.net
      // +   original by: Tyler Akins (http://rumkin.com)
      // +   improved by: Thunder.m
      // +      input by: Aman Gupta
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +   bugfixed by: Onno Marsman
      // +   bugfixed by: Pellentesque Malesuada
      // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // +      input by: Brett Zamir (http://brett-zamir.me)
      // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
      // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
      // *     returns 1: 'Kevin van Zonneveld'
      // mozilla has this native
      // - but breaks in 2.0.0.12!
      //if (typeof this.window['btoa'] == 'function') {
      //    return btoa(data);
      //}
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                "abcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        dec = "",
        tmp_arr = [];

      if (!data) {
        return data;
      }

      data += '';

      do { // unpack four hexets into three octets using index points in b64
        h1 = b64.indexOf(data.charAt(i++));
        h2 = b64.indexOf(data.charAt(i++));
        h3 = b64.indexOf(data.charAt(i++));
        h4 = b64.indexOf(data.charAt(i++));

        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;

        if (h3 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1);
        } else if (h4 == 64) {
          tmp_arr[ac++] = String.fromCharCode(o1, o2);
        } else {
          tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
        }
      } while (i < data.length);

      dec = tmp_arr.join('');

      return dec;
    }
  };
  ICAL.icalvalue._createFromString(ICAL.icalbinary);

  ICAL.icalutcoffset = function icalutcoffset(aData, aParent) {
    ICAL.icalvalue.call(this, aData, aParent, "UTC-OFFSET");
  };

  ICAL.icalutcoffset.prototype = {

    __proto__: ICAL.icalvalue.prototype,

    hours: null,
    minutes: null,
    factor: null,

    icaltype: "UTC-OFFSET",

    fromData: function fromData(aData) {
      if (aData) {
        this.hours = aData.hours;
        this.minutes = aData.minutes;
        this.factor = aData.factor;
      }
    },

    toString: function toString() {
      return (this.factor == 1 ? "+" : "-") +
              ICAL.helpers.pad2(this.hours) +
              ICAL.helpers.pad2(this.minutes);
    }
  };
  ICAL.icalvalue._createFromString(ICAL.icalutcoffset);
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icalperiod = function icalperiod(aData) {
    this.wrappedJSObject = this;
    this.fromData(aData);
  };

  ICAL.icalperiod.prototype = {

    start: null,
    end: null,
    duration: null,
    icalclass: "icalperiod",
    icaltype: "PERIOD",

    getDuration: function duration() {
      if (this.duration) {
        return this.duration;
      } else {
        return this.end.subtractDate(this.start);
      }
    },

    toString: function toString() {
      return this.start + "/" + (this.end || this.duration);
    },

    fromData: function fromData(data) {
      if (data) {
        this.start = ("start" in data ? new ICAL.icaltime(data.start) : null);
        this.end = ("end" in data ? new ICAL.icaltime(data.end) : null);
        this.duration = ("duration" in data ? new ICAL.icalduration(data.duration) : null);
      }
    }
  };

  ICAL.icalperiod.fromString = function fromString(str) {
    var data = ICAL.icalparser.parseValue(str, "PERIOD");
    return ICAL.icalperiod.fromData(data);
  };
  ICAL.icalperiod.fromData = function fromData(aData) {
    return new ICAL.icalperiod(aData);
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icalduration = function icalduration(data) {
    this.wrappedJSObject = this;
    this.fromData(data);
  };

  ICAL.icalduration.prototype = {

    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isNegative: false,
    icalclass: "icalduration",
    icaltype: "DURATION",

    clone: function clone() {
      return ICAL.icalduration.fromData(this);
    },

    toSeconds: function toSeconds() {
      var seconds = this.seconds + 60 * this.minutes + 3600 * this.hours +
                    86400 * this.days + 7 * 86400 * this.weeks;
      return (this.isNegative ? -seconds : seconds);
    },

    fromSeconds: function fromSeconds(aSeconds) {
      var secs = Math.abs(aSeconds);

      this.isNegative = (aSeconds < 0);
      this.days = ICAL.helpers.trunc(secs / 86400);

      // If we have a flat number of weeks, use them.
      if (this.days % 7 == 0) {
        this.weeks = this.days / 7;
        this.days = 0;
      } else {
        this.weeks = 0;
      }

      secs -= (this.days + 7 * this.weeks) * 86400;

      this.hours = ICAL.helpers.trunc(secs / 3600);
      secs -= this.hours * 3600;

      this.minutes = ICAL.helpers.trunc(secs / 60);
      secs -= this.minutes * 60;

      this.seconds = secs;
      return this;
    },

    fromData: function fromData(aData) {
      var propsToCopy = ["weeks", "days", "hours",
                         "minutes", "seconds", "isNegative"];
      for (var key in propsToCopy) {
        var prop = propsToCopy[key];
        if (aData && prop in aData) {
          this[prop] = aData[prop];
        } else {
          this[prop] = 0;
        }
      }

      if (aData && "factor" in aData) {
        this.isNegative = (aData.factor == "-1");
      }
    },

    reset: function reset() {
      this.isNegative = false;
      this.weeks = 0;
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      this.seconds = 0;
    },

    compare: function compare(aOther) {
      var thisSeconds = this.toSeconds();
      var otherSeconds = aOther.toSeconds();
      return (thisSeconds > otherSeconds) - (thisSeconds < otherSeconds);
    },

    normalize: function normalize() {
      this.fromSeconds(this.toSeconds());
      return this;
    },

    toString: function toString() {
      if (this.toSeconds() == 0) {
        return "PT0S";
      } else {
        var str = "";
        if (this.isNegative) str += "-";
        str += "P";
        if (this.weeks) str += this.weeks + "W";
        if (this.days) str += this.days + "D";

        if (this.hours || this.minutes || this.seconds) {
          str += "T";
          if (this.hours) str += this.hours + "H";
          if (this.minutes) str += this.minutes + "M";
          if (this.seconds) str += this.seconds + "S";
        }
        return str;
      }
    }
  };

  ICAL.icalduration.fromSeconds = function icalduration_from_seconds(aSeconds) {
    return (new ICAL.icalduration()).fromSeconds();
  };

  ICAL.icalduration.fromString = function icalduration_from_string(aStr) {
    var data = ICAL.icalparser.parseValue(aStr, "DURATION");
    return ICAL.icalduration.fromData(data);
  };

  ICAL.icalduration.fromData = function icalduration_from_data(aData) {
    return new ICAL.icalduration(aData);
  };
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icaltimezone = function icaltimezone(data) {
    this.wrappedJSObject = this;
    this.fromData(data);
  };

  ICAL.icaltimezone.prototype = {

    tzid: "",
    location: "",
    tznames: "",

    latitude: 0.0,
    longitude: 0.0,

    component: null,

    expand_end_year: 0,
    expand_start_year: 0,

    changes: null,
    icalclass: "icaltimezone",

    fromData: function fromData(aData) {
      var propsToCopy = ["tzid", "location", "tznames",
                         "latitude", "longitude"];
      for (var key in propsToCopy) {
        var prop = propsToCopy[key];
        if (aData && prop in aData) {
          this[prop] = aData[prop];
        } else {
          this[prop] = 0;
        }
      }

      this.expand_end_year = 0;
      this.expand_start_year = 0;
      if (aData && "component" in aData) {
        if (typeof aData.component == "string") {
          this.component = this.componentFromString(aData.component);
        } else {
          this.component = ICAL.helpers.clone(aData.component, true);
        }
      } else {
        this.component = null;
      }
      return this;
    },

    componentFromString: function componentFromString(str) {
      this.component = ICAL.toJSON(str, true);
      return this.component;
    },

    utc_offset: function utc_offset(tt) {
      if (this == ICAL.icaltimezone.utc_timezone || this == ICAL.icaltimezone.local_timezone) {
        return 0;
      }

      this.ensure_coverage(tt.year);

      if (!this.changes || this.changes.length == 0) {
        return 0;
      }

      var tt_change = {
        year: tt.year,
        month: tt.month,
        day: tt.day,
        hour: tt.hour,
        minute: tt.minute,
        second: tt.second
      };

      var change_num = this.find_nearby_change(tt_change);
      var change_num_to_use = -1;
      var step = 1;

      for (;;) {
        var change = ICAL.helpers.clone(this.changes[change_num], true);
        if (change.utc_offset < change.prev_utc_offset) {
          ICAL.helpers.dumpn("Adjusting " + change.utc_offset);
          ICAL.icaltimezone.adjust_change(change, 0, 0, 0, change.utc_offset);
        } else {
          ICAL.helpers.dumpn("Adjusting prev " + change.prev_utc_offset);
          ICAL.icaltimezone.adjust_change(change, 0, 0, 0,
                                          change.prev_utc_offset);
        }

        var cmp = ICAL.icaltimezone._compare_change_fn(tt_change, change);
        ICAL.helpers.dumpn("Compare" + cmp + " / " + change.toString());

        if (cmp >= 0) {
          change_num_to_use = change_num;
        } else {
          step = -1;
        }

        if (step == -1 && change_num_to_use != -1) {
          break;
        }

        change_num += step;

        if (change_num < 0) {
          return 0;
        }

        if (change_num >= this.changes.length) {
          break;
        }
      }

      var zone_change = this.changes[change_num_to_use];
      var utc_offset_change = zone_change.utc_offset - zone_change.prev_utc_offset;

      if (utc_offset_change < 0 && change_num_to_use > 0) {
        var tmp_change = ICAL.helpers.clone(zone_change, true);
        ICAL.icaltimezone.adjust_change(tmp_change, 0, 0, 0,
                                        tmp_change.prev_utc_offset);

        if (ICAL.icaltimezone._compare_change_fn(tt_change, tmp_change) < 0) {
          var prev_zone_change = this.changes[change_num_to_use - 1];

          var want_daylight = false; // TODO

          if (zone_change.is_daylight != want_daylight &&
              prev_zone_change.is_daylight == want_daylight) {
            zone_change = prev_zone_change;
          }
        }
      }

      // TODO return is_daylight?
      return zone_change.utc_offset;
    },

    find_nearby_change: function icaltimezone_find_nearby_change(change) {
      var lower = 0,
        middle = 0;
      var upper = this.changes.length;

      while (lower < upper) {
        middle = ICAL.helpers.trunc(lower + upper / 2);
        var zone_change = this.changes[middle];
        var cmp = ICAL.icaltimezone._compare_change_fn(change, zone_change);
        if (cmp == 0) {
          break;
        } else if (cmp > 0) {
          upper = middle;
        } else {
          lower = middle;
        }
      }

      return middle;
    },

    ensure_coverage: function ensure_coverage(aYear) {
      if (ICAL.icaltimezone._minimum_expansion_year == -1) {
        var today = ICAL.icaltime.now();
        ICAL.icaltimezone._minimum_expansion_year = today.year;
      }

      var changes_end_year = aYear;
      if (changes_end_year < ICAL.icaltimezone._minimum_expansion_year) {
        changes_end_year = ICAL.icaltimezone._minimum_expansion_year;
      }

      changes_end_year += ICAL.icaltimezone.EXTRA_COVERAGE;

      if (changes_end_year > ICAL.icaltimezone.MAX_YEAR) {
        changes_end_year = ICAL.icaltimezone.MAX_YEAR;
      }

      if (!this.changes || this.expand_end_year < aYear) {
        this.expand_changes(changes_end_year);
      }
    },

    expand_changes: function expand_changes(aYear) {
      var changes = [];
      if (this.component) {
        // HACK checking for component only needed for floating
        // tz, which is not in core libical.
        var subcomps = this.component.getAllSubcomponents();
        for (var compkey in subcomps) {
          this.expand_vtimezone(subcomps[compkey], aYear, changes);
        }

        this.changes = changes.concat(this.changes || []);
        this.changes.sort(ICAL.icaltimezone._compare_change_fn);
      }

      this.change_end_year = aYear;
    },

    expand_vtimezone: function expand_vtimezone(aComponent, aYear, changes) {
      if (!aComponent.hasProperty("DTSTART") ||
          !aComponent.hasProperty("TZOFFSETTO") ||
          !aComponent.hasProperty("TZOFFSETFROM")) {
        return null;
      }

      var dtstart = aComponent.getFirstProperty("DTSTART").getFirstValue();

      function convert_tzoffset(offset) {
        return offset.factor * (offset.hours * 3600 + offset.minutes * 60);
      }

      function init_changes() {
        var changebase = {};
        changebase.is_daylight = (aComponent.name == "DAYLIGHT");
        changebase.utc_offset = convert_tzoffset(aComponent.getFirstProperty("TZOFFSETTO").data);
        changebase.prev_utc_offset = convert_tzoffset(aComponent.getFirstProperty("TZOFFSETFROM").data);
        return changebase;
      }

      if (!aComponent.hasProperty("RRULE") && !aComponent.hasProperty("RDATE")) {
        var change = init_changes();
        change.year = dtstart.year;
        change.month = dtstart.month;
        change.day = dtstart.day;
        change.hour = dtstart.hour;
        change.minute = dtstart.minute;
        change.second = dtstart.second;

        ICAL.icaltimezone.adjust_change(change, 0, 0, 0,
                                        -change.prev_utc_offset);
        changes.push(change);
      } else {
        var props = aComponent.getAllProperties("RDATE");
        for (var rdatekey in props) {
          var rdate = props[rdatekey];
          var change = init_changes();
          change.year = rdate.time.year;
          change.month = rdate.time.month;
          change.day = rdate.time.day;

          if (rdate.time.isDate) {
            change.hour = dtstart.hour;
            change.minute = dtstart.minute;
            change.second = dtstart.second;
          } else {
            change.hour = rdate.time.hour;
            change.minute = rdate.time.minute;
            change.second = rdate.time.second;

            if (rdate.time.zone == ICAL.icaltimezone.utc_timezone) {
              ICAL.icaltimezone.adjust_change(change, 0, 0, 0,
                                              -change.prev_utc_offset);
            }
          }

          changes.push(change);
        }

        var rrule = aComponent.getFirstProperty("RRULE").getFirstValue();
        // TODO multiple rrules?

        var change = init_changes();

        if (rrule.until && rrule.until.zone == ICAL.icaltimezone.utc_timezone) {
          rrule.until.adjust(0, 0, 0, change.prev_utc_offset);
          rrule.until.zone = ICAL.icaltimezone.local_timezone;
        }

        var iterator = rrule.iterator(dtstart);

        var occ;
        while ((occ = iterator.next())) {
          var change = init_changes();
          if (occ.year > aYear || !occ) {
            break;
          }

          change.year = occ.year;
          change.month = occ.month;
          change.day = occ.day;
          change.hour = occ.hour;
          change.minute = occ.minute;
          change.second = occ.second;
          change.isDate = occ.isDate;

          ICAL.icaltimezone.adjust_change(change, 0, 0, 0,
                                          -change.prev_utc_offset);
          changes.push(change);
        }
      }

      return changes;
    },

    toString: function toString() {
      return (this.tznames ? this.tznames : this.tzid);
    }

  };

  ICAL.icaltimezone._compare_change_fn = function icaltimezone_compare_change_fn(a, b) {
    if (a.year < b.year) return -1;
    else if (a.year > b.year) return 1;

    if (a.month < b.month) return -1;
    else if (a.month > b.month) return 1;

    if (a.day < b.day) return -1;
    else if (a.day > b.day) return 1;

    if (a.hour < b.hour) return -1;
    else if (a.hour > b.hour) return 1;

    if (a.minute < b.minute) return -1;
    else if (a.minute > b.minute) return 1;

    if (a.second < b.second) return -1;
    else if (a.second > b.second) return 1;

    return 0;
  };

  ICAL.icaltimezone.convert_time = function icaltimezone_convert_time(tt, from_zone, to_zone) {
    if (tt.isDate ||
        from_zone.tzid == to_zone.tzid ||
        from_zone == ICAL.icaltimezone.local_timezone ||
        to_zone == ICAL.icaltimezone.local_timezone) {
      tt.zone = to_zone;
      return tt;
    }

    var utc_offset = from_zone.utc_offset(tt);
    tt.adjust(0, 0, 0, - utc_offset);

    utc_offset = to_zone.utc_offset(tt);
    tt.adjust(0, 0, 0, utc_offset);

    return null;
  };

  ICAL.icaltimezone.fromData = function icaltimezone_fromData(aData) {
    var tt = new ICAL.icaltimezone();
    return tt.fromData(aData);
  };

  ICAL.icaltimezone.utc_timezone = ICAL.icaltimezone.fromData({
    tzid: "UTC"
  });
  ICAL.icaltimezone.local_timezone = ICAL.icaltimezone.fromData({
    tzid: "floating"
  });

  ICAL.icaltimezone.adjust_change = function icaltimezone_adjust_change(change, days, hours, minutes, seconds) {
    return ICAL.icaltime.prototype.adjust.call(change, days, hours, minutes, seconds);
  };

  ICAL.icaltimezone._minimum_expansion_year = -1;
  ICAL.icaltimezone.MAX_YEAR = 2035; // TODO this is because of time_t, which we don't need. Still usefull?
  ICAL.icaltimezone.EXTRA_COVERAGE = 5;
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {
  ICAL.icaltime = function icaltime(data) {
    this.wrappedJSObject = this;
    this.fromData(data);
  };

  ICAL.icaltime.prototype = {

    year: 0,
    month: 1,
    day: 1,

    hour: 0,
    minute: 0,
    second: 0,

    isDate: false,
    zone: null,

    auto_normalize: false,
    icalclass: "icaltime",
    icaltype: "DATE-TIME",

    clone: function icaltime_clone() {
      return new ICAL.icaltime(this);
    },

    reset: function icaltime_reset() {
      this.fromData(ICAL.icaltime.epoch_time);
      this.zone = ICAL.icaltimezone.utc_timezone;
    },

    resetTo: function icaltime_resetTo(year, month, day,
                                       hour, minute, second, timezone) {
      this.fromData({
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        zone: timezone
      });
    },

    fromString: function icaltime_fromString(str) {
      var data;
      try {
        data = ICAL.icalparser.parseValue(str, "DATE");
        data.isDate = true;
      } catch (e) {
        data = ICAL.icalparser.parseValue(str, "DATE-TIME");
        data.isDate = false;
      }
      return this.fromData(data);
    },

    fromJSDate: function icaltime_fromJSDate(aDate, useUTC) {
      if (!aDate) {
        this.reset();
      } else {
        if (useUTC) {
          this.zone = ICAL.icaltimezone.utc_timezone;
          this.year = aDate.getUTCFullYear();
          this.month = aDate.getUTCMonth() + 1;
          this.day = aDate.getUTCDate();
          this.hour = aDate.getUTCHours();
          this.minute = aDate.getUTCMinutes();
          this.second = aDate.getUTCSeconds();
        } else {
          this.zone = ICAL.icaltimezone.local_timezone;
          this.year = aDate.getFullYear();
          this.month = aDate.getMonth() + 1;
          this.day = aDate.getDate();
          this.hour = aDate.getHours();
          this.minute = aDate.getMinutes();
          this.second = aDate.getSeconds();
        }
      }
      return this;
    },

    fromData: function fromData(aData) {
      // TODO given we're switching formats, this may not be needed
      var old_auto_normalize = this.auto_normalize;
      this.auto_normalize = false;

      var propsToCopy = {
        year: 0,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0
      };
      for (var key in propsToCopy) {
        if (aData && key in aData) {
          this[key] = aData[key];
        } else {
          this[key] = propsToCopy[key];
        }
      }
      if (aData && !("isDate" in aData)) {
        this.isDate = !("hour" in aData);
      } else if (aData && ("isDate" in aData)) {
        this.isDate = aData.isDate;
      }

      if (aData && "timezone" in aData) {
        var timezone = aData.timezone;

        //TODO: replace with timezone service
        switch (timezone) {
          case 'Z':
          case ICAL.icaltimezone.utc_timezone.tzid:
            this.zone = ICAL.icaltimezone.utc_timezone;
            break;
          case ICAL.icaltimezone.local_timezone.tzid:
            this.zone = ICAL.icaltimezone.local_timezone;
            break;
        }
      }

      if (aData && "zone" in aData) {
        this.zone = aData.zone;
      }

      if (!this.zone) {
        this.zone = ICAL.icaltimezone.local_timezone;
      }

      if (aData && "auto_normalize" in aData) {
        this.auto_normalize = aData.auto_normalize;
      } else {
        this.auto_normalize = old_auto_normalize;
      }
      if (this.auto_normalize) {
        this.normalize();
      }
      return this;
    },

    dayOfWeek: function icaltime_dayOfWeek() {
      // Using Zeller's algorithm
      var q = this.day;
      var m = this.month + (this.month < 3 ? 12 : 0);
      var Y = this.year - (this.month < 3 ? 1 : 0);

      var h = (q + Y + ICAL.helpers.trunc(((m + 1) * 26) / 10) + ICAL.helpers.trunc(Y / 4));
      if (true /* gregorian */) {
        h += ICAL.helpers.trunc(Y / 100) * 6 + ICAL.helpers.trunc(Y / 400);
      } else {
        h += 5;
      }

      // Normalize to 1 = sunday
      h = ((h + 6) % 7) + 1;
      return h;
    },

    dayOfYear: function icaltime_dayOfYear() {
      var is_leap = (ICAL.icaltime.is_leap_year(this.year) ? 1 : 0);
      var diypm = ICAL.icaltime._days_in_year_passed_month;
      return diypm[is_leap][this.month - 1] + this.day;
    },

    startOfWeek: function startOfWeek() {
      var result = this.clone();
      result.day -= this.dayOfWeek() - 1;
      return result.normalize();
    },

    end_of_week: function end_of_week() {
      var result = this.clone();
      result.day += 7 - this.dayOfWeek();
      return result.normalize();
    },

    start_of_month: function start_of_month() {
      var result = this.clone();
      result.day = 1;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    end_of_month: function end_of_month() {
      var result = this.clone();
      result.day = ICAL.icaltime.daysInMonth(result.month, result.year);
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    start_of_year: function start_of_year() {
      var result = this.clone();
      result.day = 1;
      result.month = 1;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    end_of_year: function end_of_year() {
      var result = this.clone();
      result.day = 31;
      result.month = 12;
      result.isDate = true;
      result.hour = 0;
      result.minute = 0;
      result.second = 0;
      return result;
    },

    start_doy_week: function start_doy_week(aFirstDayOfWeek) {
      var firstDow = aFirstDayOfWeek || ICAL.icaltime.SUNDAY;
      var delta = this.dayOfWeek() - firstDow;
      if (delta < 0) delta += 7;
      return this.dayOfYear() - delta;
    },

    /**
     * Finds the nthWeekDay relative to the current month (not day).
     * The returned value is a day relative the month that this
     * month belongs to so 1 would indicate the first of the month
     * and 40 would indicate a day in the following month.
     *
     * @param {Numeric} aDayOfWeek day of the week see the day name constants.
     * @param {Numeric} aPos nth occurrence of a given week day
     *                       values of 1 and 0 both indicate the first
     *                       weekday of that type. aPos may be either positive
     *                       or negative.
     *
     * @return {Numeric} numeric value indicating a day relative
     *                   to the current month of this time object.
     */
    nthWeekDay: function icaltime_nthWeekDay(aDayOfWeek, aPos) {
      var daysInMonth = ICAL.icaltime.daysInMonth(this.month, this.year);
      var weekday;
      var pos = aPos;

      var start = 0;

      var otherDay = this.clone();

      if (pos >= 0) {
        otherDay.day = 1;

        // because 0 means no position has been given
        // 1 and 0 indicate the same day.
        if (pos != 0) {
          // remove the extra numeric value
          pos--;
        }

        // set current start offset to current day.
        start = otherDay.day;

        // find the current day of week
        var startDow = otherDay.dayOfWeek();

        // calculate the difference between current
        // day of the week and desired day of the week
        var offset = aDayOfWeek - startDow;


        // if the offset goes into the past
        // week we add 7 so its goes into the next
        // week. We only want to go forward in time here.
        if (offset < 0)
          // this is really important otherwise we would
          // end up with dates from in the past.
          offset += 7;

        // add offset to start so start is the same
        // day of the week as the desired day of week.
        start += offset;

        // because we are going to add (and multiply)
        // the numeric value of the day we subtract it
        // from the start position so not to add it twice.
        start -= aDayOfWeek;

        // set week day
        weekday = aDayOfWeek;
      } else {

        // then we set it to the last day in the current month
        otherDay.day = daysInMonth;

        // find the ends weekday
        var endDow = otherDay.dayOfWeek();

        pos++;

        weekday = (endDow - aDayOfWeek);

        if (weekday < 0) {
          weekday += 7;
        }

        weekday = daysInMonth - weekday;
      }

      weekday += pos * 7;

      return start + weekday;
    },

    /**
     * Checks if current time is the nthWeekDay.
     * Relative to the current month.
     *
     * Will always return false when rule resolves
     * outside of current month.
     *
     * @param {Numeric} aDayOfWeek day of week.
     * @param {Numeric} aPos position.
     * @param {Numeric} aMax maximum valid day.
     */
    isNthWeekDay: function(aDayOfWeek, aPos) {
      var dow = this.dayOfWeek();

      if (aPos === 0 && dow === aDayOfWeek) {
        return true;
      }

      // get pos
      var day = this.nthWeekDay(aDayOfWeek, aPos);

      if (day === this.day) {
        return true;
      }

      return false;
    },

    week_number: function week_number(aWeekStart) {
      // This function courtesty of Julian Bucknall, published under the MIT license
      // http://www.boyet.com/articles/publishedarticles/calculatingtheisoweeknumb.html
      var doy = this.dayOfYear();
      var dow = this.dayOfWeek();
      var year = this.year;
      var week1;

      var dt = this.clone();
      dt.isDate = true;
      var first_dow = dt.dayOfWeek();
      var isoyear = this.year;

      if (dt.month == 12 && dt.day > 28) {
        week1 = ICAL.icaltime.week_one_starts(isoyear + 1, aWeekStart);
        if (dt.compare(week1) < 0) {
          week1 = ICAL.icaltime.week_one_starts(isoyear, aWeekStart);
        } else {
          isoyear++;
        }
      } else {
        week1 = ICAL.icaltime.week_one_starts(isoyear, aWeekStart);
        if (dt.compare(week1) < 0) {
          week1 = ICAL.icaltime.week_one_starts(--isoyear, aWeekStart);
        }
      }

      var daysBetween = (dt.subtractDate(week1).toSeconds() / 86400);
      return ICAL.helpers.trunc(daysBetween / 7) + 1;
    },

    addDuration: function icaltime_add(aDuration) {
      var mult = (aDuration.isNegative ? -1 : 1);

      this.second += mult * aDuration.seconds;
      this.minute += mult * aDuration.minutes;
      this.hour += mult * aDuration.hours;
      this.day += mult * aDuration.days;
      this.day += mult * 7 * aDuration.weeks;

      this.normalize();
    },

    subtractDate: function icaltime_subtract(aDate) {
      function leap_years_until(aYear) {
        return ICAL.helpers.trunc(aYear / 4) -
               ICAL.helpers.trunc(aYear / 100) +
               ICAL.helpers.trunc(aYear / 400);
      }

      function leap_years_between(aStart, aEnd) {
        if (aStart >= aEnd) {
          return 0;
        } else {
          return leap_years_until(aEnd - 1) - leap_years_until(aStart);
        }
      }
      var dur = new ICAL.icalduration();

      dur.seconds = this.second - aDate.second;
      dur.minutes = this.minute - aDate.minute;
      dur.hours = this.hour - aDate.hour;

      if (this.year == aDate.year) {
        var this_doy = this.dayOfYear();
        var that_doy = aDate.dayOfYear();
        dur.days = this_doy - that_doy;
      } else if (this.year < aDate.year) {
        var days_left_thisyear = 365 +
          (ICAL.icaltime.is_leap_year(this.year) ? 1 : 0) -
          this.dayOfYear();

        dur.days -= days_left_thisyear + aDate.dayOfYear();
        dur.days -= leap_years_between(this.year + 1, aDate.year);
        dur.days -= 365 * (aDate.year - this.year - 1);
      } else {
        var days_left_thatyear = 365 +
          (ICAL.icaltime.is_leap_year(aDate.year) ? 1 : 0) -
          aDate.dayOfYear();

        dur.days += days_left_thatyear + this.dayOfYear();
        dur.days += leap_years_between(aDate.year + 1, this.year);
        dur.days += 365 * (this.year - aDate.year - 1);
      }

      return dur.normalize();
    },

    compare: function icaltime_compare(other) {
      function cmp(attr) {
        return ICAL.icaltime._cmp_attr(a, b, attr);
      }

      if (!other) return 0;

      if (this.isDate || other.isDate) {
        return this.compare_date_only_tz(other, this.zone);
      }

      var target_zone;
      if (this.zone == ICAL.icaltimezone.local_timezone ||
          other.zone == ICAL.icaltimezone.local_timezone) {
        target_zone = ICAL.icaltimezone.local_timezone;
      } else {
        target_zone = ICAL.icaltimezone.utc_timezone;
      }

      var a = this.convert_to_zone(target_zone);
      var b = other.convert_to_zone(target_zone);
      var rc = 0;

      if ((rc = cmp("year")) != 0) return rc;
      if ((rc = cmp("month")) != 0) return rc;
      if ((rc = cmp("day")) != 0) return rc;

      if (a.isDate && b.isDate) {
        // If both are dates, we are done
        return 0;
      } else if (b.isDate) {
        // If b is a date, then a is greater
        return 1;
      } else if (a.isDate) {
        // If a is a date, then b is greater
        return -1;
      }

      if ((rc = cmp("hour")) != 0) return rc;
      if ((rc = cmp("minute")) != 0) return rc;
      if ((rc = cmp("second")) != 0) return rc;

      // Now rc is 0 and the dates are equal
      return rc;
    },

    compare_date_only_tz: function icaltime_compare_date_only_tz(other, tz) {
      function cmp(attr) {
        return ICAL.icaltime._cmp_attr(a, b, attr);
      }
      var a = this.convert_to_zone(tz);
      var b = other.convert_to_zone(tz);
      var rc = 0;

      if ((rc = cmp("year")) != 0) return rc;
      if ((rc = cmp("month")) != 0) return rc;
      if ((rc = cmp("day")) != 0) return rc;

      return rc;
    },

    convert_to_zone: function convert_to_zone(zone) {
      var copy = this.clone();
      var zone_equals = (this.zone.tzid == zone.tzid);

      if (!this.isDate && !zone_equals) {
        ICAL.icaltimezone.convert_time(copy, this.zone, zone);
      }

      copy.zone = zone;
      return copy;
    },

    utc_offset: function utc_offset() {
      if (this.zone == ICAL.icaltimezone.local_timezone ||
          this.zone == ICAL.icaltimezone.utc_timezone) {
        return 0;
      } else {
        return this.zone.utc_offset(this);
      }
    },

    toString: function toString() {
        return ("0000" + this.year).substr(-4) +
               ("00" + this.month).substr(-2) +
               ("00" + this.day).substr(-2) +
               (this.isDate ? "" :
                 "T" +
                 ("00" + this.hour).substr(-2) +
                 ("00" + this.minute).substr(-2) +
                 ("00" + this.second).substr(-2) +
                 (this.zone && this.zone.tzid == "UTC" ? "Z" : "")
               );
    },

    toJSDate: function toJSDate() {
      if (this.zone == ICAL.icaltimezone.local_timezone) {
        if (this.isDate) {
          return new Date(this.year, this.month - 1, this.day);
        } else {
          return new Date(this.year, this.month - 1, this.day,
                          this.hour, this.minute, this.second, 0);
        }
      } else {
        var utcDate = this.convert_to_zone(ICAL.icaltimezone.utc_timezone);
        if (this.isDate) {
          return Date.UTC(this.year, this.month - 1, this.day);
        } else {
          return Date.UTC(this.year, this.month - 1, this.day,
                          this.hour, this.minute, this.second, 0);
        }
      }
    },

    normalize: function icaltime_normalize() {
      if (this.isDate) {
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
      }
      this.icaltype = (this.isDate ? "DATE" : "DATE-TIME");

      this.adjust(0, 0, 0, 0);
      return this;
    },

    adjust: function icaltime_adjust(aExtraDays, aExtraHours,
                                     aExtraMinutes, aExtraSeconds) {
      var second, minute, hour, day;
      var minutes_overflow, hours_overflow, days_overflow = 0,
        years_overflow = 0;
      var daysInMonth;

      if (!this.isDate) {
        second = this.second + aExtraSeconds;
        this.second = second % 60;
        minutes_overflow = ICAL.helpers.trunc(second / 60);
        if (this.second < 0) {
          this.second += 60;
          minutes_overflow--;
        }

        minute = this.minute + aExtraMinutes + minutes_overflow;
        this.minute = minute % 60;
        hours_overflow = ICAL.helpers.trunc(minute / 60);
        if (this.minute < 0) {
          this.minute += 60;
          hours_overflow--;
        }

        hour = this.hour + aExtraHours + hours_overflow;
        this.hour = hour % 24;
        days_overflow = ICAL.helpers.trunc(hour / 24);
        if (this.hour < 0) {
          this.hour += 24;
          days_overflow--;
        }
      }

      // Adjust month and year first, because we need to know what month the day
      // is in before adjusting it.
      if (this.month > 12) {
        years_overflow = ICAL.helpers.trunc((this.month - 1) / 12);
      } else if (this.month < 1) {
        years_overflow = ICAL.helpers.trunc(this.month / 12) - 1;
      }

      this.year += years_overflow;
      this.month -= 12 * years_overflow;

      // Now take care of the days (and adjust month if needed)
      day = this.day + aExtraDays + days_overflow;
      if (day > 0) {
        for (;;) {
          var daysInMonth = ICAL.icaltime.daysInMonth(this.month, this.year);
          if (day <= daysInMonth) {
            break;
          }

          this.month++;
          if (this.month > 12) {
            this.year++;
            this.month = 1;
          }

          day -= daysInMonth;
        }
      } else {
        while (day <= 0) {
          if (this.month == 1) {
            this.year--;
            this.month = 12;
          } else {
            this.month--;
          }

          day += ICAL.icaltime.daysInMonth(this.month, this.year);
        }
      }

      this.day = day;
      return this;
    },

    fromUnixTime: function fromUnixTime(seconds) {
      var epoch = ICAL.icaltime.epoch_time.clone();
      epoch.adjust(0, 0, 0, seconds);
      this.fromData(epoch);
      this.zone = ICAL.icaltimezone.utc_timezone;
    },

    toUnixTime: function toUnixTime() {
      var dur = this.subtractDate(ICAL.icaltime.epoch_time);
      return dur.toSeconds();
    },

    /**
     * Converts time to into Object
     * which can be serialized then re-created
     * using the constructor.
     *
     * Example:
     *
     *    // toJSON will automatically be called
     *    var json = JSON.stringify(mytime);
     *
     *    var deserialized = JSON.parse(json);
     *
     *    var time = new ICAL.icaltime(deserialized);
     *
     */
    toJSON: function() {
      var copy = [
        'year',
        'month',
        'day',
        'hour',
        'minute',
        'second',
        'isDate'
      ];

      var result = Object.create(null);

      var i = 0;
      var len = copy.length;
      var prop;

      for (; i < len; i++) {
        prop = copy[i];
        result[prop] = this[prop];
      }

      if (this.zone) {
        result.timezone = this.zone.tzid;
      }

      return result;
    }

  };

  (function setupNormalizeAttributes() {
    // This needs to run before any instances are created!
    function addAutoNormalizeAttribute(attr, mattr) {
      ICAL.icaltime.prototype[mattr] = ICAL.icaltime.prototype[attr];

      Object.defineProperty(ICAL.icaltime.prototype, attr, {
        get: function() {
          return this[mattr];
        },
        set: function(val) {
          this[mattr] = val;
          if (this.auto_normalize) {
            var old_normalize = this.auto_normalize;
            this.auto_normalize = false;
            this.normalize();
            this.auto_normalize = old_normalize;
          }
          return val;
        }
      });

    }

    if ("defineProperty" in Object) {
      addAutoNormalizeAttribute("year", "mYear");
      addAutoNormalizeAttribute("month", "mMonth");
      addAutoNormalizeAttribute("day", "mDay");
      addAutoNormalizeAttribute("hour", "mHour");
      addAutoNormalizeAttribute("minute", "mMinute");
      addAutoNormalizeAttribute("second", "mSecond");
      addAutoNormalizeAttribute("isDate", "mIsDate");

      ICAL.icaltime.prototype.auto_normalize = true;
    }
  })();

  ICAL.icaltime.daysInMonth = function icaltime_daysInMonth(month, year) {
    var _daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var days = 30;

    if (month < 1 || month > 12) return days;

    days = _daysInMonth[month];

    if (month == 2) {
      days += ICAL.icaltime.is_leap_year(year);
    }

    return days;
  };

  ICAL.icaltime.is_leap_year = function icaltime_is_leap_year(year) {
    if (year <= 1752) {
      return ((year % 4) == 0);
    } else {
      return (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0));
    }
  };

  ICAL.icaltime.fromDayOfYear = function icaltime_fromDayOfYear(aDayOfYear, aYear) {
    var year = aYear;
    var doy = aDayOfYear;
    var tt = new ICAL.icaltime();
    tt.auto_normalize = false;
    var is_leap = (ICAL.icaltime.is_leap_year(year) ? 1 : 0);

    if (doy < 1) {
      year--;
      is_leap = (ICAL.icaltime.is_leap_year(year) ? 1 : 0);
      doy += ICAL.icaltime._days_in_year_passed_month[is_leap][12];
    } else if (doy > ICAL.icaltime._days_in_year_passed_month[is_leap][12]) {
      is_leap = (ICAL.icaltime.is_leap_year(year) ? 1 : 0);
      doy -= ICAL.icaltime._days_in_year_passed_month[is_leap][12];
      year++;
    }

    tt.year = year;
    tt.isDate = true;

    for (var month = 11; month >= 0; month--) {
      if (doy > ICAL.icaltime._days_in_year_passed_month[is_leap][month]) {
        tt.month = month + 1;
        tt.day = doy - ICAL.icaltime._days_in_year_passed_month[is_leap][month];
        break;
      }
    }

    tt.auto_normalize = true;
    return tt;
  };

  ICAL.icaltime.fromString = function fromString(str) {
    var tt = new ICAL.icaltime();
    return tt.fromString(str);
  };

  ICAL.icaltime.fromJSDate = function fromJSDate(aDate, useUTC) {
    var tt = new ICAL.icaltime();
    return tt.fromJSDate(aDate, useUTC);
  };

  ICAL.icaltime.fromData = function fromData(aData) {
    var t = new ICAL.icaltime();
    return t.fromData(aData);
  };

  ICAL.icaltime.now = function icaltime_now() {
    return ICAL.icaltime.fromJSDate(new Date(), false);
  };

  ICAL.icaltime.week_one_starts = function week_one_starts(aYear, aWeekStart) {
    var t = ICAL.icaltime.fromData({
      year: aYear,
      month: 1,
      day: 4,
      isDate: true
    });

    var fourth_dow = t.dayOfWeek();
    t.day += (1 - fourth_dow) + ((aWeekStart || ICAL.icaltime.SUNDAY) - 1);
    return t;
  };

  ICAL.icaltime.epoch_time = ICAL.icaltime.fromData({
    year: 1970,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    isDate: false,
    timezone: "Z"
  });

  ICAL.icaltime._cmp_attr = function _cmp_attr(a, b, attr) {
    if (a[attr] > b[attr]) return 1;
    if (a[attr] < b[attr]) return -1;
    return 0;
  };

  ICAL.icaltime._days_in_year_passed_month = [
    [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365],
    [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366]
  ];

  ICAL.icaltime.SUNDAY = 1;
  ICAL.icaltime.MONDAY = 2;
  ICAL.icaltime.TUESDAY = 3;
  ICAL.icaltime.WEDNESDAY = 4;
  ICAL.icaltime.THURSDAY = 5;
  ICAL.icaltime.FRIDAY = 6;
  ICAL.icaltime.SATURDAY = 7;
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';
(function() {

  var DOW_MAP = {
    SU: 1,
    MO: 2,
    TU: 3,
    WE: 4,
    TH: 5,
    FR: 6,
    SA: 7
  };

  ICAL.icalrecur = function icalrecur(data) {
    this.wrappedJSObject = this;
    this.parts = {};
    this.fromData(data);
  };

  ICAL.icalrecur.prototype = {

    parts: null,

    interval: 1,
    wkst: ICAL.icaltime.MONDAY,
    until: null,
    count: null,
    freq: null,
    icalclass: "icalrecur",
    icaltype: "RECUR",

    iterator: function(aStart) {
      return new ICAL.icalrecur_iterator({
        rule: this,
        dtstart: aStart
      });
    },

    clone: function clone() {
      return ICAL.icalrecur.fromData(this);
      //return ICAL.icalrecur.fromIcalProperty(this.toIcalProperty());
    },

    isFinite: function isfinite() {
      return !!(this.count || this.until);
    },

    isByCount: function isbycount() {
      return !!(this.count && !this.until);
    },

    addComponent: function addPart(aType, aValue) {
      if (!(aType in this.parts)) {
        this.parts[aType] = [aValue];
      } else {
        this.parts[aType].push(aValue);
      }
    },

    setComponent: function setComponent(aType, aValues) {
      this.parts[aType] = aValues;
    },

    getComponent: function getComponent(aType, aCount) {
      var ucName = aType.toUpperCase();
      var components = (ucName in this.parts ? this.parts[ucName] : []);

      if (aCount) aCount.value = components.length;
      return components;
    },

    getNextOccurrence: function getNextOccurrence(aStartTime, aRecurrenceId) {
      ICAL.helpers.dumpn("GNO: " + aRecurrenceId + " / " + aStartTime);
      var iter = this.iterator(aStartTime);
      var next, cdt;

      do {
        next = iter.next();
        ICAL.helpers.dumpn("Checking " + next + " <= " + aRecurrenceId);
      } while (next && next.compare(aRecurrenceId) <= 0);

      if (next && aRecurrenceId.zone) {
        next.zone = aRecurrenceId.zone;
      }

      return next;
    },

    toJSON: function() {
      //XXX: extract this list up to proto?
      var propsToCopy = [
        "freq",
        "count",
        "until",
        "wkst",
        "interval",
        "parts"
      ];

      var result = Object.create(null);

      var i = 0;
      var len = propsToCopy.length;
      var prop;

      for (; i < len; i++) {
        var prop = propsToCopy[i];
        result[prop] = this[prop];
      }

      if (result.until instanceof ICAL.icaltime) {
        result.until = result.until.toJSON();
      }

      return result;
    },

    fromData: function fromData(aData) {
      var propsToCopy = ["freq", "count", "until", "wkst", "interval"];
      for (var key in propsToCopy) {
        var prop = propsToCopy[key];
        if (aData && prop.toUpperCase() in aData) {
          this[prop] = aData[prop.toUpperCase()];
          // TODO casing sucks, fix the parser!
        } else if (aData && prop in aData) {
          this[prop] = aData[prop];
          // TODO casing sucks, fix the parser!
        }
      }

      // wkst is usually in SU, etc.. format we need
      // to convert it from the string
      if (typeof(this.wkst) === 'string') {
        this.wkst = ICAL.icalrecur.icalDayToNumericDay(this.wkst);
      }

      // Another hack for multiple construction of until value.
      if (this.until) {
        if (this.until instanceof ICAL.icaltime) {
          this.until = this.until.clone();
        } else {
          this.until = ICAL.icaltime.fromData(this.until);
        }
      }

      var partsToCopy = ["BYSECOND", "BYMINUTE", "BYHOUR", "BYDAY",
                         "BYMONTHDAY", "BYYEARDAY", "BYWEEKNO",
                         "BYMONTH", "BYSETPOS"];
      this.parts = {};
      if (aData) {
        for (var key in partsToCopy) {
          var prop = partsToCopy[key];
          if (prop in aData) {
            this.parts[prop] = aData[prop];
            // TODO casing sucks, fix the parser!
          }
        }
        // TODO oh god, make it go away!
        if (aData.parts) {
          for (var key in partsToCopy) {
            var prop = partsToCopy[key];
            if (prop in aData.parts) {
              this.parts[prop] = aData.parts[prop];
              // TODO casing sucks, fix the parser!
            }
          }
        }
      }
      return this;
    },

    toString: function icalrecur_toString() {
      // TODO retain order
      var str = "FREQ=" + this.freq;
      if (this.count) {
        str += ";COUNT=" + this.count;
      }
      if (this.interval != 1) {
        str += ";INTERVAL=" + this.interval;
      }
      for (var k in this.parts) {
        str += ";" + k + "=" + this.parts[k];
      }
      return str;
    },

    toIcalProperty: function toIcalProperty() {
      try {
        var valueData = {
          name: this.isNegative ? "EXRULE" : "RRULE",
          type: "RECUR",
          value: [this.toString()]
          // TODO more props?
        };
        return ICAL.icalproperty.fromData(valueData);
      } catch (e) {
        ICAL.helpers.dumpn("EICALPROP: " + this.toString() + "//" + e);
        ICAL.helpers.dumpn(e.stack);
        return null;
      }

      return null;
    },

    fromIcalProperty: function fromIcalProperty(aProp) {
      var propval = aProp.getFirstValue();
      this.fromData(propval);
      this.parts = ICAL.helpers.clone(propval.parts, true);
      if (aProp.name == "EXRULE") {
        this.isNegative = true;
      } else if (aProp.name == "RRULE") {
        this.isNegative = false;
      } else {
        throw new Error("Invalid Property " + aProp.name + " passed");
      }
    }
  };

  ICAL.icalrecur.fromData = function icalrecur_fromData(data) {
    return (new ICAL.icalrecur(data));
  }

  ICAL.icalrecur.fromString = function icalrecur_fromString(str) {
    var data = ICAL.icalparser.parseValue(str, "RECUR");
    return ICAL.icalrecur.fromData(data);
  };

  ICAL.icalrecur.fromIcalProperty = function icalrecur_fromIcalProperty(prop) {
    var recur = new ICAL.icalrecur();
    recur.fromIcalProperty(prop);
    return recur;
  };

  /**
   * Convert an ical representation of a day (SU, MO, etc..)
   * into a numeric value of that day.
   *
   * @param {String} day ical day.
   * @return {Numeric} numeric value of given day.
   */
  ICAL.icalrecur.icalDayToNumericDay = function toNumericDay(string) {
    //XXX: this is here so we can deal
    //     with possibly invalid string values.

    return DOW_MAP[string];
  };

})();
ICAL.icalrecur_iterator = (function() {

  /**
   * Options:
   *  - rule: (ICAL.icalrecur) instance
   *  - dtstart: (ICAL.icaltime) start date of recurrence rule
   *  - initialized: (Boolean) when true will assume options
   *                           are from previously constructed
   *                           iterator and will not re-initialize
   *                           iterator but resume its state from given data.
   *
   *  - by_data: (for iterator de-serialization)
   *  - days: "
   *  - last: "
   *  - by_indices: "
   */
  function icalrecur_iterator(options) {
    this.fromData(options);
  }

  icalrecur_iterator.prototype = {

    /**
     * True when iteration is finished.
     */
    completed: false,

    rule: null,
    dtstart: null,
    last: null,
    occurrence_number: 0,
    by_indices: null,
    initialized: false,
    by_data: null,

    days: null,
    days_index: 0,

    fromData: function(options) {
      this.rule = ICAL.helpers.formatClassType(options.rule, ICAL.icalrecur);

      if (!this.rule) {
        throw new Error('iterator requires a (ICAL.icalrecur) rule');
      }

      this.dtstart = ICAL.helpers.formatClassType(options.dtstart, ICAL.icaltime);

      if (!this.dtstart) {
        throw new Error('iterator requires a (ICAL.icaltime) dtstart');
      }

      if (options.by_data) {
        this.by_data = options.by_data;
      } else {
        this.by_data = ICAL.helpers.clone(this.rule.parts, true);
      }

      if (options.occurrence_number)
        this.occurrence_number = options.occurrence_number;

      this.days = options.days || [];
      this.last = ICAL.helpers.formatClassType(options.last, ICAL.icaltime);

      this.by_indices = options.by_indices;

      if (!this.by_indices) {
        this.by_indices = {
          "BYSECOND": 0,
          "BYMINUTE": 0,
          "BYHOUR": 0,
          "BYDAY": 0,
          "BYMONTH": 0,
          "BYWEEKNO": 0,
          "BYMONTHDAY": 0
        };
      }

      this.initialized = options.initialized || false;

      if (!this.initialized) {
        this.init();
      }
    },

    init: function icalrecur_iterator_init() {
      this.initialized = true;
      this.last = this.dtstart.clone();
      var parts = this.by_data;

      if ("BYDAY" in parts) {
        // libical does this earlier when the rule is loaded, but we postpone to
        // now so we can preserve the original order.
        this.sort_byday_rules(parts.BYDAY, this.rule.wkst);
      }

      // If the BYYEARDAY appares, no other date rule part may appear
      if ("BYYEARDAY" in parts) {
        if ("BYMONTH" in parts || "BYWEEKNO" in parts ||
            "BYMONTHDAY" in parts || "BYDAY" in parts) {
          throw new Error("Invalid BYYEARDAY rule");
        }
      }

      // BYWEEKNO and BYMONTHDAY rule parts may not both appear
      if ("BYWEEKNO" in parts && "BYMONTHDAY" in parts) {
        throw new Error("BYWEEKNO does not fit to BYMONTHDAY");
      }

      // For MONTHLY recurrences (FREQ=MONTHLY) neither BYYEARDAY nor
      // BYWEEKNO may appear.
      if (this.rule.freq == "MONTHLY" &&
          ("BYYEARDAY" in parts || "BYWEEKNO" in parts)) {
        throw new Error("For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear");
      }

      // For WEEKLY recurrences (FREQ=WEEKLY) neither BYMONTHDAY nor
      // BYYEARDAY may appear.
      if (this.rule.freq == "WEEKLY" &&
          ("BYYEARDAY" in parts || "BYMONTHDAY" in parts)) {
        throw new Error("For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear");
      }

      // BYYEARDAY may only appear in YEARLY rules
      if (this.rule.freq != "YEARLY" && "BYYEARDAY" in parts) {
        throw new Error("BYYEARDAY may only appear in YEARLY rules");
      }

      this.last.second = this.setup_defaults("BYSECOND", "SECONDLY", this.dtstart.second);
      this.last.minute = this.setup_defaults("BYMINUTE", "MINUTELY", this.dtstart.minute);
      this.last.hour = this.setup_defaults("BYHOUR", "HOURLY", this.dtstart.hour);
      this.last.day = this.setup_defaults("BYMONTHDAY", "DAILY", this.dtstart.day);
      this.last.month = this.setup_defaults("BYMONTH", "MONTHLY", this.dtstart.month);

      if (this.rule.freq == "WEEKLY") {
        if ("BYDAY" in parts) {
          var parts = this.ruleDayOfWeek(parts.BYDAY[0]);
          var pos = parts[0];
          var rule_dow = parts[1];
          var dow = rule_dow - this.last.dayOfWeek();
          if ((this.last.dayOfWeek() < rule_dow && dow >= 0) || dow < 0) {
            // Initial time is after first day of BYDAY data
            this.last.day += dow;
            this.last.normalize();
          }
        } else {
          var wkMap = icalrecur_iterator._wkdayMap[this.dtstart.dayOfWeek()];
          parts.BYDAY = [wkMap];
        }
      }

      if (this.rule.freq == "YEARLY") {
        for (;;) {
          this.expand_year_days(this.last.year);
          if (this.days.length > 0) {
            break;
          }
          this.increment_year(this.rule.interval);
        }

        var next = ICAL.icaltime.fromDayOfYear(this.days[0], this.last.year);

        this.last.day = next.day;
        this.last.month = next.month;
      }

      if (this.rule.freq == "MONTHLY" && this.has_by_data("BYDAY")) {

        var coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
        var parts = this.ruleDayOfWeek(coded_day);
        var pos = parts[0];
        var dow = parts[1];

        var daysInMonth = ICAL.icaltime.daysInMonth(this.last.month, this.last.year);
        var poscount = 0;

        if (pos >= 0) {
          for (this.last.day = 1; this.last.day <= daysInMonth; this.last.day++) {
            if (this.last.dayOfWeek() == dow) {
              if (++poscount == pos || pos == 0) {
                break;
              }
            }
          }
        } else {
          pos = -pos;
          for (this.last.day = daysInMonth; this.last.day != 0; this.last.day--) {
            if (this.last.dayOfWeek() == dow) {
              if (++poscount == pos) {
                break;
              }
            }
          }
        }

        //XXX: This feels like a hack, but we need to initialize
        //     the BYMONTHDAY case correctly and byDayAndMonthDay handles
        //     this case. It accepts a special flag which will avoid incrementing
        //     the initial value without the flag days that match the start time
        //     would be missed.
        if (this.has_by_data('BYMONTHDAY')) {
          this._byDayAndMonthDay(true);
        }

        if (this.last.day > daysInMonth || this.last.day == 0) {
          throw new Error("Malformed values in BYDAY part");
        }

      } else if (this.has_by_data("BYMONTHDAY")) {
        if (this.last.day < 0) {
          var daysInMonth = ICAL.icaltime.daysInMonth(this.last.month, this.last.year);
          this.last.day = daysInMonth + this.last.day + 1;
        }

        this.last.normalize();
      }
    },

    next: function icalrecur_iterator_next() {
      var before = (this.last ? this.last.clone() : null);

      if ((this.rule.count && this.occurrence_number >= this.rule.count) ||
          (this.rule.until && this.last.compare(this.rule.until) > 0)) {

        //XXX: right now this is just a flag and has no impact
        //     we can simplify the above case to check for completed later.
        this.completed = true;

        return null;
      }

      if (this.occurrence_number == 0 && this.last.compare(this.dtstart) >= 0) {
        // First of all, give the instance that was initialized
        this.occurrence_number++;
        return this.last;
      }

      do {
        var valid = 1;

        switch (this.rule.freq) {
        case "SECONDLY":
          this.next_second();
          break;
        case "MINUTELY":
          this.next_minute();
          break;
        case "HOURLY":
          this.next_hour();
          break;
        case "DAILY":
          this.next_day();
          break;
        case "WEEKLY":
          this.next_week();
          break;
        case "MONTHLY":
          valid = this.next_month();
          break;
        case "YEARLY":
          this.next_year();
          break;

        default:
          return null;
        }
      } while (!this.check_contracting_rules() ||
               this.last.compare(this.dtstart) < 0 ||
               !valid);

      // TODO is this valid?
      if (this.last.compare(before) == 0) {
        throw new Error("Same occurrence found twice, protecting " +
                        "you from death by recursion");
      }

      if (this.rule.until && this.last.compare(this.rule.until) > 0) {
        this.completed = true;
        return null;
      } else {
        this.occurrence_number++;
        return this.last;
      }
    },

    next_second: function next_second() {
      return this.next_generic("BYSECOND", "SECONDLY", "second", "minute");
    },

    increment_second: function increment_second(inc) {
      return this.increment_generic(inc, "second", 60, "minute");
    },

    next_minute: function next_minute() {
      return this.next_generic("BYMINUTE", "MINUTELY",
                               "minute", "hour", "next_second");
    },

    increment_minute: function increment_minute(inc) {
      return this.increment_generic(inc, "minute", 60, "hour");
    },

    next_hour: function next_hour() {
      return this.next_generic("BYHOUR", "HOURLY", "hour",
                               "monthday", "next_minute");
    },

    increment_hour: function increment_hour(inc) {
      this.increment_generic(inc, "hour", 24, "monthday");
    },

    next_day: function next_day() {
      var has_by_day = ("BYDAY" in this.by_data);
      var this_freq = (this.rule.freq == "DAILY");

      if (this.next_hour() == 0) {
        return 0;
      }

      if (this_freq) {
        this.increment_monthday(this.rule.interval);
      } else {
        this.increment_monthday(1);
      }

      return 0;
    },

    next_week: function next_week() {
      var end_of_data = 0;

      if (this.next_weekday_by_week() == 0) {
        return end_of_data;
      }

      if (this.has_by_data("BYWEEKNO")) {
        var idx = ++this.by_indices.BYWEEKNO;

        if (this.by_indices.BYWEEKNO == this.by_data.BYWEEKNO.length) {
          this.by_indices.BYWEEKNO = 0;
          end_of_data = 1;
        }

        // HACK should be first month of the year
        this.last.month = 1;
        this.last.day = 1;

        var week_no = this.by_data.BYWEEKNO[this.by_indices.BYWEEKNO];

        this.last.day += 7 * week_no;
        this.last.normalize();

        if (end_of_data) {
          this.increment_year(1);
        }
      } else {
        // Jump to the next week
        this.increment_monthday(7 * this.rule.interval);
      }

      return end_of_data;
    },

    /**
     * normalize each by day rule for a given year/month.
     * Takes into account ordering and negative rules
     *
     * @param {Numeric} year current year.
     * @param {Numeric} month current month.
     * @param {Array} rules array of rules.
     *
     * @return {Array} sorted and normalized rules.
     *                 Negative rules will be expanded to their
     *                 correct positive values for easier processing.
     */
    normalizeByMonthDayRules: function(year, month, rules) {
      var daysInMonth = ICAL.icaltime.daysInMonth(month, year);

      // XXX: This is probably bad for performance to allocate
      //      a new array for each month we scan, if possible
      //      we should try to optimize this...
      var newRules = [];

      var ruleIdx = 0;
      var len = rules.length;
      var rule;

      for (; ruleIdx < len; ruleIdx++) {
        rule = rules[ruleIdx];

        // if this rule falls outside of given
        // month discard it.
        if (Math.abs(rule) > daysInMonth) {
          continue;
        }

        // negative case
        if (rule < 0) {
          // we add (not subtract its a negative number)
          // one from the rule because 1 === last day of month
          rule = daysInMonth + (rule + 1);
        } else if (rule === 0) {
          // skip zero its invalid.
          continue;
        }

        // only add unique items...
        if (newRules.indexOf(rule) === -1) {
          newRules.push(rule);
        }

      }

      // unique and sort
      return newRules.sort();
    },

    /**
     * NOTES:
     * We are given a list of dates in the month (BYMONTHDAY) (23, etc..)
     * Also we are given a list of days (BYDAY) (MO, 2SU, etc..) when
     * both conditions match a given date (this.last.day) iteration stops.
     *
     * @param {Boolean} [isInit] when given true will not
     *                           increment the current day (this.last).
     */
    _byDayAndMonthDay: function(isInit) {
     var byMonthDay; // setup in initMonth
      var byDay = this.by_data.BYDAY;

      var date;
      var dateIdx = 0;
      var dateLen; // setup in initMonth
      var dayIdx = 0;
      var dayLen = byDay.length;

      // we are not valid by default
      var dataIsValid = 0;

      var daysInMonth;
      var self = this;

      function initMonth() {
        daysInMonth = ICAL.icaltime.daysInMonth(
          self.last.month, self.last.year
        );

        byMonthDay = self.normalizeByMonthDayRules(
          self.last.year,
          self.last.month,
          self.by_data.BYMONTHDAY
        );

        dateLen = byMonthDay.length;
      }

      function nextMonth() {
        self.last.day = 1;
        self.increment_month();
        initMonth();

        dateIdx = 0;
        dayIdx = 0;
      }

      initMonth();

      // should come after initMonth
      if (isInit) {
        this.last.day -= 1;
      }

      while (!dataIsValid) {
        // find next date
        var next = byMonthDay[dateIdx++];

        // increment the current date. This is really
        // important otherwise we may fall into the infinite
        // loop trap. The initial date takes care of the case
        // where the current date is the date we are looking
        // for.
        date = this.last.day + 1;

        if (date > daysInMonth) {
          nextMonth();
          continue;
        }

        // after verify that the next date
        // is in the current month we can increment
        // it permanently.
        this.last.day = date;

        // this logic is dependant on the BYMONTHDAYS
        // being in order (which is done by #normalizeByMonthDayRules)
        if (next >= this.last.day) {
          // if the next month day is in the future jump to it.
          this.last.day = next;
        } else {
          // in this case the 'next' monthday has past
          // we must move to the month.
          nextMonth();
          continue;
        }

        // Now we can loop through the day rules to see
        // if one matches the current month date.
        for (dayIdx = 0; dayIdx < dayLen; dayIdx++) {
          var parts = this.ruleDayOfWeek(byDay[dayIdx]);
          var pos = parts[0];
          var dow = parts[1];

          if (this.last.isNthWeekDay(dow, pos)) {
            // when we find the valid one we can mark
            // the conditions as met and break the loop.
            // (Because we have this condition above
            //  it will also break the parent loop).
            dataIsValid = 1;
            break;
          }
        }

        // Its completely possible that the combination
        // cannot be matched in the current month.
        // When we reach the end of possible combinations
        // in the current month we iterate to the next one.
        if (!dataIsValid && dateIdx === (dateLen - 1)) {
          nextMonth();
          continue;
        }
      }

      return dataIsValid;
    },

    next_month: function next_month() {
      var this_freq = (this.rule.freq == "MONTHLY");
      var data_valid = 1;

      if (this.next_hour() == 0) {
        return data_valid;
      }

      if (this.has_by_data("BYDAY") && this.has_by_data("BYMONTHDAY")) {
        data_valid = this._byDayAndMonthDay();
      } else if (this.has_by_data("BYDAY")) {
        var daysInMonth = ICAL.icaltime.daysInMonth(this.last.month, this.last.year);
        var setpos = 0;

        if (this.has_by_data("BYSETPOS")) {
          var last_day = this.last.day;
          for (var day = 1; day <= daysInMonth; day++) {
            this.last.day = day;
            if (this.is_day_in_byday(this.last) && day <= last_day) {
              setpos++;
            }
          }
          this.last.day = last_day;
        }

        for (var day = this.last.day + 1; day <= daysInMonth; day++) {
          this.last.day = day;

          if (this.is_day_in_byday(this.last)) {
            if (!this.has_by_data("BYSETPOS") ||
                this.check_set_position(++setpos) ||
                this.check_set_position(setpos - this.by_data.BYSETPOS.length - 1)) {

              data_valid = 1;
              break;
            }
          }
        }

        if (day > daysInMonth) {
          this.last.day = 1;
          this.increment_month();

          if (this.is_day_in_byday(this.last)) {
            if (!this.has_by_data("BYSETPOS") || this.check_set_position(1)) {
              data_valid = 1;
            }
          } else {
            data_valid = 0;
          }
        }
      } else if (this.has_by_data("BYMONTHDAY")) {
        this.by_indices.BYMONTHDAY++;

        if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
          this.by_indices.BYMONTHDAY = 0;
          this.increment_month();
        }

        var daysInMonth = ICAL.icaltime.daysInMonth(this.last.month, this.last.year);

        var day = this.by_data.BYMONTHDAY[this.by_indices.BYMONTHDAY];

        if (day < 0) {
          day = daysInMonth + day + 1;
        }

        if (day > daysInMonth) {
          this.last.day = 1;
          data_valid = this.is_day_in_byday(this.last);
        }

        this.last.day = day;
      } else {
        this.last.day = this.by_data.BYMONTHDAY[0];
        this.increment_month();
        var daysInMonth = ICAL.icaltime.daysInMonth(this.last.month, this.last.year);
        this.last.day = Math.min(this.last.day, daysInMonth);
      }

      return data_valid;
    },

    next_weekday_by_week: function next_weekday_by_week() {
      var end_of_data = 0;

      if (this.next_hour() == 0) {
        return end_of_data;
      }

      if (!this.has_by_data("BYDAY")) {
        return 1;
      }

      for (;;) {
        var tt = new ICAL.icaltime();
        tt.auto_normalize = false;
        this.by_indices.BYDAY++;

        if (this.by_indices.BYDAY == this.by_data.BYDAY.length) {
          this.by_indices.BYDAY = 0;
          end_of_data = 1;
        }

        var coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
        var parts = this.ruleDayOfWeek(coded_day);
        var dow = parts[1];

        dow -= this.rule.wkst;
        if (dow < 0) {
          dow += 7;
        }

        tt.year = this.last.year;
        tt.month = this.last.month;
        tt.day = this.last.day;

        var startOfWeek = tt.start_doy_week(this.rule.wkst);

        if (dow + startOfWeek < 1) {
          // The selected date is in the previous year
          if (!end_of_data) {
            continue;
          }
        }

        var next = ICAL.icaltime.fromDayOfYear(startOfWeek + dow,
                                                  this.last.year);

        this.last.day = next.day;
        this.last.month = next.month;
        this.last.year = next.year;

        return end_of_data;
      }
    },

    next_year: function next_year() {

      if (this.next_hour() == 0) {
        return 0;
      }

      if (++this.days_index == this.days.length) {
        this.days_index = 0;
        do {
          this.increment_year(this.rule.interval);
          this.expand_year_days(this.last.year);
        } while (this.days.length == 0);
      }

      var next = ICAL.icaltime.fromDayOfYear(this.days[this.days_index],
                                                this.last.year);

      this.last.day = next.day;
      this.last.month = next.month;

      return 1;
    },

    ruleDayOfWeek: function ruleDayOfWeek(dow) {
      var matches = dow.match(/([+-]?[0-9])?(MO|TU|WE|TH|FR|SA|SU)/);
      if (matches) {
        var pos = parseInt(matches[1] || 0, 10);
        dow = ICAL.icalrecur.icalDayToNumericDay(matches[2]);
        return [pos, dow];
      } else {
        return [0, 0];
      }
    },

    next_generic: function next_generic(aRuleType, aInterval, aDateAttr,
                                        aFollowingAttr, aPreviousIncr) {
      var has_by_rule = (aRuleType in this.by_data);
      var this_freq = (this.rule.freq == aInterval);
      var end_of_data = 0;

      if (aPreviousIncr && this[aPreviousIncr]() == 0) {
        return end_of_data;
      }

      if (has_by_rule) {
        this.by_indices[aRuleType]++;
        var idx = this.by_indices[aRuleType];
        var dta = this.by_data[aRuleType];

        if (this.by_indices[aRuleType] == dta.length) {
          this.by_indices[aRuleType] = 0;
          end_of_data = 1;
        }
        this.last[aDateAttr] = dta[this.by_indices[aRuleType]];
      } else if (this_freq) {
        this["increment_" + aDateAttr](this.rule.interval);
      }

      if (has_by_rule && end_of_data && this_freq) {
        this["increment_" + aFollowingAttr](1);
      }

      return end_of_data;
    },

    increment_monthday: function increment_monthday(inc) {
      for (var i = 0; i < inc; i++) {
        var daysInMonth = ICAL.icaltime.daysInMonth(this.last.month, this.last.year);
        this.last.day++;

        if (this.last.day > daysInMonth) {
          this.last.day -= daysInMonth;
          this.increment_month();
        }
      }
    },

    increment_month: function increment_month() {
      if (this.has_by_data("BYMONTH")) {
        this.by_indices.BYMONTH++;

        if (this.by_indices.BYMONTH == this.by_data.BYMONTH.length) {
          this.by_indices.BYMONTH = 0;
          this.increment_year(1);
        }

        this.last.month = this.by_data.BYMONTH[this.by_indices.BYMONTH];
      } else {
        var inc;
        if (this.rule.freq == "MONTHLY") {
          this.last.month += this.rule.interval;
        } else {
          this.last.month++;
        }

        this.last.month--;
        var years = ICAL.helpers.trunc(this.last.month / 12);
        this.last.month %= 12;
        this.last.month++;

        if (years != 0) {
          this.increment_year(years);
        }
      }
    },

    increment_year: function increment_year(inc) {
      this.last.year += inc;
    },

    increment_generic: function increment_generic(inc, aDateAttr,
                                                  aFactor, aNextIncrement) {
      this.last[aDateAttr] += inc;
      var nextunit = ICAL.helpers.trunc(this.last[aDateAttr] / aFactor);
      this.last[aDateAttr] %= aFactor;
      if (nextunit != 0) {
        this["increment_" + aNextIncrement](nextunit);
      }
    },

    has_by_data: function has_by_data(aRuleType) {
      return (aRuleType in this.rule.parts);
    },

    expand_year_days: function expand_year_days(aYear) {
      var t = new ICAL.icaltime();
      this.days = [];

      // We need our own copy with a few keys set
      var parts = {};
      var rules = ["BYDAY", "BYWEEKNO", "BYMONTHDAY", "BYMONTH", "BYYEARDAY"];
      for (var p in rules) {
        var part = rules[p];
        if (part in this.rule.parts) {
          parts[part] = this.rule.parts[part];
        }
      }

      if ("BYMONTH" in parts && "BYWEEKNO" in parts) {
        var valid = 1;
        var validWeeks = {};
        t.year = aYear;
        t.isDate = true;

        for (var monthIdx = 0; monthIdx < this.by_data.BYMONTH.length; monthIdx++) {
          var month = this.by_data.BYMONTH[monthIdx];
          t.month = month;
          t.day = 1;
          var first_week = t.week_number(this.rule.wkst);
          t.day = ICAL.icaltime.daysInMonth(month, aYear);
          var last_week = t.week_number(this.rule.wkst);
          for (monthIdx = first_week; monthIdx < last_week; monthIdx++) {
            validWeeks[monthIdx] = 1;
          }
        }

        for (var weekIdx = 0; weekIdx < this.by_data.BYWEEKNO.length && valid; weekIdx++) {
          var weekno = this.by_data.BYWEEKNO[weekIdx];
          if (weekno < 52) {
            valid &= validWeeks[weekIdx];
          } else {
            valid = 0;
          }
        }

        if (valid) {
          delete parts.BYMONTH;
        } else {
          delete parts.BYWEEKNO;
        }
      }

      var partCount = Object.keys(parts).length;

      if (partCount == 0) {
        var t = this.dtstart.clone();
        t.year = this.last.year;
        this.days.push(t.dayOfYear());
      } else if (partCount == 1 && "BYMONTH" in parts) {
        for (var monthkey in this.by_data.BYMONTH) {
          var t2 = this.dtstart.clone();
          t2.year = aYear;
          t2.month = this.by_data.BYMONTH[monthkey];
          t2.isDate = true;
          this.days.push(t2.dayOfYear());
        }
      } else if (partCount == 1 && "BYMONTHDAY" in parts) {
        for (var monthdaykey in this.by_data.BYMONTHDAY) {
          var t2 = this.dtstart.clone();
          t2.day = this.by_data.BYMONTHDAY[monthdaykey];
          t2.year = aYear;
          t2.isDate = true;
          this.days.push(t2.dayOfYear());
        }
      } else if (partCount == 2 &&
                 "BYMONTHDAY" in parts &&
                 "BYMONTH" in parts) {
        for (var monthkey in this.by_data.BYMONTH) {
          for (var monthdaykey in this.by_data.BYMONTHDAY) {
            t.day = this.by_data.BYMONTHDAY[monthdaykey];
            t.month = this.by_data.BYMONTH[monthkey];
            t.year = aYear;
            t.isDate = true;

            this.days.push(t.dayOfYear());
          }
        }
      } else if (partCount == 1 && "BYWEEKNO" in parts) {
        // TODO unimplemented in libical
      } else if (partCount == 2 &&
                 "BYWEEKNO" in parts &&
                 "BYMONTHDAY" in parts) {
        // TODO unimplemented in libical
      } else if (partCount == 1 && "BYDAY" in parts) {
        this.days = this.days.concat(this.expand_by_day(aYear));
      } else if (partCount == 2 && "BYDAY" in parts && "BYMONTH" in parts) {
        for (var monthkey in this.by_data.BYMONTH) {
          month = this.by_data.BYMONTH[monthkey];
          var daysInMonth = ICAL.icaltime.daysInMonth(month, aYear);

          t.year = aYear;
          t.month = this.by_data.BYMONTH[monthkey];
          t.day = 1;
          t.isDate = true;

          var first_dow = t.dayOfWeek();
          var doy_offset = t.dayOfYear() - 1;

          t.day = daysInMonth;
          var last_dow = t.dayOfWeek();

          if (this.has_by_data("BYSETPOS")) {
            var set_pos_counter = 0;
            var by_month_day = [];
            for (var day = 1; day <= daysInMonth; day++) {
              t.day = day;
              if (this.is_day_in_byday(t)) {
                by_month_day.push(day);
              }
            }

            for (var spIndex = 0; spIndex < by_month_day.length; spIndex++) {
              if (this.check_set_position(spIndex + 1) ||
                  this.check_set_position(spIndex - by_month_day.length)) {
                this.days.push(doy_offset + by_month_day[spIndex]);
              }
            }
          } else {
            for (var daycodedkey in this.by_data.BYDAY) {
              //TODO: This should return dates in order of occurrence
              //      (1,2,3, etc...) instead of by weekday (su, mo, etc..)
              var coded_day = this.by_data.BYDAY[daycodedkey];
              var parts = this.ruleDayOfWeek(coded_day);
              var pos = parts[0];
              var dow = parts[1];
              var month_day;

              var first_matching_day = ((dow + 7 - first_dow) % 7) + 1;
              var last_matching_day = daysInMonth - ((last_dow + 7 - dow) % 7);

              if (pos == 0) {
                for (var day = first_matching_day; day <= daysInMonth; day += 7) {
                  this.days.push(doy_offset + day);
                }
              } else if (pos > 0) {
                month_day = first_matching_day + (pos - 1) * 7;

                if (month_day <= daysInMonth) {
                  this.days.push(doy_offset + month_day);
                }
              } else {
                month_day = last_matching_day + (pos + 1) * 7;

                if (month_day > 0) {
                  this.days.push(doy_offset + month_day);
                }
              }
            }
          }
        }
      } else if (partCount == 2 && "BYDAY" in parts && "BYMONTHDAY" in parts) {
        var expandedDays = this.expand_by_day(aYear);

        for (var daykey in expandedDays) {
          var day = expandedDays[daykey];
          var tt = ICAL.icaltime.fromDayOfYear(day, aYear);
          if (this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
            this.days.push(day);
          }
        }
      } else if (partCount == 3 &&
                 "BYDAY" in parts &&
                 "BYMONTHDAY" in parts &&
                 "BYMONTH" in parts) {
        var expandedDays = this.expand_by_day(aYear);

        for (var daykey in expandedDays) {
          var day = expandedDays[daykey];
          var tt = ICAL.icaltime.fromDayOfYear(day, aYear);

          if (this.by_data.BYMONTH.indexOf(tt.month) >= 0 &&
              this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
            this.days.push(day);
          }
        }
      } else if (partCount == 2 && "BYDAY" in parts && "BYWEEKNO" in parts) {
        var expandedDays = this.expand_by_day(aYear);

        for (var daykey in expandedDays) {
          var day = expandedDays[daykey];
          var tt = ICAL.icaltime.fromDayOfYear(day, aYear);
          var weekno = tt.week_number(this.rule.wkst);

          if (this.by_data.BYWEEKNO.indexOf(weekno)) {
            this.days.push(day);
          }
        }
      } else if (partCount == 3 &&
                 "BYDAY" in parts &&
                 "BYWEEKNO" in parts &&
                 "BYMONTHDAY" in parts) {
        // TODO unimplemted in libical
      } else if (partCount == 1 && "BYYEARDAY" in parts) {
        this.days = this.days.concat(this.by_data.BYYEARDAY);
      } else {
        this.days = [];
      }
      return 0;
    },

    expand_by_day: function expand_by_day(aYear) {

      var days_list = [];
      var tmp = this.last.clone();

      tmp.year = aYear;
      tmp.month = 1;
      tmp.day = 1;
      tmp.isDate = true;

      var start_dow = tmp.dayOfWeek();

      tmp.month = 12;
      tmp.day = 31;
      tmp.isDate = true;

      var end_dow = tmp.dayOfWeek();
      var end_year_day = tmp.dayOfYear();

      for (var daykey in this.by_data.BYDAY) {
        var day = this.by_data.BYDAY[daykey];
        var parts = this.ruleDayOfWeek(day);
        var pos = parts[0];
        var dow = parts[1];

        if (pos == 0) {
          var tmp_start_doy = ((dow + 7 - start_dow) % 7) + 1;

          for (var doy = tmp_start_doy; doy <= end_year_day; doy += 7) {
            days_list.push(doy);
          }

        } else if (pos > 0) {
          var first;
          if (dow >= start_dow) {
            first = dow - start_dow + 1;
          } else {
            first = dow - start_dow + 8;
          }

          days_list.push(first + (pos - 1) * 7);
        } else {
          var last;
          pos = -pos;

          if (dow <= end_dow) {
            last = end_year_day - end_dow + dow;
          } else {
            last = end_year_day - end_dow + dow - 7;
          }

          days_list.push(last - (pos - 1) * 7);
        }
      }
      return days_list;
    },

    is_day_in_byday: function is_day_in_byday(tt) {
      for (var daykey in this.by_data.BYDAY) {
        var day = this.by_data.BYDAY[daykey];
        var parts = this.ruleDayOfWeek(day);
        var pos = parts[0];
        var dow = parts[1];
        var this_dow = tt.dayOfWeek();

        if ((pos == 0 && dow == this_dow) ||
            (tt.nthWeekDay(dow, pos) == tt.day)) {
          return 1;
        }
      }

      return 0;
    },

    /**
     * Checks if given value is in BYSETPOS.
     *
     * @param {Numeric} aPos position to check for.
     * @return {Boolean} false unless BYSETPOS rules exist
     *                   and the given value is present in rules.
     */
    check_set_position: function check_set_position(aPos) {
      if (this.has_by_data('BYSETPOS')) {
        var idx = this.by_data.BYSETPOS.indexOf(aPos);
        // negative numbers are not false-y
        return idx !== -1;
      }
      return false;
    },

    sort_byday_rules: function icalrecur_sort_byday_rules(aRules, aWeekStart) {
      for (var i = 0; i < aRules.length; i++) {
        for (var j = 0; j < i; j++) {
          var one = this.ruleDayOfWeek(aRules[j])[1];
          var two = this.ruleDayOfWeek(aRules[i])[1];
          one -= aWeekStart;
          two -= aWeekStart;
          if (one < 0) one += 7;
          if (two < 0) two += 7;

          if (one > two) {
            var tmp = aRules[i];
            aRules[i] = aRules[j];
            aRules[j] = tmp;
          }
        }
      }
    },

    check_contract_restriction: function check_contract_restriction(aRuleType, v) {
      var indexMapValue = icalrecur_iterator._indexMap[aRuleType];
      var ruleMapValue = icalrecur_iterator._expandMap[this.rule.freq][indexMapValue];
      var pass = false;

      if (aRuleType in this.by_data &&
          ruleMapValue == icalrecur_iterator.CONTRACT) {

        var ruleType = this.by_data[aRuleType];

        for (var bydatakey in ruleType) {
          if (ruleType[bydatakey] == v) {
            pass = true;
            break;
          }
        }
      } else {
        // Not a contracting byrule or has no data, test passes
        pass = true;
      }
      return pass;
    },

    check_contracting_rules: function check_contracting_rules() {
      var dow = this.last.dayOfWeek();
      var weekNo = this.last.week_number(this.rule.wkst);
      var doy = this.last.dayOfYear();

      return (this.check_contract_restriction("BYSECOND", this.last.second) &&
              this.check_contract_restriction("BYMINUTE", this.last.minute) &&
              this.check_contract_restriction("BYHOUR", this.last.hour) &&
              this.check_contract_restriction("BYDAY", icalrecur_iterator._wkdayMap[dow]) &&
              this.check_contract_restriction("BYWEEKNO", weekNo) &&
              this.check_contract_restriction("BYMONTHDAY", this.last.day) &&
              this.check_contract_restriction("BYMONTH", this.last.month) &&
              this.check_contract_restriction("BYYEARDAY", doy));
    },

    setup_defaults: function setup_defaults(aRuleType, req, deftime) {
      var indexMapValue = icalrecur_iterator._indexMap[aRuleType];
      var ruleMapValue = icalrecur_iterator._expandMap[this.rule.freq][indexMapValue];

      if (ruleMapValue != icalrecur_iterator.CONTRACT) {
        if (!(aRuleType in this.by_data)) {
          this.by_data[aRuleType] = [deftime];
        }
        if (this.rule.freq != req) {
          return this.by_data[aRuleType][0];
        }
      }
      return deftime;
    },

    /**
     * Convert iterator into a serialize-able object.
     * Will preserve current iteration sequence to ensure
     * the seamless continuation of the recurrence rule.
     */
    toJSON: function() {
      var result = Object.create(null);

      result.initialized = this.initialized;
      result.rule = this.rule.toJSON();
      result.dtstart = this.dtstart.toJSON();
      result.by_data = this.by_data;
      result.days = this.days;
      result.last = this.last.toJSON();
      result.by_indices = this.by_indices;
      result.occurrence_number = this.occurrence_number;

      return result;
    }

  };

  icalrecur_iterator._wkdayMap = ["", "SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  icalrecur_iterator._indexMap = {
    "BYSECOND": 0,
    "BYMINUTE": 1,
    "BYHOUR": 2,
    "BYDAY": 3,
    "BYMONTHDAY": 4,
    "BYYEARDAY": 5,
    "BYWEEKNO": 6,
    "BYMONTH": 7,
    "BYSETPOS": 8
  };

  icalrecur_iterator._expandMap = {
    "SECONDLY": [1, 1, 1, 1, 1, 1, 1, 1],
    "MINUTELY": [2, 1, 1, 1, 1, 1, 1, 1],
    "HOURLY": [2, 2, 1, 1, 1, 1, 1, 1],
    "DAILY": [2, 2, 2, 1, 1, 1, 1, 1],
    "WEEKLY": [2, 2, 2, 2, 3, 3, 1, 1],
    "MONTHLY": [2, 2, 2, 2, 2, 3, 3, 1],
    "YEARLY": [2, 2, 2, 2, 2, 2, 2, 2]
  };
  icalrecur_iterator.UNKNOWN = 0;
  icalrecur_iterator.CONTRACT = 1;
  icalrecur_iterator.EXPAND = 2;
  icalrecur_iterator.ILLEGAL = 3;

  return icalrecur_iterator;

}());
ICAL.RecurExpansion = (function() {
  function formatTime(item) {
    return ICAL.helpers.formatClassType(item, ICAL.icaltime);
  }

  function compareTime(a, b) {
    return a.compare(b);
  }

  function isRecurringComponent(comp) {
    return comp.hasProperty('RDATE') ||
           comp.hasProperty('RRULE') ||
           comp.hasProperty('RECURRENCE-ID');
  }

  function propertyValue(prop) {
    return prop.data.value[0];
  }

  /**
   * Primary class for expanding recurring rules.
   * Can take multiple RRULEs, RDATEs, EXDATE(s)
   * and iterate (in order) over each next occurrence.
   *
   * Once initialized this class can also be serialized
   * saved and continue iteration from the last point.
   *
   * NOTE: it is intended that this class is to be used
   *       with ICAL.Event which handles recurrence exceptions.
   *
   * Options:
   *  - dtstart: (ICAL.icaltime) start time of event (required)
   *  - component: (ICAL.icalcomponent) component (required unless resuming)
   *
   * Examples:
   *
   *    // assuming event is a parsed ical component
   *    var event;
   *
   *    var expand = new ICAL.RecurExpansion({
   *      component: event,
   *      start: event.getFirstPropertyValue('DTSTART')
   *    });
   *
   *    // remember there are infinite rules
   *    // so its a good idea to limit the scope
   *    // of the iterations then resume later on.
   *
   *    // next is always an ICAL.icaltime or null
   *    var next;
   *
   *    while(someCondition && (next = expand.next())) {
   *      // do something with next
   *    }
   *
   *    // save instance for later
   *    var json = JSON.stringify(expand);
   *
   *    //...
   *
   *    // NOTE: if the component's properties have
   *    //       changed you will need to rebuild the
   *    //       class and start over. This only works
   *    //       when the component's recurrence info is the same.
   *    var expand = new ICAL.RecurExpansion(JSON.parse(json));
   *
   *
   * @param {Object} options see options block.
   */
  function RecurExpansion(options) {
    this.ruleDates = [];
    this.exDates = [];
    this.fromData(options);
  }

  RecurExpansion.prototype = {

    /**
     * True when iteration is fully completed.
     */
    complete: false,

    /**
     * Array of RRULE iterators.
     *
     * @type Array[ICAL.icalrecur_iterator]
     * @private
     */
    ruleIterators: null,

    /**
     * Array of RDATE instances.
     *
     * @type Array[ICAL.icaltime]
     * @private
     */
    ruleDates: null,

    /**
     * Array of EXDATE instances.
     *
     * @type Array[ICAL.icaltime]
     * @private
     */
    exDates: null,

    /**
     * Current position in ruleDates array.
     * @type Numeric
     * @private
     */
    ruleDateInc: 0,

    /**
     * Current position in exDates array
     * @type Numeric
     * @private
     */
    exDateInc: 0,

    /**
     * Current negative date.
     *
     * @type ICAL.icaltime
     * @private
     */
    exDate: null,

    /**
     * Current additional date.
     *
     * @type ICAL.icaltime
     * @private
     */
    ruleDate: null,

    /**
     * Start date of recurring rules.
     *
     * @type ICAL.icaltime
     */
    dtstart: null,

    /**
     * Last expanded time
     *
     * @type ICAL.icaltime
     */
    last: null,

    fromData: function(options) {
      var start = ICAL.helpers.formatClassType(options.dtstart, ICAL.icaltime);

      if (!start) {
        throw new Error('.dtstart (ICAL.icaltime) must be given');
      } else {
        this.dtstart = start;
      }

      if (options.component) {
        this._init(options.component);
      } else {
        this.last = formatTime(options.last);

        this.ruleIterators = options.ruleIterators.map(function(item) {
          return ICAL.helpers.formatClassType(item, ICAL.icalrecur_iterator);
        });

        this.ruleDateInc = options.ruleDateInc;
        this.exDateInc = options.exDateInc;

        if (options.ruleDates) {
          this.ruleDates = options.ruleDates.map(formatTime);
          this.ruleDate = this.ruleDates[this.ruleDateInc];
        }

        if (options.exDates) {
          this.exDates = options.exDates.map(formatTime);
          this.exDate = this.exDates[this.exDateInc];
        }

        if (typeof(options.complete) !== 'undefined') {
          this.complete = options.complete;
        }
      }
    },

    next: function() {
      var iter;
      var ruleOfDay;
      var next;
      var compare;

      var maxTries = 500;
      var currentTry = 0;

      while (true) {
        if (currentTry++ > maxTries) {
          throw new Error(
            'max tries have occured, rule may be impossible to forfill.'
          );
        }

        next = this.ruleDate;
        iter = this._nextRecurrenceIter(this.last);

        // no more matches
        // because we increment the rule day or rule
        // _after_ we choose a value this should be
        // the only spot where we need to worry about the
        // end of events.
        if (!next && !iter) {
          // there are no more iterators or rdates
          this.complete = true;
          break;
        }

        // no next rule day or recurrence rule is first.
        if (!next || (iter && next.compare(iter.last) > 0)) {
          // must be cloned, recur will reuse the time element.
          next = iter.last.clone();
          // move to next so we can continue
          iter.next();
        }

        // if the ruleDate is still next increment it.
        if (this.ruleDate === next) {
          this._nextRuleDay();
        }

        this.last = next;

        // check the negative rules
        if (this.exDate) {
          compare = this.exDate.compare(this.last);

          if (compare < 0) {
            this._nextExDay();
          }

          // if the current rule is excluded skip it.
          if (compare === 0) {
            this._nextExDay();
            continue;
          }
        }

        //XXX: The spec states that after we resolve the final
        //     list of dates we execute EXDATE this seems somewhat counter
        //     intuitive to what I have seen most servers do so for now
        //     I exclude based on the original date not the one that may
        //     have been modified by the exception.
        return this.last;
      }
    },

    /**
     * Converts object into a serialize-able format.
     */
    toJSON: function() {
      function toJSON(item) {
        return item.toJSON();
      }

      var result = Object.create(null);
      result.ruleIterators = this.ruleIterators.map(toJSON);

      if (this.ruleDates) {
        result.ruleDates = this.ruleDates.map(toJSON);
      }

      if (this.exDates) {
        result.exDates = this.exDates.map(toJSON);
      }

      result.ruleDateInc = this.ruleDateInc;
      result.exDateInc = this.exDateInc;
      result.last = this.last.toJSON();
      result.dtstart = this.dtstart.toJSON();
      result.complete = this.complete;

      return result;
    },


    _extractDates: function(component, property) {
      var result = [];
      var props = component.getAllProperties(property);
      var len = props.length;
      var i = 0;
      var prop;

      var idx;

      for (; i < len; i++) {
        prop = propertyValue(props[i]);

        idx = ICAL.helpers.binsearchInsert(
          result,
          prop,
          compareTime
        );

        // ordered insert
        result.splice(idx, 0, prop);
      }

      return result;
    },

    _init: function(component) {
      this.ruleIterators = [];

      this.last = this.dtstart.clone();

      // to provide api consistency non-recurring
      // events can also use the iterator though it will
      // only return a single time.
      if (!isRecurringComponent(component)) {
        this.ruleDate = this.last.clone();
        this.complete = true;
        return;
      }

      if (component.hasProperty('RRULE')) {
        var rules = component.getAllProperties('RRULE');
        var i = 0;
        var len = rules.length;

        var rule;
        var iter;

        for (; i < len; i++) {
          rule = propertyValue(rules[i]);
          rule = new ICAL.icalrecur(rule);
          iter = rule.iterator(this.dtstart);
          this.ruleIterators.push(iter);

          // increment to the next occurrence so future
          // calls to next return times beyond the initial iteration.
          // XXX: I find this suspicious might be a bug?
          iter.next();
        }
      }

      if (component.hasProperty('RDATE')) {
        this.ruleDates = this._extractDates(component, 'RDATE');
        this.ruleDateInc = ICAL.helpers.binsearchInsert(
          this.ruleDates,
          this.last,
          compareTime
        );

        this.ruleDate = this.ruleDates[this.ruleDateInc];
      }

      if (component.hasProperty('EXDATE')) {
        this.exDates = this._extractDates(component, 'EXDATE');
        // if we have a .last day we increment the index to beyond it.
        this.exDateInc = ICAL.helpers.binsearchInsert(
          this.exDates,
          this.last,
          compareTime
        );

        this.exDate = this.exDates[this.exDateInc];
      }
    },

    _nextExDay: function() {
      this.exDate = this.exDates[++this.exDateInc];
    },

    _nextRuleDay: function() {
      this.ruleDate = this.ruleDates[++this.ruleDateInc];
    },

    /**
     * Find and return the recurrence rule with the most
     * recent event and return it.
     *
     * @return {Object} iterator.
     */
    _nextRecurrenceIter: function() {
      var iters = this.ruleIterators;

      if (iters.length === 0) {
        return null;
      }

      var len = iters.length;
      var iter;
      var iterTime;
      var iterIdx = 0;
      var chosenIter;

      // loop through each iterator
      for (; iterIdx < len; iterIdx++) {
        iter = iters[iterIdx];
        iterTime = iter.last;

        // if iteration is complete
        // then we must exclude it from
        // the search and remove it.
        if (iter.completed) {
          len--;
          if (iterIdx !== 0) {
            iterIdx--;
          }
          iters.splice(iterIdx, 1);
          continue;
        }

        // find the most recent possible choice
        if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
          // that iterator is saved
          chosenIter = iter;
        }
      }

      // the chosen iterator is returned but not mutated
      // this iterator contains the most recent event.
      return chosenIter;
    }

  };

  return RecurExpansion;

}());
ICAL.Event = (function() {

  function Event(component, options) {
    if (!(component instanceof ICAL.icalcomponent)) {
      options = component;
      component = null;
    }

    if (component) {
      this.component = component;
    } else {
      this.component = new ICAL.icalcomponent({
        name: 'VEVENT'
      });
    }

    this.exceptions = Object.create(null);

    if (options && options.exceptions) {
      options.exceptions.forEach(this.relateException, this);
    }
  }

  Event.prototype = {

    /**
     * List of related event exceptions.
     *
     * @type Array[ICAL.Event]
     */
    exceptions: null,

    /**
     * Relates a given event exception to this object.
     * If the given component does not share the UID of
     * this event it cannot be related and will throw an
     * exception.
     *
     * If this component is an exception it cannot have other
     * exceptions related to it.
     *
     * @param {ICAL.icalcomponent|ICAL.Event} obj component or event.
     */
    relateException: function(obj) {
      if (this.isRecurrenceException()) {
        throw new Error('cannot relate exception to exceptions');
      }

      if (obj instanceof ICAL.icalcomponent) {
        obj = new ICAL.Event(obj);
      }

      if (obj.uid !== this.uid) {
        throw new Error('attempted to relate unrelated exception');
      }

      // we don't sort or manage exceptions directly
      // here the recurrence expander handles that.
      this.exceptions[obj.recurrenceId.toString()] = obj;
    },

    /**
     * Returns the occurrence details based on its start time.
     * If the occurrence has an exception will return the details
     * for that exception.
     *
     * NOTE: this method is intend to be used in conjunction
     *       with the #iterator method.
     *
     * @param {ICAL.icaltime} occurrence time occurrence.
     */
    getOccurrenceDetails: function(occurrence) {
      var id = occurrence.toString();
      var result = {
        //XXX: Clone?
        recurrenceId: occurrence
      };

      if (id in this.exceptions) {
        var item = result.item = this.exceptions[id];
        result.startDate = item.startDate;
        result.endDate = item.endDate;
        result.item = item;
      } else {
        var end = occurrence.clone();
        end.addDuration(this.duration);

        result.endDate = end;
        result.startDate = occurrence;
        result.item = this;
      }

      return result;
    },

    /**
     * Builds a recur expansion instance for a specific
     * point in time (defaults to startDate).
     *
     * @return {ICAL.RecurExpansion} expander object.
     */
    iterator: function(startTime) {
      return new ICAL.RecurExpansion({
        component: this.component,
        dtstart: startTime || this.startDate
      });
    },

    isRecurring: function() {
      var comp = this.component;
      return comp.hasProperty('RRULE') || comp.hasProperty('RDATE');
    },

    isRecurrenceException: function() {
      return this.component.hasProperty('RECURRENCE-ID');
    },

    /**
     * Returns the types of recurrences this event may have.
     *
     * Returned as an object with the following possible keys:
     *
     *    - YEARLY
     *    - MONTHLY
     *    - WEEKLY
     *    - DAILY
     *    - MINUTELY
     *    - SECONDLY
     *
     * @return {Object} object of recurrence flags.
     */
    getRecurrenceTypes: function() {
      var rules = this.component.getAllProperties('RRULE');
      var i = 0;
      var len = rules.length;
      var result = Object.create(null);

      for (; i < len; i++) {
        result[rules[i].data.FREQ] = true;
      }

      return result;
    },

    get uid() {
      return this._firstPropsValue('UID');
    },

    set uid(value) {
      this._setProp('UID', value);
    },

    get startDate() {
      return this._firstProp('DTSTART');
    },

    set startDate(value) {
      this._setProp('DTSTART', value);
    },

    get endDate() {
      return this._firstProp('DTEND');
    },

    set endDate(value) {
      this._setProp('DTEND', value);
    },

    get duration() {
      // cached because its dynamically calculated
      // and may be frequently used. This could be problematic
      // later if we modify the underlying start/endDate.
      //
      // When do add that functionality it should expire this cache...
      if (typeof(this._duration) === 'undefined') {
        this._duration = this.endDate.subtractDate(this.startDate);
      }
      return this._duration;
    },

    get location() {
      return this._firstPropsValue('LOCATION');
    },

    set location(value) {
      return this._setProp('LOCATION', value);
    },

    get attendees() {
      //XXX: This is way lame we should have a better
      //     data structure for this later.
      return this.component.getAllProperties('ATTENDEE');
    },

    get summary() {
      return this._firstPropsValue('SUMMARY');
    },

    set summary(value) {
      this._setProp('SUMMARY', value);
    },

    get description() {
      return this._firstPropsValue('DESCRIPTION');
    },

    set description(value) {
      this._setProp('DESCRIPTION', value);
    },

    get organizer() {
      return this._firstProp('ORGANIZER');
    },

    set organizer(value) {
      this._setProp('ORGANIZER', value);
    },

    get sequence() {
      return this._firstPropsValue('SEQUENCE');
    },

    set sequence(value) {
      this._setProp('SEQUENCE', value);
    },

    get recurrenceId() {
      return this._firstProp('RECURRENCE-ID');
    },

    set recurrenceId(value) {
      this._setProp('RECURRENCE-ID', value);
    },

    _setProp: function(name, value) {
      this.component.updatePropertyWithValue(name, value);
    },

    _firstProp: function(name) {
      return this.component.getFirstPropertyValue(name);
    },

    /**
     * Return the first property value.
     * Most useful in cases where no properties
     * are expected and the value will be a text type.
     */
    _firstPropsValue: function(name) {
      var prop = this._firstProp(name);

      if (prop && prop.data && prop.data.value) {
        return prop.data.value[0];
      }

      return null;
    },

    toString: function() {
      return this.component.toString();
    }

  };

  return Event;

}());
ICAL.ComponentParser = (function() {

  /**
   * Component parser initializer.
   *
   * Usage:
   *
   *    var options = {
   *      // when false no events will be emitted for type
   *      parseEvent: true,
   *      parseTimezone: true
   *    };
   *
   *    var parser = new ICAL.ComponentParser(options);
   *
   *    parser.onevent() {
   *      //...
   *    }
   *
   *    // ontimezone, etc...
   *
   *    parser.oncomplete = function() {
   *
   *    };
   *
   *    parser.process(string | component);
   *
   *
   * @param {Object} options component parser options.
   */
  function ComponentParser(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    var key;
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  ComponentParser.prototype = {

    /**
     * When true parse events
     *
     * @type Boolean
     */
    parseEvent: true,

    /**
     * when true parse timezones
     *
     * @type Boolean
     */
    parseTimezone: true,


    /* SAX like events here for reference */

    /**
     * Fired when parsing is complete
     */
    oncomplete: function() {},

    /**
     * Fired if an error occurs during parsing.
     *
     * @param {Error} err details of error.
     */
    onerror: function(err) {},

    /**
     * Fired when a top level component (vtimezone) is found
     *
     * @param {ICAL.icaltimezone} timezone object.
     */
    ontimezone: function(component) {},

    /*
     * Fired when a top level component (VEVENT) is found.
     * @param {ICAL.Event} component top level component.
     */
    onevent: function(component) {},

    /**
     * Process a string or parse ical object.
     * This function itself will return nothing but
     * will start the parsing process.
     *
     * Events must be registered prior to calling this method.
     *
     * @param {String|Object} ical string or parsed ical object.
     */
    process: function(ical) {
      //TODO: this is sync now in the future we will have a incremental parser.
      if (typeof(ical) === 'string') {
        ical = ICAL.parse(ical);
      }

      if (!(ical instanceof ICAL.icalcomponent)) {
        ical = new ICAL.icalcomponent(ical);
      }

      var components = ical.getAllSubcomponents();
      var i = 0;
      var len = components.length;
      var component;

      for (; i < len; i++) {
        component = components[i];

        switch (component.name) {
          case 'VEVENT':
            if (this.parseEvent) {
              this.onevent(new ICAL.Event(component));
            }
            break;
          default:
            continue;
        }
      }

      //XXX: ideally we should do a "nextTick" here
      //     so in all cases this is actually async.
      this.oncomplete();
    }
  };

  return ComponentParser;

}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2011-2012 */



(typeof(ICAL) === 'undefined')? ICAL = {} : '';

(function() {
  ICAL.foldLength = 75;
  ICAL.newLineChar = "\n";

  /**
   * Return a parsed ICAL object to the ICAL format.
   *
   * @param {Object} object parsed ical string.
   * @return {String} ICAL string.
   */
  ICAL.stringify = function ICALStringify(object) {
    return ICAL.serializer.serializeToIcal(object);
  };

  /**
   * Parse an ICAL object or string.
   *
   * @param {String|Object} ical ical string or pre-parsed object.
   * @param {Boolean} decorate when true decorates object data types.
   *
   * @return {Object|ICAL.icalcomponent} The raw data or decorated icalcomponent.
   */
  ICAL.parse = function ICALParse(ical) {
    var state = ICAL.helpers.initState(ical, 0);

    while (state.buffer.length) {
      var line = ICAL.helpers.unfoldline(state);
      var lexState = ICAL.helpers.initState(line, state.lineNr);
      if (line.match(/^\s*$/) && state.buffer.match(/^\s*$/)) {
        break;
      }

      var lineData = ICAL.icalparser.lexContentLine(lexState);
      ICAL.icalparser.parseContentLine(state, lineData);
      state.lineNr++;
    }

    return state.currentData;
  };
}());

