'use strict';

/**
 * Class used to parse vCard files.
 *
 * @param {String} contents vCard formatted text.
 * @constructor
 */
var VCFReader = function(contents) {
  this.contents = contents;
  this.processedContacts = 0;
  this.finished = false;
};

// It defines the number of contacts that are processsed in parallel
VCFReader.prototype.CHUNK_SIZE = 5;

VCFReader.prototype.finish = function() {
  this.finished = true;
};

VCFReader.prototype.process = function(cb) {
  try {
    var rawContacts = [];
    this.contents = this.contents.split('END:VCARD');
    this.contents.forEach(function(c) {
      var parsed = VCFReader.parseSingleEntry(c);
      if (parsed)
        rawContacts.push(parsed);
    });
    this.contents = null;
    this.onread && this.onread(rawContacts.length);
  } catch (e) {
    this.onerror && this.onerror(e);
    return;
  }

  var self = this;
  var total = rawContacts.length;

  function importContacts(from) {
    for (var i = from; i < from + self.CHUNK_SIZE && i < total; i++) {
      VCFReader.save(rawContacts[i], onParsed);
    }
  }

  importContacts(this.processedContacts);

  function onParsed(err, ct) {
    self.onimported && self.onimported();
    self.processedContacts += 1;

    if (self.processedContacts < total &&
        self.processedContacts % self.CHUNK_SIZE === 0) {
      // Batch finishes, next one...
      self.finished ? cb(rawContacts) : importContacts(self.processedContacts);
    } else if (self.processedContacts === total) {
      cb(rawContacts);
    }
  }
};

/**
 * Saves a single raw entry into `Contacts`
 *
 * @param {Object} item represents a single vCard entry.
 * @param {Function} cb Callback.
 */
VCFReader.save = function(item, cb) {
  var req = navigator.mozContacts.save(item);
  req.onsuccess = function onsuccess() { cb(null, item); };
  req.onerror = cb;
};

/**
 * Matches Quoted-Printable characters in a string
 * @type {RegExp}
 */
VCFReader._qpRegexp = /=([a-zA-Z0-9]{2})/g;

/**
 * Decodes a string encoded in Quoted-Printable format.
 * @param {string} str String to be decoded.
 * @return {string}
 */
VCFReader._decodeQuoted = function(str) {
  return decodeURIComponent(
    str.replace(VCFReader._qpRegexp, '%$1'));
};

/**
 * Decodes Quoted-Printable encoding into UTF-8
 * http://en.wikipedia.org/wiki/Quoted-printable
 *
 * @param {object} metaObj Checks for 'encoding' key to be quoted printable.
 * @param {string} value String to be decoded.
 * @return {string}
 */
VCFReader.decodeQP = function(metaObj, value) {
  var decoded = value;
  var isQP = metaObj && metaObj['encoding'] &&
    metaObj['encoding'].toLowerCase() === 'quoted-printable';

  if (isQP)
    decoded = VCFReader._decodeQuoted(decoded);

  return decoded;
};

VCFReader.nameParts = [
  'familyName',
  'givenName',
  'additionalName',
  'honorificPrefix',
  'honorificSuffix'
];

/**
 * Takes an object with vCard properties and a mozContact object and returns the
 * latter with the computed name fields properly filled, inferred from
 * `vcardObj`.
 *
 * @param {Object} vcardObj
 * @param {Object} contactObj a mozContact to be filled with name fields.
 * @return {Object}
 */
VCFReader.processName = function(vcardObj, contactObj) {
  var parts = VCFReader.nameParts;

  // Set First Name right away as the 'name' property
  if (vcardObj.fn && vcardObj.fn.length)
    contactObj.name = vcardObj.fn[0].value;

  if (vcardObj.n && vcardObj.n.length) {
    var values = vcardObj.n[0].value;
    var meta = vcardObj.n[0].meta;

    values.forEach(function(namePart, i) {
      if (namePart && parts[i])
        contactObj[parts[i]] = [VCFReader.decodeQP(meta, namePart)];
    });

    // If we don't have a contact name at this point, make `name` be the
    // unification of all the name parts.
    if (!contactObj.name)
      contactObj.name = [VCFReader.decodeQP(meta, values.join(' ').trim())];
  }
  contactObj.givenName = contactObj.givenName || contactObj.name;
  return contactObj;
};

VCFReader.addrParts = [null, null, 'streetAddress', 'locality', 'region',
  'postalCode', 'countryName'];

/**
 * Takes an object with vCard properties and a mozContact object and returns the
 * latter with the computed address fields properly filled, inferred from
 * `vcardObj`.
 *
 * @param {Object} vcardObj
 * @param {Object} contactObj a mozContact to be filled with name fields.
 * @return {Object}
 */
VCFReader.processAddr = function(vcardObj, contactObj) {
  if (!vcardObj.adr) return contactObj;

  var parts = VCFReader.addrParts;
  contactObj.adr = vcardObj.adr.map(function(adr) {
    var cur = {};
    if (adr.meta && adr.meta.type)
      cur.type = [adr.meta.type];

    for (var i = 2; i < adr.value.length; i++) {
      cur[parts[i]] = VCFReader.decodeQP(adr.meta, adr.value[i]);
    }

    return cur;
  });
  return contactObj;
};

/**
 * Takes an object with vCard properties and a mozContact object and returns the
 * latter with the computed phone, email and url fields properly filled,
 * inferred from `vcardObj`.
 *
 * @param {Object} vcardObj
 * @param {Object} contactObj a mozContact to be filled with name fields.
 * @return {Object}
 */
VCFReader.processComm = function(vcardObj, contactObj) {
  contactObj.tel = [];

  (['tel', 'email', 'url']).forEach(function field2field(field) {
    vcardObj[field] && vcardObj[field].forEach(function(v) {
      var metaValues;
      var cur = {};

      if (v.meta) {
        if (v.value)
          cur.value = VCFReader.decodeQP(v.meta, v.value[0]);

        metaValues = Object.keys(v.meta).map(function(key) {
          return v.meta[key];
        });

        if (metaValues.indexOf('pref') > -1 || metaValues.indexOf('PREF') > -1)
          cur.pref = true;

        if (v.meta.type)
          cur.type = [v.meta.type];
      }

      if (!contactObj[field])
        contactObj[field] = [];

      contactObj[field].push(cur);
    });
  });
  return contactObj;
};

VCFReader.processFields = function(vcardObj, contactObj) {
  (['org', 'title']).forEach(function(field) {
    if (!vcardObj[field]) return;

    var v = vcardObj[field][0];
    if (field === 'title') field = 'jobTitle';

    switch (typeof v) {
      case 'object':
        contactObj[field] = [VCFReader.decodeQP(v.meta, v.value[0])];
        break;
      case 'string':
        contactObj[field] = [v];
        break;
    }
  });
  return contactObj;
};

VCFReader.Re1 = /^\s*(version|fn|title|org)\s*:(.+)$/i;
VCFReader.Re2 = /^([^:;]+);?([^:]+)?:(.+)$/i;
VCFReader.ReKey = /item\d{1,2}\./;
VCFReader.ReTuple = /([a-z]+)=(.*)/i;

VCFReader._parseTuple = function(p, i) {
  var match = p.match(VCFReader.ReTuple);
  return match ?
    [match[1].toLowerCase(), match[2]] : ['type' + (i === 0 ? '' : i), p];
};

/**
 * Checks if a line is a 'complex' one, meaning that it has multiple values and
 * metadata.
 * @param {string} line Line to be parsed from a VCF.
 * @return {{key: string, data: {meta, value}}}
 * @private
 */
VCFReader.parseLine_ = function(line) {
  if (!VCFReader.Re2.test(line)) return null;
  var results = line.match(VCFReader.Re2);
  var key = results[1].replace(VCFReader.ReKey, '').toLowerCase().trim();

  var meta = {};
  if (results[2]) {
    results[2].split(/[;,]/).forEach(function(l, i) {
      var p = VCFReader._parseTuple(l, i);
      if (p)
        meta[p[0]] = p[1];
    });
  }

  return {
    key: key,
    data: {
      meta: meta,
      value: results[3].split(';')
    }
  };
};

/**
 * Parses a single vCard entry
 *
 * @param {string} input A valid VCF string.
 * @return {object, null} JSON representation of the VCF input.
 */
VCFReader.parseSingleEntry = function(input) {
  if (!input) return null;

  var fields = {};
  // When a line starts with a whitespace it means it is a continuation of the
  // previous line. We join them here.
  input = input.replace(/(\r\n|\r|\n)[^\S\n\r]+/g, '');

  var lines = input.split(/\r\n|\r|\n/);
  lines.forEach(function(line) {
    var parsedLine = VCFReader.parseLine_(line);
    if (parsedLine) {
      if (!fields[parsedLine.key])
        fields[parsedLine.key] = [];

      fields[parsedLine.key].push(parsedLine.data);
    }
  });

  if (!fields.fn && !fields.n)
    return null;

  return VCFReader.vcardToContact(fields);
};

/**
 * Converts a parsed vCard to a mozContact.
 *
 * @param {Object} vcard JSON representation of an vCard.
 * @return {Object, null} An object implementing mozContact interface.
 */
VCFReader.vcardToContact = function(vcard) {
  if (!vcard)
    return null;

  var obj = {};
  VCFReader.processName(vcard, obj);
  VCFReader.processAddr(vcard, obj);
  VCFReader.processComm(vcard, obj);
  VCFReader.processFields(vcard, obj);

  var contact = new mozContact();
  contact.init(obj);

  return contact;
};
