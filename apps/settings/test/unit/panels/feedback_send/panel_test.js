/* globals loadBodyHTML*/
'use strict';

require('/shared/test/unit/load_body_html_helper.js');

suite('SendFeedbackPanel', function() {
  var modules = [
    'panels/feedback_send/panel',
    'panels/feedback_send/feedback_send',
    'unit/mock_settings_panel'
  ];
  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'panels/feedback_send/feedback_send': 'MockSendFeedback',
    }
  };

  setup(function(done) {
    var that = this;

    loadBodyHTML('_send_feedback.html');

    var requireCtx = testRequire([], map, function() {});

    var MockSendFeedback = {
      init: function() {},
      keepAllInputs: function() {
        return true;
      }
    };

    define('MockSendFeedback', function() {
      return function() {
        return MockSendFeedback;
      };
    });

    requireCtx(modules, function(SendFeedbackPanel, MockSendFeedback,
      MockSettingsPanel) {
        MockSettingsPanel.mInnerFunction = function(options) {
          var obj = {};
          for (var key in options) {
            obj[key] = options[key];
          }
          return obj;
        };
        that.sendFeedback = MockSendFeedback();
        that.panel = SendFeedbackPanel();
        that.panel.onInit(document.body);
        done();
    });
  });

  suite('onBeforeHide', function() {
    var realHidden;
    var hidden = true;

    function documentHidden() {
      return hidden;
    }

    function setDocumentHidden(value) {
      hidden = value;
    }

    setup(function() {
      realHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: documentHidden,
        set: setDocumentHidden
      });
      this.sinon.spy(this.sendFeedback, 'keepAllInputs');
    });

    teardown(function() {
      if (realHidden) {
        Object.defineProperty(document, 'hidden', realHidden);
      }
    });

    test('should not call keepAllInputs', function() {
      document.hidden = false;
      this.panel.onBeforeHide();
      assert.isFalse(this.sendFeedback.keepAllInputs.called);
    });

    test('should call keepAllInputs', function() {
      document.hidden = true;
      this.panel.onBeforeHide();
      assert.isTrue(this.sendFeedback.keepAllInputs.called);
    });
  });

});
