/* global LazyLoader, ListController, ContactsService, MockL10n */
/* global  MockContactAllFields, MockConfirmDialog, ConfirmDialog, ParamUtils */

'use strict';

requireApp('communications/contacts/js/param_utils.js');
requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_action_menu.js');
requireApp('communications/contacts/views/list/js/list_controller.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/lazy_loader.js');

require('/shared/js/text_normalizer.js');
require('/shared/js/contact2vcard.js');
require('/shared/js/contacts/import/utilities/misc.js');

require('/shared/test/unit/mocks/mock_confirm_dialog.js');

require('/shared/test/unit/mocks/mock_contact_all_fields.js');



suite('ListController', function() {

  var realMozL10n;
  var mozContact;
  var stubLazyLoader;
  var stubContactServiceGet;
  var realConfirmDialog;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    ListController.init();

    realConfirmDialog = window.ConfirmDialog;
    window.ConfirmDialog = MockConfirmDialog;

    sinon.stub(LazyLoader, 'load', function(files, cb) {
      cb();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    realMozL10n = null;
    window.ConfirmDialog = realConfirmDialog;
    realConfirmDialog = null;
    LazyLoader.load.restore();
  });

  setup(function() {
    loadBodyHTML('/contacts/views/list/list.html');
    mozContact = new MockContactAllFields();
    stubContactServiceGet = this.sinon.stub(ContactsService, 'get',
                                              function(uuid, callback) {
                                                callback(mozContact);
                                              });
  });

  teardown(function() {
    stubLazyLoader = null;
    stubContactServiceGet = null;
    mozContact = null;
    ConfirmDialog.hide();
  });

  suite('Pick action', function() {
    var activity,
        result;

    setup(function() {
      activity = {
        source: {
          name: 'pick',
          data: {
            type: 'webcontacts/tel'
          }
        },
        postResult: function(response) {
          result = response;
        }
      };

      ListController.setActivity(activity);
    });

    teardown(function() {
      activity = {};
      result = {};
    });

    function dispatchPickEvent() {
      window.dispatchEvent(new CustomEvent('pickAction', {
        'detail': {
          'uuid': mozContact.id
        }
      }));
    }

    function checkContact() {
      var toCompare = result;
      if (result.contact) {
        toCompare = result.contact;
      }
      for (var prop in mozContact) {
        if (prop === 'photo' && toCompare[prop] && toCompare[prop][0]) {
          assert.equal(toCompare[prop][0].size, mozContact[prop][0].size);
          assert.equal(toCompare[prop][0].type, mozContact[prop][0].type);
        } else {
          assert.equal(JSON.stringify(toCompare[prop]),
                       JSON.stringify(mozContact[prop]));
        }
      }
    }

    test(' > must call pick when an event is received', function(done) {
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isTrue(stubContactServiceGet.calledOnce);
        done();
      });

      dispatchPickEvent();
    });

    test('text/vcard, 1 result', function(done) {
      activity.source.data.type = 'text/vcard';

      activity.postResult = function(response) {
        assert.equal(response.name, mozContact.givenName[0] + '_' +
                      mozContact.familyName[0] + '.vcf');
        assert.equal(response.blob.type, 'text/x-vcard; charset=utf-8');

        done();
      };

      dispatchPickEvent();
    });

    test('webcontacts/tel, 0 results', function(done) {
      activity.source.data.type = 'webcontacts/tel';
      mozContact.tel = [];
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isTrue(ConfirmDialog.showing);
        assert.isNull(ConfirmDialog.title);
        assert.equal(ConfirmDialog.text, 'no_contact_phones');
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/tel, 1 result', function(done) {
      activity.source.data.type = 'webcontacts/tel';
      // We want to test only with one phone, so erase the last one
      mozContact.tel.pop();
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        // Check if all the properties are the same
        mozContact = window.utils.misc.toMozContact(mozContact);
        checkContact();
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/tel, many results', function(done) {
      activity.source.data.type = 'webcontacts/tel';

      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        // Mock returns always the first option from the select, so we need
        // to compare to a contact with only the first phone

        // As is filtered, we only retrieve one phone number
        assert.equal(result.tel.length, 1);

        // As the mock of action menu is giving us the first option
        // we ensure that this option is the one filtered as well.
        assert.equal(mozContact.tel[0].value, result.tel[0].value);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/contact, 0 results', function(done) {
      activity.source.data.type = 'webcontacts/contact';
      mozContact.tel = [];

      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isTrue(ConfirmDialog.showing);
        assert.isNull(ConfirmDialog.title);
        assert.equal(ConfirmDialog.text, 'no_contact_phones');
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/contact, 1 result', function(done) {
      activity.source.data.type = 'webcontacts/contact';
      mozContact.tel.pop();
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        assert.equal(result.number, mozContact.tel[0].value);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/contact, many results', function(done) {
      activity.source.data.type = 'webcontacts/contact';
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        // Mock returns always the first option from the select
        assert.equal(result.number, mozContact.tel[0].value);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/contact, returning a Contact', function(done) {
      activity.source.data.type = 'webcontacts/contact';
      activity.source.data.fullContact = true;
      mozContact.tel.pop();
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        assert.deepEqual(result.tel, mozContact.tel);
        assert.deepEqual(result.email, mozContact.email);
        assert.equal(result.id, mozContact.id);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/email, 0 results', function(done) {
      activity.source.data.type = 'webcontacts/email';
      mozContact.email = [];
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isTrue(ConfirmDialog.showing);
        assert.isNull(ConfirmDialog.title);
        assert.equal(ConfirmDialog.text, 'no_contact_email');
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/email, 1 result', function(done) {
      activity.source.data.type = 'webcontacts/email';
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        assert.equal(result.email, mozContact.email[0].value);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/email, many results', function(done) {
      activity.source.data.type = 'webcontacts/email';
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        // Mock returns always the first option from the select
        assert.equal(result.email, mozContact.email[0].value);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/select, 0 results', function(done) {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      mozContact.tel = [];
      mozContact.email = [];
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isTrue(ConfirmDialog.showing);
        assert.isNull(ConfirmDialog.title);
        assert.equal(ConfirmDialog.text, 'no_contact_data');
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/select, 1 results(tel)', function(done) {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      mozContact.tel.pop();
      mozContact.email = [];
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        for (var prop in mozContact.tel[0]) {
          assert.equal(mozContact.tel[prop], result.select[prop]);
        }
        // Check if all the properties are the same
        mozContact = window.utils.misc.toMozContact(mozContact);
        checkContact();
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/select, 1 results(email)', function(done) {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      mozContact.tel = [];
      mozContact.email.pop();
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
         for (var prop in mozContact.tel[0]) {
          assert.equal(mozContact.email[prop], result.select[prop]);
        }
        // Check if all the properties are the same
        mozContact = window.utils.misc.toMozContact(mozContact);
        checkContact();
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/select, many results(tel)', function(done) {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      mozContact.email = [];
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        assert.equal(mozContact.tel[0].value, result.select[0].value);
        done();
      });

      dispatchPickEvent();
    });

    test('webcontacts/select, many results(email)', function(done) {
      activity.source.data.type = 'webcontacts/select';
      activity.source.data.contactProperties = ['tel', 'email'];
      mozContact.tel = [];
      window.addEventListener('pickAction', function onpickaction() {
        window.removeEventListener('pickAction', onpickaction);
        assert.isFalse(ConfirmDialog.showing);
        assert.equal(mozContact.email[0].value, result.select[0].value);
        done();
      });

      dispatchPickEvent();
    });
  });

  suite('Contact clicked', function() {
    test(' > must call onItemClick when an event is received', function(done) {
      var paramUtilsStub = this.sinon.stub(ParamUtils, 'generateUrl',
        function() {});
      window.addEventListener('itemClicked', function onItemClick() {
        window.removeEventListener('itemClicked', onItemClick);
        assert.isTrue(paramUtilsStub.calledOnce);
        assert.isTrue(paramUtilsStub.calledWith('detail', {contact:
                                                            mozContact.id}));
        done();
      });

      window.dispatchEvent(new CustomEvent('itemClicked', {
        'detail': {
          'uuid': mozContact.id
        }
      }));
    });
  });
});
