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
  var allDone = false;
  this.totalContacts = rawContacts.length;
  rawContacts.forEach(function(ct) { VCFReader.save(ct, onParsed); });

  function onParsed(err, ct) {
    self.onimported && self.onimported();

    self.processedContacts += 1;
    if (self.checkIfCompleted() && allDone === false) {
      cb(rawContacts);
      allDone = true;
    }
  }
};

/**
 * Checks if all the contacts have been processed by comparing them to the
 * initial number of entries in the vCard
 * @return {Boolean} return true if processed, false otherwise.
 */
VCFReader.prototype.checkIfCompleted = function() {
  return this.processedContacts === this.totalContacts;
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
        if (v.value) {
          cur.value = VCFReader.decodeQP(v.meta, v.value[0]);
          cur.value = cur.value.replace(/^tel:/i, '');
        }

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

VCFReader.ReBasic = /^([^:]+):(.+)$/i;
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
  if (!VCFReader.ReBasic.test(line)) return null;

  var parsed = VCFReader.ReBasic.exec(line);
  var tuples = parsed[1].split(/[;,]/);
  var key = tuples.shift();
  var meta = {};

  tuples.forEach(function(l, i) {
    var tuple = VCFReader._parseTuple(l, i);
    meta[tuple[0]] = tuple[1];
  });

  return {
    key: key.toLowerCase(),
    data: {
      meta: meta,
      value: parsed[2].split(';')
    }
  };
};

VCFReader.splitLines = function(vcf) {
  var lines = [];
  var currentStr = '';
  var inLabel = false;
  for (var i = 0, l = vcf.length; i < l; i++) {
    if (vcf[i] === '"') {
      inLabel = !inLabel;
      currentStr += vcf[i];
      continue;
    }

    if (inLabel || vcf[i] !== '\n') {
      currentStr += vcf[i];
      continue;
    }

    var sub = vcf.substring(i + 1, vcf.length - 1);
    if (currentStr.toLowerCase().indexOf('label;') !== -1 &&
      sub.search(/^[^\n]+:/) === -1) {
      currentStr += vcf[i];
      continue;
    }

    if (sub.search(/^[^\S\n\r]+/) !== -1) {
      continue;
    }

    lines.push([currentStr]);
    currentStr = '';
  }
  return lines;
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
  var lines = VCFReader.splitLines(input);
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
