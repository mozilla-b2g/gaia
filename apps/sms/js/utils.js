/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals ContactPhotoHelper */

(function(exports) {
  'use strict';
  var rdashes = /-(.)/g;
  var rescape = /[.?*+^$[\]\\(){}|-]/g;
  var rparams = /([^?=&]+)(?:=([^&]*))?/g;
  var rnondialablechars = /[^,#+\*\d]/g;

  var Utils = {
    date: {
      shared: new Date(),
      get format() {
        // Remove the accessor
        delete Utils.date.format;
        // Late initialization allows us to safely mock the mozL10n object
        // without creating race conditions or hard script dependencies
        return (Utils.date.format = new navigator.mozL10n.DateTimeFormat());
      }
    },
    escapeRegex: function ut_escapeRegex(str) {
      if (typeof str !== 'string') {
        return '';
      }
      return str.replace(rescape, '\\$&');
    },
    getFormattedHour: function ut_getFormattedHour(time) {
      this.date.shared.setTime(+time);
      return this.date.format.localeFormat(
        this.date.shared, navigator.mozL10n.get('shortTimeFormat')
      );
    },
    getDayDate: function re_getDayDate(time) {
      this.date.shared.setTime(+time);
      this.date.shared.setHours(0, 0, 0, 0);
      return this.date.shared.getTime();
    },
    getHeaderDate: function ut_giveHeaderDate(time) {
      var _ = navigator.mozL10n.get;
      var today = Utils.getDayDate(Date.now());
      var otherDay = Utils.getDayDate(time);
      var dayDiff = (today - otherDay) / 86400000;
      this.date.shared.setTime(+time);

      if (isNaN(dayDiff)) {
        return _('incorrectDate');
      }

      if (dayDiff < 0) {
        // future time
        return this.date.format.localeFormat(
          this.date.shared, '%x'
        );
      }

      return dayDiff === 0 && _('today') ||
        dayDiff === 1 && _('yesterday') ||
        dayDiff < 6 && this.date.format.localeFormat(this.date.shared, '%A') ||
        this.date.format.localeFormat(this.date.shared, '%x');
    },
    getFontSize: function ut_getFontSize() {
      if (!this.rootFontSize) {
        var htmlCss = window.getComputedStyle(document.documentElement, null);
        this.rootFontSize = parseInt(htmlCss.getPropertyValue('font-size'), 10);
      }
      return this.rootFontSize;
    },

    // We will apply createObjectURL for details.photoURL if contact image exist
    // Please remember to revoke the photoURL after utilizing it.
    getContactDetails:
      function ut_getContactDetails(number, contacts, include) {

      var details = {};

      include = include || {};

      function updateDetails(contact) {
        var name, phone, carrier, i, length, subscriber, org;
        name = contact.name[0];
        org = contact.org && contact.org[0];
        length = contact.tel ? contact.tel.length : 0;
        phone = length && contact.tel[0].value ? contact.tel[0] : {
          value: '',
          type: '',
          carrier: ''
        };
        carrier = phone.carrier;
        subscriber = number.length > 7 ? number.substr(-8) : number;

        // Check which of the contacts phone number are we using
        for (i = 0; i < length; i++) {
          // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
          if (contact.tel[i].value.indexOf(subscriber) !== -1) {
            phone = contact.tel[i];
            carrier = phone.carrier;
            break;
          }
        }

        // Add data values for contact activity interaction
        details.isContact = true;

        // Add photo
        if (include.photoURL) {
          var photo = ContactPhotoHelper.getThumbnail(contact);
          if (photo) {
            details.photoURL = window.URL.createObjectURL(photo);
          }
        }

        // Carrier logic
        if (name) {
          // Check if other phones with same type and carrier
          // Convert the tel-type to string before tel-type comparison.
          // TODO : We might need to handle multiple tel type in the future.
          for (i = 0; i < length; i++) {
            var telType = contact.tel[i].type && contact.tel[i].type.toString();
            var phoneType = phone.type && phone.type.toString();
            if (contact.tel[i].value !== phone.value &&
                telType === phoneType &&
                contact.tel[i].carrier === phone.carrier) {
              carrier = phone.value;
            }
          }
        }

        details.name = name;
        details.carrier = carrier || phone.value || '';
        // We pick the first discovered org name as the phone number's detail
        // org information.
        details.org = details.org || org;

        if (phone.type) {
          details.carrier = phone.type + ' | ' + details.carrier;
        }
      }

      // In no contact or contact with empty information cases, we will leave
      // the title as the empty string and let caller to decide the title.
      if (!contacts || (Array.isArray(contacts) && contacts.length === 0)) {
        details.title = '';
      } else if (!Array.isArray(contacts)) {
        updateDetails(contacts);
        details.title = details.name || details.org;
      } else {
        // Rule for fetching details with multiple contact entries:
        // 1) If we got more than 1 contact entry, find another entry if
        //    current entry got no name/company.
        // 2) If we could not get any information from all the entries,
        //    just display phone number.
        for (var i = 0, l = contacts.length; i < l; i++) {
          updateDetails(contacts[i]);
          if (details.name) {
            break;
          }
        }
        details.title = details.name || details.org;
      }

      return details;
    },

    getCarrierTag: function ut_getCarrierTag(input, tels, details) {
      /**
        1. If a phone number has carrier associated with it
            the output will be:

          type | carrier

        2. If there is no carrier associated with the phone number
            the output will be:

          type | phonenumber

        3. If for some reason a single contact has two phone numbers with
            the same type and the same carrier the output will be:

          type | phonenumber

        4. If for some reason a single contact has no name and no carrier,
            the output will be:

          type

        5. If for some reason a single contact has no name, no type
            and no carrier, the output will be nothing.
      */
      var length = tels.length;
      var hasDetails = typeof details !== 'undefined';
      var hasUniqueCarriers = true;
      var hasUniqueTypes = true;
      var name = hasDetails ? details.name : '';
      var found, tel, type, carrier, value, ending;

      for (var i = 0; i < length; i++) {
        tel = tels[i];

        if (tel.value && Utils.probablyMatches(tel.value, input)) {
          found = tel;
        }

        if (carrier && carrier === tel.carrier) {
          hasUniqueCarriers = false;
        }

        if (type && type === tel.type[0]) {
          hasUniqueTypes = false;
        }

        carrier = tel.carrier;
        type = (tel.type && tel.type[0]) || '';
      }

      if (!found) {
        return '';
      }

      type = (found.type && found.type[0]) || '';
      carrier = (hasUniqueCarriers || hasUniqueTypes) ? found.carrier : '';
      value = carrier || found.value;
      ending = ' | ' + (carrier || value);

      if (hasDetails && !name && !carrier) {
        ending = '';
      }

      return type + ending;
    },

    // Based on "non-dialables" in https://github.com/andreasgal/PhoneNumber.js
    //
    // @param {String} input Value to remove nondialiable chars from.
    //
    removeNonDialables: function ut_removeNonDialables(input) {
      return input.replace(rnondialablechars, '');
    },
    // @param {String} a First number string to compare.
    // @param {String} b Second number string to compare.
    //
    // Based on...
    //  - ITU-T E.123 (http://www.itu.int/rec/T-REC-E.123-200102-I/)
    //  - ITU-T E.164 (http://www.itu.int/rec/T-REC-E.164-201011-I/)
    //
    // ...It would appear that a maximally-minimal
    // 7 digit comparison is safe.
    probablyMatches: function ut_probablyMatches(a, b) {
      var service = navigator.mozPhoneNumberService;

      if (service && service.normalize) {
        a = service.normalize(a);
        b = service.normalize(b);
      } else {
        a = Utils.removeNonDialables(a);
        b = Utils.removeNonDialables(b);
      }

      return a === b || a.slice(-7) === b.slice(-7);
    },

    // Default image size limitation is set to 300KB for MMS user story.
    // If limit is not given or bigger than default 300KB, default value need
    // to be applied here for size checking. Parameters could be:
    // (blob, callback) : Resizing image to default limit 300k.
    // (blob, limit, callback) : Resizing image to given limitation.
    getResizedImgBlob: function ut_getResizedImgBlob(blob, limit, callback) {
      var defaultLimit = 300 * 1024;
      if (typeof limit === 'function') {
        callback = limit;
        limit = defaultLimit;
      }
      limit = limit === 0 ? defaultLimit : Math.min(limit, defaultLimit);

      if (blob.size < limit) {
        setTimeout(function blobCb() {
          callback(blob);
        });
        return;
      }
      var ratio = Math.sqrt(blob.size / limit);
      Utils.resizeImageBlobWithRatio({
        blob: blob,
        limit: limit,
        ratio: ratio,
        callback: callback
      });
    },

    //  resizeImageBlobWithRatio have additional ratio to force image
    //  resize to smaller size to avoid edge case about quality adjustment
    //  not working.
    resizeImageBlobWithRatio: function ut_resizeImageBlobWithRatio(obj) {
      var blob = obj.blob;
      var callback = obj.callback;
      var limit = obj.limit;
      var ratio = obj.ratio;
      var qualities = [0.75, 0.5, 0.25];

      if (blob.size < limit) {
        setTimeout(function blobCb() {
          callback(blob);
        });
        return;
      }

      var img = document.createElement('img');
      var url = window.URL.createObjectURL(blob);
      img.src = url;
      img.onload = function onBlobLoaded() {
        window.URL.revokeObjectURL(url);
        var imageWidth = img.width;
        var imageHeight = img.height;
        var targetWidth = imageWidth / ratio;
        var targetHeight = imageHeight / ratio;

        var canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        var context = canvas.getContext('2d', { willReadFrequently: true });

        context.drawImage(img, 0, 0, targetWidth, targetHeight);
        // Bug 889765: Since we couldn't know the quality of the original jpg
        // The 'resized' image might have a bigger size because it was saved
        // with quality or dpi. Here we will adjust the jpg quality(or resize
        // blob again if low quality blob size still exceed limit) to make
        // sure the size won't exceed the limitation.
        var level = 0;

        function ensureSizeLimit(resizedBlob) {
          if (resizedBlob.size < limit) {
            callback(resizedBlob);
          } else {
            // Reduce image quality for match limitation. Here we set quality
            // to 0.75, 0.5 and 0.25 for image blob resizing.
            // (Default image quality is 0.92 for jpeg)
            if (level < qualities.length) {
              canvas.toBlob(ensureSizeLimit, 'image/jpeg',
                qualities[level++]);
            } else {
              // We will resize the blob if image quality = 0.25 still exceed
              // size limitation.
              Utils.resizeImageBlobWithRatio({
                blob: blob,
                limit: limit,
                ratio: ratio * 2,
                callback: callback
              });
            }
          }
        }
        canvas.toBlob(ensureSizeLimit, blob.type);
      };
    },
    camelCase: function ut_camelCase(str) {
      return str.replace(rdashes, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    },
    typeFromMimeType: function ut_typeFromMimeType(mime) {
      var MAX_MIME_TYPE_LENGTH = 256; // ought to be enough for anybody
      if (typeof mime !== 'string' || mime.length > MAX_MIME_TYPE_LENGTH) {
        return null;
      }

      var index = mime.indexOf('/');
      if (index === -1) {
        return null;
      }
      var mainPart = mime.slice(0, index);
      switch (mainPart) {
        case 'image':
          return 'img';
        case 'video':
        case 'audio':
        case 'text':
          return mainPart;
        default:
          return null;
      }
    },
    params: function(input) {
      var parsed = {};
      input.replace(rparams, function($0, $1, $2) {
        parsed[$1] = $2;
      });
      return parsed;
    },
    /*
      Using a contact resolver, a function that can looks for contacts,
      get the format for the dissambiguation.

      Used mainly in activities since they need to pick a contact from just
      the number.

      In order to workaround facebook contact issue(bug 895817), it should be
      able to handle the case about phone number without matched contact.

      Phone number comes directly from the activity in the case we call 'pick'
      from SMS App.
    */
    getContactDisplayInfo: function(resolver, phoneNumber, callback) {
      resolver(phoneNumber, function onContacts(contacts) {
        callback(Utils.basicContact(phoneNumber, contacts));
      });
    },

    basicContact: function(number, records, callback) {
      var record;
      if (Array.isArray(records)) {
        if (records.length > 0) {
          record = records[0];
        }
      } else if (records !== null) {
        record = records;
      }

      // Only exit when no record and no phone number case.
      if (!record && !number) {
        if (typeof callback === 'function') {
          callback(null);
        }
        return;
      }

      var telLength = (record && record.tel) ? record.tel.length : 0;
      var tel;
      // Look for the right tel. A record can contains more than
      // one record, so we need to identify which one is the right one.
      for (var i = 0; i < telLength; i++) {
        if (record.tel[i].value === number) {
          tel = record.tel[i];
          break;
        }
      }
      // If after looking there is no tel. matching, we apply
      // directly the number
      if (!tel) {
        tel = {type: [''], value: number, carrier: ''};
      }
      // Get the title in the standard way
      var details = Utils.getContactDetails(tel, record);
      var info = Utils.getDisplayObject(details.title || null, tel);

      return info;
    },

    /*
      Given a title for a contact, a the current information for
      an specific phone, of that contact, creates an object with
      all the information needed to display data.
    */
    getDisplayObject: function(theTitle, tel) {
      var number = tel.value;
      var title = theTitle || number;
      var type = tel.type && tel.type.length ? tel.type[0] : '';
      var carrier = tel.carrier ? (tel.carrier + ', ') : '';
      var separator = type || carrier ? ' | ' : '';
      var data = {
        name: title,
        number: number,
        type: type,
        carrier: carrier,
        separator: separator,
        nameHTML: '',
        numberHTML: ''
      };

      return data;
    },

    /*
      TODO: It's workaround to avoid url revoke bug. Need platform fixing
            to remove the async load/remove.(Please ref bug 972245)
    */
    asyncLoadRevokeURL: function(url) {
      setTimeout(function() {
        var image = new Image();
        image.src = url;
        image.onload = image.onerror = function revokePhotoURL() {
          window.URL.revokeObjectURL(this.src);
        };
      });
    }
  };

  exports.Utils = Utils;

}(this));
