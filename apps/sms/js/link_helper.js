(function() {
'use strict';
/*
 The LinkHelper exposes functionality to apply the regexp
 on the input strings and replace them with corresponding
 anchor links for url, phone, email.
*/

// ensure that each part of the domain is long enough
function checkDomain(domain) {
  var parts = domain.split('.');
  // either the tld is more than one character or it is an IPv4
  return parts[parts.length - 1].length > 1 ||
    parts.length === 4 && parts.every(function(part) {
      return part >= 0 && part < 256;
    });
}

// defines things that can match right before to be a "safe" link
var safeStart = /(?:[\s.,;(]|<br>)$/;

/**
 * For each category of links:
 * Key: link type
 *   regexp: The regular expression to match potential links
 *   matchFilter: A function that takes the full string, followed by the match,
 *                should return a link object
 *   transform: A function that converts the match data to a html link string
 */
var LINK_TYPES = {
  phone: {
    regexp: new RegExp([
      '(\\+?1?[-.]?\\(?([0-9]{3})\\)?',
      '[-.]?)?([0-9]{3})[-.]?([0-9]{4})([0-9]{1,4})?'
      ].join(''), 'mg'),
    transform: function phoneTransform(phone) {
      return [
        '<a data-phonenumber="',
        '" data-action="phone-link">',
        '</a>'
      ].join(phone);
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
        // anything other than a whitespace or dot or comma
        // or a dot or comma not followed by whitespace
        // match 0 - 2048 characters in the url
        '(?:[^\\s.,]|(?:\\.|,)(?!\\s|$)){0,2048}',
      // end the "query" capture group (optional)
      ')?'
      ].join(''), 'mgi'),
    matchFilter: function urlMatchFilter(url, linkSpec) {
      var match = linkSpec.match;
      if (!checkDomain(match[2] + match[3])) {
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
    regexp: /([\w\.\+-]+)@([\w\.-]+)\.([a-z\.]{2,6})/mgi,
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
  while (match = regexp.exec(string)) {
    // if the match isn't at the begining of the string, check for a safe
    // character set before the match before we call it a linkSpec
    if (match.index && !safeStart.exec(string.slice(0, match.index))) {
      continue;
    }

    linkSpec = {
      type: type,
      start: match.index,
      length: match[0].length,
      end: match.index + match[0].length,
      match: Array.prototype.slice.call(match, 0)
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
  // sort by starting position first, then by ending position reversed
  return a.start - b.start || b.end - a.end ||
  // then by the order of the type in the LINK_TYPES
    LINK_TYPES_KEYS.indexOf(a.type) - LINK_TYPES_KEYS.indexOf(b.type);
}

function removeOverlapping(linkSpecs) {
  linkSpecs.sort(linkSort);
  for (var x = 0; x < linkSpecs.length - 1; x++) {
    var end = linkSpecs[x].end;
    // while there are more linkSpecs, and they start before we end remove the
    // overlapping matches
    while (linkSpecs[x + 1] && linkSpecs[x + 1].start < end) {
      linkSpecs.splice(x + 1, 1);
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
  //Invokes resepective functions to change URL
  //phone and email strings and make them active links
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

    var result = inputText;
    var offset = 0;
    linkSpecs.forEach(function replaceLink(link) {
      var before = result.slice(0, link.start + offset);
      var replacing = result.slice(link.start + offset, link.end + offset);
      var after = result.slice(link.end + offset);
      var replaceWith = LINK_TYPES[link.type].transform(replacing, link);
      offset += replaceWith.length - replacing.length;
      result = before + replaceWith + after;
    });

    return result;
  }
};

})();
