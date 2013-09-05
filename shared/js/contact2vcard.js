'use strict';

var ContactToVcard;
var ContactToVcardBlob;

function ISODateString(d) {
  function pad(n) {
    return n < 10 ? '0' + n : n;
  }

  if (typeof d === 'string') { d = new Date(d); }

  return d.getUTCFullYear() + '-' +
    pad(d.getUTCMonth() + 1) + '-' +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + ':' +
    pad(d.getUTCMinutes()) + ':' +
    pad(d.getUTCSeconds()) + 'Z';
}

(function() {
  function blobToBase64(blob, cb) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      cb(base64);
    };
    reader.readAsDataURL(blob);
  }

  function fromContactField(sourceField, vcardField) {
    if (!sourceField || !sourceField.length)
      return [];

    var str = vcardField;
    return sourceField.map(function(field) {
      var types = [];
      if (field.type && field.type.length) {
        types = types.concat(field.type);
      }

      if (field.pref && field.pref === true) {
        types.push('pref');
      }

      if (types.length) {
        str += ';type=' + types.join(',');
      }

      return str + ':' + (field.value || '');
    });
  }

  function fromStringArray(sourceField, vcardField) {
    if (!sourceField)
      return '';

    return vcardField + ':' + sourceField.join(',');
  }

  function joinFields(fields) {
    return fields.filter(function(f) { return !!f; }).join('\n');
  }

  function toBlob(vcard) {
    return new Blob([vcard], {'type': 'text/vcard'});
  }

  ContactToVcardBlob = function(contacts, callback) {
    ContactToVcard(contacts, function onVcard(vcard) {
      vcard = vcard ? toBlob(vcard) : null;
      callback(toBlob(vcard));
    });
  };

  ContactToVcard = function(ctArray, callback) {
    var numContacts = ctArray.length;
    var processed = 0;
    var vcardString = '';

    function appendVcard(vcard) {
      processed += 1;
      if (vcard)
        vcardString += vcard + '\n';

      if (numContacts === processed) {
        if (!vcardString || /^\s+$/.test(vcardString))
          callback(null);
        else
          callback(vcardString);
      }
    }

    ctArray.forEach(function(ct) {
      if (navigator.mozContact && !(ct instanceof navigator.mozContact)) {
        console.error('An instance of mozContact was expected');
        appendVcard(null);
        return;
      }

      var n = 'n:' + ([
        ct.familyName,
        ct.givenName,
        ct.additionalName,
        ct.honorificPrefix,
        ct.honorificSuffix
      ].map(function(f) {
        f = f || [''];
        return f.join(',') + ';';
      }).join(''));

      // vCard standard does not accept contacts without 'n' or 'fn fields.
      if (n === 'n:;;;;;' || !ct.name) {
        appendVcard(null);
        return;
      }

      var allFields = [
        n,
        fromStringArray(ct.name, 'fn'),
        fromStringArray(ct.nickname, 'nickname'),
        fromStringArray(ct.category, 'category'),
        fromStringArray(ct.org, 'org'),
        fromStringArray(ct.jobTitle, 'title'),
        fromStringArray(ct.note, 'note'),
        fromStringArray(ct.key, 'key')
      ];

      if (ct.bday) {
        allFields.push('bday:' + ISODateString(ct.bday));
      }

      allFields.push.apply(allFields, fromContactField(ct.email, 'email'));
      allFields.push.apply(allFields, fromContactField(ct.url, 'url'));
      allFields.push.apply(allFields, fromContactField(ct.tel, 'tel'));

      var adrs = fromContactField(ct.adr, 'adr');
      allFields.push.apply(allFields, adrs.map(function(adrStr, i) {
        var orig = ct.adr[i];
        return adrStr + (['', '', orig.streetAddress || '', orig.locality ||
                         '', orig.region || '', orig.postalCode || '',
                         orig.countryName || ''].join(';'));
      }));

      if (ct.photo && ct.photo.length) {
        var photoStr = 'photo:';
        var blob = ct.photo[0];
        var mime = blob.type;
        blobToBase64(blob, function(b64) {
          var finalStr = 'data:' + mime + ';base64,' + b64;
          allFields.push(photoStr + finalStr);
          appendVcard(joinFields(allFields));
        });
      } else {
        appendVcard(joinFields(allFields));
      }
    });
  };
})();
