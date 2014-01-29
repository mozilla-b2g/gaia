/* global mozContact contacts LazyLoader */
'use strict';

var VCFReader = (function _VCFReader() {
  var ReBasic = /^([^:]+):(.+)$/;
  var ReTuple = /([a-zA-Z]+)=(.+)/;

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

    var tuples = parsed[1].split(/[;,]/);
    var key = tuples.shift();
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

    // Value will be an empty array if there is only whitespace and semi-colons.
    var value = /[^\s;]/.test(parsed[2]) ? parsed[2].split(';') : [];
    return {
      key: key.toLowerCase(),
      data: {
        meta: meta,
        value: value
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
    for (var i = 0; i < cardArray.length; i++) {
      var lines = cardArray[i];
      // If there is no array of strings at cardArray[i] (representing a single
      // vcard), push a null value to account for a processed card.
      if (!lines) {
        parsedCards.push(null);
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
        parsedCards.push(null);
        continue;
      }
      parsedCards.push(vcardToContact(fields));
    }

    cb(parsedCards);
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
      contactObj.name = [_decodeQP(fnMeta, fnValue)];
    }

    if (vcardObj.n && vcardObj.n.length) {
      var values = vcardObj.n[0].value;
      var meta = vcardObj.n[0].meta;

      for (var i = 0; i < values.length; i++) {
        var namePart = values[i];
        if (namePart && NAME_PARTS[i]) {
          contactObj[NAME_PARTS[i]] = [_decodeQP(meta, namePart)];
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
        cur[ADDR_PARTS[j]] = _decodeQP(adr.meta, adr.value[j]);
      }

      contactObj.adr.push(cur);
    }
    return contactObj;
  };
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
            metaValues = ([].slice.call(v.meta.type)).map(function(x) {
              return x.trim().toLowerCase();
            });
          } else {
            metaValues = Object.keys(v.meta).filter(
                function noType(field) {
                  return field !== 'type';
                }
              ).map(function(key) {
                return v.meta[key].trim().toLowerCase();
              });
          }

          if (metaValues.indexOf('pref') !== -1) {
            cur.pref = true;
            metaValues = metaValues.filter(
              function noPref(field) { return field !== 'pref'; }
            );
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
              var typeFilter = function(metaValue) {
                  return !!VCARD_SIMPLE_TYPES[metaValue];
              };
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

  function _processFields(vcardObj, contactObj) {
    ['org', 'title'].forEach(function(field) {
      if (!vcardObj[field]) {
        return;
      }

      var v = vcardObj[field][0];
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

  /**
   * Converts a parsed vCard to a mozContact.
   *
   * @param {Object} vcard JSON representation of an vCard.
   * @return {Object, null} An object implementing mozContact interface.
   */
  var vcardToContact = function(vcard) {
    if (!vcard) {
      return null;
    }

    var obj = {};
    _processName(vcard, obj);
    _processAddr(vcard, obj);
    _processComm(vcard, obj);
    _processFields(vcard, obj);

    return utils.misc.toMozContact(obj);
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
    this.totalParsed = 0;
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
    var match = this.contents.match(/end:vcard/gi);
    // If there are no matches, then this probably isn't a vcard and we should
    // stop processing.
    if (!match) {
      if (cb) {
        cb();
      }
      return;
    }
    this.total = match.length;
    this.onread && this.onread(this.total);
    this.ondone = cb;

    LazyLoader.load(['/shared/js/simple_phone_matcher.js',
      '/contacts/js/utilities/misc.js',
      '/contacts/js/contacts_matcher.js',
      '/contacts/js/contacts_merger.js',
      '/contacts/js/merger_adapter.js'
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
    this.onimported && this.onimported(ct && ct.name);
    if (this.finished || this.processed === this.total) {
      this.ondone(this.total);
      return;
    }

    var processed = this.processed;
    if (processed < this.total && processed % VCFReader.CONCURRENCY === 0) {
      this.totalParsed += processed;
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
            success: afterSaveFn,
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
  var reVersion = /^VERSION:/i;

  /**
   * Splits vcard text into arrays of lines (one for each vcard field) and
   * sends an array of arrays of lines over to process.
   */
  VCFReader.prototype.splitLines = function() {
    var currentLine = '';
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

    var self = this;
    var callPost = this.post.bind(this);

    for (var l = this.contents.length; i < l; i++) {
      this.currentChar = i;
      var ch = this.contents[i];
      if (ch === '"') {
        inLabel = !inLabel;
        currentLine += ch;
        continue;
      }

      // Ignore beginning whitespace that indicates multiline field.
      if (multiline === true) {
        if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
          continue;
        } else {
          //currentLine += '\n'
          multiline = false;
        }
      }

      var next = this.contents[i + 1];
      if (inLabel || (ch !== '\n' && ch !== '\r')) {
        // If we have a quoted-printable sign for multiline (/=\n/), ignore it.
        if (ch === '=' && next && next.search(/(\r|\n)/) !== -1) {
          multiline = true;
          continue;
        }

        currentLine += ch;

        // Continue only if this is not the last char in the string
        if (i !== l - 1) {
          continue;
        }
      }

      // At this point, we know that ch is a newline, and in the vcard format,
      // if we have a space after a newline, it indicates multiline field.
      if (next && (next === ' ' || next === '\t')) {
        multiline = true;
        continue;
      }

      if (reBeginCard.test(currentLine)) {
        currentLine = '';
        continue;
      }

      // If the current line indicates the end of a card,
      if (reEndCard.test(currentLine)) {
        cardsProcessed += 1;

        if (cardsProcessed === VCFReader.CONCURRENCY ||
          (cardsProcessed + this.totalParsed) === this.total) {
          _parseEntries(cardArray, callPost);
          break;
        }

        currentLine = '';

        cardArray.push([]);

        continue;
      }

      if (currentLine && !reVersion.test(currentLine)) {
        cardArray[cardArray.length - 1].push(currentLine);
      }
      currentLine = '';
    }
  };

  VCFReader._decodeQuoted = _decodeQuoted;
  VCFReader.processAddr = _processAddr;
  VCFReader.processName = _processName;
  VCFReader.vcardToContact = vcardToContact;

  return VCFReader;
})();
