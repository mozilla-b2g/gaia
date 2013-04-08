'use strict';

/**
 * Class used to parse vCard files.
 *
 * @param {String} contents vCard formatted text.
 * @constructor
 */
var VCFReader = function(contents) {
  this.contents = contents;
  this.processedContacts = [];
};

/**
 * Does a very simple parse of the entries in the vCard string, returning an
 * array of entries, still in raw text form.
 * @return {String[]}
 */
VCFReader.prototype.read = function() {
  try {
    this.rawContacts = this.rawContacts || this.contents
      .split('END:VCARD')
      .filter(function(v) { return !!v && v.search(/^\s+$/); });

    if (typeof this.onread === 'function')
      this.onread(this.rawContacts.length);
  } catch (e) {
    if (typeof this.onerror === 'function')
      this.onerror(this.rawContacts.length);
  }
  return this.rawContacts;
};

VCFReader.prototype.process = function() {
  if (!this.rawContacts)
    this.read();

  var self = this;
  var contacts = this.rawContacts;
  return new Future(function(resolver) {
    if (contacts.length === 0) {
      resolver.resolve([]);
    }

    var contactArray = contacts
      .map(VCFReader.parseSingleEntry)
      .filter(function(v) { return !!v; });

    // The check about all the contact promises being resolved should be done in
    // the future with the `Future.every` method. Unfortunately this method is
    // not currently included in the shim
    function addContact(ct) {
      if (typeof self.onimported === 'function')
        self.onimported();

      self.processedContacts.push(ct);
      if (self.checkIfCompleted()) {
        resolver.resolve(self.processedContacts);
      }
    }

    contactArray.forEach(function(ct) {
      self._read(ct).then(addContact, addContact).done();
    });
  });
};

/**
 * Checks if all the contacts have been processed by comparing them to the
 * initial number of entries in the vCard
 * @return {Boolean}
 */
VCFReader.prototype.checkIfCompleted = function() {
  return this.processedContacts.length === this.rawContacts.length;
};
/**
 * Saves a single raw entry into `Contacts`
 *
 * @param {Object} entry represents a single vCard entry.
 * @return {Future} Future representation of the saved item.
 */
VCFReader.prototype._read = function(entry) {
  return new Future(function(resolver) {
    window.setTimeout(function() {
      var item = VCFReader.vcardToContact(entry);
      item.givenName = item.name;
      var req = navigator.mozContacts.save(item);
      req.onsuccess = function onsuccess() {
        if (typeof self.onimported === 'function')
          window.setTimeout(self.onimported, 0);

        resolver.resolve(item);
      };
      req.onerror = function onerror() {
        resolver.reject('SDCard Import: Error importing ' + item.id);
      };
    }, 0);
  });
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

  var contactObj = { name: [vcard.fn || vcard.n], adr: [], tel: [] };
  if (vcard.fn) {
    contactObj.name = vcard.fn;
  }
  else if (vcard.n) {
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

    contactObj.name = nameStruct.join(' ');
  }

  // Convert Address field
  var adrConverter = [null, null,
    'streetAddress',
    'locality',
    'region',
    'postalCode',
    'countryName'];

  vcard.adr && vcard.adr.forEach(function(adr) {
    var cur = { type: adr && adr.meta && adr.meta.type };

    for (var i = 2; i < adr.value.length; i++)
      cur[adrConverter[i]] = adr.value[i];

    contactObj.adr.push(cur);
  });


  function field2field(field) {
    vcard[field] && vcard[field].forEach(function(v) {
      var cur = { type: '', value: v.value && v.value[0] };
      var meta = Object.keys(v.meta).map(function(key) { return v.meta[key]; });

      if (meta.indexOf('pref') > -1 || meta.indexOf('PREF') > -1)
        cur.type = 'PREF';
      else
        cur.type = meta[0]; // Take only the first meta type

      if (!contactObj[field]) { contactObj[field] = []; }
      contactObj[field].push(cur);
    });
  }

  (['tel', 'photo', 'email', 'url']).forEach(field2field);

  return contactObj;
};

/**
 * Parses a single vCard entry
 *
 * @param {string} input A valid VCF string.
 * @return {object} JSON representation of the VCF input.
 */
VCFReader.parseSingleEntry = function(input) {
  var Re1 = /^(version|fn|title|org):(.+)$/i;
  var Re2 = /^([^:;]+);([^:]+):(.+)$/;
  var ReKey = /item\d{1,2}\./;
  var fields = {};

  function parseTuple(p, i) {
    var match = p.match(/([a-z]+)=(.*)/i);
    return match ?
      [match[1].toLowerCase(), match[2]] : ['type' + (i === 0 ? '' : i), p];
  }

  input.split(/\r\n|\r|\n/).forEach(function(line) {
    var results, key;

    if (Re1.test(line)) {
      results = line.match(Re1);
      key = results[1].toLowerCase();
      fields[key] = results[2];
    }
    else if (Re2.test(line)) {
      results = line.match(Re2);
      key = results[1].replace(ReKey, '').toLowerCase();

      var meta = {};
      results[2].split(';')
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

  return fields;
};

