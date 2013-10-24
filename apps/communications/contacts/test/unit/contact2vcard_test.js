'use strict';

require('/shared/test/unit/mocks/mock_moz_contact.js');
require('/shared/test/unit/mocks/mock_contact_all_fields.js');
require('/shared/js/contact2vcard.js');

var mocksHelperForContact2vcard = new MocksHelper([
  'mozContact'
]).init();

suite('mozContact to vCard', function() {
  function contains(vcard) {
    return function(str) {
      return vcard.toLowerCase().indexOf(str.toLowerCase()) !== -1;
    }
  }

  var b64 = 'R0lGODlhEAAQAMQfAKxoR8VkLxFw1feVPITSWv+eQv7Qo0Cc6OyIN/v7+3PLTSCZ' +
    'EFy17Wa6XuT1x2bGQ3nNUU6vRXPAa9mLXMTkwJZEHJt7LL5aJ/z8/O2KONx3L/ubP/r6+rtV' +
    'I////////yH5BAEAAB8ALAAAAAAQABAAAAWD4CeOZDlimOitnvlhXefFiyCs3NkZMe9QDMGi' +
    'k3t1BgZDIcZgHCCxHAyxKRQmnYOkoYgaNYMNr3JoEB6dDBGmyWxihwNBgVZz2Js3YB+JWNpr' +
    'HW15YgA2FxkaRB8JgoQxHQEbdiKNg4R5iYuVgpcZmkUjHDEapYqbJRyjkKouoqqhIyEAOw==';

  mocksHelperForContact2vcard.attachTestHelpers();

  suite('mozContact to vCard', function() {
    test('ISO Date conversion', function(done) {
      var d1 = new Date('December 17, 1995 13:24:00 +2');
      assert.strictEqual(ISODateString(d1), '1995-12-17T11:24:00Z');

      var d2 = new Date('January 02, 1981 9:24:00 +4');
      assert.strictEqual(ISODateString(d2), '1981-01-02T05:24:00Z');
      done();
    });

    test('Convert a single contact to a vcard', function(done) {
      var mc = new MockContactAllFields();
      ContactToVcard([mc], function(vcard) {
        assert.ok(vcard);

        var _contains = contains(vcard);
        assert.ok(_contains('fn:pepito grillo'));
        assert.ok(_contains('n:grillo;pepito;green;mr.;;'));
        assert.ok(_contains('nickname:pg'));
        assert.ok(_contains('category:favorite'));
        assert.ok(_contains('org:test org'));
        assert.ok(_contains('title:sr. software architect'));
        assert.ok(_contains('note:note 1'));
        assert.ok(_contains('bday:1970-01-01'));
        assert.ok(_contains('photo:data:image/gif;base64,' + b64));
        assert.ok(_contains('email;type=personal:test@test.com'));
        assert.ok(_contains(
          'email;type=personal;type=work,pref:test@work.com'));
        assert.ok(_contains('tel;type=cell,pref:+346578888888'));
        assert.ok(_contains('tel;type=cell,pref;type=home:+3120777777'));
        assert.ok(_contains('adr;type=home,pref:;;gotthardstrasse 22;' +
                            'chemnitz;chemnitz;09034;germany'));
        assert.ok(!_contains('url;type=fb_profile_photo:https://abcd1.jpg'));
        done();
      });
    });

    test('Convert multiple contacts to a vcard', function(done) {
      var mc = new MockContactAllFields();
      ContactToVcard([mc, new mozContact()], function(vcard) {
        assert.ok(vcard);

        var _contains = contains(vcard);
        assert.ok(_contains('fn:pepito grillo'));
        assert.ok(_contains('n:grillo;pepito;green;mr.;;'));
        assert.ok(_contains('nickname:pg'));
        assert.ok(_contains('category:favorite'));
        assert.ok(_contains('org:test org'));
        assert.ok(_contains('title:sr. software architect'));
        assert.ok(_contains('note:note 1'));
        assert.ok(_contains('bday:1970-01-01'));
        assert.ok(_contains('photo:data:image/gif;base64,' + b64));
        assert.ok(_contains('email;type=personal:test@test.com'));
        assert.ok(_contains(
          'email;type=personal;type=work,pref:test@work.com'));
        assert.ok(_contains('tel;type=cell,pref:+346578888888'));
        assert.ok(_contains('tel;type=cell,pref;type=home:+3120777777'));
        assert.ok(_contains('adr;type=home,pref:;;gotthardstrasse 22;' +
                            'chemnitz;chemnitz;09034;germany'));

        done();
      });
    });

    test('Convert an empty contact to a vcard', function(done) {
      ContactToVcard([new mozContact], function(vcard) {
        assert.strictEqual(vcard, null);
        done();
      });
    });

    test('Convert contact to vcard blob', function(done) {
      var contact = new MockContactAllFields();
      ContactToVcardBlob([contact], function(blob) {
        assert.isNotNull(blob);
        assert.equal('text/vcard', blob.type);
        // Fetch the same content as a normal vcard
        ContactToVcard([contact], function(vcard) {
          // Size of blob in bytes should be the length of the string
          assert.equal(vcard.length, blob.size);
          // Read the content and verify that is what we generate
          var reader = new FileReader();
          reader.addEventListener('loadend', function() {
            var blobContent = reader.result;
            assert.equal(blobContent, vcard);
            done();
          });
          reader.readAsText(blob);
        });
      });
    });
  });
});
