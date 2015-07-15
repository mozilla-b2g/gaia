/* global LazyLoader, MatchingController, MatchingUI */

'use strict';

require('/shared/js/lazy_loader.js');

requireApp('communications/contacts/views/matching/js/boot.js');


suite('Matching Boot', function() {
  var realMatchingController, realMatchingUI;

  setup(function() {
    realMatchingController = window.MatchingController;
    realMatchingUI = window.MatchingUI;

    window.MatchingController = {
      init: function foo() {}
    };

    window.MatchingUI = {
      init: function foo() {}
    };
  });

  teardown(function() {
    window.MatchingController = realMatchingController;
    window.MatchingUI = realMatchingUI;

    realMatchingController = null;
    realMatchingUI = null;
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

    test(' > LazyLoader must be called once', function() {
      // We must have 2 calls to LazyLoader
      assert.isTrue(stub.calledOnce);
    });

    test(' > Call must ensure localization', function() {
      // First of all we need to bring l10n library for localization
      var call = stub.getCall(0);
      assert.isTrue(Array.isArray(call.args[0]));
      assert.equal(call.args[0][0], '/shared/js/l10n.js');
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
      var MatchingControllerSpy = this.sinon.spy(MatchingController, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(MatchingControllerSpy.called );
    });

    test(' > UI is initialized', function() {
      var MatchingUISpy = this.sinon.spy(MatchingUI, 'init');
      window.dispatchEvent(new CustomEvent('load'));
      assert.isTrue(MatchingUISpy.calledOnce);
    });
  });
});
