/* globals GmailConnector, MockGoogleEntry, MockGoogleEntryInvalidDate,
    MockGoogleEntryNoName, MockGoogleGroups, MockGoogleListing, MockRest */

'use strict';

requireApp('communications/gmail/js/gmail_connector.js');
requireApp('communications/gmail/test/unit/mock_contact1.js');
requireApp('communications/gmail/test/unit/mock_listing.js');
requireApp('communications/gmail/test/unit/mock_rest.js');
requireApp('communications/gmail/test/unit/mock_groups.js');

if (!window.Rest) {
  window.Rest = null;
}

suite('Gmail Connector', function() {

  var subject,
      END_POINT = 'https://www.google.com/m8/feeds/contacts/' +
        'default/full/?max-results=10000',
      GROUP_ID = 'https://www.google.com/m8/feeds/groups/' +
        'mepartoconmigo%40gmail.com/base/6';

  suiteSetup(function() {
    subject = GmailConnector;
    window.Rest = MockRest;
  });

  suiteTeardown(function() {
    window.Rest = null;
  });

  suite('Parsing', function() {
    test('Check contacts listing from feed', function(done) {
      var callbacks = {
        'success': function onSuccess(result) {
          assert.isNotNull(result);
          assert.isNotNull(result.data);
          assert.length(result.data, 2);
          done();
        },
        'error': function onError(error) {
          assert.fail('We were no suppose to get an error',
            'We got an error while get');
        },
        'timeout': function onTimeout(to) {
          assert.fail('We were no suppose to get a timeout',
            'We got a timeout while get');
        }
      };

      var contactsListUrl = END_POINT + '&group=' + GROUP_ID;
      var restConfigure = {
        'type': 'success',
        'https://www.google.com/m8/feeds/groups/default/full/': MockGoogleGroups
      };
      restConfigure[contactsListUrl] = MockGoogleListing;
      window.Rest.configure(restConfigure);

      subject.listAllContacts('123456789', callbacks);
    });

    test('Parse for display', function() {
      var contact = subject.gContactToJson(MockGoogleEntry);
      var result = subject.adaptDataForShowing(contact);

      assert.isNotNull(result);
      assert.equal(result.uid,
                   'http://www.google.com/m8/feeds/contacts/' +
                   'mepartoconmigo%40gmail.com/base/2fc27a388c2bd974');
      assert.deepEqual(result.givenName, ['My']);
      assert.deepEqual(result.familyName, ['Contact']);
      assert.equal(result.email1, 'juan@palomo.es');
    });

    test('Parse for display without name', function() {
      var contact = subject.gContactToJson(MockGoogleEntryNoName);
      var result = subject.adaptDataForShowing(contact);

      assert.isNotNull(result);
      assert.equal(result.uid,
                   'http://www.google.com/m8/feeds/contacts/' +
                   'mepartoconmigo%40gmail.com/base/2fc27a388c2bd974');
      assert.deepEqual(result.givenName, '+1555111333444222');
      assert.equal(result.email1, 'juan@palomo.es');
    });

    test('Parse for display with invalid birthday date', function() {
      var contact = subject.gContactToJson(MockGoogleEntryInvalidDate);
      var result = subject.adaptDataForShowing(contact);

      assert.isNotNull(result);
      assert.equal(result.uid,
                   'http://www.google.com/m8/feeds/contacts/' +
                   'mepartoconmigo%40gmail.com/base/2fc27a388c2bd974');
      assert.isUndefined(result.bday);
    });

    test('Parse for saving', function() {
      var contact = subject.gContactToJson(MockGoogleEntry);
      var result = subject.adaptDataForSaving(contact);

      assert.isNotNull(result);
      assert.isNotNull(result.givenName);
      assert.length(result.givenName, 1);
      assert.equal(result.givenName[0], 'My');

      assert.isNotNull(result.familyName);
      assert.length(result.familyName, 1);
      assert.equal(result.familyName[0], 'Contact');

      assert.isNotNull(result.email);
      assert.length(result.email, 2);
      assert.equal('juan@palomo.es', result.email[0].value);
      assert.equal('home', result.email[0].type);
      assert.equal('workemail@email.com', result.email[1].value);
      assert.equal('work', result.email[1].type);

      assert.isNotNull(result.adr);
      assert.length(result.adr, 1);
      assert.equal('This is the Street', result.adr[0].streetAddress);
      assert.equal('The City', result.adr[0].locality);
      assert.equal('The State', result.adr[0].region);
      assert.equal('The Zip', result.adr[0].postalCode);
      assert.equal('The Country', result.adr[0].countryName);

      assert.isNotNull(result.tel);
      assert.length(result.tel, 1);
      assert.equal('+1555111333444222', result.tel[0].value);
      assert.equal('work', result.tel[0].type);

      assert.isNotNull(result.org);
      assert.length(result.org, 1);
      assert.equal('The Company', result.org[0]);

      assert.isNotNull(result.jobTitle);
      assert.length(result.jobTitle, 1);
      assert.equal('Title in Company', result.jobTitle[0]);

      assert.isNotNull(result.bday);
      assert.deepEqual(new Date('1990-01-01'), result.bday);

      assert.isNotNull(result.note);
      assert.length(result.note, 1);
      assert.equal('This is a Note', result.note[0]);

      assert.isNotNull(result.category);
      assert.length(result.category, 1);
      assert.equal('gmail', result.category[0]);

      assert.isNotNull(result.url);
      assert.length(result.url, 1);
      assert.length(result.url[0].type, 1);
      assert.equal('source', result.url[0].type[0]);
      assert.equal('urn:service:gmail:uid:' +
        'http://www.google.com/m8/feeds/contacts/' +
        'mepartoconmigo%40gmail.com/base/2fc27a388c2bd974',
        result.url[0].value);
    });

    test('Parse for saving without name', function() {
      var contact = subject.gContactToJson(MockGoogleEntryNoName);
      var result = subject.adaptDataForSaving(contact);

      assert.isNotNull(result);
      assert.isTrue(!result.givenName);
      assert.isTrue(!result.familyName);

      assert.isNotNull(result.email);
      assert.length(result.email, 2);
      assert.equal('juan@palomo.es', result.email[0].value);
      assert.equal('home', result.email[0].type);
      assert.equal('workemail@email.com', result.email[1].value);
      assert.equal('work', result.email[1].type);

      assert.isNotNull(result.adr);
      assert.length(result.adr, 1);
      assert.equal('This is the Street', result.adr[0].streetAddress);
      assert.equal('The City', result.adr[0].locality);
      assert.equal('The State', result.adr[0].region);
      assert.equal('The Zip', result.adr[0].postalCode);
      assert.equal('The Country', result.adr[0].countryName);

      assert.isNotNull(result.tel);
      assert.length(result.tel, 1);
      assert.equal('+1555111333444222', result.tel[0].value);
      assert.equal('work', result.tel[0].type);

      assert.isNotNull(result.org);
      assert.length(result.org, 1);
      assert.equal('The Company', result.org[0]);

      assert.isNotNull(result.jobTitle);
      assert.length(result.jobTitle, 1);
      assert.equal('Title in Company', result.jobTitle[0]);

      assert.isNotNull(result.bday);
      assert.deepEqual(new Date('1990-01-01'), result.bday);

      assert.isNotNull(result.note);
      assert.length(result.note, 1);
      assert.equal('This is a Note', result.note[0]);

      assert.isNotNull(result.category);
      assert.length(result.category, 1);
      assert.equal('gmail', result.category[0]);

      assert.isNotNull(result.url);
      assert.length(result.url, 1);
      assert.length(result.url[0].type, 1);
      assert.equal('source', result.url[0].type[0]);
      assert.equal('urn:service:gmail:uid:' +
        'http://www.google.com/m8/feeds/contacts/' +
        'mepartoconmigo%40gmail.com/base/2fc27a388c2bd974',
        result.url[0].value);

    });

    test('Parse for saving with invalid birthday date', function() {
      var contact = subject.gContactToJson(MockGoogleEntryInvalidDate);
      var result = subject.adaptDataForSaving(contact);

      assert.isNotNull(result);
      assert.isNotNull(result.givenName);
      assert.length(result.givenName, 1);
      assert.equal(result.givenName[0], 'My');

      assert.isNotNull(result.familyName);
      assert.length(result.familyName, 1);
      assert.equal(result.familyName[0], 'Contact');

      assert.isNotNull(result.email);
      assert.length(result.email, 2);
      assert.equal('juan@palomo.es', result.email[0].value);
      assert.equal('home', result.email[0].type);
      assert.equal('workemail@email.com', result.email[1].value);
      assert.equal('work', result.email[1].type);

      assert.isNotNull(result.adr);
      assert.length(result.adr, 1);
      assert.equal('This is the Street', result.adr[0].streetAddress);
      assert.equal('The City', result.adr[0].locality);
      assert.equal('The State', result.adr[0].region);
      assert.equal('The Zip', result.adr[0].postalCode);
      assert.equal('The Country', result.adr[0].countryName);

      assert.isNotNull(result.tel);
      assert.length(result.tel, 1);
      assert.equal('+1555111333444222', result.tel[0].value);
      assert.equal('work', result.tel[0].type);

      assert.isNotNull(result.org);
      assert.length(result.org, 1);
      assert.equal('The Company', result.org[0]);

      assert.isNotNull(result.jobTitle);
      assert.length(result.jobTitle, 1);
      assert.equal('Title in Company', result.jobTitle[0]);

      assert.isUndefined(result.bday);

      assert.isNotNull(result.note);
      assert.length(result.note, 1);
      assert.equal('This is a Note', result.note[0]);

      assert.isNotNull(result.category);
      assert.length(result.category, 1);
      assert.equal('gmail', result.category[0]);

      assert.isNotNull(result.url);
      assert.length(result.url, 1);
      assert.length(result.url[0].type, 1);
      assert.equal('source', result.url[0].type[0]);
      assert.equal('urn:service:gmail:uid:' +
        'http://www.google.com/m8/feeds/contacts/' +
        'mepartoconmigo%40gmail.com/base/2fc27a388c2bd974',
        result.url[0].value);
    });
  });
});
