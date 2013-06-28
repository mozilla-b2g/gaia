(function() {
'use strict';
/*
 The LinkHelper exposes functionality to apply the regexp
 on the input strings and replace them with corresponding
 anchor links for url, phone, email.
*/

// ensure that each part of the domain is long enough
function checkDomain(domain) {
  return domain.split('.').every(function(part) {
    return part.length > 1;
  });
}

// these arguments should stay in sync with the regexp
function urlReplacer(match, delimiter, proto, server, tld, port, query) {
  if (!checkDomain(server + tld)) {
    return match;
  }

  // chop the first characters matched by delimiter out of the url
  var url = match.substr(delimiter.length);
  var href = url;

  // if there is no proto, add http:// to the href
  if (!proto) {
    href = 'http://' + href;
  }

  // add the delimiter back in because this is a replacer
  return delimiter +
    '<a data-url="' + href + '" data-action="url-link" >' + url + '</a>';
}

var LinkHelper = window.LinkHelper = {
  _urlRegex: new RegExp([
      '(^|\\s|,|;|<br>)',                 // right before
      '(https?://)?',                     // [protocol]
      '([-\\w\\.]{2,256})',               // server name
      '(\\.[-\\w\\.]{2,})',               // .tld
      '(:[0-9]{2,5})?',                   // [:port]
      '(\\/[-\\w:%\\+~#?;&//=]*)?',       // [queries]
      '(?:\\.[\\w]+)?'                    // [to avoid ending dot]
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
