/*global Utils */

(function() {
'use strict';
/*
 The LinkHelper exposes functionality to apply the regexp
 on the input strings and replace them with corresponding
 anchor links for url, phone, email.
*/

var KNOWN_TLDS = [
  'aero', 'asia', 'biz', 'cat', 'com', 'coop', 'info',
  'int', 'jobs', 'mobi', 'museum', 'name', 'net', 'org', 'post', 'pro',
  'tel', 'travel', 'xxx', 'edu', 'gov', 'mil', 'nyc', 'ac',
  'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'an', 'ao', 'aq', 'ar',
  'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf',
  'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bv',
  'no', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci',
  'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cs', 'cu', 'cv', 'cx', 'cy',
  'cz', 'dd', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg',
  'eh', 'er', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr',
  'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn',
  'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn',
  'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir',
  'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km',
  'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk',
  'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mg',
  'mh', 'mk', 'ml', 'mm', 'mn', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms',
  'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf',
  'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe',
  'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw',
  'py', 'qa', 're', 'ro', 'rs', 'ru', 'su', 'рф', 'rw', 'sa', 'sb',
  'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'no', 'sk', 'sl', 'sm',
  'sn', 'so', 'sr', 'ss', 'st', 'su', 'sv', 'sx', 'sy', 'sz', 'tc',
  'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tp', 'tm', 'tn', 'to',
  'tp', 'tl', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'us',
  'gov', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf',
  'ws', 'ye', 'yt', 'yu', 'za', 'zm', 'zw'
];

var ipv4part = '(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';
var ipv4RegExp = new RegExp('^(?:' + ipv4part + '\\.){3}' + ipv4part + '$');

// ensure that each part of the domain is long enough
function checkDomain(domain) {
  // Check for a specific IPv4 address
  if (ipv4RegExp.test(domain)) {
    return true;
  } else {
    // Don't add many restrictions,
    // just the tld to be non numeric and length > 1
    var parts = domain.split('.');
    var lastPart = parts[parts.length - 1];
    // We want the last part not to be a number
    return lastPart.length > 1 && !isFinite(lastPart);
  }
}

// defines things that can match right before to be a "safe" link
var safeStart = /[\s,:;\(>]/;

const MINIMUM_DIGITS_IN_PHONE_NUMBER = 5;

/**
 * For each category of links:
 * The key is the link type
 * order matters - defined first means higher priority if two matches equal
 *
 *   regexp: The regular expression to match potential links
 *   matchFilter: (optional) A function that is passed the matched part, and
 *                the linkSpec.
 *                Should return the linkSpec, or false if not to be matched
 *   transform: A function that converts the match data to a html link string
 *              Is passed the matched part and the linkSpec.
 */
var LINK_TYPES = {
  phone: {
    regexp: new RegExp([
      // sddp: space, dot, dash or parens
      '(?:\\+\\d{1,4}[ \\t.()-]{0,3}|\\()?' +     // (\+<digits><sddp>|\()?
      '(?:\\d{1,4}[ \\t.()-]{0,3})?' +            // <digits><sdd>*
      '(?:\\d[\\d \\t.()-]{0,12}\\d)' +           // <digit><digit|sddp>*<digit>
      '\\b'                                       // must end on a word boundary
      ].join(''), 'g'),
    matchFilter: function phoneMatchFilter(phone, link) {
      var onlyDigits = Utils.removeNonDialables(phone);

      if (onlyDigits.length < MINIMUM_DIGITS_IN_PHONE_NUMBER) {
        return false;
      }
      if (onlyDigits.length === MINIMUM_DIGITS_IN_PHONE_NUMBER &&
        phone.length !== onlyDigits.length) {
        return false;
      }
      return link;
    },
    transform: function phoneTransform(phone, link) {
      return '<a data-dial="' + phone +
        '" data-action="dial-link">' + phone + '</a>';
    }
  },

  url: {
    regexp: new RegExp([
      // must begin at start of string, after whitespace,
      // {1} match the protocol https?:// (optional)
      '(https?://)?',
      // {2} match "server name": . must be followed by at least one letter
      '((?:\\.?[-\\w]){1,256})',
      // {3} match a . followed by one or more domain valid chars
      '(\\.\\w{1,10})',
      // optional :port
      '(?::[0-9]{1,5})?',
      // start the "query" capture group by matching an optional dot then /
      '(?:\\.?/',
        // anything other than a sentence ender
        // a sentence ender not followed by whitespace
        // match 0 - 2048 characters in the url
        '(?:[^\\s.,?:;!]|[.,?:;!](?!\\s|$)){0,2048}',
      // end the "query" capture group (optional)
      ')?'
      ].join(''), 'mgi'),
    matchFilter: function urlMatchFilter(url, linkSpec) {
      var match = linkSpec.match;
      var scheme, tld;

      if (!checkDomain(match[2] + match[3])) {
        return false;
      }

      scheme = match[1];
      tld = match[3] && match[3].slice(1);

      // For Cases where:
      //
      //  1. There was no scheme (eg, "http", "https")
      //  2. The matched tld is not a number
      //  3. The matched tld is not a known tld
      //
      // ... Do not create a clickable link
      if (!scheme && (!isFinite(tld) && KNOWN_TLDS.indexOf(tld) === -1)) {
        return false;
      }

      // strip a trailing ) if there isn't a ( in the url
      if (url.slice(-1) === ')' && url.indexOf('(') === -1) {
        linkSpec.end--;
      }
      return linkSpec;
    },
    transform: function urlTransform(url, linkSpec) {
      var href = url;
      if (!linkSpec.match[1]) {
        href = 'http://' + href;
      }
      return '<a data-url="' + href + '" data-action="url-link" >' + url +
             '</a>';
    }
  },

  email: {
    regexp: /[\w.+-]+@[\w.-]+\.[a-z.]{2,6}/mgi,
    transform: function emailTransform(email) {
      return [
        '<a data-email="',
        '" data-action="email-link">',
        '</a>'
      ].join(email);
    }
  }
};

var LINK_TYPES_KEYS = Object.keys(LINK_TYPES);

function searchForLinks(type, string) {
  var linkSpecs = [];
  var spec = LINK_TYPES[type];

  if (!spec) {
    return linkSpecs;
  }

  var regexp = spec.regexp;
  var matchFilter = spec.matchFilter;
  var match, linkSpec;

  // while we match stuff...
  while ((match = regexp.exec(string))) {

    // if the match isn't at the begining of the string, check for a safe
    // character before the match

    var rest = string.slice(match.index - 1);
    if (match.index && !safeStart.test(rest.charAt(0))) {

      // we should only advance the regexp to the next safeStart
      var nextSafe = safeStart.exec(rest);
      if (nextSafe) {
        regexp.lastIndex = match.index + nextSafe.index;
      }
      continue;
    }

    linkSpec = {
      type: type,
      start: match.index,
      length: match[0].length,
      end: match.index + match[0].length,
      match: match
    };

    if (matchFilter) {
      linkSpec = matchFilter(match[0], linkSpec);
    }

    if (linkSpec) {
      linkSpecs.push(linkSpec);
    }
  }

  return linkSpecs;
}

function linkSort(a, b) {
  // sort by starting position first
  // then by ending position reversed
  // then by the order of the type in the LINK_TYPES
  return (a.start - b.start) ||
    (b.end - a.end) ||
    (LINK_TYPES_KEYS.indexOf(a.type) - LINK_TYPES_KEYS.indexOf(b.type));
}

function removeOverlapping(linkSpecs) {
  linkSpecs.sort(linkSort);
  for (var index = 0; index < linkSpecs.length - 1; index++) {
    var end = linkSpecs[index].end;
    // while there are more linkSpecs, and they start before we end remove the
    // overlapping matches
    while (linkSpecs[index + 1] && linkSpecs[index + 1].start < end) {
      linkSpecs.splice(index + 1, 1);
    }
  }
}

var LinkHelper = window.LinkHelper = {
  searchAndLinkUrl: function lh_searchAndLinkUrl(inputText) {
    return LinkHelper.searchAndLinkClickableData(inputText, { url: true });
  },
  searchAndLinkEmail: function lh_searchAndLinkEmail(inputText) {
    return LinkHelper.searchAndLinkClickableData(inputText, { email: true });
  },
  searchAndLinkPhone: function lh_searchAndLinkPhone(inputText) {
    return LinkHelper.searchAndLinkClickableData(inputText, { phone: true });
  },
  // Invokes resepective functions to change url, phone and email strings
  // and make them active links
  // |inputText| should be already html escaped
  searchAndLinkClickableData:
    function lh_searchAndLinkClickableData(inputText, mode) {
    // default is everything enabled
    mode = mode || LINK_TYPES;

    var linkSpecs = [];
    var type;

    for (type in mode) {
      if (mode[type] && LINK_TYPES[type]) {
        linkSpecs = linkSpecs.concat(searchForLinks(type, inputText));
      }
    }

    removeOverlapping(linkSpecs);

    var result = '';
    var lastEnd = 0;

    linkSpecs.forEach(function replaceLink(link) {
      result += inputText.slice(lastEnd, link.start);

      var replacing = inputText.slice(link.start, link.end);
      var replaceWith = LINK_TYPES[link.type].transform(replacing, link);
      result += replaceWith;
      lastEnd = link.end;
    });

    result += inputText.slice(lastEnd);

    return result;
  }
};

})();
