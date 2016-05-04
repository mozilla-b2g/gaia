define(function() {
  'use strict';
  // Some sites may not get URI encoding correct, so this protects
  // us from completely failing in those cases.
  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch (err) {
      console.error('Skipping "' + value +
                    '", decodeURIComponent error: ' + err);
      return '';
    }
  }

  function queryURI(uri) {
    function addressesToArray(addresses) {
      if (!addresses) {
        return [];
      }
      addresses = addresses.split(/[,;]/);
      var addressesArray = addresses.filter(function notEmpty(addr) {
        return addr.trim() !== '';
      });
      return addressesArray;
    }
    var mailtoReg = /^mailto:(.*)/i;
    var obj = {};

    if (uri && uri.match(mailtoReg)) {
      uri = uri.match(mailtoReg)[1];
      var parts = uri.split('?');
      var subjectReg = /(?:^|&)subject=([^\&]*)/i,
      bodyReg = /(?:^|&)body=([^\&]*)/i,
      ccReg = /(?:^|&)cc=([^\&]*)/i,
      bccReg = /(?:^|&)bcc=([^\&]*)/i;
      // Check if the 'to' field is set and properly decode it
      obj.to = parts[0] ? addressesToArray(decode(parts[0])) : [];

      if (parts.length == 2) {
        var data = parts[1];
        if (data.match(subjectReg)) {
          obj.subject = decode(data.match(subjectReg)[1]);
        }
        if (data.match(bodyReg)) {
          obj.body = decode(data.match(bodyReg)[1]);
        }
        if (data.match(ccReg)) {
          obj.cc = addressesToArray(decode(data.match(ccReg)[1]));
        }
        if (parts[1].match(bccReg)) {
          obj.bcc = addressesToArray(decode(data.match(bccReg)[1]));
        }
      }
    }

    return obj;
  }

  return queryURI;
});
