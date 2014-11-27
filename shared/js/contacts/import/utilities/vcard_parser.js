/* global contacts, LazyLoader, utils, Rest, MimeMapper */
/* exported VCFReader */

'use strict';

function parseDataUri(str) {
  var re = /^data:(.+);(charset=([^;]+))?;?base64,(.*)$/;
  var matches = re.exec(str);

  if (matches) {
    return {
      mime: matches[1],
      charset: matches[3],
      value: matches[4]
    };
  }
  return null;
}

function ensureMimeType(type) {
  type = type.toLowerCase();
  if (!MimeMapper.isSupportedType(type)) {
    type = MimeMapper.guessTypeFromExtension(type) || type;
  }
  return type || '';
}

/**
* Given a string, expected to be in base64 format, an a
* content type, returns the corresponding Blob.
* If cannot be parsed, will return undefined.
*
* @param {string} data as a string.
* @param {string} content type of the expected blob. Can be null.
* @param {int} size of the slice to be parsed.
*/
function b64toBlob(b64Data, contentType, sliceSize) {
  if (!b64Data) {
    console.error('No b64 data provided to convert to blob.');
    return;
  }

  contentType = contentType || '';
  sliceSize = sliceSize || 1024;

  function charCodeFromCharacter(c) {
    return c.charCodeAt(0);
  }

  var blob;
  try {
    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      var slice = byteCharacters.slice(offset, offset + sliceSize);
      var byteNumbers = [];
      for (var i = 0, l = slice.length; i < l; i++) {
        byteNumbers.push(charCodeFromCharacter(slice[i]));
      }
      var byteArray = new Uint8Array(byteNumbers);

      byteArrays.push(byteArray);
    }

    blob = new Blob(byteArrays, {type: contentType});
  } catch (e) {
    console.error('Error parsing base64 data');
  }
  return blob;
}

var VCFReader = (function _VCFReader() {
  var ReBasic = /^([^:]+):(.+)$/;
  var ReTuple = /([a-zA-Z]+)=(.+)/;
  var WHITE_SPACE = ' ';

  // Default tel type class
  var DEFAULT_PHONE_TYPE = 'other';

  //  basic type vcard to mobile type
  var VCARD_SIMPLE_TYPES = {
    'fax' : 'faxOther',
    'faxother' : 'faxOther',
    'home' : 'home',
    'internet' : 'internet',
    'cell' : 'mobile',
    'pager' : 'pager',
    'personal' : 'home',
    'pref' : 'pref',
    'text' : 'text',
    'textphone' : 'textphone',
    'voice' : 'voice',
    'work' : 'work'
  };

  // complex type vcard to mobile type
  var VCARD_COMPLEX_TYPES = {
    'fax,work' : 'faxOffice',
    'fax,home' : 'faxHome',
    'voice,work' : 'work',
    'voice,home' : 'home'
  };

  var REST_TIMEOUT = 5000;

  function _parseTuple(p) {
    var match = p.match(ReTuple);
    return match ? [match[1].toLowerCase(), match[2]] : ['type', p];
  }

  /**
   * Parses a line and creates an object with the line type (name), its meta
   * properties and its actual value.
   *
   * @param {string} line Line to be parsed from a VCF.
   * @return {{key: string, data: {meta, value}}}
   * @private
   */
  function _parseLine(line) {
    var parsed = ReBasic.exec(line);
    if (!parsed) {
      return null;
    }

    // `tuples` is an array containing all the extra properties
    var tuples = parsed[1].split(/[;,]/);
    var fieldName = tuples.shift().toLowerCase();
    // Value will be an empty array if there is only whitespace and
    // semi-colons.
    var fieldValue = /[^\s;]/.test(parsed[2]) ? parsed[2].split(';') : [];
    var meta = {
      type: []
    };

    var len = tuples.length;
    for (var i = 0; i < len; i++) {
      var tuple = _parseTuple(tuples[i]);
      if (tuple[0] === 'type') {
        meta.type.push(tuple[1]);
      } else {
        meta[tuple[0]] = tuple[1];
      }
    }

    // If this is a photo, we correct the value and type
    if (fieldName === 'photo') {
      if (meta.type.length) {
        meta.type = ensureMimeType(meta.type[0]);
      }

      fieldValue = parsed[2];
      // vCard 3.0 expects a mandatory encoding = 'b' parameter for base64
      // encoded images, and vCard 2.1 expects a 'BASE64' one.
      if (meta.encoding && (meta.encoding.toLowerCase() === 'b' ||
         meta.encoding.toLowerCase() === 'base64')) {
        meta.encoding = 'base64';
      } else {
        var parsedUri = parseDataUri(fieldValue);
        if (parsedUri) {
          meta.type = ensureMimeType(parsedUri.mime);
          meta.encoding = 'base64';
          fieldValue = parsedUri.value;
        }
      }
    }

    return {
      key: fieldName,
      data: {
        meta: meta,
        value: fieldValue
      }
    };
  }

  /**
   * Parse vCard entries split by lines and pass the converted object back to
   * the main thread.
   *
   * @param {string[][]} cardArray Array of array of strings representing vcard.
   * @param {function} cb Callback to call on finishe.
   */
  var _parseEntries = function(cardArray, cb) {
    var parsedCards = [];

    function sendIfFinished(contactObj) {
      parsedCards.push(contactObj);
      if (parsedCards.length === cardArray.length) {
        cb(parsedCards);
      }
    }

    for (var i = 0; i < cardArray.length; i++) {
      var lines = cardArray[i];
      // If there is no array of strings at cardArray[i] (representing a single
      // vcard), push a null value to account for a processed card.
      if (!lines) {
        sendIfFinished(null);
        continue;
      }

      var fields = {};
      var len = lines.length;

      for (var j = 0; j < len; j++) {
        var line = lines[j];
        var parsedLine = _parseLine(line);
        if (!parsedLine) {
          continue;
        }

        if (!fields[parsedLine.key]) {
          fields[parsedLine.key] = [];
        }

        fields[parsedLine.key].push(parsedLine.data);
      }

      // If there isn't either a First Name (fn) or a Name (n) this card is not
      // a valid one, ignore.
      if (!fields.fn && !fields.n) {
        sendIfFinished(null);
        continue;
      }

      vcardToContact(fields, sendIfFinished);
    }
  };

  /**
   * Matches Quoted-Printable characters in a string
   * @type {RegExp}
   */
  var qpRegexp = /=([a-zA-Z0-9]{2})/g;

  /**
   * Decodes a string encoded in Quoted-Printable format.
   * @param {string} str String to be decoded.
   * @return {string}
   */
  var _decodeQuoted = function(str) {
    return decodeURIComponent(
      str.replace(qpRegexp, '%$1'));
  };

  /**
   * Decodes Quoted-Printable encoding into UTF-8
   * http://en.wikipedia.org/wiki/Quoted-printable
   *
   * @param {object} metaObj Checks for 'encoding' key to be quoted printable.
   * @param {string} value String to be decoded.
   * @return {string}
   */
  function _decodeQP(metaObj, value) {
    var isQP = metaObj && metaObj.encoding &&
      (/quoted-printable/i).test(metaObj.encoding);

    if (isQP) {
      value = _decodeQuoted(value);
    }

    return value;
  }

  var NAME_PARTS = [
    'familyName',
    'givenName',
    'additionalName',
    'honorificPrefix',
    'honorificSuffix'
  ];

  /**
   * Takes an object with vCard properties and a mozContact object and returns
   * the latter with the computed name fields properly filled, inferred from
   * `vcardObj`.
   *
   * @param {Object} vcardObj
   * @param {Object} contactObj a mozContact to be filled with name fields.
   * @return {Object}
   */
  function _processName(vcardObj, contactObj) {
    // Set First Name right away as the 'name' property
    if (vcardObj.fn && vcardObj.fn.length) {
      var fnMeta = vcardObj.fn[0].meta;
      var fnValue = vcardObj.fn[0].value[0];
      // For the name field, we want the data as it is
      contactObj.name = [_decodeQP(fnMeta, fnValue)];
    }

    if (vcardObj.n && vcardObj.n.length) {
      var values = vcardObj.n[0].value;
      var meta = vcardObj.n[0].meta;

      for (var i = 0; i < values.length; i++) {
        var namePart = values[i];
        if (namePart && NAME_PARTS[i]) {
          // For the rest of the fields, we want to keep the merged data
          // separated the same way, in different positions of the array.
          // see bug 981674
          contactObj[NAME_PARTS[i]] = _decodeQP(meta, namePart).split(',');
        }
      }

      // If we don't have a contact name at this point, make `name` be the
      // unification of all the name parts.
      if (!contactObj.name) {
        contactObj.name = [_decodeQP(meta, values.join(' ').trim())];
      }
    }
    contactObj.givenName = contactObj.givenName || contactObj.name;
    return contactObj;
  }

  var ADDR_PARTS = [null, null, 'streetAddress', 'locality', 'region',
    'postalCode', 'countryName'
  ];

  /**
   * Takes an object with vCard properties and a mozContact object and returns
   * the latter with the computed address fields properly filled, inferred from
   * `vcardObj`.
   *
   * @param {Object} vcardObj
   * @param {Object} contactObj a mozContact to be filled with name fields.
   * @return {Object}
   */
  function _processAddr(vcardObj, contactObj) {
    if (!vcardObj.adr) {
      return contactObj;
    }

    contactObj.adr = [];
    for (var i = 0; i < vcardObj.adr.length; i++) {
      var cur = {};
      var adr = vcardObj.adr[i];
      if (adr.meta && adr.meta.type) {
        cur.type = adr.meta.type;
      }

      for (var j = 2; j < adr.value.length; j++) {
        var decoded = _decodeQP(adr.meta, adr.value[j]);
        // Because of adding empty fields while parsing the vCard
        // merging contacts sometimes doesn't work as expected
        // Check Bug 935636 for reference
        if (decoded !== '') {
          cur[ADDR_PARTS[j]] = decoded;
        }
      }

      contactObj.adr.push(cur);
    }
    return contactObj;
  }

  /**
   * Takes an object with vCard properties and a mozContact object and returns
   * the latter with the computed phone, email and url fields properly filled,
   * inferred from `vcardObj`.
   *
   * @param {Object} vcardObj
   * @param {Object} contactObj a mozContact to be filled with name fields.
   * @return {Object}
   */
  function _processComm(vcardObj, contactObj) {
    contactObj.tel = [];

    ['tel', 'email', 'url'].forEach(function field2field(field) {
      if (!vcardObj[field]) {
        return;
      }

      var len = vcardObj[field].length;
      var hasTypeMapper = function(x) {
        return x.trim().toLowerCase();
      };
      var notTypeMapper = function(v, key) {
        return v.meta[key].trim().toLowerCase();
      };
      var noType = function(field) {
        return field !== 'type';
      };
      var noPref = function(field) {
        return field !== 'pref';
      };
      var typeFilter = function(metaValue) {
        return !!VCARD_SIMPLE_TYPES[metaValue];
      };

      for (var i = 0; i < len; i++) {
        var v = vcardObj[field][i];
        var metaValues;
        var cur = {};

        if (v.meta) {
          if (v.value) {
            cur.value = _decodeQP(v.meta, v.value[0]);
            cur.value = cur.value.replace(/^tel:/i, '');
          }

          if (v.meta.type) {
            metaValues = ([].slice.call(v.meta.type)).map(hasTypeMapper);
          } else {
            metaValues = Object.keys(v.meta).filter(noType).map(
              notTypeMapper.bind(null, v));
          }

          if (metaValues.indexOf('pref') !== -1) {
            cur.pref = true;
            metaValues = metaValues.filter(noPref);
          }

          /*
          * metaValues is an array of types. If metaValues length is:
          *   0: it returns the default type (No type was defined),
          *   1: If the element matches a simple type, returns the simple type,
          *     if not, it returns the default type
          *   2: If the elements match a complex type, it returns the complex
          *    type. If not, then try to match the elements with a simple type,
          *    in order. If one of the elements matches a simple type, it
          *    returns the first element that matches a simple type or if there
          *    exists no matching, it returns the default type value.
          *   otherwise --> Returns the first element that matches a simple type
          *    or if there exists no matching, it returns the default type value
          * */
          switch (metaValues.length) {
            case 0:
              cur.type = [DEFAULT_PHONE_TYPE];
              break;
            case 1:
              cur.type = [VCARD_SIMPLE_TYPES[metaValues[0]] ||
                          DEFAULT_PHONE_TYPE];
              break;
            case 2:
              var complexType1 = metaValues[0] + ',' + metaValues[1];
              var complexType2 = metaValues[1] + ',' + metaValues[0];
              cur.type = [VCARD_COMPLEX_TYPES[complexType1] ||
                          VCARD_COMPLEX_TYPES[complexType2] ||
                          VCARD_SIMPLE_TYPES[metaValues[0]] ||
                          VCARD_SIMPLE_TYPES[metaValues[1]] ||
                          DEFAULT_PHONE_TYPE];
              break;
            default:
              cur.type = [
                VCARD_SIMPLE_TYPES[metaValues.filter(typeFilter).shift()] ||
                DEFAULT_PHONE_TYPE
              ];
          }
        }

        if (!contactObj[field]) {
          contactObj[field] = [];
        }

        contactObj[field].push(cur);
      }
    });
    return contactObj;
  }

  function _isValidDate(dateValue) {
    return !isNaN(Date.parse(dateValue));
  }

  function _processFields(vcardObj, contactObj) {
    ['org', 'title', 'bday', 'anniversary'].forEach(function(field) {
      if (!vcardObj[field]) {
        return;
      }

      var v = vcardObj[field][0];

      var dateValue;
      if (field === 'bday') {
        dateValue = v.value[0];
        if (_isValidDate(dateValue)) {
          contactObj.bday = new Date(dateValue);
        }
        return;
      }

      if (field === 'anniversary') {
        dateValue = v.value[0];
        if (_isValidDate(dateValue)) {
          contactObj.anniversary = new Date(dateValue);
        }
        return;
      }

      if (!v) {
        return;
      }

      if (field === 'title') {
        field = 'jobTitle';
      }

      switch (typeof v) {
        case 'object':
          contactObj[field] = [_decodeQP(v.meta, v.value[0])];
          break;
        case 'string':
          contactObj[field] = [v];
          break;
      }
    });
    return contactObj;
  }

  function _processPhoto(vcardObj, contactObj, cb) {
    if (!Array.isArray(vcardObj.photo) ||
      vcardObj.photo.length === 0 ||
      !vcardObj.photo[0] ||
      !vcardObj.photo[0].value) {
      return cb(contactObj);
    }

    var photo = vcardObj.photo[0];
    var photoContents = photo.value.trim();
    if (!photoContents) {
      return cb(contactObj);
    }
    if (photoContents && photo.meta && photo.meta.encoding === 'base64') {
      var blob = b64toBlob(photoContents, photo.meta.type);
      if (blob) {
        utils.thumbnailImage(blob, function gotThumbnail(thumbnail) {
          if (blob !== thumbnail) {
            contactObj.photo = [blob, thumbnail];
          } else {
            contactObj.photo = [blob];
          }
          cb(contactObj);
        });
      } else {
        cb(contactObj);
      }
    }
    // Else we assume it is a http url
    else {
      var callbacks = {
        success: function(blobPic) {
          if (blobPic) {
            contactObj.photo = [blobPic];
          }
          cb(contactObj);
        },
        error: function() {
          console.error('Error getting photo for contact');
          cb(contactObj);
        },
        timeout: function() {
          console.error('Timeout getting photo for contact');
          cb(contactObj);
        }
      };
      Rest.get(photoContents, callbacks, {
        responseType: 'blob',
        operationsTimeout: REST_TIMEOUT
      });
    }
  }

  /**
   * Converts a parsed vCard to a mozContact.
   *
   * @param {Object} vcard JSON representation of an vCard.
   * @param {Function} cb Function to call with the resulting moxContact object
   * @return {Object, null} An object implementing mozContact interface.
   */
  var vcardToContact = function(vcard, cb) {
    if (!vcard) {
      return null;
    }

    var obj = {};
    _processName(vcard, obj);
    _processAddr(vcard, obj);
    _processComm(vcard, obj);
    _processFields(vcard, obj);

    _processPhoto(vcard, obj, function(contactObj) {
      cb(utils.misc.toMozContact(contactObj));
    });
  };

  /**
   * Class used to parse vCard files (http://tools.ietf.org/html/rfc6350).
   *
   * @param {String} contents vCard formatted text.
   * @constructor
   */
  var VCFReader = function(contents) {
    this.contents = contents;
    this.processed = 0;
    this.finished = false;
    this.currentChar = 0;

    this.numDupsMerged = 0;
  };

  // Number of contacts processed at a given time.
  VCFReader.CONCURRENCY = 5;

  /**
   * Used to stop contact processing.
   */
  VCFReader.prototype.finish = function() {
    this.finished = true;
  };

  /**
   * Starting point of vcard processing.
   * @param {function} cb Function to call after the process is finished.
   */
  VCFReader.prototype.process = function(cb) {
    /**
     * Calculate the total amount of contacts to be imported. This number could
     * change in case there are vcards with syntax errors or that our processor
     * can't parse.
     */
    var self = this;

    var match = this.contents.match(/end:vcard/gi);
    // If there are no matches, then this probably isn't a vcard and we should
    // stop processing.
    if (!match) {
      if (cb) {
        cb();
      }
      return;
    }

    this.importedContacts = [];
    this.total = match.length;
    this.onread && this.onread(this.total);
    this.ondone = function(numImported) {
      cb(numImported, self.numDupsMerged);
    };

    LazyLoader.load(['/shared/js/simple_phone_matcher.js',
      '/shared/js/mime_mapper.js',
      '/shared/js/contact_photo_helper.js',
      '/shared/js/contacts/import/utilities/misc.js',
      '/shared/js/contacts/contacts_matcher.js',
      '/shared/js/contacts/contacts_merger.js',
      '/shared/js/contacts/utilities/image_thumbnail.js',
      '/shared/js/contacts/merger_adapter.js',
      '/shared/js/contacts/utilities/http_rest.js'
    ], function() {
      // Start processing the text
      // The data pump flows as follows:
      //  1) splitlines() reads char-by-char to split the text into lines
      //  2) each line is parsed to parseEntries() when we have accumulated
      //     enough lines to represent CONCURRENCY cards.
      //  3) call post() for each contact found by parseEntries()
      //  4) perform matching for each contact
      //  5) save the contact if appropriate
      //  6) call onParsed() which either goes back to (4) for the next contact
      //     or goes back to (1) to get the next set of lines
      //
      // Note: The async callbacks in the matching and mozContacts.save() code
      // prevent this code from being purely recursive.
      this.splitLines();
    }.bind(this));
  };

  /**
   * Called when every contact is effectively saved.
   *
   * @param {Error} err Error object in case there was one.
   * @param {mozContact} ct Contact that has been just saved.
   */
  VCFReader.prototype.onParsed = function(err, ct) {
    this.processed += 1;
    this.importedContacts.push(ct);

    this.onimported && this.onimported(ct && ct.name);
    if (this.finished || this.processed === this.total) {
      this.ondone(this.importedContacts);
      return;
    }

    var processed = this.processed;
    if (processed < this.total && processed % VCFReader.CONCURRENCY === 0) {
      this.splitLines();
    }
  };

  /**
   * This will be called every time we manage to process a contact
   * @param {object[]} contactObjects Objects with contact structure.
   */
  VCFReader.prototype.post = function(contactObjects) {
    var _onParsed = this.onParsed.bind(this);
    var cursor = 0;
    var self = this;

    function afterSave(ct, e) {
      _onParsed(e, ct);

      cursor += 1;
      if (cursor < contactObjects.length) {
        saveContact(contactObjects[cursor]);
      }
    }

    function saveContact(ct) {
      if (!ct) {
        afterSave(null, null);
        return;
      }

      var contact = utils.misc.toMozContact(ct);
      var afterSaveFn = afterSave.bind(null, contact);
      var matchCbs = {
        onmatch: function(matches) {
          var callbacks = {
            success: function(mergedContact) {
              self.numDupsMerged++;
              afterSave(mergedContact, null);
            },
            error: afterSaveFn
          };
          contacts.adaptAndMerge(contact, matches, callbacks);
        },

        onmismatch: function() {
          VCFReader._save(contact, afterSaveFn);
        }
      };
      contacts.Matcher.match(contact, 'passive', matchCbs);
    }

    saveContact(contactObjects[cursor]);
  };

  /**
   * Saves a single raw entry into the phone contacts
   *
   * @param {Object} item represents a single vCard entry.
   * @param {Function} cb Callback.
   */
  VCFReader._save = function(item, cb) {
    var req = navigator.mozContacts.save(utils.misc.toMozContact(item));
    req.onsuccess = cb;
    req.onerror = cb;
  };

  var reBeginCard = /begin:vcard$/i;
  var reEndCard = /end:vcard$/i;
  var reVersion = /^VERSION:([\d\.]*)/i;

  /**
   * Splits vcard text into arrays of lines (one for each vcard field) and
   * sends an array of arrays of lines over to process.
   */
  VCFReader.prototype.splitLines = function() {
    var currentLine = '';
    var currentVersion = 0;
    var inLabel = false;
    var multiline = false;

    var cardArray = [
      []
    ];

    /**
     * Number of cards processed. Quite faster than looking at `cardArray`
     * length.
     * @type {number}
     */
    var cardsProcessed = 0;

    // We start at the last cursor position
    var i = this.currentChar;

    var callPost = this.post.bind(this);

    for (var l = this.contents.length; i < l; i++) {
      this.currentChar = i;
      var ch = this.contents[i];
      if (currentVersion >= 4 && ch === '"') {
        inLabel = !inLabel;
        currentLine += ch;
        continue;
      }

      // Ignore beginning whitespace that indicates multiline field.
      if (multiline === true) {
        if ((/[\r\t\s\n]/).test(ch)) {
          continue;
        } else {
          //currentLine += '\n'
          multiline = false;
        }
      }

      var next = this.contents[i + 1];
      if (inLabel || (ch !== '\n' && ch !== '\r')) {
        // If we have a quoted-printable sign for multiline (/=\n/) AND
        // we are not in a data URI field, ignore the character.
        if (!(/^PHOTO/i).test(currentLine) && ch === '=' && next &&
            next.search(/(\r|\n)/) !== -1) {
          multiline = true;
          continue;
        }
        currentLine += ch;

        // Continue only if this is not the last char in the string
        if (i !== l - 1) {
          continue;
        }
      }

      // If the field is a photo, the field could be multiline, to know if the
      // following line is part of the photo, we must check if the first char
      // of the following line is a space.
      var firstCharNextLine = this.contents[i + 2];
      if ((firstCharNextLine === WHITE_SPACE) && (/[\r\t\s\n]/).test(next) &&
        (/^PHOTO/i).test(currentLine)) {
          multiline = true;
          continue;
      }

      // At this point, we know that ch is a newline, and in the vcard format,
      // if we have a space after a newline, it indicates multiline field.
      if (next && (next === WHITE_SPACE || next === '\t')) {
        multiline = true;
        continue;
      }

      if (reBeginCard.test(currentLine)) {
        currentLine = '';
        currentVersion = 0;
        continue;
      }

      // If the current line indicates the end of a card,
      if (reEndCard.test(currentLine)) {
        cardsProcessed += 1;

        if (cardsProcessed === VCFReader.CONCURRENCY ||
          (cardsProcessed + this.processed) === this.total) {
          _parseEntries(cardArray, callPost);
          break;
        }

        currentLine = '';

        cardArray.push([]);

        continue;
      }

      if (currentLine) {
        var matches = reVersion.exec(currentLine);
        if (matches === null) {
          cardArray[cardArray.length - 1].push(currentLine);
        } else {
          currentVersion = parseFloat(matches[1] || '0');
        }
      }
      currentLine = '';
    }
  };

  VCFReader._decodeQuoted = _decodeQuoted;
  VCFReader.processAddr = _processAddr;
  VCFReader.processName = _processName;
  VCFReader.vcardToContact = vcardToContact;

  //Expose some utility methods
  VCFReader.utils = {
    parseDataUri: parseDataUri,
    b64toBlob: b64toBlob
  };

  return VCFReader;
})();
