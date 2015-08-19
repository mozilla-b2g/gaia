/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals setImmediate, Normalizer */

/**
 * ContactToVcard provides the functionality necessary to export from
 * MozContacts to vCard 3.0 (https://www.ietf.org/rfc/rfc2426.txt). The reason
 * to choose the 3.0 standard instead of the 4.0 one is that some systems
 * most notoriously Android 4.x don't seem to be able to import vCard 4.0.
 */
(function(exports) {
  'use strict';

  /** Mapping between contact fields and equivalent vCard fields */
  var VCARD_MAP = {
    'fax' : 'FAX',
    'faxoffice' : 'FAX,WORK',
    'faxhome' : 'FAX,HOME',
    'faxother' : 'FAX',
    'home' : 'HOME',
    'mobile' : 'CELL',
    'pager' : 'PAGER',
    'personal' : 'HOME',
    'pref' : 'PREF',
    'text' : 'TEXT',
    'textphone' : 'TEXTPHONE',
    'voice' : 'VOICE',
    'work' : 'WORK'
  };

  var CRLF = '\r\n';

  /** Field list to be skipped when converting to vCard */
  var VCARD_SKIP_FIELD = ['fb_profile_photo'];
  var VCARD_VERSION = '3.0';
  var HEADER = 'BEGIN:VCARD' + CRLF + 'VERSION:' + VCARD_VERSION + CRLF;
  var FOOTER = 'END:VCARD' + CRLF;

  function blobToBase64(blob, cb) {
    var reader = new FileReader();

    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      cb(base64);
    };

    reader.readAsDataURL(blob);
  }

  function ISODateString(d) {
    if (typeof d === 'string') {
      d = new Date(d);
    }

    var str = d.toISOString();

    // Remove the milliseconds field
    return str.slice(0, str.indexOf('.')) + 'Z';
  }

  /**
   * Given an array with contact fields (usually containing only one field),
   * returns the equivalent vcard field
   *
   * @param {Array} sourceField source field from a MozContact
   * @param {String} vcardField vCard field name
   * @return {Array} Array of vCard string entries
   */
  function fromContactField(sourceField, vcardField) {
    if (!sourceField || !sourceField.length) {
      return [];
    }

    // Goes to the entries in the given field (usually only one but potentially
    // more) and transforms them into string-based, vCard ones.
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
        types.push('PREF');
      }

      if (types.length) {
        str += ';TYPE=' + types.join(',');
      }

      return str + ':' + (field.value || '');
    });
  }

  function fromStringArray(sourceField, vcardField) {
    if (!sourceField) {
      return '';
    }

    return vcardField + ':' + sourceField.join(',');
  }

  function joinFields(fields) {
    return fields.filter(function(f) { return !!f; }).join(CRLF);
  }

  function toBlob(vcard, type) {
    return new Blob([vcard], {'type': type});
  }

  /**
   * Convenience function that converts an array of contacts into a text/vcard
   * blob. The blob is passed to the callback once the conversion is done.
   *
   * @param {Array} contacts An array of mozContact objects.
   * @param {Function} callback A function invoked with the generated blob.
   */
  function ContactToVcardBlob(contacts, callback, options) {
    var targetType = options && options.type || 'text/vcard';
    if(targetType.indexOf('charset') === -1) {
      targetType += '; charset=utf-8';
    }

    if (typeof callback !== 'function') {
      throw Error('callback() is undefined or not a function');
    }

    var str = '';

    ContactToVcard(contacts, function append(vcards, nCards) {
      str += vcards;
    }, function success() {
      str = str ? toBlob(str) : null;
      callback(toBlob(str, targetType));
    });
  }

  /**
   * Converts an array of contacts to a string of vCards. The conversion is
   * done in batches. For every batch the append callback is invoked with a
   * string of vCards and the number of contacts in the batch. Once all
   * contacts have been processed the success callback is invoked.
   *
   * @param {Array} contacts An array of mozContact objects.
   * @param {Function} append A function taking two parameters, the first one
   *        will be passed a string of vCards and the second an integer
   *        representing the number of contacts in the string.
   * @param {Function} success A function with no parameters that will be
   *        invoked once all the contacts have been processed.
   * @param {Number} batchSize An optional parameter specifying the maximum
   *        number of characters that should be added to the output string
   *        before invoking the append callback. If this paramter is not
   *        provided a default value of 1MiB will be used instead.
   */
  function ContactToVcard(contacts, append, success, batchSize, skipPhoto) {
    var vCardsString = '';
    var nextIndex = 0;
    var cardsInBatch = 0;

    batchSize = batchSize || (1024 * 1024);

    if (typeof append !== 'function') {
      throw Error('append() is undefined or not a function');
    }

    if (typeof success !== 'function') {
      throw Error('append() is undefined or not a function');
    }

    /**
     * Append the vCard obtained by converting the contact to the string of
     * vCards and if necessary pass the string to the user-specified callback
     * function. If we're not done processing all the contacts start processing
     * the following one.
     *
     * @param {String} vcard The string obtained from the previously processed
     *        contact.
     */
    function appendVCard(vcard) {
      if (vcard.length > 0) {
        vCardsString += HEADER + vcard + CRLF + FOOTER;
      }

      nextIndex++;
      cardsInBatch++;

      /* Invoke the user-provided callback if we've filled the current batch or
       * if we don't have more contacts to process. */
      if ((vCardsString.length > batchSize) ||
          (nextIndex === contacts.length)) {
        append(vCardsString, cardsInBatch);
        cardsInBatch = 0;
        vCardsString = '';
      }

      if (nextIndex < contacts.length) {
        processContact(contacts[nextIndex]);
      } else {
        success();
      }
    }

    /**
     * Process a contact and invokes appendVCard with the resulting vCard
     * string.
     *
     * @param {Object} contacts A mozContact object.
     */
    function processContact(ct) {
      if (navigator.mozContact && !(ct instanceof navigator.mozContact)) {
        console.error('An instance of mozContact was expected');
        setImmediate(function() { appendVCard(''); });
        return;
      }

      /*
       * N TYPE
       * The structured type value corresponds, in
       * sequence, to the Family Name, Given Name, Additional Names, Honorific
       * Prefixes, and Honorific Suffixes. The text components are separated
       * by the SEMI-COLON character (ASCII decimal 59). Individual text
       * components can include multiple text values (e.g., multiple
       * Additional Names) separated by the COMMA character (ASCII decimal
       * 44). This type is based on the semantics of the X.520 individual name
       * attributes. The property MUST be present in the vCard object.
       **/
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

      // vCard standard does not accept contacts without 'n' or 'fn' fields.
      if (n === 'n:;;;;;' || !ct.name) {
        setImmediate(function() { appendVCard(''); });
        return;
      }

      var allFields = [
        n,
        fromStringArray(ct.name, 'FN'),
        fromStringArray(ct.nickname, 'NICKNAME'),
        fromStringArray(ct.category, 'CATEGORY'),
        fromStringArray(ct.org, 'ORG'),
        fromStringArray(ct.jobTitle, 'TITLE'),
        fromStringArray(ct.note, 'NOTE'),
        fromStringArray(ct.key, 'KEY')
      ];

      if (ct.bday) {
        allFields.push('BDAY:' + ISODateString(ct.bday));
      }
      if (ct.anniversary) {
        allFields.push('ANNIVERSARY:' + ISODateString(ct.anniversary));
      }

      allFields.push.apply(allFields, fromContactField(ct.email, 'EMAIL'));
      allFields.push.apply(allFields, fromContactField(ct.url, 'URL'));
      allFields.push.apply(allFields, fromContactField(ct.tel, 'TEL'));

      var adrs = fromContactField(ct.adr, 'ADR');
      allFields.push.apply(allFields, adrs.map(function(adrStr, i) {
        var orig = ct.adr[i];
        return adrStr + ([
          '',
          '',
          orig.streetAddress || '', orig.locality || '', orig.region || '',
          orig.postalCode || '', orig.countryName || ''].join(';'));
      }));

      /**
       * PHOTO TYPE
       * The encoding MUST be reset to "b" using the ENCODING
       * parameter in order to specify inline, encoded binary data. If the
       * value is referenced by a URI value, then the default encoding of 8bit
       * is used and no explicit ENCODING parameter is needed.

       * Type value: A single value. The default is binary value. It can also
       * be reset to uri value. The uri value can be used to specify a value
       * outside of this MIME entity.

       * Type special notes: The type can include the type parameter "TYPE" to
       * specify the graphic image format type. The TYPE parameter values MUST
       * be one of the IANA registered image formats or a non-standard image
       * format.
      */
      if (
        (
          typeof skipPhoto == 'undefined' ||
          skipPhoto === false
        ) &&
        ct.photo &&
        ct.photo.length
      ) {
        var photoMeta = ['PHOTO', 'ENCODING=b'];
        var blob = ct.photo[0];

        blobToBase64(blob, function(b64) {
          if (blob.type) {
            photoMeta.push('TYPE=' + blob.type);
          }
          allFields.push(photoMeta.join(';') + ':' + b64);
          appendVCard(joinFields(allFields));
        });
      } else {
        setImmediate(function() { appendVCard(joinFields(allFields)); });
      }
    }

    processContact(contacts[0]);
  }

  // Generates a name for the contact returned as a vcard
  function getVcardFilename(theContact) {
    var out = '';

    var givenName = Array.isArray(theContact.givenName) &&
                                                      theContact.givenName[0];
    var familyName = Array.isArray(theContact.familyName) &&
                                                      theContact.familyName[0];

    if (givenName) {
      out = givenName;
    }

    if (familyName) {
      if (out) {
        out += '_';
      }
      out += familyName;
    }

    out = out || (Array.isArray(theContact.org) && theContact.org[0]);

    out = out || (Array.isArray(theContact.tel) && theContact.tel[0] &&
                 ( 'c' + '_' + theContact.tel[0].value) );

    out = out || (Array.isArray(theContact.email) && theContact.email[0] &&
                  theContact.email[0].value);

    out = out || 'unknown';

    out = Normalizer.toAscii(out).replace(/[\s+@#&?\+\$]/g, '');

    return out + '.vcf';
  }

  exports.ContactToVcard = ContactToVcard;
  exports.ContactToVcardBlob = ContactToVcardBlob;
  exports.VcardFilename  = getVcardFilename;
})(this);
