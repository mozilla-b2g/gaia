'use strict';
/*
 The LinkHelper exposes functionality to apply the regexp
 on the input strings and replace them with corresponding
 anchor links for url, phone, email.
*/

var LinkHelper = {
  _urlRegex: new RegExp(['(^|\\s|,|;)[-\\w:%\\+.~#?&//=]{2,256}',
    '\\.[a-z]{2,6}(?:\\/[-\\w:%\\+.~#?&//=]*)?'].
    join(''), 'mgi'),
  _emailRegex: /([\w\.-]+)@([\w\.-]+)\.([a-z\.]{2,6})/mgi,
  _phoneRegex: new RegExp(['(\\+?1?[-.]?\\(?([0-9]{3})\\)?',
    '[-.]?)?([0-9]{3})[-.]?([0-9]{4})([0-9]{1,4})?'].
    join(''), 'mg'),

  searchAndLinkUrl:
  function lh_searchAndLinkUrl(urltext) {
    var result = urltext.replace(this._urlRegex,
       function lh_processedUrl(url, delimiter) {
      var linkText = '';

      //check if url has http(s) in beginning,if not append
      //http:// at beginning of the url
      var httpPrefix = url.match(/\bhttps?:\/\//gi) ? '' : 'http://';

      //Remove delimiters such as ' ', ',', ';' from beginning of the URL link
      //to handle delimiter separated multiple links such as www.abc.com;df.com
      url = url.replace(delimiter, '');

      linkText = delimiter + '<a href="#" data-url="' + httpPrefix +
                 url + '" data-action="url-link" >' +
                 url + '</a>';
      return linkText;
    });
    return result;
  },
  searchAndLinkEmail:
  function lh_searchAndLinkEmail(body) {
    return body.replace(this._emailRegex,
      function lh_processedEmail(email) {
        return [
          '<a href="#" data-email="',
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
        '<a href="#" data-phonenumber="',
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
