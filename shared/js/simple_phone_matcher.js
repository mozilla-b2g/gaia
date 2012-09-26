/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * A simple lib to match internaional phone number with local
 * and user formatted phone numbers.
 *
 * Adding this feature to gecko is discussed here:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=743363
 *
 */

var SimplePhoneMatcher = {
  mcc: '724', // Assuming a Brazilian mcc by default, can be changed.

  // Used to remove all the formatting from a phone number.
  sanitizedNumber: function spm_sanitizedNumber(number) {
    var join = this._formattingChars.join('|\\');
    var regexp = new RegExp('(\\' + join + ')', 'g');
    return number.replace(regexp, '');
  },

  // Generate variants of a phone number (with prefix, without...).
  // The variants are sorted from the shortest to the longest.
  generateVariants: function spm_generateVariants(number) {
    var sanitizedNumber = this.sanitizedNumber(number);

    var variants = [];

    variants = variants.concat(this._internationalPrefixes(sanitizedNumber),
                               this._trunkPrefixes(sanitizedNumber),
                               this._carrierPrefixes(sanitizedNumber),
                               this._areaPrefixes(sanitizedNumber));

    return variants.sort(function shortestFirst(a, b) {
      return a.length > b.length;
    });
  },

  // Find the best (ie longest) match between the variants for a number
  // and matches.
  // |matches| is an array of arrays
  // This way we can easily go trough the results of a mozContacts request:
  // array (contacts) of arrays (phone numbers).
  // => {
  //      bestMatchIndex: i,
  //      localIndex: j
  //    }
  // ie. bestMatchIndex will be the index in the contact arrays, localIndex
  // the index in the phone numbers array of this contact
  bestMatch: function spm_bestMatchIndex(variants, matches) {
    var bestMatchIndex = null;
    var bestLocalIndex = null;
    var bestMatchLength = 0;

    matches.forEach(function(match, matchIndex) {
      match.forEach(function(number, localIndex) {
        var sanitizedNumber = this.sanitizedNumber(number)

        variants.forEach(function match(variant) {
          if (variant.indexOf(sanitizedNumber) !== -1 ||
              sanitizedNumber.indexOf(variant) !== -1) {
            var length = sanitizedNumber.length;

            if (length > bestMatchLength) {
              bestMatchLength = length;
              bestMatchIndex = matchIndex;
              bestLocalIndex = localIndex;
            }
          }
        });
      }, this);
    }, this);

    return {
      bestMatchIndex: bestMatchIndex,
      localIndex: bestLocalIndex
    };
  },

  _formattingChars: ['\s', '-', '.', '(', ')'],

  // https://en.wikipedia.org/wiki/International_call_prefix
  _mccWith00Prefix: ['208', '214', '234', '235', '724'],
  _mccWith011Prefix: ['310', '311', '312', '313', '314', '315', '316'],

  // https://en.wikipedia.org/wiki/Trunk_code
  _countriesWithTrunk0: ['33', '55'],
  _countriesWithNoTrunk: ['34', '44', '1'],
  _trunkCodes: ['0'],

  // https://en.wikipedia.org/wiki/List_of_dialling_codes_in_Brazil
  // https://en.wikipedia.org/wiki/Telephone_numbers_in_the_United_Kingdom
  // https://en.wikipedia.org/wiki/Telephone_numbering_plan
  // country code -> length of the area code
  _areaCodeSwipe: {
    '55': 2,
    '44': 3,
    '1': 3
  },

  _internationalPrefixes: function spm_internatialPrefixes(number) {
    var variants = [number];

    var internationalPrefix = '';
    if (this._mccWith00Prefix.indexOf(this.mcc) !== -1) {
      internationalPrefix = '00';
    }
    if (this._mccWith011Prefix.indexOf(this.mcc) !== -1) {
      internationalPrefix = '011';
    }

    var plusRegexp = new RegExp('^\\+');
    if (number.match(plusRegexp)) {
      variants.push(number.replace(plusRegexp, internationalPrefix));
    }

    var ipRegexp = new RegExp('^' + internationalPrefix);
    if (number.match(ipRegexp)) {
      variants.push(number.replace(ipRegexp, '+'));
    }

    return variants;
  },

  _trunkPrefixes: function spm_trunkPrefixes(number) {
    var variants = [];

    var trunk0Join = this._countriesWithTrunk0.join('|');
    var trunk0Regexp = new RegExp('^\\+(' + trunk0Join + ')');
    this._internationalPrefixes(number).some(function match(variant) {
      var match = variant.match(trunk0Regexp);

      if (match) {
        variants.push(variant.replace(trunk0Regexp, '0'));
        variants.push(variant.replace(trunk0Regexp, ''));
      }

      return match;
    });

    var noTrunkJoin = this._countriesWithNoTrunk.join('|');
    var noTrunkRegexp = new RegExp('^\\+(' + noTrunkJoin + ')');
    this._internationalPrefixes(number).some(function match(variant) {
      var match = variant.match(noTrunkRegexp);

      if (match) {
        variants.push(variant.replace(noTrunkRegexp, ''));
      }

      return match;
    });

    // If the number has a trunk prefix already we need a variant without it
    var withTrunkRegexp = new RegExp('^(' + this._trunkCodes.join('|') + ')');
    if (number.match(withTrunkRegexp)) {
      variants.push(number.replace(withTrunkRegexp, ''));
    }

    return variants;
  },

  _areaPrefixes: function spm_areaPrefixes(number) {
    var variants = [];

    Object.keys(this._areaCodeSwipe).forEach(function(country) {
      var re = new RegExp('^\\+' + country);

      this._internationalPrefixes(number).some(function match(variant) {
        var match = variant.match(re);

        if (match) {
          var afterArea = 1 + country.length + this._areaCodeSwipe[country];
          variants.push(variant.substring(afterArea));
        }

        return match;
      }, this);
    }, this);

    return variants;
  },

  // http://thebrazilbusiness.com/article/telephone-system-in-brazil
  _carrierPrefixes: function spm_carrierPrefix(number) {
    if (this.mcc != '724') {
      return [];
    }

    var variants = [];
    var withTrunk = new RegExp('^0');

    // A number with carrier prefix will have a trunk code and at
    // lest 13 digits
    if (number.length >= 13 && number.match(withTrunk)) {
      var afterCarrier = 3;
      variants.push(number.substring(afterCarrier));
    }

    return variants;
  }
};
