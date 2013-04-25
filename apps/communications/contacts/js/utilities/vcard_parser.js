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
    this.rawContacts = this.contents
      .split('END:VCARD')
      .map(VCFReader.parseSingleEntry)
      .filter(function(v) { return !!v; });
    this.onread && this.onread(this.rawContacts.length);
  } catch (e) {
    this.onerror && this.onerror(e);
    return;
  }

  var allDone = false;
  var self = this;

  var finalContacts = [];
  this.validContacts = this.rawContacts.length;
  this.rawContacts.forEach(function(ct) { this.save(ct, onParsed); }, this);
  function onParsed(err, ct) {
    self.onimported && self.onimported();

    self.processedContacts += 1;
    finalContacts.push(ct);
    if (self.checkIfCompleted() && allDone === false) {
      cb(finalContacts);
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
  return this.processedContacts === this.validContacts;
};

/**
 * Saves a single raw entry into `Contacts`
 *
 * @param {Object} item represents a single vCard entry.
 * @param {Function} cb Callback.
 */
VCFReader.prototype.save = function(item, cb) {
  var req = navigator.mozContacts.save(item);
  req.onsuccess = function onsuccess() { cb(null, item); };
  req.onerror = function onerror(e) {
    cb('Error saving contact: ' + item.id);
  };
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

  var contactObj = { adr: [], tel: [] };
  if (vcard.fn) {
    contactObj.name = vcard.fn;
  }

  if (vcard.n) {
    var nameStruct = vcard.n[0].value;
    var nameConverter = [
      'familyName',
      'givenName',
      'additionalName',
      'honorificPrefix',
      'honorificSuffix'
    ];

    nameStruct && nameStruct.forEach(function(namePart, i) {
      if (namePart && nameConverter[i]) {
        contactObj[nameConverter[i]] = namePart;
      }
    });

    contactObj.name = contactObj.name || nameStruct.join(' ');
  }
  contactObj.givenName = contactObj.givenName || contactObj.name;


  (['org', 'photo', 'title']).forEach(function(field) {
    if (vcard[field]) {
      var v = vcard[field][0];
      if (typeof v === 'object') {
        contactObj[field] = v.value;
      } else if (typeof v === 'string') {
        if (field === 'title') field = 'jobTitle';
        contactObj[field] = [v];
      }
    }
  });

  // Convert Address field
  var adrConverter = [null, null, 'streetAddress', 'locality',
    'region', 'postalCode', 'countryName'];

  vcard.adr && vcard.adr.forEach(function(adr) {
    var cur = { type: adr && adr.meta && adr.meta.type };

    for (var i = 2; i < adr.value.length; i++)
      cur[adrConverter[i]] = adr.value[i];

    contactObj.adr.push(cur);
  });

  (['tel', 'email', 'url']).forEach(function field2field(field) {
    vcard[field] && vcard[field].forEach(function(v) {
      var cur = { type: '', value: v.value && v.value[0] }, meta;
      if (v.meta) {
        meta = Object.keys(v.meta).map(function(key) { return v.meta[key]; });
        if (meta.indexOf('pref') > -1 || meta.indexOf('PREF') > -1)
          cur.type = 'PREF';
        else
          cur.type = meta[0]; // Take only the first meta type
      }

      if (!contactObj[field])
        contactObj[field] = [];

      contactObj[field].push(cur);
    });
  });

  return contactObj;
};


VCFReader.Re1 = /^\s*(version|fn|title|org)\s*:(.+)$/i;
VCFReader.Re2 = /^([^:;]+);([^:]+):(.+)$/;
VCFReader.ReKey = /item\d{1,2}\./;
VCFReader.ReTuple = /([a-z]+)=(.*)/i;

/**
 * Parses a single vCard entry
 *
 * @param {string} input A valid VCF string.
 * @return {object, null} JSON representation of the VCF input.
 */
VCFReader.parseSingleEntry = function(input) {
  if (!input) return null;

  function parseTuple(p, i) {
    var match = p.match(VCFReader.ReTuple);
    return match ?
      [match[1].toLowerCase(), match[2]] : ['type' + (i === 0 ? '' : i), p];
  }

  var fields = {};
  // When a line starts with a whitespace it means it is a continuation of the
  // previous line. We join them here.
  input = input.replace(/(\r\n|\r|\n)[^\S\n\r]+/g, '');

  var lines = input.split(/\r\n|\r|\n/);
  lines.forEach(function(line) {
    var results, key;

    if (VCFReader.Re1.test(line)) {
      results = line.match(VCFReader.Re1);
      key = results[1].toLowerCase().trim();
      fields[key] = [results[2]];
    }
    else if (VCFReader.Re2.test(line)) {
      results = line.match(VCFReader.Re2);
      key = results[1].replace(VCFReader.ReKey, '').toLowerCase().trim();

      var meta = {};
      results[2].split(/(;|,)/)
        .map(parseTuple)
        .forEach(function(p) { meta[p[0]] = p[1]; });

      if (!fields[key])
        fields[key] = [];

      fields[key].push({
        meta: meta,
        value: results[3].split(';')
      });
    }
  });

  if (!fields.fn && !fields.n) {
    return null;
  }

  return VCFReader.vcardToContact(fields);
};

