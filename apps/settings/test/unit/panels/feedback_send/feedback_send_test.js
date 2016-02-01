'use strict';
suite('sendFeedback > ', function() {
  var SendFeedback;
  var MockAsyncStorage, RealAsyncStorage;
  var MockXMLHttpRequest, RealXMLHttpRequest;
  suiteSetup(function(done) {
    navigator.addIdleObserver = sinon.spy();
    testRequire([
        'unit/mock_async_storage',
        'unit/mock_xml_http_request',
        'panels/feedback_send/feedback_send'
      ],
      function(mockAsyncStorage, mockXMLHttpRequest, module) {
        MockAsyncStorage = mockAsyncStorage;
        MockXMLHttpRequest = mockXMLHttpRequest;
        SendFeedback = module;
        done();
    });
  });

  var mock_elements = {
    title: {
      _keys: {},
      setAttribute: function(key, value) { this._keys[key] = value; },
      getAttribute: function(key) { return this._keys[key]; },
      removeAttribute: function(key) { delete this._keys[key]; },
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

  var mock_happy_options = {
    feel: 'feedback-happy'
  };

  var mock_sad_options = {
    feel: 'feedback-sad'
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
      sendFeedback.init(mock_elements, mock_happy_options);
    });

    teardown(function() {
      sendFeedback._xhr = null;
      sendFeedback._showEmail = false;
      sendFeedback.elements = null;
      sendFeedback.options = null;
      sendFeedback._sendData = {};
      window.asyncStorage = RealAsyncStorage;
      window.XMLHttpRequest = RealXMLHttpRequest;
    });

    test('update title and get previous inputs', function() {
      sendFeedback.options = mock_happy_options;
      sendFeedback.updateTitle();
      sendFeedback.getPreviousInputs();
      assert.equal(sendFeedback.elements.title.getAttribute('data-l10n-id'),
        'feedback_whyfeel_' +
        (mock_happy_options.feel === 'feedback-happy' ? 'happy' : 'sad'));
      assert.deepEqual(sendFeedback._inputData, {
        description: test_data.description,
        email: '',
        emailEnable: false
      });
    });

    test('_isHappy', function() {
      sendFeedback.options = mock_happy_options;
      assert.isTrue(sendFeedback._isHappy());

      sendFeedback.options = mock_sad_options;
      assert.isFalse(sendFeedback._isHappy());
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
      this.sinon.spy(sendFeedback, '_openDoneDialog');

      sendFeedback.elements.emailColumn.hidden = false;
      sendFeedback.elements.emailInput.value = 'testemailInput';
      sendFeedback.elements.description.value = 'testDescription';
      sendFeedback.options = mock_happy_options;
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
        locale: mock_settings['language.current'],
        happy: (mock_happy_options.feel === 'feedback-happy')
      }));

      sendFeedback._xhr.readyState = 4;
      sendFeedback._xhr.triggerOnLoad(201);
      assert.equal(sendFeedback._openDoneDialog.called, true);
      assert.equal(sendFeedback.elements.sendBtn.disabled, false);
    });

    test('_responseHandler', function() {
      sendFeedback._xhr.readyState = 4;

      this.sinon.spy(sendFeedback, '_openAlertDialog');
      sendFeedback._xhr.status = 400;
      sendFeedback._responseHandler();
      assert.equal(
        sendFeedback._openAlertDialog.calledWithExactly('unknown-error'), true);

      sendFeedback._xhr.status = 429;
      sendFeedback._responseHandler();
      assert.equal(sendFeedback._openAlertDialog.called, true);

      sendFeedback._xhr.status = 404;
      sendFeedback._responseHandler();
      assert.equal(
        sendFeedback._openAlertDialog.calledWithExactly('server-off'), true);

      sendFeedback._xhr.status = 402;
      sendFeedback._responseHandler();
      assert.equal(
        sendFeedback._openAlertDialog.calledWithExactly('unknown-error'), true);
    });

    suite('_messageHandler', function() {
      test('_messageHandler with success', function() {
        this.sinon.spy(sendFeedback, '_openDoneDialog');

        sendFeedback._messageHandler('success');
        assert.equal(sendFeedback._openDoneDialog.called, true);
        assert.equal(sendFeedback.elements.sendBtn.disabled, false);
      });

      test('_messageHandler with failure', function() {
        this.sinon.spy(sendFeedback, 'keepAllInputs');
        this.sinon.spy(sendFeedback, '_openAlertDialog');

        sendFeedback._messageHandler('wrong-email');
        assert.equal(sendFeedback.keepAllInputs.called, true);
        assert.equal(sendFeedback._openAlertDialog.called, true);
        assert.equal(sendFeedback.elements.sendBtn.disabled, false);
      });
    });
  });
});
