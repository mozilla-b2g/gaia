/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals ContactPhotoHelper, Notification, Promise, Threads, Settings */

(function(exports) {
  'use strict';
  var rdashes = /-(.)/g;
  var rescape = /[.?*+^$[\]\\(){}|-]/g;
  var rparams = /([^?=&]+)(?:=([^&]*))?/g;
  var rnondialablechars = /[^,#+\*\d]/g;
  var rmail = /[\w-]+@[\w\-]/;
  var downsamplingRefSize = {
    // Estimate average Thumbnail size:
    // 120 X 60 (max pixel) X 3 (full color) / 20 (average jpeg compress ratio)
    // = 1080 (byte)
    'thumbnail' : 1080
    // TODO: For mms resizing
  };

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
        var name, phone, i, length, subscriber, org;
        name = contact.name[0];
        org = contact.org && contact.org[0];
        length = contact.tel ? contact.tel.length : 0;
        subscriber = number.length > 7 ? number.substr(-8) : number;

        // Check which of the contacts phone number are we using
        for (i = 0; i < length; i++) {
          // Based on E.164 (http://en.wikipedia.org/wiki/E.164)
          if (contact.tel[i].value.indexOf(subscriber) !== -1) {
            phone = contact.tel[i];
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

        details.name = name;
        // We pick the first discovered org name as the phone number's detail
        // org information.
        details.org = details.org || org;
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

    extend: function ut_extend(target, source) {
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    },

    /**
     * Based on input number tries to extract more phone details like phone
     * type, full phone number and phone carrier.
     * 1. If a phone number has carrier associated with it then both "type" and
     * "carrier" will be returned;
     *
     * 2. If there is no carrier associated with the phone number then "type"
     *  and "phone number" will be returned;
     *
     * 3. If for some reason a single contact has two phone numbers with the
     * same type and the same carrier then "type" and "phone number" will be
     * returned;
     *
     * note: The argument "tels" can actually contain "emails" too.
     *
     */
    getPhoneDetails: function ut_getPhoneDetails(input, tels) {
      var length = tels.length;
      var hasUniqueCarriers = true;
      var hasUniqueTypes = true;
      var found, tel, type, carrier;

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
        return null;
      }

      return {
        type: (found.type && found.type[0]) || null,
        carrier: hasUniqueCarriers || hasUniqueTypes ? found.carrier : null,
        number: found.value
      };
    },

    // Based on "non-dialables" in https://github.com/andreasgal/PhoneNumber.js
    //
    // @param {String} input Value to remove nondialiable chars from.
    //
    removeNonDialables: function ut_removeNonDialables(input) {
      return input.replace(rnondialablechars, '');
    },
    // @param {String} a First recipient field.
    // @param {String} b Second recipient field
    //
    // Based on...
    //  - ITU-T E.123 (http://www.itu.int/rec/T-REC-E.123-200102-I/)
    //  - ITU-T E.164 (http://www.itu.int/rec/T-REC-E.164-201011-I/)
    //
    // ...It would appear that a maximally-minimal
    // 7 digit comparison is safe.
    probablyMatches: function ut_probablyMatches(a, b) {
      var service = navigator.mozPhoneNumberService;

      // String comparison starts here
      if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
      }

      if (Settings.supportEmailRecipient &&
          Utils.isEmailAddress(a) &&
          Utils.isEmailAddress(b)) {
        return a === b;
      }

      if (service && service.normalize) {
        a = service.normalize(a);
        b = service.normalize(b);
      } else {
        a = Utils.removeNonDialables(a);
        b = Utils.removeNonDialables(b);
      }

      return a === b || a.slice(-7) === b.slice(-7);
    },

    /**
     * multiRecipientMatch
     *
     * Check multi-repients without regard to order
     *
     * @param {(String|string[])} a First recipient field.
     * @param {(String|string[])} b Second recipient field.
     *
     * @return {Boolean} Return true if all recipients match.
     */
    multiRecipientMatch: function ut_multiRecipientMatch(a, b) {
      // When ES6 syntax is allowed, replace with
      // multiRecipientMatch([...a], [...b])
      a = [].concat(a);
      b = [].concat(b);
      var blen = b.length;
      if (a.length !== blen) {
        return false;
      }
      // Check each recipient in a against each in b
      // Allows for any order (and fails early)
      return a.every(function(number) {
        for (var i = 0; i < blen; i++) {
          if (Utils.probablyMatches(number, b[i])) {
            return true;
          }
        }
      });
    },

    // Default image size limitation is set to 295KB for MMS user story.
    // If limit is not given or bigger than default 295KB, default value need
    // to be applied here for size checking. Parameters could be:
    // (blob, callback) : Resizing image to default limit 295k.
    // (blob, limit, callback) : Resizing image to given limitation.
    getResizedImgBlob: function ut_getResizedImgBlob(blob, limit, callback) {
      var defaultLimit = 295 * 1024;
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
      Utils._resizeImageBlobWithRatio({
        blob: blob,
        limit: limit,
        ratio: ratio,
        callback: callback
      });
    },

    //  resizeImageBlobWithRatio have additional ratio to force image
    //  resize to smaller size to avoid edge case about quality adjustment
    //  not working.
    //  For JPG images, a ratio between 2 and 8 will be set to a close
    //  power of 2. A ratio between 1 and 2 will be set to 2. A ratio bigger
    //  than 8 will be rounded to the closest bigger integer.
    //
    _resizeImageBlobWithRatio: function ut_resizeImageBlobWithRatio(obj) {
      var blob = obj.blob;
      var callback = obj.callback;
      var limit = obj.limit;
      var ratio = Math.ceil(obj.ratio);
      var qualities = [0.65, 0.5, 0.25];

      var sampleSize = 1;
      var sampleSizeHash = '';

      if (blob.size < limit || ratio <= 1) {
        setTimeout(function blobCb() {
          callback(blob);
        });
        return;
      }

      if (blob.type === 'image/jpeg') {
        if (ratio >= 8) {
          sampleSize = 8;
        } else {
          sampleSize = ratio = Utils.getClosestSampleSize(ratio);
        }

        sampleSizeHash = '#-moz-samplesize=' + sampleSize;
      }

      var img = document.createElement('img');
      var url = window.URL.createObjectURL(blob);
      img.src = url + sampleSizeHash;

      img.onload = function onBlobLoaded() {
        window.URL.revokeObjectURL(url);
        var targetWidth = img.width * sampleSize / ratio;
        var targetHeight = img.height * sampleSize / ratio;

        var canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        var context = canvas.getContext('2d', { willReadFrequently: true });

        context.drawImage(img, 0, 0, targetWidth, targetHeight);
        img.src = '';
        // Bug 889765: Since we couldn't know the quality of the original jpg
        // The 'resized' image might have a bigger size because it was saved
        // with quality or dpi. Here we will adjust the jpg quality(or resize
        // blob again if low quality blob size still exceed limit) to make
        // sure the size won't exceed the limitation.
        var level = 0;

        function cleanup() {
          canvas.width = canvas.height = 0;
          canvas = null;
        }

        function ensureSizeLimit(resizedBlob) {
          if (resizedBlob.size < limit) {
            cleanup();

            // using a setTimeout so that used objects can be garbage collected
            // right now
            setTimeout(callback.bind(null, resizedBlob));
          } else {
            resizedBlob = null; // we don't need it anymore
            // Reduce image quality for match limitation. Here we set quality
            // to 0.65, 0.5 and 0.25 for image blob resizing.
            // (Default image quality is 0.92 for jpeg)
            if (level < qualities.length) {
              canvas.toBlob(ensureSizeLimit, 'image/jpeg',
                qualities[level++]);
            } else {
              // We will resize the blob if image quality = 0.25 still exceed
              // size limitation.
              cleanup();

              // using a setTimeout so that used objects can be garbage
              // collected right now
              setTimeout(
                Utils._resizeImageBlobWithRatio.bind(Utils, {
                  blob: blob,
                  limit: limit,
                  ratio: ratio * 2,
                  callback: callback
                })
              );
            }
          }
        }

        canvas.toBlob(ensureSizeLimit, blob.type);
      };
    },

    getClosestSampleSize: function ut_getClosestSampleSize(ratio) {
      if (ratio >= 8) {
        return 8;
      }

      if (ratio >= 4) {
        return 4;
      }

      if (ratio >= 2) {
        return 2;
      }

      return 1;
    },

    // Return the url path with #-moz-samplesize postfix and downsampled image
    // could be loaded directly from backend graphics lib.
    getDownsamplingSrcUrl: function ut_getDownsamplingSrcUrl(options) {
      var newUrl = options.url;
      var size = options.size;
      var ref = downsamplingRefSize[options.type];

      if (size && ref) {
        // Estimate average Thumbnail size
        var ratio = Math.min(Math.sqrt(size / ref), 16);

        if (ratio >= 2) {
          newUrl += '#-moz-samplesize=' + Math.floor(ratio);
        }
      }
      return newUrl;
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
      var type = tel.type && tel.type.length ? tel.type[0] : '';
      var data = {
        name: theTitle || number,
        number: number,
        type: type,
        carrier: tel.carrier || ''
       };

      if (Settings.supportEmailRecipient) {
        data.email = number;
        data.emailHTML = '';
       }
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
    },
    /*
       TODO: Email Address check.
     */
    isEmailAddress: function(email) {
      return rmail.test(email);
    },
    /*
      Helper function for removing notifications. It will fetch the notification
      using the current threadId or the parameter if provided, and close them
       from the returned list.
    */
    closeNotificationsForThread: function ut_closeNotificationsForThread(tid) {
      var threadId = tid ? tid : Threads.currentId;
      if (!threadId) {
        return;
      }

      var targetTag = 'threadId:' + threadId;

      return Notification.get({tag: targetTag})
        .then(
          function onSuccess(notifications) {
            for (var i = 0; i < notifications.length; i++) {
              notifications[i].close();
            }
          }
        ).catch(function onError(reason) {
          console.error('Notification.get(tag: ' + targetTag + '): ', reason);
        });
    },

    /**
     * Converts image DOM node to canvas respecting image ratio.
     * @param imageNode Image DOM node to convert.
     * @param width Target image width.
     * @param height Target image height.
     * @returns {Node} Canvas object created from image DOM node.
     */
    imageToCanvas: function(imageNode, width, height) {
      var ratio = Math.max(imageNode.width / width, imageNode.height / height);

      var canvas = document.createElement('canvas');
      canvas.width = Math.round(imageNode.width / ratio);
      canvas.height = Math.round(imageNode.height / ratio);

      var context = canvas.getContext('2d', { willReadFrequently: true });

      // Using canvas width and height with correct image proportions
      context.drawImage(imageNode, 0, 0, canvas.width, canvas.height);

      return canvas;
    },

    /**
     * Converts image URL to data URL using specified image mime type. Preferred
     * image dimensions can be retrieved via optional sizeRetriever delegate,
     * otherwise actual dimensions will be used.
     * @param imageURL Image URL to convert.
     * @param type Image MIME type.
     * @param sizeAdjuster Optional delegate that accepts actual image width and
     * height as parameters and should return both these dimensions adjusted
     * depending on consumer's code needs. These adjusted dimensions then will
     * be used to generate image data URL.
     * @returns {Promise.<string>} Promise that will be resolved to Data URL.
     */
    imageUrlToDataUrl: function(imageURL, type, sizeAdjuster) {
      var img = new Image(),
          deferred = Utils.Promise.defer();

      img.src = imageURL;

      img.onload = function onBlobLoaded() {
        var adjustedSize = null,
            canvas = null;

        try {
          window.URL.revokeObjectURL(img.src);

          adjustedSize = sizeAdjuster ? sizeAdjuster(img.width, img.height) : {
            width: img.width,
            height: img.height
          };

          canvas = Utils.imageToCanvas(
            img, adjustedSize.width, adjustedSize.height
          );

          deferred.resolve({
            width: adjustedSize.width,
            height: adjustedSize.height,
            dataUrl: canvas.toDataURL(type)
          });
        } catch (e) {
          deferred.reject(e);
        } finally {
          // Freeing up resources occupied by canvas
          if (canvas) {
            canvas.width = canvas.height = 0;
            canvas = null;
          }
        }
      };

      img.onerror = function() {
        deferred.reject(new Error('The image could not be loaded.'));
      };

      function cleanup() {
        img.height = img.width = 0;
        img = img.src = null;
      }

      // TODO: it would be helpful to have Utils.Promise.finally for such clean
      // up cases that don't care whether promise was resolved or rejected.
      return deferred.promise.then(function(result) {
        cleanup();
        return result;
      }, function(e) {
        cleanup();
        return Promise.reject(e);
      });
    },

    /**
     * Promise related utilities
     */
    Promise: {
      /**
       * Returns object that contains promise and related resolve\reject methods
       * to avoid wrapping long or complex code into single Promise constructor.
       * @returns {{promise: Promise, resolve: function, reject: function}}
       */
      defer: function() {
        var deferred = {};

        deferred.promise = new Promise(function(resolve, reject) {
          deferred.resolve = resolve;
          deferred.reject = reject;
        });

        return deferred;
      }
    }
  };

  exports.Utils = Utils;

}(this));
