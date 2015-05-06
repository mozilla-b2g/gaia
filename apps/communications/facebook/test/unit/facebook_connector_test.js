/* globals MockFbQuery, MockOauthflow*/
'use strict';

require('/shared/js/contacts/import/facebook/fb_contact_utils.js');
require('/shared/js/fb/fb_reader_utils.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/import/facebook/fb_contact.js');
require('/shared/js/contacts/import/facebook/facebook_connector.js');
requireApp('communications/facebook/test/unit/mock_fb_graph_data.js');
requireApp('communications/facebook/test/unit/mock_fb_query.js');
requireApp('communications/contacts/test/unit/mock_oauthflow.js');

var realFbUtils,
    realOauthflow,
    subject;

if (!window.FacebookConnector) {
  window.FacebookConnector = null;
}

if (!window.fb) {
  window.fb = null;
}

if (!window.oauthflow) {
  window.oauthflow = null;
}

suite('Facebook Connector Tests', function() {
  suiteSetup(function() {
    realFbUtils = window.fb.utils;
    window.fb.utils = MockFbQuery;

    subject = window.FacebookConnector;

    realOauthflow = window.oauthflow;
    window.oauthflow = MockOauthflow;
  });


  test('List all friends. Adapt data for showing', function(done) {
    subject.listAllContacts('fake_token', {
      success: function(data) {
        assert.isNotNull(data.data);
        assert.isTrue(Array.isArray(data.data));

        var theData = data.data[0];
        var adapted = subject.adaptDataForShowing(theData);

        assert.equal(adapted.givenName[0], 'Carlos Angel');
        assert.equal(adapted.familyName[0], 'Bureta');
        assert.equal(adapted.email1, 'ppburetaxyz@gmail.com');
        assert.equal(adapted.uid, 45677);
        done();
      }
    });
  });


  test('List all friends. Adapt Data for Saving', function(done) {
    subject.listAllContacts('fake_token', {
      success: function(data) {
        assert.isNotNull(data.data);
        assert.isTrue(Array.isArray(data.data));

        var theData = data.data[0];
        var adapted = subject.adaptDataForSaving(theData);

        assert.equal(adapted.givenName[0], 'Carlos Angel');
        assert.equal(adapted.familyName[0], 'Bureta');

        assert.equal(adapted.email[0].type[0], 'other');
        assert.equal(adapted.email[0].value, 'ppburetaxyz@gmail.com');

        assert.equal(adapted.tel[0].type[0], 'other');
        assert.equal(adapted.tel[0].value, '+34609274801');

        assert.equal(adapted.fbInfo.org[0], 'Telefonica');

        assert.equal(adapted.fbInfo.adr[0].type[0], 'home');
        assert.equal(adapted.fbInfo.adr[0].locality, 'Valladolid');
        assert.equal(adapted.fbInfo.adr[0].region, 'Castilla y Leon');
        assert.equal(adapted.fbInfo.adr[0].countryName, 'Spain');

        assert.equal(adapted.fbInfo.adr[1].type[0], 'current');
        assert.equal(adapted.fbInfo.adr[1].locality, 'Greater London');
        assert.equal(adapted.fbInfo.adr[1].region, 'London');
        assert.equal(adapted.fbInfo.adr[1].countryName, 'United Kingdom');

        assert.equal(adapted.fbInfo.bday.getMonth(), 11);
        assert.equal(adapted.fbInfo.bday.getDate(), 3);
        done();
      }
    });
  });


  suiteTeardown(function() {
    window.fb.utils = realFbUtils;
    window.oauthflow = realOauthflow;
  });
});
