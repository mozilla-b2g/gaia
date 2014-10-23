/*global mocha, MocksHelper, MockAttachment, MockL10n, loadBodyHTML, ThreadUI,
         Contacts, Compose, MockErrorDialog,
         Template, MockSMIL, Utils, MessageManager, LinkActionHandler,
         LinkHelper, Attachment, MockContact, MockOptionMenu,
         MockActivityPicker, Threads, Settings, MockMessages, MockUtils,
         MockContacts, ActivityHandler, Recipients, MockMozActivity,
         ThreadListUI, ContactRenderer, UIEvent, Drafts, OptionMenu,
         ActivityPicker, MockNavigatorSettings, MockContactRenderer,
         Draft, MockStickyHeader, MultiSimActionButton, Promise,
         MockLazyLoader, WaitingScreen, Navigation, MockDialog, MockSettings,
         DocumentFragment,
         Errors,
         MockCompose,
         AssetsHelper
*/

'use strict';

mocha.setup({ globals: ['alert'] });

require('/js/event_dispatcher.js');
require('/js/subject_composer.js');
require('/js/compose.js');
require('/js/drafts.js');
require('/js/threads.js');
require('/js/thread_ui.js');
require('/js/shared_components.js');
require('/js/utils.js');
require('/js/errors.js');

require('/test/unit/mock_time_headers.js');
require('/test/unit/mock_link_action_handler.js');
require('/test/unit/mock_attachment.js');
require('/test/unit/mock_attachment_menu.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_utils.js');
require('/test/unit/mock_link_helper.js');
require('/test/unit/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/test/unit/mock_messages.js');
require('/test/unit/mock_contact.js');
require('/test/unit/mock_contacts.js');
require('/test/unit/mock_recipients.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_activity_picker.js');
require('/test/unit/mock_dialog.js');
require('/test/unit/mock_smil.js');
require('/test/unit/mock_custom_dialog.js');
require('/test/unit/mock_url.js');
require('/test/unit/mock_compose.js');
require('/test/unit/mock_activity_handler.js');
require('/test/unit/mock_information.js');
require('/test/unit/mock_contact_renderer.js');
require('/test/unit/mock_message_manager.js');
require('/test/unit/mock_waiting_screen.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_thread_list_ui.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_sticky_header.js');
require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

var mocksHelperForThreadUI = new MocksHelper([
  'asyncStorage',
  'Attachment',
  'AttachmentMenu',
  'Utils',
  'Settings',
  'Recipients',
  'LinkActionHandler',
  'LinkHelper',
  'MozActivity',
  'ActivityPicker',
  'OptionMenu',
  'Dialog',
  'ErrorDialog',
  'Contacts',
  'SMIL',
  'ActivityHandler',
  'TimeHeaders',
  'ContactRenderer',
  'Information',
  'ContactPhotoHelper',
  'MessageManager',
  'StickyHeader',
  'MultiSimActionButton',
  'Audio',
  'LazyLoader',
  'WaitingScreen',
  'Navigation',
  'Notification',
  'ThreadListUI'
]);

mocksHelperForThreadUI.init();

suite('thread_ui.js >', function() {
  var input;
  var container;
  var sendButton;
  var composeForm;
  var recipientsList;
  var sticky;
  var threadMessages;
  var mainWrapper;
  var headerText;
  var recipientSuggestions;

  var realMozL10n;

  var mocksHelper = mocksHelperForThreadUI;
  var testImageBlob;
  var oversizedImageBlob;
  var testAudioBlob;
  var testVideoBlob;

  function mockAttachment(size) {
    return new MockAttachment({
      type: 'video/ogg',
      size: size
    }, 'video.ogv');
  }

  function dispatchScrollEvent(elt) {
    var event = new UIEvent('scroll', {
      view: window,
      detail: 0
    });
    elt.dispatchEvent(event);
  }

  suiteSetup(function(done) {
    mocksHelper.suiteSetup();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var blobPromises = [
      AssetsHelper.generateImageBlob(1400, 1400, 'image/jpeg', 1).then(
        (blob) => oversizedImageBlob = blob
      ),
      AssetsHelper.generateImageBlob(300, 300, 'image/jpeg', 0.5).then(
        (blob) => testImageBlob = blob
      ),
      AssetsHelper.loadFileBlob('/test/unit/media/audio.oga').then(
        (blob) => testAudioBlob = blob
      ),
      AssetsHelper.loadFileBlob('/test/unit/media/video.ogv').then(
        (blob) => testVideoBlob = blob
      ),
    ];

    Promise.all(blobPromises).then(() => {
      done(function() {
        assert.isTrue(
          oversizedImageBlob.size > 300 * 1024,
          'Image blob should be greater than MMS size limit'
        );
      });
    }, done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    mocksHelper.setup();
    loadBodyHTML('/index.html');

    input = document.getElementById('messages-input');
    container = document.getElementById('messages-container');
    sendButton = document.getElementById('messages-send-button');
    composeForm = document.getElementById('messages-compose-form');
    recipientsList = document.getElementById('messages-recipients-list');
    threadMessages = document.getElementById('thread-messages');
    mainWrapper = document.getElementById('main-wrapper');
    headerText = document.getElementById('messages-header-text');
    recipientSuggestions = document.getElementById(
      'messages-recipient-suggestions'
    );

    this.sinon.stub(MessageManager, 'on');
    this.sinon.stub(Compose, 'on');
    this.sinon.useFakeTimers();

    ThreadUI.recipients = null;
    ThreadUI.init();

    sticky = MockStickyHeader;
  });

  teardown(function() {
    // This is added in ThreadUI.init, so we need to remove the listener to
    // prevent having the listener being called several times.
    document.removeEventListener(
      'visibilitychange', ThreadUI.onVisibilityChange
    );

    document.body.innerHTML = '';
    Threads.currentId = null;

    mocksHelper.teardown();

    sticky = null;
  });

  suite('scrolling', function() {
    teardown(function() {
      container.innerHTML = '';
    });
    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      // we don't have CSS so we must force the scroll here
      container.style.overflow = 'scroll';
      container.style.height = '50px';
      // fake content
      var innerHTML = '';
      for (var i = 0; i < 99; i++) {
        innerHTML += ThreadUI.tmpl.message.interpolate({
          id: String(i),
          bodyHTML: 'test #' + i
        });
      }
      container.innerHTML = innerHTML;
      // This crudely emulates the CSS styles applied to the message list
      container.lastElementChild.style.paddingBottom = '16px';
    });

    test('scroll 100px, should be detected as a manual scroll', function() {
      container.scrollTop = 100;

      dispatchScrollEvent(container);

      assert.ok(ThreadUI.isScrolledManually);
    });

    test('scroll to bottom, should be detected as an automatic scroll',
    function() {
      ThreadUI.isScrolledManually = false;
      ThreadUI.scrollViewToBottom();

      dispatchScrollEvent(container);

      assert.isFalse(ThreadUI.isScrolledManually);
      assert.equal(
        container.scrollTop + container.clientHeight,
        container.scrollHeight
      );
    });

    suite('when a new message is received >', function() {
      setup(function() {
        this.sinon.spy(HTMLElement.prototype, 'scrollIntoView');
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
      });

      test('should scroll it into view if we are at the bottom', function() {
        ThreadUI.isScrolledManually = false;
        MessageManager.on.withArgs('message-received').yield({
          message: MockMessages.sms()
        });
        sinon.assert.calledOnce(HTMLElement.prototype.scrollIntoView);
      });

      test('should not scroll if we are not at the bottom', function() {
        ThreadUI.isScrolledManually = true;
        MessageManager.on.withArgs('message-received').yield({
          message: MockMessages.sms()
        });
        sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
      });
    });
  });

  suite('Search', function() {
    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      Compose.clear();
      ThreadUI.recipients.length = 0;
      ThreadUI.recipients.inputValue = '';
    });

    teardown(function() {
      Compose.clear();
      ThreadUI.recipients.length = 0;
      ThreadUI.recipients.inputValue = '';
    });

    test('composer cleared', function() {
      Compose.append('foo');
      Compose.setSubject('foo');

      ThreadUI.cleanFields();
      assert.equal(Compose.getContent(), '');
      assert.equal(Compose.getSubject(), '');
    });

    suite('rendering suggestions list', function() {
      var suggestionRenderer, unknownRenderer;
      var contact, unknown;
      setup(function() {
        suggestionRenderer = new MockContactRenderer();
        unknownRenderer = new MockContactRenderer();
        sinon.spy(suggestionRenderer, 'render');
        sinon.spy(unknownRenderer, 'render');
        this.sinon.spy(ThreadUI, 'toggleRecipientSuggestions');

        this.sinon.stub(ContactRenderer, 'flavor').throws();
        ContactRenderer.flavor.withArgs('suggestion')
          .returns(suggestionRenderer);
        ContactRenderer.flavor.withArgs('suggestionUnknown')
          .returns(unknownRenderer);

        // create a normal and an unknown contact
        contact = new MockContact();
        unknown = {
          name: ['unknown '],
          tel: ['+33123456999 '],
          source: 'unknown'
        };

        this.sinon.stub(Contacts, 'findByString').yields([contact, unknown]);

        ThreadUI.recipients.add({
          number: '888'
        });

        var placeholder = document.createElement('span');
        placeholder.setAttribute('contenteditable', 'true');
        placeholder.isPlaceholder = true;
        placeholder.textContent = '999';
        recipientsList.appendChild(placeholder);

        ThreadUI.recipients.inputValue = '999';

        placeholder.dispatchEvent(new CustomEvent('input', { bubbles: true }));
      });

      test('does display found contacts', function() {
        sinon.assert.calledWithMatch(suggestionRenderer.render, {
          contact: contact,
          input: '999',
          target: sinon.match.instanceOf(DocumentFragment)
        });

        sinon.assert.calledWithMatch(unknownRenderer.render, {
          contact: unknown,
          input: '999',
          target: sinon.match.instanceOf(DocumentFragment)
        });

        sinon.assert.calledWith(
          ThreadUI.toggleRecipientSuggestions,
          sinon.match.instanceOf(DocumentFragment)
        );
      });

      test('does not display entered recipients', function() {
        sinon.assert.calledWithMatch(suggestionRenderer.render, {
            skip: ['888']
        });
        sinon.assert.calledWithMatch(unknownRenderer.render, {
           skip: ['888']
        });
      });
    });

    test('toggling suggestions list', function() {
      var contactList = recipientSuggestions.querySelector('.contact-list');
      recipientSuggestions.classList.add('hide');
      contactList.textContent = '';

      var documentFragment = document.createDocumentFragment(),
          suggestionNode = document.createElement('li');
      suggestionNode.innerHTML =
        '<a class="suggestion">' +
          '<p class="name">Jean Dupont</p>' +
          '<p class="number">0123456789</p>' +
        '</a>';
      documentFragment.appendChild(suggestionNode);

      ThreadUI.toggleRecipientSuggestions(documentFragment);

      assert.isFalse(
        recipientSuggestions.classList.contains('hide'),
        'Recipient suggestions should be visible'
      );
      assert.equal(
        contactList.firstElementChild,
        suggestionNode,
        'Recipient suggestions should contain correct data'
      );
      assert.equal(contactList.childNodes.length, 1);


      ThreadUI.toggleRecipientSuggestions();

      assert.isTrue(
        recipientSuggestions.classList.contains('hide'),
        'Recipient suggestions should be hidden'
      );
      assert.equal(
        contactList.textContent, '', 'Recipient suggestions should be cleared'
      );
    });

    test('always scroll to top when toggleing suggestions list', function() {
      var contactList = recipientSuggestions.querySelector('.contact-list');
      contactList.textContent = '';

      recipientSuggestions.classList.add('hide');
      recipientSuggestions.style.maxHeight = '300px';
      recipientSuggestions.style.overflowY = 'auto';

      var documentFragment = document.createDocumentFragment();
      var suggestionNode;

      for (var i = 0; i < 10; i++) {
        suggestionNode = document.createElement('li');
        suggestionNode.innerHTML =
          '<a class="suggestion">' +
            '<p class="name">Jean Dupont</p>' +
            '<p class="number">0123456789</p>' +
          '</a>';
        documentFragment.appendChild(suggestionNode);
      }

      ThreadUI.toggleRecipientSuggestions(documentFragment);
      recipientSuggestions.scrollTop = 200;

      assert.equal(
        recipientSuggestions.scrollTop, 200,
        'Recipient suggestions should be scrolled down'
      );

      ThreadUI.toggleRecipientSuggestions(documentFragment);

      assert.equal(
        recipientSuggestions.scrollTop, 0,
        'Recipient suggestions should be scrolled to top'
      );
    });
  });

  suite('segmentInfo management >', function() {
    var banner,
        convertBanner,
        form,
        counterMsgContainer;

    var realCompose;

    suiteSetup(function() {
      realCompose = window.Compose;
      window.Compose = MockCompose;
    });

    suiteTeardown(function() {
      window.Compose = realCompose;
      realCompose = null;
    });

    setup(function() {
      MockCompose.mSetup();

      // This is added in ThreadUI.init, so we need to remove the listener to
      // prevent having the listener being called several times.
      // We need to do this here in addition to main teardown because
      // ThreadUI.init changes the function, binding it.

      document.removeEventListener(
        'visibilitychange', ThreadUI.onVisibilityChange
      );
      ThreadUI.init();

      banner = document.getElementById('messages-max-length-notice');
      convertBanner = document.getElementById('messages-convert-notice');
      form = document.getElementById('messages-compose-form');
      counterMsgContainer =
        document.getElementById('messages-sms-counter-notice');
    });

    function yieldInput() {
      /*jshint validthis: true */
      // display the banner to check that it is correctly hidden
      banner.classList.remove('hide');

      // add a lock to check that it is correctly removed
      Compose.lock = true;

      Compose.on.withArgs('input').yield();
    }

    function yieldType(type) {
      Compose.type = type;
      Compose.on.withArgs('type').yield();
    }

    function yieldSegmentInfo(segmentInfo) {
      Compose.segmentInfo = segmentInfo;
      Compose.on.withArgs('segmentinfochange').yield();
    }

    test('from start to first segment', function() {
      yieldSegmentInfo({
        segments: 0,
        charsAvailableInLastSegment: 0
      });

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast not should not be showed'
      );

      yieldSegmentInfo({
        segments: 1,
        charsAvailableInLastSegment: 10
      });

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed'
      );
    });

    test('from start directly to segment segment', function() {
      yieldSegmentInfo({
        segments: 0,
        charsAvailableInLastSegment: 0
      });

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed'
      );

      yieldSegmentInfo({
        segments: 2,
        charsAvailableInLastSegment: 10
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ThreadUI.ANOTHER_SMS_TOAST_DURATION);

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed in 3 seconds'
      );
    });

    test('from first segment to second segment', function() {
      yieldSegmentInfo({
        segments: 1,
        charsAvailableInLastSegment: 0
      });

      this.sinon.clock.tick(ThreadUI.ANOTHER_SMS_TOAST_DURATION);

      yieldSegmentInfo({
        segments: 2,
        charsAvailableInLastSegment: 145
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ThreadUI.ANOTHER_SMS_TOAST_DURATION);

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed in 3 seconds'
      );
    });

    test('from second to first segment', function() {
      yieldSegmentInfo({
        segments: 2,
        charsAvailableInLastSegment: 10
      });

      this.sinon.clock.tick(ThreadUI.ANOTHER_SMS_TOAST_DURATION);

      yieldSegmentInfo({
        segments: 1,
        charsAvailableInLastSegment: 10
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ThreadUI.ANOTHER_SMS_TOAST_DURATION);

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed in 3 seconds'
      );
    });

    test('when type is changed to MMS', function() {
      yieldType('mms');
      yieldSegmentInfo({
        segments: 10,
        charsAvailableInLastSegment: 145
      });

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed'
      );
    });

    test('after Composer is cleared', function() {
      ThreadUI.cleanFields();

      yieldSegmentInfo({
        segments: 2,
        charsAvailableInLastSegment: 10
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ThreadUI.ANOTHER_SMS_TOAST_DURATION);

      ThreadUI.cleanFields();

      yieldSegmentInfo({
        segments: 1,
        charsAvailableInLastSegment: 10
      });

      assert.isTrue(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should not be showed'
      );
    });

    suite('type converted >', function() {
      setup(function() {
        yieldType('mms');
        yieldInput();
      });

      test('The composer has the correct state', function() {
        assert.isFalse(
          Compose.lock,
          'lock is disabled'
        );

        assert.isFalse(
          convertBanner.classList.contains('hide'),
          'the conversion notice is displayed'
        );
      });

      test('removing some characters', function() {
        // waiting some seconds so that the existing possible banner is hidden
        this.sinon.clock.tick(5000);
        yieldInput();

        assert.ok(
          convertBanner.classList.contains('hide'),
          'the conversion notice is not displayed again'
        );
      });
    });

    suite('at size limit in mms >', function() {
      setup(function() {
        Settings.mmsSizeLimitation = 1024;
        yieldType('mms');
        Compose.size = 1024;
        Compose.on.withArgs('input').yield();
      });

      test('banner is displayed and stays', function() {
        assert.isFalse(banner.classList.contains('hide'));
        this.sinon.clock.tick(200000);
        assert.isFalse(banner.classList.contains('hide'));

        assert.equal(
          banner.querySelector('p').getAttribute('data-l10n-id'),
          'messages-max-length-text'
        );
      });

      test('lock is enabled', function() {
        assert.isTrue(Compose.lock);
      });
    });

    suite('over size limit in mms >', function() {
      setup(function() {
        Settings.mmsSizeLimitation = 1024;
        yieldType('mms');
        Compose.size = 1025;
        Compose.on.withArgs('input').yield();
      });

      test('banner is displayed and stays', function() {
        assert.isFalse(banner.classList.contains('hide'));
        this.sinon.clock.tick(200000);
        assert.isFalse(banner.classList.contains('hide'));

        assert.equal(
          banner.querySelector('p').getAttribute('data-l10n-id'),
          'message-exceeded-max-length'
        );
      });

      test('lock is enabled', function() {
        assert.isTrue(Compose.lock);
      });
    });
  });

  suite('Max Length banner', function() {
    var banner;

    setup(function() {
      banner = document.getElementById('messages-subject-max-length-notice');
      Compose.showSubject();
    });

    teardown(function() {
      banner.classList.add('hide');
      Compose.clear();
    });

    test('should be hidden if limit not reached', function() {
      assert.isTrue(banner.classList.contains('hide'));
    });

    suite('when trying to pass the limit...', function() {
      setup(function() {
        Compose.setSubject('1234567890123456789012345678901234567890');
        Compose.on.withArgs('subject-change').yield();
      });

      test('should create a timeout', function() {
        assert.isFalse(!ThreadUI.timeouts.subjectLengthNotice);
      });

      test('banner should be hidden after an amount of secs.',
        function() {
        assert.isFalse(banner.classList.contains('hide'));
        this.sinon.clock.tick(ThreadUI.BANNER_DURATION);
        assert.isTrue(banner.classList.contains('hide'));
      });

      test('should be visible', function() {
        assert.isFalse(banner.classList.contains('hide'));
      });
    });
  });

  suite('message type conversion >', function() {
    var realCompose;
    var convertBanner, convertBannerText, form;

    suiteSetup(function() {
      realCompose = window.Compose;
      window.Compose = MockCompose;
    });

    suiteTeardown(function() {
      window.Compose = realCompose;
      realCompose = null;
    });

    setup(function() {
      MockCompose.mSetup();

      // This is added in ThreadUI.init, so we need to remove the listener to
      // prevent having the listener being called several times.
      // We need to do this here in addition to main teardown because
      // ThreadUI.init changes the function, binding it.

      document.removeEventListener(
        'visibilitychange', ThreadUI.onVisibilityChange
      );

      ThreadUI.init();

      convertBanner = document.getElementById('messages-convert-notice');
      convertBannerText = convertBanner.querySelector('p');
      form = document.getElementById('messages-compose-form');
    });

    function yieldType(type) {
      Compose.type = type;
      Compose.on.withArgs('type').yield();
    }

    test('sms to mms and back displays banner', function() {
      yieldType('mms');

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');

      assert.equal(
        convertBannerText.getAttribute('data-l10n-id'),
        'converted-to-mms',
        'conversion banner has mms message'
      );

      this.sinon.clock.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      this.sinon.clock.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

      yieldType('sms');

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(
        convertBannerText.getAttribute('data-l10n-id'),
        'converted-to-sms',
        'conversion banner has sms message'
      );

      this.sinon.clock.tick(2999);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for just shy of 3 seconds');

      this.sinon.clock.tick(1);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');
    });

    test('converting from sms to mms and back quickly', function() {
      yieldType('mms');

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for mms');
      assert.equal(
        convertBannerText.getAttribute('data-l10n-id'),
        'converted-to-mms',
        'conversion banner has mms message'
      );

      this.sinon.clock.tick(1500);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is still shown');

      yieldType('sms');

      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is shown for sms');
      assert.equal(
        convertBannerText.getAttribute('data-l10n-id'),
        'converted-to-sms',
        'conversion banner has sms message'
      );

      // long enough to go past the previous timeout 1500 + 2000 > 3000
      this.sinon.clock.tick(2000);
      assert.isFalse(convertBanner.classList.contains('hide'),
        'conversion banner is still shown');

      this.sinon.clock.tick(1000);
      assert.isTrue(convertBanner.classList.contains('hide'),
        'conversion banner is hidden at 3 seconds');

    });

    test('we dont display the banner when cleaning fields', function() {

      yieldType('mms');

      // and ignore this banner which should be there
      this.sinon.clock.tick(ThreadUI.CONVERTED_MESSAGE_DURATION);

      this.sinon.stub(Compose, 'clear');

      ThreadUI.cleanFields();

      sinon.assert.called(Compose.clear);
      assert.isTrue(convertBanner.classList.contains('hide'));
    });
  });

  suite('Recipient Assimiliation', function() {
    setup(function() {
      this.sinon.spy(ThreadUI, 'validateContact');
      this.sinon.spy(ThreadUI.recipients, 'add');
      this.sinon.spy(ThreadUI.recipients, 'remove');
      this.sinon.spy(ThreadUI.recipients, 'update');
      this.sinon.spy(ThreadUI.recipients, 'visible');
      this.sinon.spy(Utils, 'basicContact');
      
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);

      Threads.set(1, {
        participants: ['999']
      });
    });

    teardown(function() {
      Threads.delete(1);
    });

    test('Recipient assimilation is called when Compose is interacted',
      function() {
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      var node = document.createElement('span');
      node.isPlaceholder = true;
      node.textContent = '999';

      ThreadUI.recipientsList.appendChild(node);

      Compose.on.withArgs('interact').yield();

      // recipient added and container is cleared
      sinon.assert.calledWithMatch(ThreadUI.recipients.add, {
        name: '999',
        number: '999',
        source: 'manual'
      });
    });
    
    test('Recipient assimilation is called when container is clicked',
      function() {
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      var node = document.createElement('span');
      node.isPlaceholder = true;
      node.textContent = '999';

      ThreadUI.recipientsList.appendChild(node);

      container.click();

      // recipient added and container is cleared
      sinon.assert.calledWithMatch(ThreadUI.recipients.add, {
        name: '999',
        number: '999',
        source: 'manual'
      });
    });
    
    suite('Recipients.View.isFocusable', function() {

      setup(function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        Recipients.View.isFocusable = true;
      });

      test('Assimilation revokes Recipients focusability ', function() {
        ThreadUI.assimilateRecipients();
        assert.isFalse(Recipients.View.isFocusable);
      });
    });

    suite('Existing Conversation', function() {

      setup(function() {
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
      });

      test('Will not assimilate recipients ', function() {
        ThreadUI.assimilateRecipients();

        sinon.assert.notCalled(ThreadUI.recipients.visible);
        sinon.assert.notCalled(ThreadUI.recipients.add);
      });
    });

    suite('New Conversation', function() {
      var node;

      setup(function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        node = document.createElement('span');
        node.isPlaceholder = true;
        node.textContent = '999';

        ThreadUI.recipientsList.appendChild(node);
      });

      teardown(function() {
        if (ThreadUI.recipientsList.children.length) {
          ThreadUI.recipientsList.removeChild(node);
        }
      });

      suite('Typed number', function() {
        test('Triggers assimilation ', function() {
          var visible;

          ThreadUI.assimilateRecipients();

          visible = ThreadUI.recipients.visible;

          assert.isTrue(visible.called);
          assert.isTrue(visible.firstCall.calledWith('singleline'));
          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: '999',
              number: '999',
              source: 'manual'
            })
          );
        });
      });

      suite('Typed non-number', function() {
        var realContacts;

        suiteSetup(function() {
          realContacts = window.Contacts;
          window.Contacts = MockContacts;
        });

        suiteTeardown(function() {
          window.Contacts = realContacts;
        });

        setup(function() {
          this.sinon.spy(ThreadUI, 'searchContact');
          this.sinon.spy(ThreadUI, 'exactContact');
        });

        test('Triggers assimilation & silent search ', function() {
          node.textContent = 'foo';
          ThreadUI.assimilateRecipients();

          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: 'foo',
              number: 'foo',
              source: 'manual'
            })
          );
        });

        test('Matches contact ', function() {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findByString').yields(
            MockContact.list([
              { givenName: ['Jane'], familyName: ['Doozer'] }
            ])
          );

          ThreadUI.searchContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          assert.isTrue(ThreadUI.recipients.remove.called);
          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: 'Jane Doozer',
              number: '+346578888888',
              type: 'Mobile',
              carrier: 'TEF',
              source: 'contacts'
            })
          );
        });

        test('Does not match contact ', function() {
          // Clear out the existing recipient field fixtures
          ThreadUI.recipients.length = 0;
          ThreadUI.recipientsList.textContent = '';

          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findByString', function(term, callback) {
            callback([]);
          });

          ThreadUI.searchContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          sinon.assert.called(ThreadUI.recipients.update);

          record.isInvalid = true;

          sinon.assert.calledWithMatch(ThreadUI.recipients.update, 0, record);
        });

        test('Exact contact ', function() {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').yields(
            MockContact.list([
              { givenName: ['Jane'], familyName: ['Doozer'] }
            ])
          );

          ThreadUI.exactContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          assert.isTrue(ThreadUI.recipients.remove.called);
          assert.isTrue(ThreadUI.recipients.add.called);
          assert.isTrue(
            ThreadUI.recipients.add.calledWithMatch({
              name: 'Jane Doozer',
              number: '+346578888888',
              type: 'Mobile',
              carrier: 'TEF',
              source: 'contacts'
            })
          );
        });

        test('No exact contact ', function() {
          // Clear out the existing recipient field fixtures
          ThreadUI.recipients.length = 0;
          ThreadUI.recipientsList.textContent = '';

          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').yields([], {});

          ThreadUI.exactContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          sinon.assert.called(ThreadUI.recipients.update);

          record.isInvalid = true;

          sinon.assert.calledWithMatch(ThreadUI.recipients.update, 0, record);
        });

        test('No exact contact, editting recipient ', function() {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact', function(term, callback) {
            callback([], {});
          });

          ThreadUI.exactContact(
            record.number, ThreadUI.validateContact.bind(ThreadUI, record)
          );

          assert.isFalse(ThreadUI.recipients.update.called);
        });

        test('Determines correct strategy ', function() {
          var record = {
            isQuestionable: true,
            isLookupable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          ThreadUI.recipients.add(record);

          record.isLookupable = false;

          ThreadUI.recipients.add(record);

          sinon.assert.calledOnce(ThreadUI.searchContact);
          sinon.assert.calledOnce(ThreadUI.exactContact);
        });
      });
    });

    suite('validateContact', function() {
      var fixture, contacts, fixtureEmail;

      setup(function() {
        fixture = {
          name: 'Janet Jones',
          number: '+346578888888',
          source: 'manual',
          isInvalid: false
        };

        fixtureEmail = {
          name: 'Janet Jones',
          number: 'a@b.com',
          source: 'manual',
          isInvalid: false
        };

        contacts = MockContact.list([
          { givenName: ['Janet'], familyName: ['Jones'] }
        ]);
      });

      suite('No Recipients', function() {
        test('input value has matching record ', function() {

          ThreadUI.validateContact(fixture, '', contacts);

          sinon.assert.calledOnce(ThreadUI.recipients.remove);
          sinon.assert.calledWith(ThreadUI.recipients.remove, 0);

          assert.equal(
            ThreadUI.recipients.add.firstCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.firstCall.args[0].number, '+346578888888'
          );
        });

        test('input value is invalid ', function() {
          // An actual accepted recipient from contacts
          fixture.number = 'foo';
          fixture.isQuestionable = true;

          ThreadUI.recipients.add(fixture);
          assert.isFalse(fixture.isInvalid);

          ThreadUI.recipientsList.lastElementChild.textContent = '';

          ThreadUI.validateContact(fixture, '', []);

          sinon.assert.calledOnce(ThreadUI.recipients.update);
          sinon.assert.calledWithMatch(ThreadUI.recipients.update, 1, fixture);

          assert.isTrue(fixture.isInvalid);
        });

        test('[Email]input value has matching record ', function() {

          MockSettings.supportEmailRecipient = true;
          ThreadUI.validateContact(fixtureEmail, 'a@b.com', contacts);

          sinon.assert.calledOnce(ThreadUI.recipients.remove);
          sinon.assert.calledWith(ThreadUI.recipients.remove, 0);

          assert.equal(
            ThreadUI.recipients.add.firstCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.firstCall.args[0].number, 'a@b.com'
          );
        });

        test('[Email]input value is invalid ', function() {

          MockSettings.supportEmailRecipient = true;

          // An actual accepted recipient from contacts
          fixtureEmail.number = 'foo';
          fixtureEmail.isQuestionable = true;

          ThreadUI.recipients.add(fixtureEmail);
          assert.isFalse(fixtureEmail.isInvalid);

          ThreadUI.recipientsList.lastElementChild.textContent = '';

          ThreadUI.validateContact(fixtureEmail, '', []);

          sinon.assert.calledOnce(ThreadUI.recipients.update);
          sinon.assert.calledWithMatch(ThreadUI.recipients.update,
                                       1, fixtureEmail);

          assert.isTrue(fixtureEmail.isInvalid);
        });
      });

      suite('Has Recipients', function() {
        test('input value has matching duplicate record w/ ' +
              'multiple, different tel records (accept) ', function() {

          // An actual accepted recipient from contacts
          ThreadUI.recipients.add(fixture);

          // The last accepted recipient, manually entered.
          ThreadUI.recipients.add({
            name: 'Janet Jones',
            number: 'Janet Jones',
            source: 'manual'
          });

          ThreadUI.validateContact(fixture, '', contacts);

          sinon.assert.calledOnce(ThreadUI.recipients.remove);
          sinon.assert.calledWith(ThreadUI.recipients.remove, 1);

          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].number, '+12125559999'
          );
          assert.equal(
            Utils.basicContact.returnValues[0].number, '+12125559999'
          );
        });

        test('input value has multiple matching records, the ' +
              'first is a duplicate, use next (accept) ', function() {

          contacts = MockContact.list([
            { givenName: ['Janet'], familyName: ['Jones'] },
            { givenName: ['Jane'], familyName: ['Johnson'] }
          ]);

          contacts[0].tel = [{value: '777'}];
          contacts[1].tel = [{value: '888'}];

          // An actual accepted recipient from contacts
          ThreadUI.recipients.add({
            name: 'Janet Jones',
            number: '777',
            source: 'contacts'
          });

          // The last accepted recipient, manually entered.a
          ThreadUI.recipients.add({
            name: 'Jane',
            number: 'Jane',
            source: 'manual'
          });

          ThreadUI.validateContact(fixture, '', contacts);

          // Called from here, then called again for the
          // second contact record.
          sinon.assert.calledTwice(ThreadUI.validateContact);

          sinon.assert.called(ThreadUI.recipients.remove);
          sinon.assert.called(ThreadUI.recipients.add);

          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].number, '888'
          );
          assert.equal(
            Utils.basicContact.returnValues[0].number, '888'
          );
        });

        test('input value has matching duplicate record w/ ' +
              'single, same tel record (invalid) ', function() {

          // Get rid of the second tel record to create a "duplicate"
          contacts[0].tel.length = 1;

          // An actual accepted recipient from contacts
          fixture.source = 'contacts';
          ThreadUI.recipients.add(fixture);

          fixture.source = 'manual';
          // The last accepted recipient, manually entered.
          ThreadUI.recipients.add(fixture);

          assert.isFalse(fixture.isInvalid);

          ThreadUI.recipientsList.lastElementChild.textContent = '';
          ThreadUI.validateContact(fixture, '', contacts);

          // ThreadUI.recipients.update is called with the updated
          // source recipient object. This object's isValid property
          // has been set to true.
          sinon.assert.calledOnce(
            ThreadUI.recipients.update
          );
          sinon.assert.calledWithMatch(
            ThreadUI.recipients.update, 1, fixture
          );
          assert.isTrue(fixture.isInvalid);
        });

        test('[Email]input value has multiple matching records, the ' +
              'first is a duplicate, use next (accept) ', function() {

          MockSettings.supportEmailRecipient = true;
          contacts = MockContact.list([
            { givenName: ['Janet'], familyName: ['Jones'] },
            { givenName: ['Jane'], familyName: ['Johnson'] }
          ]);

          contacts[0].email = [{value: 'a@b'}];
          contacts[1].email = [{value: 'a@c'}];

          // An actual accepted recipient from contacts
          ThreadUI.recipients.add({
            name: 'Janet Jones',
            number: 'a@b',
            source: 'contacts'
          });

          // The last accepted recipient, manually entered.a
          ThreadUI.recipients.add({
            name: 'Jane',
            number: 'Jane',
            source: 'manual'
          });

          ThreadUI.validateContact(fixtureEmail, 'a@b.com', contacts);

          // Called from here, then called again for the
          // second contact record.
          sinon.assert.calledTwice(ThreadUI.validateContact);

          sinon.assert.called(ThreadUI.recipients.remove);
          sinon.assert.called(ThreadUI.recipients.add);

          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ThreadUI.recipients.add.lastCall.args[0].number, 'a@c'
          );
          assert.equal(
            Utils.basicContact.returnValues[0].number, 'a@c'
          );
        });

        test('[Email]input value has matching duplicate record w/ ' +
              'single, same tel record (invalid) ', function() {

          MockSettings.supportEmailRecipient = true;
          // Get rid of the second tel record to create a "duplicate"
          contacts[0].email.length = 1;

          // An actual accepted recipient from contacts
          fixtureEmail.source = 'contacts';
          ThreadUI.recipients.add(fixtureEmail);

          fixtureEmail.source = 'manual';
          // The last accepted recipient, manually entered.
          ThreadUI.recipients.add(fixtureEmail);

          assert.isFalse(fixtureEmail.isInvalid);

          ThreadUI.recipientsList.lastElementChild.textContent = '';
          ThreadUI.validateContact(fixtureEmail, 'a@b.com', contacts);

          // ThreadUI.recipients.update is called with the updated
          // source recipient object. This object's isValid property
          // has been set to true.
          sinon.assert.calledOnce(
            ThreadUI.recipients.update
          );
          sinon.assert.calledWithMatch(
            ThreadUI.recipients.update, 1, fixtureEmail
          );
          assert.isTrue(fixtureEmail.isInvalid);
        });
      });
    });
  });

  suite('message status update handlers >', function() {
    var statuses = [
      'sending', 'pending', 'sent', 'received', 'delivered', 'read', 'error'
    ];

    var statusesWithIndicator = ['sending', 'delivered', 'read', 'error'];

    var fakeMessage,
        container;

    function assertMessageStatus(statusToAssert) {
      assert.isTrue(container.classList.contains(statusToAssert));

      if (statusesWithIndicator.indexOf(statusToAssert) >= 0) {
        assert.isNotNull(container.querySelector('.message-status'));
      } else {
        assert.isNull(container.querySelector('.message-status'));
      }

      statuses.filter((s) => s !== statusToAssert).forEach(
        (status) => assert.isFalse(container.classList.contains(status))
      );
    }

    setup(function() {
      fakeMessage = MockMessages.sms({
        id: 24601,
        delivery: 'sending'
      });

      this.sinon.stub(Navigation, 'isCurrentPanel').
        withArgs('thread', { id: fakeMessage.threadId }).
        returns(true);

      MessageManager.on.withArgs('message-sending').yield({
        message: fakeMessage
      });

      container = document.getElementById('message-' + fakeMessage.id);
    });

    teardown(function() {
      container.remove();
    });

    suite('onMessageSending >', function() {
      test('sets correct status for message element', function() {
        assertMessageStatus('sending');
      });
    });

    suite('onMessageSent >', function() {
      test('sets correct status for message element', function() {
        MessageManager.on.withArgs('message-sent').yield({
          message: fakeMessage
        });

        assertMessageStatus('sent');
      });
    });

    suite('onMessageFailed >', function() {
      test('sets correct status for message element', function() {
        MessageManager.on.withArgs('message-failed-to-send').yield({
          message: fakeMessage
        });

        assertMessageStatus('error');
      });

      suite('Show error dialog while sending failed',
        function() {
        setup(function() {
          this.sinon.spy(ThreadUI, 'showMessageError');
          this.sinon.stub(Settings, 'switchMmsSimHandler')
            .returns(Promise.resolve());
        });
        test('does not show dialog if error is not NonActiveSimCardError',
          function() {
          MessageManager.on.withArgs('message-failed-to-send').yield({
            message: fakeMessage
          });
          sinon.assert.notCalled(ThreadUI.showMessageError);
        });
        test('Show dialog if error is NonActiveSimCardError',
          function() {
          ThreadUI.showErrorInFailedEvent = 'NonActiveSimCardError';
          MessageManager.on.withArgs('message-failed-to-send').yield({
            message: fakeMessage
          });
          sinon.assert.called(ThreadUI.showMessageError);
          assert.equal(ThreadUI.showErrorInFailedEvent, '');
          MockErrorDialog.calls[0][1].confirmHandler();

          assertMessageStatus('sending');
          sinon.assert.called(Settings.switchMmsSimHandler);
        });
      });
    });

    suite('onDeliverySuccess >', function() {
      test('sms delivery success', function() {
        fakeMessage.type = 'sms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryStatus = 'success';
        MessageManager.on.withArgs('message-delivered').yield({
          message: fakeMessage
        });

        assertMessageStatus('delivered');
      });
      test('mms delivery success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [{
          receiver: null, deliveryStatus: 'success'}];
        MessageManager.on.withArgs('message-delivered').yield({
          message: fakeMessage
        });

        assertMessageStatus('delivered');
      });
      test('multiple recipients mms delivery success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [
          {receiver: null, deliveryStatus: 'success'},
          {receiver: null, deliveryStatus: 'success'}];
        MessageManager.on.withArgs('message-delivered').yield({
          message: fakeMessage
        });

        assertMessageStatus('delivered');
      });
      test('not all recipients return mms delivery success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [
          {receiver: null, deliveryStatus: 'success'},
          {receiver: null, deliveryStatus: 'pending'}];
        MessageManager.on.withArgs('message-delivered').yield({
          message: fakeMessage
        });

        assertMessageStatus('sending');
      });
    });

    suite('onReadSuccess >', function() {
      test('mms read success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [{
          receiver: null, readStatus: 'success'}];
        MessageManager.on.withArgs('message-read').yield({
          message: fakeMessage
        });

        assertMessageStatus('read');
      });
      test('display read icon when both delivery/read success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [{
          receiver: null, deliveryStatus: 'success', readStatus: 'success'}];
        MessageManager.on.withArgs('message-delivered').yield({
          message: fakeMessage
        });
        MessageManager.on.withArgs('message-read').yield({
          message: fakeMessage
        });

        assertMessageStatus('read');
      });
      test('multiple recipients mms read success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [
          {receiver: null, readStatus: 'success'},
          {receiver: null, readStatus: 'success'}];
        MessageManager.on.withArgs('message-read').yield({
          message: fakeMessage
        });

        assertMessageStatus('read');
      });
      test('not all recipients return mms read success', function() {
        fakeMessage.type = 'mms';
        fakeMessage.delivery = 'sent';
        fakeMessage.deliveryInfo = [
          {receiver: null, readStatus: 'success'},
          {receiver: null, readStatus: 'pending'}];
        MessageManager.on.withArgs('message-read').yield({
          message: fakeMessage
        });

        assertMessageStatus('sending');
      });
    });
  });

  suite('removeMessageDOM', function() {
    setup(function() {
      ThreadUI.container.innerHTML =
        '<div><h2></h2><ul><li></li><li></li></ul></div>';
    });
    teardown(function() {
      ThreadUI.container.innerHTML = '';
    });
    test('removeMessageDOM removes a child', function() {
      ThreadUI.removeMessageDOM(ThreadUI.container.querySelector('li'));
      assert.equal(ThreadUI.container.querySelectorAll('li').length, 1);
    });
    test('removeMessageDOM removes header and list container', function() {
      ThreadUI.removeMessageDOM(ThreadUI.container.querySelector('li'));
      ThreadUI.removeMessageDOM(ThreadUI.container.querySelector('li'));
      assert.equal(ThreadUI.container.childElementCount, 0);
    });
  });

  suite('getMessageContainer >', function() {
    var lastYear, yesterday, today;
    var fiveMinAgo, elevenMinAgo, oneHourAgo, oneHourFiveMinAgo;

    setup(function() {
      today = new Date(2013, 11, 31, 23, 59);
      this.sinon.clock.restore();
      this.sinon.useFakeTimers(+today);

      lastYear = new Date(2012, 11, 31);
      yesterday = new Date(2013, 11, 30, 12, 0);
      fiveMinAgo = new Date(2013, 11, 31, 23, 54);
      elevenMinAgo = new Date(2013, 11, 31, 23, 48);
      oneHourAgo = new Date(2013, 11, 31, 22, 59);
      oneHourFiveMinAgo = new Date(2013, 11, 31, 22, 54);
    });

    suite('latest block alone today >', function() {
      var subject;

      setup(function() {
        subject = ThreadUI.getMessageContainer(+fiveMinAgo);
      });

      test('New created block should have message-list class', function() {
        assert.isTrue(subject.classList.contains('message-list'));
      });
    });

    suite('2 recent messages, different days >', function() {
      var firstContainer, secondContainer;
      setup(function() {
        firstContainer = ThreadUI.getMessageContainer(Date.now());
        // 5 minutes to be next day, would be the same container if same day
        this.sinon.clock.tick(5 * 60 * 1000);

        secondContainer = ThreadUI.getMessageContainer(Date.now());
      });

      test('different containers', function() {
        assert.notEqual(secondContainer, firstContainer);
      });

      test('second container has both the date and the time', function() {
        var secondHeader = secondContainer.previousElementSibling;
        assert.notEqual(secondHeader.dataset.timeOnly, 'true');
      });
    });

    suite('2 recent messages, same day, 15 minutes interval >', function() {
      var firstContainer, secondContainer, firstTimestamp;

      setup(function() {
        this.sinon.clock.tick(15 * 60 * 1000); // 15 minutes to be the next day
        firstContainer = ThreadUI.getMessageContainer(Date.now());
        firstTimestamp = firstContainer.dataset.timestamp;
        this.sinon.clock.tick(15 * 60 * 1000);

        secondContainer = ThreadUI.getMessageContainer(Date.now());
      });

      test('same containers', function() {
        assert.equal(secondContainer, firstContainer);
      });

      test('should have only 1 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 1);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 1);
      });


      test('container has a start-of-the-day timestamp', function() {
        assert.equal(firstContainer.dataset.timestamp, firstTimestamp);
      });
    });

    suite('insert one non-last-message block at the end >', function() {
      var lastYearContainer, yesterdayContainer;

      setup(function() {
        lastYearContainer = ThreadUI.getMessageContainer(+lastYear);
        yesterdayContainer = ThreadUI.getMessageContainer(+yesterday);
      });

      test('should have 2 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 2);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 2);
      });

      test('should be in the correct order', function() {
        var containers = ThreadUI.container.querySelectorAll('ul');
        var expectedContainers = [
          lastYearContainer,
          yesterdayContainer
        ];

        expectedContainers.forEach(function(container, index) {
          assert.equal(container, containers[index]);
        });
      });
    });

    suite('insert one non-last-message block at the end of a 2-item list >',
      function() {

      var lastYearContainer, yesterdayContainer, twoDaysAgoContainer;

      setup(function() {
        lastYearContainer = ThreadUI.getMessageContainer(+lastYear);
        var twoDaysAgo = new Date(2013, 11, 29);
        twoDaysAgoContainer = ThreadUI.getMessageContainer(+twoDaysAgo);
        yesterdayContainer = ThreadUI.getMessageContainer(+yesterday);
      });

      test('should have 3 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 3);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 3);
      });

      test('should be in the correct order', function() {
        var containers = ThreadUI.container.querySelectorAll('ul');
        var expectedContainers = [
          lastYearContainer,
          twoDaysAgoContainer,
          yesterdayContainer
        ];

        expectedContainers.forEach(function(container, index) {
          assert.equal(container, containers[index]);
        });
      });
    });

    suite('3 blocks suite >', function() {
      var lastYearContainer, yesterdayContainer;
      var elevenMinContainer, fiveMinContainer;
      var oneHourContainer, oneHourFiveContainer;

      setup(function() {
        yesterdayContainer = ThreadUI.getMessageContainer(+yesterday);
        // Messages created today should be in the same block and last message
        // block should not exist anymore
        fiveMinContainer = ThreadUI.getMessageContainer(+fiveMinAgo);
        elevenMinContainer = ThreadUI.getMessageContainer(+elevenMinAgo);
        oneHourContainer = ThreadUI.getMessageContainer(+oneHourAgo);
        oneHourFiveContainer = ThreadUI.getMessageContainer(+oneHourFiveMinAgo);
        // this one requested at the end to check that we correctly put it at
        // the start
        lastYearContainer = ThreadUI.getMessageContainer(+lastYear);
      });

      test('should have 3 blocks', function() {
        assert.equal(ThreadUI.container.querySelectorAll('header').length, 3);
        assert.equal(ThreadUI.container.querySelectorAll('ul').length, 3);
      });

      test('should be in the correct order', function() {
        var containers = ThreadUI.container.querySelectorAll('ul');
        var expectedContainers = [
          lastYearContainer,
          yesterdayContainer,
          fiveMinContainer
        ];

        expectedContainers.forEach(function(container, index) {
          assert.equal(container, containers[index]);
        });
      });

      test('some containers are the same', function() {
        assert.equal(oneHourContainer, elevenMinContainer);
        assert.equal(oneHourFiveContainer, elevenMinContainer);
        assert.equal(fiveMinContainer, elevenMinContainer);
      });

      test('adding a new message in the latest block', function() {
        var twoMinAgo = new Date(2013, 11, 31, 23, 57);
        var twoMinContainer = ThreadUI.getMessageContainer(+twoMinAgo);
        assert.equal(twoMinContainer, fiveMinContainer);
      });

      suite('adding a new message for yesterday >', function() {
        var container;
        var oldHeaderTimestamp;

        setup(function() {
          var header = yesterdayContainer.previousElementSibling;
          oldHeaderTimestamp = header.dataset.time;

          var yesterdayEarlier = new Date(+yesterday);
          yesterdayEarlier.setHours(5, 5);
          container = ThreadUI.getMessageContainer(+yesterdayEarlier);
        });

        test('still 3 blocks', function() {
          assert.equal(ThreadUI.container.querySelectorAll('header').length, 3);
        });

        test('same container as the existing yesterday container', function() {
          assert.equal(container, yesterdayContainer);
        });

        test('the time header was updated', function() {
          var header = container.previousElementSibling;
          var headerTimestamp = header.dataset.time;
          assert.notEqual(headerTimestamp, oldHeaderTimestamp);
        });
      });
    });
  });

  suite('appendMessage >', function() {
    var someDateInThePast;

    setup(function() {
      someDateInThePast = new Date(2010, 10, 10, 16, 0);

      ThreadUI.appendMessage({
        id: 1,
        threadId: 1,
        timestamp: +someDateInThePast
      });
    });

    teardown(function() {
      ThreadUI.container = '';
    });

    test('removes original message when rendered a second time', function() {
      var originalMessage = ThreadUI.container.querySelector(
        '[data-message-id="1"]'
      );

      ThreadUI.appendMessage({
        id: 1,
        threadId: 1,
        timestamp: +someDateInThePast
      });

      var message = ThreadUI.container.querySelector('[data-message-id="1"]');

      assert.isNotNull(originalMessage);
      assert.isNotNull(message);
      assert.notEqual(message, originalMessage);
    });

    test('inserts message at the beginning', function() {
      someDateInThePast.setHours(someDateInThePast.getHours() - 1);

      ThreadUI.appendMessage({
        id: 2,
        threadId: 1,
        timestamp: +someDateInThePast
      });

      var messageItemNodes = ThreadUI.container.querySelectorAll('.message');

      assert.equal(messageItemNodes.length, 2);
      assert.equal(+messageItemNodes[0].dataset.messageId, 2);
      assert.equal(+messageItemNodes[1].dataset.messageId, 1);
    });

    test('inserts message at the right spot in the middle', function() {
      someDateInThePast.setHours(someDateInThePast.getHours() + 2);
      ThreadUI.appendMessage({
        id: 3,
        threadId: 1,
        timestamp: +someDateInThePast
      });

      someDateInThePast.setHours(someDateInThePast.getHours() - 1);
      ThreadUI.appendMessage({
        id: 2,
        threadId: 1,
        timestamp: +someDateInThePast
      });

      var messageItemNodes = ThreadUI.container.querySelectorAll('.message');

      assert.equal(messageItemNodes.length, 3);
      assert.equal(+messageItemNodes[0].dataset.messageId, 1);
      assert.equal(+messageItemNodes[1].dataset.messageId, 2);
      assert.equal(+messageItemNodes[2].dataset.messageId, 3);
    });

    test('inserts message at the end', function() {
      someDateInThePast.setHours(someDateInThePast.getHours() + 1);

      ThreadUI.appendMessage({
        id: 2,
        threadId: 1,
        timestamp: +someDateInThePast
      });

      var messageItemNodes = ThreadUI.container.querySelectorAll('.message');

      assert.equal(messageItemNodes.length, 2);
      assert.equal(+messageItemNodes[0].dataset.messageId, 1);
      assert.equal(+messageItemNodes[1].dataset.messageId, 2);
    });
  });

  suite('buildMessageDOM >', function() {
    setup(function() {
      this.sinon.spy(Template, 'escape');
      this.sinon.stub(MockSMIL, 'parse');
      this.sinon.spy(ThreadUI.tmpl.message, 'interpolate');
    });

    function buildSMS(payload) {
      return MockMessages.sms({ body: payload });
    }

    function buildMMS(payload) {
      return MockMessages.mms({
        attachments: [new Blob([payload], {type: 'text/plain'})]
      });
    }

    test('escapes the body for SMS', function() {
      var payload = 'hello <a href="world">world</a>';
      ThreadUI.buildMessageDOM(buildSMS(payload));
      assert.ok(Template.escape.calledWith(payload));
    });

    test('escapes all text for MMS', function() {
      var payload = 'hello <a href="world">world</a>';
      MockSMIL.parse.yields([{ text: payload }]);
      ThreadUI.buildMessageDOM(buildMMS(payload));
      assert.ok(Template.escape.calledWith(payload));
    });

    test('calls template with subject for MMS', function() {
      var now = Date.now();
      ThreadUI.buildMessageDOM({
        id: '1',
        timestamp: now,
        subject: 'subject',
        type: 'mms',
        deliveryInfo: [],
        attachments: []
      });
      sinon.assert.calledWithMatch(ThreadUI.tmpl.message.interpolate, {
        id: '1',
        bodyHTML: '',
        timestamp: '' + now,
        subject: 'subject'
      });
    });

    test('correctly sets the iccId in the dataset', function() {
      var node;

      node = ThreadUI.buildMessageDOM(MockMessages.sms({ iccId: 'A' }));
      assert.equal(node.dataset.iccId, 'A');
      assert.isNull(
        node.querySelector('.message-sim-information'),
        'The SIM information is not displayed'
      );

      node = ThreadUI.buildMessageDOM(MockMessages.mms({ iccId: 'A' }));
      assert.equal(node.dataset.iccId, 'A');
      assert.isNull(
        node.querySelector('.message-sim-information'),
        'The SIM information is not displayed'
      );
    });

    test('correctly shows the SIM information when present', function() {
      var tests = ['A', 'B'];
      this.sinon.stub(Settings, 'getServiceIdByIccId');

      tests.forEach((iccId, serviceId) => {
        Settings.getServiceIdByIccId.withArgs(iccId).returns(serviceId);
      });

      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);

      // testing with serviceId both equal to 0 and not 0, to check we handle
      // correctly falsy correct values
      tests.forEach((iccId, serviceId) => {
        var node = ThreadUI.buildMessageDOM(MockMessages.mms({ iccId: iccId }));
        assert.isNull(
          node.querySelector('.message-sim-information'),
          'The SIM information is not displayed'
        );
      });

      Settings.hasSeveralSim.returns(true);

      tests.forEach((iccId, serviceId) => {
        var node = ThreadUI.buildMessageDOM(MockMessages.mms({ iccId: iccId }));
        var simInformationNode = node.querySelector('.message-sim-information');
        assert.ok(simInformationNode, 'The SIM information is displayed');
        var simInformation = JSON.parse(simInformationNode.dataset.l10nArgs);
        assert.equal(simInformation.id, serviceId + 1);
      });
    });

    test('add message status only when needed', function() {
      var receivedMessage = MockMessages.sms({ delivery: 'received'}),
          sentMessage = MockMessages.sms({
            delivery: 'sent',
            deliveryStatus: 'pending'
          }),
          deliveredMessage = MockMessages.sms({ delivery: 'sent' }),
          readMessage = MockMessages.mms({ delivery: 'sent' }),
          failedMessage = MockMessages.sms({ delivery: 'error' }),
          sendingMessage = MockMessages.sms({ delivery: 'sending' });

      var node = ThreadUI.buildMessageDOM(receivedMessage);
      assert.isNull(node.querySelector('.message-status'));

      node = ThreadUI.buildMessageDOM(sentMessage);
      assert.isNull(node.querySelector('.message-status'));

      node = ThreadUI.buildMessageDOM(deliveredMessage);
      assert.isNotNull(node.querySelector('.message-status'));
      assert.isTrue(node.classList.contains('delivered'));

      node = ThreadUI.buildMessageDOM(readMessage);
      assert.isNotNull(node.querySelector('.message-status'));
      assert.isTrue(node.classList.contains('read'));

      node = ThreadUI.buildMessageDOM(failedMessage);
      assert.isNotNull(node.querySelector('.message-status'));
      assert.isTrue(node.classList.contains('error'));

      node = ThreadUI.buildMessageDOM(sendingMessage);
      assert.isNotNull(node.querySelector('.message-status'));
      assert.isTrue(node.classList.contains('sending'));
    });

    test('sets delivery class when delivery status is success', function() {
      var message = MockMessages.mms({
        delivery: 'sent',
        deliveryInfo: [{
          receiver: null,
          deliveryStatus: 'success'
        }]
      });

      var node = ThreadUI.buildMessageDOM(message);
      assert.isTrue(node.classList.contains('delivered'));
    });

    test('sets read class when read status is success', function() {
      var message = MockMessages.mms({
        delivery: 'sent',
        deliveryInfo: [{
          receiver: null,
          readStatus: 'success'
        }]
      });

      var node = ThreadUI.buildMessageDOM(message);
      assert.isTrue(node.classList.contains('read'));
    });

    test('sets read class only when both statuses are success', function() {
      var message = MockMessages.mms({
        delivery: 'sent',
        deliveryInfo: [{
          receiver: null,
          deliveryStatus: 'success',
          readStatus: 'success'
        }]
      });

      var node = ThreadUI.buildMessageDOM(message);
      assert.isFalse(node.classList.contains('delivered'));
      assert.isTrue(node.classList.contains('read'));
    });
  });

  suite('renderMessages()', function() {
    setup(function() {
      this.sinon.stub(MessageManager, 'getMessages');

      ThreadUI.initializeRendering();
    });

    suite('nominal behavior', function() {
      setup(function() {
        ThreadUI.renderMessages(1);
      });

      test('infinite rendering test', function() {
        var chunkSize = ThreadUI.CHUNK_SIZE;
        var message;

        for (var i = 1; i < chunkSize; i++) {
          MessageManager.getMessages.yieldTo(
            'each', MockMessages.sms({ id: i })
          );
          message = document.getElementById('message-' + i);
          assert.ok(
            message.classList.contains('hidden'),
            'message-' + i + ' should be hidden'
          );
        }

        MessageManager.getMessages.yieldTo(
          'each', MockMessages.sms({ id: i })
        );

        assert.isNull(
          container.querySelector('.hidden'),
          'all previously hidden messages should now be displayed'
        );

        MessageManager.getMessages.yieldTo(
          'each', MockMessages.sms({ id: ++i })
        );

        message = document.getElementById('message-' + i);
        assert.ok(
          message.classList.contains('hidden'),
          'message-' + i + ' should be hidden'
        );
      });

      suite('scrolling behavior for first chunk', function() {
        setup(function() {
          this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
          Navigation.isCurrentPanel.withArgs('thread').returns(true);

          this.sinon.stub(HTMLElement.prototype, 'scrollIntoView');

          for (var i = 1; i < ThreadUI.CHUNK_SIZE; i++) {
            MessageManager.getMessages.yieldTo(
              'each', MockMessages.sms({ id: i })
            );
          }
        });

        test('should scroll to the end', function() {
          MessageManager.getMessages.yieldTo(
            'each', MockMessages.sms({ id: ThreadUI.CHUNK_SIZE })
          );

          sinon.assert.called(HTMLElement.prototype.scrollIntoView);
        });

        test('should not scroll to the end if in the wrong panel', function() {
          Navigation.isCurrentPanel.withArgs('thread').returns(false);

          MessageManager.getMessages.yieldTo(
            'each', MockMessages.sms({ id: ThreadUI.CHUNK_SIZE })
          );

          sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
        });
      });
    });

    suite('calling stopRendering then renderMessages', function() {
      setup(function() {
        ThreadUI.stopRendering();
        ThreadUI.renderMessages(1);
      });

      test('getMessages should not be called', function() {
        sinon.assert.notCalled(MessageManager.getMessages);
      });
    });
  });

  suite('more complex renderMessages behavior,', function() {
    var transitionArgs;

    setup(function() {
      Threads.set(1, {
        participants: ['999']
      });

      transitionArgs = {
        id: '1',
        meta: {
          next: { panel: 'thread', args: { id: '1' } },
          prev: { panel: 'thread-list', args: {} }
        }
      };
    });

    test('renderMessages does not render if we pressed back', function() {
      this.sinon.stub(MessageManager, 'getMessages');
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);

      ThreadUI.beforeEnter(transitionArgs);

      // Trigger the action button on the header
      var event = document.createEvent('HTMLEvents');
      event.initEvent('action', true, true);
      document.getElementById('messages-header').dispatchEvent(event);

      Navigation.isCurrentPanel.withArgs('thread').returns(true);
      ThreadUI.afterEnter(transitionArgs);
      sinon.assert.notCalled(MessageManager.getMessages);
    });
  });

  suite('deleting messages and threads', function() {
    var container;

    var testMessages = [{
      id: 1,
      threadId: 8,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 2,
      threadId: 8,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 5,
      threadId: 9,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 6,
      threadId: 10,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 7,
      threadId: 11,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 8,
      threadId: 12,
      timestamp: +new Date(Date.now() - 150000)
    }];

    var checkIfMessageIsInDOM = function(id) {
      return !!container.querySelector('#message-' + id);
    };

    var doMarkedMessagesDeletion = function(ids) {
      if (!Array.isArray(ids)) {
        ids = [ids];
      }

      var message, checkbox;
      for (var i = 0; i < ids.length; i++) {
        message = container.querySelector('#message-' + ids[i]);
        checkbox = message.querySelector('input[type=checkbox]');
        checkbox.checked = true;
      }
      ThreadUI.delete();
      MockDialog.triggers.confirm();
    };

    setup(function() {
      container =
        ThreadUI.getMessageContainer(testMessages[0].timestamp, false);
      for (var i = 0; i < testMessages.length; i++) {
        ThreadUI.appendMessage(testMessages[i]);
      }
      doMarkedMessagesDeletion = doMarkedMessagesDeletion.bind(this);
    });

    teardown(function() {
      container.innerHTML = '';
    });

    test('dialog shows the proper message', function() {
      doMarkedMessagesDeletion(1);
      assert.isTrue(MockDialog.prototype.show.called);
      assert.equal(MockDialog.calls[0].body.l10nId,
                      'deleteMessages-confirmation');
      assert.equal(MockDialog.calls[0].options.confirm.text.l10nId,
                      'delete', 'right text on button');
      assert.equal(MockDialog.calls[0].options.confirm.className,
                      'danger','right styling on button');
    });
    test('dialog confirmed', function() {
      doMarkedMessagesDeletion(1);
      assert.isTrue(MockDialog.triggers.confirm.called);
      assert.isFalse(MockDialog.triggers.cancel.called);
    });

    test('deleting a single message removes it from the DOM', function() {
      ThreadUI.deleteUIMessages(testMessages[0].id);
      assert.isFalse(checkIfMessageIsInDOM(testMessages[0].id));
    });

    test('messages marked for deletion get deleted', function() {
      var messagesToDelete = [1, 2];
      doMarkedMessagesDeletion(messagesToDelete);

      for (var i = 0; i < testMessages.length; i++) {
        assert.equal(checkIfMessageIsInDOM(testMessages[i].id),
                     messagesToDelete.indexOf(testMessages[i].id) == -1);
      }
    });

    test('deleting marked messages takes user back to view mode', function() {
      this.sinon.stub(ThreadListUI, 'updateThread').returns(true);
      ThreadUI.startEdit();
      doMarkedMessagesDeletion(1);
      MessageManager.mTriggerOnSuccess();
      assert.isFalse(ThreadUI.mainWrapper.classList.contains('edit'));
    });

    test('thread gets updated when a message is deleted', function() {
      var updateThreadSpy =
        this.sinon.stub(ThreadListUI, 'updateThread').returns(true);
      doMarkedMessagesDeletion(1);
      MessageManager.mTriggerOnSuccess();
      sinon.assert.calledWith(updateThreadSpy, undefined, { deleted: true });
    });

    test('waiting screen shown when messages are deleted', function() {
      this.sinon.spy(WaitingScreen, 'show');
      doMarkedMessagesDeletion(1);
      sinon.assert.calledOnce(WaitingScreen.show);
    });

    test('waiting screen hidden when messages are done deletion', function() {
      this.sinon.stub(ThreadListUI, 'updateThread').returns(true);
      this.sinon.spy(WaitingScreen, 'hide');
      doMarkedMessagesDeletion(1);
      MessageManager.mTriggerOnSuccess();
      sinon.assert.calledOnce(WaitingScreen.hide);
    });

    suite('deleting all messages', function() {
      setup(function() {
        this.sinon.stub(ThreadListUI, 'removeThread');
        this.sinon.stub(ThreadUI, 'back');
        this.sinon.stub(ThreadUI, 'close');
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        this.sinon.stub(ActivityHandler, 'isInActivity').returns(false);
      });

      test('when not in an activity, deletes the thread and navigates back',
      function() {
        ThreadUI.deleteUIMessages(testMessages.map((m) => m.id));
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        sinon.assert.called(ThreadUI.back);
        sinon.assert.notCalled(ThreadUI.close);
      });

      test('when in an activity, deletes the thread and closes activity',
      function() {
        ActivityHandler.isInActivity.returns(true);
        ThreadUI.deleteUIMessages(testMessages.map((m) => m.id));
        sinon.assert.calledOnce(ThreadListUI.removeThread);
        sinon.assert.notCalled(ThreadUI.back);
        sinon.assert.called(ThreadUI.close);
      });
    });

    test('error still calls callback', function() {
      var callbackStub = this.sinon.stub();
      ThreadUI.deleteUIMessages([], callbackStub);
      MessageManager.mTriggerOnError();
      sinon.assert.calledOnce(callbackStub);
    });
  });

  suite('not-downloaded', function() {
    var ONE_DAY_TIME = 24 * 60 * 60 * 1000;

    function getTestMessage(index) {
      var testMessages = [{
        id: 1,
        threadId: 8,
        sender: '123456',
        iccId: 'A',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'pending'}],
        subject: 'Pending download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() + ONE_DAY_TIME)
      },
      {
        id: 2,
        threadId: 8,
        sender: '123456',
        iccId: 'B',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'manual'}],
        subject: 'manual download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() + ONE_DAY_TIME * 2)
      },
      {
        id: 3,
        threadId: 8,
        sender: '123456',
        iccId: 'B',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
        subject: 'error download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() + ONE_DAY_TIME * 2)
      },
      {
        id: 4,
        threadId: 8,
        sender: '123456',
        iccId: 'B',
        type: 'mms',
        delivery: 'not-downloaded',
        deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
        subject: 'Error download',
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now() - ONE_DAY_TIME)
      }];

      return testMessages[index];
    }

    setup(function() {
      // we do this here because of sinon fake timers
      this.sinon.stub(Utils.date.format, 'localeFormat', function() {
        return 'date_stub';
      });
      this.sinon.stub(MessageManager, 'retrieveMMS', function() {
        return {};
      });
    });
    suite('pending message', function() {
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(0);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage = element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class absent', function() {
        assert.isFalse(element.classList.contains('error'));
      });
      test('expired class absent', function() {
        assert.isFalse(element.classList.contains('expired'));
      });
      test('pending class present', function() {
        assert.isTrue(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'not-downloaded-attachment',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'expiry-date-format');
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'downloading-attachment');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('does not call retrieveMMS', function() {
          assert.equal(MessageManager.retrieveMMS.args.length, 0);
        });
      });
    });
    suite('manual message', function() {
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(1);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage = element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class absent', function() {
        assert.isFalse(element.classList.contains('error'));
      });
      test('expired class absent', function() {
        assert.isFalse(element.classList.contains('expired'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'not-downloaded-attachment',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'expiry-date-format');
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'download-attachment');
      });
      suite('clicking', function() {
        var showMessageErrorSpy;

        setup(function() {
          if (!('mozSettings' in navigator)) {
           navigator.mozSettings = null;
          }

          this.sinon.stub(navigator, 'mozSettings', MockNavigatorSettings);
          showMessageErrorSpy = this.sinon.spy(ThreadUI, 'showMessageError');
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('changes button text to "downloading"', function() {
          assert.equal(
            button.getAttribute('data-l10n-id'),
            'downloading-attachment'
          );
        });
        test('error class absent', function() {
          assert.isFalse(element.classList.contains('error'));
        });
        test('pending class present', function() {
          assert.isTrue(element.classList.contains('pending'));
        });
        test('click calls retrieveMMS', function() {
          assert.isTrue(MessageManager.retrieveMMS.calledWith(message.id));
        });
        suite('response error', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('error class present', function() {
            assert.isTrue(element.classList.contains('error'));
          });
          test('pending class absent', function() {
            assert.isFalse(element.classList.contains('pending'));
          });
          test('changes button text to "download"', function() {
            assert.equal(
              button.getAttribute('data-l10n-id'),
              'download-attachment'
            );
          });
          test('Message error dialog should not exist', function() {
            assert.equal(showMessageErrorSpy.called, false);
          });
        });

        suite('response non-active sim card error', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].error =
            {
              name: 'NonActiveSimCardError'
            };
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });

          test('Error dialog params and show', function() {
            var code = MockErrorDialog.calls[0][0];
            var opts = MockErrorDialog.calls[0][1];
            assert.equal(code, Errors.get('NonActiveSimCardError'));
            assert.isTrue(!!opts.confirmHandler);
            assert.equal(MockErrorDialog.prototype.show.called, true);
          });

          test('confirmHandler called with correct state', function() {
            this.sinon.stub(Settings, 'switchMmsSimHandler').returns(
              Promise.resolve());
            this.sinon.stub(Settings, 'getServiceIdByIccId').returns(null);
            Settings.getServiceIdByIccId.withArgs('A').returns(0);
            Settings.getServiceIdByIccId.withArgs('B').returns(1);

            MockErrorDialog.calls[0][1].confirmHandler();
            assert.isTrue(element.classList.contains('pending'));
            assert.isFalse(element.classList.contains('error'));
            assert.equal(
              button.getAttribute('data-l10n-id'),
              'downloading-attachment'
            );
            sinon.assert.calledWith(Settings.switchMmsSimHandler, 1);
          });

          test('fail if the SIM is not present anymore', function() {
            this.sinon.spy(Settings, 'switchMmsSimHandler');
            this.sinon.stub(Settings, 'getServiceIdByIccId').returns(null);

            MockErrorDialog.calls[0][1].confirmHandler();
            assert.isFalse(element.classList.contains('pending'));
            assert.isTrue(element.classList.contains('error'));
            sinon.assert.notCalled(Settings.switchMmsSimHandler);
            assert.equal(
              MockErrorDialog.calls[1][0],
              Errors.get('NoSimCardError')
            );
          });
        });

        test('response with radio disabled error', function() {
          MessageManager.retrieveMMS.returnValues[0].error = {
            name: 'RadioDisabledError'
          };
          MessageManager.retrieveMMS.returnValues[0].onerror();

          // Replaced with ThreadUI specific error code
          sinon.assert.calledWith(
            showMessageErrorSpy,
            'RadioDisabledToDownloadError',
            { confirmHandler: sinon.match.func }
          );
        });

        suite('response error with other errorCode', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].error =
            {
              name: 'OtherError'
            };
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('Error dialog params and show', function() {
            var code = MockErrorDialog.calls[0][0];
            assert.equal(code, Errors.get('OtherError'));
            assert.equal(MockErrorDialog.prototype.show.called, true);
          });
        });
        suite('response error with no errorCode', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].code =
            {
              name: null
            };
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('No error dialog for no error code case', function() {
            assert.isFalse(showMessageErrorSpy.called);
          });
        });
        suite('response success', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onsuccess();
          });
          // re-rendering message happens from a status handler
          test('removes message', function() {
            assert.equal(element.parentNode, null);
          });
        });
      });
    });
    suite('error message', function() {
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(2);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage =
          element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('expired class absent', function() {
        assert.isFalse(element.classList.contains('expired'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(
          notDownloadedMessage.dataset.l10nId,
          'not-downloaded-attachment',
          'localization id set correctly'
        );
        assert.equal(
          notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly'
        );
        assert.equal(
          notDownloadedMessage.dataset.l10nDateFormat,
          'expiry-date-format',
          'localization date format set correctly'
        );
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'expiry-date-format');
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'download-attachment');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('changes download text', function() {
          assert.equal(
            button.getAttribute('data-l10n-id'),
            'downloading-attachment'
          );
        });
        test('error class absent', function() {
          assert.isFalse(element.classList.contains('error'));
        });
        test('pending class present', function() {
          assert.isTrue(element.classList.contains('pending'));
        });
        test('click calls retrieveMMS', function() {
          assert.isTrue(MessageManager.retrieveMMS.calledWith(message.id));
        });
        suite('response error', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onerror();
          });
          test('error class present', function() {
            assert.isTrue(element.classList.contains('error'));
          });
          test('pending class absent', function() {
            assert.isFalse(element.classList.contains('pending'));
          });
          test('changes button text to "download"', function() {
            assert.equal(
              button.getAttribute('data-l10n-id'),
              'download-attachment'
            );
          });
        });
        suite('response success', function() {
          setup(function() {
            MessageManager.retrieveMMS.returnValues[0].onsuccess();
          });
          // re-rendering message happens from a status handler
          test('removes message', function() {
            assert.equal(element.parentNode, null);
          });
        });
      });
    });

    suite('expired message', function() {
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function() {
        message = getTestMessage(3);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        notDownloadedMessage =
          element.querySelector('.not-downloaded-message');
        button = element.querySelector('button');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('not-downloaded class present', function() {
        assert.isTrue(element.classList.contains('not-downloaded'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('expired class present', function() {
        assert.isTrue(element.classList.contains('expired'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'expired-attachment',
          'localization id set correctly');
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          '{"date":"date_stub"}',
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.equal(+Utils.date.format.localeFormat.args[0][0],
          message.expiryDate);
        assert.equal(Utils.date.format.localeFormat.args[0][1],
          'expiry-date-format');
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: button
          });
        });
        test('does not call retrieveMMS', function() {
          assert.equal(MessageManager.retrieveMMS.args.length, 0);
        });
      });
    });
  });

  suite('No attachment error handling', function() {
    function getTestMessage(index) {
      var testMessages = [{
        id: 1,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'received',
        deliveryInfo: [{receiver: null, deliveryStatus: 'success'}],
        subject: 'No attachment testing',
        smil: '<smil><body><par><text src="cid:1"/>' +
              '</par></body></smil>',
        attachments: null,
        timestamp: +new Date(Date.now() - 150000),
        expiryDate: +new Date(Date.now())
      },
      {
        id: 2,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'received',
        deliveryInfo: [{receiver: null, deliveryStatus: 'success'}],
        subject: 'Empty attachment testing',
        smil: '<smil><body><par><text src="cid:1"/>' +
              '</par></body></smil>',
        attachments: [],
        timestamp: +new Date(Date.now() - 100000),
        expiryDate: +new Date(Date.now())
      },
      {
        id: 3,
        threadId: 8,
        sender: '123456',
        type: 'mms',
        delivery: 'received',
        deliveryInfo: [{receiver: null, deliveryStatus: 'success'}],
        subject: '',
        smil: '',
        attachments: [],
        timestamp: +new Date(Date.now() - 50000),
        expiryDate: +new Date(Date.now())
      }];

      return testMessages[index];
    }

    setup(function() {
      this.sinon.stub(Utils.date.format, 'localeFormat', function() {
        return 'date_stub';
      });
      this.sinon.stub(MessageManager, 'retrieveMMS', function() {
        return {};
      });
    });

    suite('no attachment message', function() {
      var message;
      var element;
      var noAttachmentMessage;
      setup(function() {
        message = getTestMessage(0);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        noAttachmentMessage = element.querySelector('p');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('no-attachment class present', function() {
        assert.isTrue(element.classList.contains('no-attachment'));
      });
      test('error class absent', function() {
        assert.isFalse(element.classList.contains('error'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is correct', function() {
        assert.equal(noAttachmentMessage.textContent, '');
      });
    });

    suite('Empty attachment message', function() {
      var message;
      var element;
      var noAttachmentMessage;
      setup(function() {
        message = getTestMessage(1);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        noAttachmentMessage = element.querySelector('p');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('no-attachment class present', function() {
        assert.isTrue(element.classList.contains('no-attachment'));
      });
      test('error class absent', function() {
        assert.isFalse(element.classList.contains('error'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is Empty', function() {
        assert.equal(noAttachmentMessage.textContent, '');
      });
    });

    suite('Invalid empty content message', function() {
      var message;
      var element;
      var noAttachmentMessage;
      setup(function() {
        message = getTestMessage(2);
        ThreadUI.appendMessage(message);
        element = document.getElementById('message-' + message.id);
        noAttachmentMessage = element.querySelector('p');
      });
      test('element has correct data-message-id', function() {
        assert.equal(element.dataset.messageId, message.id);
      });
      test('invalid-empty-content class present', function() {
        assert.isTrue(element.classList.contains('invalid-empty-content'));
      });
      test('error class present', function() {
        assert.isTrue(element.classList.contains('error'));
      });
      test('pending class absent', function() {
        assert.isFalse(element.classList.contains('pending'));
      });
      test('message is Empty', function() {
        assert.equal(
          noAttachmentMessage.getAttribute('data-l10n-id'),
          'no-attachment-text'
        );
      });
      suite('clicking', function() {
        setup(function() {
          ThreadUI.handleMessageClick({
            target: element
          });
        });
        test('Should not call retrieveMMS', function() {
          sinon.assert.notCalled(MessageManager.retrieveMMS);
        });
      });
    });
  });

  suite('resendMessage', function() {
    setup(function() {
      this.receivers = ['1234'];
      this.targetMsg = {
        id: 23,
        type: 'sms',
        receivers: this.receivers,
        body: 'This is a test',
        delivery: 'error',
        timestamp: Date.now()
      };
      this.otherMsg = {
        id: 45,
        type: 'sms',
        receivers: this.receivers,
        body: 'this test',
        delivery: 'error',
        timestamp: Date.now()
      };
      ThreadUI.appendMessage(this.targetMsg);
      ThreadUI.appendMessage(this.otherMsg);

      assert.lengthOf(
        ThreadUI.container.querySelectorAll('[data-message-id="23"]'),
        1
      );
      assert.lengthOf(
        ThreadUI.container.querySelectorAll('[data-message-id="45"]'),
        1
      );

      this.getMessageReq = {};
      this.sinon.stub(MessageManager, 'getMessage')
        .returns(this.getMessageReq);
      this.sinon.stub(MessageManager, 'deleteMessages').callsArgWith(1, true);
      this.sinon.stub(MessageManager, 'resendMessage');
      this.sinon.spy(ThreadUI, 'onMessageSendRequestCompleted');
    });

    // TODO: Implement this functionality in a specialized method and update
    // this test accordingly.
    // Bug 872725 - [MMS] Message deletion logic is duplicated
    test('removes the markup of only the specified message from the DOM',
      function() {
      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      assert.lengthOf(
        ThreadUI.container.querySelectorAll('[data-message-id="23"]'),
        0
      );
      assert.lengthOf(
        ThreadUI.container.querySelectorAll('[data-message-id="45"]'),
        1
      );
    });

    test('invokes MessageManager.resendMessage', function() {
      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      var args = MessageManager.resendMessage.args[0];
      assert.deepEqual(args[0].message, this.targetMsg);
    });

    test('invokes onMessageSendRequestCompleted on successful send request',
      function() {
      MessageManager.resendMessage.yieldsTo('onsuccess');

      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      sinon.assert.called(ThreadUI.onMessageSendRequestCompleted);
    });

    test('does not invoke onMessageSendRequestCompleted on failed send request',
      function() {
      MessageManager.resendMessage.yieldsTo('onerror', new Error('failed'));

      ThreadUI.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      sinon.assert.notCalled(ThreadUI.onMessageSendRequestCompleted);
    });
  });

  // Bug 890206 - Resending a message with delivery status
  // error on a thread with just that message, should leave
  // the thread with just one message.
  suite('Message error resent in thread with 1 message', function() {
    var message, request;
    setup(function() {
      message = {
        id: 23,
        type: 'sms',
        body: 'This is a error sms',
        delivery: 'error',
        timestamp: Date.now()
      };
      ThreadUI.appendMessage(message);

      this.sinon.stub(window, 'confirm');
      request = {};
      this.sinon.stub(MessageManager, 'getMessage').returns(request);
      this.sinon.stub(MessageManager, 'resendMessage');
      this.errorMsg = ThreadUI.container.querySelector('.error');
    });

    test('clicking on an error message bubble in a thread with 1 message ' +
      'should try to resend and remove the errored message',
      function() {
      window.confirm.returns(true);
      this.errorMsg.querySelector('.message-status').click();

      request.result = message;
      request.onsuccess && request.onsuccess.call(request);
      assert.isNull(ThreadUI.container.querySelector('li'));
      assert.ok(
        MessageManager.resendMessage.calledWithMatch({
          onerror: sinon.match.func,
          onsuccess: sinon.match.func,
          message: message
        })
      );
    });
  });

  // TODO: Move these tests to an integration test suite.
  // Bug 868056 - Clean up SMS test suite

  suite('Actions on the links >', function() {
    var messageId = 23, link, phone = '123123123';
    setup(function() {
      this.sinon.spy(LinkActionHandler, 'onClick');

      this.sinon.stub(LinkHelper, 'searchAndLinkClickableData', function() {
        return '<a data-dial="' + phone +
        '" data-action="dial-link">' + phone + '</a>';
      });

      ThreadUI.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test with 123123123',
        delivery: 'error',
        timestamp: Date.now()
      });
      // Retrieve DOM element for executing the event
      var messageDOM = document.getElementById('message-' + messageId);
      link = messageDOM.querySelector('a');
    });

    teardown(function() {
      ThreadUI.container.innerHTML = '';
      link = null;
    });

    test(' "click"', function() {
      // In this case we are checking the 'click' action on a link
      link.click();
      // This 'click' was handled properly?
      assert.ok(LinkActionHandler.onClick.called);
    });

    test(' "contextmenu"', function() {
      var contextMenuEvent = new CustomEvent('contextmenu', {
        'bubbles': true,
        'cancelable': true
      });
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      // The assertions that were removed from this
      // test were relocated to link_action_handler_test.js
      // This 'context-menu' was handled properly?
      assert.isFalse(LinkActionHandler.onClick.called);
    });
  });

  suite('updateCarrier', function() {
    var contacts = [], number, email, detailsEmail;
    var carrierTag;

    suiteSetup(function() {
      contacts.push(new MockContact());
      number = contacts[0].tel[0].value;
      email = contacts[0].email[0].value;
      detailsEmail = Utils.getContactDetails(email, contacts);
    });

    setup(function() {
      carrierTag = document.getElementById('contact-carrier');
    });

    teardown(function() {
      document.body.innerHTML = '';
    });

    test(' If there is >1 participant, hide carrier info', function() {
      var thread = {
        participants: [number, '123123']
      };

      ThreadUI.updateCarrier(thread, contacts);
      assert.isFalse(threadMessages.classList.contains('has-carrier'));
    });

    suite(' If there is one participant', function() {
      var thread;

      setup(function() {
        thread = {
          participants: [number]
        };
      });

      test(' And contacts available', function() {
        ThreadUI.updateCarrier(thread, contacts);
        assert.isTrue(threadMessages.classList.contains('has-carrier'));
      });

      test(' And no contacts and any phone details available', function() {
        ThreadUI.updateCarrier(thread, []);

        assert.isFalse(threadMessages.classList.contains('has-carrier'));
        assert.isNull(carrierTag.querySelector('.has-phone-type'));
        assert.isNull(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' And only phone type is available', function() {
        ThreadUI.updateCarrier(thread, [{
          tel: [{
            value: number,
            type: 'type'
          }]
        }]);

        assert.ok(carrierTag.querySelector('.has-phone-type'));
        assert.isNull(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' And only phone carrier is available', function() {
        ThreadUI.updateCarrier(thread, [{
          tel: [{
            value: number,
            carrier: 'T-Mobile'
          }]
        }]);

        assert.isNull(carrierTag.querySelector('.has-phone-type'));
        assert.ok(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' And phone type and carrier are available', function() {
        ThreadUI.updateCarrier(thread, contacts);

        assert.ok(carrierTag.querySelector('.has-phone-type'));
        assert.ok(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' If there is one participant (email) & contacts', function() {
        MockSettings.supportEmailRecipient = true;
        var thread = {
          participants: [email]
        };

        ThreadUI.updateCarrier(thread, contacts, detailsEmail);
        assert.isTrue(threadMessages.classList.contains('has-carrier'));
      });

      test(' If there is one participant (email) & no contacts', function() {
        MockSettings.supportEmailRecipient = true;
        var thread = {
          participants: [email]
        };

        ThreadUI.updateCarrier(thread, [], detailsEmail);
        assert.isFalse(threadMessages.classList.contains('has-carrier'));
      });
    });
  });

  suite('Long press on the bubble >', function() {
    var messageId = 23;
    var link, messageDOM, contextMenuEvent;
    setup(function() {
      contextMenuEvent = new CustomEvent('contextmenu', {
        'bubbles': true,
        'cancelable': true
      });

      this.sinon.spy(LinkActionHandler, 'onClick');
      this.sinon.spy(ThreadUI, 'promptContact');
      MockOptionMenu.mSetup();


      this.sinon.stub(LinkHelper, 'searchAndLinkClickableData', function() {
        return '<a data-dial="123123123" data-action="dial-link">123123123</a>';
      });

      ThreadUI.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test with 123123123',
        delivery: 'sent',
        timestamp: Date.now()
      });
      // Retrieve DOM element for executing the event
      messageDOM = document.getElementById('message-' + messageId);
      link = messageDOM.querySelector('a');
    });

    teardown(function() {
      ThreadUI.container.innerHTML = '';
      link = null;
      MockOptionMenu.mTeardown();
    });

    test(' "click" on bubble (not in link-action) has no effect', function() {
      messageDOM.click();
      assert.ok(LinkActionHandler.onClick.calledOnce);
      // As there is no action, we are not going to show any menu
      assert.isFalse(ThreadUI.promptContact.calledOnce);
    });

    test(' "long-press" on link-action is not redirected to "onClick"',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      assert.isFalse(LinkActionHandler.onClick.calledOnce);
    });

    test(' "long-press" on link-action shows the option menu from the bubble',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      // It should show the list of options of the bubble (forward, delete...)
      assert.ok(MockOptionMenu.calls.length, 1);
    });

    test(' "long-press" on bubble shows a menu with forward as first option',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      assert.ok(MockOptionMenu.calls.length, 1);
      // Is first element of the menu 'forward'?
      assert.equal(
        MockOptionMenu.calls[0].items[0].l10nId,
        'forward');
      // Show menu with 'delete' option
      assert.equal(
        MockOptionMenu.calls[0].items[1].l10nId,
        'view-message-report'
      );
      // Show menu with 'delete' option
      assert.equal(
        MockOptionMenu.calls[0].items[2].l10nId,
        'delete'
      );
    });

    test(' "long-press" on an error bubble shows a menu with resend option',
      function() {
        // Create a message with a delivery error
        ThreadUI.appendMessage({
          id: 9,
          type: 'sms',
          body: 'This is a test with 123123123',
          delivery: 'error',
          timestamp: Date.now()
        });

        // Retrieve the message node
        link = document.getElementById('message-9').querySelector('a');

        // Dispatch custom event for testing long press
        link.dispatchEvent(contextMenuEvent);
        assert.ok(MockOptionMenu.calls.length, 1);

        // Confirm that the menu contained a "resend-message" option
        assert.equal(MockOptionMenu.calls[0].items[3].l10nId, 'resend-message');
    });

    test(' "long-press" on an error outgoing mms bubble shows a menu' +
      'with resend option',
      function() {
        // Create a message with a sending error
        ThreadUI.appendMessage({
          id: 10,
          type: 'mms',
          delivery: 'error',
          deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
          attachments: [],
          subject: 'error sending'
        });

        // Retrieve the message node
        link = document.querySelector('#message-10 section');

        // Dispatch custom event for testing long press
        link.dispatchEvent(contextMenuEvent);
        assert.ok(MockOptionMenu.calls.length, 1);

        // Confirm that the menu contained a "resend-message" option
        assert.equal(MockOptionMenu.calls[0].items[3].l10nId, 'resend-message');
    });

    test(' "long-press" on an incoming download error mms bubble should not '+
      'show a menu with resend option',
      function() {
        // Create a message with a download error
        ThreadUI.appendMessage({
          id: 11,
          sender: '123456',
          iccId: 'B',
          type: 'mms',
          delivery: 'not-downloaded',
          deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
          attachments: [],
          subject: 'error download',
          expiryDate: Date.now()
        });

        // Retrieve the message node
        link = document.querySelector('#message-11 section');

        // Dispatch custom event for testing long press
        link.dispatchEvent(contextMenuEvent);
        assert.ok(MockOptionMenu.calls.length, 1);

        // Confirm that the menu doesn't contained a "resend-message" option
        assert.isTrue(MockOptionMenu.calls[0].items.every(function(item){
          return item.l10nId !== 'resend-message';
        }));
    });

    test(' "long-press" on an not downloaded message ' +
      'bubble shows a menu without forward option',
      function() {
        // Create a message with an undownloaded attachment:
        ThreadUI.appendMessage({
          id: 12,
          type: 'mms',
          body: 'This is mms message test without attachment',
          delivery: 'received',
          subject:'',
          attachments: null,
          timestamp: Date.now()
        });

        // Retrieve the message node
        var messageNode = document.querySelector('#message-12 section');

        // Dispatch custom event for testing long press
        messageNode.dispatchEvent(contextMenuEvent);
        assert.ok(MockOptionMenu.calls.length, 1);
        assert.ok(MockOptionMenu.calls[0].items.length, 4);

        // Confirm that the menu contained a "resend-message" option
        for (var i = MockOptionMenu.calls[0].length - 1; i >= 0; i--) {
          assert.notEqual(
            MockOptionMenu.calls[0].items[i].l10nId,
            'forward'
          );
        }
    });
  });

  suite('Message resending UI', function() {
    setup(function() {
      ThreadUI.appendMessage({
        id: 23,
        type: 'sms',
        body: 'This is a test',
        delivery: 'error',
        timestamp: Date.now()
      });
      ThreadUI.appendMessage({
        id: 45,
        type: 'sms',
        body: 'This is another test',
        delivery: 'sent',
        timestamp: Date.now()
      });
      this.sinon.stub(window, 'confirm');
      this.sinon.stub(ThreadUI, 'resendMessage');
      this.elems = {
        errorMsg: ThreadUI.container.querySelector('.error'),
        sentMsg: ThreadUI.container.querySelector('.sent')
      };
    });

    test('clicking on "message-status" aside in an error message' +
      'triggers a confirmation dialog',
      function() {
      this.elems.errorMsg.querySelector('.message-status').click();
      assert.equal(window.confirm.callCount, 1);
    });

    test('clicking on p element in an error message' +
      'does not triggers a confirmation  dialog',
      function() {
      this.elems.errorMsg.querySelector('.bubble p').click();
      assert.equal(window.confirm.callCount, 0);
    });

    test('clicking on an error message does not trigger a confirmation dialog',
      function() {
      this.elems.errorMsg.click();
      assert.equal(window.confirm.callCount, 0);
    });

    test('clicking on "message-status" aside in an error message and ' +
      'accepting the confirmation dialog triggers a message re-send operation',
    function() {
      window.confirm.returns(true);
      this.elems.errorMsg.querySelector('.message-status').click();
      assert.equal(ThreadUI.resendMessage.callCount, 1);
    });

    test('clicking on an error message bubble and rejecting the ' +
      'confirmation dialog does not trigger a message re-send operation',
      function() {
      window.confirm.returns(false);
      this.elems.errorMsg.querySelector('.bubble').click();
      assert.equal(ThreadUI.resendMessage.callCount, 0);
    });

    test('clicking on a sent message does not trigger a confirmation dialog ' +
      'nor a message re-send operation', function() {
      this.elems.sentMsg.click();
      assert.equal(window.confirm.callCount, 0);
      assert.equal(ThreadUI.resendMessage.callCount, 0);
    });
  });

  suite('createMmsContent', function() {
    suite('generated html', function() {

      test('text content', function() {
        var inputArray = [{
          text: 'part 1'
        }, {
          text: 'part 2'
        }];
        var output = ThreadUI.createMmsContent(inputArray);

        assert.equal(output.childNodes.length, 2);
        assert.equal(output.childNodes[0].innerHTML, 'part 1');
        assert.equal(output.childNodes[1].innerHTML, 'part 2');
      });

      test('blob content', function() {
        var inputArray = [{
          name: 'imageTest.jpg',
          blob: testImageBlob
        }, {
          name: 'imageTest.jpg',
          blob: testImageBlob
        }];
        var output = ThreadUI.createMmsContent(inputArray);

        assert.equal(output.childNodes.length, 2);
        assert.match(output.childNodes[0].nodeName, /iframe/i);
        assert.match(output.childNodes[1].nodeName, /iframe/i);
      });

      test('mixed content', function() {
        var inputArray = [{
          text: 'text',
          name: 'imageTest.jpg',
          blob: testImageBlob
        }];
        var output = ThreadUI.createMmsContent(inputArray);

        assert.equal(output.childNodes.length, 2);
        assert.match(output.childNodes[0].nodeName, /iframe/i);
        assert.equal(output.childNodes[1].innerHTML, 'text');
      });
    });

    test('Clicking on an attachment triggers its `view` method', function() {
      var messageContainer;
      // create an image mms DOM Element:
      var inputArray = [{
        name: 'imageTest.jpg',
        blob: testImageBlob
      }];
      var viewSpy = this.sinon.spy(Attachment.prototype, 'view');

      // quick dirty creation of a thread with image:
      var output = ThreadUI.createMmsContent(inputArray);
      var attachmentDOM = output.childNodes[0];

      // need to get a container from ThreadUI because event is delegated
      messageContainer = ThreadUI.getMessageContainer(Date.now(), false);
      messageContainer.appendChild(output);
      this.sinon.stub(ThreadUI, 'handleMessageClick');

      // Start the test: simulate a click event
      attachmentDOM.click();

      assert.equal(viewSpy.callCount, 1);
      assert.ok(viewSpy.calledWith, { allowSave: true });
    });

    suite('after rendering a MMS', function() {
      setup(function() {
        this.sinon.spy(Attachment.prototype, 'render');
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        this.sinon.stub(HTMLElement.prototype, 'scrollIntoView');

        // fake content so that there is something to scroll
        container.innerHTML = ThreadUI.tmpl.message.interpolate({
          id: '1',
          bodyHTML: 'test #1'
        });

        var inputArray = [{
          name: 'imageTest.jpg',
          blob: testImageBlob
        }];
        ThreadUI.createMmsContent(inputArray);
      });

      teardown(function() {
        container.innerHTML = '';
      });

      test('should scroll when the view is scrolled to the bottom', function() {
        ThreadUI.isScrolledManually = false;
        Attachment.prototype.render.yield();
        sinon.assert.called(HTMLElement.prototype.scrollIntoView);
      });

      test('should not scroll when the user scrolled up the view', function() {
        ThreadUI.isScrolledManually = true;
        Attachment.prototype.render.yield();
        sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
      });

      test('should not scroll if not in the right panel', function() {
        Navigation.isCurrentPanel.withArgs('thread').returns(false);
        ThreadUI.isScrolledManually = false;
        Attachment.prototype.render.yield();
        sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
      });
    });
  });

  suite('Header Actions/Display', function() {
    setup(function() {
      Threads.delete(1);
      MockActivityPicker.dial.mSetup();
      MockOptionMenu.mSetup();
    });

    teardown(function() {
      Threads.delete(1);
      MockActivityPicker.dial.mTeardown();
      MockOptionMenu.mTeardown();
    });

    suite('OptionMenu >', function() {
      setup(function() {
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Threads.currentId = 1;
      });

      suite('one recipient >', function() {
        setup(function() {
          Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
          Navigation.isCurrentPanel.withArgs('thread').returns(true);

          Threads.set(1, {
            participants: ['999']
          });
        });

        suite('prompt()', function() {
          test('Known recipient', function() {
            var contact = new MockContact();

            var header = document.createElement('div');

            ThreadUI.prompt({
              number: '999',
              contactId: contact.id,
              isContact: true,
              header: header
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            // we use the passed header as the dialog's header
            assert.equal(call.header, header);

            // no section is passed for contact
            assert.isUndefined(call.section);

            assert.equal(items.length, 2);

            // The first item is a "viewContact" option
            assert.equal(items[0].l10nId, 'viewContact');

            // The last item is a "cancel" option
            assert.equal(items[1].l10nId, 'cancel');
          });

          test('Unknown recipient (phone)', function() {
            ThreadUI.prompt({
              number: '999',
              isContact: false
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            // Ensures that the OptionMenu was given
            // the phone number to diplay
            assert.equal(call.header, '999');

            // Only known Contact details should appear in the "section"
            assert.isUndefined(call.section);

            assert.equal(items.length, 3);

            // The first item is a "createNewContact" option
            assert.equal(items[0].l10nId, 'createNewContact');

            // The second item is a "addToExistingContact" option
            assert.equal(items[1].l10nId, 'addToExistingContact');

            // The last item is a "cancel" option
            assert.equal(items[2].l10nId, 'cancel');
          });

          test('Unknown recipient (email)', function() {
            this.sinon.spy(ActivityPicker, 'email');

            ThreadUI.prompt({
              email: 'a@b.com',
              isContact: false
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            // Ensures that the OptionMenu was given
            // the email address to diplay
            assert.equal(call.header, 'a@b.com');

            // Only known Contact details should appear in the "section"
            assert.isUndefined(call.section);

            assert.equal(items.length, 4);

            // The first item is a "sendEmail" option
            assert.equal(items[0].l10nId, 'sendEmail');

            // Trigger the option to ensure that correct Activity is used.
            items[0].method();

            sinon.assert.called(ActivityPicker.email);

            // The second item is a "createNewContact" option
            assert.equal(items[1].l10nId, 'createNewContact');

            // The third item is a "addToExistingContact" option
            assert.equal(items[2].l10nId, 'addToExistingContact');

            // The fourth and last item is a "cancel" option
            assert.equal(items[3].l10nId, 'cancel');
          });

        });

        suite('onHeaderActivation >', function() {
          test('Known recipient', function() {
            this.sinon.spy(ContactRenderer.prototype, 'render');

            Threads.set(1, {
              participants: ['+12125559999']
            });

            headerText.dataset.isContact = true;
            headerText.dataset.number = '+12125559999';

            ThreadUI.onHeaderActivation();

            var calls = MockOptionMenu.calls;

            assert.equal(calls.length, 1);

            // contacts do not show up in the body
            assert.isUndefined(calls[0].section);

            // contacts show up in the header
            sinon.assert.calledWithMatch(ContactRenderer.prototype.render, {
              target: calls[0].header
            });

            assert.equal(calls[0].items.length, 2);
            assert.equal(typeof calls[0].complete, 'function');
          });

          test('Unknown recipient', function() {

            Threads.set(1, {
              participants: ['777']
            });

            headerText.dataset.isContact = false;
            headerText.dataset.number = '777';

            ThreadUI.onHeaderActivation();

            var calls = MockOptionMenu.calls;

            assert.equal(calls.length, 1);
            assert.equal(calls[0].header, '777');
            assert.equal(calls[0].items.length, 3);
            assert.equal(typeof calls[0].complete, 'function');
          });

          test('Known recipient email', function() {
            MockSettings.supportEmailRecipient = true;
            this.sinon.spy(ContactRenderer.prototype, 'render');

            Threads.set(1, {
              participants: ['a@b.com']
            });

            headerText.dataset.isContact = true;
            headerText.dataset.number = 'a@b.com';

            ThreadUI.onHeaderActivation();

            var calls = MockOptionMenu.calls;

            assert.equal(calls.length, 1);

            // contacts do not show up in the body
            assert.isUndefined(calls[0].section);

            // contacts show up in the header
            sinon.assert.calledWithMatch(ContactRenderer.prototype.render, {
              target: calls[0].header
            });

            assert.equal(calls[0].items.length, 3);
            assert.equal(typeof calls[0].complete, 'function');
          });

          test('Unknown recipient email', function() {
            MockSettings.supportEmailRecipient = true;

            Threads.set(1, {
              participants: ['a@b']
            });

            headerText.dataset.isContact = false;
            headerText.dataset.number = 'a@b';

            ThreadUI.onHeaderActivation();

            var calls = MockOptionMenu.calls;

            assert.equal(calls.length, 1);
            assert.equal(calls[0].header, 'a@b');
            assert.equal(calls[0].items.length, 4);
            assert.equal(typeof calls[0].complete, 'function');
          });
        });
      });

      suite('multi recipients, in group view >', function() {
        setup(function() {
          Navigation.isCurrentPanel.withArgs('group-view').returns(true);

          Threads.set(1, {
            participants: ['999', '888']
          });
        });

        test('known recipient', function() {
          var header = document.createElement('div');

          ThreadUI.prompt({
            number: '999',
            header: header,
            isContact: true
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // ensure that we display no body
          assert.isUndefined(call.section);

          // ensures we'll show a contact header
          assert.equal(call.header, header);

          assert.equal(items.length, 3);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "send message" option
          assert.equal(items[1].l10nId, 'sendMessage');

          // The third and last item is a "cancel" option
          assert.equal(items[2].l10nId, 'cancel');
        });

        test('Unknown recipient', function() {
          ThreadUI.prompt({
            number: '999',
            isContact: false
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // Ensures that the OptionMenu was given
          // the phone number to diplay
          assert.equal(call.header, '999');

          assert.equal(items.length, 5);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "sendMessage" option
          assert.equal(items[1].l10nId, 'sendMessage');

          // The third item is a "createNewContact" option
          assert.equal(items[2].l10nId, 'createNewContact');

          // The fourth item is a "addToExistingContact" option
          assert.equal(items[3].l10nId, 'addToExistingContact');

          // The fifth and last item is a "cancel" option
          assert.equal(items[4].l10nId, 'cancel');
        });
      });
    });

    suite('updateHeaderData', function() {
      test('returns a promise that is eventually resolved', function(done) {
        ThreadUI.updateHeaderData().then(done, done);
      });
    });

    // See: utils_test.js
    // Utils.getPhoneDetails
    //
    suite('Single participant', function() {

      suite('Carrier Tag', function() {
        setup(function() {
          Threads.set(1, {
            participants: ['+12125559999']
          });

          this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
          Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
          Threads.currentId = 1;
        });

        test('Carrier Tag (non empty string)', function(done) {
          this.sinon.stub(MockUtils, 'getPhoneDetails', function() {
            return 'non empty string';
          });

          this.sinon.stub(
            MockContacts, 'findByAddress', function(phone, fn) {

            fn([new MockContact()]);

            assert.isTrue(threadMessages.classList.contains('has-carrier'));
            done();
          });

          ThreadUI.updateHeaderData();
        });

        test('Carrier Tag (empty string)', function(done) {
          this.sinon.stub(MockUtils, 'getPhoneDetails', function() {
            return '';
          });

          this.sinon.stub(
            MockContacts, 'findByAddress', function(phone, fn) {

            fn([new MockContact()]);

            assert.isFalse(threadMessages.classList.contains('has-carrier'));

            done();
          });

          ThreadUI.updateHeaderData();
        });
      });
    });

    suite('Multi participant', function() {
      setup(function() {
        MockActivityPicker.dial.mSetup();
        MockOptionMenu.mSetup();

        Threads.set(1, {
          participants: ['999', '888']
        });

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Threads.currentId = 1;
      });

      teardown(function() {
        Threads.delete(1);
        MockActivityPicker.dial.mTeardown();
        MockOptionMenu.mTeardown();
      });

      suite('Options', function() {

        test('DOES NOT Invoke Activities', function() {

          headerText.dataset.isContact = true;
          headerText.dataset.number = '999';

          ThreadUI.onHeaderActivation();

          assert.equal(MockActivityPicker.dial.called, false);
          assert.equal(MockActivityPicker.dial.calledWith, null);
        });

        test('DOES NOT Invoke Options', function() {

          headerText.dataset.isContact = true;
          headerText.dataset.number = '999';

          ThreadUI.onHeaderActivation();

          assert.equal(MockOptionMenu.calls.length, 0);
        });

        test('Moves to Group information View', function() {
          this.sinon.spy(Navigation, 'toPanel');

          ThreadUI.onHeaderActivation();

          sinon.assert.calledWithMatch(
            Navigation.toPanel, 'group-view', { id: 1 }
          );

          Navigation.isCurrentPanel.withArgs('thread').returns(false);
          Navigation.isCurrentPanel.withArgs('group-view').returns(true);

          ThreadUI.onHeaderActivation();

          // View should not go back to thread view when header is
          // activated in group-view
          sinon.assert.calledOnce(Navigation.toPanel);
        });
      });

      suite('Carrier Tag', function() {
        test('Carrier Tag (empty string)', function() {

          ThreadUI.updateHeaderData();

          assert.isFalse(threadMessages.classList.contains('has-carrier'));
        });

      });
    });
  });

  suite('Sending Behavior (onSendClick)', function() {
    function clickButton() {
      clickButtonAndSelectSim(0);
    }

    function clickButtonAndSelectSim(serviceId) {
      ThreadUI.onSendClick();
      // we get a string from the MultiSimActionButton
      ThreadUI.simSelectedCallback(undefined, '' + serviceId);
    }

    setup(function() {
      this.sinon.stub(MessageManager, 'sendSMS');
      this.sinon.stub(MessageManager, 'sendMMS');

      this.sinon.stub(Compose, 'isEmpty').returns(false);
      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);
      this.sinon.stub(Settings, 'isDualSimDevice').returns(false);

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      this.sinon.spy(Navigation, 'toPanel');
    });

    test('SMS, 1 Recipient, moves to thread', function() {
      var body = 'foo';
      var recipient = '999';

      ThreadUI.recipients.add({
        number: recipient
      });

      Compose.append(body);

      clickButton();

      sinon.assert.calledWithMatch(MessageManager.sendSMS, {
        recipients: [recipient],
        content: body,
        serviceId: 0
      });

      var sentMessage = MockMessages.sms({
        body: body,
        receiver: recipient
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: sentMessage
      });

      sinon.assert.calledWith(
        Navigation.toPanel,
        'thread',
        { id: sentMessage.threadId }
      );
    });

    test('MMS, 1 Recipient, moves to thread', function() {
      var recipient = '999';

      ThreadUI.recipients.add({
        number: recipient
      });

      Compose.append(mockAttachment(512));

      clickButton();

      sinon.assert.calledWithMatch(MessageManager.sendMMS, {
        recipients: [recipient],
        serviceId: 0
      });

      var sentMessage = MockMessages.mms({
        receivers: [recipient]
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: sentMessage
      });

      sinon.assert.calledWith(
        Navigation.toPanel,
        'thread',
        { id: sentMessage.threadId }
      );
    });

    suite('SMS, >1 Recipient,', function() {
      function sendSmsToSeveralRecipients() {
        var recipients = ['999', '888'];
        var body = 'foo';

        recipients.forEach(function(recipient) {
          ThreadUI.recipients.add({
            number: recipient
          });
        });

        Compose.append(body);

        clickButton();

        sinon.assert.calledWithMatch(
          MessageManager.sendSMS, {
          recipients: recipients,
          content: body,
          serviceId: 0
        });

        recipients.forEach(function(recipient) {
          var sentMessage = MockMessages.sms({
            body: body,
            receiver: recipient
          });

          MessageManager.on.withArgs('message-sending').yield({
            message: sentMessage
          });
        });
      }

      test('moves to thread list', function() {
        sendSmsToSeveralRecipients();
        sinon.assert.calledWith(Navigation.toPanel, 'thread-list');
      });

      test('then closes if we\'re in the activity', function() {
        this.sinon.stub(ThreadUI, 'close');
        this.sinon.stub(ActivityHandler, 'isInActivity').returns(true);

        sendSmsToSeveralRecipients();
        sinon.assert.calledWith(Navigation.toPanel, 'thread-list');

        this.sinon.clock.tick(ThreadUI.LEAVE_ACTIVITY_DELAY);

        sinon.assert.called(ThreadUI.close);
      });
    });

    test('MMS, >1 Recipient, moves to thread', function() {
      var recipients = ['999', '888'];

      recipients.forEach(function(recipient) {
        ThreadUI.recipients.add({
          number: recipient
        });
      });

      Compose.append(mockAttachment(512));

      clickButton();

      sinon.assert.notCalled(Navigation.toPanel);
      sinon.assert.calledWithMatch(MessageManager.sendMMS, {
        recipients: recipients,
        serviceId: 0
      });

      var sentMessage = MockMessages.mms({
        receivers: recipients
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: sentMessage
      });

      sinon.assert.calledWith(
        Navigation.toPanel,
        'thread',
        { id: sentMessage.threadId }
      );
    });

    suite('DSDS behavior', function() {
      setup(function() {
        Settings.hasSeveralSim.returns(true);
        Settings.isDualSimDevice.returns(true);
      });

      test('MMS, SMS serviceId is the same than the MMS serviceId, sends asap',
      function() {
        Settings.mmsServiceId = 1;
        var targetServiceId = 1;

        var recipient = '999';

        ThreadUI.recipients.add({
          number: recipient
        });

        Compose.append(mockAttachment(512));

        clickButtonAndSelectSim(targetServiceId);

        sinon.assert.calledWithMatch(MessageManager.sendMMS, {
          recipients: [recipient],
          serviceId: 1
        });
      });

      test('SMS, SMS serviceId is different than MMS serviceId, sends asap',
      function() {
        Settings.mmsServiceId = 1;
        var targetServiceId = 0;

        var recipient = '999';
        var body = 'some useless text';

        ThreadUI.recipients.add({
          number: recipient
        });

        Compose.append(body);

        clickButtonAndSelectSim(targetServiceId);

        sinon.assert.calledWithMatch(MessageManager.sendSMS, {
          recipients: [recipient],
          content: body,
          serviceId: 0
        });
      });
    });

    suite('onMessageSendRequestCompleted >', function() {
      setup(function() {
        ThreadUI.recipients.add({
          number: '999'
        });

        this.sinon.spy(ThreadUI, 'onMessageSendRequestCompleted');
      });

      test('called if SMS is successfully sent', function() {
        MessageManager.sendSMS.yieldsTo('oncomplete', {});
        Compose.append('foo');

        clickButton();

        sinon.assert.called(ThreadUI.onMessageSendRequestCompleted);
      });

      test('is not called if SMS is failed to be sent', function() {
        MessageManager.sendSMS.yieldsTo('oncomplete', {
          hasError: true,
          return: [{
            success: true
          }]
        });
        Compose.append('foo');

        clickButton();

        sinon.assert.notCalled(ThreadUI.onMessageSendRequestCompleted);
      });

      test('called if MMS is successfully sent', function() {
        MessageManager.sendMMS.yieldsTo('onsuccess', {});
        Compose.append(mockAttachment(512));

        clickButton();

        sinon.assert.called(ThreadUI.onMessageSendRequestCompleted);
      });

      test('is not called if MMS is failed to be sent', function() {
        MessageManager.sendMMS.yieldsTo('onerror', new Error('failed'));
        Compose.append(mockAttachment(512));

        clickButton();

        sinon.assert.notCalled(ThreadUI.onMessageSendRequestCompleted);
      });
    });

    test('Deletes draft if there was a draft', function() {
      this.sinon.spy(Drafts, 'delete');
      this.sinon.spy(Drafts, 'store');

      ThreadUI.draft = {id: 3};
      ThreadUI.recipients.add({
        number: '888'
      });
      Compose.append('foo');

      clickButton();

      sinon.assert.calledOnce(Drafts.delete);
      sinon.assert.calledOnce(Drafts.store);
      sinon.assert.callOrder(Drafts.delete, Drafts.store);

      assert.isNull(ThreadUI.draft);
    });

    test('Removes draft thread if there was a draft thread', function() {
      this.sinon.spy(ThreadListUI, 'removeThread');

      ThreadUI.draft = {id: 3};
      ThreadUI.recipients.add({
        number: '888'
      });
      Compose.append('foo');

      clickButton();

      sinon.assert.calledOnce(ThreadListUI.removeThread);
    });

    suite('sendMMS errors', function() {
      setup(function() {
        this.sinon.spy(MockErrorDialog.prototype, 'show');

        ThreadUI.recipients.add({
          number: '999'
        });
        ThreadUI.showErrorInFailedEvent = '';

        Compose.append(mockAttachment(512));

        clickButton();
      });

      test('NotFoundError', function() {
        MessageManager.sendMMS.yieldTo('onerror', { name: 'NotFoundError' });
        sinon.assert.notCalled(MockErrorDialog.prototype.show);
      });

      test('NonActiveSimCardError', function() {
        MessageManager.sendMMS.yieldTo('onerror',
          { name: 'NonActiveSimCardError' });
        assert.equal(ThreadUI.showErrorInFailedEvent, 'NonActiveSimCardError');
        sinon.assert.notCalled(MockErrorDialog.prototype.show);
      });

      test('Generic error', function() {
        MessageManager.sendMMS.yieldTo('onerror', { name: 'GenericError' });
        sinon.assert.called(MockErrorDialog.prototype.show);
      });
    });
  });

  suite('Contact Picker Behavior(contactPickButton)', function() {
    setup(function() {
      this.sinon.spy(ThreadUI, 'assimilateRecipients');
    });
    teardown(function() {
      Recipients.View.isFocusable = true;
    });

    test('assimilate called after mousedown on picker button', function() {
      ThreadUI.contactPickButton.dispatchEvent(new CustomEvent('mousedown'));
      assert.ok(ThreadUI.assimilateRecipients.called);
    });

    test('Click event on picker button should not be propagate', function() {
      var event = new MouseEvent('click', { bubbles: true, cancelable: true });
      this.sinon.spy(event, 'stopPropagation');
      ThreadUI.contactPickButton.dispatchEvent(event);
      sinon.assert.called(event.stopPropagation);
    });

    suite('Recipients.View.isFocusable', function() {
      test('false during activity', function() {
        ThreadUI.requestContact();
        assert.isFalse(Recipients.View.isFocusable);
      });

      test('true after activity', function() {
        this.sinon.stub(Utils, 'basicContact').returns({});

        ThreadUI.requestContact();

        var activity = MockMozActivity.instances[0];

        activity.result = {
          select: [{ value: true }]
        };

        MockMozActivity.instances[0].onsuccess();

        assert.isTrue(Recipients.View.isFocusable);
      });
    });

    test('pick in the case of Settings.supportEmailRecipient = true',
    function() {
      MockSettings.supportEmailRecipient = true;
      ThreadUI.requestContact();

      var requestedProps = MockMozActivity.calls[0].data.contactProperties;
      assert.include(requestedProps, 'tel');
      assert.include(requestedProps, 'email');
    });

    test('pick in the case of Settings.supportEmailRecipient = false',
    function() {
      MockSettings.supportEmailRecipient = false;
      ThreadUI.requestContact();

      var requestedProps = MockMozActivity.calls[0].data.contactProperties;
      assert.include(requestedProps, 'tel');
    });
  });

  suite('recipient handling >', function() {
    var setL10nAttributes;
    var onRecipientsChange;

    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      // Please, auto-answering stub, don't interfere with my test
      this.sinon.stub(Contacts, 'findExact');

      setL10nAttributes = this.sinon.spy(navigator.mozL10n, 'setAttributes');

      onRecipientsChange = sinon.stub();
      ThreadUI.on('recipientschange', onRecipientsChange);
    });

    function testPickButtonEnabled() {
      test('pick button is enabled', function() {
        var pickButton = ThreadUI.contactPickButton;
        assert.isFalse(pickButton.classList.contains('disabled'));
      });
    }

    suite('no recipients', function() {
      setup(function() {
        ThreadUI.updateComposerHeader();
      });

      test('header is correct', function() {
        sinon.assert.calledWith(setL10nAttributes, headerText, 'newMessage');
      });

      test('no event is sent', function() {
        sinon.assert.notCalled(onRecipientsChange);
      });

      testPickButtonEnabled();
    });

    suite('add one recipient', function() {
      setup(function() {
        ThreadUI.recipients.add({
          number: '999'
        });
      });

      test('header is correct', function() {
        sinon.assert.calledWith(
          setL10nAttributes,
          headerText,
          'recipient',
          {n: 1}
        );
      });

      test('One `recipientschange` event is sent', function() {
        sinon.assert.calledOnce(onRecipientsChange);
      });

      testPickButtonEnabled();
    });

    suite('add two recipients', function() {
      setup(function() {
        ThreadUI.recipients.add({
          number: '999'
        });
        ThreadUI.recipients.add({
          number: '888'
        });
      });

      test('header is correct', function() {
        sinon.assert.calledTwice(setL10nAttributes);
        sinon.assert.calledWith(
          setL10nAttributes, headerText, 'recipient', {n: 2}
        );
      });

      test('Two `recipientschange` events are sent', function() {
        sinon.assert.calledTwice(onRecipientsChange);
      });

      testPickButtonEnabled();
    });

    suite('add one questionable recipient', function() {
      setup(function() {
        ThreadUI.recipients.add({
          number: 'foo',
          isQuestionable: true
        });
      });

      test('header is correct', function() {
        sinon.assert.notCalled(setL10nAttributes);
      });

      test('No `recipientschange` event is sent', function() {
        sinon.assert.notCalled(onRecipientsChange);
      });
    });

    suite('edit a recipient', function() {
      setup(function() {
        var placeholder = document.createElement('span');
        placeholder.setAttribute('contenteditable', 'true');
        placeholder.isPlaceholder = true;
        placeholder.textContent = '999';
        recipientsList.appendChild(placeholder);

        ThreadUI.recipients.inputValue = '999';

        placeholder.dispatchEvent(new CustomEvent('input', { bubbles: true }));
      });

      test('An `recipientschange` event is sent', function() {
        sinon.assert.calledOnce(onRecipientsChange);
      });
    });
  });

  suite('saveDraft() > ', function() {
    var addSpy, updateSpy, bannerSpy, arg;

    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);

      addSpy = this.sinon.spy(Drafts, 'add');
      updateSpy = this.sinon.spy(ThreadListUI, 'updateThread');
      bannerSpy = this.sinon.spy(ThreadListUI, 'onDraftSaved');

      ThreadUI.recipients.add({
        number: '999'
      });

      Compose.append('foo');
    });

    suite('threadless >', function() {
      setup(function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
      });

      test('do not preserve draft for replacement', function() {
        ThreadUI.saveDraft();

        assert.isNull(ThreadUI.draft);
      });

      test('preserve pre-existing draft for replacement', function() {
        var draft = {id: 55};
        ThreadUI.draft = draft;
        ThreadUI.saveDraft({preserve: true});

        assert.isNotNull(ThreadUI.draft);
        assert.equal(ThreadUI.draft, draft);
      });

      test('preserve new draft for replacement', function() {
        ThreadUI.draft = null;
        ThreadUI.saveDraft({preserve: true});

        assert.isNotNull(ThreadUI.draft);
        assert.deepEqual(ThreadUI.draft.recipients, ['999']);
        assert.equal(ThreadUI.draft.content, 'foo');
        assert.equal(ThreadUI.draft.threadId, null);
      });

      test('has entered content and recipients', function() {
        ThreadUI.saveDraft();
        arg = addSpy.firstCall.args[0];

        assert.deepEqual(arg.recipients, ['999']);
        assert.deepEqual(arg.content, ['foo']);
      });

      test('has entered recipients but not content', function() {
        Compose.clear();
        ThreadUI.saveDraft();
        arg = addSpy.firstCall.args[0];

        assert.deepEqual(arg.recipients, ['999']);
        assert.deepEqual(arg.content, []);
      });

      test('has entered content but not recipients', function() {
        ThreadUI.recipients.remove('999');
        ThreadUI.saveDraft();
        arg = addSpy.firstCall.args[0];

        assert.deepEqual(arg.recipients, []);
        assert.deepEqual(arg.content, ['foo']);
      });

      test('thread is updated in thread list, threadless', function() {
        ThreadUI.saveDraft();

        sinon.assert.calledOnce(updateSpy);
      });

      test('saves brand new threadless draft if not within thread', function() {
        Drafts.clear();

        ThreadUI.draft = {id: 1};
        ThreadUI.saveDraft();
        assert.equal(Drafts.byThreadId(null).length, 1);

        ThreadUI.draft = {id: 2};
        ThreadUI.saveDraft();
        assert.equal(Drafts.byThreadId(null).length, 2);

        ThreadUI.draft = {id: 3};
        ThreadUI.saveDraft();
        assert.equal(Drafts.byThreadId(null).length, 3);
      });
    });

    suite('within an existing thread >', function() {
       setup(function() {
        Threads.set(1, {
          participants: ['999']
        });

        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
        Threads.currentId = 1;
       });

      test('thread is updated in thread list', function() {
        ThreadUI.saveDraft();

        sinon.assert.calledOnce(updateSpy);
      });

      test('saves draft to existing thread', function() {
        ThreadUI.saveDraft();
        assert.equal(Drafts.byThreadId(1).length, 1);

        Compose.append('baz');
        ThreadUI.saveDraft();
        assert.equal(Drafts.byThreadId(1).length, 1);

        Compose.append('foo');
        ThreadUI.saveDraft();
        assert.equal(Drafts.byThreadId(1).length, 1);
      });

      test('Update thread timestamp', function() {
        this.sinon.stub(window, 'Draft').returns({
          timestamp: 2
        });

        ThreadUI.saveDraft();

        assert.equal(Threads.get(1).timestamp, 2);
      });

      test('shows draft saved banner if not autosaved', function() {
        ThreadUI.saveDraft();

        sinon.assert.calledOnce(bannerSpy);
      });

      test('does not show draft saved banner if autosaved', function() {
        ThreadUI.saveDraft({autoSave: true});

        sinon.assert.notCalled(bannerSpy);
      });
    });

  });

  suite('onVisibilityChange() >', function() {
    var isDocumentHidden;

    suiteSetup(function() {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return isDocumentHidden;
        }
      });
    });

    suiteTeardown(function() {
      delete document.hidden;
      ThreadUI.draft = null;
    });

    setup(function() {
      this.sinon.spy(ThreadUI, 'saveDraft');
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
    });

    teardown(function() {
      isDocumentHidden = false;
    });

    suite('Draft saved: content AND recipients exist', function() {
      setup(function() {
        this.sinon.stub(Compose, 'isEmpty').returns(false);
      });

      test('new: has message', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });

      test('new: has message, has recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        ThreadUI.recipients.length = 1;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });

      test('thread: has message', function() {
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });
    });

    suite('Draft saved: content OR recipients exist', function() {
      test('new: has message, no recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        this.sinon.stub(Compose, 'isEmpty').returns(false);

        ThreadUI.recipients.length = 0;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });

      test('new: no message, has recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        this.sinon.stub(Compose, 'isEmpty').returns(true);

        ThreadUI.recipients.length = 1;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.calledOnce(ThreadUI.saveDraft);
        sinon.assert.calledWithMatch(
          ThreadUI.saveDraft,
          {preserve: true, autoSave: true}
        );
      });
    });

    suite('Draft not saved: content or recipients do not exist', function() {
      setup(function() {
        this.sinon.stub(Compose, 'isEmpty').returns(true);
        ThreadUI.recipients.length = 0;
      });

      test('new: no message', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.notCalled(ThreadUI.saveDraft);
      });

      test('new: no message, no recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        ThreadUI.recipients.length = 0;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.notCalled(ThreadUI.saveDraft);
      });

      test('thread: no message', function() {
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        ThreadUI.recipients.length = 1;
        isDocumentHidden = true;

        ThreadUI.onVisibilityChange();

        sinon.assert.notCalled(ThreadUI.saveDraft);
      });
    });
  });

  suite('Back button behaviour', function() {
    suite('From new message', function() {
      var showCalled = false;
      var optionMenuTargetItemIndex = 0;

      setup(function() {
        showCalled = false;
        this.sinon.stub(window, 'OptionMenu').returns({
          show: function() {
            var item = OptionMenu.args[0][0].items[optionMenuTargetItemIndex];
            item.method.apply(null);
            showCalled = true;
          },
          hide: function() {}
        });

        this.sinon.stub(ThreadUI, 'isKeyboardDisplayed').returns(false);
        this.sinon.stub(ThreadUI, 'stopRendering');

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        ThreadUI.recipients.add({
          number: '999'
        });

        ThreadUI.draft = null;
      });

      test('Displays OptionMenu prompt if recipients', function(done) {
        ThreadUI.back().then(function() {
          assert.isTrue(OptionMenu.calledOnce);
          assert.isTrue(showCalled);

          var items = OptionMenu.args[0][0].items;

          // Assert the correct menu items were displayed
          assert.equal(items[0].l10nId, 'save-as-draft');
          assert.equal(items[1].l10nId, 'discard-message');
          assert.equal(items[2].l10nId, 'cancel');
        }).then(done, done);
      });

      test('Displays OptionMenu prompt if recipients & content',
        function(done) {

        Compose.append('foo');

        ThreadUI.back().then(function() {
          assert.isTrue(OptionMenu.calledOnce);
          assert.isTrue(showCalled);

          var items = OptionMenu.args[0][0].items;

          // Assert the correct menu items were displayed
          assert.equal(items[0].l10nId, 'save-as-draft');
          assert.equal(items[1].l10nId, 'discard-message');
          assert.equal(items[2].l10nId, 'cancel');
        }).then(done, done);
      });

      test('Displays OptionMenu prompt if content', function(done) {
        ThreadUI.recipients.remove('999');
        Compose.append('foo');

        ThreadUI.back().then(function() {
          assert.isTrue(OptionMenu.calledOnce);
          assert.isTrue(showCalled);

          var items = OptionMenu.args[0][0].items;

          // Assert the correct menu items were displayed
          assert.equal(items[0].l10nId, 'save-as-draft');
          assert.equal(items[1].l10nId, 'discard-message');
          assert.equal(items[2].l10nId, 'cancel');
        }).then(done, done);
      });

      suite('OptionMenu operations', function() {
        setup(function() {
          this.sinon.spy(Navigation, 'toPanel');
          this.sinon.spy(ThreadUI, 'saveDraft');
          this.sinon.spy(ThreadListUI, 'removeThread');
          this.sinon.spy(Drafts, 'delete');
          this.sinon.spy(Drafts, 'store');
        });

        test('Save as Draft', function(done) {
          optionMenuTargetItemIndex = 0;

          ThreadUI.back().then(function() {
            sinon.assert.calledOnce(ThreadUI.saveDraft);
            sinon.assert.calledWith(Navigation.toPanel, 'thread-list');
          }).then(done, done);
        });

        test('Discard', function(done) {
          optionMenuTargetItemIndex = 1;
          ThreadUI.draft = new Draft({id: 3});
          ThreadUI.draft.isEdited = true;

          ThreadUI.back().then(function() {
            sinon.assert.calledWith(Navigation.toPanel, 'thread-list');
            sinon.assert.calledOnce(ThreadListUI.removeThread);
            sinon.assert.callOrder(Drafts.delete, Drafts.store);
            assert.isNull(ThreadUI.draft);
          }).then(done, done);
        });

        test('Cancel', function(done) {
          optionMenuTargetItemIndex = 2;

          ThreadUI.back().then(function() {
            throw new Error('Success callback should not have been called.');
          }, function() {
            sinon.assert.notCalled(ThreadUI.saveDraft);
            sinon.assert.notCalled(ThreadListUI.removeThread);
            sinon.assert.notCalled(Navigation.toPanel);
          }).then(done, done);
        });
      });

      suite('If existing draft', function() {

        suite('If draft edited', function() {

          setup(function() {
            ThreadUI.recipients.add({
              number: '999'
            });

            ThreadUI.draft = new Draft({
              id: 55
            });

            ThreadUI.draft.isEdited = true; // can't set this via options
          });

          test('Prompts for replacement if recipients', function(done) {
            ThreadUI.back().then(function() {
              assert.isTrue(OptionMenu.calledOnce);
              assert.isTrue(showCalled);

              var items = OptionMenu.args[0][0].items;

              // Assert the correct menu items were displayed
              assert.equal(items[0].l10nId, 'replace-draft');
              assert.equal(items[1].l10nId, 'discard-message');
              assert.equal(items[2].l10nId, 'cancel');
            }).then(done, done);
          });

          test('Prompts for replacement if recipients & content',
            function(done) {
            Compose.append('foo');

            ThreadUI.back().then(function() {
              assert.isTrue(OptionMenu.calledOnce);
              assert.isTrue(showCalled);

              var items = OptionMenu.args[0][0].items;

              // Assert the correct menu items were displayed
              assert.equal(items[0].l10nId, 'replace-draft');
              assert.equal(items[1].l10nId, 'discard-message');
              assert.equal(items[2].l10nId, 'cancel');
            }).then(done, done);
          });

          test('Prompts for replacement if content', function(done) {
            ThreadUI.recipients.remove('999');
            Compose.append('foo');

            ThreadUI.back().then(function() {
              assert.isTrue(OptionMenu.calledOnce);
              assert.isTrue(showCalled);

              var items = OptionMenu.args[0][0].items;

              // Assert the correct menu items were displayed
              assert.equal(items[0].l10nId, 'replace-draft');
              assert.equal(items[1].l10nId, 'discard-message');
              assert.equal(items[2].l10nId, 'cancel');
            }).then(done, done);
          });
        });

        suite('If draft not edited', function() {

          setup(function() {
            ThreadUI.draft = {id: 55};
          });

          test('No prompt for replacement if recipients', function(done) {
            ThreadUI.draft.isEdited = false;

            ThreadUI.back().then(function() {
              assert.isNull(ThreadUI.draft);
              assert.isFalse(OptionMenu.calledOnce);
              assert.isFalse(showCalled);
            }).then(done, done);
          });

          test('No prompt for replacement if recipients & content',
            function(done) {

            Compose.append('foo');
            ThreadUI.draft.isEdited = false;

            ThreadUI.back().then(function() {
              assert.isNull(ThreadUI.draft);
              assert.isFalse(OptionMenu.calledOnce);
              assert.isFalse(showCalled);
            }).then(done, done);
          });

          test('No prompt for replacement if content', function(done) {
            ThreadUI.recipients.remove('999');
            Compose.append('foo');
            ThreadUI.draft.isEdited = false;

            ThreadUI.back().then(function() {
              assert.isNull(ThreadUI.draft);
              assert.isFalse(OptionMenu.calledOnce);
              assert.isFalse(showCalled);
            }).then(done, done);
          });
        });
      });
    });
  });

  suite('Close button behaviour', function() {
    test('Call ActivityHandler.leaveActivity', function(done) {
      this.sinon.stub(ActivityHandler, 'leaveActivity');
      ThreadUI.close().then(function() {
        sinon.assert.called(ActivityHandler.leaveActivity);
      }).then(done, done);
    });
  });

  suite('New Message banner', function() {
    var notice;

    function addMessages() {
      for (var i = 0; i < 15; i++) {
        var message = MockMessages.sms({
          id: i
        });
        ThreadUI.appendMessage(message);
      }
    }

    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      container.style.overflow = 'scroll';
      container.style.height = '50px';
      notice = document.getElementById('messages-new-message-notice');
      var testMessage = MockMessages.sms({
        id: 20
      });

      addMessages();

      //Put the scroll on top
      container.scrollTop = 0;
      dispatchScrollEvent(container);

      MessageManager.on.withArgs('message-received').yield({
        message: testMessage
      });
    });

    suite('should be shown', function() {
      test('when new message is received', function() {
        assert.isFalse(notice.classList.contains('hide'));
      });
    });

    suite('should be closed', function() {
      test('when the notice is clicked', function() {
        notice.click();
        assert.isFalse(ThreadUI.isScrolledManually);
        assert.isTrue(notice.classList.contains('hide'));
      });

      test('when the scroll reach the bottom', function() {
        container.scrollTop = container.scrollHeight;

        dispatchScrollEvent(container);

        assert.isTrue(notice.classList.contains('hide'));
      });
    });
  });

  /* The options menu depends on the situation:
   * - 'Add Subject' if there's none, 'Delete subject' if previously added
   * - 'Delete messages' for existing conversations
   * - 'Settings' for all cases
   */
  suite('Options menu', function() {
    setup(function() {
      MockOptionMenu.mSetup();
    });

    teardown(function() {
      MockOptionMenu.mTeardown();
    });

    suite('opens from new message', function() {
      var options;
      setup(function() {
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
      });

      test('should show proper options', function() {
        ThreadUI.showOptions();
        options = MockOptionMenu.calls[0].items;
        assert.equal(MockOptionMenu.calls.length, 1);
        assert.equal(options.length, 2);
        assert.equal(options[0].l10nId, 'add-subject');
      });
    });

    suite('opens from existing message', function() {
      var options;
      setup(function() {
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        ThreadUI.showOptions();
        options = MockOptionMenu.calls[0].items;
      });

      test('should show options overlay', function() {
        assert.equal(MockOptionMenu.calls.length, 1);
      });
      test('should show option for adding subject', function() {
        assert.equal(options[0].l10nId, 'add-subject');
      });
      test('should show option for selecting messages', function() {
        assert.equal(options[1].l10nId, 'selectMessages-label');
      });
    });
  });

  suite('getMessageBubble(element) > ', function() {
    var tree, li, section, span;

    setup(function() {
      tree = document.createElement('div');

      tree.innerHTML = [
        '<div id="thread-messages">',
          '<ul>',
            '<li data-message-id="1">',
              '<section class="bubble">',
                '<span>.</span>',
              '</section>',
            '</li>',
          '</ul>',
        '</div>'
      ].join();

      span = tree.querySelector('span');
      section = tree.querySelector('section');
      li = tree.querySelector('li');
    });

    test('Finds the bubble (event target is lower)', function() {
      var data = ThreadUI.getMessageBubble(span);

      assert.equal(data.node, section);
      assert.equal(data.id, 1);
    });

    test('Finds the bubble (event target is bubble)', function() {
      var data = ThreadUI.getMessageBubble(section);

      assert.equal(data.node, section);
      assert.equal(data.id, 1);
    });

    test('Does not find the bubble (event target is higher)', function() {
      var data = ThreadUI.getMessageBubble(li);

      assert.equal(data, null);
    });
  });

  suite('Edit mode tests', function() {
    var mainWrapper;

    setup(function() {
      mainWrapper = document.getElementById('main-wrapper');
    });

    test('Enter edit mode', function() {
      ThreadUI.startEdit();
      assert.isTrue(mainWrapper.classList.contains('edit'));
    });

    test('Exit edit mode', function() {
      ThreadUI.cancelEdit();
      assert.isTrue(!mainWrapper.classList.contains('edit'));
    });

    test('Exit edit mode is idempotent', function() {
      ThreadUI.startEdit();
      assert.isTrue(mainWrapper.classList.contains('edit'));
      ThreadUI.cancelEdit();
      assert.isTrue(!mainWrapper.classList.contains('edit'));
      assert.isTrue(!mainWrapper.classList.contains('edit'));
    });
  });

  suite('isCurrentThread(current threadId is 1)', function() {
    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
    });

    [1, 2].forEach((id) => {
      test('check thread panel with threadId is' + id, function() {
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);

        assert.equal(ThreadUI.isCurrentThread(id), id === 1);
      });

      test('check report panel with threadId is' + id, function() {
        Navigation.isCurrentPanel.withArgs(
          'report-view',
          { threadId: 1 }
        ).returns(true);

        assert.equal(ThreadUI.isCurrentThread(id), id === 1);
      });

      test('check group panel with threadId is' + id, function() {
        Navigation.isCurrentPanel.withArgs(
          'group-view',
          { id: 1 }
        ).returns(true);

        assert.equal(ThreadUI.isCurrentThread(id), id === 1);
      });
    });
  });

  suite('onMessageSending()', function() {
    // some more tests are in the "sending behavior" part

    setup(function() {
      this.sinon.stub(ThreadUI, 'appendMessage');
      this.sinon.stub(ThreadUI, 'isCurrentThread').returns(false);

      this.sinon.spy(Navigation, 'toPanel');
    });

    teardown(function() {
      Threads.clear();
    });


    test('should append message if the user is in correct thread', function() {
      // not implemented yet: https://github.com/cjohansen/Sinon.JS/issues/461
      // Navigation.isCurrentPanel.withExactArgs('thread').returns(true);
      ThreadUI.isCurrentThread.withArgs(1).returns(true);

      var message = MockMessages.sms({
        threadId: 1
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: message
      });

      sinon.assert.called(ThreadUI.appendMessage);
    });

    test('should do nothing if the user is not in correct thread', function() {
      var message = MockMessages.sms({
        threadId: 2
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: message
      });

      sinon.assert.notCalled(ThreadUI.appendMessage);

      // should not change the panel since we didn't click the send button
      sinon.assert.notCalled(Navigation.toPanel);
    });
  });

  suite('onMessageReceived >', function() {
    setup(function() {
      this.sinon.stub(ThreadUI, 'isCurrentThread').returns(false);
      this.sinon.spy(MessageManager, 'markMessagesRead');
    });

    test('should not mark message as read if message from other thread',
    function() {
      var message = MockMessages.sms();

      MessageManager.on.withArgs('message-received').yield({
        message: message
      });

      sinon.assert.notCalled(MessageManager.markMessagesRead);
    });

    test('should mark message as read if message from the current thread',
    function() {
      var message = MockMessages.sms({
        threadId: 1
      });

      ThreadUI.isCurrentThread.withArgs(1).returns(true);

      MessageManager.on.withArgs('message-received').yield({
        message: message
      });

      sinon.assert.calledWith(MessageManager.markMessagesRead, [message.id]);
    });
  });

  suite('handleDraft()', function() {
    setup(function() {
      ThreadUI.draft = new Draft({
        threadId: 1234,
        recipients: []
      });
      this.sinon.spy(Compose, 'fromDraft');
      this.sinon.stub(Compose, 'focus');
      this.sinon.stub(Drafts, 'delete').returns(Drafts);
      this.sinon.stub(Drafts, 'store').returns(Drafts);
      this.sinon.spy(ThreadUI.recipients, 'add');
      this.sinon.spy(ThreadUI, 'updateHeaderData');
    });

    teardown(function() {
      ThreadUI.draft = null;
    });

    test('Calls Compose.fromDraft(), no recipients loaded', function() {
      ThreadUI.handleDraft();
      sinon.assert.calledOnce(Compose.fromDraft);
      sinon.assert.notCalled(ThreadUI.recipients.add);
      sinon.assert.notCalled(ThreadUI.updateHeaderData);
    });

    test('with recipients', function() {
      ThreadUI.draft.recipients = ['800 732 0872', '800 555 1212'];
      ThreadUI.handleDraft();
      sinon.assert.calledTwice(ThreadUI.recipients.add);
      sinon.assert.notCalled(ThreadUI.updateHeaderData);
    });

    test('discards draft record', function() {
      ThreadUI.draft = new Draft({
        recipients: []
      });

      ThreadUI.handleDraft();

      sinon.assert.callOrder(Drafts.delete, Drafts.store);
    });

    test('focus composer', function() {
      ThreadUI.handleDraft();
      sinon.assert.called(Compose.focus);
    });
  });

  suite('handleActivity() >', function() {
    setup(function() {
      this.sinon.stub(Compose, 'fromDraft');
      this.sinon.stub(Compose, 'fromMessage');
      this.sinon.stub(Compose, 'focus');
      this.sinon.stub(ThreadUI.recipients, 'focus');
    });

    test('from activity with unknown contact', function() {
      var activity = {
        number: '998',
        contact: null
      };
      ThreadUI.handleActivity(activity);

      assert.equal(ThreadUI.recipients.numbers.length, 1);
      assert.equal(ThreadUI.recipients.numbers[0], '998');
      sinon.assert.calledWith(Compose.fromMessage, activity);
    });

    test('from activity with known contact', function() {
      var activity = {
        contact: new MockContact()
      };
      ThreadUI.handleActivity(activity);

      assert.equal(ThreadUI.recipients.numbers.length, 1);
      assert.equal(ThreadUI.recipients.numbers[0], '+346578888888');
      sinon.assert.calledWith(Compose.fromMessage, activity);
    });

    test('with message body', function() {
      var activity = {
        number: '998',
        contact: null,
        body: 'test'
      };
      ThreadUI.handleActivity(activity);
      sinon.assert.calledWith(Compose.fromMessage, activity);
    });

    test('No contact and no number', function() {
      var activity = {
        number: null,
        contact: null,
        body: 'Youtube url'
      };
      ThreadUI.handleActivity(activity);
      assert.equal(ThreadUI.recipients.numbers.length, 0);
      sinon.assert.calledWith(Compose.fromMessage, activity);
    });

    test('focus composer if there is at least one recipient', function() {
      var activity = {
        number: '998',
        contact: null,
        body: 'test'
      };
      ThreadUI.handleActivity(activity);
      sinon.assert.called(Compose.focus);
      sinon.assert.notCalled(ThreadUI.recipients.focus);
    });

    test('focus recipients if there isn\'t any contact or number', function() {
      var activity = {
        number: null,
        contact: null,
        body: 'Youtube url'
      };
      ThreadUI.handleActivity(activity);
      sinon.assert.notCalled(Compose.focus);
      sinon.assert.called(ThreadUI.recipients.focus);
    });
  });

  suite('handleForward() >', function() {
    var message;
    setup(function() {
      this.sinon.spy(Compose, 'fromMessage');
      this.sinon.stub(ThreadUI.recipients, 'focus');
      this.sinon.stub(MessageManager, 'getMessage', function(id) {
        switch (id) {
          case 1:
            message = MockMessages.sms();
            break;
          case 2:
            message = MockMessages.mms();
            break;
          case 3:
            message = MockMessages.mms({subject: 'Title'});
        }
        var request = {
          result: message,
          set onsuccess(cb) {
            cb();
          },
          get onsuccess() {
            return {};
          }
        };
        return request;
      });
    });

    test(' forward SMS', function() {
      var forward = {
        messageId: 1
      };
      ThreadUI.handleForward(forward);
      sinon.assert.calledOnce(MessageManager.getMessage);
      sinon.assert.calledWith(MessageManager.getMessage, 1);
      sinon.assert.calledWith(Compose.fromMessage, message);
    });

    test(' forward MMS with attachment', function() {
      var forward = {
        messageId: 2
      };
      ThreadUI.handleForward(forward);
      sinon.assert.calledOnce(MessageManager.getMessage);
      sinon.assert.calledWith(MessageManager.getMessage, 2);
      sinon.assert.calledWith(Compose.fromMessage, message);
    });

    test(' forward MMS with subject', function() {
      var forward = {
        messageId: 3
      };
      ThreadUI.handleForward(forward);
      sinon.assert.calledOnce(MessageManager.getMessage);
      sinon.assert.calledWith(MessageManager.getMessage, 3);
      sinon.assert.calledWith(Compose.fromMessage, message);
    });

    test(' focus recipients', function() {
      var forward = {
        messageId: 1
      };
      ThreadUI.handleForward(forward);
      assert.isTrue(Recipients.View.isFocusable);
      sinon.assert.called(ThreadUI.recipients.focus);
    });
  });

  suite('beforeLeave() ', function() {
    test('to thread-list, exits edit mode', function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);

      ThreadUI.startEdit();
      ThreadUI.beforeLeave();

      assert.isFalse(mainWrapper.classList.contains('edit'));
    });

    test('to thread view, exits edit mode', function() {
      // this can happen when the user clicks a notification
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      ThreadUI.startEdit();
      ThreadUI.beforeLeave();

      assert.isFalse(mainWrapper.classList.contains('edit'));
    });
  });

  suite('afterLeave()', function() {
    setup(function() {
       this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
    });

    test('properly clean the composer when moving back to thread list',
    function() {
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      Compose.append('some stuff');
      ThreadUI.recipients.add({
        number: '999'
      });
      threadMessages.classList.add('new');

      ThreadUI.afterLeave();

      assert.equal(Compose.getContent(), '');
      assert.equal(ThreadUI.recipients.length, 0);
      assert.isFalse(threadMessages.classList.contains('new'));
    });

    test('properly clean the composer when moving to thread panel', function() {
      // This case only happens when user sends new message and then
      // automatically navigated to the thread panel and composer fields are
      // cleaned in the sendMessage, so afterLeave isn't supposed to clean it.
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      ThreadUI.recipients.add({
        number: '999'
      });
      threadMessages.classList.add('new');

      ThreadUI.afterLeave();

      assert.equal(ThreadUI.recipients.length, 0);
      assert.isFalse(threadMessages.classList.contains('new'));
    });

    test('properly cleans the thread view when moving back to thread list',
    function() {
      var contact = new MockContact(),
          number = contact.tel[0].value,
          thread = {
            participants: [number]
          };
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);

      ThreadUI.updateCarrier(thread, [contact]);
      assert.isTrue(threadMessages.classList.contains('has-carrier'));

      // Show call button
      ThreadUI.callNumberButton.classList.remove('hide');

      ThreadUI.afterLeave();

      assert.isFalse(threadMessages.classList.contains('has-carrier'));
      assert.isTrue(ThreadUI.callNumberButton.classList.contains('hide'));
    });
  });

  function beforeEnterGeneralTests(getTransitionArgs) {
    suite('beforeEnter()', function() {
      var transitionArgs;

      setup(function() {
        transitionArgs = getTransitionArgs();
        this.sinon.spy(MockLazyLoader, 'load');
        this.sinon.spy(window, 'MultiSimActionButton');
        this.sinon.stub(ActivityHandler, 'isInActivity').returns(false);
        ThreadUI.beforeEnter(transitionArgs);
      });

      test('sets "back" header action if it is not in activity', function() {
        var messagesHeader = document.getElementById('messages-header');

        assert.equal(messagesHeader.getAttribute('action'), 'back');

        ActivityHandler.isInActivity.returns(true);
        ThreadUI.beforeEnter(transitionArgs);

        assert.equal(messagesHeader.getAttribute('action'), 'close');
      });

      test('initializes MultiSimActionButton', function() {
        sinon.assert.calledWith(
          MultiSimActionButton,
          sendButton,
          sinon.match.func,
          Settings.SERVICE_ID_KEYS.smsServiceId
        );
      });

      test('initializes only once', function() {
        ThreadUI.beforeEnter(transitionArgs);
        sinon.assert.calledOnce(MultiSimActionButton);
      });

      test('Should set the isFocusable value to \'true\'', function() {
        Recipients.View.isFocusable = false;
        ThreadUI.beforeEnter(transitionArgs);
        assert.isTrue(Recipients.View.isFocusable);
      });

      test('loads and translates SIM picker', function() {
        var simPickerElt = document.getElementById('sim-picker');

        sinon.assert.calledWith(MockLazyLoader.load, [simPickerElt]);
      });

      test('loads the audio played when a message is sent', function() {
        var sentAudio = ThreadUI.sentAudio;

        assert.isTrue(
          sentAudio.src.endsWith('/sounds/firefox_msg_sent.opus'),
          'sentAudio properly loaded'
        );
        assert.equal(
          sentAudio.mozAudioChannelType, 'notification',
          'sentAudio uses the right audio channel'
        );

        assert.equal(
          sentAudio.preload, 'none',
          'the file is not preloaded'
        );
      });
    });
  }

  suite('switch to composer >', function() {
    var transitionArgs;

    setup(function() {
      transitionArgs = {
        meta: {
          next: { panel: 'composer', args: {} },
          prev: { panel: 'thread-list', args: {} }
        }
      };

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
    });

    suite('beforeEnter()', function() {
      setup(function() {
        Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      });

      beforeEnterGeneralTests(() => transitionArgs);

      suite('composer-specific tests', function() {
        setup(function() {
          this.sinon.spy(ThreadUI, 'cleanFields');
          this.sinon.spy(ThreadUI.recipients, 'focus');

          ThreadUI.draft = null;
          Compose.append('some stuff');
          ThreadUI.recipients.add({number: '456789'});

          ThreadUI.beforeEnter(transitionArgs);
        });

        test(' all fields cleaned', function() {
          sinon.assert.called(ThreadUI.cleanFields);
        });

        test(' layout updated', function() {
          assert.ok(threadMessages.classList.contains('new'));
        });

        test('cleans up the state', function() {
          assert.equal(Compose.getContent(), '');
          assert.equal(ThreadUI.recipients.length, 0);
        });

        test('updates the header', function() {
          assert.equal(headerText.dataset.l10nId, 'newMessage');
        });
      });

      test('coming from a thread, should reset currentId', function() {
        Threads.currentId = 1;
        ThreadUI.beforeEnter(transitionArgs);
        assert.isNull(Threads.currentId);
      });
    });

    suite('afterEnter()', function() {
      setup(function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        this.sinon.stub(ThreadUI.recipients, 'focus');

        // we test these functions separately so it's fine to merely test
        // they're called
        this.sinon.stub(ThreadUI, 'handleForward');
        this.sinon.stub(ThreadUI, 'handleActivity');
        this.sinon.stub(ThreadUI, 'handleDraft');
      });

      test('handles the activity', function() {
        transitionArgs.activity = {};
        ThreadUI.afterEnter(transitionArgs);
        sinon.assert.calledWith(
          ThreadUI.handleActivity, transitionArgs.activity
        );
      });

      test('recalls the draft', function() {
        transitionArgs.draftId = '1';
        ThreadUI.afterEnter(transitionArgs);
        sinon.assert.calledWith(ThreadUI.handleDraft, +transitionArgs.draftId);
      });

      test('handles the forward', function() {
        transitionArgs.forward = {
          messageId: 1
        };
        ThreadUI.afterEnter(transitionArgs);
        sinon.assert.calledWith(ThreadUI.handleForward, transitionArgs.forward);
      });

      test('focus the composer', function() {
        ThreadUI.afterEnter(transitionArgs);
        sinon.assert.called(ThreadUI.recipients.focus);
      });
    });
  });

  suite('switch to thread panel >', function() {
    var threadId = 100,
        multiParticipantThreadId = 200;
    var transitionArgs,
        multiParticipantTransitionArgs;

    setup(function() {
      transitionArgs = {
        id: threadId,
        meta: {
          next: { panel: 'thread', args: { id: threadId } },
          prev: { panel: 'thread-list', args: {} }
        }
      };

      Threads.set(threadId, {
        participants: ['999']
      });

      multiParticipantTransitionArgs = {
        id: multiParticipantThreadId,
        meta: {
          next: { panel: 'thread', args: { id: multiParticipantThreadId } },
          prev: { panel: 'thread-list', args: {} }
        }
      };

      Threads.set(multiParticipantThreadId, {
        participants: ['999', '888']
      });

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      this.sinon.stub(ThreadListUI, 'mark');
      this.sinon.stub(MessageManager, 'markThreadRead');
      this.sinon.stub(ThreadUI, 'renderMessages');
      this.sinon.stub(Threads, 'get').returns({});
      this.sinon.stub(Compose, 'fromDraft');
      this.sinon.stub(Utils, 'closeNotificationsForThread');
      Utils.closeNotificationsForThread.returns(Promise.resolve());

      this.sinon.spy(ThreadUI, 'updateHeaderData');
    });

    suite('beforeEnter()', function() {
      setup(function() {
        Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      });

      beforeEnterGeneralTests(() => transitionArgs);

      suite('beforeEnter() specific tests', function() {
        setup(function() {
          ThreadUI.beforeEnter(transitionArgs);
        });

        test('calls updateHeaderData', function() {
          sinon.assert.called(ThreadUI.updateHeaderData);
        });

        test('updates Threads.currentId', function() {
          assert.equal(Threads.currentId, threadId);
        });

        test('correctly shows "Call" header button', function() {
          // It's shown for single participant non-email thread
          assert.isFalse(ThreadUI.callNumberButton.classList.contains('hide'));

          ThreadUI.callNumberButton.classList.add('hide');
          ThreadUI.beforeEnter(multiParticipantTransitionArgs);

          // Hidden for multi participant thread
          assert.isTrue(ThreadUI.callNumberButton.classList.contains('hide'));

          ThreadUI.callNumberButton.classList.add('hide');
          Settings.supportEmailRecipient = true;
          Threads.set(threadId, {
            participants: ['nobody@mozilla.com']
          });

          ThreadUI.beforeEnter(transitionArgs);

          // Hidden for email participant thread
          assert.isTrue(ThreadUI.callNumberButton.classList.contains('hide'));
        });
      });
    });

    suite('afterEnter()', function() {
      setup(function() {
        // Using a string checks that we correctly convert the id to a number
        transitionArgs.id = '' + threadId;

        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
      });

      test('we mark messages as read', function() {
        ThreadUI.afterEnter(transitionArgs);

        sinon.assert.calledWith(ThreadListUI.mark, threadId, 'read');
        this.sinon.clock.tick();
        sinon.assert.calledWith(MessageManager.markThreadRead, threadId);
      });

      test('renders messages', function() {
        ThreadUI.afterEnter(transitionArgs);

        sinon.assert.calledWith(ThreadUI.renderMessages, threadId);
      });

      test('closes notifications', function() {
        ThreadUI.afterEnter(transitionArgs);

        sinon.assert.calledWith(Utils.closeNotificationsForThread, threadId);
      });

      suite('recalls draft for this thread >', function() {
        var draft;

        setup(function() {
          // ensures a clean state
          ThreadUI.draft = null;

          draft = {};
          Threads.get.withArgs(threadId).returns({
            hasDrafts: true,
            drafts: {
              latest: draft
            }
          });

          ThreadUI.afterEnter(transitionArgs);
        });

        test('Draft rendered after clearing composer', function() {
          sinon.assert.callOrder(ThreadUI.renderMessages, Compose.fromDraft);
          sinon.assert.calledWith(Compose.fromDraft, draft);
          assert.equal(draft, ThreadUI.draft);
          assert.isFalse(ThreadUI.draft.isEdited);
        });

      });
    });

    suite('enter from report view', function() {
      setup(function() {
        transitionArgs.meta.prev = {
          panel: 'report-view',
          args: { id: 1 }
        };

        Threads.get.withArgs(threadId).returns({
          hasDrafts: true,
          drafts: {
            latest: {}
          }
        });

        Navigation.isCurrentPanel.withArgs('report-view').returns(true);
        ThreadUI.beforeEnter(transitionArgs);
        Navigation.isCurrentPanel.withArgs('report-view').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
        ThreadUI.afterEnter(transitionArgs);
      });

      test('does not render messages', function() {
        sinon.assert.notCalled(ThreadUI.renderMessages);
      });

      test('calls ThreadListUI.mark', function() {
        sinon.assert.calledWith(ThreadListUI.mark, threadId, 'read');
      });

      test('does not recall draft', function() {
        sinon.assert.notCalled(Compose.fromDraft);
      });
    });

    suite('enter from group view', function() {
      setup(function() {
        transitionArgs.meta.prev = {
          panel: 'group-view',
          args: { id: threadId }
        };

        Threads.get.withArgs(threadId).returns({
          hasDrafts: true,
          drafts: {
            latest: {}
          }
        });

        Navigation.isCurrentPanel.withArgs('group-view').returns(true);
        ThreadUI.beforeEnter(transitionArgs);
        Navigation.isCurrentPanel.withArgs('group-view').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
        ThreadUI.afterEnter(transitionArgs);
      });

      test('does not render messages', function() {
        sinon.assert.notCalled(ThreadUI.renderMessages);
      });

      test('calls ThreadListUI.mark', function() {
        sinon.assert.calledWith(ThreadListUI.mark, threadId, 'read');
      });

      test('does not recall draft', function() {
        sinon.assert.notCalled(Compose.fromDraft);
      });
    });

    suite('entering from composer ', function() {
      setup(function() {
        transitionArgs.meta.prev = {
          panel: 'composer'
        };

        Compose.append('some existing text');

        // threadMessages is in edit mode
        threadMessages.classList.add('new');

        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        ThreadUI.beforeLeave(transitionArgs);
        ThreadUI.beforeEnter(transitionArgs);
        Navigation.isCurrentPanel.withArgs('composer').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
        ThreadUI.afterLeave(transitionArgs);
        ThreadUI.afterEnter(transitionArgs);
      });

      test('renders messages', function() {
        sinon.assert.calledWith(ThreadUI.renderMessages, threadId);
      });

      test('calls ThreadListUI.mark', function() {
        sinon.assert.calledWith(ThreadListUI.mark, threadId, 'read');
      });

      test('removes "new" class from messages container', function() {
        assert.isFalse(threadMessages.classList.contains('new'));
      });

      test('calls updateHeaderData', function() {
        sinon.assert.called(ThreadUI.updateHeaderData);
      });

      test('updates Threads.currentId', function() {
        assert.equal(Threads.currentId, threadId);
      });
    });
  });

  suite('Compose mode tests', function() {
    teardown(function() {
      Compose.clear();
    });

    suite('recipients panel mode change', function() {
      setup(function() {
        this.sinon.stub(Recipients.prototype, 'on');

        ThreadUI.recipients = null;

        ThreadUI.init();
      });

      test('multiline-recipients mode is turned off by default', function() {
        assert.isFalse(
          threadMessages.classList.contains('multiline-recipients-mode')
        );
      });

      test('correctly toggles multiline-recipients mode', function() {
        ThreadUI.recipients.on.withArgs('modechange').yield('singleline-mode');
        assert.isFalse(
          threadMessages.classList.contains('multiline-recipients-mode'),
          'Single line mode event should not add multiline class'
        );

        ThreadUI.recipients.on.withArgs('modechange').yield('multiline-mode');
        assert.isTrue(
          threadMessages.classList.contains('multiline-recipients-mode'),
          'Multi line mode event should add multiline class'
        );

        ThreadUI.recipients.on.withArgs('modechange').yield('singleline-mode');
        assert.isFalse(
          threadMessages.classList.contains('multiline-recipients-mode'),
          'Single line mode event should remove multiline class if it is set'
        );
      });
    });
  });

  suite('onMessageSendRequestCompleted >', function() {
    setup(function() {
       this.sinon.stub(ThreadUI, 'sentAudio', {
         play: sinon.stub()
       });
    });

    test('play sent audio if it is enabled', function() {
      this.sinon.stub(ThreadUI, 'sentAudioEnabled', true);

      ThreadUI.onMessageSendRequestCompleted();

      sinon.assert.called(ThreadUI.sentAudio.play);
    });

    test('does not play sent audio if it is not enabled', function() {
      this.sinon.stub(ThreadUI, 'sentAudioEnabled', false);

      ThreadUI.onMessageSendRequestCompleted();

      sinon.assert.notCalled(ThreadUI.sentAudio.play);
    });
  });
});
