'use strict';

// remove this when https://github.com/visionmedia/mocha/issues/819 is merged in
// mocha and when we have that new mocha in test agent
mocha.setup({ globals: ['alert'] });

requireApp('sms/test/unit/mock_alert.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_link_helper.js');
requireApp('sms/js/thread_ui.js');

var mocksHelperForThreadUI = new MocksHelper([
  'Utils',
  'LinkHelper',
  'alert'
]);

mocksHelperForThreadUI.init();

suite('thread_ui.js >', function() {
  var container;
  var sendButton;
  var input;
  var composeForm;
  var recipient;

  var realMozL10n;
  var realMozMobileMessage;

  var mocksHelper = mocksHelperForThreadUI;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();

    container = document.createElement('section');
    container.id = 'thread-messages';
    container.className = 'panel';

    var additionalMarkup =
      '<a role="link" id="messages-back-button">' +
      '  <span class="icon icon-back"></span>' +
      '</a>' +
      '<a id="messages-contact-pick-button">' +
      '  <span class="icon icon-user"></span>' +
      '</a>' +
      '<a href="#edit" id="icon-edit">' +
      '  <span class="icon icon-edit"></span>' +
      '</a>' +
      '<h1 id="messages-header-text">Messages</h1>' +
      '<section id="messages-to-field">' +
        '<section data-l10n-id="to" id="to-label">' +
          'To:' +
        '</section>' +
        '<section id="messages-recipients-container">' +
        '</section>' +
      '</section>' +
      '<article id="messages-container" class="view-body" data-type="list">' +
      '</article>' +
      '<form role="search" id="messages-compose-form" ' +
      '  class="bottom messages-compose-form">' +
      '  <button id="messages-send-button" disabled' +
      '    type="submit">Send</button>' +
      '  <p>' +
      '    <textarea type="text" id="messages-input" name="messages-input" ' +
      '      placeholder="Message"></textarea>' +
      '  </p>' +
      '</form>' +
      '<form role="dialog" id="messages-edit-form" data-type="edit" >' +
      '  <button id="messages-cancel-button">' +
      '    <span class="icon icon-close">close</span>' +
      '  </button>' +
      '  <button id="messages-delete-button">delete</button>' +
      '  <button id="messages-uncheck-all-button" disabled' +
      '    class="edit-button">' +
      '  </button>' +
      '  <button id="messages-check-all-button" class="edit-button">' +
      '  </button>' +
      '</form>';

    container.insertAdjacentHTML('beforeend', additionalMarkup);

    sendButton = container.querySelector('#messages-send-button');
    input = container.querySelector('#messages-input');
    composeForm = container.querySelector('#messages-compose-form');
    recipient = container.querySelector('#messages-recipient');

    document.body.appendChild(container);

    ThreadUI.init();
    realMozMobileMessage = ThreadUI._mozMobileMessage;
    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;
  });

  teardown(function() {
    container.parentNode.removeChild(container);
    container = null;

    MockNavigatormozMobileMessage.mTeardown();
    mocksHelper.teardown();
    ThreadUI._mozMobileMessage = realMozMobileMessage;
  });

  suite('enableSend() >', function() {
    setup(function() {
      ThreadUI.updateCounter();
    });

    test('button should be disabled at the beginning', function() {
      ThreadUI.enableSend();
      assert.isTrue(sendButton.disabled);
    });

    test('button should be enabled when there is some text', function() {
      input.value = 'Hola';
      ThreadUI.enableSend();
      assert.isFalse(sendButton.disabled);
    });

    suite('#new mode >', function() {
      setup(function() {
        window.location.hash = '#new';
      });

      teardown(function() {
        window.location.hash = '';
      });

      test('button should be disabled when there is neither contact or input',
        function() {

        ThreadUI.enableSend();
        assert.isTrue(sendButton.disabled);
      });

      test('button should be disabled when there is no contact', function() {
        input.value = 'Hola';
        ThreadUI.enableSend();
        assert.isTrue(sendButton.disabled);
      });

      test('button should be enabled when there is both contact and input',
        function() {

        ThreadUI.input.value = 'Hola';
        var recipient = ThreadUI.appendEditableRecipient();
        ThreadUI.createRecipient(recipient);
        ThreadUI.enableSend();
        assert.isFalse(sendButton.disabled);
      });
    });
  });

  suite('updateCounter() >', function() {
    suite('in first segment >', function() {
      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: 1,
          charsAvailableInLastSegment: 20
        };

        ThreadUI.updateCounter();
      });

      test('no counter is displayed', function() {
        assert.equal(sendButton.dataset.counter, '');
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no alert is sent', function() {
        assert.isNull(Mockalert.mLastMessage);
      });
    });

    suite('in first segment, less than 10 chars left >', function() {
      var segment = 1,
          availableChars = 10;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no alert is sent', function() {
        assert.isNull(Mockalert.mLastMessage);
      });
    });

    suite('in second segment >', function() {
      var segment = 2,
          availableChars = 20;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no alert is sent', function() {
        assert.isNull(Mockalert.mLastMessage);
      });
    });

    suite('in last segment >', function() {
      var segment = 10,
          availableChars = 20;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can enter more characters', function() {
        assert.equal(input.maxLength, -1);
      });

      test('no alert is sent', function() {
        assert.isNull(Mockalert.mLastMessage);
      });
    });

    suite('in last segment, no characters left >', function() {
      var segment = 10,
          availableChars = 0;

      setup(function() {
        MockNavigatormozMobileMessage.mNextSegmentInfo = {
          segments: segment,
          charsAvailableInLastSegment: availableChars
        };

        ThreadUI.updateCounter();
      });

      test('a counter is displayed', function() {
        var expected = availableChars + '/' + segment;
        assert.equal(sendButton.dataset.counter, expected);
      });

      test('the user can not enter more characters', function() {
        assert.equal(input.maxLength, input.value.length);
      });

      test('an alert is sent', function() {
        assert.equal(Mockalert.mLastMessage, 'messages-max-length-notice');
      });
    });
  });
  suite('createMmsContent', function() {
    var testImageBlob;

    suiteSetup(function createMmsContent_suiteSetup(done) {
      var req = new XMLHttpRequest();
      req.open('GET', '/test/unit/media/kitten-450.jpg', true);
      req.responseType = 'blob';
      req.onload = function() {
        testImageBlob = req.response;
        done();
      };
      req.send();
    });

    test('generated html', function() {
      var inputArray = [{
        text: '&escapeTest',
        name: 'imageTest.jpg',
        blob: testImageBlob
      }];
      var output = ThreadUI.createMmsContent(inputArray);
      var img = output.querySelectorAll('img');
      assert.equal(img.length, 1);
      var span = output.querySelectorAll('span');
      assert.equal(span.length, 1);
      assert.equal(span[0].innerHTML.slice(0, 5), '&amp;');
    });
  });
});
