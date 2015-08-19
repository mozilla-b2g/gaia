/* global LazyLoader, DetailsController,
DetailsUI, mozContact, ContactsService */

'use strict';

requireApp('communications/contacts/js/param_utils.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');

requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/views/details/js/boot.js');

suite('Details Boot', function() {
  var realDetailsController, realDetailsUI;

  setup(function() {
    loadBodyHTML('/contacts/views/details/details.html');

    realDetailsController = window.DetailsController;
    realDetailsUI = window.DetailsUI;

    window.DetailsController = {
      init: function foo() {},
      setActivity: function boo() {}
    };

    window.DetailsUI = {
      init: function foo() {},
      render: function boo() {}
    };
  });

  teardown(function() {
    document.body.innerHTML = '';
    window.DetailsController = realDetailsController;
    window.DetailsUI = realDetailsUI;

    realDetailsController = null;
    realDetailsUI = null;
  });

  suite('DOMContentLoaded', function() {
    var stub;
    setup(function() {
      stub = this.sinon.stub(LazyLoader, 'load', function(files) {
        return {
          then: function(cb) {
            cb();
          }
        };
      });
      window.dispatchEvent(new CustomEvent('DOMContentLoaded'));
    });

    teardown(function() {
      LazyLoader.load.restore();
    });

    test(' > LazyLoader must be called 2 times', function() {
      // We must have 2 calls to LazyLoader
      assert.isTrue(stub.calledTwice);
    });

    test(' > First call must ensure localization', function() {
      // First of all we need to bring l10n library for localization
      var firstCall = stub.getCall(0);
      assert.isTrue(Array.isArray(firstCall.args[0]));
      assert.equal(firstCall.args[0][0], '/shared/js/l10n.js');
    });

    test(' > Second call must load the template', function() {
      // Secondly we lazy load the panel, so the param must be the element
      // of the DOM to fill with the template
      var secondCall = stub.getCall(1);
      assert.equal(secondCall.args[0][0].id, 'view-contact-details');
    });
  });

  suite('Loaded', function() {
    var realMozSetMessage;
    suiteSetup(function() {

      realMozSetMessage = navigator.mozSetMessageHandler;
      navigator.mozSetMessageHandler = function foo() {};
    });

    suiteTeardown(function() {
      navigator.mozSetMessageHandler = realMozSetMessage;
      realMozSetMessage = null;
    });

    setup(function() {
      this.sinon.stub(LazyLoader, 'load', function(files) {
        return {
          then: function(cb) {
            cb();
          }
        };
      });
    });

    test(' > Controller is initialized', function() {
      var DetailsControllerSpy = this.sinon.spy(DetailsController, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(DetailsControllerSpy.called );
    });

    test(' > UI is initialized', function() {
      var DetailsUISpy = this.sinon.spy(DetailsUI, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(DetailsUISpy.calledOnce);
    });
  });

  suite('Activity', function() {
    var realContactsService, testContact;
    var fakeActivity = {
      source: {
        data: {
          params: {
            'id': 'testID'
          }
        }
      }
    };

    suiteSetup(function() {
      realContactsService = window.ContactsService;
      testContact = new mozContact();
      testContact.givenName = ['test'];

      window.ContactsService = {
        get: function get(id, callback) {
          callback(testContact);
        },
        getCount: function getCount(callback) {
          callback(1);
        }
      };
    });

    suiteTeardown(function() {
      window.ContactsService = realContactsService;
      realContactsService = null;
    });

    setup(function() {
      this.sinon.stub(LazyLoader, 'load', function(files) {
        return {
          then: function(cb) {
            cb();
          }
        };
      });
    });

    test(' > Listener to activity is set properly', function(done) {
      this.sinon.stub(navigator, 'mozSetMessageHandler', function() {
        done();
      });
      window.dispatchEvent(new CustomEvent('load'));
    });

    test(' > UI is updated properly with activity params', function(done) {
      var DetailsUIRenderSpy = this.sinon.spy(DetailsUI, 'render');
      var ContactsServiceGetSpy = this.sinon.spy(ContactsService, 'get');
      var ContactsServiceGetCountSpy =
        this.sinon.spy(ContactsService, 'getCount');
      this.sinon.stub(navigator, 'mozSetMessageHandler',
        function(name, callback) {
          callback(fakeActivity);
          assert.isTrue(ContactsServiceGetSpy.called);
          assert.isTrue(ContactsServiceGetCountSpy.called);
          assert.equal(
            ContactsServiceGetSpy.getCall(0).args[0],
            fakeActivity.source.data.params.id
          );
          assert.isTrue(DetailsUIRenderSpy.called, 'render called');
          assert.equal(
            DetailsUIRenderSpy.getCall(0).args[0],
            testContact
          );
          done();
        }
      );
      window.dispatchEvent(new CustomEvent('load'));
    });

    test(' > Activity is cached in Controller', function(done) {
      var DetailsActivitySpy = this.sinon.spy(DetailsController, 'setActivity');
      this.sinon.stub(navigator, 'mozSetMessageHandler',
        function(name, callback) {
          callback(fakeActivity);
          assert.isTrue(DetailsActivitySpy.called);
          done();
        }
      );
      window.dispatchEvent(new CustomEvent('load'));
    });
  });
});
