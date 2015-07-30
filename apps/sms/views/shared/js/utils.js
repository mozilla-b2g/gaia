/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals ContactPhotoHelper,
           Dialog,
           Notification,
           Settings,
           Threads
*/

(function(exports) {
  'use strict';
  var rdashes = /-(.)/g;
  var rescape = /[.?*+^$[\]\\(){}|-]/g;
  var rparams = /([^?=&]+)(?:=([^&]*))?/g;
  var rnondialablechars = /[^,#+\*\d]/g;
  var rmail = /[\w-]+@[\w\-]/;

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
      return this.date.shared.toLocaleString(navigator.languages, {
        hour12: navigator.mozHour12,
        hour: 'numeric',
        minute: 'numeric',
      });
    },
    getDayDate: function re_getDayDate(time) {
      this.date.shared.setTime(+time);
      this.date.shared.setHours(0, 0, 0, 0);
      return this.date.shared.getTime();
    },
    _getFormatter: function ut_getFormatter({options, withTime}) {
      if (withTime) {
        options.hour12 = navigator.mozHour12;
        options.hour = 'numeric';
        options.minute = 'numeric';
      }
      return new Intl.DateTimeFormat(navigator.languages, options);
    },
    setHeaderDate: function ut_setHeaderDate({time, element, withTime}) {
      var formatter;
      var today = Utils.getDayDate(Date.now());
      var otherDay = Utils.getDayDate(time);
      var dayDiff = (today - otherDay) / 86400000;
      this.date.shared.setTime(+time);

      if (isNaN(dayDiff)) {
        element.setAttribute('data-l10n-id', 'incorrectDate');
        return;
      }

      if (dayDiff < 0) {
        // future time
        formatter = this._getFormatter({
          options: {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          },
          withTime: withTime
        });
        element.removeAttribute('data-l10n-id');
        element.textContent = formatter.format(this.date.shared);
        return;
      }

      if (dayDiff === 0) {
        if (withTime) {
          navigator.mozL10n.setAttributes(
            element, 'todayWithTime', {
              time: this.getFormattedHour(this.date.shared)
            });
        } else {
          element.setAttribute('data-l10n-id', 'today');
        }
      } else if (dayDiff === 1) {
        if (withTime) {
          navigator.mozL10n.setAttributes(
            element, 'yesterdayWithTime', {
              time: this.getFormattedHour(this.date.shared)
            });
        } else {
          element.setAttribute('data-l10n-id', 'yesterday');
        }
      } else if (dayDiff < 6) {
        formatter = this._getFormatter({
          options: {
            weekday: 'long'
          },
          withTime: withTime
        });
        element.removeAttribute('data-l10n-id');
        element.textContent = formatter.format(this.date.shared);
      } else {
        formatter = Utils._getFormatter({
          options: {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          },
          withTime: withTime
        });
        element.removeAttribute('data-l10n-id');
        element.textContent = formatter.format(this.date.shared);
      }
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

    /**
    * Gets localization details for attachment size label.
    * @param size Attachment blob size in bytes.
    * @returns {{l10nId: string, l10nArgs: {n: string}}}
    */
    getSizeForL10n: function ut_getSizeForL10n(size) {
      // blob size with unit (B or KB or MB)
      var sizeKB = size / 1024;
      var sizeMB = sizeKB / 1024;
      if (size < 1000) {
        return {
          l10nId: 'attachmentSizeB',
          l10nArgs: { n: size }
        };
      } else if (sizeKB < 1000) {
        return {
          l10nId: 'attachmentSizeKB',
          l10nArgs: { n: sizeKB.toFixed(1) }
        };
      }
      return {
        l10nId: 'attachmentSizeMB',
        l10nArgs: { n: sizeMB.toFixed(1) }
      };
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
      var secondPart = mime.substr(index + 1).toLowerCase();

      switch (mainPart) {
        case 'image':
          return 'img';
        case 'text':
          if(secondPart.indexOf('vcard') !== -1) {
            return 'vcard';
          }
          if (secondPart !== 'plain') {
            return 'ref';
          }
          return mainPart;
        case 'video':
        case 'audio':
        case 'application':
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
    basicContact: function(number, records) {
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
     * Returns a function that will call specified "func" function only after it
     * stops being called for a specified wait time.
     * @param {function} func Function to call.
     * @param {number} waitTime Number of milliseconds to wait before calling
     * actual "func" function once debounced function stops being called.
     * @returns {function}
     */
    debounce: function(func, waitTime) {
      var timeout, args, context;

      var executeLater = function() {
        func.apply(context, args);
        timeout = context = args = null;
      };

      return function() {
        context = this;
        args = arguments;

        if (timeout) {
          clearTimeout(timeout);
        }

        timeout = setTimeout(executeLater, waitTime);
      };
    },

    /**
     * Shows modal alert dialog with single OK button to dismiss it.
     * @param {string|{ raw: string|Node }|{id: string, args: Object }} message
     * Message displayed in the alert. 1. If "message" is string then it's
     * considered as l10n identifier; 2. if "message" is object with "raw"
     * property then "raw" property is used as non-localizable string or as a
     * complete Node; 3. If "message" is object with "id" and/or "args"
     * properties then "id" is considered as l10n identifier and "args" as l10n
     * string arguments.
     * @param {string|{ raw: string|Node }|{id: string, args: Object }} title
     * Optional dialog title, if not passed - default title is used. For
     * possible parameter value see "message" parameter description above.
     * @returns {Promise} Return promise is always successfully resolved.
     */
    alert: function (message, title) {
      var deferred = this.Promise.defer();

      var dialog = new Dialog({
        title: title || 'modal-dialog-default-title',
        body: message,
        options: {
          cancel: {
            text: 'modal-dialog-ok-button',
            method: deferred.resolve
          }
        }
      });
      dialog.show();

      return deferred.promise;
    },

    /**
     * Shows modal confirm dialog with two buttons, first acts as cancel action,
     * second one - as confirm action.
     * @param {string|{ raw: string|Node }|{id: string, args: Object }} message
     * Message displayed in the confirm. 1. If "message" is string then it's
     * considered as l10n identifier; 2. if "message" is object with "raw"
     * property then "raw" property is used as non-localizable string or as a
     * complete Node; 3. If "message" is object with "id" and/or "args"
     * properties then "id" is considered as l10n identifier and "args" as l10n
     * string arguments.
     * @param {string|{ raw: string|Node }|{id: string, args: Object }} title
     * Optional dialog title, if not passed - default title is used. For
     * possible parameter value see "message" parameter description above.
     * @param {{ text: string|{ raw: string|Node }|{id: string, args: Object },
     * className: string}} confirmOptions Optional customizations for confirm
     * button, custom text(for possible parameter values see "message"
     * parameter description above) and custom class name.
     * @returns {Promise} Returned promise is resolved when user tap on confirm
     * button and rejected when user taps on cancel button.
     */
    confirm: function (message, title, confirmOptions) {
      var confirmButtonText = confirmOptions && confirmOptions.text ||
        'modal-dialog-ok-button';
      var confirmButtonClassName = confirmOptions && confirmOptions.className ||
        'recommend';

      var deferred = this.Promise.defer();
      var dialog = new Dialog({
        title: title || 'modal-dialog-default-title',
        body: message,
        options: {
          cancel: {
            text: 'modal-dialog-cancel-button',
            method: deferred.reject
          },

          confirm: {
            text: confirmButtonText,
            className: confirmButtonClassName,
            method: deferred.resolve
          }
        }
      });
      dialog.show();

      return deferred.promise;
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
      },

      /**
       * Wraps a generator function that yields Promises in a way that generator
       * flow is paused until yielded Promise is resolved, so that consumer gets
       * Promise result instead of Promise instance itself.
       * See https://www.promisejs.org/generators/ as the reference.
       * @param {function*} generatorFunction Generator function that yields
       * Promises.
       * @return {function}
       */
      async: function(generatorFunction) {
        return function asyncGenerator() {
          var generator = generatorFunction.apply(this, arguments);

          function handle(result) {
            if (result.done) {
              return Promise.resolve(result.value);
            }

            return Promise.resolve(result.value).then(
              (result) => handle(generator.next(result)),
              (error) => handle(generator.throw(error))
            );
          }

          try {
            return handle(generator.next());
          } catch (error) {
            return Promise.reject(error);
          }
        };
      }
    },

    /**
     * Return the localized SIM name for multi-SIM scenario or empty string for
     * single-SIM scenario
     * @param {Number} iccId Integrate circuit card identity for SIM.
     * @return {Promise} Return the async translation result like SIM1 or SIM2
     *  (locale dependent) depending on the iccId or empty string for single-sim
     *  scenario.
     */
    getSimNameByIccId(iccId) {
      var index = Settings.getServiceIdByIccId(iccId);

      if (index === null) {
        return Promise.resolve('');
      }

      return navigator.mozL10n.formatValue('sim-id-label', { id: index + 1 });
    }
  };

  exports.Utils = Utils;

}(this));
