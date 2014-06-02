'use strict';
suite('sendFeedback > ', function() {
  var SendFeedback;
  var MockL10n, RealL10n;
  var MockAsyncStorage, RealAsyncStorage;
  var MockXMLHttpRequest, RealXMLHttpRequest;
  suiteSetup(function(done) {
    navigator.addIdleObserver = sinon.spy();
    testRequire([
        'unit/mock_l10n',
        'unit/mock_async_storage',
        'unit/mock_xml_http_request',
        'panels/feedback_send/feedback_send'
      ],
      function(mockL10n, mockAsyncStorage, mockXMLHttpRequest, module) {
        MockL10n = mockL10n;
        MockAsyncStorage = mockAsyncStorage;
        MockXMLHttpRequest = mockXMLHttpRequest;
        SendFeedback = module;
        done();
    });
  });

  var mock_elements = {
    alertDialog: {
      hidden: false
    },
    alertMsg: {
      textContent: 'testAlertMsg'
    },
    doneDialog: {
      hidden: false
    },
    doneBtn: {
      hidden: true
    },
    title: {
      textContent: 'testTitle'
    },
    description: {
      value: 'testDescription',
      textLength: 15
    },
    emailInput: {
      value: 'testemailInput',
      validity: {
        valid: true
      }
    },
    emailColumn: {
      hidden: true
    },
    emailEnable: {
      checked: false
    },
    sendBtn: {
      disabled: false
    }
  };

  var test_data = {
    description: 'test'
  };

  var mock_options = {
    feel: 'feedback-happy'
  };

  var mock_settings = {
    'feedback.url': 'testfeedbackurl',
    'deviceinfo.os': 'testos',
    'deviceinfo.hardware': 'testhw',
    'language.current': 'testlang'
  };

  suite('Start test sendFeedback module', function() {
    var sendFeedback;
    setup(function() {
      sendFeedback = SendFeedback();
      RealL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;
      RealAsyncStorage = window.asyncStorage;
      window.asyncStorage = MockAsyncStorage;
      RealXMLHttpRequest = window.XMLHttpRequest;
      window.XMLHttpRequest = MockXMLHttpRequest;
      sendFeedback._sendData = {};
      window.asyncStorage.setItem('feedback', test_data);
      sendFeedback._SettingsCache = {
        cache: mock_settings
      };
      this.sinon.stub(sendFeedback._SettingsService, 'navigate');
      sendFeedback._xhr = MockXMLHttpRequest;
      sendFeedback.init(mock_elements, mock_options);
    });

    teardown(function() {
      sendFeedback._xhr = null;
      sendFeedback._showEmail = false;
      sendFeedback.elements = null;
      sendFeedback.options = null;
      sendFeedback._sendData = {};
      navigator.mozL10n = RealL10n;
      window.asyncStorage = RealAsyncStorage;
      window.XMLHttpRequest = RealXMLHttpRequest;
    });

    test('update title and get previous inputs', function() {
      sendFeedback.options = mock_options;
      sendFeedback.updateTitle();
      sendFeedback.getPreviousInputs();
      assert.equal(sendFeedback.elements.title.textContent,
        'feedback_whyfeel_' +
        (mock_options.feel === 'feedback-happy' ? 'happy' : 'sad'));
      assert.deepEqual(sendFeedback._inputData, {
        description: test_data.description,
        email: '',
        emailEnable: false
      });
    });

    test('alertConfirm', function() {
      sendFeedback.alertConfirm();
      assert.equal(sendFeedback.elements.alertDialog.hidden, true);
      assert.equal(sendFeedback.elements.alertMsg.textContent, '');
    });

    test('done', function() {
      sendFeedback.done();
      assert.equal(sendFeedback.elements.doneDialog.hidden, true);
    });

    test('enableEmail', function() {
      var originalValue = sendFeedback._showEmail;
      sendFeedback.enableEmail();
      assert.equal(sendFeedback._showEmail, !originalValue);
      assert.equal(sendFeedback.elements.emailEnable.checked, !originalValue);
      assert.equal(sendFeedback.elements.emailColumn.hidden, originalValue);
    });

    test('back', function(done) {
      sendFeedback._inputData = {};
      sendFeedback.back();
      window.asyncStorage.getItem('feedback', function(value) {
        assert.deepEqual(value, {
          description: '', email: '', emailEnable: false });
        done();
      });
    });

    test('send', function() {
      sendFeedback.elements.emailColumn.hidden = false;
      sendFeedback.elements.emailInput.value = 'testemailInput';
      sendFeedback.elements.description.value = 'testDescription';
      sendFeedback.send();
      assert.equal(sendFeedback._xhr.data.requestUrl,
        mock_settings['feedback.url']);
      assert.equal(sendFeedback._xhr.data.value, JSON.stringify({
        product: 'Firefox OS',
        platform: 'Firefox OS',
        description: 'testDescription',
        email: 'testemailInput',
        version: mock_settings['deviceinfo.os'],
        device: mock_settings['deviceinfo.hardware'],
        locale: mock_settings['language.current']
      }));

      sendFeedback._xhr.readyState = 4;
      sendFeedback._xhr.triggerReadyStateChange(201);
      assert.equal(sendFeedback.elements.doneBtn.hidden, false);
      assert.equal(sendFeedback.elements.sendBtn.disabled, false);
    });

    test('_responseHandler', function() {
      sendFeedback._xhr.readyState = 4;

      sendFeedback._xhr.status = 400;
      sendFeedback._responseHandler();
      assert.equal(sendFeedback.elements.alertMsg.textContent,
        'feedback-errormessage-wrong-email');
      assert.equal(sendFeedback.elements.alertDialog.hidden, false);

      sendFeedback._xhr.status = 429;
      sendFeedback._responseHandler();
      assert.equal(sendFeedback.elements.alertMsg.textContent,
        'feedback-errormessage-just-sent');

      sendFeedback._xhr.status = 404;
      sendFeedback._responseHandler();
      assert.equal(sendFeedback.elements.alertMsg.textContent,
        'feedback-errormessage-server-off');

      sendFeedback._xhr.status = 402;
      sendFeedback._responseHandler();
      assert.equal(sendFeedback.elements.alertMsg.textContent,
        'feedback-errormessage-connect-error');
    });
  });
});
