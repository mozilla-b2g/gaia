/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var PhoneNumber = (function (dataBase) {
  // Use strict in our context only - users might not want it
  'use strict';

  const UNICODE_DIGITS = /[\uFF10-\uFF19,\u0660-\u0669,\u06F0-\u06F9]/g;
  const ALPHA_CHARS = /[a-zA-Z]/g;
  const NON_ALPHA_CHARS = /[^a-zA-Z]/g;
  const NON_DIALABLE_CHARS = /[^+\*\d]/g;
  const PLUS_CHARS = /^[+,\uFF0B]+/g;
  const BACKSLASH = /\\/g;
  const SPLIT_FIRST_GROUP = /^(\d+)(.*)$/;

  // Format of the string encoded meta data. If the name contains "^" or "$"
  // we will generate a regular expression from the value, with those special
  // characters as prefix/suffix.
  const META_DATA_ENCODING = ["region",
                              "^internationalPrefix",
                              "nationalPrefix",
                              "^nationalPrefixForParsing",
                              "nationalPrefixTransformRule",
                              "nationalPrefixFormattingRule",
                              "^possiblePattern$",
                              "^nationalPattern$",
                              "formats"];

  const FORMAT_ENCODING = ["^pattern$",
                           "nationalFormat",
                           "^leadingDigits",
                           "nationalPrefixFormattingRule",
                           "internationalFormat"];

  var regionCache = Object.create(null);

  // Parse an array of strings into a convenient object. We store meta
  // data as arrays since thats much more compact than JSON.
  function ParseArray(array, encoding, obj) {
    for (var n = 0; n < encoding.length; ++n) {
      var value = array[n];
      if (!value)
        continue;
      var field = encoding[n];
      var fieldAlpha = field.replace(NON_ALPHA_CHARS, "");
      if (field != fieldAlpha)
        value = new RegExp(field.replace(fieldAlpha, value));
      obj[fieldAlpha] = value;
    }
    return obj;
  }

  // Parse string encoded meta data into a convenient object
  // representation.
  function ParseMetaData(countryCode, md) {
    var array = eval(md.replace(BACKSLASH, "\\\\"));
    md = ParseArray(array,
                    META_DATA_ENCODING,
                    { countryCode: countryCode });
    regionCache[md.region] = md;
    return md;
  }

  // Parse string encoded format data into a convenient object
  // representation.
  function ParseFormat(md) {
    var formats = md.formats;
    // Bail if we already parsed the format definitions.
    if (!(formats[0] instanceof Array))
      return;
    for (var n = 0; n < formats.length; ++n) {
      formats[n] = ParseArray(formats[n],
                              FORMAT_ENCODING,
                              {});
    }
  }

  // Search for the meta data associated with a region identifier ("US") in
  // our database, which is indexed by country code ("1"). Since we have
  // to walk the entire database for this, we cache the result of the lookup
  // for future reference.
  function FindMetaDataForRegion(region) {
    // Check in the region cache first. This will find all entries we have
    // already resolved (parsed from a string encoding).
    var md = regionCache[region];
    if (md)
      return md;
    for (var countryCode in dataBase) {
      var entry = dataBase[countryCode];
      // Each entry is a string encoded object of the form '["US..', or
      // an array of strings. We don't want to parse the string here
      // to save memory, so we just substring the region identifier
      // and compare it. For arrays, we compare against all region
      // identifiers with that country code. We skip entries that are
      // of type object, because they were already resolved (parsed into
      // an object), and their country code should have been in the cache.
      if (entry instanceof Array) {
        for (var n = 0; n < entry.length; ++n) {
          if (typeof entry[n] == "string" && entry[n].substr(2,2) == region)
            return entry[n] = ParseMetaData(countryCode, entry[n]);
        }
        continue;
      }
      if (typeof entry == "string" && entry.substr(2,2) == region)
        return dataBase[countryCode] = ParseMetaData(countryCode, entry);
    }
  }

  // Format a national number for a given region. The boolean flag "intl"
  // indicates whether we want the national or international format.
  function FormatNumber(regionMetaData, number, intl) {
    // We lazily parse the format description in the meta data for the region,
    // so make sure to parse it now if we haven't already done so.
    ParseFormat(regionMetaData);
    var formats = regionMetaData.formats;
    for (var n = 0; n < formats.length; ++n) {
      var format = formats[n];
      // The leading digits field is optional. If we don't have it, just
      // use the matching pattern to qualify numbers.
      if (format.leadingDigits && !format.leadingDigits.test(number))
        continue;
      if (!format.pattern.test(number))
        continue;
      if (intl) {
        // If there is no international format, just fall back to the national
        // format.
        var internationalFormat = format.internationalFormat;
        if (!internationalFormat)
          internationalFormat = format.nationalFormat;
        // Some regions have numbers that can't be dialed from outside the
        // country, indicated by "NA" for the international format of that
        // number format pattern.
        if (internationalFormat == "NA")
          return null;
        // Prepend "+" and the country code.
        number = "+" + regionMetaData.countryCode + " " +
                 number.replace(format.pattern, internationalFormat);
      } else {
        number = number.replace(format.pattern, format.nationalFormat);
        // The region has a national prefix formatting rule, and it can be overwritten
        // by each actual number format rule.
        var nationalPrefixFormattingRule = regionMetaData.nationalPrefixFormattingRule;
        if (format.nationalPrefixFormattingRule)
          nationalPrefixFormattingRule = format.nationalPrefixFormattingRule;
        if (nationalPrefixFormattingRule) {
          // The prefix formatting rule contains two magic markers, "$NP" and "$FG".
          // "$NP" will be replaced by the national prefix, and "$FG" with the
          // first group of numbers.
          var match = number.match(SPLIT_FIRST_GROUP);
          var firstGroup = match[1];
          var rest = match[2];
          var prefix = nationalPrefixFormattingRule;
          prefix = prefix.replace("$NP", regionMetaData.nationalPrefix);
          prefix = prefix.replace("$FG", firstGroup);
          number = prefix + rest;
        }
      }
      return (number == "NA") ? null : number;
    }
    return null;
  }

  function ParsedNumber(regionMetaData, number) {
    this.region = regionMetaData.region;
    this.regionMetaData = regionMetaData;
    this.number = number;
  }

  // ParsedNumber represents the result of parsing a phone number. We have
  // two getters on the prototype that format the number in national and
  // international format. Once called, the getters put a direct property
  // onto the object, caching the result.
  ParsedNumber.prototype = {
    get internationalFormat() {
      var value = FormatNumber(this.regionMetaData, this.number, true);
      Object.defineProperty(this, "internationalFormat", { value: value, enumerable: true });
      return value;
    },
    get nationalFormat() {
      var value = FormatNumber(this.regionMetaData, this.number, false);
      Object.defineProperty(this, "nationalFormat", { value: value, enumerable: true });
      return value;
    }
  };

  // Normalize a number by converting unicode numbers and symbols to their
  // ASCII equivalents and removing all non-dialable characters.
  function NormalizeNumber(number) {
    number = number.replace(UNICODE_DIGITS,
                            function (ch) {
                              return String.fromCharCode(48 + (ch.charCodeAt(0) & 0xf));
                            });
    number = number.replace(ALPHA_CHARS,
                            function (ch) {
                              return (ch.toLowerCase().charCodeAt(0) - 97)/3+2 | 0;
                            });
    number = number.replace(PLUS_CHARS, "+");
    number = number.replace(NON_DIALABLE_CHARS, "");
    return number;
  }

  // Check whether the number is valid for the given region.
  function IsValidNumber(number, md) {
    return md.possiblePattern.test(number);
  }

  // Check whether the number is a valid national number for the given region.
  function IsNationalNumber(number, md) {
    return IsValidNumber(number, md) && md.nationalPattern.test(number);
  }

  // Determine the country code a number starts with, or return null if
  // its not a valid country code.
  function ParseCountryCode(number) {
    for (var n = 1; n <= 3; ++n) {
      var cc = number.substr(0,n);
      if (dataBase[cc])
        return cc;
    }
    return null;
  }

  // Parse an international number that starts with the country code. Return
  // null if the number is not a valid international number.
  function ParseInternationalNumber(number) {
    var ret;

    // Parse and strip the country code.
    var countryCode = ParseCountryCode(number);
    if (!countryCode)
      return null;
    number = number.substr(countryCode.length);

    // Lookup the meta data for the region (or regions) and if the rest of
    // the number parses for that region, return the parsed number.
    var entry = dataBase[countryCode];
    if (entry instanceof Array) {
      for (var n = 0; n < entry.length; ++n) {
        if (typeof entry[n] == "string")
          entry[n] = ParseMetaData(countryCode, entry[n]);
        if (ret = ParseNationalNumber(number, entry[n]))
          return ret;
      }
      return null;
    }
    if (typeof entry == "string")
      entry = dataBase[countryCode] = ParseMetaData(countryCode, entry);
    return ParseNationalNumber(number, entry);
  }

  // Parse a national number for a specific region. Return null if the
  // number is not a valid national number (it might still be a possible
  // number for parts of that region).
  function ParseNationalNumber(number, md) {
    if (!md.possiblePattern.test(number) ||
        !md.nationalPattern.test(number)) {
      return null;
    }
    // Success.
    return new ParsedNumber(md, number);
  }

  // Parse a number and transform it into the national format, removing any
  // international dial prefixes and country codes.
  function ParseNumber(number, defaultRegion) {
    var ret;

    // Remove formating characters and whitespace.
    number = NormalizeNumber(number);

    // Detect and strip leading '+'.
    if (PLUS_CHARS.test(number))
      return ParseInternationalNumber(number.replace(PLUS_CHARS, ""));

    // Lookup the meta data for the given region.
    var md = FindMetaDataForRegion(defaultRegion.toUpperCase());

    // See if the number starts with an international prefix, and if the
    // number resulting from stripping the code is valid, then remove the
    // prefix and flag the number as international.
    if (md.internationalPrefix.test(number)) {
      var possibleNumber = number.replace(md.internationalPrefix, "");
      if (ret = ParseInternationalNumber(possibleNumber))
        return ret;
    }

    // This is not an international number. See if its a national one for
    // the current region. National numbers can start with the national
    // prefix, or without.
    if (md.nationalPrefixForParsing) {
      // Some regions have specific national prefix parse rules. Apply those.
      var withoutPrefix = number.replace(md.nationalPrefixForParsing,
                                         md.nationalPrefixTransformRule);
      if (ret = ParseNationalNumber(withoutPrefix, md))
        return ret;
    } else {
      // If there is no specific national prefix rule, just strip off the
      // national prefix from the beginning of the number (if there is one).
      var nationalPrefix = md.nationalPrefix;
      if (nationalPrefix && number.indexOf(nationalPrefix) == 0 &&
          (ret = ParseNationalNumber(number.substr(nationalPrefix.length), md))) {
        return ret;
      }
    }
    if (ret = ParseNationalNumber(number, md))
      return ret;

    // If the number matches the possible numbers of the current region,
    // return it as a possible number.
    if (md.possiblePattern.test(number))
      return new ParsedNumber(md, number);

    // Now lets see if maybe its an international number after all, but
    // without '+' or the international prefix.
    if (ret = ParseInternationalNumber(number))
      return ret;

    // We couldn't parse the number at all.
    return null;
  }

  return {
    Parse: ParseNumber
  };
})(PHONE_NUMBER_META_DATA);
