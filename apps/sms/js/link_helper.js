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
  return parts.slice(-1)[0].length > 1 ||
    parts.length === 4 && parts.every(function(part) {
      return part > 0 && part < 256;
    });
}

// these arguments should stay in sync with the regexp
function urlReplacer(match, delimiter, proto, server, tld, port, query) {
  if (!checkDomain(server + tld)) {
    return match;
  }

  // chop the first characters matched by delimiter out of the url
  var trailing = '';
  var url = match.substr(delimiter.length);

  // only allow a ) at the end if there is a ( in the url
  if (url.slice(-1) === ')' && url.indexOf('(') === -1) {
    trailing = ')';
    url = url.slice(0, -1);
  }
  var href = url;

  // if there is no proto, add http:// to the href
  if (!proto) {
    href = 'http://' + href;
  }

  // add the delimiter back in because this is a replacer
  return delimiter +
    '<a data-url="' + href + '" data-action="url-link" >' + url + '</a>' +
    trailing;
}

var LinkHelper = window.LinkHelper = {
  _urlRegex: new RegExp([
      // must begin at start of string, after whitespace,
      // comma, semicolon, br or (
      '(^|\\s|,|;|<br>|\\()',
      // match the protocol https?:// (optional)
      '(https?://)?',
      // match "server name": . must be followed by at least one letter
      '((?:\\.?[-\\w]){1,256})',
      // match a . followed by one or more domain valid chars
      '(\\.\\w{1,10})',
      // optional :port
      '(:[0-9]{1,5})?',
      // start the "query" capture group by matching an optional dot then /
      '(\\.?/',
        // anything other than a whitespace or dot
        // or a . not followed by whitespace
        '([^\\s.]|.(?!\\s))',
        // match 0 - 2048 characters in the url
        '{0,2048}',
      // end the "query" capture group (optional)
      ')?'
      ].join(''), 'mgi'),
  _emailRegex: /([\w\.\+-]+)@([\w\.-]+)\.([a-z\.]{2,6})/mgi,
  _phoneRegex: new RegExp(['(\\+?1?[-.]?\\(?([0-9]{3})\\)?',
    '[-.]?)?([0-9]{3})[-.]?([0-9]{4})([0-9]{1,4})?'].
    join(''), 'mg'),

  searchAndLinkUrl: function lh_searchAndLinkUrl(urltext) {
    return urltext.replace(this._urlRegex, urlReplacer);
  },
  searchAndLinkEmail: function lh_searchAndLinkEmail(body) {
    return body.replace(this._emailRegex,
      function lh_processedEmail(email) {
        return [
          '<a data-email="',
          '" data-action="email-link">',
          '</a>'
        ].join(email);
      });
  },
  searchAndLinkPhone:
  function lh_searchAndLinkPhone(phonetext) {
    return phonetext.replace(this._phoneRegex,
    function lh_processedPhone(phone) {
      return [
        '<a data-phonenumber="',
        '" data-action="phone-link">',
        '</a>'
      ].join(phone);
     });
  },
  //Invokes resepective functions to change URL
  //phone and email strings and make them active links
  searchAndLinkClickableData:
   function lh_searchAndLinkClickableData(inputText) {
    inputText = this.searchAndLinkPhone(inputText);
    inputText = this.searchAndLinkEmail(inputText);
    return this.searchAndLinkUrl(inputText);
  }
};

})();
