/* global LazyLoader, ListController, ListUI, MockCache */

'use strict';

requireApp('communications/contacts/js/param_utils.js');
requireApp('communications/contacts/js/utilities/performance_helper.js');
requireApp('communications/contacts/views/list/js/boot.js');
requireApp('communications/contacts/test/unit/mock_cache.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');


suite('List - Boot', function() {
  var stub, realCache;
  suiteSetup(function() {
    stub = sinon.stub(LazyLoader, 'load', function(files) {
      return {
        then: function(cb) {
          cb();
        }
      };
    });

    realCache = window.Cache;
    window.Cache = MockCache;
  });

  suiteTeardown(function() {
    LazyLoader.load.restore();
    window.Cache = realCache;
    realCache = null;
  });

  setup(function() {
    loadBodyHTML('/contacts/views/list/list.html');
  });

  teardown(function() {
    document.body.innerHTML = '';
  });

  suite('DOMContentLoaded', function() {
    setup(function() {
      window.dispatchEvent(new CustomEvent('DOMContentLoaded'));
    });

    test(' > LazyLoader must be called once', function() {
      // We must have 1 calls to LazyLoader
      assert.isTrue(stub.calledOnce);
    });

    test(' > First call must ensure localization', function() {
      // First of all we need to bring l10n library for localization
      var firstCall = stub.getCall(0);
      assert.isTrue(Array.isArray(firstCall.args[0]));
      assert.equal(firstCall.args[0][0], '/shared/js/l10n.js');
    });
  });

  suite('Loaded', function() {
    var realListController, realListUI, realMozSetMessage;
    suiteSetup(function() {
      realListController = window.ListController;
      realListUI = window.ListUI;

      window.ListController = {
        init: function foo() {}
      };

      window.ListUI = {
        init: function foo() {}
      };

      realMozSetMessage = navigator.mozSetMessageHandler;
      navigator.mozSetMessageHandler = function foo() {};
    });

    suiteTeardown(function() {
      window.ListController = realListController;
      window.ListUI = realListUI;
      navigator.mozSetMessageHandler = realMozSetMessage;

      realListController = null;
      realListUI = null;
      realMozSetMessage = null;
    });

    test(' > Controller is initialized', function() {
      var listSpy = this.sinon.spy(ListController, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(listSpy.calledOnce);
    });

    test(' > UI is initialized', function() {
      var listUISpy = this.sinon.spy(ListUI, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(listUISpy.calledOnce);
    });

    test('Performance initialized', function() {
      this.sinon.spy(window.utils.PerformanceHelper, 'chromeInteractive');
      this.sinon.spy(window.utils.PerformanceHelper, 'contentInteractive');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(window.utils.PerformanceHelper.
        chromeInteractive.calledOnce);
      assert.isTrue(window.utils.PerformanceHelper.
        contentInteractive.calledOnce);
    });
  });

  suite('Activity', function() {
    var realListController, realListUI, realMozSetMessage;
    var fakeActivity = {
      source: {
        data: {
          params: ['test']
        }
      }
    };

    suiteSetup(function() {
      realListController = window.ListController;
      realListUI = window.ListUI;

      window.ListController = {
        init: function init() {},
        setActivity: function setActivity() {}
      };

      window.ListUI = {
        init: function init() {},
        render: function render() {}
      };
    });

    suiteTeardown(function() {
      window.ListController = realListController;
      window.ListUI = realListUI;

      realListController = null;
      realListUI = null;
      realMozSetMessage = null;
    });

    test(' > Listener to activity is set properly', function(done) {
      this.sinon.stub(navigator, 'mozSetMessageHandler', function() {
        done();
      });
      window.dispatchEvent(new CustomEvent('load'));
    });

    test(' > Activity is cached in Controller', function(done) {
      var listActivitySpy = this.sinon.spy(ListController, 'setActivity');
      this.sinon.stub(navigator, 'mozSetMessageHandler',
        function(name, callback) {
          callback(fakeActivity);
          assert.isTrue(listActivitySpy.called);
          done();
        }
      );
      window.dispatchEvent(new CustomEvent('load'));
    });
  });
});
