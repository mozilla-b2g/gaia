/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global setImmediate */

(function(exports) {
  'use strict';

  /** Mapping between contact fields and equivalent vCard fields */
  var VCARD_MAP = {
    'fax' : 'fax',
    'faxoffice' : 'fax,work',
    'faxhome' : 'fax,home',
    'faxother' : 'fax',
    'home' : 'home',
    'mobile' : 'cell',
    'pager' : 'pager',
    'personal' : 'home',
    'pref' : 'pref',
    'text' : 'text',
    'textphone' : 'textphone',
    'voice' : 'voice',
    'work' : 'work'
  };

  /** Field list to be skipped when converting to vCard */
  var VCARD_SKIP_FIELD = ['fb_profile_photo'];

  var VCARD_VERSION = '4.0';
  var HEADER = 'BEGIN:VCARD\nVERSION:' + VCARD_VERSION + '\n';
  var FOOTER = 'END:VCARD\n';

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
    return (str.slice(0, str.indexOf('.')) + 'Z');
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
        str += ';type=' + types.join(',');
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
    return fields.filter(function(f) { return !!f; }).join('\n');
  }

  function toBlob(vcard) {
    return new Blob([vcard], {'type': 'text/vcard'});
  }

  /**
   * Convenience function that converts an array of contacts into a text/vcard
   * blob. The blob is passed to the callback once the conversion is done.
   *
   * @param {Array} contacts An array of mozContact objects.
   * @param {Function} callback A function invoked with the generated blob.
   */
  function ContactToVcardBlob(contacts, callback) {
    if (typeof callback !== 'function') {
      throw Error('callback() is undefined or not a function');
    }

    var str = '';

    ContactToVcard(contacts, function append(vcards, nCards) {
      str += vcards;
    }, function success() {
      str = str ? toBlob(str) : null;
      callback(toBlob(str));
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
  function ContactToVcard(contacts, append, success, batchSize) {
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
        vCardsString += HEADER + vcard + '\n' + FOOTER;
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
          appendVCard(joinFields(allFields));
        });
      } else {
        setImmediate(function() { appendVCard(joinFields(allFields)); });
      }
    }

    processContact(contacts[0]);
  }

  exports.ContactToVcard = ContactToVcard;
  exports.ContactToVcardBlob = ContactToVcardBlob;
})(this);
