/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
  'use strict';
  var rdashes = /-(.)/g;
  var rmatcher = /\$\{([^}]+)\}/g;
  var rescape = /[.?*+^$[\]\\(){}|-]/g;
  var rentity = /[&<>"']/g;
  var rentities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;'
  };
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
        return Utils.date.format = new navigator.mozL10n.DateTimeFormat();
      }
    },
    updateTimeHeaders: function ut_updateTimeHeaders() {
      var headers = document.querySelectorAll('header[data-time-update]'),
          length = headers.length,
          i, ts, header, headerDate, formattedHour, newHeader;

      if (length) {
        for (i = 0; i < length; i++) {
          header = headers[i];
          ts = header.dataset.time;
          headerDate = Utils.getHeaderDate(ts);
          formattedHour = Utils.getFormattedHour(ts);

          // only date
          if (header.dataset.isThread) {
            newHeader = headerDate;

          // only time
          } else if (header.dataset.hourOnly) {
            newHeader = formattedHour;

          // date + time
          } else {
            newHeader = headerDate + ' ' + formattedHour;
          }

          if (newHeader !== header.textContent) {
            header.textContent = newHeader;
          }
        }
      }

      FixedHeader.updateHeaderContent();
    },
    startTimeHeaderScheduler: function ut_startTimeHeaderScheduler() {
      var updateFunction = (function() {
        this.updateTimeHeaders();
        var now = Date.now(),
            nextTimeout = new Date(now + 60000);
        nextTimeout.setSeconds(0);
        nextTimeout.setMilliseconds(0);
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(updateFunction,
          nextTimeout.getTime() - now);
      }).bind(this);
      updateFunction();
    },
    escapeRegex: function ut_escapeRegex(str) {
      if (typeof str !== 'string') {
        return '';
      }
      return str.replace(rescape, '\\$&');
    },
    escapeHTML: function ut_escapeHTML(str) {
      if (typeof str !== 'string') {
        return '';
      }
      return str.replace(rentity, function(s) {
        return rentities[s];
      });
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
      this.date.shared.setTime(+time);
      var _ = navigator.mozL10n.get;
      var today = Utils.getDayDate(Date.now());
      var otherDay = Utils.getDayDate(time);
      var dayDiff = (today - otherDay) / 86400000;

      if (isNaN(dayDiff)) {
        return _('incorrectDate');
      }

      if (dayDiff < 0) {
        // future time
        return this.date.format.localeFormat(
          this.date.shared, _('shortDateTimeFormat')
        );
      }

      return dayDiff === 0 && _('today') ||
        dayDiff === 1 && _('yesterday') ||
        dayDiff < 4 && this.date.format.localeFormat(this.date.shared, '%A') ||
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
          if (contact.photo && contact.photo[0]) {
            details.photoURL = URL.createObjectURL(contact.photo[0]);
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
          if (details.name)
            break;
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

        if (tel.value && Utils.compareDialables(tel.value, input)) {
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
    compareDialables: function ut_compareDialables(a, b) {
      a = Utils.removeNonDialables(a).slice(-7);
      b = Utils.removeNonDialables(b).slice(-7);
      return a === b;
    },

    getResizedImgBlob: function ut_getResizedImgBlob(blob, limit, callback) {
      // Default image size limitation is set to 300KB for MMS user story.
      // If limit is not given or bigger than default 300KB, default value need
      // to be appied here for size checking.
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
      } else {
        var img = document.createElement('img');
        var url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = function onBlobLoaded() {
          var image_width = img.width;
          var image_height = img.height;
          var ratio = Math.sqrt(Math.ceil(blob.size / limit * 10) / 10);
          var target_width = image_width / ratio;
          var target_height = image_height / ratio;

          var canvas = document.createElement('canvas');
          canvas.width = target_width;
          canvas.height = target_height;
          var context = canvas.getContext('2d');

          context.drawImage(img, 0, 0, target_width, target_height);
          URL.revokeObjectURL(url);
          canvas.toBlob(callback, blob.type);
        };
      }
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
    */
    getContactDisplayInfo: function(resolver, phoneNumber, callback) {
      resolver(phoneNumber, function onContacts(contacts) {
        var contact;
        if (Array.isArray(contacts)) {
          if (contacts.length == 0) {
            callback(null);
            return;
          }
          contact = contacts[0];
        } else {
          if (contacts === null) {
            callback(null);
            return;
          }
          contact = contacts;
        }

        var tel = null;
        for (var i = 0; i < contact.tel.length && tel == null; i++) {
          if (contact.tel[i].value === phoneNumber) {
            tel = contact.tel[i];
          }
        }

        // Get the title in the standar way
        var details = Utils.getContactDetails(tel, contact);
        var info = Utils.getDisplayObject(details.title || null, tel);
        /*
          XXX: We need to move this to use a single point for
          formating:
          ${type}${separator}${carrier}${numberHTML}
        */
        info.display = info.type +
          info.separator +
          info.carrier +
          tel.value;

        callback(info);
      });
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
    }
  };

  var dummy = document.createElement('div');
  var priv = new WeakMap();

  function extract(node) {
    var nodeId;
    // Received an ID string? Find the appropriate node to continue
    if (typeof node === 'string') {
      nodeId = node;
      node = document.getElementById(node);
    } else if (node) {
      nodeId = node.id;
    }

    if (!node) {
      console.error('Can not find the node passed to Utils.Template', nodeId);
      return '';
    }

    // No firstChild means no comment node.
    if (!node.firstChild) {
      console.error(
        'Node passed to Utils.Template should have a comment node', nodeId);
      return '';
    }

    // Starting with the container node's firstChild...
    node = node.firstChild;

    do {
      // Check if it's the comment node that we're looking for...
      if (node.nodeType === Node.COMMENT_NODE) {
        return (node.nodeValue || '').trim();
      }
      // If the current child of the container node isn't
      // a comment node, it's likely a text node, so hop to
      // the nextSibling and repeat the operation.
    } while ((node = node.nextSibling));

    console.error(
      'Nodes passed to Utils.Template should have a comment node', nodeId);
    return '';
  }


  /**
   * Utils.Template
   *
   * Initialize a template instance from a string or node
   *
   * @param {String} idOrNode id string of existing node.
   *        {Object} idOrNode existing node.
   *
   */
  Utils.Template = function(idOrNode) {
    if (!(this instanceof Utils.Template)) {
      return new Utils.Template(idOrNode);
    }
    // Storing the extracted template string as a private
    // instance property prevents direct access to the
    // template once it's been initialized.
    priv.set(this, {
      tmpl: extract(idOrNode)
    });
  };

  /**
   * template.toString()
   *
   * Safe, read-only access to the template string
   *
   */
  Utils.Template.prototype.toString = function() {
    // Return a copy of the stored template string.
    return priv.get(this).tmpl.slice();
  };

  /**
   * template.interpolate
   *
   * Interpolate template string with values provided by
   * data object. Optionally allow properties to retain
   * HTML that is known to be safe.
   *
   * @param {Object} data     properties correspond to substitution.
   *                          - identifiers in template string.
   * @param {Object} options  optional.
   *                          - safe, a list of properties that contain
   *                          HTML that is known and are
   *                          "known" to ignore.
   */
  Utils.Template.prototype.interpolate = function(data, options) {
    // This _should_ be rewritten to use Firefox's support for ES6
    // default parameters:
    // ... = function(data, options = { safe: [] }) {
    //
    options = options || {};
    options.safe = options.safe || [];

    return priv.get(this).tmpl.replace(rmatcher, function(match, property) {
      property = property.trim();
      // options.safe is an array of properties that can be ignored
      // by the "suspicious" html strategy.
      return options.safe.indexOf(property) === -1 ?
        // Any field that is not explicitly listed as "safe" is
        // to be treated as suspicious
        Utils.escapeHTML(data[property]) :
        // Otherwise, return the string of rendered markup
        data[property];
    });
  };

  exports.Utils = Utils;

}(this));
