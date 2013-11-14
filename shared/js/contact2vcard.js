'use strict';

var ContactToVcard;
var ContactToVcardBlob;
var VCARD_MAP = {
  'fax': 'fax',
  'faxoffice': 'fax,work',
  'faxhome': 'fax,home',
  'faxother': 'fax',
  'home': 'home',
  'mobile': 'cell',
  'pager': 'pager',
  'personal': 'home',
  'pref': 'pref',
  'text': 'text',
  'textphone': 'textphone',
  'voice': 'voice',
  'work': 'work'
};
// Field list to be skipped on vcard
var VCARD_SKIP_FIELD = ['fb_profile_photo'];

function ISODateString(d) {
  function pad(n) {
    return n < 10 ? '0' + n : n;
  }

  if (typeof d === 'string') {
    d = new Date(d);
  }

  return d.getUTCFullYear() + '-' +
    pad(d.getUTCMonth() + 1) + '-' +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + ':' +
    pad(d.getUTCMinutes()) + ':' +
    pad(d.getUTCSeconds()) + 'Z';
}

(function() {
  var VCARD_VERSION = '4.0';
  var HEADER = 'BEGIN:VCARD\nVERSION:' + VCARD_VERSION + '\n';
  var FOOTER = 'END:VCARD\n';

  var VCARD_MAP = {
    'mobile': 'cell'
  };

  // Field list to be skipped on vcard
  var VCARD_SKIP_FIELD = ['fb_profile_photo'];

  function blobToBase64(blob, cb) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      cb(base64);
    };
    reader.readAsDataURL(blob);
  }

  /**
   * Given an array withcontact fields (usually containing only one field),
   * returns the equivalent vcard field
   *
   * @param {Array} sourceField
   * @param {String} vcardField
   * @return {Array}
   */
  function fromContactField(sourceField, vcardField) {
    if (!sourceField || !sourceField.length) {
      return [];
    }

    return sourceField.map(function(field) {
      var str = vcardField;
      /**
       * If the field doesn't have an equivalent in vcard standard.
       * Incompatible fields are stored in `VCARD_SKIP_FIELD`.
       *
       * @type {boolean}
       */
      var skipField = false;
      var types = [];

      // Checks existing types and converts them to vcard types if necessary
      // and fill `types` array with the final types.
      if (Array.isArray(field.type)) {
        var fieldType = field.type.map(function(aType) {
          var out = '';
          if (aType) {
            aType = aType.trim().toLowerCase();
            if (VCARD_SKIP_FIELD.indexOf(aType) !== -1) {
              skipField = true;
            }
            out = VCARD_MAP[aType] || aType;
          }
          return out;
        });

        types = types.concat(fieldType);
      }

      if (skipField) {
        return;
      }

      if (field.pref && field.pref === true) {
        types.push('pref');
      }

      if (types.length) {
        vcardField += ';type=' + types.join(',');
      }

      return vcardField + ':' + (field.value || '');
    });
  }

  function fromStringArray(sourceField, vcardField) {
    if (!sourceField) {
      return '';
    }

    return vcardField + ':' + sourceField.join(',');
  }

  function joinFields(fields) {
    return fields.filter(function(f) { return !!f; }).join('\n');
  }

  function toBlob(vcard) {
    return new Blob([vcard], {'type': 'text/vcard'});
  }

  ContactToVcardBlob = function(contacts, callback) {
    ContactToVcard(contacts, function onVcard(vcard, remaining) {
      vcard = vcard ? toBlob(vcard) : null;
      callback(toBlob(vcard), remaining);
    });
  };

  ContactToVcard = function(ctArray, callback) {
    var vcardString = '';
    var cardsInBatch = 0;
    var totalCardsProcessed = 0;
    var batchSize = 10;

    function appendVcard(vcard) {
      if (vcard && vcard.length > 0) {
        vcardString += HEADER + vcard + '\n' + FOOTER;
      }

      cardsInBatch += 1;
      totalCardsProcessed += 1;

      console.log(vcard, cardsInBatch, ctArray.length)
      if (cardsInBatch === batchSize ||
        cardsInBatch === ctArray.length) {
        callback(vcardString, ctArray.length - totalCardsProcessed);
        cardsInBatch = 0;
        vcardString = '';
      }
    }

    /**
     * Process a single contact from the batch
     */
    function processContact(ct, _onProcessed) {
      if (navigator.mozContact && !(ct instanceof navigator.mozContact)) {
        console.error('An instance of mozContact was expected');
        _onProcessed('');
        return;
      }

      var n = 'n:' + ([
        ct.familyName,
        ct.givenName,
        ct.additionalName,
        ct.honorificPrefix,
        ct.honorificSuffix
      ].map(function(f) {
          return (f || ['']).join(',') + ';';
        }).join(''));

      // vCard standard does not accept contacts without 'n' or 'fn' fields.
      if (n === 'n:;;;;;' || !ct.name) {
        _onProcessed('');
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
          allFields.push(photoStr + 'data:' + mime + ';base64,' + b64);
          _onProcessed(joinFields(allFields));
        });
      } else {
        _onProcessed(joinFields(allFields));
      }
    }

    for (var i = 0, l = ctArray.length; i < l; i++) {
      processContact(ctArray[i], appendVcard);
    }
  };
})();
