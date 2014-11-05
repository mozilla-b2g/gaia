'use strict';
/* global MocksHelper, MockMozL10n, utils, MockMatcher, MockMozContacts */

require('/shared/js/contacts/import/utilities/import_from_vcard.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_moz_contact.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');

requireApp('communications/contacts/test/unit/mock_contacts_match.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_vcard_reader.js');
requireApp('communications/contacts/test/unit/mock_file_reader.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('/shared/test/unit/mocks/mock_moz_contact.js');

if (!window._) {
  window._ = null;
}

if (!window.utils) {
  window.utils = null;
}

var mocksHelperForImportVcard = new MocksHelper([
  'LazyLoader',
  'mozContact',
  'Contacts',
  'VCardReader',
  'ConfirmDialog',
  'FileReader'
]).init();

var vcardSingle = 'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Gump;F=C3=B3rrest\n' +
  'ORG;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:B=C3=B3bba Gump Shrimp Co.\n' +
  'TITLE;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Shr=C3=B3mp Man\n' +
  'PHOTO;GIF:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;WORK;VOICE:(111) 555-1212\n' +
  'TEL;HOME;VOICE:(404) 555-1212\n' +
  'ADR;WORK;ENCODING=QUOTED-PRINTABLE:;;100 W=C3=A1ters Edge;Baytown;LA;' +
  '30314;United States of America\n' +
  'LABEL;WORK;ENCODING=QUOTED-PRINTABLE:100 Waters Edge=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'ADR;HOME:;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'LABEL;HOME;ENCODING=QUOTED-PRINTABLE:42 Plantation St.=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'EMAIL;PREF;INTERNET:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD';

var vcardMultiple = 'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Gump;F=C3=B3rrest\n' +
  'ORG;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:B=C3=B3bba Gump Shrimp Co.\n' +
  'TITLE;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Shr=C3=B3mp Man\n' +
  'PHOTO;GIF:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;WORK;VOICE:(111) 555-1212\n' +
  'TEL;HOME;VOICE:(404) 555-1212\n' +
  'ADR;WORK;ENCODING=QUOTED-PRINTABLE:;;100 W=C3=A1ters Edge;Baytown;LA;' +
  '30314;United States of America\n' +
  'LABEL;WORK;ENCODING=QUOTED-PRINTABLE:100 Waters Edge=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'ADR;HOME:;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'LABEL;HOME;ENCODING=QUOTED-PRINTABLE:42 Plantation St.=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'EMAIL;PREF;INTERNET:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD' +
  'BEGIN:VCARD\n' +
  'VERSION:2.1\n' +
  'N;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Gump;F=C3=B3rrest\n' +
  'ORG;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:B=C3=B3bba Gump Shrimp Co.\n' +
  'TITLE;ENCODING=QUOTED-PRINTABLE;CHARSET=utf-8:Shr=C3=B3mp Man\n' +
  'PHOTO;GIF:http://www.example.com/dir_photos/my_photo.gif\n' +
  'TEL;WORK;VOICE:(111) 555-1212\n' +
  'TEL;HOME;VOICE:(404) 555-1212\n' +
  'ADR;WORK;ENCODING=QUOTED-PRINTABLE:;;100 W=C3=A1ters Edge;Baytown;LA;' +
  '30314;United States of America\n' +
  'LABEL;WORK;ENCODING=QUOTED-PRINTABLE:100 Waters Edge=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'ADR;HOME:;;42 Plantation St.;Baytown;LA;30314;United States of America\n' +
  'LABEL;HOME;ENCODING=QUOTED-PRINTABLE:42 Plantation St.=0D=0ABaytown, ' +
  'LA 30314=0D=0AUnited States of America\n' +
  'EMAIL;PREF;INTERNET:forrestgump@example.com\n' +
  'REV:20080424T195243Z\n' +
  'END:VCARD';

var vcardError = 'error';

var contact1 = {
      id: '0'
    };

suite('Import from vcard', function() {
  var realMozL10n,
      real_,
      realStatus,
      realMatcher,
      realOverlay;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    real_ = window._;
    window._ = navigator.mozL10n.get;

    realStatus = window.utils.status;
    realOverlay = window.utils.overlay;

    navigator.mozContacts = MockMozContacts;
    sinon.stub(navigator.mozContacts, 'find', function mockMozContactsFind() {
      var self = this;
      var req = {
        set onsuccess(cb) {
          req.result = self.contacts;
          cb();
        },
        set onerror(cb) {},
      };
      return req;
    });

    window.contacts = window.contacts || {};
    realMatcher = window.contacts.Matcher;
    window.contacts.Matcher = MockMatcher;

    window.utils.overlay = {
      total: 0,
      show: function() {
        return this;
      },
      hide: function() {},
      showMenu: function() {},
      update: function() {},
      setClass: function() {},
      setTotal: function(n) {
        this.total = n;
      },
      setHeaderMsg: function() {}
    };

    window.utils.status = {
      show: function() {}
    };

    mocksHelperForImportVcard.suiteSetup();
  });

  setup(function() {
    window.utils.overlay.total = 0;
    navigator.mozContacts.contacts = [];
    mocksHelperForImportVcard.setup();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    window._ = real_;
    window.contacts.Matcher = realMatcher;
    window.utils.status = realStatus;
    window.utils.overlay = realOverlay;
    mocksHelperForImportVcard.suiteTeardown();
  });

  test('Import single contact', function(done) {
    utils.importFromVcard(vcardSingle, function(numberOfContacts, id) {
      assert.equal(id, contact1.id, 'return id of the contact imported');
      assert.equal(window.utils.overlay.total, 1);
      done();
    });
  });

  test('Import multiple contacts', function(done) {
    utils.importFromVcard(vcardMultiple, function(numberOfContacts, id) {
      assert.equal(id, contact1.id, 'returns id of the first contact imported');
      assert.equal(window.utils.overlay.total, 2);
      done();
    });
  });

  test('Error while importing', function(done) {
    utils.importFromVcard(vcardError, function(numberOfContacts, id) {
      assert.isUndefined(id, 'returns no id as there was an error');
      assert.equal(window.utils.overlay.total, 0);
      done();
    });
  });

});
