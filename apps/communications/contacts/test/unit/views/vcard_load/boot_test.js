/* global LazyLoader, VCardLoadController, VCardLoadUI */
/* global MockContactsList, VCardHandler */

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/views/vcard_load/js/boot.js');
requireApp('communications/contacts/views/vcard_load/js/vcard_handler.js');
requireApp('communications/contacts/test/unit/mock_contacts_list.js');


suite('Open VCards Boot', function() {
  var lazyLoadStub;
  suiteSetup(function() {
    lazyLoadStub = sinon.stub(LazyLoader, 'load', function(files) {
      return {
        then: function(callback) {
          callback();
        }
      };
    });
  });

  suiteTeardown(function() {
    LazyLoader.load.restore();
  });

  setup(function() {
    loadBodyHTML('/contacts/views/vcard_load/vcard_load.html');
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('DOMContentLoaded', function() {
    setup(function() {
      window.dispatchEvent(new CustomEvent('DOMContentLoaded'));
    });

    test(' > LazyLoader must be called 2 times', function() {
      // We must have 2 calls to LazyLoader
      assert.isTrue(lazyLoadStub.calledTwice);
    });

    test(' > First call must ensure localization', function() {
      // First of all we need to bring l10n library for localization
      var firstCall = lazyLoadStub.getCall(0);
      assert.isTrue(Array.isArray(firstCall.args[0]));
      assert.equal(firstCall.args[0][0], '/shared/js/l10n.js');
    });

    test(' > Second call must load the template', function() {
      // Secondly we lazy load the panel, so the param must be the element
      // of the DOM to fill with the template
      var secondCall = lazyLoadStub.getCall(1);
      assert.equal(secondCall.args[0][0].id, 'multiple-select-view');
    });
  });

  suite('Loaded', function() {
    var realLoadController, realLoadUI, realMozSetMessage;
    suiteSetup(function() {
      realLoadController = window.VCardLoadController;
      realLoadUI = window.VCardLoadUI;

      window.VCardLoadController = {
        init: function foo() {}
      };

      window.VCardLoadUI = {
        init: function foo() {}
      };

      realMozSetMessage = navigator.mozSetMessageHandler;
      navigator.mozSetMessageHandler = function foo() {};
    });

    suiteTeardown(function() {
      window.VCardLoadController = realLoadController;
      window.VCardLoadUI = realLoadUI;
      navigator.mozSetMessageHandler = realMozSetMessage;

      realLoadController = null;
      realLoadUI = null;
      realMozSetMessage = null;
    });

    test(' > Controller is initialized', function() {
      var loadSpy = this.sinon.spy(VCardLoadController, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(loadSpy.calledOnce);
    });

    test(' > UI is initialized', function() {
      var loadUISpy = this.sinon.spy(VCardLoadUI, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(loadUISpy.calledOnce);
    });
  });

  suite('Activity', function() {
    var realLoadController, realLoadUI, realMozSetMessage, contacts;
    var fakeActivity = {
      source: {
        data: {
          allowSave: true,
          blob: null,
          filename:
            '/apps/communications/contacts/test/unit/vcards/vcard_21.vcf',
          type:'text/x-vcard'
        }
      }
    };

    suiteSetup(function() {
      realLoadController = window.VCardLoadController;
      realLoadUI = window.VCardLoadUI;

      window.VCardLoadController = {
        init: function init() {},
        setActivity: function setActivity() {}
      };

      window.VCardLoadUI = {
        init: function init() {},
        render: function render() {}
      };

      contacts = MockContactsList();

      sinon.stub(VCardHandler, 'handle', function(activity) {
        return {
          then: function(callback) {
            callback(contacts);
          }
        };
      });

      sinon.stub(VCardHandler, 'getFileName', function(filename) {
        return 'vcard_21.vcf';
      });
    });

    suiteTeardown(function() {
      window.VCardLoadController = realLoadController;
      window.VCardLoadUI = realLoadUI;

      realLoadController = null;
      realLoadUI = null;
      realMozSetMessage = null;
      contacts = null;
    });

    test(' > Listener to activity is set properly', function(done) {
      this.sinon.stub(navigator, 'mozSetMessageHandler', function() {
        done();
      });
      window.dispatchEvent(new CustomEvent('load'));
    });

    test(' > UI is updated properly with activity params', function(done) {
      var loadUIRenderSpy = this.sinon.spy(VCardLoadUI, 'render');
      this.sinon.stub(navigator, 'mozSetMessageHandler',
        function(name, callback) {
          callback(fakeActivity);
          assert.isTrue(loadUIRenderSpy.called);
          assert.equal(
            loadUIRenderSpy.getCall(0).args[0].length,
            contacts.length
          );
          assert.equal(
            loadUIRenderSpy.getCall(0).args[1],
            'vcard_21.vcf'
          );
          done();
        }
      );
      window.dispatchEvent(new CustomEvent('load'));
    });

    test(' > Activity is cached in Controller', function(done) {
      var loadActivitySpy = this.sinon.spy(VCardLoadController, 'setActivity');
      this.sinon.stub(navigator, 'mozSetMessageHandler',
        function(name, callback) {
          callback(fakeActivity);
          assert.isTrue(loadActivitySpy.called);
          done();
        }
      );
      window.dispatchEvent(new CustomEvent('load'));
    });
  });
});
