/* global ContactToVcard, ContactToVcardBlob, MockContactAllFields,
          MocksHelper, mozContact */

'use strict';

require('/shared/test/unit/mocks/mock_moz_contact.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/contact2vcard.js');
require('/shared/js/setImmediate.js');

var mocksHelperForContact2vcard = new MocksHelper([
  'mozContact'
]).init();

suite('mozContact to vCard', function() {
  function contains(vcard) {
    return function(str) {
      return vcard.toLowerCase().indexOf(str.toLowerCase()) !== -1;
    };
  }

  var b64 = 'R0lGODlhEAAQAMQfAKxoR8VkLxFw1feVPITSWv+eQv7Qo0Cc6OyIN/v7+3PLTSCZ' +
    'EFy17Wa6XuT1x2bGQ3nNUU6vRXPAa9mLXMTkwJZEHJt7LL5aJ/z8/O2KONx3L/ubP/r6+rtV' +
    'I////////yH5BAEAAB8ALAAAAAAQABAAAAWD4CeOZDlimOitnvlhXefFiyCs3NkZMe9QDMGi' +
    'k3t1BgZDIcZgHCCxHAyxKRQmnYOkoYgaNYMNr3JoEB6dDBGmyWxihwNBgVZz2Js3YB+JWNpr' +
    'HW15YgA2FxkaRB8JgoQxHQEbdiKNg4R5iYuVgpcZmkUjHDEapYqbJRyjkKouoqqhIyEAOw==';

  mocksHelperForContact2vcard.attachTestHelpers();

  suite('mozContact to vCard', function() {
    test('Convert a single contact to a vcard', function(done) {
      var mc = new MockContactAllFields();
      var contacts = [mc];
      var str = '';
      var count = 0;

      ContactToVcard([mc], function append(vcards, nCards) {
        str += vcards;
        count += nCards;
      }, function success() {
        done(function() {
          var _contains = contains(str);

          assert.equal(count, contacts.length);
          assert.ok(_contains('fn:pepito grillo'));
          assert.ok(_contains('n:grillo;pepito;green;mr.;;'));
          assert.ok(_contains('nickname:pg'));
          assert.ok(_contains('category:favorite'));
          assert.ok(_contains('org:test org'));
          assert.ok(_contains('title:sr. software architect'));
          assert.ok(_contains('note:note 1'));
          assert.ok(_contains('bday:1970-01-01T00:00:00Z'));
          assert.ok(_contains('photo:data:image/gif;base64,' + b64));
          assert.ok(_contains('email;type=home:test@test.com'));
          assert.ok(_contains('email;type=work,pref:test@work.com'));
          assert.ok(_contains('tel;type=cell,pref:+346578888888'));
          assert.ok(_contains('tel;type=home:+3120777777'));
          assert.ok(_contains('adr;type=home,pref:;;gotthardstrasse 22;' +
                              'chemnitz;chemnitz;09034;germany'));
          assert.ok(!_contains('url;type=fb_profile_photo:https://abcd1.jpg'));
        });
      });
    });

    test('Convert multiple contacts to a vcard', function(done) {
      var mc = new MockContactAllFields();
      var contacts = [mc, mc];
      var str = '';
      var count = 0;

      ContactToVcard(contacts, function(vcards, nCards) {
        str += vcards;
        count += nCards;
      }, function success() {
        done(function() {
          var _contains = contains(str);

          assert.equal(count, contacts.length);
          assert.ok(_contains('fn:pepito grillo'));
          assert.ok(_contains('n:grillo;pepito;green;mr.;;'));
          assert.ok(_contains('nickname:pg'));
          assert.ok(_contains('category:favorite'));
          assert.ok(_contains('org:test org'));
          assert.ok(_contains('title:sr. software architect'));
          assert.ok(_contains('note:note 1'));
          assert.ok(_contains('bday:1970-01-01T00:00:00Z'));
          assert.ok(_contains('photo:data:image/gif;base64,' + b64));
          assert.ok(_contains('email;type=home:test@test.com'));
          assert.ok(_contains('tel;type=cell,pref:+346578888888'));
          assert.ok(_contains('tel;type=home:+3120777777'));
          assert.ok(_contains('adr;type=home,pref:;;gotthardstrasse 22;' +
                              'chemnitz;chemnitz;09034;germany'));
          assert.ok(!_contains('url;type=fb_profile_photo:https://abcd1.jpg'));
        });
      }, b64.length / 2); // This ensures at least two batches
    });

    test('Convert an empty contact to a vcard', function(done) {
      var contacts = [new mozContact()];
      var str = '';
      var count = 0;

      ContactToVcard(contacts, function append(vcards, nCards) {
        str += vcards;
        count += nCards;
      }, function success() {
        done(function() {
          assert.equal(count, contacts.length);
          assert.strictEqual(str, '');
        });
      });
    });

    test('Convert contact to vcard blob', function(done) {
      var mc = new MockContactAllFields();
      var contacts = [mc];
      var str = '';
      var count = 0;

      ContactToVcardBlob(contacts, function(blob) {
        assert.isNotNull(blob);
        assert.equal('text/vcard', blob.type);

        // Fetch the same content as a normal vcard
        ContactToVcard(contacts, function append(vcards, nCards) {
          str += vcards;
          count += nCards;
        }, function success() {
          // Read the content and verify that is what we generate
          var reader = new FileReader();

          reader.addEventListener('loadend', function() {
            var blobContent = reader.result;

            done(function() {
              // Size and content of the blob should match that of the string
              assert.equal(str.length, blob.size);
              assert.equal(str, blobContent);
            });
          });
          reader.readAsText(blob);
        });
      });
    });
  });
});
