/* global mozContact, oauthflow, ImportStatusData */
'use strict';

var utils = window.utils || {};

// Scale ratio for different devices
var SCALE_RATIO = window.devicePixelRatio || 1;

var LAST_IMPORT_TIMESTAMP_SUFFIX = '_last_import_timestamp';

function scale(size) {
  return Math.round(SCALE_RATIO * size);
}

if (!utils.misc) {
  utils.misc = {};
  utils.misc.toMozContact = function(contact) {
    var outContact = contact;
    if (!(contact instanceof mozContact)) {
      outContact = new mozContact(contact);
      outContact.id = contact.id || outContact.id;
    }

    return outContact;
  };

  // This year indicates that the year can be ignored
  const FLAG_YEAR_IGNORED = 9996;
  utils.misc.FLAG_YEAR_IGNORED = FLAG_YEAR_IGNORED;

  utils.misc.formatDate = function(date) {
    var _ = navigator.mozL10n.get;

    var dateFormat = _('dateFormat') || '%B %e';
    var f = new navigator.mozL10n.DateTimeFormat();
    var dateString = null;
    try {
      var offset = date.getTimezoneOffset() * 60 * 1000;
      var normalizedDate = new Date(date.getTime() + offset);

      var year = normalizedDate.getFullYear();
      if (year === FLAG_YEAR_IGNORED) {
        year = '';
      }
      var dayMonthString = f.localeFormat(normalizedDate, dateFormat);
      dateString = _('dateOutput', {
        dayMonthFormatted: dayMonthString,
        year: year
      });
    } catch (err) {
      console.error('Error parsing date: ', err);
      throw err;
    }

    return dateString;
  };

  // Parses a name to obtain a givenName and a familyName
  // This is useful while importing contacts from SIM card
  utils.misc.parseName = function(nameString) {
    // Minimum length to consider a token as significative
    var MIN_LENGHT_SIGNIFICATIVE = 3;
    // Minimum length of a token to consider it a familyName
    var MIN_LENGHT_FN = 2;

    var out = {
      givenName: '',
      familyName: ''
    };

    if (!nameString) {
      return out;
    }
    var str = nameString.trim();
    if (!str) {
      return out;
    }

    function startsWithUpper(str) {
      var firstLetter = str.charAt(0);
      var capFirstLetter = firstLetter.toLocaleUpperCase();

      return (capFirstLetter === firstLetter);
    }

    // First step of the algorithm is to split the name in its tokens
    var tokens = nameString.split(/\s+/);
    var significativeTokens = {};
    for (var j = 0; j < tokens.length; j++) {
      var token = tokens[j];
      // A significative token os one with that min length and which starts with
      // uppercase letter
      if (token.length > MIN_LENGHT_SIGNIFICATIVE || startsWithUpper(token)) {
        significativeTokens[token] = true;
      }
    }

    var totalTokens = tokens.length;
    var lastToken = totalTokens - 1;
    var rolePrevToken;
    var remainingTokens = Object.keys(significativeTokens).length;
    var outGivenNames = [], outFamilyNames = [];
    // We need to keep the totals in a different variable as a familyName
    // can be composed by more than one token
    var numFns = 0;

    while (lastToken >= 0) {
      if (significativeTokens[tokens[lastToken]]) {
        remainingTokens--;
      }

      var currToken = tokens[lastToken],
          nextToken = tokens[lastToken + 1],
          prevToken = tokens[lastToken - 1];

      // The last element is taken as part of the family name
      if (!nextToken && prevToken) {
          outFamilyNames.push(currToken);
          numFns++;
          rolePrevToken = 'FN';
      }
      else if (!prevToken) {
        outGivenNames.push(currToken);
        rolePrevToken = 'GN';
      }
      else if (nextToken) {
        if (!significativeTokens[currToken]) {
          if (rolePrevToken === 'FN') {
            // Here the number of fns is not incremented as this is a non
            // significative token
            outFamilyNames.push(currToken);
          }
          else {
            outGivenNames.push(currToken);
          }
        }
        else if (currToken.length < MIN_LENGHT_FN) {
          outGivenNames.push(currToken);
          rolePrevToken = 'GN';
        }
        else {
          // Number of familyNames will be two at most
          // Preference is given to the givenName over familyName
          // We prefer two givenNames instead of two family Names
          if (remainingTokens >= 2 && numFns < 2) {
            outFamilyNames.push(currToken);
            numFns++;
            rolePrevToken = 'FN';
          }
          else {
            outGivenNames.push(currToken);
            rolePrevToken = 'GN';
          }
        }
      }

      lastToken--;
    }

    out.givenName = outGivenNames.reverse().join(' ').trim();
    out.familyName = outFamilyNames.reverse().join(' ').trim();

    return out;
  };

  utils.misc.getPreferredPictureBox = function() {
    var imgThumbSize = oauthflow.params.facebook.imgThumbSize;
    var out = {
      width: scale(imgThumbSize)
    };

    out.height = out.width;

    return out;
  };

  utils.misc.getPreferredPictureDetail = function() {
    var imgDetailWidth = oauthflow.params.facebook.imgDetailWidth;
    return scale(imgDetailWidth);
  };

  utils.misc.setTimestamp = function(type, callback) {
    ImportStatusData.put(type + LAST_IMPORT_TIMESTAMP_SUFFIX, Date.now())
        .then(callback);
  };

  utils.misc.getTimestamp = function(type, callback) {
    ImportStatusData.get(type + LAST_IMPORT_TIMESTAMP_SUFFIX)
        .then(callback);
  };
}
