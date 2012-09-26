/**
 * @license
 * Copyright (C) 2010 The Libphonenumber Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview  Utility for international phone numbers.
 * Functionality includes formatting, parsing and validation.
 * (based on the java implementation).
 *
 * NOTE: A lot of methods in this class require Region Code strings. These must
 * be provided using ISO 3166-1 two-letter country-code format. These should be
 * in upper-case (but for compatibility lower-case is also allowed). The list of
 * the codes can be found here:
 * http://www.iso.org/iso/english_country_names_and_code_elements
 *
 * @author Nikolaos Trogkanis
 */

goog.provide('i18n.phonenumbers.Error');
goog.provide('i18n.phonenumbers.PhoneNumberFormat');
goog.provide('i18n.phonenumbers.PhoneNumberType');
goog.provide('i18n.phonenumbers.PhoneNumberUtil');
goog.provide('i18n.phonenumbers.PhoneNumberUtil.MatchType');
goog.provide('i18n.phonenumbers.PhoneNumberUtil.ValidationResult');

goog.require('goog.array');
goog.require('goog.proto2.PbLiteSerializer');
goog.require('goog.string');
goog.require('goog.string.StringBuffer');
goog.require('i18n.phonenumbers.NumberFormat');
goog.require('i18n.phonenumbers.PhoneMetadata');
goog.require('i18n.phonenumbers.PhoneMetadataCollection');
goog.require('i18n.phonenumbers.PhoneNumber');
goog.require('i18n.phonenumbers.PhoneNumber.CountryCodeSource');
goog.require('i18n.phonenumbers.PhoneNumberDesc');
goog.require('i18n.phonenumbers.metadata');



/**
 * @constructor
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil = function() {
  /**
   * A mapping from a region code to the PhoneMetadata for that region.
   * @type {Object.<string, i18n.phonenumbers.PhoneMetadata>}
   */
  this.regionToMetadataMap = {};
};
goog.addSingletonGetter(i18n.phonenumbers.PhoneNumberUtil);


/**
 * Errors encountered when parsing phone numbers.
 *
 * @enum {string}
 */
i18n.phonenumbers.Error = {
  INVALID_COUNTRY_CODE: 'Invalid country calling code',
  // This generally indicates the string passed in had less than 3 digits in it.
  // More specifically, the number failed to match the regular expression
  // VALID_PHONE_NUMBER.
  NOT_A_NUMBER: 'The string supplied did not seem to be a phone number',
  // This indicates the string started with an international dialing prefix, but
  // after this was stripped from the number, had less digits than any valid
  // phone number (including country calling code) could have.
  TOO_SHORT_AFTER_IDD: 'Phone number too short after IDD',
  // This indicates the string, after any country calling code has been
  // stripped, had less digits than any valid phone number could have.
  TOO_SHORT_NSN: 'The string supplied is too short to be a phone number',
  // This indicates the string had more digits than any valid phone number could
  // have.
  TOO_LONG: 'The string supplied is too long to be a phone number'
};


/**
 * @const
 * @type {number}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.NANPA_COUNTRY_CODE_ = 1;


/**
 * The minimum length of the national significant number.
 *
 * @const
 * @type {number}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_ = 2;


/**
 * The ITU says the maximum length should be 15, but we have found longer
 * numbers in Germany.
 *
 * @const
 * @type {number}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.MAX_LENGTH_FOR_NSN_ = 16;


/**
 * The maximum length of the country calling code.
 *
 * @const
 * @type {number}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.MAX_LENGTH_COUNTRY_CODE_ = 3;


/**
 * We don't allow input strings for parsing to be longer than 250 chars. This
 * prevents malicious input from consuming CPU.
 *
 * @const
 * @type {number}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.MAX_INPUT_STRING_LENGTH_ = 250;


/**
 * Region-code for the unknown region.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.UNKNOWN_REGION_ = 'ZZ';


/**
 * The prefix that needs to be inserted in front of a Colombian landline number
 * when dialed from a mobile phone in Colombia.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.COLOMBIA_MOBILE_TO_FIXED_LINE_PREFIX_ = '3';


/**
 * The PLUS_SIGN signifies the international prefix.
 *
 * @const
 * @type {string}
 */
i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN = '+';


/**
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.STAR_SIGN_ = '*';


/**
 * The RFC 3966 format for extensions.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.RFC3966_EXTN_PREFIX_ = ';ext=';


/**
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.RFC3966_PREFIX_ = 'tel:';


/**
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.RFC3966_PHONE_CONTEXT_ = ';phone-context=';


/**
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.RFC3966_ISDN_SUBADDRESS_ = ';isub=';


/**
 * These mappings map a character (key) to a specific digit that should replace
 * it for normalization purposes. Non-European digits that may be used in phone
 * numbers are mapped to a European equivalent.
 *
 * @const
 * @type {!Object.<string, string>}
 */
i18n.phonenumbers.PhoneNumberUtil.DIGIT_MAPPINGS = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '\uFF10': '0', // Fullwidth digit 0
  '\uFF11': '1', // Fullwidth digit 1
  '\uFF12': '2', // Fullwidth digit 2
  '\uFF13': '3', // Fullwidth digit 3
  '\uFF14': '4', // Fullwidth digit 4
  '\uFF15': '5', // Fullwidth digit 5
  '\uFF16': '6', // Fullwidth digit 6
  '\uFF17': '7', // Fullwidth digit 7
  '\uFF18': '8', // Fullwidth digit 8
  '\uFF19': '9', // Fullwidth digit 9
  '\u0660': '0', // Arabic-indic digit 0
  '\u0661': '1', // Arabic-indic digit 1
  '\u0662': '2', // Arabic-indic digit 2
  '\u0663': '3', // Arabic-indic digit 3
  '\u0664': '4', // Arabic-indic digit 4
  '\u0665': '5', // Arabic-indic digit 5
  '\u0666': '6', // Arabic-indic digit 6
  '\u0667': '7', // Arabic-indic digit 7
  '\u0668': '8', // Arabic-indic digit 8
  '\u0669': '9', // Arabic-indic digit 9
  '\u06F0': '0', // Eastern-Arabic digit 0
  '\u06F1': '1', // Eastern-Arabic digit 1
  '\u06F2': '2', // Eastern-Arabic digit 2
  '\u06F3': '3', // Eastern-Arabic digit 3
  '\u06F4': '4', // Eastern-Arabic digit 4
  '\u06F5': '5', // Eastern-Arabic digit 5
  '\u06F6': '6', // Eastern-Arabic digit 6
  '\u06F7': '7', // Eastern-Arabic digit 7
  '\u06F8': '8', // Eastern-Arabic digit 8
  '\u06F9': '9'  // Eastern-Arabic digit 9
};


/**
 * A map that contains characters that are essential when dialling. That means
 * any of the characters in this map must not be removed from a number when
 * dialing, otherwise the call will not reach the intended destination.
 *
 * @const
 * @type {!Object.<string, string>}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.DIALLABLE_CHAR_MAPPINGS_ = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '+': i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN,
  '*': '*'
};


/**
 * Only upper-case variants of alpha characters are stored.
 *
 * @const
 * @type {!Object.<string, string>}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.ALPHA_MAPPINGS_ = {
  'A': '2',
  'B': '2',
  'C': '2',
  'D': '3',
  'E': '3',
  'F': '3',
  'G': '4',
  'H': '4',
  'I': '4',
  'J': '5',
  'K': '5',
  'L': '5',
  'M': '6',
  'N': '6',
  'O': '6',
  'P': '7',
  'Q': '7',
  'R': '7',
  'S': '7',
  'T': '8',
  'U': '8',
  'V': '8',
  'W': '9',
  'X': '9',
  'Y': '9',
  'Z': '9'
};


/**
 * For performance reasons, amalgamate both into one map.
 *
 * @const
 * @type {!Object.<string, string>}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.ALL_NORMALIZATION_MAPPINGS_ = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '\uFF10': '0', // Fullwidth digit 0
  '\uFF11': '1', // Fullwidth digit 1
  '\uFF12': '2', // Fullwidth digit 2
  '\uFF13': '3', // Fullwidth digit 3
  '\uFF14': '4', // Fullwidth digit 4
  '\uFF15': '5', // Fullwidth digit 5
  '\uFF16': '6', // Fullwidth digit 6
  '\uFF17': '7', // Fullwidth digit 7
  '\uFF18': '8', // Fullwidth digit 8
  '\uFF19': '9', // Fullwidth digit 9
  '\u0660': '0', // Arabic-indic digit 0
  '\u0661': '1', // Arabic-indic digit 1
  '\u0662': '2', // Arabic-indic digit 2
  '\u0663': '3', // Arabic-indic digit 3
  '\u0664': '4', // Arabic-indic digit 4
  '\u0665': '5', // Arabic-indic digit 5
  '\u0666': '6', // Arabic-indic digit 6
  '\u0667': '7', // Arabic-indic digit 7
  '\u0668': '8', // Arabic-indic digit 8
  '\u0669': '9', // Arabic-indic digit 9
  '\u06F0': '0', // Eastern-Arabic digit 0
  '\u06F1': '1', // Eastern-Arabic digit 1
  '\u06F2': '2', // Eastern-Arabic digit 2
  '\u06F3': '3', // Eastern-Arabic digit 3
  '\u06F4': '4', // Eastern-Arabic digit 4
  '\u06F5': '5', // Eastern-Arabic digit 5
  '\u06F6': '6', // Eastern-Arabic digit 6
  '\u06F7': '7', // Eastern-Arabic digit 7
  '\u06F8': '8', // Eastern-Arabic digit 8
  '\u06F9': '9', // Eastern-Arabic digit 9
  'A': '2',
  'B': '2',
  'C': '2',
  'D': '3',
  'E': '3',
  'F': '3',
  'G': '4',
  'H': '4',
  'I': '4',
  'J': '5',
  'K': '5',
  'L': '5',
  'M': '6',
  'N': '6',
  'O': '6',
  'P': '7',
  'Q': '7',
  'R': '7',
  'S': '7',
  'T': '8',
  'U': '8',
  'V': '8',
  'W': '9',
  'X': '9',
  'Y': '9',
  'Z': '9'
};


/**
 * Separate map of all symbols that we wish to retain when formatting alpha
 * numbers. This includes digits, ASCII letters and number grouping symbols such
 * as '-' and ' '.
 *
 * @const
 * @type {!Object.<string, string>}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.ALL_PLUS_NUMBER_GROUPING_SYMBOLS_ = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  'A': 'A',
  'B': 'B',
  'C': 'C',
  'D': 'D',
  'E': 'E',
  'F': 'F',
  'G': 'G',
  'H': 'H',
  'I': 'I',
  'J': 'J',
  'K': 'K',
  'L': 'L',
  'M': 'M',
  'N': 'N',
  'O': 'O',
  'P': 'P',
  'Q': 'Q',
  'R': 'R',
  'S': 'S',
  'T': 'T',
  'U': 'U',
  'V': 'V',
  'W': 'W',
  'X': 'X',
  'Y': 'Y',
  'Z': 'Z',
  'a': 'A',
  'b': 'B',
  'c': 'C',
  'd': 'D',
  'e': 'E',
  'f': 'F',
  'g': 'G',
  'h': 'H',
  'i': 'I',
  'j': 'J',
  'k': 'K',
  'l': 'L',
  'm': 'M',
  'n': 'N',
  'o': 'O',
  'p': 'P',
  'q': 'Q',
  'r': 'R',
  's': 'S',
  't': 'T',
  'u': 'U',
  'v': 'V',
  'w': 'W',
  'x': 'X',
  'y': 'Y',
  'z': 'Z',
  '-': '-',
  '\uFF0D': '-',
  '\u2010': '-',
  '\u2011': '-',
  '\u2012': '-',
  '\u2013': '-',
  '\u2014': '-',
  '\u2015': '-',
  '\u2212': '-',
  '/': '/',
  '\uFF0F': '/',
  ' ': ' ',
  '\u3000': ' ',
  '\u2060': ' ',
  '.': '.',
  '\uFF0E': '.'
};


/**
 * Pattern that makes it easy to distinguish whether a region has a unique
 * international dialing prefix or not. If a region has a unique international
 * prefix (e.g. 011 in USA), it will be represented as a string that contains a
 * sequence of ASCII digits. If there are multiple available international
 * prefixes in a region, they will be represented as a regex string that always
 * contains character(s) other than ASCII digits. Note this regex also includes
 * tilde, which signals waiting for the tone.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.UNIQUE_INTERNATIONAL_PREFIX_ =
    /[\d]+(?:[~\u2053\u223C\uFF5E][\d]+)?/;


/**
 * Regular expression of acceptable punctuation found in phone numbers. This
 * excludes punctuation found as a leading character only. This consists of dash
 * characters, white space characters, full stops, slashes, square brackets,
 * parentheses and tildes. It also includes the letter 'x' as that is found as a
 * placeholder for carrier information in some phone numbers. Full-width
 * variants are also present.
 *
 * @const
 * @type {string}
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_PUNCTUATION =
    '-x\u2010-\u2015\u2212\u30FC\uFF0D-\uFF0F \u00A0\u00AD\u200B\u2060\u3000' +
    '()\uFF08\uFF09\uFF3B\uFF3D.\\[\\]/~\u2053\u223C\uFF5E';


/**
 * Digits accepted in phone numbers (ascii, fullwidth, arabic-indic, and eastern
 * arabic digits).
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ =
    '0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9';


/**
 * We accept alpha characters in phone numbers, ASCII only, upper and lower
 * case.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_ALPHA_ = 'A-Za-z';


/**
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_ = '+\uFF0B';


/**
 * @const
 * @type {!RegExp}
 */
i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_PATTERN =
    new RegExp('[' + i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_ + ']+');


/**
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.LEADING_PLUS_CHARS_PATTERN_ =
    new RegExp('^[' + i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_ + ']+');


/**
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.SEPARATOR_PATTERN_ =
    '[' + i18n.phonenumbers.PhoneNumberUtil.VALID_PUNCTUATION + ']+';


/**
 * @const
 * @type {!RegExp}
 */
i18n.phonenumbers.PhoneNumberUtil.CAPTURING_DIGIT_PATTERN =
    new RegExp('([' + i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + '])');


/**
 * Regular expression of acceptable characters that may start a phone number for
 * the purposes of parsing. This allows us to strip away meaningless prefixes to
 * phone numbers that may be mistakenly given to us. This consists of digits,
 * the plus symbol and arabic-indic digits. This does not contain alpha
 * characters, although they may be used later in the number. It also does not
 * include other punctuation, as this will be stripped later during parsing and
 * is of no information value when parsing a number.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_START_CHAR_PATTERN_ =
    new RegExp('[' + i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_ +
               i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + ']');


/**
 * Regular expression of characters typically used to start a second phone
 * number for the purposes of parsing. This allows us to strip off parts of the
 * number that are actually the start of another number, such as for:
 * (530) 583-6985 x302/x2303 -> the second extension here makes this actually
 * two phone numbers, (530) 583-6985 x302 and (530) 583-6985 x2303. We remove
 * the second extension so that the first number is parsed correctly.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.SECOND_NUMBER_START_PATTERN_ = /[\\\/] *x/;


/**
 * Regular expression of trailing characters that we want to remove. We remove
 * all characters that are not alpha or numerical characters. The hash character
 * is retained here, as it may signify the previous block was an extension.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.UNWANTED_END_CHAR_PATTERN_ =
    new RegExp('[^' + i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ +
               i18n.phonenumbers.PhoneNumberUtil.VALID_ALPHA_ + '#]+$');


/**
 * We use this pattern to check if the phone number has at least three letters
 * in it - if so, then we treat it as a number where some phone-number digits
 * are represented by letters.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_ALPHA_PHONE_PATTERN_ =
    /(?:.*?[A-Za-z]){3}.*/;


/**
 * Regular expression of viable phone numbers. This is location independent.
 * Checks we have at least three leading digits, and only valid punctuation,
 * alpha characters and digits in the phone number. Does not include extension
 * data. The symbol 'x' is allowed here as valid punctuation since it is often
 * used as a placeholder for carrier codes, for example in Brazilian phone
 * numbers. We also allow multiple '+' characters at the start.
 * Corresponds to the following:
 * [digits]{minLengthNsn}|
 * plus_sign*
 * (([punctuation]|[star])*[digits]){3,}([punctuation]|[star]|[digits]|[alpha])*
 *
 * The first reg-ex is to allow short numbers (two digits long) to be parsed if
 * they are entered as "15" etc, but only if there is no punctuation in them.
 * The second expression restricts the number of digits to three or more, but
 * then allows them to be in international form, and to have alpha-characters
 * and punctuation. We split up the two reg-exes here and combine them when
 * creating the reg-ex VALID_PHONE_NUMBER_PATTERN_ itself so we can prefix it
 * with ^ and append $ to each branch.
 *
 * Note VALID_PUNCTUATION starts with a -, so must be the first in the range.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_PHONE_NUMBER_PATTERN_ =
    '[' + i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + ']{' +
    i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_ + '}';


/**
 * See MIN_LENGTH_PHONE_NUMBER_PATTERN_ for a full description of this reg-exp.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_PHONE_NUMBER_ =
    '[' + i18n.phonenumbers.PhoneNumberUtil.PLUS_CHARS_ + ']*(?:[' +
    i18n.phonenumbers.PhoneNumberUtil.VALID_PUNCTUATION +
    i18n.phonenumbers.PhoneNumberUtil.STAR_SIGN_ + ']*[' +
    i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + ']){3,}[' +
    i18n.phonenumbers.PhoneNumberUtil.VALID_PUNCTUATION +
    i18n.phonenumbers.PhoneNumberUtil.STAR_SIGN_ +
    i18n.phonenumbers.PhoneNumberUtil.VALID_ALPHA_ +
    i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + ']*';


/**
 * Default extension prefix to use when formatting. This will be put in front of
 * any extension component of the number, after the main national number is
 * formatted. For example, if you wish the default extension formatting to be
 * ' extn: 3456', then you should specify ' extn: ' here as the default
 * extension prefix. This can be overridden by region-specific preferences.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.DEFAULT_EXTN_PREFIX_ = ' ext. ';


/**
 * Pattern to capture digits used in an extension.
 * Places a maximum length of '7' for an extension.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.CAPTURING_EXTN_DIGITS_ =
    '([' + i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + ']{1,7})';


/**
 * Regexp of all possible ways to write extensions, for use when parsing. This
 * will be run as a case-insensitive regexp match. Wide character versions are
 * also provided after each ASCII version. There are three regular expressions
 * here. The first covers RFC 3966 format, where the extension is added using
 * ';ext='. The second more generic one starts with optional white space and
 * ends with an optional full stop (.), followed by zero or more spaces/tabs and
 * then the numbers themselves. The other one covers the special case of
 * American numbers where the extension is written with a hash at the end, such
 * as '- 503#'. Note that the only capturing groups should be around the digits
 * that you want to capture as part of the extension, or else parsing will fail!
 * We allow two options for representing the accented o - the character itself,
 * and one in the unicode decomposed form with the combining acute accent.
 *
 * @const
 * @type {string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.EXTN_PATTERNS_FOR_PARSING_ =
    i18n.phonenumbers.PhoneNumberUtil.RFC3966_EXTN_PREFIX_ +
    i18n.phonenumbers.PhoneNumberUtil.CAPTURING_EXTN_DIGITS_ + '|' +
    '[ \u00A0\\t,]*' +
    '(?:e?xt(?:ensi(?:o\u0301?|\u00F3))?n?|\uFF45?\uFF58\uFF54\uFF4E?|' +
    '[,x\uFF58#\uFF03~\uFF5E]|int|anexo|\uFF49\uFF4E\uFF54)' +
    '[:\\.\uFF0E]?[ \u00A0\\t,-]*' +
    i18n.phonenumbers.PhoneNumberUtil.CAPTURING_EXTN_DIGITS_ + '#?|' +
    '[- ]+([' + i18n.phonenumbers.PhoneNumberUtil.VALID_DIGITS_ + ']{1,5})#';


/**
 * Regexp of all known extension prefixes used by different regions followed by
 * 1 or more valid digits, for use when parsing.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.EXTN_PATTERN_ =
    new RegExp('(?:' +
               i18n.phonenumbers.PhoneNumberUtil.EXTN_PATTERNS_FOR_PARSING_ +
               ')$', 'i');


/**
 * We append optionally the extension pattern to the end here, as a valid phone
 * number may have an extension prefix appended, followed by 1 or more digits.
 *
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.VALID_PHONE_NUMBER_PATTERN_ =
    new RegExp(
        '^' +
        i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_PHONE_NUMBER_PATTERN_ +
        '$|' +
        '^' + i18n.phonenumbers.PhoneNumberUtil.VALID_PHONE_NUMBER_ +
        '(?:' + i18n.phonenumbers.PhoneNumberUtil.EXTN_PATTERNS_FOR_PARSING_ +
        ')?' + '$', 'i');


/**
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.NON_DIGITS_PATTERN_ = /\D+/;


/**
 * This was originally set to $1 but there are some countries for which the
 * first group is not used in the national pattern (e.g. Argentina) so the $1
 * group does not match correctly.  Therefore, we use \d, so that the first
 * group actually used in the pattern will be matched.
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.FIRST_GROUP_PATTERN_ = /(\$\d)/;


/**
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.NP_PATTERN_ = /\$NP/;


/**
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.FG_PATTERN_ = /\$FG/;


/**
 * @const
 * @type {!RegExp}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.CC_PATTERN_ = /\$CC/;


/**
 * @const
 * @type {string}
 */
i18n.phonenumbers.PhoneNumberUtil.REGION_CODE_FOR_NON_GEO_ENTITY = '001';


/**
 * INTERNATIONAL and NATIONAL formats are consistent with the definition in
 * ITU-T Recommendation E123. For example, the number of the Google Switzerland
 * office will be written as '+41 44 668 1800' in INTERNATIONAL format, and as
 * '044 668 1800' in NATIONAL format. E164 format is as per INTERNATIONAL format
 * but with no formatting applied, e.g. '+41446681800'. RFC3966 is as per
 * INTERNATIONAL format, but with all spaces and other separating symbols
 * replaced with a hyphen, and with any phone number extension appended with
 * ';ext='. It also will have a prefix of 'tel:' added, e.g.
 * 'tel:+41-44-668-1800'.
 *
 * Note: If you are considering storing the number in a neutral format, you are
 * highly advised to use the PhoneNumber class.
 * @enum {number}
 */
i18n.phonenumbers.PhoneNumberFormat = {
  E164: 0,
  INTERNATIONAL: 1,
  NATIONAL: 2,
  RFC3966: 3
};


/**
 * Type of phone numbers.
 *
 * @enum {number}
 */
i18n.phonenumbers.PhoneNumberType = {
  FIXED_LINE: 0,
  MOBILE: 1,
  // In some regions (e.g. the USA), it is impossible to distinguish between
  // fixed-line and mobile numbers by looking at the phone number itself.
  FIXED_LINE_OR_MOBILE: 2,
  // Freephone lines
  TOLL_FREE: 3,
  PREMIUM_RATE: 4,
  // The cost of this call is shared between the caller and the recipient, and
  // is hence typically less than PREMIUM_RATE calls. See
  // http://en.wikipedia.org/wiki/Shared_Cost_Service for more information.
  SHARED_COST: 5,
  // Voice over IP numbers. This includes TSoIP (Telephony Service over IP).
  VOIP: 6,
  // A personal number is associated with a particular person, and may be routed
  // to either a MOBILE or FIXED_LINE number. Some more information can be found
  // here: http://en.wikipedia.org/wiki/Personal_Numbers
  PERSONAL_NUMBER: 7,
  PAGER: 8,
  // Used for 'Universal Access Numbers' or 'Company Numbers'. They may be
  // further routed to specific offices, but allow one number to be used for a
  // company.
  UAN: 9,
  // Used for 'Voice Mail Access Numbers'.
  VOICEMAIL: 10,
  // A phone number is of type UNKNOWN when it does not fit any of the known
  // patterns for a specific region.
  UNKNOWN: -1
};


/**
 * Types of phone number matches. See detailed description beside the
 * isNumberMatch() method.
 *
 * @enum {number}
 */
i18n.phonenumbers.PhoneNumberUtil.MatchType = {
  NOT_A_NUMBER: 0,
  NO_MATCH: 1,
  SHORT_NSN_MATCH: 2,
  NSN_MATCH: 3,
  EXACT_MATCH: 4
};


/**
 * Possible outcomes when testing if a PhoneNumber is possible.
 *
 * @enum {number}
 */
i18n.phonenumbers.PhoneNumberUtil.ValidationResult = {
  IS_POSSIBLE: 0,
  INVALID_COUNTRY_CODE: 1,
  TOO_SHORT: 2,
  TOO_LONG: 3
};


/**
 * Attempts to extract a possible number from the string passed in. This
 * currently strips all leading characters that cannot be used to start a phone
 * number. Characters that can be used to start a phone number are defined in
 * the VALID_START_CHAR_PATTERN. If none of these characters are found in the
 * number passed in, an empty string is returned. This function also attempts to
 * strip off any alternative extensions or endings if two or more are present,
 * such as in the case of: (530) 583-6985 x302/x2303. The second extension here
 * makes this actually two phone numbers, (530) 583-6985 x302 and (530) 583-6985
 * x2303. We remove the second extension so that the first number is parsed
 * correctly.
 *
 * @param {string} number the string that might contain a phone number.
 * @return {string} the number, stripped of any non-phone-number prefix (such as
 *     'Tel:') or an empty string if no character used to start phone numbers
 *     (such as + or any digit) is found in the number.
 */
i18n.phonenumbers.PhoneNumberUtil.extractPossibleNumber = function(number) {
  /** @type {string} */
  var possibleNumber;

  /** @type {number} */
  var start = number
      .search(i18n.phonenumbers.PhoneNumberUtil.VALID_START_CHAR_PATTERN_);
  if (start >= 0) {
    possibleNumber = number.substring(start);
    // Remove trailing non-alpha non-numerical characters.
    possibleNumber = possibleNumber.replace(
        i18n.phonenumbers.PhoneNumberUtil.UNWANTED_END_CHAR_PATTERN_, '');

    // Check for extra numbers at the end.
    /** @type {number} */
    var secondNumberStart = possibleNumber
        .search(i18n.phonenumbers.PhoneNumberUtil.SECOND_NUMBER_START_PATTERN_);
    if (secondNumberStart >= 0) {
      possibleNumber = possibleNumber.substring(0, secondNumberStart);
    }
  } else {
    possibleNumber = '';
  }
  return possibleNumber;
};


/**
 * Checks to see if the string of characters could possibly be a phone number at
 * all. At the moment, checks to see that the string begins with at least 2
 * digits, ignoring any punctuation commonly found in phone numbers. This method
 * does not require the number to be normalized in advance - but does assume
 * that leading non-number symbols have been removed, such as by the method
 * extractPossibleNumber.
 *
 * @param {string} number string to be checked for viability as a phone number.
 * @return {boolean} true if the number could be a phone number of some sort,
 *     otherwise false.
 */
i18n.phonenumbers.PhoneNumberUtil.isViablePhoneNumber = function(number) {
  if (number.length < i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_) {
    return false;
  }
  return i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
      i18n.phonenumbers.PhoneNumberUtil.VALID_PHONE_NUMBER_PATTERN_, number);
};


/**
 * Normalizes a string of characters representing a phone number. This performs
 * the following conversions:
 *   Punctuation is stripped.
 *   For ALPHA/VANITY numbers:
 *   Letters are converted to their numeric representation on a telephone
 *       keypad. The keypad used here is the one defined in ITU Recommendation
 *       E.161. This is only done if there are 3 or more letters in the number,
 *       to lessen the risk that such letters are typos.
 *   For other numbers:
 *   Wide-ascii digits are converted to normal ASCII (European) digits.
 *   Arabic-Indic numerals are converted to European numerals.
 *   Spurious alpha characters are stripped.
 *
 * @param {string} number a string of characters representing a phone number.
 * @return {string} the normalized string version of the phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.normalize = function(number) {
  if (i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
      i18n.phonenumbers.PhoneNumberUtil.VALID_ALPHA_PHONE_PATTERN_, number)) {
    return i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(number,
        i18n.phonenumbers.PhoneNumberUtil.ALL_NORMALIZATION_MAPPINGS_, true);
  } else {
    return i18n.phonenumbers.PhoneNumberUtil.normalizeDigitsOnly(number);
  }
};


/**
 * Normalizes a string of characters representing a phone number. This is a
 * wrapper for normalize(String number) but does in-place normalization of the
 * StringBuffer provided.
 *
 * @param {!goog.string.StringBuffer} number a StringBuffer of characters
 *     representing a phone number that will be normalized in place.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.normalizeSB_ = function(number) {
  /** @type {string} */
  var normalizedNumber = i18n.phonenumbers.PhoneNumberUtil.normalize(number
      .toString());
  number.clear();
  number.append(normalizedNumber);
};


/**
 * Normalizes a string of characters representing a phone number. This converts
 * wide-ascii and arabic-indic numerals to European numerals, and strips
 * punctuation and alpha characters.
 *
 * @param {string} number a string of characters representing a phone number.
 * @return {string} the normalized string version of the phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.normalizeDigitsOnly = function(number) {
  return i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(number,
      i18n.phonenumbers.PhoneNumberUtil.DIGIT_MAPPINGS, true);
};


/**
 * Converts all alpha characters in a number to their respective digits on a
 * keypad, but retains existing formatting. Also converts wide-ascii digits to
 * normal ascii digits, and converts Arabic-Indic numerals to European numerals.
 *
 * @param {string} number a string of characters representing a phone number.
 * @return {string} the normalized string version of the phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.convertAlphaCharactersInNumber =
    function(number) {

  return i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(number,
      i18n.phonenumbers.PhoneNumberUtil.ALL_NORMALIZATION_MAPPINGS_, false);
};


/**
 * Gets the length of the geographical area code from the
 * {@code national_number} field of the PhoneNumber object passed in, so that
 * clients could use it to split a national significant number into geographical
 * area code and subscriber number. It works in such a way that the resultant
 * subscriber number should be diallable, at least on some devices. An example
 * of how this could be used:
 *
 * <pre>
 * var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
 * var number = phoneUtil.parse('16502530000', 'US');
 * var nationalSignificantNumber =
 *     phoneUtil.getNationalSignificantNumber(number);
 * var areaCode;
 * var subscriberNumber;
 *
 * var areaCodeLength = phoneUtil.getLengthOfGeographicalAreaCode(number);
 * if (areaCodeLength > 0) {
 *   areaCode = nationalSignificantNumber.substring(0, areaCodeLength);
 *   subscriberNumber = nationalSignificantNumber.substring(areaCodeLength);
 * } else {
 *   areaCode = '';
 *   subscriberNumber = nationalSignificantNumber;
 * }
 * </pre>
 *
 * N.B.: area code is a very ambiguous concept, so the I18N team generally
 * recommends against using it for most purposes, but recommends using the more
 * general {@code national_number} instead. Read the following carefully before
 * deciding to use this method:
 * <ul>
 *  <li> geographical area codes change over time, and this method honors those
 *    changes; therefore, it doesn't guarantee the stability of the result it
 *    produces.
 *  <li> subscriber numbers may not be diallable from all devices (notably
 *    mobile devices, which typically requires the full national_number to be
 *    dialled in most regions).
 *  <li> most non-geographical numbers have no area codes, including numbers
 *    from non-geographical entities.
 *  <li> some geographical numbers have no area codes.
 * </ul>
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the PhoneNumber object for
 *     which clients want to know the length of the area code.
 * @return {number} the length of area code of the PhoneNumber object passed in.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getLengthOfGeographicalAreaCode =
    function(number) {

  if (number == null) {
    return 0;
  }
  /** @type {?string} */
  var regionCode = this.getRegionCodeForNumber(number);
  if (!this.isValidRegionCode_(regionCode)) {
    return 0;
  }
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.getMetadataForRegion(regionCode);
  // If a country doesn't use a national prefix, and this number doesn't have an
  // Italian leading zero, we assume it is a closed dialling plan with no area
  // codes.
  if (!metadata.hasNationalPrefix() && !number.hasItalianLeadingZero()) {
    return 0;
  }

  /** @type {i18n.phonenumbers.PhoneNumberType} */
  var type = this.getNumberTypeHelper_(
      this.getNationalSignificantNumber(number), metadata);
  // Most numbers other than the two types below have to be dialled in full.
  if (type != i18n.phonenumbers.PhoneNumberType.FIXED_LINE &&
      type != i18n.phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE) {
    return 0;
  }

  return this.getLengthOfNationalDestinationCode(number);
};


/**
 * Gets the length of the national destination code (NDC) from the PhoneNumber
 * object passed in, so that clients could use it to split a national
 * significant number into NDC and subscriber number. The NDC of a phone number
 * is normally the first group of digit(s) right after the country calling code
 * when the number is formatted in the international format, if there is a
 * subscriber number part that follows. An example of how this could be used:
 *
 * <pre>
 * var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
 * var number = phoneUtil.parse('18002530000', 'US');
 * var nationalSignificantNumber =
 *     phoneUtil.getNationalSignificantNumber(number);
 * var nationalDestinationCode;
 * var subscriberNumber;
 *
 * var nationalDestinationCodeLength =
 *     phoneUtil.getLengthOfNationalDestinationCode(number);
 * if (nationalDestinationCodeLength > 0) {
 *   nationalDestinationCode =
 *       nationalSignificantNumber.substring(0, nationalDestinationCodeLength);
 *   subscriberNumber =
 *       nationalSignificantNumber.substring(nationalDestinationCodeLength);
 * } else {
 *   nationalDestinationCode = '';
 *   subscriberNumber = nationalSignificantNumber;
 * }
 * </pre>
 *
 * Refer to the unittests to see the difference between this function and
 * {@link #getLengthOfGeographicalAreaCode}.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the PhoneNumber object for
 *     which clients want to know the length of the NDC.
 * @return {number} the length of NDC of the PhoneNumber object passed in.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getLengthOfNationalDestinationCode =
    function(number) {

  /** @type {i18n.phonenumbers.PhoneNumber} */
  var copiedProto;
  if (number.hasExtension()) {
    // We don't want to alter the proto given to us, but we don't want to
    // include the extension when we format it, so we copy it and clear the
    // extension here.
    copiedProto = number.clone();
    copiedProto.clearExtension();
  } else {
    copiedProto = number;
  }

  /** @type {string} */
  var nationalSignificantNumber = this.format(copiedProto,
      i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL);
  /** @type {!Array.<string>} */
  var numberGroups = nationalSignificantNumber.split(
      i18n.phonenumbers.PhoneNumberUtil.NON_DIGITS_PATTERN_);
  // The pattern will start with '+COUNTRY_CODE ' so the first group will always
  // be the empty string (before the + symbol) and the second group will be the
  // country calling code. The third group will be area code if it is not the
  // last group.
  // NOTE: On IE the first group that is supposed to be the empty string does
  // not appear in the array of number groups... so make the result on non-IE
  // browsers to be that of IE.
  if (numberGroups[0].length == 0) {
    numberGroups.shift();
  }
  if (numberGroups.length <= 2) {
    return 0;
  }

  if (this.getRegionCodeForCountryCode(number.getCountryCodeOrDefault()) ==
      'AR' &&
      this.getNumberType(number) == i18n.phonenumbers.PhoneNumberType.MOBILE) {
    // Argentinian mobile numbers, when formatted in the international format,
    // are in the form of +54 9 NDC XXXX.... As a result, we take the length of
    // the third group (NDC) and add 1 for the digit 9, which also forms part of
    // the national significant number.
    //
    // TODO: Investigate the possibility of better modeling the metadata to make
    // it easier to obtain the NDC.
    return numberGroups[2].length + 1;
  }
  return numberGroups[1].length;
};


/**
 * Normalizes a string of characters representing a phone number by replacing
 * all characters found in the accompanying map with the values therein, and
 * stripping all other characters if removeNonMatches is true.
 *
 * @param {string} number a string of characters representing a phone number.
 * @param {!Object.<string, string>} normalizationReplacements a mapping of
 *     characters to what they should be replaced by in the normalized version
 *     of the phone number.
 * @param {boolean} removeNonMatches indicates whether characters that are not
 *     able to be replaced should be stripped from the number. If this is false,
 *     they will be left unchanged in the number.
 * @return {string} the normalized string version of the phone number.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_ =
    function(number, normalizationReplacements, removeNonMatches) {

  /** @type {!goog.string.StringBuffer} */
  var normalizedNumber = new goog.string.StringBuffer();
  /** @type {string} */
  var character;
  /** @type {string} */
  var newDigit;
  /** @type {number} */
  var numberLength = number.length;
  for (var i = 0; i < numberLength; ++i) {
    character = number.charAt(i);
    newDigit = normalizationReplacements[character.toUpperCase()];
    if (newDigit != null) {
      normalizedNumber.append(newDigit);
    } else if (!removeNonMatches) {
      normalizedNumber.append(character);
    }
    // If neither of the above are true, we remove this character.
  }
  return normalizedNumber.toString();
};


/**
 * Helper function to check region code is not unknown or null.
 *
 * @param {?string} regionCode the ISO 3166-1 two-letter region code.
 * @return {boolean} true if region code is valid.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isValidRegionCode_ =
    function(regionCode) {

  // In Java we check whether the regionCode is contained in supportedRegions
  // that is built out of all the values of countryCallingCodeToRegionCodeMap
  // (countryCodeToRegionCodeMap in JS) minus REGION_CODE_FOR_NON_GEO_ENTITY.
  // In JS we check whether the regionCode is contained in the keys of
  // countryToMetadata but since for non-geographical country calling codes
  // (e.g. +800) we use the country calling codes instead of the region code as
  // key in the map we have to make sure regionCode is not a number to prevent
  // returning true for non-geographical country calling codes.
  return regionCode != null &&
      isNaN(regionCode) &&
      regionCode.toUpperCase() in i18n.phonenumbers.metadata.countryToMetadata;
};


/**
 * Helper function to check the country calling code is valid.
 *
 * @param {number} countryCallingCode the country calling code.
 * @return {boolean} true if country calling code code is valid.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.hasValidCountryCallingCode_ =
    function(countryCallingCode) {

  return countryCallingCode in
      i18n.phonenumbers.metadata.countryCodeToRegionCodeMap;
};


/**
 * Formats a phone number in the specified format using default rules. Note that
 * this does not promise to produce a phone number that the user can dial from
 * where they are - although we do format in either 'national' or
 * 'international' format depending on what the client asks for, we do not
 * currently support a more abbreviated format, such as for users in the same
 * 'area' who could potentially dial the number without area code. Note that if
 * the phone number has a country calling code of 0 or an otherwise invalid
 * country calling code, we cannot work out which formatting rules to apply so
 * we return the national significant number with no formatting applied.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number to be
 *     formatted.
 * @param {i18n.phonenumbers.PhoneNumberFormat} numberFormat the format the
 *     phone number should be formatted into.
 * @return {string} the formatted phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.format =
    function(number, numberFormat) {

  if (number.getNationalNumber() == 0 && number.hasRawInput()) {
    /** @type {string} */
    var rawInput = number.getRawInputOrDefault();
    if (rawInput.length > 0) {
      return rawInput;
    }
  }
  /** @type {number} */
  var countryCallingCode = number.getCountryCodeOrDefault();
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);
  if (numberFormat == i18n.phonenumbers.PhoneNumberFormat.E164) {
    // Early exit for E164 case since no formatting of the national number needs
    // to be applied. Extensions are not formatted.
    return this.prefixNumberWithCountryCallingCode_(
        countryCallingCode, i18n.phonenumbers.PhoneNumberFormat.E164,
        nationalSignificantNumber, '');
  }
  // Note getRegionCodeForCountryCode() is used because formatting information
  // for regions which share a country calling code is contained by only one
  // region for performance reasons. For example, for NANPA regions it will be
  // contained in the metadata for US.
  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCallingCode);
  if (!this.hasValidCountryCallingCode_(countryCallingCode)) {
    return nationalSignificantNumber;
  }

  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata =
      this.getMetadataForRegionOrCallingCode_(countryCallingCode, regionCode);
  /** @type {string} */
  var formattedExtension =
      this.maybeGetFormattedExtension_(number, metadata, numberFormat);
  /** @type {string} */
  var formattedNationalNumber =
      this.formatNsn_(nationalSignificantNumber, metadata, numberFormat);
  return this.prefixNumberWithCountryCallingCode_(countryCallingCode,
                                                  numberFormat,
                                                  formattedNationalNumber,
                                                  formattedExtension);
};


/**
 * Formats a phone number in the specified format using client-defined
 * formatting rules. Note that if the phone number has a country calling code of
 * zero or an otherwise invalid country calling code, we cannot work out things
 * like whether there should be a national prefix applied, or how to format
 * extensions, so we return the national significant number with no formatting
 * applied.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone  number to be
 *     formatted.
 * @param {i18n.phonenumbers.PhoneNumberFormat} numberFormat the format the
 *     phone number should be formatted into.
 * @param {Array.<i18n.phonenumbers.NumberFormat>} userDefinedFormats formatting
 *     rules specified by clients.
 * @return {string} the formatted phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.formatByPattern =
    function(number, numberFormat, userDefinedFormats) {

  /** @type {number} */
  var countryCallingCode = number.getCountryCodeOrDefault();
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);
  // Note getRegionCodeForCountryCode() is used because formatting information
  // for regions which share a country calling code is contained by only one
  // region for performance reasons. For example, for NANPA regions it will be
  // contained in the metadata for US.
  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCallingCode);
  if (!this.hasValidCountryCallingCode_(countryCallingCode)) {
    return nationalSignificantNumber;
  }
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata =
      this.getMetadataForRegionOrCallingCode_(countryCallingCode, regionCode);

  /** @type {string} */
  var formattedNumber = '';

  /** @type {i18n.phonenumbers.NumberFormat} */
  var formattingPattern = this.chooseFormattingPatternForNumber_(
      userDefinedFormats, nationalSignificantNumber);
  if (formattingPattern == null) {
    // If no pattern above is matched, we format the number as a whole.
    formattedNumber = nationalSignificantNumber;
  } else {
    // Before we do a replacement of the national prefix pattern $NP with the
    // national prefix, we need to copy the rule so that subsequent replacements
    // for different numbers have the appropriate national prefix.
    /** type {i18n.phonenumbers.NumberFormat} */
    var numFormatCopy = formattingPattern.clone();
    /** @type {string} */
    var nationalPrefixFormattingRule =
        formattingPattern.getNationalPrefixFormattingRuleOrDefault();
    /** @type {string} */
    if (nationalPrefixFormattingRule.length > 0) {
      var nationalPrefix = metadata.getNationalPrefixOrDefault();
      if (nationalPrefix.length > 0) {
        // Replace $NP with national prefix and $FG with the first group ($1).
        nationalPrefixFormattingRule = nationalPrefixFormattingRule
            .replace(i18n.phonenumbers.PhoneNumberUtil.NP_PATTERN_,
                     nationalPrefix)
            .replace(i18n.phonenumbers.PhoneNumberUtil.FG_PATTERN_, '$1');
        numFormatCopy.setNationalPrefixFormattingRule(
            nationalPrefixFormattingRule);
      } else {
        // We don't want to have a rule for how to format the national prefix if
        // there isn't one.
        numFormatCopy.clearNationalPrefixFormattingRule();
      }
    }
    formattedNumber = this.formatNsnUsingPattern_(
        nationalSignificantNumber, numFormatCopy, numberFormat);
  }

  /** @type {string} */
  var formattedExtension =
      this.maybeGetFormattedExtension_(number, metadata, numberFormat);
  return this.prefixNumberWithCountryCallingCode_(countryCallingCode,
                                                  numberFormat,
                                                  formattedNumber,
                                                  formattedExtension);
};


/**
 * Formats a phone number in national format for dialing using the carrier as
 * specified in the {@code carrierCode}. The {@code carrierCode} will always be
 * used regardless of whether the phone number already has a preferred domestic
 * carrier code stored. If {@code carrierCode} contains an empty string, returns
 * the number in national format without any carrier code.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number to be
 *     formatted.
 * @param {string} carrierCode the carrier selection code to be used.
 * @return {string} the formatted phone number in national format for dialing
 *     using the carrier as specified in the {@code carrierCode}.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    formatNationalNumberWithCarrierCode = function(number, carrierCode) {

  /** @type {number} */
  var countryCallingCode = number.getCountryCodeOrDefault();
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);
  // Note getRegionCodeForCountryCode() is used because formatting information
  // for regions which share a country calling code is contained by only one
  // region for performance reasons. For example, for NANPA regions it will be
  // contained in the metadata for US.
  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCallingCode);
  if (!this.hasValidCountryCallingCode_(countryCallingCode)) {
    return nationalSignificantNumber;
  }

  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata =
      this.getMetadataForRegionOrCallingCode_(countryCallingCode, regionCode);
  /** @type {string} */
  var formattedExtension = this.maybeGetFormattedExtension_(
      number, metadata, i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
  /** @type {string} */
  var formattedNationalNumber = this.formatNsn_(
      nationalSignificantNumber, metadata,
      i18n.phonenumbers.PhoneNumberFormat.NATIONAL, carrierCode);
  return this.prefixNumberWithCountryCallingCode_(
      countryCallingCode, i18n.phonenumbers.PhoneNumberFormat.NATIONAL,
      formattedNationalNumber, formattedExtension);
};


/**
 * @param {number} countryCallingCode
 * @param {?string} regionCode
 * @return {i18n.phonenumbers.PhoneMetadata}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getMetadataForRegionOrCallingCode_ =
    function(countryCallingCode, regionCode) {
  return i18n.phonenumbers.PhoneNumberUtil.REGION_CODE_FOR_NON_GEO_ENTITY ==
      regionCode ?
      this.getMetadataForNonGeographicalRegion(countryCallingCode) :
      this.getMetadataForRegion(regionCode);
};


/**
 * Formats a phone number in national format for dialing using the carrier as
 * specified in the preferred_domestic_carrier_code field of the PhoneNumber
 * object passed in. If that is missing, use the {@code fallbackCarrierCode}
 * passed in instead. If there is no {@code preferred_domestic_carrier_code},
 * and the {@code fallbackCarrierCode} contains an empty string, return the
 * number in national format without any carrier code.
 *
 * <p>Use {@link #formatNationalNumberWithCarrierCode} instead if the carrier
 * code passed in should take precedence over the number's
 * {@code preferred_domestic_carrier_code} when formatting.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number to be
 *     formatted.
 * @param {string} fallbackCarrierCode the carrier selection code to be used, if
 *     none is found in the phone number itself.
 * @return {string} the formatted phone number in national format for dialing
 *     using the number's preferred_domestic_carrier_code, or the
 *     {@code fallbackCarrierCode} passed in if none is found.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    formatNationalNumberWithPreferredCarrierCode = function(
        number, fallbackCarrierCode) {
  return this.formatNationalNumberWithCarrierCode(
      number,
      number.hasPreferredDomesticCarrierCode() ?
          number.getPreferredDomesticCarrierCodeOrDefault() :
          fallbackCarrierCode);
};


/**
 * Returns a number formatted in such a way that it can be dialed from a mobile
 * phone in a specific region. If the number cannot be reached from the region
 * (e.g. some countries block toll-free numbers from being called outside of the
 * country), the method returns an empty string.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number to be
 *     formatted.
 * @param {string} regionCallingFrom the region where the call is being placed.
 * @param {boolean} withFormatting whether the number should be returned with
 *     formatting symbols, such as spaces and dashes.
 * @return {string} the formatted phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.formatNumberForMobileDialing =
    function(number, regionCallingFrom, withFormatting) {

  /** @type {number} */
  var countryCallingCode = number.getCountryCodeOrDefault();
  if (!this.hasValidCountryCallingCode_(countryCallingCode)) {
    return number.hasRawInput() ? number.getRawInputOrDefault() : '';
  }

  /** @type {string} */
  var formattedNumber;
  // Clear the extension, as that part cannot normally be dialed together with
  // the main number.
  /** @type {i18n.phonenumbers.PhoneNumber} */
  var numberNoExt = number.clone();
  numberNoExt.clearExtension();
  /** @type {i18n.phonenumbers.PhoneNumberType} */
  var numberType = this.getNumberType(numberNoExt);
  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCallingCode);
  if (regionCode == 'CO' && regionCallingFrom == 'CO') {
    if (numberType == i18n.phonenumbers.PhoneNumberType.FIXED_LINE) {
      formattedNumber = this.formatNationalNumberWithCarrierCode(
          numberNoExt,
          i18n.phonenumbers.PhoneNumberUtil
              .COLOMBIA_MOBILE_TO_FIXED_LINE_PREFIX_);
    } else {
      // E164 doesn't work at all when dialing within Colombia.
      formattedNumber = this.format(
          numberNoExt, i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
    }
  } else if (regionCode == 'PE' && regionCallingFrom == 'PE') {
    // In Peru, numbers cannot be dialled using E164 format from a mobile phone
    // for Movistar. Instead they must be dialled in national format.
    formattedNumber = this.format(
        numberNoExt, i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
  } else if (regionCode == 'BR' && regionCallingFrom == 'BR' &&
      ((numberType == i18n.phonenumbers.PhoneNumberType.FIXED_LINE) ||
      (numberType == i18n.phonenumbers.PhoneNumberType.MOBILE) ||
      (numberType == i18n.phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE))) {
    formattedNumber = numberNoExt.hasPreferredDomesticCarrierCode() ?
        this.formatNationalNumberWithPreferredCarrierCode(numberNoExt, '') :
        // Brazilian fixed line and mobile numbers need to be dialed with a
        // carrier code when called within Brazil. Without that, most of the
        // carriers won't connect the call. Because of that, we return an empty
        // string here.
        '';
  } else if (this.canBeInternationallyDialled(numberNoExt)) {
    return withFormatting ?
        this.format(numberNoExt,
                    i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL) :
        this.format(numberNoExt, i18n.phonenumbers.PhoneNumberFormat.E164);
  } else {
    formattedNumber = (regionCallingFrom == regionCode) ?
        this.format(numberNoExt, i18n.phonenumbers.PhoneNumberFormat.NATIONAL) :
        '';
  }
  return withFormatting ?
      formattedNumber :
      i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(formattedNumber,
          i18n.phonenumbers.PhoneNumberUtil.DIALLABLE_CHAR_MAPPINGS_, true);
};


/**
 * Formats a phone number for out-of-country dialing purposes. If no
 * regionCallingFrom is supplied, we format the number in its INTERNATIONAL
 * format. If the country calling code is the same as that of the region where
 * the number is from, then NATIONAL formatting will be applied.
 *
 * <p>If the number itself has a country calling code of zero or an otherwise
 * invalid country calling code, then we return the number with no formatting
 * applied.
 *
 * <p>Note this function takes care of the case for calling inside of NANPA and
 * between Russia and Kazakhstan (who share the same country calling code). In
 * those cases, no international prefix is used. For regions which have multiple
 * international prefixes, the number in its INTERNATIONAL format will be
 * returned instead.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number to be
 *     formatted.
 * @param {string} regionCallingFrom the region where the call is being placed.
 * @return {string} the formatted phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.formatOutOfCountryCallingNumber =
    function(number, regionCallingFrom) {

  if (!this.isValidRegionCode_(regionCallingFrom)) {
    return this.format(number,
                       i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL);
  }
  /** @type {number} */
  var countryCallingCode = number.getCountryCodeOrDefault();
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);
  if (!this.hasValidCountryCallingCode_(countryCallingCode)) {
    return nationalSignificantNumber;
  }
  if (countryCallingCode ==
          i18n.phonenumbers.PhoneNumberUtil.NANPA_COUNTRY_CODE_) {
    if (this.isNANPACountry(regionCallingFrom)) {
      // For NANPA regions, return the national format for these regions but
      // prefix it with the country calling code.
      return countryCallingCode + ' ' +
          this.format(number, i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
    }
  } else if (countryCallingCode ==
                 this.getCountryCodeForValidRegion_(regionCallingFrom)) {
    // For regions that share a country calling code, the country calling code
    // need not be dialled. This also applies when dialling within a region, so
    // this if clause covers both these cases. Technically this is the case for
    // dialling from La Reunion to other overseas departments of France (French
    // Guiana, Martinique, Guadeloupe), but not vice versa - so we don't cover
    // this edge case for now and for those cases return the version including
    // country calling code. Details here:
    // http://www.petitfute.com/voyage/225-info-pratiques-reunion
    return this.format(number,
                       i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
  }
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadataForRegionCallingFrom =
      this.getMetadataForRegion(regionCallingFrom);
  /** @type {string} */
  var internationalPrefix =
      metadataForRegionCallingFrom.getInternationalPrefixOrDefault();

  // For regions that have multiple international prefixes, the international
  // format of the number is returned, unless there is a preferred international
  // prefix.
  /** @type {string} */
  var internationalPrefixForFormatting = '';
  if (i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
      i18n.phonenumbers.PhoneNumberUtil.UNIQUE_INTERNATIONAL_PREFIX_,
      internationalPrefix)) {
    internationalPrefixForFormatting = internationalPrefix;
  } else if (metadataForRegionCallingFrom.hasPreferredInternationalPrefix()) {
    internationalPrefixForFormatting =
        metadataForRegionCallingFrom.getPreferredInternationalPrefixOrDefault();
  }

  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCallingCode);
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadataForRegion =
      this.getMetadataForRegionOrCallingCode_(countryCallingCode, regionCode);
  /** @type {string} */
  var formattedNationalNumber = this.formatNsn_(
      nationalSignificantNumber, metadataForRegion,
      i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL);
  /** @type {string} */
  var formattedExtension = this.maybeGetFormattedExtension_(number,
      metadataForRegion, i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL);
  return internationalPrefixForFormatting.length > 0 ?
      internationalPrefixForFormatting + ' ' + countryCallingCode + ' ' +
          formattedNationalNumber + formattedExtension :
      this.prefixNumberWithCountryCallingCode_(
          countryCallingCode, i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL,
          formattedNationalNumber, formattedExtension);
};


/**
 * Formats a phone number using the original phone number format that the number
 * is parsed from. The original format is embedded in the country_code_source
 * field of the PhoneNumber object passed in. If such information is missing,
 * the number will be formatted into the NATIONAL format by default. When the
 * number contains a leading zero and this is unexpected for this country, or we
 * don't have a formatting pattern for the number, the method returns the raw
 * input when it is available.
 *
 * Note this method guarantees no digit will be inserted, removed or modified as
 * a result of formatting.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number that needs to
 *     be formatted in its original number format.
 * @param {string} regionCallingFrom the region whose IDD needs to be prefixed
 *     if the original number has one.
 * @return {string} the formatted phone number in its original number format.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.formatInOriginalFormat =
    function(number, regionCallingFrom) {

  if (number.hasRawInput() &&
      (this.hasUnexpectedItalianLeadingZero_(number) ||
       !this.hasFormattingPatternForNumber_(number))) {
    // We check if we have the formatting pattern because without that, we might
    // format the number as a group without national prefix.
    return number.getRawInputOrDefault();
  }
  if (!number.hasCountryCodeSource()) {
    return this.format(number, i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
  }
  /** @type {string} */
  var formattedNumber;
  switch (number.getCountryCodeSource()) {
    case i18n.phonenumbers.PhoneNumber.CountryCodeSource
        .FROM_NUMBER_WITH_PLUS_SIGN:
      formattedNumber = this.format(number,
          i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL);
      break;
    case i18n.phonenumbers.PhoneNumber.CountryCodeSource.FROM_NUMBER_WITH_IDD:
      formattedNumber =
          this.formatOutOfCountryCallingNumber(number, regionCallingFrom);
      break;
    case i18n.phonenumbers.PhoneNumber.CountryCodeSource
        .FROM_NUMBER_WITHOUT_PLUS_SIGN:
      formattedNumber = this.format(number,
          i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL).substring(1);
      break;
    case i18n.phonenumbers.PhoneNumber.CountryCodeSource.FROM_DEFAULT_COUNTRY:
      // Fall-through to default case.
    default:
      /** @type {string} */
      var regionCode =
          this.getRegionCodeForCountryCode(number.getCountryCodeOrDefault());
      // We strip non-digits from the NDD here, and from the raw input later,
      // so that we can compare them easily.
      /** @type {?string} */
      var nationalPrefix = this.getNddPrefixForRegion(regionCode, true);
      /** @type {string} */
      var nationalFormat =
          this.format(number, i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
      if (nationalPrefix == null || nationalPrefix.length == 0) {
        // If the region doesn't have a national prefix at all, we can safely
        // return the national format without worrying about a national prefix
        // being added.
        formattedNumber = nationalFormat;
        break;
      }
      // Otherwise, we check if the original number was entered with a national
      // prefix.
      if (this.rawInputContainsNationalPrefix_(
          number.getRawInputOrDefault(), nationalPrefix, regionCode)) {
        // If so, we can safely return the national format.
        formattedNumber = nationalFormat;
        break;
      }
      /** @type {i18n.phonenumbers.PhoneMetadata} */
      var metadata = this.getMetadataForRegion(regionCode);
      /** @type {string} */
      var nationalNumber = this.getNationalSignificantNumber(number);
      /** @type {i18n.phonenumbers.NumberFormat} */
      var formatRule = this.chooseFormattingPatternForNumber_(
          metadata.numberFormatArray(), nationalNumber);
      // When the format we apply to this number doesn't contain national
      // prefix, we can just return the national format.
      // TODO: Refactor the code below with the code in
      // isNationalPrefixPresentIfRequired.
      /** @type {string} */
      var candidateNationalPrefixRule =
          formatRule.getNationalPrefixFormattingRuleOrDefault();
      // We assume that the first-group symbol will never be _before_ the
      // national prefix.
      /** @type {number} */
      var indexOfFirstGroup = candidateNationalPrefixRule.indexOf('$1');
      if (indexOfFirstGroup <= 0) {
        formattedNumber = nationalFormat;
        break;
      }
      candidateNationalPrefixRule =
          candidateNationalPrefixRule.substring(0, indexOfFirstGroup);
      candidateNationalPrefixRule = i18n.phonenumbers.PhoneNumberUtil
          .normalizeDigitsOnly(candidateNationalPrefixRule);
      if (candidateNationalPrefixRule.length == 0) {
        // National prefix not used when formatting this number.
        formattedNumber = nationalFormat;
        break;
      }
      // Otherwise, we need to remove the national prefix from our output.
      /** @type {i18n.phonenumbers.NumberFormat} */
      var numFormatCopy = formatRule.clone();
      numFormatCopy.clearNationalPrefixFormattingRule();
      formattedNumber = this.formatByPattern(number,
          i18n.phonenumbers.PhoneNumberFormat.NATIONAL, [numFormatCopy]);
      break;
  }
  /** @type {string} */
  var rawInput = number.getRawInputOrDefault();
  // If no digit is inserted/removed/modified as a result of our formatting, we
  // return the formatted phone number; otherwise we return the raw input the
  // user entered.
  return (formattedNumber != null &&
          i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(formattedNumber,
              i18n.phonenumbers.PhoneNumberUtil.DIALLABLE_CHAR_MAPPINGS_,
              true /* remove non matches */) ==
          i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(rawInput,
              i18n.phonenumbers.PhoneNumberUtil.DIALLABLE_CHAR_MAPPINGS_,
              true /* remove non matches */)) ?
      formattedNumber :
      rawInput;
};


/**
 * Check if rawInput, which is assumed to be in the national format, has a
 * national prefix. The national prefix is assumed to be in digits-only form.
 * @param {string} rawInput
 * @param {string} nationalPrefix
 * @param {string} regionCode
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.rawInputContainsNationalPrefix_ =
    function(rawInput, nationalPrefix, regionCode) {

  /** @type {string} */
  var normalizedNationalNumber =
      i18n.phonenumbers.PhoneNumberUtil.normalizeDigitsOnly(rawInput);
  if (goog.string.startsWith(normalizedNationalNumber, nationalPrefix)) {
    try {
      // Some Japanese numbers (e.g. 00777123) might be mistaken to contain the
      // national prefix when written without it (e.g. 0777123) if we just do
      // prefix matching. To tackle that, we check the validity of the number if
      // the assumed national prefix is removed (777123 won't be valid in
      // Japan).
      return this.isValidNumber(
          this.parse(normalizedNationalNumber.substring(nationalPrefix.length),
                     regionCode));
    } catch (e) {
      return false;
    }
  }
  return false;
};


/**
 * Returns true if a number is from a region whose national significant number
 * couldn't contain a leading zero, but has the italian_leading_zero field set
 * to true.
 * @param {i18n.phonenumbers.PhoneNumber} number
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.hasUnexpectedItalianLeadingZero_ =
    function(number) {

  return number.hasItalianLeadingZero() &&
      !this.isLeadingZeroPossible(number.getCountryCodeOrDefault());
};


/**
 * @param {i18n.phonenumbers.PhoneNumber} number
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.hasFormattingPatternForNumber_ =
    function(number) {

  /** @type {number} */
  var countryCallingCode = number.getCountryCodeOrDefault();
  /** @type {string} */
  var phoneNumberRegion = this.getRegionCodeForCountryCode(countryCallingCode);
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.getMetadataForRegionOrCallingCode_(
      countryCallingCode, phoneNumberRegion);
  if (metadata == null) {
    return false;
  }
  /** @type {string} */
  var nationalNumber = this.getNationalSignificantNumber(number);
  /** @type {i18n.phonenumbers.NumberFormat} */
  var formatRule = this.chooseFormattingPatternForNumber_(
      metadata.numberFormatArray(), nationalNumber);
  return formatRule != null;
};


/**
 * Formats a phone number for out-of-country dialing purposes.
 *
 * Note that in this version, if the number was entered originally using alpha
 * characters and this version of the number is stored in raw_input, this
 * representation of the number will be used rather than the digit
 * representation. Grouping information, as specified by characters such as '-'
 * and ' ', will be retained.
 *
 * <p><b>Caveats:</b></p>
 * <ul>
 * <li>This will not produce good results if the country calling code is both
 * present in the raw input _and_ is the start of the national number. This is
 * not a problem in the regions which typically use alpha numbers.
 * <li>This will also not produce good results if the raw input has any grouping
 * information within the first three digits of the national number, and if the
 * function needs to strip preceding digits/words in the raw input before these
 * digits. Normally people group the first three digits together so this is not
 * a huge problem - and will be fixed if it proves to be so.
 * </ul>
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number that needs to
 *     be formatted.
 * @param {string} regionCallingFrom the region where the call is being placed.
 * @return {string} the formatted phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    formatOutOfCountryKeepingAlphaChars = function(number, regionCallingFrom) {
  /** @type {string} */
  var rawInput = number.getRawInputOrDefault();
  // If there is no raw input, then we can't keep alpha characters because there
  // aren't any. In this case, we return formatOutOfCountryCallingNumber.
  if (rawInput.length == 0) {
    return this.formatOutOfCountryCallingNumber(number, regionCallingFrom);
  }
  /** @type {number} */
  var countryCode = number.getCountryCodeOrDefault();
  if (!this.hasValidCountryCallingCode_(countryCode)) {
    return rawInput;
  }
  // Strip any prefix such as country calling code, IDD, that was present. We do
  // this by comparing the number in raw_input with the parsed number. To do
  // this, first we normalize punctuation. We retain number grouping symbols
  // such as ' ' only.
  rawInput = i18n.phonenumbers.PhoneNumberUtil.normalizeHelper_(
      rawInput,
      i18n.phonenumbers.PhoneNumberUtil.ALL_PLUS_NUMBER_GROUPING_SYMBOLS_,
      true);
  // Now we trim everything before the first three digits in the parsed number.
  // We choose three because all valid alpha numbers have 3 digits at the start
  // - if it does not, then we don't trim anything at all. Similarly, if the
  // national number was less than three digits, we don't trim anything at all.
  /** @type {string} */
  var nationalNumber = this.getNationalSignificantNumber(number);
  if (nationalNumber.length > 3) {
    /** @type {number} */
    var firstNationalNumberDigit =
        rawInput.indexOf(nationalNumber.substring(0, 3));
    if (firstNationalNumberDigit != -1) {
      rawInput = rawInput.substring(firstNationalNumberDigit);
    }
  }
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadataForRegionCallingFrom =
      this.getMetadataForRegion(regionCallingFrom);
  if (countryCode == i18n.phonenumbers.PhoneNumberUtil.NANPA_COUNTRY_CODE_) {
    if (this.isNANPACountry(regionCallingFrom)) {
      return countryCode + ' ' + rawInput;
    }
  } else if (this.isValidRegionCode_(regionCallingFrom) &&
      countryCode == this.getCountryCodeForValidRegion_(regionCallingFrom)) {
    /** @type {i18n.phonenumbers.NumberFormat} */
    var formattingPattern = this.chooseFormattingPatternForNumber_(
        metadataForRegionCallingFrom.numberFormatArray(), nationalNumber);
    if (formattingPattern == null) {
      // If no pattern above is matched, we format the original input.
      return rawInput;
    }
    /** @type {i18n.phonenumbers.NumberFormat} */
    var newFormat = formattingPattern.clone();
    // The first group is the first group of digits that the user wrote
    // together.
    newFormat.setPattern('(\\d+)(.*)');
    // Here we just concatenate them back together after the national prefix
    // has been fixed.
    newFormat.setFormat('$1$2');
    // Now we format using this pattern instead of the default pattern, but
    // with the national prefix prefixed if necessary.
    // This will not work in the cases where the pattern (and not the leading
    // digits) decide whether a national prefix needs to be used, since we have
    // overridden the pattern to match anything, but that is not the case in the
    // metadata to date.
    return this.formatNsnUsingPattern_(rawInput, newFormat,
        i18n.phonenumbers.PhoneNumberFormat.NATIONAL);
  }
  /** @type {string} */
  var internationalPrefixForFormatting = '';
  // If an unsupported region-calling-from is entered, or a country with
  // multiple international prefixes, the international format of the number is
  // returned, unless there is a preferred international prefix.
  if (metadataForRegionCallingFrom != null) {
    /** @type {string} */
    var internationalPrefix =
        metadataForRegionCallingFrom.getInternationalPrefixOrDefault();
    internationalPrefixForFormatting =
        i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
            i18n.phonenumbers.PhoneNumberUtil.UNIQUE_INTERNATIONAL_PREFIX_,
            internationalPrefix) ?
        internationalPrefix :
        metadataForRegionCallingFrom.getPreferredInternationalPrefixOrDefault();
  }
  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCode);
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadataForRegion =
      this.getMetadataForRegionOrCallingCode_(countryCode, regionCode);
  /** @type {string} */
  var formattedExtension = this.maybeGetFormattedExtension_(
      number, metadataForRegion,
      i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL);
  if (internationalPrefixForFormatting.length > 0) {
    return internationalPrefixForFormatting + ' ' + countryCode + ' ' +
        rawInput + formattedExtension;
  } else {
    // Invalid region entered as country-calling-from (so no metadata was found
    // for it) or the region chosen has multiple international dialling
    // prefixes.
    return this.prefixNumberWithCountryCallingCode_(
        countryCode, i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL,
        rawInput, formattedExtension);
  }
};


/**
 * Gets the national significant number of the a phone number. Note a national
 * significant number doesn't contain a national prefix or any formatting.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number for which the
 *     national significant number is needed.
 * @return {string} the national significant number of the PhoneNumber object
 *     passed in.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getNationalSignificantNumber =
    function(number) {

  // If a leading zero has been set, we prefix this now. Note this is not a
  // national prefix.
  /** @type {string} */
  var nationalNumber = '' + number.getNationalNumber();
  if (number.hasItalianLeadingZero() && number.getItalianLeadingZero()) {
    return '0' + nationalNumber;
  }
  return nationalNumber;
};


/**
 * A helper function that is used by format and formatByPattern.
 *
 * @param {number} countryCallingCode the country calling code.
 * @param {i18n.phonenumbers.PhoneNumberFormat} numberFormat the format the
 *     phone number should be formatted into.
 * @param {string} formattedNationalNumber
 * @param {string} formattedExtension
 * @return {string} the formatted phone number.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    prefixNumberWithCountryCallingCode_ = function(countryCallingCode,
                                                   numberFormat,
                                                   formattedNationalNumber,
                                                   formattedExtension) {

  switch (numberFormat) {
    case i18n.phonenumbers.PhoneNumberFormat.E164:
      return i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN + countryCallingCode +
          formattedNationalNumber + formattedExtension;
    case i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL:
      return i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN + countryCallingCode +
          ' ' + formattedNationalNumber + formattedExtension;
    case i18n.phonenumbers.PhoneNumberFormat.RFC3966:
      return i18n.phonenumbers.PhoneNumberUtil.RFC3966_PREFIX_ +
          i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN + countryCallingCode +
          '-' + formattedNationalNumber + formattedExtension;
    case i18n.phonenumbers.PhoneNumberFormat.NATIONAL:
    default:
      return formattedNationalNumber + formattedExtension;
  }
};


/**
 * Note in some regions, the national number can be written in two completely
 * different ways depending on whether it forms part of the NATIONAL format or
 * INTERNATIONAL format. The numberFormat parameter here is used to specify
 * which format to use for those cases. If a carrierCode is specified, this will
 * be inserted into the formatted string to replace $CC.
 *
 * @param {string} number a string of characters representing a phone number.
 * @param {i18n.phonenumbers.PhoneMetadata} metadata the metadata for the
 *     region that we think this number is from.
 * @param {i18n.phonenumbers.PhoneNumberFormat} numberFormat the format the
 *     phone number should be formatted into.
 * @param {string=} opt_carrierCode
 * @return {string} the formatted phone number.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.formatNsn_ =
    function(number, metadata, numberFormat, opt_carrierCode) {

  /** @type {Array.<i18n.phonenumbers.NumberFormat>} */
  var intlNumberFormats = metadata.intlNumberFormatArray();
  // When the intlNumberFormats exists, we use that to format national number
  // for the INTERNATIONAL format instead of using the numberDesc.numberFormats.
  /** @type {Array.<i18n.phonenumbers.NumberFormat>} */
  var availableFormats =
      (intlNumberFormats.length == 0 ||
          numberFormat == i18n.phonenumbers.PhoneNumberFormat.NATIONAL) ?
      metadata.numberFormatArray() : metadata.intlNumberFormatArray();
  /** @type {i18n.phonenumbers.NumberFormat} */
  var formattingPattern = this.chooseFormattingPatternForNumber_(
      availableFormats, number);
  return (formattingPattern == null) ?
      number :
      this.formatNsnUsingPattern_(number, formattingPattern,
                                  numberFormat, opt_carrierCode);
};


/**
 * @param {Array.<i18n.phonenumbers.NumberFormat>} availableFormats the
 *     available formats the phone number could be formatted into.
 * @param {string} nationalNumber a string of characters representing a phone
 *     number.
 * @return {i18n.phonenumbers.NumberFormat}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.chooseFormattingPatternForNumber_ =
    function(availableFormats, nationalNumber) {

  /** @type {i18n.phonenumbers.NumberFormat} */
  var numFormat;
  /** @type {number} */
  var l = availableFormats.length;
  for (var i = 0; i < l; ++i) {
    numFormat = availableFormats[i];
    /** @type {number} */
    var size = numFormat.leadingDigitsPatternCount();
    if (size == 0 ||
        // We always use the last leading_digits_pattern, as it is the most
        // detailed.
        nationalNumber
            .search(numFormat.getLeadingDigitsPattern(size - 1)) == 0) {
      /** @type {!RegExp} */
      var patternToMatch = new RegExp(numFormat.getPattern());
      if (i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(patternToMatch,
                                                             nationalNumber)) {
        return numFormat;
      }
    }
  }
  return null;
};


/**
 * Note that carrierCode is optional - if NULL or an empty string, no carrier
 * code replacement will take place.
 *
 * @param {string} nationalNumber a string of characters representing a phone
 *     number.
 * @param {i18n.phonenumbers.NumberFormat} formattingPattern the formatting rule
 *     the phone number should be formatted into.
 * @param {i18n.phonenumbers.PhoneNumberFormat} numberFormat the format the
 *     phone number should be formatted into.
 * @param {string=} opt_carrierCode
 * @return {string} the formatted phone number.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.formatNsnUsingPattern_ =
    function(nationalNumber, formattingPattern, numberFormat, opt_carrierCode) {

  /** @type {string} */
  var numberFormatRule = formattingPattern.getFormatOrDefault();
  /** @type {!RegExp} */
  var patternToMatch = new RegExp(formattingPattern.getPattern());
  /** @type {string} */
  var domesticCarrierCodeFormattingRule =
      formattingPattern.getDomesticCarrierCodeFormattingRuleOrDefault();
  /** @type {string} */
  var formattedNationalNumber = '';
  if (numberFormat == i18n.phonenumbers.PhoneNumberFormat.NATIONAL &&
      opt_carrierCode != null && opt_carrierCode.length > 0 &&
      domesticCarrierCodeFormattingRule.length > 0) {
    // Replace the $CC in the formatting rule with the desired carrier code.
    /** @type {string} */
    var carrierCodeFormattingRule = domesticCarrierCodeFormattingRule
        .replace(i18n.phonenumbers.PhoneNumberUtil.CC_PATTERN_,
                 opt_carrierCode);
    // Now replace the $FG in the formatting rule with the first group and
    // the carrier code combined in the appropriate way.
    numberFormatRule = numberFormatRule.replace(
        i18n.phonenumbers.PhoneNumberUtil.FIRST_GROUP_PATTERN_,
        carrierCodeFormattingRule);
    formattedNationalNumber =
        nationalNumber.replace(patternToMatch, numberFormatRule);
  } else {
    // Use the national prefix formatting rule instead.
    /** @type {string} */
    var nationalPrefixFormattingRule =
        formattingPattern.getNationalPrefixFormattingRuleOrDefault();
    if (numberFormat == i18n.phonenumbers.PhoneNumberFormat.NATIONAL &&
        nationalPrefixFormattingRule != null &&
        nationalPrefixFormattingRule.length > 0) {
      formattedNationalNumber = nationalNumber.replace(patternToMatch,
          numberFormatRule.replace(
              i18n.phonenumbers.PhoneNumberUtil.FIRST_GROUP_PATTERN_,
              nationalPrefixFormattingRule));
    } else {
      formattedNationalNumber =
          nationalNumber.replace(patternToMatch, numberFormatRule);
    }
  }
  if (numberFormat == i18n.phonenumbers.PhoneNumberFormat.RFC3966) {
    // Strip any leading punctuation.
    formattedNationalNumber = formattedNationalNumber.replace(
        new RegExp('^' + i18n.phonenumbers.PhoneNumberUtil.SEPARATOR_PATTERN_),
        '');
    // Replace the rest with a dash between each number group.
    formattedNationalNumber = formattedNationalNumber.replace(
        new RegExp(i18n.phonenumbers.PhoneNumberUtil.SEPARATOR_PATTERN_, 'g'),
        '-');
  }
  return formattedNationalNumber;
};


/**
 * Gets a valid number for the specified region.
 *
 * @param {string} regionCode the region for which an example number is needed.
 * @return {i18n.phonenumbers.PhoneNumber} a valid fixed-line number for the
 *     specified region. Returns null when the metadata does not contain such
 *     information, or the region 001 is passed in. For 001 (representing non-
 *     geographical numbers), call {@link #getExampleNumberForNonGeoEntity}
 *     instead.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getExampleNumber =
    function(regionCode) {

  return this.getExampleNumberForType(regionCode,
      i18n.phonenumbers.PhoneNumberType.FIXED_LINE);
};


/**
 * Gets a valid number for the specified region and number type.
 *
 * @param {string} regionCode the region for which an example number is needed.
 * @param {i18n.phonenumbers.PhoneNumberType} type the type of number that is
 *     needed.
 * @return {i18n.phonenumbers.PhoneNumber} a valid number for the specified
 *     region and type. Returns null when the metadata does not contain such
 *     information or if an invalid region or region 001 was entered.
 *     For 001 (representing non-geographical numbers), call
 *     {@link #getExampleNumberForNonGeoEntity} instead.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getExampleNumberForType =
    function(regionCode, type) {

  // Check the region code is valid.
  if (!this.isValidRegionCode_(regionCode)) {
    return null;
  }
  /** @type {i18n.phonenumbers.PhoneNumberDesc} */
  var desc = this.getNumberDescByType_(
      this.getMetadataForRegion(regionCode), type);
  try {
    if (desc.hasExampleNumber()) {
      return this.parse(desc.getExampleNumberOrDefault(), regionCode);
    }
  } catch (e) {
  }
  return null;
};


/**
 * Gets a valid number for the specified country calling code for a
 * non-geographical entity.
 *
 * @param {number} countryCallingCode the country calling code for a
 *     non-geographical entity.
 * @return {i18n.phonenumbers.PhoneNumber} a valid number for the
 *     non-geographical entity. Returns null when the metadata does not contain
 *     such information, or the country calling code passed in does not belong
 *     to a non-geographical entity.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getExampleNumberForNonGeoEntity =
    function(countryCallingCode) {
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata =
      this.getMetadataForNonGeographicalRegion(countryCallingCode);
  if (metadata != null) {
    /** @type {i18n.phonenumbers.PhoneNumberDesc} */
    var desc = metadata.getGeneralDesc();
    try {
      if (desc.hasExampleNumber()) {
        return this.parse('+' + countryCallingCode + desc.getExampleNumber(),
                          'ZZ');
      }
    } catch (e) {
    }
  }
  return null;
};


/**
 * Gets the formatted extension of a phone number, if the phone number had an
 * extension specified. If not, it returns an empty string.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the PhoneNumber that might have
 *     an extension.
 * @param {i18n.phonenumbers.PhoneMetadata} metadata the metadata for the
 *     region that we think this number is from.
 * @param {i18n.phonenumbers.PhoneNumberFormat} numberFormat the format the
 *     phone number should be formatted into.
 * @return {string} the formatted extension if any.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.maybeGetFormattedExtension_ =
    function(number, metadata, numberFormat) {

  if (!number.hasExtension() || number.getExtension().length == 0) {
    return '';
  } else {
    if (numberFormat == i18n.phonenumbers.PhoneNumberFormat.RFC3966) {
      return i18n.phonenumbers.PhoneNumberUtil.RFC3966_EXTN_PREFIX_ +
          number.getExtension();
    } else {
      if (metadata.hasPreferredExtnPrefix()) {
        return metadata.getPreferredExtnPrefix() +
            number.getExtensionOrDefault();
      } else {
        return i18n.phonenumbers.PhoneNumberUtil.DEFAULT_EXTN_PREFIX_ +
            number.getExtensionOrDefault();
      }
    }
  }
};


/**
 * @param {i18n.phonenumbers.PhoneMetadata} metadata
 * @param {i18n.phonenumbers.PhoneNumberType} type
 * @return {i18n.phonenumbers.PhoneNumberDesc}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getNumberDescByType_ =
    function(metadata, type) {

  switch (type) {
    case i18n.phonenumbers.PhoneNumberType.PREMIUM_RATE:
      return metadata.getPremiumRate();
    case i18n.phonenumbers.PhoneNumberType.TOLL_FREE:
      return metadata.getTollFree();
    case i18n.phonenumbers.PhoneNumberType.MOBILE:
      return metadata.getMobile();
    case i18n.phonenumbers.PhoneNumberType.FIXED_LINE:
    case i18n.phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE:
      return metadata.getFixedLine();
    case i18n.phonenumbers.PhoneNumberType.SHARED_COST:
      return metadata.getSharedCost();
    case i18n.phonenumbers.PhoneNumberType.VOIP:
      return metadata.getVoip();
    case i18n.phonenumbers.PhoneNumberType.PERSONAL_NUMBER:
      return metadata.getPersonalNumber();
    case i18n.phonenumbers.PhoneNumberType.PAGER:
      return metadata.getPager();
    case i18n.phonenumbers.PhoneNumberType.UAN:
      return metadata.getUan();
    case i18n.phonenumbers.PhoneNumberType.VOICEMAIL:
      return metadata.getVoicemail();
    default:
      return metadata.getGeneralDesc();
  }
};


/**
 * Gets the type of a phone number.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number that we want
 *     to know the type.
 * @return {i18n.phonenumbers.PhoneNumberType} the type of the phone number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getNumberType =
    function(number) {

  /** @type {?string} */
  var regionCode = this.getRegionCodeForNumber(number);
  if (!this.isValidRegionCode_(regionCode) &&
      i18n.phonenumbers.PhoneNumberUtil.REGION_CODE_FOR_NON_GEO_ENTITY !=
      regionCode) {
    return i18n.phonenumbers.PhoneNumberType.UNKNOWN;
  }
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.getMetadataForRegionOrCallingCode_(
      number.getCountryCodeOrDefault(), regionCode);
  return this.getNumberTypeHelper_(nationalSignificantNumber, metadata);
};


/**
 * @param {string} nationalNumber
 * @param {i18n.phonenumbers.PhoneMetadata} metadata
 * @return {i18n.phonenumbers.PhoneNumberType}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getNumberTypeHelper_ =
    function(nationalNumber, metadata) {

  /** @type {i18n.phonenumbers.PhoneNumberDesc} */
  var generalNumberDesc = metadata.getGeneralDesc();
  if (!generalNumberDesc.hasNationalNumberPattern() ||
      !this.isNumberMatchingDesc_(nationalNumber, generalNumberDesc)) {
    return i18n.phonenumbers.PhoneNumberType.UNKNOWN;
  }

  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getPremiumRate())) {
    return i18n.phonenumbers.PhoneNumberType.PREMIUM_RATE;
  }
  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getTollFree())) {
    return i18n.phonenumbers.PhoneNumberType.TOLL_FREE;
  }
  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getSharedCost())) {
    return i18n.phonenumbers.PhoneNumberType.SHARED_COST;
  }
  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getVoip())) {
    return i18n.phonenumbers.PhoneNumberType.VOIP;
  }
  if (this.isNumberMatchingDesc_(nationalNumber,
                                 metadata.getPersonalNumber())) {
    return i18n.phonenumbers.PhoneNumberType.PERSONAL_NUMBER;
  }
  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getPager())) {
    return i18n.phonenumbers.PhoneNumberType.PAGER;
  }
  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getUan())) {
    return i18n.phonenumbers.PhoneNumberType.UAN;
  }
  if (this.isNumberMatchingDesc_(nationalNumber, metadata.getVoicemail())) {
    return i18n.phonenumbers.PhoneNumberType.VOICEMAIL;
  }

  /** @type {boolean} */
  var isFixedLine = this.isNumberMatchingDesc_(nationalNumber, metadata
      .getFixedLine());
  if (isFixedLine) {
    if (metadata.getSameMobileAndFixedLinePattern()) {
      return i18n.phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE;
    } else if (this.isNumberMatchingDesc_(nationalNumber,
                                          metadata.getMobile())) {
      return i18n.phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE;
    }
    return i18n.phonenumbers.PhoneNumberType.FIXED_LINE;
  }
  // Otherwise, test to see if the number is mobile. Only do this if certain
  // that the patterns for mobile and fixed line aren't the same.
  if (!metadata.getSameMobileAndFixedLinePattern() &&
      this.isNumberMatchingDesc_(nationalNumber, metadata.getMobile())) {
    return i18n.phonenumbers.PhoneNumberType.MOBILE;
  }
  return i18n.phonenumbers.PhoneNumberType.UNKNOWN;
};


/**
 * @param {?string} regionCode
 * @return {i18n.phonenumbers.PhoneMetadata}
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getMetadataForRegion =
    function(regionCode) {

  if (regionCode == null) {
    return null;
  }
  regionCode = regionCode.toUpperCase();
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.regionToMetadataMap[regionCode];
  if (metadata == null) {
    /** @type {goog.proto2.PbLiteSerializer} */
    var serializer = new goog.proto2.PbLiteSerializer();
    /** @type {Array} */
    var metadataSerialized =
        i18n.phonenumbers.metadata.countryToMetadata[regionCode];
    if (metadataSerialized == null) {
      return null;
    }
    metadata = /** @type {i18n.phonenumbers.PhoneMetadata} */ (
        serializer.deserialize(i18n.phonenumbers.PhoneMetadata.getDescriptor(),
            metadataSerialized));
    this.regionToMetadataMap[regionCode] = metadata;
  }
  return metadata;
};


/**
 * @param {number} countryCallingCode
 * @return {i18n.phonenumbers.PhoneMetadata}
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    getMetadataForNonGeographicalRegion = function(countryCallingCode) {

  return this.getMetadataForRegion('' + countryCallingCode);
};


/**
 * @param {string} nationalNumber
 * @param {i18n.phonenumbers.PhoneNumberDesc} numberDesc
 * @return {boolean}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isNumberMatchingDesc_ =
    function(nationalNumber, numberDesc) {

  return i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
      numberDesc.getPossibleNumberPatternOrDefault(), nationalNumber) &&
      i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
          numberDesc.getNationalNumberPatternOrDefault(), nationalNumber);
};


/**
 * Tests whether a phone number matches a valid pattern. Note this doesn't
 * verify the number is actually in use, which is impossible to tell by just
 * looking at a number itself.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number that we want
 *     to validate.
 * @return {boolean} a boolean that indicates whether the number is of a valid
 *     pattern.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isValidNumber = function(number) {
  /** @type {?string} */
  var regionCode = this.getRegionCodeForNumber(number);
  return this.isValidNumberForRegion(number, regionCode);
};


/**
 * Tests whether a phone number is valid for a certain region. Note this doesn't
 * verify the number is actually in use, which is impossible to tell by just
 * looking at a number itself. If the country calling code is not the same as
 * the country calling code for the region, this immediately exits with false.
 * After this, the specific number pattern rules for the region are examined.
 * This is useful for determining for example whether a particular number is
 * valid for Canada, rather than just a valid NANPA number.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number that we want
 *     to validate.
 * @param {?string} regionCode the region that we want to validate the phone
 *     number for.
 * @return {boolean} a boolean that indicates whether the number is of a valid
 *     pattern.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isValidNumberForRegion =
    function(number, regionCode) {

  /** @type {number} */
  var countryCode = number.getCountryCodeOrDefault();
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata =
      this.getMetadataForRegionOrCallingCode_(countryCode, regionCode);
  if (metadata == null ||
      (i18n.phonenumbers.PhoneNumberUtil.REGION_CODE_FOR_NON_GEO_ENTITY !=
       regionCode &&
       countryCode != this.getCountryCodeForValidRegion_(regionCode))) {
    // Either the region code was invalid, or the country calling code for this
    // number does not match that of the region code.
    return false;
  }
  /** @type {i18n.phonenumbers.PhoneNumberDesc} */
  var generalNumDesc = metadata.getGeneralDesc();
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);

  // For regions where we don't have metadata for PhoneNumberDesc, we treat any
  // number passed in as a valid number if its national significant number is
  // between the minimum and maximum lengths defined by ITU for a national
  // significant number.
  if (!generalNumDesc.hasNationalNumberPattern()) {
    /** @type {number} */
    var numberLength = nationalSignificantNumber.length;
    return numberLength >
        i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_ &&
        numberLength <= i18n.phonenumbers.PhoneNumberUtil.MAX_LENGTH_FOR_NSN_;
  }
  return this.getNumberTypeHelper_(nationalSignificantNumber, metadata) !=
      i18n.phonenumbers.PhoneNumberType.UNKNOWN;
};


/**
 * Returns the region where a phone number is from. This could be used for
 * geocoding at the region level.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone number whose origin
 *     we want to know.
 * @return {?string} the region where the phone number is from, or null
 *     if no region matches this calling code.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getRegionCodeForNumber =
    function(number) {

  if (number == null) {
    return null;
  }
  /** @type {number} */
  var countryCode = number.getCountryCodeOrDefault();
  /** @type {Array.<string>} */
  var regions =
      i18n.phonenumbers.metadata.countryCodeToRegionCodeMap[countryCode];
  if (regions == null) {
    return null;
  }
  if (regions.length == 1) {
    return regions[0];
  } else {
    return this.getRegionCodeForNumberFromRegionList_(number, regions);
  }
};


/**
 * @param {i18n.phonenumbers.PhoneNumber} number
 * @param {Array.<string>} regionCodes
 * @return {?string}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    getRegionCodeForNumberFromRegionList_ = function(number, regionCodes) {

  /** @type {string} */
  var nationalNumber = this.getNationalSignificantNumber(number);
  /** @type {string} */
  var regionCode;
  /** @type {number} */
  var regionCodesLength = regionCodes.length;
  for (var i = 0; i < regionCodesLength; i++) {
    regionCode = regionCodes[i];
    // If leadingDigits is present, use this. Otherwise, do full validation.
    /** @type {i18n.phonenumbers.PhoneMetadata} */
    var metadata = this.getMetadataForRegion(regionCode);
    if (metadata.hasLeadingDigits()) {
      if (nationalNumber.search(metadata.getLeadingDigits()) == 0) {
        return regionCode;
      }
    } else if (this.getNumberTypeHelper_(nationalNumber, metadata) !=
        i18n.phonenumbers.PhoneNumberType.UNKNOWN) {
      return regionCode;
    }
  }
  return null;
};


/**
 * Returns the region code that matches the specific country calling code. In
 * the case of no region code being found, ZZ will be returned. In the case of
 * multiple regions, the one designated in the metadata as the 'main' region for
 * this calling code will be returned.
 *
 * @param {number} countryCallingCode the country calling code.
 * @return {string}
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getRegionCodeForCountryCode =
    function(countryCallingCode) {

  /** @type {Array.<string>} */
  var regionCodes =
      i18n.phonenumbers.metadata.countryCodeToRegionCodeMap[countryCallingCode];
  return regionCodes == null ?
      i18n.phonenumbers.PhoneNumberUtil.UNKNOWN_REGION_ : regionCodes[0];
};


/**
 * Returns the country calling code for a specific region. For example, this
 * would be 1 for the United States, and 64 for New Zealand.
 *
 * @param {?string} regionCode the region that we want to get the country
 *     calling code for.
 * @return {number} the country calling code for the region denoted by
 *     regionCode.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getCountryCodeForRegion =
    function(regionCode) {

  if (!this.isValidRegionCode_(regionCode)) {
    return 0;
  }
  return this.getCountryCodeForValidRegion_(regionCode);
};


/**
 * Returns the country calling code for a specific region. For example, this
 * would be 1 for the United States, and 64 for New Zealand. Assumes the region
 * is already valid.
 *
 * @param {?string} regionCode the region that we want to get the country
 *     calling code for.
 * @return {number} the country calling code for the region denoted by
 *     regionCode.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getCountryCodeForValidRegion_ =
    function(regionCode) {

  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.getMetadataForRegion(regionCode);
  return metadata.getCountryCodeOrDefault();
};


/**
 * Returns the national dialling prefix for a specific region. For example, this
 * would be 1 for the United States, and 0 for New Zealand. Set stripNonDigits
 * to true to strip symbols like '~' (which indicates a wait for a dialling
 * tone) from the prefix returned. If no national prefix is present, we return
 * null.
 *
 * <p>Warning: Do not use this method for do-your-own formatting - for some
 * regions, the national dialling prefix is used only for certain types of
 * numbers. Use the library's formatting functions to prefix the national prefix
 * when required.
 *
 * @param {?string} regionCode the region that we want to get the dialling
 *     prefix for.
 * @param {boolean} stripNonDigits true to strip non-digits from the national
 *     dialling prefix.
 * @return {?string} the dialling prefix for the region denoted by
 *     regionCode.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.getNddPrefixForRegion = function(
    regionCode, stripNonDigits) {
  if (!this.isValidRegionCode_(regionCode)) {
    return null;
  }
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.getMetadataForRegion(regionCode);
  /** @type {string} */
  var nationalPrefix = metadata.getNationalPrefixOrDefault();
  // If no national prefix was found, we return null.
  if (nationalPrefix.length == 0) {
    return null;
  }
  if (stripNonDigits) {
    // Note: if any other non-numeric symbols are ever used in national
    // prefixes, these would have to be removed here as well.
    nationalPrefix = nationalPrefix.replace('~', '');
  }
  return nationalPrefix;
};


/**
 * Checks if this is a region under the North American Numbering Plan
 * Administration (NANPA).
 *
 * @param {?string} regionCode the ISO 3166-1 two-letter region code.
 * @return {boolean} true if regionCode is one of the regions under NANPA.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isNANPACountry =
    function(regionCode) {

  return regionCode != null && goog.array.contains(
      i18n.phonenumbers.metadata.countryCodeToRegionCodeMap[
          i18n.phonenumbers.PhoneNumberUtil.NANPA_COUNTRY_CODE_],
      regionCode.toUpperCase());
};


/**
 * Checks whether countryCode represents the country calling code from a region
 * whose national significant number could contain a leading zero. An example of
 * such a region is Italy. Returns false if no metadata for the country is
 * found.
 *
 * @param {number} countryCallingCode the country calling code.
 * @return {boolean}
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isLeadingZeroPossible =
    function(countryCallingCode) {
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var mainMetadataForCallingCode = this.getMetadataForRegion(
      this.getRegionCodeForCountryCode(countryCallingCode));
  return mainMetadataForCallingCode != null &&
      mainMetadataForCallingCode.getLeadingZeroPossibleOrDefault();
};


/**
 * Checks if the number is a valid vanity (alpha) number such as 800 MICROSOFT.
 * A valid vanity number will start with at least 3 digits and will have three
 * or more alpha characters. This does not do region-specific checks - to work
 * out if this number is actually valid for a region, it should be parsed and
 * methods such as {@link #isPossibleNumberWithReason} and
 * {@link #isValidNumber} should be used.
 *
 * @param {string} number the number that needs to be checked.
 * @return {boolean} true if the number is a valid vanity number.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isAlphaNumber = function(number) {
  if (!i18n.phonenumbers.PhoneNumberUtil.isViablePhoneNumber(number)) {
    // Number is too short, or doesn't match the basic phone number pattern.
    return false;
  }
  /** @type {!goog.string.StringBuffer} */
  var strippedNumber = new goog.string.StringBuffer(number);
  this.maybeStripExtension(strippedNumber);
  return i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
      i18n.phonenumbers.PhoneNumberUtil.VALID_ALPHA_PHONE_PATTERN_,
      strippedNumber.toString());
};


/**
 * Convenience wrapper around {@link #isPossibleNumberWithReason}. Instead of
 * returning the reason for failure, this method returns a boolean value.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the number that needs to be
 *     checked.
 * @return {boolean} true if the number is possible.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isPossibleNumber =
    function(number) {

  return this.isPossibleNumberWithReason(number) ==
      i18n.phonenumbers.PhoneNumberUtil.ValidationResult.IS_POSSIBLE;
};


/**
 * Helper method to check a number against a particular pattern and determine
 * whether it matches, or is too short or too long. Currently, if a number
 * pattern suggests that numbers of length 7 and 10 are possible, and a number
 * in between these possible lengths is entered, such as of length 8, this will
 * return TOO_LONG.
 *
 * @param {string} numberPattern
 * @param {string} number
 * @return {i18n.phonenumbers.PhoneNumberUtil.ValidationResult}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.testNumberLengthAgainstPattern_ =
    function(numberPattern, number) {
  if (i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(numberPattern,
                                                         number)) {
    return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.IS_POSSIBLE;
  }
  if (number.search(numberPattern) == 0) {
    return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_LONG;
  } else {
    return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_SHORT;
  }
};


/**
 * Check whether a phone number is a possible number. It provides a more lenient
 * check than {@link #isValidNumber} in the following sense:
 * <ol>
 * <li>It only checks the length of phone numbers. In particular, it doesn't
 * check starting digits of the number.
 * <li>It doesn't attempt to figure out the type of the number, but uses general
 * rules which applies to all types of phone numbers in a region. Therefore, it
 * is much faster than isValidNumber.
 * <li>For fixed line numbers, many regions have the concept of area code, which
 * together with subscriber number constitute the national significant number.
 * It is sometimes okay to dial the subscriber number only when dialing in the
 * same area. This function will return true if the subscriber-number-only
 * version is passed in. On the other hand, because isValidNumber validates
 * using information on both starting digits (for fixed line numbers, that would
 * most likely be area codes) and length (obviously includes the length of area
 * codes for fixed line numbers), it will return false for the
 * subscriber-number-only version.
 * </ol>
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the number that needs to be
 *     checked.
 * @return {i18n.phonenumbers.PhoneNumberUtil.ValidationResult} a
 *     ValidationResult object which indicates whether the number is possible.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isPossibleNumberWithReason =
    function(number) {

  /** @type {string} */
  var nationalNumber = this.getNationalSignificantNumber(number);
  /** @type {number} */
  var countryCode = number.getCountryCodeOrDefault();
  // Note: For Russian Fed and NANPA numbers, we just use the rules from the
  // default region (US or Russia) since the getRegionCodeForNumber will not
  // work if the number is possible but not valid. This would need to be
  // revisited if the possible number pattern ever differed between various
  // regions within those plans.
  if (!this.hasValidCountryCallingCode_(countryCode)) {
    return i18n.phonenumbers.PhoneNumberUtil.ValidationResult
        .INVALID_COUNTRY_CODE;
  }
  /** @type {string} */
  var regionCode = this.getRegionCodeForCountryCode(countryCode);
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata =
      this.getMetadataForRegionOrCallingCode_(countryCode, regionCode);
  /** @type {i18n.phonenumbers.PhoneNumberDesc} */
  var generalNumDesc = metadata.getGeneralDesc();
  // Handling case of numbers with no metadata.
  if (!generalNumDesc.hasNationalNumberPattern()) {
    /** @type {number} */
    var numberLength = nationalNumber.length;
    if (numberLength < i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_) {
      return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_SHORT;
    } else if (numberLength >
               i18n.phonenumbers.PhoneNumberUtil.MAX_LENGTH_FOR_NSN_) {
      return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_LONG;
    } else {
      return i18n.phonenumbers.PhoneNumberUtil.ValidationResult.IS_POSSIBLE;
    }
  }
  /** @type {string} */
  var possibleNumberPattern =
      generalNumDesc.getPossibleNumberPatternOrDefault();
  return this.testNumberLengthAgainstPattern_(possibleNumberPattern,
                                              nationalNumber);
};


/**
 * Check whether a phone number is a possible number given a number in the form
 * of a string, and the region where the number could be dialed from. It
 * provides a more lenient check than {@link #isValidNumber}. See
 * {@link #isPossibleNumber} for details.
 *
 * <p>This method first parses the number, then invokes
 * {@link #isPossibleNumber} with the resultant PhoneNumber object.
 *
 * @param {string} number the number that needs to be checked, in the form of a
 *     string.
 * @param {string} regionDialingFrom the region that we are expecting the number
 *     to be dialed from.
 *     Note this is different from the region where the number belongs.
 *     For example, the number +1 650 253 0000 is a number that belongs to US.
 *     When written in this form, it can be dialed from any region. When it is
 *     written as 00 1 650 253 0000, it can be dialed from any region which uses
 *     an international dialling prefix of 00. When it is written as
 *     650 253 0000, it can only be dialed from within the US, and when written
 *     as 253 0000, it can only be dialed from within a smaller area in the US
 *     (Mountain View, CA, to be more specific).
 * @return {boolean} true if the number is possible.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isPossibleNumberString =
    function(number, regionDialingFrom) {

  try {
    return this.isPossibleNumber(this.parse(number, regionDialingFrom));
  } catch (e) {
    return false;
  }
};


/**
 * Attempts to extract a valid number from a phone number that is too long to be
 * valid, and resets the PhoneNumber object passed in to that valid version. If
 * no valid number could be extracted, the PhoneNumber object passed in will not
 * be modified.
 * @param {i18n.phonenumbers.PhoneNumber} number a PhoneNumber object which
 *     contains a number that is too long to be valid.
 * @return {boolean} true if a valid phone number can be successfully extracted.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.truncateTooLongNumber =
    function(number) {

  if (this.isValidNumber(number)) {
    return true;
  }
  /** @type {i18n.phonenumbers.PhoneNumber} */
  var numberCopy = number.clone();
  /** @type {number} */
  var nationalNumber = number.getNationalNumberOrDefault();
  do {
    nationalNumber = Math.floor(nationalNumber / 10);
    numberCopy.setNationalNumber(nationalNumber);
    if (nationalNumber == 0 ||
        this.isPossibleNumberWithReason(numberCopy) ==
            i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_SHORT) {
      return false;
    }
  } while (!this.isValidNumber(numberCopy));
  number.setNationalNumber(nationalNumber);
  return true;
};


/**
 * Extracts country calling code from fullNumber, returns it and places the
 * remaining number in nationalNumber. It assumes that the leading plus sign or
 * IDD has already been removed. Returns 0 if fullNumber doesn't start with a
 * valid country calling code, and leaves nationalNumber unmodified.
 *
 * @param {!goog.string.StringBuffer} fullNumber
 * @param {!goog.string.StringBuffer} nationalNumber
 * @return {number}
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.extractCountryCode =
    function(fullNumber, nationalNumber) {

  /** @type {string} */
  var fullNumberStr = fullNumber.toString();
  if ((fullNumberStr.length == 0) || (fullNumberStr.charAt(0) == '0')) {
    // Country codes do not begin with a '0'.
    return 0;
  }
  /** @type {number} */
  var potentialCountryCode;
  /** @type {number} */
  var numberLength = fullNumberStr.length;
  for (var i = 1;
      i <= i18n.phonenumbers.PhoneNumberUtil.MAX_LENGTH_COUNTRY_CODE_ &&
      i <= numberLength; ++i) {
    potentialCountryCode = parseInt(fullNumberStr.substring(0, i), 10);
    if (potentialCountryCode in
        i18n.phonenumbers.metadata.countryCodeToRegionCodeMap) {
      nationalNumber.append(fullNumberStr.substring(i));
      return potentialCountryCode;
    }
  }
  return 0;
};


/**
 * Tries to extract a country calling code from a number. This method will
 * return zero if no country calling code is considered to be present. Country
 * calling codes are extracted in the following ways:
 * <ul>
 * <li>by stripping the international dialing prefix of the region the person is
 * dialing from, if this is present in the number, and looking at the next
 * digits
 * <li>by stripping the '+' sign if present and then looking at the next digits
 * <li>by comparing the start of the number and the country calling code of the
 * default region. If the number is not considered possible for the numbering
 * plan of the default region initially, but starts with the country calling
 * code of this region, validation will be reattempted after stripping this
 * country calling code. If this number is considered a possible number, then
 * the first digits will be considered the country calling code and removed as
 * such.
 * </ul>
 *
 * It will throw a i18n.phonenumbers.Error if the number starts with a '+' but
 * the country calling code supplied after this does not match that of any known
 * region.
 *
 * @param {string} number non-normalized telephone number that we wish to
 *     extract a country calling code from - may begin with '+'.
 * @param {i18n.phonenumbers.PhoneMetadata} defaultRegionMetadata metadata
 *     about the region this number may be from.
 * @param {!goog.string.StringBuffer} nationalNumber a string buffer to store
 *     the national significant number in, in the case that a country calling
 *     code was extracted. The number is appended to any existing contents. If
 *     no country calling code was extracted, this will be left unchanged.
 * @param {boolean} keepRawInput true if the country_code_source and
 *     preferred_carrier_code fields of phoneNumber should be populated.
 * @param {i18n.phonenumbers.PhoneNumber} phoneNumber the PhoneNumber object
 *     where the country_code and country_code_source need to be populated.
 *     Note the country_code is always populated, whereas country_code_source is
 *     only populated when keepCountryCodeSource is true.
 * @return {number} the country calling code extracted or 0 if none could be
 *     extracted.
 * @throws {i18n.phonenumbers.Error}
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.maybeExtractCountryCode =
    function(number, defaultRegionMetadata, nationalNumber,
             keepRawInput, phoneNumber) {

  if (number.length == 0) {
    return 0;
  }
  /** @type {!goog.string.StringBuffer} */
  var fullNumber = new goog.string.StringBuffer(number);
  // Set the default prefix to be something that will never match.
  /** @type {?string} */
  var possibleCountryIddPrefix;
  if (defaultRegionMetadata != null) {
    possibleCountryIddPrefix = defaultRegionMetadata.getInternationalPrefix();
  }
  if (possibleCountryIddPrefix == null) {
    possibleCountryIddPrefix = 'NonMatch';
  }

  /** @type {i18n.phonenumbers.PhoneNumber.CountryCodeSource} */
  var countryCodeSource = this.maybeStripInternationalPrefixAndNormalize(
      fullNumber, possibleCountryIddPrefix);
  if (keepRawInput) {
    phoneNumber.setCountryCodeSource(countryCodeSource);
  }
  if (countryCodeSource !=
      i18n.phonenumbers.PhoneNumber.CountryCodeSource.FROM_DEFAULT_COUNTRY) {
    if (fullNumber.getLength() <=
        i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_) {
      throw i18n.phonenumbers.Error.TOO_SHORT_AFTER_IDD;
    }
    /** @type {number} */
    var potentialCountryCode = this.extractCountryCode(fullNumber,
                                                       nationalNumber);
    if (potentialCountryCode != 0) {
      phoneNumber.setCountryCode(potentialCountryCode);
      return potentialCountryCode;
    }

    // If this fails, they must be using a strange country calling code that we
    // don't recognize, or that doesn't exist.
    throw i18n.phonenumbers.Error.INVALID_COUNTRY_CODE;
  } else if (defaultRegionMetadata != null) {
    // Check to see if the number starts with the country calling code for the
    // default region. If so, we remove the country calling code, and do some
    // checks on the validity of the number before and after.
    /** @type {number} */
    var defaultCountryCode = defaultRegionMetadata.getCountryCodeOrDefault();
    /** @type {string} */
    var defaultCountryCodeString = '' + defaultCountryCode;
    /** @type {string} */
    var normalizedNumber = fullNumber.toString();
    if (goog.string.startsWith(normalizedNumber, defaultCountryCodeString)) {
      /** @type {!goog.string.StringBuffer} */
      var potentialNationalNumber = new goog.string.StringBuffer(
          normalizedNumber.substring(defaultCountryCodeString.length));
      /** @type {i18n.phonenumbers.PhoneNumberDesc} */
      var generalDesc = defaultRegionMetadata.getGeneralDesc();
      /** @type {!RegExp} */
      var validNumberPattern =
          new RegExp(generalDesc.getNationalNumberPatternOrDefault());
      // Passing null since we don't need the carrier code.
      this.maybeStripNationalPrefixAndCarrierCode(
          potentialNationalNumber, defaultRegionMetadata, null);
      /** @type {string} */
      var potentialNationalNumberStr = potentialNationalNumber.toString();
      /** @type {string} */
      var possibleNumberPattern =
          generalDesc.getPossibleNumberPatternOrDefault();
      // If the number was not valid before but is valid now, or if it was too
      // long before, we consider the number with the country calling code
      // stripped to be a better result and keep that instead.
      if ((!i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
              validNumberPattern, fullNumber.toString()) &&
          i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
              validNumberPattern, potentialNationalNumberStr)) ||
          this.testNumberLengthAgainstPattern_(possibleNumberPattern,
                                               fullNumber.toString()) ==
              i18n.phonenumbers.PhoneNumberUtil.ValidationResult.TOO_LONG) {
        nationalNumber.append(potentialNationalNumberStr);
        if (keepRawInput) {
          phoneNumber.setCountryCodeSource(
              i18n.phonenumbers.PhoneNumber.CountryCodeSource
                  .FROM_NUMBER_WITHOUT_PLUS_SIGN);
        }
        phoneNumber.setCountryCode(defaultCountryCode);
        return defaultCountryCode;
      }
    }
  }
  // No country calling code present.
  phoneNumber.setCountryCode(0);
  return 0;
};


/**
 * Strips the IDD from the start of the number if present. Helper function used
 * by maybeStripInternationalPrefixAndNormalize.
 *
 * @param {!RegExp} iddPattern the regular expression for the international
 *     prefix.
 * @param {!goog.string.StringBuffer} number the phone number that we wish to
 *     strip any international dialing prefix from.
 * @return {boolean} true if an international prefix was present.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.parsePrefixAsIdd_ =
    function(iddPattern, number) {

  /** @type {string} */
  var numberStr = number.toString();
  if (numberStr.search(iddPattern) == 0) {
    /** @type {number} */
    var matchEnd = numberStr.match(iddPattern)[0].length;
    /** @type {Array.<string>} */
    var matchedGroups = numberStr.substring(matchEnd).match(
        i18n.phonenumbers.PhoneNumberUtil.CAPTURING_DIGIT_PATTERN);
    if (matchedGroups && matchedGroups[1] != null &&
        matchedGroups[1].length > 0) {
      /** @type {string} */
      var normalizedGroup =
          i18n.phonenumbers.PhoneNumberUtil.normalizeDigitsOnly(
              matchedGroups[1]);
      if (normalizedGroup == '0') {
        return false;
      }
    }
    number.clear();
    number.append(numberStr.substring(matchEnd));
    return true;
  }
  return false;
};


/**
 * Strips any international prefix (such as +, 00, 011) present in the number
 * provided, normalizes the resulting number, and indicates if an international
 * prefix was present.
 *
 * @param {!goog.string.StringBuffer} number the non-normalized telephone number
 *     that we wish to strip any international dialing prefix from.
 * @param {string} possibleIddPrefix the international direct dialing prefix
 *     from the region we think this number may be dialed in.
 * @return {i18n.phonenumbers.PhoneNumber.CountryCodeSource} the corresponding
 *     CountryCodeSource if an international dialing prefix could be removed
 *     from the number, otherwise CountryCodeSource.FROM_DEFAULT_COUNTRY if
 *     the number did not seem to be in international format.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    maybeStripInternationalPrefixAndNormalize = function(number,
                                                         possibleIddPrefix) {
  /** @type {string} */
  var numberStr = number.toString();
  if (numberStr.length == 0) {
    return i18n.phonenumbers.PhoneNumber.CountryCodeSource.FROM_DEFAULT_COUNTRY;
  }
  // Check to see if the number begins with one or more plus signs.
  if (i18n.phonenumbers.PhoneNumberUtil.LEADING_PLUS_CHARS_PATTERN_
      .test(numberStr)) {
    numberStr = numberStr.replace(
        i18n.phonenumbers.PhoneNumberUtil.LEADING_PLUS_CHARS_PATTERN_, '');
    // Can now normalize the rest of the number since we've consumed the '+'
    // sign at the start.
    number.clear();
    number.append(i18n.phonenumbers.PhoneNumberUtil.normalize(numberStr));
    return i18n.phonenumbers.PhoneNumber.CountryCodeSource
        .FROM_NUMBER_WITH_PLUS_SIGN;
  }
  // Attempt to parse the first digits as an international prefix.
  /** @type {!RegExp} */
  var iddPattern = new RegExp(possibleIddPrefix);
  i18n.phonenumbers.PhoneNumberUtil.normalizeSB_(number);
  return this.parsePrefixAsIdd_(iddPattern, number) ?
      i18n.phonenumbers.PhoneNumber.CountryCodeSource.FROM_NUMBER_WITH_IDD :
      i18n.phonenumbers.PhoneNumber.CountryCodeSource.FROM_DEFAULT_COUNTRY;
};


/**
 * Strips any national prefix (such as 0, 1) present in the number provided.
 *
 * @param {!goog.string.StringBuffer} number the normalized telephone number
 *     that we wish to strip any national dialing prefix from.
 * @param {i18n.phonenumbers.PhoneMetadata} metadata the metadata for the
 *     region that we think this number is from.
 * @param {goog.string.StringBuffer} carrierCode a place to insert the carrier
 *     code if one is extracted.
 * @return {boolean} true if a national prefix or carrier code (or both) could
 *     be extracted.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.
    maybeStripNationalPrefixAndCarrierCode = function(number, metadata,
                                                      carrierCode) {

  /** @type {string} */
  var numberStr = number.toString();
  /** @type {number} */
  var numberLength = numberStr.length;
  /** @type {?string} */
  var possibleNationalPrefix = metadata.getNationalPrefixForParsing();
  if (numberLength == 0 || possibleNationalPrefix == null ||
      possibleNationalPrefix.length == 0) {
    // Early return for numbers of zero length.
    return false;
  }
  // Attempt to parse the first digits as a national prefix.
  /** @type {!RegExp} */
  var prefixPattern = new RegExp('^(?:' + possibleNationalPrefix + ')');
  /** @type {Array.<string>} */
  var prefixMatcher = prefixPattern.exec(numberStr);
  if (prefixMatcher) {
    /** @type {!RegExp} */
    var nationalNumberRule = new RegExp(
        metadata.getGeneralDesc().getNationalNumberPatternOrDefault());
    // prefixMatcher[numOfGroups] == null implies nothing was captured by the
    // capturing groups in possibleNationalPrefix; therefore, no transformation
    // is necessary, and we just remove the national prefix.
    /** @type {number} */
    var numOfGroups = prefixMatcher.length - 1;
    /** @type {?string} */
    var transformRule = metadata.getNationalPrefixTransformRule();
    /** @type {string} */
    var transformedNumber;
    /** @type {boolean} */
    var noTransform = transformRule == null || transformRule.length == 0 ||
                      prefixMatcher[numOfGroups] == null ||
                      prefixMatcher[numOfGroups].length == 0;
    if (noTransform) {
      transformedNumber = numberStr.substring(prefixMatcher[0].length);
    } else {
      transformedNumber = numberStr.replace(prefixPattern, transformRule);
    }
    // If the original number was viable, and the resultant number is not,
    // we return.
    if (i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
            nationalNumberRule, numberStr) &&
        !i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_(
            nationalNumberRule, transformedNumber)) {
      return false;
    }
    if ((noTransform && numOfGroups > 0 && prefixMatcher[1] != null) ||
        (!noTransform && numOfGroups > 1)) {
      if (carrierCode != null) {
        carrierCode.append(prefixMatcher[1]);
      }
    }
    number.clear();
    number.append(transformedNumber);
    return true;
  }
  return false;
};


/**
 * Strips any extension (as in, the part of the number dialled after the call is
 * connected, usually indicated with extn, ext, x or similar) from the end of
 * the number, and returns it.
 *
 * @param {!goog.string.StringBuffer} number the non-normalized telephone number
 *     that we wish to strip the extension from.
 * @return {string} the phone extension.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.maybeStripExtension =
    function(number) {

  /** @type {string} */
  var numberStr = number.toString();
  /** @type {number} */
  var mStart =
      numberStr.search(i18n.phonenumbers.PhoneNumberUtil.EXTN_PATTERN_);
  // If we find a potential extension, and the number preceding this is a viable
  // number, we assume it is an extension.
  if (mStart >= 0 && i18n.phonenumbers.PhoneNumberUtil.isViablePhoneNumber(
      numberStr.substring(0, mStart))) {
    // The numbers are captured into groups in the regular expression.
    /** @type {Array.<string>} */
    var matchedGroups =
        numberStr.match(i18n.phonenumbers.PhoneNumberUtil.EXTN_PATTERN_);
    /** @type {number} */
    var matchedGroupsLength = matchedGroups.length;
    for (var i = 1; i < matchedGroupsLength; ++i) {
      if (matchedGroups[i] != null && matchedGroups[i].length > 0) {
        // We go through the capturing groups until we find one that captured
        // some digits. If none did, then we will return the empty string.
        number.clear();
        number.append(numberStr.substring(0, mStart));
        return matchedGroups[i];
      }
    }
  }
  return '';
};


/**
 * Checks to see that the region code used is valid, or if it is not valid, that
 * the number to parse starts with a + symbol so that we can attempt to infer
 * the region from the number.
 * @param {string} numberToParse number that we are attempting to parse.
 * @param {?string} defaultRegion region that we are expecting the number to be
 *     from.
 * @return {boolean} false if it cannot use the region provided and the region
 *     cannot be inferred.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.checkRegionForParsing_ = function(
    numberToParse, defaultRegion) {
  // If the number is null or empty, we can't infer the region.
  return this.isValidRegionCode_(defaultRegion) ||
      (numberToParse != null && numberToParse.length > 0 &&
          i18n.phonenumbers.PhoneNumberUtil.LEADING_PLUS_CHARS_PATTERN_.test(
              numberToParse));
};


/**
 * Parses a string and returns it in proto buffer format. This method will throw
 * a {@link i18n.phonenumbers.Error} if the number is not considered to be a
 * possible number. Note that validation of whether the number is actually a
 * valid number for a particular region is not performed. This can be done
 * separately with {@link #isValidNumber}.
 *
 * @param {?string} numberToParse number that we are attempting to parse. This
 *     can contain formatting such as +, ( and -, as well as a phone number
 *     extension. It can also be provided in RFC3966 format.
 * @param {?string} defaultRegion region that we are expecting the number to be
 *     from. This is only used if the number being parsed is not written in
 *     international format. The country_code for the number in this case would
 *     be stored as that of the default region supplied. If the number is
 *     guaranteed to start with a '+' followed by the country calling code, then
 *     'ZZ' or null can be supplied.
 * @return {i18n.phonenumbers.PhoneNumber} a phone number proto buffer filled
 *     with the parsed number.
 * @throws {i18n.phonenumbers.Error} if the string is not considered to be a
 *     viable phone number or if no default region was supplied and the number
 *     is not in international format (does not start with +).
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.parse = function(numberToParse,
                                                             defaultRegion) {
  return this.parseHelper_(numberToParse, defaultRegion, false, true);
};


/**
 * Parses a string and returns it in proto buffer format. This method differs
 * from {@link #parse} in that it always populates the raw_input field of the
 * protocol buffer with numberToParse as well as the country_code_source field.
 *
 * @param {string} numberToParse number that we are attempting to parse. This
 *     can contain formatting such as +, ( and -, as well as a phone number
 *     extension.
 * @param {?string} defaultRegion region that we are expecting the number to be
 *     from. This is only used if the number being parsed is not written in
 *     international format. The country calling code for the number in this
 *     case would be stored as that of the default region supplied.
 * @return {i18n.phonenumbers.PhoneNumber} a phone number proto buffer filled
 *     with the parsed number.
 * @throws {i18n.phonenumbers.Error} if the string is not considered to be a
 *     viable phone number or if no default region was supplied.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.parseAndKeepRawInput =
    function(numberToParse, defaultRegion) {

  if (!this.isValidRegionCode_(defaultRegion)) {
    if (numberToParse.length > 0 && numberToParse.charAt(0) !=
        i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN) {
      throw i18n.phonenumbers.Error.INVALID_COUNTRY_CODE;
    }
  }

  return this.parseHelper_(numberToParse, defaultRegion, true, true);
};


/**
 * Parses a string and returns it in proto buffer format. This method is the
 * same as the public {@link #parse} method, with the exception that it allows
 * the default region to be null, for use by {@link #isNumberMatch}.
 *
 * @param {?string} numberToParse number that we are attempting to parse. This
 *     can contain formatting such as +, ( and -, as well as a phone number
 *     extension.
 * @param {?string} defaultRegion region that we are expecting the number to be
 *     from. This is only used if the number being parsed is not written in
 *     international format. The country calling code for the number in this
 *     case would be stored as that of the default region supplied.
 * @param {boolean} keepRawInput whether to populate the raw_input field of the
 *     phoneNumber with numberToParse.
 * @param {boolean} checkRegion should be set to false if it is permitted for
 *     the default coregion to be null or unknown ('ZZ').
 * @return {i18n.phonenumbers.PhoneNumber} a phone number proto buffer filled
 *     with the parsed number.
 * @throws {i18n.phonenumbers.Error}
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.parseHelper_ =
    function(numberToParse, defaultRegion, keepRawInput, checkRegion) {

  if (numberToParse == null) {
    throw i18n.phonenumbers.Error.NOT_A_NUMBER;
  } else if (numberToParse.length >
      i18n.phonenumbers.PhoneNumberUtil.MAX_INPUT_STRING_LENGTH_) {
    throw 'The string supplied was too long to parse';
  }

  /** @type {!goog.string.StringBuffer} */
  var nationalNumber = new goog.string.StringBuffer();
  this.buildNationalNumberForParsing_(numberToParse, nationalNumber);

  if (!i18n.phonenumbers.PhoneNumberUtil.isViablePhoneNumber(
      nationalNumber.toString())) {
    throw i18n.phonenumbers.Error.NOT_A_NUMBER;
  }

  // Check the region supplied is valid, or that the extracted number starts
  // with some sort of + sign so the number's region can be determined.
  if (checkRegion &&
      !this.checkRegionForParsing_(nationalNumber.toString(), defaultRegion)) {
    throw i18n.phonenumbers.Error.INVALID_COUNTRY_CODE;
  }

  /** @type {i18n.phonenumbers.PhoneNumber} */
  var phoneNumber = new i18n.phonenumbers.PhoneNumber();
  if (keepRawInput) {
    phoneNumber.setRawInput(numberToParse);
  }
  // Attempt to parse extension first, since it doesn't require region-specific
  // data and we want to have the non-normalised number here.
  /** @type {string} */
  var extension = this.maybeStripExtension(nationalNumber);
  if (extension.length > 0) {
    phoneNumber.setExtension(extension);
  }

  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var regionMetadata = this.getMetadataForRegion(defaultRegion);
  // Check to see if the number is given in international format so we know
  // whether this number is from the default region or not.
  /** @type {!goog.string.StringBuffer} */
  var normalizedNationalNumber = new goog.string.StringBuffer();
  /** @type {number} */
  var countryCode = 0;
  /** @type {string} */
  var nationalNumberStr = nationalNumber.toString();
  try {
    countryCode = this.maybeExtractCountryCode(nationalNumberStr,
        regionMetadata, normalizedNationalNumber, keepRawInput, phoneNumber);
  } catch (e) {
    if (e == i18n.phonenumbers.Error.INVALID_COUNTRY_CODE &&
        i18n.phonenumbers.PhoneNumberUtil.LEADING_PLUS_CHARS_PATTERN_
            .test(nationalNumberStr)) {
      // Strip the plus-char, and try again.
      nationalNumberStr = nationalNumberStr.replace(
          i18n.phonenumbers.PhoneNumberUtil.LEADING_PLUS_CHARS_PATTERN_, '');
      countryCode = this.maybeExtractCountryCode(nationalNumberStr,
          regionMetadata, normalizedNationalNumber, keepRawInput, phoneNumber);
      if (countryCode == 0) {
        throw e;
      }
    } else {
      throw e;
    }
  }
  if (countryCode != 0) {
    /** @type {string} */
    var phoneNumberRegion = this.getRegionCodeForCountryCode(countryCode);
    if (phoneNumberRegion != defaultRegion) {
      regionMetadata = this.getMetadataForRegionOrCallingCode_(
          countryCode, phoneNumberRegion);
    }
  } else {
    // If no extracted country calling code, use the region supplied instead.
    // The national number is just the normalized version of the number we were
    // given to parse.
    i18n.phonenumbers.PhoneNumberUtil.normalizeSB_(nationalNumber);
    normalizedNationalNumber.append(nationalNumber.toString());
    if (defaultRegion != null) {
      countryCode = regionMetadata.getCountryCodeOrDefault();
      phoneNumber.setCountryCode(countryCode);
    } else if (keepRawInput) {
      phoneNumber.clearCountryCodeSource();
    }
  }
  if (normalizedNationalNumber.getLength() <
      i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_) {
    throw i18n.phonenumbers.Error.TOO_SHORT_NSN;
  }

  if (regionMetadata != null) {
    /** @type {goog.string.StringBuffer} */
    var carrierCode = new goog.string.StringBuffer();
    this.maybeStripNationalPrefixAndCarrierCode(
        normalizedNationalNumber, regionMetadata, carrierCode);
    if (keepRawInput) {
      phoneNumber.setPreferredDomesticCarrierCode(carrierCode.toString());
    }
  }
  /** @type {string} */
  var normalizedNationalNumberStr = normalizedNationalNumber.toString();
  /** @type {number} */
  var lengthOfNationalNumber = normalizedNationalNumberStr.length;
  if (lengthOfNationalNumber <
      i18n.phonenumbers.PhoneNumberUtil.MIN_LENGTH_FOR_NSN_) {
    throw i18n.phonenumbers.Error.TOO_SHORT_NSN;
  }
  if (lengthOfNationalNumber >
      i18n.phonenumbers.PhoneNumberUtil.MAX_LENGTH_FOR_NSN_) {
    throw i18n.phonenumbers.Error.TOO_LONG;
  }
  if (normalizedNationalNumberStr.charAt(0) == '0') {
    phoneNumber.setItalianLeadingZero(true);
  }
  phoneNumber.setNationalNumber(parseInt(normalizedNationalNumberStr, 10));
  return phoneNumber;
};


/**
 * Converts numberToParse to a form that we can parse and write it to
 * nationalNumber if it is written in RFC3966; otherwise extract a possible
 * number out of it and write to nationalNumber.
 *
 * @param {?string} numberToParse number that we are attempting to parse. This
 *     can contain formatting such as +, ( and -, as well as a phone number
 *     extension.
 * @param {!goog.string.StringBuffer} nationalNumber a string buffer for storing
 *     the national significant number.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.buildNationalNumberForParsing_ =
    function(numberToParse, nationalNumber) {

  /** @type {number} */
  var indexOfPhoneContext = numberToParse.indexOf(
      i18n.phonenumbers.PhoneNumberUtil.RFC3966_PHONE_CONTEXT_);
  if (indexOfPhoneContext > 0) {
    var phoneContextStart = indexOfPhoneContext +
        i18n.phonenumbers.PhoneNumberUtil.RFC3966_PHONE_CONTEXT_.length;
    // If the phone context contains a phone number prefix, we need to capture
    // it, whereas domains will be ignored.
    if (numberToParse.charAt(phoneContextStart) ==
        i18n.phonenumbers.PhoneNumberUtil.PLUS_SIGN) {
      // Additional parameters might follow the phone context. If so, we will
      // remove them here because the parameters after phone context are not
      // important for parsing the phone number.
      var phoneContextEnd = numberToParse.indexOf(';', phoneContextStart);
      if (phoneContextEnd > 0) {
        nationalNumber.append(numberToParse.substring(phoneContextStart,
            phoneContextEnd));
      } else {
        nationalNumber.append(numberToParse.substring(phoneContextStart));
      }
    }

    // Now append everything between the "tel:" prefix and the phone-context.
    // This should include the national number, an optional extension or
    // isdn-subaddress component.
    nationalNumber.append(numberToParse.substring(
        numberToParse.indexOf(
            i18n.phonenumbers.PhoneNumberUtil.RFC3966_PREFIX_) +
        i18n.phonenumbers.PhoneNumberUtil.RFC3966_PREFIX_.length,
        indexOfPhoneContext));
  } else {
    // Extract a possible number from the string passed in (this strips leading
    // characters that could not be the start of a phone number.)
    nationalNumber.append(
        i18n.phonenumbers.PhoneNumberUtil.extractPossibleNumber(numberToParse));
  }

  // Delete the isdn-subaddress and everything after it if it is present.
  // Note extension won't appear at the same time with isdn-subaddress
  // according to paragraph 5.3 of the RFC3966 spec,
  /** @type {string} */
  var nationalNumberStr = nationalNumber.toString();
  var indexOfIsdn = nationalNumberStr.indexOf(
      i18n.phonenumbers.PhoneNumberUtil.RFC3966_ISDN_SUBADDRESS_);
  if (indexOfIsdn > 0) {
    nationalNumber.clear();
    nationalNumber.append(nationalNumberStr.substring(0, indexOfIsdn));
  }
  // If both phone context and isdn-subaddress are absent but other
  // parameters are present, the parameters are left in nationalNumber. This
  // is because we are concerned about deleting content from a potential
  // number string when there is no strong evidence that the number is
  // actually written in RFC3966.
};


/**
 * Takes two phone numbers and compares them for equality.
 *
 * <p>Returns EXACT_MATCH if the country_code, NSN, presence of a leading zero
 * for Italian numbers and any extension present are the same. Returns NSN_MATCH
 * if either or both has no region specified, and the NSNs and extensions are
 * the same. Returns SHORT_NSN_MATCH if either or both has no region specified,
 * or the region specified is the same, and one NSN could be a shorter version
 * of the other number. This includes the case where one has an extension
 * specified, and the other does not. Returns NO_MATCH otherwise. For example,
 * the numbers +1 345 657 1234 and 657 1234 are a SHORT_NSN_MATCH. The numbers
 * +1 345 657 1234 and 345 657 are a NO_MATCH.
 *
 * @param {i18n.phonenumbers.PhoneNumber|string} firstNumberIn first number to
 *     compare. If it is a string it can contain formatting, and can have
 *     country calling code specified with + at the start.
 * @param {i18n.phonenumbers.PhoneNumber|string} secondNumberIn second number to
 *     compare. If it is a string it can contain formatting, and can have
 *     country calling code specified with + at the start.
 * @return {i18n.phonenumbers.PhoneNumberUtil.MatchType} NOT_A_NUMBER, NO_MATCH,
 *     SHORT_NSN_MATCH, NSN_MATCH or EXACT_MATCH depending on the level of
 *     equality of the two numbers, described in the method definition.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isNumberMatch =
    function(firstNumberIn, secondNumberIn) {

  // If the input arguements are strings parse them to a proto buffer format.
  // Else make copies of the phone numbers so that the numbers passed in are not
  // edited.
  /** @type {i18n.phonenumbers.PhoneNumber} */
  var firstNumber;
  /** @type {i18n.phonenumbers.PhoneNumber} */
  var secondNumber;
  if (typeof firstNumberIn == 'string') {
    // First see if the first number has an implicit country calling code, by
    // attempting to parse it.
    try {
      firstNumber = this.parse(
          firstNumberIn, i18n.phonenumbers.PhoneNumberUtil.UNKNOWN_REGION_);
    } catch (e) {
      if (e != i18n.phonenumbers.Error.INVALID_COUNTRY_CODE) {
        return i18n.phonenumbers.PhoneNumberUtil.MatchType.NOT_A_NUMBER;
      }
      // The first number has no country calling code. EXACT_MATCH is no longer
      // possible. We parse it as if the region was the same as that for the
      // second number, and if EXACT_MATCH is returned, we replace this with
      // NSN_MATCH.
      if (typeof secondNumberIn != 'string') {
        /** @type {string} */
        var secondNumberRegion = this.getRegionCodeForCountryCode(
            secondNumberIn.getCountryCodeOrDefault());
        if (secondNumberRegion !=
            i18n.phonenumbers.PhoneNumberUtil.UNKNOWN_REGION_) {
          try {
            firstNumber = this.parse(firstNumberIn, secondNumberRegion);
          } catch (e2) {
            return i18n.phonenumbers.PhoneNumberUtil.MatchType.NOT_A_NUMBER;
          }
          /** @type {i18n.phonenumbers.PhoneNumberUtil.MatchType} */
          var match = this.isNumberMatch(firstNumber, secondNumberIn);
          if (match ==
              i18n.phonenumbers.PhoneNumberUtil.MatchType.EXACT_MATCH) {
            return i18n.phonenumbers.PhoneNumberUtil.MatchType.NSN_MATCH;
          }
          return match;
        }
      }
      // If the second number is a string or doesn't have a valid country
      // calling code, we parse the first number without country calling code.
      try {
        firstNumber = this.parseHelper_(firstNumberIn, null, false, false);
      } catch (e2) {
        return i18n.phonenumbers.PhoneNumberUtil.MatchType.NOT_A_NUMBER;
      }
    }
  } else {
    firstNumber = firstNumberIn.clone();
  }
  if (typeof secondNumberIn == 'string') {
    try {
      secondNumber = this.parse(
          secondNumberIn, i18n.phonenumbers.PhoneNumberUtil.UNKNOWN_REGION_);
      return this.isNumberMatch(firstNumberIn, secondNumber);
    } catch (e) {
      if (e != i18n.phonenumbers.Error.INVALID_COUNTRY_CODE) {
        return i18n.phonenumbers.PhoneNumberUtil.MatchType.NOT_A_NUMBER;
      }
      return this.isNumberMatch(secondNumberIn, firstNumber);
    }
  } else {
    secondNumber = secondNumberIn.clone();
  }
  // First clear raw_input, country_code_source and
  // preferred_domestic_carrier_code fields and any empty-string extensions so
  // that we can use the proto-buffer equality method.
  firstNumber.clearRawInput();
  firstNumber.clearCountryCodeSource();
  firstNumber.clearPreferredDomesticCarrierCode();
  secondNumber.clearRawInput();
  secondNumber.clearCountryCodeSource();
  secondNumber.clearPreferredDomesticCarrierCode();
  if (firstNumber.hasExtension() && firstNumber.getExtension().length == 0) {
    firstNumber.clearExtension();
  }
  if (secondNumber.hasExtension() && secondNumber.getExtension().length == 0) {
    secondNumber.clearExtension();
  }

  // Early exit if both had extensions and these are different.
  if (firstNumber.hasExtension() && secondNumber.hasExtension() &&
      firstNumber.getExtension() != secondNumber.getExtension()) {
    return i18n.phonenumbers.PhoneNumberUtil.MatchType.NO_MATCH;
  }
  /** @type {number} */
  var firstNumberCountryCode = firstNumber.getCountryCodeOrDefault();
  /** @type {number} */
  var secondNumberCountryCode = secondNumber.getCountryCodeOrDefault();
  // Both had country_code specified.
  if (firstNumberCountryCode != 0 && secondNumberCountryCode != 0) {
    if (firstNumber.equals(secondNumber)) {
      return i18n.phonenumbers.PhoneNumberUtil.MatchType.EXACT_MATCH;
    } else if (firstNumberCountryCode == secondNumberCountryCode &&
        this.isNationalNumberSuffixOfTheOther_(firstNumber, secondNumber)) {
      // A SHORT_NSN_MATCH occurs if there is a difference because of the
      // presence or absence of an 'Italian leading zero', the presence or
      // absence of an extension, or one NSN being a shorter variant of the
      // other.
      return i18n.phonenumbers.PhoneNumberUtil.MatchType.SHORT_NSN_MATCH;
    }
    // This is not a match.
    return i18n.phonenumbers.PhoneNumberUtil.MatchType.NO_MATCH;
  }
  // Checks cases where one or both country_code fields were not specified. To
  // make equality checks easier, we first set the country_code fields to be
  // equal.
  firstNumber.setCountryCode(0);
  secondNumber.setCountryCode(0);
  // If all else was the same, then this is an NSN_MATCH.
  if (firstNumber.equals(secondNumber)) {
    return i18n.phonenumbers.PhoneNumberUtil.MatchType.NSN_MATCH;
  }
  if (this.isNationalNumberSuffixOfTheOther_(firstNumber, secondNumber)) {
    return i18n.phonenumbers.PhoneNumberUtil.MatchType.SHORT_NSN_MATCH;
  }
  return i18n.phonenumbers.PhoneNumberUtil.MatchType.NO_MATCH;
};


/**
 * Returns true when one national number is the suffix of the other or both are
 * the same.
 *
 * @param {i18n.phonenumbers.PhoneNumber} firstNumber the first PhoneNumber
 *     object.
 * @param {i18n.phonenumbers.PhoneNumber} secondNumber the second PhoneNumber
 *     object.
 * @return {boolean} true if one PhoneNumber is the suffix of the other one.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.isNationalNumberSuffixOfTheOther_ =
    function(firstNumber, secondNumber) {

  /** @type {string} */
  var firstNumberNationalNumber = '' + firstNumber.getNationalNumber();
  /** @type {string} */
  var secondNumberNationalNumber = '' + secondNumber.getNationalNumber();
  // Note that endsWith returns true if the numbers are equal.
  return goog.string.endsWith(firstNumberNationalNumber,
                              secondNumberNationalNumber) ||
         goog.string.endsWith(secondNumberNationalNumber,
                              firstNumberNationalNumber);
};


/**
 * Returns true if the number can be dialled from outside the region, or
 * unknown. If the number can only be dialled from within the region, returns
 * false. Does not check the number is a valid number.
 * TODO: Make this method public when we have enough metadata to make it
 * worthwhile. Currently visible for testing purposes only.
 *
 * @param {i18n.phonenumbers.PhoneNumber} number the phone-number for which we
 *     want to know whether it is diallable from outside the region.
 * @return {boolean} true if the number can only be dialled from within the
 *     country.
 */
i18n.phonenumbers.PhoneNumberUtil.prototype.canBeInternationallyDialled =
    function(number) {
  /** @type {?string} */
  var regionCode = this.getRegionCodeForNumber(number);
  if (!this.isValidRegionCode_(regionCode)) {
    // Note numbers belonging to non-geographical entities (e.g. +800 numbers)
    // are always internationally diallable, and will be caught here.
    return true;
  }
  /** @type {i18n.phonenumbers.PhoneMetadata} */
  var metadata = this.getMetadataForRegion(regionCode);
  /** @type {string} */
  var nationalSignificantNumber = this.getNationalSignificantNumber(number);
  return !this.isNumberMatchingDesc_(nationalSignificantNumber,
                                     metadata.getNoInternationalDialling());
};


/**
 * Check whether the entire input sequence can be matched against the regular
 * expression.
 *
 * @param {!RegExp|string} regex the regular expression to match against.
 * @param {string} str the string to test.
 * @return {boolean} true if str can be matched entirely against regex.
 * @private
 */
i18n.phonenumbers.PhoneNumberUtil.matchesEntirely_ = function(regex, str) {
  /** @type {Array.<string>} */
  var matchedGroups = (typeof regex == 'string') ?
      str.match('^(?:' + regex + ')$') : str.match(regex);
  if (matchedGroups && matchedGroups[0].length == str.length) {
    return true;
  }
  return false;
};
