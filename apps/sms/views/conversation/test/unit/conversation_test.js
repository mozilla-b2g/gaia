/*global MocksHelper, MockAttachment, MockL10n, loadBodyHTML, ConversationView,
         Contacts, Compose, MockErrorDialog,
         Template, MockSMIL, Utils, MessageManager, LinkActionHandler,
         LinkHelper, Attachment, MockContact, MockOptionMenu,
         MockActivityPicker, Threads, Settings, MockMessages, MockUtils,
         MockContacts, Recipients, MockMozActivity,
         InboxView, ContactRenderer, UIEvent, Drafts, OptionMenu,
         ActivityPicker, MockNavigatorSettings, MockContactRenderer,
         Draft, MockStickyHeader, MultiSimActionButton, Promise,
         MockLazyLoader, WaitingScreen, Navigation, MockSettings,
         ActivityClient,
         App,
         AssetsHelper,
         DocumentFragment,
         Errors,
         SMIL,
         TaskRunner,
         Thread
*/

'use strict';

require('/shared/js/event_dispatcher.js');

require('/views/conversation/js/conversation.js');
require('/views/shared/js/shared_components.js');
require('/views/shared/js/utils.js');
require('/views/shared/js/errors.js');
require('/views/shared/js/task_runner.js');

require('/views/shared/test/unit/mock_time_headers.js');
require('/views/shared/test/unit/mock_link_action_handler.js');
require('/views/shared/test/unit/mock_attachment.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/views/shared/test/unit/mock_utils.js');
require('/views/shared/test/unit/mock_link_helper.js');
require('/views/shared/test/unit/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/views/shared/test/unit/mock_messages.js');
require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/views/shared/test/unit/mock_recipients.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_activity_picker.js');
require('/views/shared/test/unit/mock_dialog.js');
require('/views/shared/test/unit/mock_smil.js');
require('/views/shared/test/unit/mock_compose.js');
require('/views/shared/test/unit/mock_information.js');
require('/views/shared/test/unit/mock_contact_renderer.js');
require('/services/test/unit/mock_message_manager.js');
require('/views/shared/test/unit/mock_waiting_screen.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_inbox.js');
require('/views/shared/test/unit/mock_selection_handler.js');
require('/views/shared/test/unit/mock_app.js');
require('/services/test/unit/mock_drafts.js');
require('/services/test/unit/mock_threads.js');
require('/services/test/unit/activity/mock_activity_client.js');

require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_sticky_header.js');
require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_option_menu.js');

var mocksHelperForConversationView = new MocksHelper([
  'asyncStorage',
  'Attachment',
  'Utils',
  'Settings',
  'Recipients',
  'LinkActionHandler',
  'LinkHelper',
  'MozActivity',
  'ActivityPicker',
  'OptionMenu',
  'ErrorDialog',
  'Contacts',
  'SMIL',
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
  'InboxView',
  'SelectionHandler',
  'Drafts',
  'Draft',
  'Threads',
  'Thread',
  'ActivityClient',
  'App',
  'Compose'
]).init();

suite('conversation.js >', function() {
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

  var testImageBlob;
  var oversizedImageBlob;
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

  function setActiveThread(id = 1, participants = ['999']) {
    Threads.currentId = id;

    Threads.active = new Thread({
      id: id,
      participants: participants
    });
  }

  mocksHelperForConversationView.attachTestHelpers();

  suiteSetup(function(done) {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    var mediafolder = '/views/shared/test/unit/media';
    var blobPromises = [
      AssetsHelper.generateImageBlob(1400, 1400, 'image/jpeg', 1).then(
        (blob) => oversizedImageBlob = blob
      ),
      AssetsHelper.generateImageBlob(300, 300, 'image/jpeg', 0.5).then(
        (blob) => testImageBlob = blob
      ),
      AssetsHelper.loadFileBlob(`${mediafolder}/video.ogv`).then(
        (blob) => testVideoBlob = blob
      )
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
  });

  setup(function() {
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
    this.sinon.stub(Compose, 'off');
    this.sinon.useFakeTimers();

    this.sinon.stub(ActivityClient);

    ConversationView.recipients = null;
    ConversationView.init();

    sticky = MockStickyHeader;
    MockOptionMenu.mSetup();
  });

  teardown(function() {
    // This is added in ConversationView.init, so we need to remove the listener
    // to prevent having the listener being called several times.
    document.removeEventListener(
      'visibilitychange', ConversationView.onVisibilityChange
    );

    document.body.innerHTML = '';

    sticky = null;
    MockOptionMenu.mTeardown();
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
        innerHTML += ConversationView.tmpl.message.interpolate({
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

      assert.ok(ConversationView.isScrolledManually);
    });

    test('scroll to bottom, should be detected as an automatic scroll',
    function() {
      ConversationView.isScrolledManually = false;
      ConversationView.scrollViewToBottom();

      dispatchScrollEvent(container);

      assert.isFalse(ConversationView.isScrolledManually);
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
        ConversationView.isScrolledManually = false;
        MessageManager.on.withArgs('message-received').yield({
          message: MockMessages.sms()
        });
        sinon.assert.calledOnce(HTMLElement.prototype.scrollIntoView);
      });

      test('should not scroll if we are not at the bottom', function() {
        ConversationView.isScrolledManually = true;
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

      this.sinon.spy(Compose, 'clear');

      ConversationView.initRecipients();
      ConversationView.recipients.length = 0;
      ConversationView.recipients.inputValue = '';
    });

    teardown(function() {
      ConversationView.recipients.length = 0;
      ConversationView.recipients.inputValue = '';
    });

    test('composer cleared', function() {
      ConversationView.cleanFields();

      sinon.assert.calledOnce(Compose.clear);
    });

    suite('rendering suggestions list', function() {
      var suggestionRenderer, unknownRenderer;
      var contact, unknown;
      setup(function(done) {
        suggestionRenderer = new MockContactRenderer();
        unknownRenderer = new MockContactRenderer();
        sinon.spy(suggestionRenderer, 'render');
        sinon.spy(unknownRenderer, 'render');
        this.sinon.spy(ConversationView, 'toggleRecipientSuggestions');

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

        var contactPromise = Promise.resolve([contact, unknown]);
        this.sinon.stub(Contacts, 'findByString').returns(contactPromise);

        ConversationView.recipients.add({
          number: '888'
        });

        var placeholder = document.createElement('span');
        placeholder.setAttribute('contenteditable', 'true');
        placeholder.isPlaceholder = true;
        placeholder.textContent = '999';
        recipientsList.appendChild(placeholder);

        ConversationView.recipients.inputValue = '999';

        placeholder.dispatchEvent(new CustomEvent('input', { bubbles: true }));

        contactPromise.then(() => done(), done);
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
          ConversationView.toggleRecipientSuggestions,
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

      ConversationView.toggleRecipientSuggestions(documentFragment);

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


      ConversationView.toggleRecipientSuggestions();

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

      ConversationView.toggleRecipientSuggestions(documentFragment);
      recipientSuggestions.scrollTop = 200;

      assert.equal(
        recipientSuggestions.scrollTop, 200,
        'Recipient suggestions should be scrolled down'
      );

      ConversationView.toggleRecipientSuggestions(documentFragment);

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

    setup(function() {
      // This is added in ConversationView.init, so we need to remove the
      // listener to prevent having the listener being called several times.
      // We need to do this here in addition to main teardown because
      // ConversationView.init changes the function, binding it.

      document.removeEventListener(
        'visibilitychange', ConversationView.onVisibilityChange
      );
      ConversationView.init();
      ConversationView.enableConvertNoticeBanners();

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

      this.sinon.clock.tick(ConversationView.ANOTHER_SMS_TOAST_DURATION);

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

      this.sinon.clock.tick(ConversationView.ANOTHER_SMS_TOAST_DURATION);

      yieldSegmentInfo({
        segments: 2,
        charsAvailableInLastSegment: 145
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ConversationView.ANOTHER_SMS_TOAST_DURATION);

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

      this.sinon.clock.tick(ConversationView.ANOTHER_SMS_TOAST_DURATION);

      yieldSegmentInfo({
        segments: 1,
        charsAvailableInLastSegment: 10
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ConversationView.ANOTHER_SMS_TOAST_DURATION);

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
      ConversationView.cleanFields();

      yieldSegmentInfo({
        segments: 2,
        charsAvailableInLastSegment: 10
      });

      assert.isFalse(
        counterMsgContainer.classList.contains('hide'),
        'sms counter toast should be showed'
      );

      this.sinon.clock.tick(ConversationView.ANOTHER_SMS_TOAST_DURATION);

      ConversationView.cleanFields();

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
        var node = banner.querySelector('p');
        var l10nAttrs = navigator.mozL10n.getAttributes(node);

        assert.equal(l10nAttrs.id, 'multimedia-message-exceeded-max-length');
        assert.deepEqual(l10nAttrs.args, {mmsSize: '1'});
      });
    });

    suite('size is below limit again', function() {
      test('banner is hidden when the size is decreased to the limit',
        function() {
        ConversationView.hideMaxLengthNotice();
        assert.isTrue(banner.classList.contains('hide'));
      });
    });
  });

  suite('Max Length banner', function() {
    var banner;

    setup(function() {
      banner = document.getElementById('messages-subject-max-length-notice');

      Compose.isSubjectVisible = true;
      Compose.on.withArgs('subject-change').yield();
    });

    teardown(function() {
      banner.classList.add('hide');

      Compose.isSubjectVisible = false;
    });

    test('should be hidden if limit not reached', function() {
      assert.isTrue(banner.classList.contains('hide'));
    });

    suite('when trying to pass the limit...', function() {
      setup(function() {
        this.sinon.stub(Compose, 'isSubjectMaxLength').returns(true);
        Compose.on.withArgs('subject-change').yield();
      });

      test('should create a timeout', function() {
        assert.isFalse(!ConversationView.timeouts.subjectLengthNotice);
      });

      test('banner should be hidden after an amount of secs.',
        function() {
        assert.isFalse(banner.classList.contains('hide'));
        this.sinon.clock.tick(ConversationView.BANNER_DURATION);
        assert.isTrue(banner.classList.contains('hide'));
      });

      test('should be visible', function() {
        assert.isFalse(banner.classList.contains('hide'));
      });
    });
  });

  suite('message type conversion >', function() {
    var convertBanner, convertBannerText, form;

    setup(function() {
      // This is added in ConversationView.init, so we need to remove the
      // listener to prevent having the listener being called several times.
      // We need to do this here in addition to main teardown because
      // ConversationView.init changes the function, binding it.

      document.removeEventListener(
        'visibilitychange', ConversationView.onVisibilityChange
      );

      ConversationView.init();
      ConversationView.enableConvertNoticeBanners();

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
      this.sinon.clock.tick(ConversationView.CONVERTED_MESSAGE_DURATION);

      this.sinon.stub(Compose, 'clear');

      ConversationView.cleanFields();

      sinon.assert.called(Compose.clear);
      assert.isTrue(convertBanner.classList.contains('hide'));
    });
  });

  suite('Recipient Assimilation', function() {
    setup(function() {
      this.sinon.spy(ConversationView, 'validateContact');
      ConversationView.initRecipients();
      this.sinon.spy(ConversationView.recipients, 'add');
      this.sinon.spy(ConversationView.recipients, 'remove');
      this.sinon.spy(ConversationView.recipients, 'update');
      this.sinon.spy(ConversationView.recipients, 'visible');
      this.sinon.spy(Utils, 'basicContact');

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
    });

    test('Recipient assimilation is called when Compose is interacted',
      function() {
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      var node = document.createElement('span');
      node.isPlaceholder = true;
      node.textContent = '999';

      ConversationView.recipientsList.appendChild(node);

      Compose.on.withArgs('interact').yield();

      // recipient added and container is cleared
      sinon.assert.calledWithMatch(ConversationView.recipients.add, {
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

      ConversationView.recipientsList.appendChild(node);

      container.click();

      sinon.assert.calledWithMatch(ConversationView.recipients.add, {
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
        ConversationView.assimilateRecipients();
        assert.isFalse(Recipients.View.isFocusable);
      });
    });

    suite('Existing Conversation', function() {

      setup(function() {
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
      });

      test('Will not assimilate recipients ', function() {
        ConversationView.assimilateRecipients();

        sinon.assert.notCalled(ConversationView.recipients.visible);
        sinon.assert.notCalled(ConversationView.recipients.add);
      });
    });

    suite('New Conversation', function() {
      var node;

      setup(function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        node = document.createElement('span');
        node.isPlaceholder = true;
        node.textContent = '999';

        ConversationView.recipientsList.appendChild(node);
      });

      teardown(function() {
        if (ConversationView.recipientsList.children.length) {
          ConversationView.recipientsList.removeChild(node);
        }
      });

      suite('Typed number', function() {
        test('Triggers assimilation ', function() {
          var visible;

          ConversationView.assimilateRecipients();

          visible = ConversationView.recipients.visible;

          assert.isTrue(visible.called);
          assert.isTrue(visible.firstCall.calledWith('singleline'));
          assert.isTrue(ConversationView.recipients.add.called);
          assert.isTrue(
            ConversationView.recipients.add.calledWithMatch({
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
          this.sinon.spy(ConversationView, 'searchContact');
          this.sinon.spy(ConversationView, 'exactContact');
        });

        test('Triggers assimilation & silent search ', function() {
          node.textContent = 'foo';
          ConversationView.assimilateRecipients();

          assert.isTrue(ConversationView.recipients.add.called);
          assert.isTrue(
            ConversationView.recipients.add.calledWithMatch({
              name: 'foo',
              number: 'foo',
              source: 'manual'
            })
          );
        });

        test('Matches contact ', function(done) {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findByString').returns(
            Promise.resolve(
              MockContact.list([
                { givenName: ['Jane'], familyName: ['Doozer'] }
              ])
            )
          );

          ConversationView.searchContact(record.number).then(contacts => {
            ConversationView.validateContact(record, record.number, contacts);
          }).then(() => {
            sinon.assert.called(ConversationView.recipients.remove);
            sinon.assert.calledWithMatch(
              ConversationView.recipients.add,
              {
                name: 'Jane Doozer',
                number: '+346578888888',
                type: 'Mobile',
                carrier: 'TEF',
                source: 'contacts'
              }
            );
          }).then(done, done);
        });

        test('Does not match contact ', function(done) {
          // Clear out the existing recipient field fixtures
          ConversationView.recipients.length = 0;
          ConversationView.recipientsList.textContent = '';

          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findByString').returns(
            Promise.resolve([])
          );

          var validateContact = ConversationView.validateContact.bind(
            ConversationView, record, record.number
          );
          ConversationView.searchContact(record.number).then(
            validateContact
          ).then(() => {
            sinon.assert.called(ConversationView.recipients.update);

            record.isInvalid = true;

            sinon.assert.calledWithMatch(
              ConversationView.recipients.update, 0, record
            );
          }).then(done, done);
        });

        test('Exact contact ', function(done) {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').returns(
            Promise.resolve(
              MockContact.list([
                { givenName: ['Jane'], familyName: ['Doozer'] }
              ])
            )
          );

          var validateContact =  ConversationView.validateContact.bind(
            ConversationView, record, record.number
          );
          ConversationView.exactContact(record.number).then(
            validateContact
          ).then(() => {
            sinon.assert.called(ConversationView.recipients.remove);
            sinon.assert.calledWithMatch(
              ConversationView.recipients.add,
              {
                name: 'Jane Doozer',
                number: '+346578888888',
                type: 'Mobile',
                carrier: 'TEF',
                source: 'contacts'
              }
            );
          }).then(done, done);
        });

        test('No exact contact ', function(done) {
          // Clear out the existing recipient field fixtures
          ConversationView.recipients.length = 0;
          ConversationView.recipientsList.textContent = '';

          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').returns(
            Promise.resolve([])
          );

          var validateContact = ConversationView.validateContact.bind(
            ConversationView, record, record.number
          );
          ConversationView.exactContact(record.number).then(
            validateContact
          ).then(() => {
            sinon.assert.called(ConversationView.recipients.update);

            record.isInvalid = true;

            sinon.assert.calledWithMatch(
              ConversationView.recipients.update, 0, record
            );
          }).then(done, done);
        });

        test('No exact contact, editting recipient ', function(done) {
          var record = {
            isQuestionable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          this.sinon.stub(Contacts, 'findExact').returns(
            Promise.resolve([])
          );

          var validateContact = ConversationView.validateContact.bind(
            ConversationView, record, record.number
          );
          ConversationView.exactContact(record.number).then(
            validateContact
          ).then(() => {
            sinon.assert.notCalled(ConversationView.recipients.update);
          }).then(done, done);
        });

        test('Determines correct strategy ', function() {
          var record = {
            isQuestionable: true,
            isLookupable: true,
            name: 'Jane Doozer',
            number: 'Jane Doozer',
            source: 'manual'
          };

          ConversationView.recipients.add(record);

          record.isLookupable = false;

          ConversationView.recipients.add(record);

          sinon.assert.calledOnce(ConversationView.searchContact);
          sinon.assert.calledOnce(ConversationView.exactContact);
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

        this.sinon.spy(Contacts, 'findExact');
      });

      suite('No Recipients', function() {
        test('input value has matching record ', function() {

          ConversationView.validateContact(fixture, '', contacts);

          sinon.assert.calledOnce(ConversationView.recipients.remove);
          sinon.assert.calledWith(ConversationView.recipients.remove, 0);

          assert.equal(
            ConversationView.recipients.add.firstCall.args[0].source, 'contacts'
          );
          assert.equal(
            ConversationView.recipients.add.firstCall.args[0].number,
            '+346578888888'
          );
        });

        test('input value is invalid ', function(done) {
          // An actual accepted recipient from contacts
          fixture.number = 'foo';
          fixture.isQuestionable = true;

          ConversationView.recipients.add(fixture);
          /* The previous add triggers an asynchronous behavior when validating
           * this new recipient. Let's wait for this. */
          Contacts.findExact.lastCall.returnValue.then(() => {
            assert.isFalse(fixture.isInvalid);

            ConversationView.recipientsList.lastElementChild.textContent = '';

            ConversationView.validateContact(fixture, '', []);

            sinon.assert.calledOnce(ConversationView.recipients.update);
            sinon.assert.calledWithMatch(
              ConversationView.recipients.update, 1, fixture
            );

            assert.isTrue(fixture.isInvalid);
          }).then(done, done);
        });

        test('[Email]input value has matching record ', function() {

          MockSettings.supportEmailRecipient = true;
          // TODO we need to filter properly inside contact search
          // results (bug 1084184)
          contacts[0].tel = [];
          ConversationView.validateContact(fixtureEmail, 'a@b.com', contacts);

          sinon.assert.calledOnce(ConversationView.recipients.remove);
          sinon.assert.calledWith(ConversationView.recipients.remove, 0);

          sinon.assert.calledWithMatch(
            ConversationView.recipients.add,
            {
              source: 'contacts',
              number: 'a@b.com'
            }
          );
        });

        test('[Email]input value is invalid ', function(done) {

          MockSettings.supportEmailRecipient = true;

          // An actual accepted recipient from contacts
          fixtureEmail.number = 'foo';
          fixtureEmail.isQuestionable = true;

          ConversationView.recipients.add(fixtureEmail);
          /* The previous add triggers an asynchronous behavior when validating
           * this new recipient. Let's wait for this. */
          Contacts.findExact.lastCall.returnValue.then(() => {
            assert.isFalse(fixtureEmail.isInvalid);

            ConversationView.recipientsList.lastElementChild.textContent = '';

            ConversationView.validateContact(fixtureEmail, '', []);

            sinon.assert.calledOnce(ConversationView.recipients.update);
            sinon.assert.calledWithMatch(
              ConversationView.recipients.update, 1, fixtureEmail
            );

            assert.isTrue(fixtureEmail.isInvalid);
          }).then(done, done);
        });
      });

      suite('Has Recipients', function() {
        test('input value has matching duplicate record w/ ' +
              'multiple, different tel records (accept) ', function() {

          // An actual accepted recipient from contacts
          ConversationView.recipients.add(fixture);

          // The last accepted recipient, manually entered.
          ConversationView.recipients.add({
            name: 'Janet Jones',
            number: 'Janet Jones',
            source: 'manual'
          });

          ConversationView.validateContact(fixture, '', contacts);

          sinon.assert.calledOnce(ConversationView.recipients.remove);
          sinon.assert.calledWith(ConversationView.recipients.remove, 1);

          assert.equal(
            ConversationView.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ConversationView.recipients.add.lastCall.args[0].number,
            '+12125559999'
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
          ConversationView.recipients.add({
            name: 'Janet Jones',
            number: '777',
            source: 'contacts'
          });

          // The last accepted recipient, manually entered.a
          ConversationView.recipients.add({
            name: 'Jane',
            number: 'Jane',
            source: 'manual'
          });

          ConversationView.validateContact(fixture, '', contacts);

          // Called from here, then called again for the
          // second contact record.
          sinon.assert.calledTwice(ConversationView.validateContact);

          sinon.assert.called(ConversationView.recipients.remove);
          sinon.assert.called(ConversationView.recipients.add);

          assert.equal(
            ConversationView.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ConversationView.recipients.add.lastCall.args[0].number, '888'
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
          ConversationView.recipients.add(fixture);

          fixture.source = 'manual';
          // The last accepted recipient, manually entered.
          ConversationView.recipients.add(fixture);

          assert.isFalse(fixture.isInvalid);

          ConversationView.recipientsList.lastElementChild.textContent = '';
          ConversationView.validateContact(fixture, '', contacts);

          // ConversationView.recipients.update is called with the updated
          // source recipient object. This object's isValid property
          // has been set to true.
          sinon.assert.calledOnce(
            ConversationView.recipients.update
          );
          sinon.assert.calledWithMatch(
            ConversationView.recipients.update, 1, fixture
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

          // in bug 1084184 we should be able to filter the contacts using the
          // fValue.
          contacts[0].tel = [];
          contacts[1].tel = [];

          // An actual accepted recipient from contacts
          ConversationView.recipients.add({
            name: 'Janet Jones',
            number: 'a@b',
            source: 'contacts'
          });

          // The last accepted recipient, manually entered.a
          ConversationView.recipients.add({
            name: 'Jane',
            number: 'Jane',
            source: 'manual'
          });

          ConversationView.validateContact(fixtureEmail, 'a@b.com', contacts);

          // Called from here, then called again for the
          // second contact record.
          sinon.assert.calledTwice(ConversationView.validateContact);

          sinon.assert.called(ConversationView.recipients.remove);
          sinon.assert.called(ConversationView.recipients.add);

          assert.equal(
            ConversationView.recipients.add.lastCall.args[0].source, 'contacts'
          );
          assert.equal(
            ConversationView.recipients.add.lastCall.args[0].number, 'a@c'
          );
          assert.equal(
            Utils.basicContact.returnValues[0].number, 'a@c'
          );
        });

        test('[Email]input value has matching duplicate record w/ ' +
              'single, same tel record (invalid) ', function() {

          MockSettings.supportEmailRecipient = true;
          // Make sure we have only one email
          contacts[0].email.length = 1;
          // in bug 1084184 we'll be able to filter using the fValue parameter.
          contacts[0].tel = [];

          // An actual accepted recipient from contacts
          fixtureEmail.source = 'contacts';
          ConversationView.recipients.add(fixtureEmail);

          fixtureEmail.source = 'manual';
          // The last accepted recipient, manually entered.
          ConversationView.recipients.add(fixtureEmail);

          assert.isFalse(fixtureEmail.isInvalid);

          ConversationView.recipientsList.lastElementChild.textContent = '';
          ConversationView.validateContact(fixtureEmail, 'a@b.com', contacts);

          // ConversationView.recipients.update is called with the updated
          // source recipient object. This object's isValid property
          // has been set to true.
          sinon.assert.calledOnce(
            ConversationView.recipients.update
          );
          sinon.assert.calledWithMatch(
            ConversationView.recipients.update, 1, fixtureEmail
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

    setup(function(done) {
      fakeMessage = MockMessages.sms({
        id: 24601,
        delivery: 'sending'
      });

      this.sinon.stub(Navigation, 'isCurrentPanel').
        withArgs('thread', { id: fakeMessage.threadId }).
        returns(true);

      this.sinon.spy(ConversationView, 'appendMessage');

      MessageManager.on.withArgs('message-sending').yield({
        message: fakeMessage
      });

      ConversationView.appendMessage.returnValues[0].then(() => {
        container = document.getElementById('message-' + fakeMessage.id);
      }).then(done, done);
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
          this.sinon.spy(ConversationView, 'showMessageError');
          this.sinon.stub(Settings, 'switchMmsSimHandler')
            .returns(Promise.resolve());
        });
        test('does not show dialog if error is not NonActiveSimCardError',
          function() {
          MessageManager.on.withArgs('message-failed-to-send').yield({
            message: fakeMessage
          });
          sinon.assert.notCalled(ConversationView.showMessageError);
        });
        test('Show dialog if error is NonActiveSimCardError',
          function() {
          ConversationView.showErrorInFailedEvent = 'NonActiveSimCardError';
          MessageManager.on.withArgs('message-failed-to-send').yield({
            message: fakeMessage
          });
          sinon.assert.called(ConversationView.showMessageError);
          assert.equal(ConversationView.showErrorInFailedEvent, '');
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
      ConversationView.container.innerHTML =
        '<div><h2></h2><ul><li></li><li></li></ul></div>';
    });
    teardown(function() {
      ConversationView.container.innerHTML = '';
    });
    test('removeMessageDOM removes a child', function() {
      ConversationView.removeMessageDOM(
        ConversationView.container.querySelector('li')
      );
      assert.equal(ConversationView.container.querySelectorAll('li').length, 1);
    });
    test('removeMessageDOM removes header and list container', function() {
      ConversationView.removeMessageDOM(
        ConversationView.container.querySelector('li')
      );
      ConversationView.removeMessageDOM(
        ConversationView.container.querySelector('li')
      );
      assert.equal(ConversationView.container.childElementCount, 0);
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
        subject = ConversationView.getMessageContainer(+fiveMinAgo);
      });

      test('New created block should have message-list class', function() {
        assert.isTrue(subject.classList.contains('message-list'));
      });
    });

    suite('2 recent messages, different days >', function() {
      var firstContainer, secondContainer;
      setup(function() {
        firstContainer = ConversationView.getMessageContainer(Date.now());
        // 5 minutes to be next day, would be the same container if same day
        this.sinon.clock.tick(5 * 60 * 1000);

        secondContainer = ConversationView.getMessageContainer(Date.now());
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
        firstContainer = ConversationView.getMessageContainer(Date.now());
        firstTimestamp = firstContainer.dataset.timestamp;
        this.sinon.clock.tick(15 * 60 * 1000);

        secondContainer = ConversationView.getMessageContainer(Date.now());
      });

      test('same containers', function() {
        assert.equal(secondContainer, firstContainer);
      });

      test('should have only 1 blocks', function() {
        assert.equal(
          ConversationView.container.querySelectorAll('header').length, 1
        );
        assert.equal(
          ConversationView.container.querySelectorAll('ul').length, 1
        );
      });


      test('container has a start-of-the-day timestamp', function() {
        assert.equal(firstContainer.dataset.timestamp, firstTimestamp);
      });
    });

    suite('insert one non-last-message block at the end >', function() {
      var lastYearContainer, yesterdayContainer;

      setup(function() {
        lastYearContainer = ConversationView.getMessageContainer(+lastYear);
        yesterdayContainer = ConversationView.getMessageContainer(+yesterday);
      });

      test('should have 2 blocks', function() {
        assert.equal(
          ConversationView.container.querySelectorAll('header').length, 2
        );
        assert.equal(
          ConversationView.container.querySelectorAll('ul').length, 2
        );
      });

      test('should be in the correct order', function() {
        var containers = ConversationView.container.querySelectorAll('ul');
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
        lastYearContainer = ConversationView.getMessageContainer(+lastYear);
        var twoDaysAgo = new Date(2013, 11, 29);
        twoDaysAgoContainer = ConversationView.getMessageContainer(+twoDaysAgo);
        yesterdayContainer = ConversationView.getMessageContainer(+yesterday);
      });

      test('should have 3 blocks', function() {
        assert.equal(
          ConversationView.container.querySelectorAll('header').length, 3
        );
        assert.equal(
          ConversationView.container.querySelectorAll('ul').length, 3
        );
      });

      test('should be in the correct order', function() {
        var containers = ConversationView.container.querySelectorAll('ul');
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
        yesterdayContainer = ConversationView.getMessageContainer(+yesterday);
        // Messages created today should be in the same block and last message
        // block should not exist anymore
        fiveMinContainer = ConversationView.getMessageContainer(+fiveMinAgo);
        elevenMinContainer = ConversationView.getMessageContainer(
          +elevenMinAgo
        );
        oneHourContainer = ConversationView.getMessageContainer(+oneHourAgo);
        oneHourFiveContainer = ConversationView.getMessageContainer(
          +oneHourFiveMinAgo
        );
        // this one requested at the end to check that we correctly put it at
        // the start
        lastYearContainer = ConversationView.getMessageContainer(+lastYear);
      });

      test('should have 3 blocks', function() {
        assert.equal(
          ConversationView.container.querySelectorAll('header').length, 3
        );
        assert.equal(
          ConversationView.container.querySelectorAll('ul').length, 3
        );
      });

      test('should be in the correct order', function() {
        var containers = ConversationView.container.querySelectorAll('ul');
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
        var twoMinContainer = ConversationView.getMessageContainer(+twoMinAgo);
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
          container = ConversationView.getMessageContainer(+yesterdayEarlier);
        });

        test('still 3 blocks', function() {
          assert.equal(
            ConversationView.container.querySelectorAll('header').length, 3
          );
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

    setup(function(done) {
      someDateInThePast = new Date(2010, 10, 10, 16, 0);

      ConversationView.initializeRendering();
      ConversationView.appendMessage({
        id: 1,
        threadId: 1,
        timestamp: +someDateInThePast
      }).then(done,done);
    });

    teardown(function() {
      ConversationView.container = '';
      ConversationView.stopRendering();
    });

    test('removes original message when rendered second time', function(done) {
      var originalMessage = ConversationView.container.querySelector(
        '[data-message-id="1"]'
      );

      ConversationView.appendMessage({
        id: 1,
        threadId: 1,
        timestamp: +someDateInThePast
      }).then(() => {
        var message = ConversationView.container.querySelector(
          '[data-message-id="1"]'
        );

        assert.isNotNull(originalMessage);
        assert.isNotNull(message);
        assert.notEqual(message, originalMessage);
      }).then(done,done);
    });

    test('inserts message at the beginning', function(done) {
      someDateInThePast.setHours(someDateInThePast.getHours() - 1);

      ConversationView.appendMessage({
        id: 2,
        threadId: 1,
        timestamp: +someDateInThePast
      }).then(() => {
        var messageItemNodes = ConversationView.container.querySelectorAll(
          '.message'
        );

        assert.equal(messageItemNodes.length, 2);
        assert.equal(+messageItemNodes[0].dataset.messageId, 2);
        assert.equal(+messageItemNodes[1].dataset.messageId, 1);
      }).then(done,done);
    });

    test('inserts message at the right spot in the middle', function(done) {
      someDateInThePast.setHours(someDateInThePast.getHours() + 2);
      ConversationView.appendMessage({
        id: 3,
        threadId: 1,
        timestamp: +someDateInThePast
      }).then(() => {
        someDateInThePast.setHours(someDateInThePast.getHours() - 1);
        return ConversationView.appendMessage({
          id: 2,
          threadId: 1,
          timestamp: +someDateInThePast
        }).then(() => {
          var messageItemNodes =
            ConversationView.container.querySelectorAll('.message');

          assert.equal(messageItemNodes.length, 3);
          assert.equal(+messageItemNodes[0].dataset.messageId, 1);
          assert.equal(+messageItemNodes[1].dataset.messageId, 2);
          assert.equal(+messageItemNodes[2].dataset.messageId, 3);
        });
      }).then(done,done);
    });

    test('inserts message at the end', function(done) {
      someDateInThePast.setHours(someDateInThePast.getHours() + 1);

      ConversationView.appendMessage({
        id: 2,
        threadId: 1,
        timestamp: +someDateInThePast
      }).then(() => {
        var messageItemNodes = ConversationView.container.querySelectorAll(
          '.message'
        );

        assert.equal(messageItemNodes.length, 2);
        assert.equal(+messageItemNodes[0].dataset.messageId, 1);
        assert.equal(+messageItemNodes[1].dataset.messageId, 2);
      }).then(done,done);
    });

    test('Should not insert message after stopRendering', function(done) {
      ConversationView.stopRendering();
      someDateInThePast.setHours(someDateInThePast.getHours() + 1);

      ConversationView.appendMessage({
        id: 2,
        threadId: 1,
        timestamp: +someDateInThePast
      }).then(() => {
        var messageItemNodes = ConversationView.container.querySelectorAll(
          '.message'
        );

        assert.equal(messageItemNodes.length, 1);
        assert.equal(+messageItemNodes[0].dataset.messageId, 1);
      }).then(done,done);
    });
  });

  suite('buildMessageDOM >', function() {
    setup(function() {
      this.sinon.spy(Template, 'escape');
      this.sinon.stub(MockSMIL, 'parse').returns(Promise.resolve([]));
      this.sinon.spy(ConversationView.tmpl.message, 'interpolate');
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
      ConversationView.buildMessageDOM(buildSMS(payload));
      sinon.assert.calledWith(Template.escape, payload);
    });

    test('escapes all text for MMS', function(done) {
      var payload = 'hello <a href="world">world</a>';
      MockSMIL.parse.returns(Promise.resolve([{ text: payload }]));
      ConversationView.buildMessageDOM(buildMMS(payload)).then(() => {
        sinon.assert.calledWith(Template.escape, payload);
      }).then(done, done);
    });

    test('calls template with subject for MMS', function(done) {
      var now = Date.now();
      ConversationView.buildMessageDOM({
        id: '1',
        timestamp: now,
        subject: 'subject',
        type: 'mms',
        deliveryInfo: [],
        attachments: []
      }).then(() => {
        sinon.assert.calledWithMatch(
          ConversationView.tmpl.message.interpolate,
          {
            id: '1',
            bodyHTML: '',
            timestamp: '' + now,
            subject: 'subject'
          }
        );
      }).then(done, done);
    });

    test('correctly sets the iccId in the dataset(sms)', function(done) {
      var mockedMessage = MockMessages.sms({ iccId: 'A' });
      ConversationView.buildMessageDOM(mockedMessage).then((node) =>
      {
        assert.equal(node.dataset.iccId, 'A');
        assert.isNull(
          node.querySelector('.message-sim-information'),
          'The SIM information is not displayed'
        );
      }).then(done, done);
    });

    test('correctly sets the iccId in the dataset(mms)', function(done) {
      var mockedMessage = MockMessages.mms({ iccId: 'A' });
      ConversationView.buildMessageDOM(mockedMessage).then((node) =>
      {
        assert.equal(node.dataset.iccId, 'A');
        assert.isNull(
          node.querySelector('.message-sim-information'),
          'The SIM information is not displayed'
        );
      }).then(done, done);
    });

    test('correctly shows single SIM information when present', function(done) {
      var tests = ['A', 'B'];
      var promises;
      this.sinon.stub(Settings, 'getServiceIdByIccId');
      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);

      // testing with serviceId both equal to 0 and not 0, to check we handle
      // correctly falsy correct values
      promises = tests.map((iccId) => {
        return ConversationView.buildMessageDOM(
          MockMessages.mms({ iccId: iccId })
        );
      });

      Promise.all(promises).then((nodes) => {
        nodes.forEach((node) => {
          assert.isNull(
            node.querySelector('.message-sim-information'),
            'The SIM information is not displayed'
          );
        });
      }).then(done, done);
    });

    test('correctly shows multi SIM information when present', function(done) {
      var tests = ['A', 'B'];
      var promises = [];

      this.sinon.stub(Settings, 'getServiceIdByIccId');

      tests.forEach((iccId, serviceId) => {
        Settings.getServiceIdByIccId.withArgs(iccId).returns(serviceId);
      });

      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);

      tests.forEach((iccId, serviceId) => {
        promises.push(
          ConversationView.buildMessageDOM(MockMessages.mms({ iccId: iccId }))
        );
      });

      Promise.all(promises).then((nodes) => {
        nodes.forEach((node, serviceId) => {
          var simInformationNode = node.querySelector(
            '.message-sim-information'
          );
          var simInformation = JSON.parse(simInformationNode.dataset.l10nArgs);

          assert.ok(simInformationNode, 'The SIM information is displayed');
          assert.equal(simInformation.id, serviceId + 1);
        });
      }).then(done, done);
    });

    test('add message status only when needed', function(done) {
      var receivedMessage = MockMessages.sms({ delivery: 'received'}),
          sentMessage = MockMessages.sms({
            delivery: 'sent',
            deliveryStatus: 'pending'
          }),
          deliveredMessage = MockMessages.sms({ delivery: 'sent' }),
          readMessage = MockMessages.mms({ delivery: 'sent' }),
          failedMessage = MockMessages.sms({ delivery: 'error' }),
          sendingMessage = MockMessages.sms({ delivery: 'sending' });

      ConversationView.buildMessageDOM(receivedMessage).then((node) => {
        assert.isNull(node.querySelector('.message-status'));
        return ConversationView.buildMessageDOM(sentMessage);
      }).then((node) => {
        assert.isNull(node.querySelector('.message-status'));
        return ConversationView.buildMessageDOM(deliveredMessage);
      }).then((node) => {
        assert.isNotNull(node.querySelector('.message-status'));
        assert.isTrue(node.classList.contains('delivered'));
        return ConversationView.buildMessageDOM(readMessage);
      }).then((node) => {
        assert.isNotNull(node.querySelector('.message-status'));
        assert.isTrue(node.classList.contains('read'));
        return ConversationView.buildMessageDOM(failedMessage);
      }).then((node) => {
        assert.isNotNull(node.querySelector('.message-status'));
        assert.isTrue(node.classList.contains('error'));
        return ConversationView.buildMessageDOM(sendingMessage);
      }).then((node) => {
        assert.isNotNull(node.querySelector('.message-status'));
        assert.isTrue(node.classList.contains('sending'));
      }).then(done, done);
    });

    test('sets delivery class when delivery status is success', function(done) {
      var message = MockMessages.mms({
        delivery: 'sent',
        deliveryInfo: [{
          receiver: null,
          deliveryStatus: 'success'
        }]
      });

      ConversationView.buildMessageDOM(message).then((node) => {
        assert.isTrue(node.classList.contains('delivered'));
      }).then(done, done);
    });

    test('sets read class when read status is success', function(done) {
      var message = MockMessages.mms({
        delivery: 'sent',
        deliveryInfo: [{
          receiver: null,
          readStatus: 'success'
        }]
      });

      ConversationView.buildMessageDOM(message).then((node) => {
        assert.isTrue(node.classList.contains('read'));
      }).then(done, done);
    });

    test('sets read class only when both statuses are success', function(done) {
      var message = MockMessages.mms({
        delivery: 'sent',
        deliveryInfo: [{
          receiver: null,
          deliveryStatus: 'success',
          readStatus: 'success'
        }]
      });

      ConversationView.buildMessageDOM(message).then((node) => {
        assert.isFalse(node.classList.contains('delivered'));
        assert.isTrue(node.classList.contains('read'));
      }).then(done, done);
    });
  });

  suite('renderMessages()', function() {
    setup(function() {
      setActiveThread();
      this.sinon.stub(MessageManager, 'getMessages');
      this.sinon.spy(TaskRunner.prototype, 'push');
      ConversationView.initializeRendering();
    });

    suite('nominal behavior', function() {
      setup(function() {
        ConversationView.renderMessages(1);
      });

      suite('infinite rendering test', function() {
        var chunkSize;
        var message;
        var onVisuallyLoaded;

        setup(function() {
          chunkSize = ConversationView.CHUNK_SIZE;
          onVisuallyLoaded = sinon.stub();
          ConversationView.once('visually-loaded', onVisuallyLoaded);
        });

        teardown(function() {
          ConversationView.offAll();
        });

        test('Messages are hidden before first chunk ready', function(done) {
          for (var i = 1; i < chunkSize; i++) {
            MessageManager.getMessages.yieldTo(
              'each', MockMessages.sms({ id: i })
            );
          }

          TaskRunner.prototype.push.lastCall.returnValue.then(() => {
            for (var i = 1; i < chunkSize; i++) {
              message = document.getElementById('message-' + i);
              assert.ok(
                message.classList.contains('hidden'),
                'message-' + i + ' should be hidden'
              );
            }

            sinon.assert.notCalled(onVisuallyLoaded);
          }).then(done, done);
        });

        test('First chunk ready', function(done) {
          for (var i = 1; i <= chunkSize; i++) {
            MessageManager.getMessages.yieldTo(
              'each', MockMessages.sms({ id: i })
            );
          }

          TaskRunner.prototype.push.lastCall.returnValue.then(() => {
            var id = chunkSize +1;
            assert.isNull(
              container.querySelector('li.hidden'),
              'all previously hidden messages should now be displayed'
            );

            MessageManager.getMessages.yieldTo(
              'each', MockMessages.sms({ id: id })
            );
            return TaskRunner.prototype.push.lastCall.returnValue.then(() => {
              message = document.getElementById('message-' + id);
              assert.ok(
                message.classList.contains('hidden'),
                'message-' + id + ' should be hidden'
              );

              sinon.assert.calledOnce(onVisuallyLoaded);
            });
          }).then(done, done);
        });
      });

      suite('scrolling behavior for first chunk', function() {
        setup(function(done) {
          this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
          Navigation.isCurrentPanel.withArgs('thread').returns(true);

          this.sinon.stub(HTMLElement.prototype, 'scrollIntoView');

          for (var i = 1; i < ConversationView.CHUNK_SIZE; i++) {
            MessageManager.getMessages.yieldTo(
              'each', MockMessages.sms({ id: i })
            );
          }
          TaskRunner.prototype.push.lastCall.returnValue.then(done);
        });

        test('no scrollIntoView before first chunk displayed', function() {
          sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
        });

        test('should scroll to the end', function(done) {
          MessageManager.getMessages.yieldTo(
            'each', MockMessages.sms({ id: ConversationView.CHUNK_SIZE })
          );

          TaskRunner.prototype.push.lastCall.returnValue.then(() => {
            sinon.assert.calledOnce(HTMLElement.prototype.scrollIntoView);
          }).then(done, done);
        });

        test('should not scroll to the end if in the wrong panel',
          function(done) {
          Navigation.isCurrentPanel.withArgs('thread').returns(false);

          MessageManager.getMessages.yieldTo(
            'each', MockMessages.sms({ id: ConversationView.CHUNK_SIZE })
          );

          TaskRunner.prototype.push.lastCall.returnValue.then(() => {
            sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
          }).then(done, done);
        });
      });
    });

    suite('calling stopRendering before renderMessages', function() {
      setup(function() {
        ConversationView.stopRendering();
        ConversationView.renderMessages(1);
      });

      test('getMessages should not be called', function() {
        sinon.assert.notCalled(MessageManager.getMessages);
      });
    });

    suite('calling stopRendering during renderMessages', function() {
      setup(function() {
        this.sinon.stub(ConversationView, 'appendMessage');
        ConversationView.renderMessages(1);
      });

      test('getMessages should not be called', function(done) {
        MessageManager.getMessages.yieldTo(
          'each', MockMessages.sms({ id: 1 })
        );
        sinon.assert.called(TaskRunner.prototype.push);
        ConversationView.stopRendering();

        TaskRunner.prototype.push.lastCall.returnValue.then(() => {
          sinon.assert.notCalled(ConversationView.appendMessage);
        }).then(done, done);
      });
    });
  });

  suite('more complex renderMessages behavior,', function() {
    var transitionArgs;

    setup(function() {
      setActiveThread();

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

      ConversationView.beforeEnter(transitionArgs);

      // Trigger the action button on the header
      var event = document.createEvent('HTMLEvents');
      event.initEvent('action', true, true);
      document.getElementById('messages-header').dispatchEvent(event);

      Navigation.isCurrentPanel.withArgs('thread').returns(true);
      ConversationView.afterEnter(transitionArgs);
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
      threadId: 8,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 6,
      threadId: 8,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 7,
      threadId: 8,
      timestamp: +new Date(Date.now() - 150000)
    },
    {
      id: 8,
      threadId: 8,
      timestamp: +new Date(Date.now() - 150000)
    }];

    var checkIfMessageIsInDOM = function(id) {
      return !!container.querySelector('#message-' + id);
    };

    var doMarkedMessagesDeletion = function(ids) {
      if (!Array.isArray(ids)) {
        ids = [ids];
      }

      var selectedIds = ids.map(id => '' + id);

      ConversationView.selectionHandler = null;
      ConversationView.startEdit();
      ConversationView.selectionHandler.selected = new Set(selectedIds);
      return ConversationView.delete();
    };

    setup(function(done) {
      ConversationView.initializeRendering();
      setActiveThread(8);
      container =
        ConversationView.getMessageContainer(testMessages[0].timestamp, false);
      var promises = testMessages.map((testMessage) => {
        return ConversationView.appendMessage(testMessage);
      });
      Promise.all(promises).then(() => {
        this.sinon.stub(Utils, 'confirm').returns(Promise.resolve());
      }).then(done, done);
    });

    teardown(function() {
      container.innerHTML = '';
      ConversationView.stopRendering();
    });

    test('confirm shows the proper message', function(done) {
      doMarkedMessagesDeletion(1).then(() => {
        sinon.assert.calledWith(
          Utils.confirm,
          {
            id: 'deleteMessages-confirmation-message',
            args: { n: 1 }
          },
          null,
          {
            text: 'delete',
            className: 'danger'
          }
        );
      }).then(done, done);
    });

    test('deleting a single message removes it from the DOM', function() {
      ConversationView.deleteUIMessages(testMessages[0].id);
      assert.isFalse(checkIfMessageIsInDOM(testMessages[0].id));
    });

    test('messages marked for deletion get deleted', function(done) {
      var messagesToDelete = [1, 2];
      doMarkedMessagesDeletion(messagesToDelete).then(() => {
        for (var i = 0; i < testMessages.length; i++) {
          assert.equal(checkIfMessageIsInDOM(testMessages[i].id),
                       messagesToDelete.indexOf(testMessages[i].id) == -1);
        }
      }).then(done, done);
    });

    test('deleting marked messages takes user back to view mode',
      function(done) {
      ConversationView.startEdit();
      doMarkedMessagesDeletion(1).then(() => {
        MessageManager.mTriggerOnSuccess();
        assert.isFalse(ConversationView.mainWrapper.classList.contains('edit'));
      }).then(done, done);
    });

    test('thread gets updated when a message is deleted', function(done) {
      this.sinon.stub(InboxView, 'updateThread');
      doMarkedMessagesDeletion(1).then(() => {
        MessageManager.mTriggerOnSuccess();
        sinon.assert.calledWith(
          InboxView.updateThread, undefined, { deleted: true }
        );
      }).then(done, done);
    });

    test('waiting screen shown when messages are deleted', function(done) {
      this.sinon.spy(WaitingScreen, 'show');
      doMarkedMessagesDeletion(1).then(() => {
        sinon.assert.calledOnce(WaitingScreen.show);
      }).then(done, done);
    });

    test('waiting screen hidden when messages are done deletion',
      function(done) {
      this.sinon.spy(WaitingScreen, 'hide');
      doMarkedMessagesDeletion(1).then(() => {
        MessageManager.mTriggerOnSuccess();
        sinon.assert.calledOnce(WaitingScreen.hide);
      }).then(done, done);
    });

    suite('deleting all messages', function() {
      setup(function() {
        this.sinon.stub(ConversationView, 'back');
        this.sinon.stub(ConversationView, 'close');
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
      });

      test('when not in an activity, deletes the thread and navigates back',
      function() {
        ConversationView.deleteUIMessages(testMessages.map((m) => m.id));
        sinon.assert.called(ConversationView.back);
        sinon.assert.notCalled(ConversationView.close);
      });

      test('when in an activity, deletes the thread and closes activity',
      function() {
        ActivityClient.hasPendingRequest.returns(true);

        ConversationView.deleteUIMessages(testMessages.map((m) => m.id));
        sinon.assert.notCalled(ConversationView.back);
        sinon.assert.called(ConversationView.close);
      });
    });

    test('error still calls callback', function() {
      var callbackStub = this.sinon.stub();
      ConversationView.deleteUIMessages([], callbackStub);
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
      this.sinon.stub(MessageManager, 'retrieveMMS', function() {
        return {};
      });
      ConversationView.initializeRendering();
    });

    teardown(function() {
      ConversationView.stopRendering();
    });

    suite('pending message', function() {
      var message;
      var element;
      var notDownloadedMessage;
      var button;
      setup(function(done) {
        message = getTestMessage(0);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          notDownloadedMessage = element.querySelector(
            '.not-downloaded-message'
          );
          button = element.querySelector('button');
        }).then(done, done);
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
          'tobedownloaded-attachment',
          'localization id set correctly');
        var formatter = new Intl.DateTimeFormat(navigator.languages, {
          weekday: 'long',
          month: 'short',
          day: '2-digit',
        });
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          JSON.stringify({'date': formatter.format(message.expiryDate)}),
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.deepEqual(
          JSON.parse(notDownloadedMessage.dataset.l10nDateFormat),
          {
            weekday: 'long',
            month: 'short',
            day: '2-digit',
          }
        );
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'downloading-attachment');
      });
      suite('clicking', function() {
        setup(function() {
          ConversationView.handleMessageClick({
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
      setup(function(done) {
        message = getTestMessage(1);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          notDownloadedMessage = element.querySelector(
            '.not-downloaded-message'
          );
          button = element.querySelector('button');
        }).then(done, done);
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
          'tobedownloaded-attachment',
          'localization id set correctly');
        var formatter = new Intl.DateTimeFormat(navigator.languages, {
          weekday: 'long',
          month: 'short',
          day: '2-digit',
        });
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          JSON.stringify({'date': formatter.format(message.expiryDate)}),
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.deepEqual(
          JSON.parse(notDownloadedMessage.dataset.l10nDateFormat),
          {
            weekday: 'long',
            month: 'short',
            day: '2-digit',
          }
        );
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
          showMessageErrorSpy = this.sinon.spy(
            ConversationView, 'showMessageError'
          );
          ConversationView.handleMessageClick({
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

          // Replaced with ConversationView specific error code
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
            setActiveThread();
            this.sinon.stub(Threads, 'unregisterMessage');
            MessageManager.retrieveMMS.returnValues[0].onsuccess();
          });
          // re-rendering message happens from a status handler
          test('removes message', function() {
            sinon.assert.called(Threads.unregisterMessage);
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
      setup(function(done) {
        message = getTestMessage(2);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          notDownloadedMessage = element.querySelector(
            '.not-downloaded-message'
          );
          button = element.querySelector('button');
        }).then(done, done);
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
        assert.equal(notDownloadedMessage.dataset.l10nId,
          'tobedownloaded-attachment',
          'localization id set correctly');
        var l10nFormat = {
          weekday: 'long',
          month: 'short',
          day: '2-digit',
        };
        var formatter =
          new Intl.DateTimeFormat(navigator.languages, l10nFormat);
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          JSON.stringify({'date': formatter.format(message.expiryDate)}),
          'localization arguments set correctly');
        assert.equal(
          notDownloadedMessage.dataset.l10nDateFormat,
          JSON.stringify(l10nFormat),
          'localization date format set correctly'
        );
      });
      test('date is correctly determined', function() {
        assert.deepEqual(
          JSON.parse(notDownloadedMessage.dataset.l10nDateFormat),
          {
            weekday: 'long',
            month: 'short',
            day: '2-digit',
          }
        );
      });
      test('button text is correct', function() {
        assert.equal(button.dataset.l10nId, 'download-attachment');
      });
      suite('clicking', function() {
        setup(function() {
          ConversationView.handleMessageClick({
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
            setActiveThread();
            this.sinon.stub(Threads, 'unregisterMessage');
            MessageManager.retrieveMMS.returnValues[0].onsuccess();
          });
          // re-rendering message happens from a status handler
          test('removes message', function() {
            sinon.assert.called(Threads.unregisterMessage);
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
      setup(function(done) {
        message = getTestMessage(3);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          notDownloadedMessage = element.querySelector(
            '.not-downloaded-message'
          );
          button = element.querySelector('button');
        }).then(done, done);
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
        var l10nFormat = {
          weekday: 'long',
          month: 'short',
          day: '2-digit',
        };
        var formatter =
          new Intl.DateTimeFormat(navigator.languages, l10nFormat);
        assert.equal(notDownloadedMessage.dataset.l10nArgs,
          JSON.stringify({'date': formatter.format(message.expiryDate)}),
          'localization arguments set correctly');
      });
      test('date is correctly determined', function() {
        assert.deepEqual(
          JSON.parse(notDownloadedMessage.dataset.l10nDateFormat),
          {
            weekday: 'long',
            month: 'short',
            day: '2-digit',
          }
        );
      });
      suite('clicking', function() {
        setup(function() {
          ConversationView.handleMessageClick({
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
      ConversationView.initializeRendering();
    });

    teardown(function() {
      ConversationView.stopRendering();
    });

    suite('no attachment message', function() {
      var message;
      var element;
      var noAttachmentMessage;
      setup(function(done) {
        message = getTestMessage(0);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          noAttachmentMessage = element.querySelector('p');
        }).then(done, done);
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
      setup(function(done) {
        message = getTestMessage(1);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          noAttachmentMessage = element.querySelector('p');
        }).then(done, done);
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
      setup(function(done) {
        message = getTestMessage(2);
        ConversationView.appendMessage(message).then(() => {
          element = document.getElementById('message-' + message.id);
          noAttachmentMessage = element.querySelector('p');
        }).then(done, done);
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
          ConversationView.handleMessageClick({
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
    setup(function(done) {
      var promises = [];
      setActiveThread();
      this.receivers = ['1234'];
      this.targetMsg = {
        threadId: 1,
        id: 23,
        type: 'sms',
        receivers: this.receivers,
        body: 'This is a test',
        delivery: 'error',
        timestamp: Date.now()
      };
      this.otherMsg = {
        threadId: 1,
        id: 45,
        type: 'sms',
        receivers: this.receivers,
        body: 'this test',
        delivery: 'error',
        timestamp: Date.now()
      };
      ConversationView.initializeRendering();
      promises.push(
        ConversationView.appendMessage(this.targetMsg),
        ConversationView.appendMessage(this.otherMsg)
      );

      Promise.all(promises).then(() => {
        assert.lengthOf(
          ConversationView.container.querySelectorAll('[data-message-id="23"]'),
          1
        );
        assert.lengthOf(
          ConversationView.container.querySelectorAll('[data-message-id="45"]'),
          1
        );

        this.getMessageReq = {};
        this.sinon.stub(MessageManager, 'getMessage')
          .returns(this.getMessageReq);
        this.sinon.stub(MessageManager, 'deleteMessages').callsArgWith(1, true);
        this.sinon.stub(MessageManager, 'resendMessage');
        this.sinon.spy(ConversationView, 'onMessageSendRequestCompleted');
        this.sinon.spy(ConversationView, 'showMessageSendingError');
      }).then(done, done);
    });

    teardown(function() {
      ConversationView.stopRendering();
    });
    // TODO: Implement this functionality in a specialized method and update
    // this test accordingly.
    // Bug 872725 - [MMS] Message deletion logic is duplicated
    test('removes the markup of only the specified message from the DOM',
      function() {
      ConversationView.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      assert.lengthOf(
        ConversationView.container.querySelectorAll('[data-message-id="23"]'),
        0
      );
      assert.lengthOf(
        ConversationView.container.querySelectorAll('[data-message-id="45"]'),
        1
      );
    });

    test('invokes MessageManager.resendMessage', function() {
      ConversationView.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      var args = MessageManager.resendMessage.args[0];
      assert.deepEqual(args[0].message, this.targetMsg);
    });

    test('invokes onMessageSendRequestCompleted on successful send request',
      function() {
      MessageManager.resendMessage.yieldsTo('onsuccess');

      ConversationView.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      sinon.assert.called(ConversationView.onMessageSendRequestCompleted);
    });

    test('does not invoke onMessageSendRequestCompleted on failed send request',
      function() {
      var mockError = {
        name: 'fakeError',
        data: {
          receiver: '12345'
        }
      };
      MessageManager.resendMessage.yieldsTo('onerror', mockError);

      ConversationView.resendMessage(23);

      this.getMessageReq.result = this.targetMsg;
      this.getMessageReq.onsuccess();

      sinon.assert.notCalled(ConversationView.onMessageSendRequestCompleted);
      sinon.assert.calledWith(
        ConversationView.showMessageSendingError,
        mockError.name,
        {recipients: [mockError.data.receiver]}
      );
    });
  });

  // Bug 890206 - Resending a message with delivery status
  // error on a thread with just that message, should leave
  // the thread with just one message.
  suite('Message error resent in thread with 1 message', function() {
    var message, request;
    setup(function(done) {
      setActiveThread();
      message = {
        threadId: 1,
        id: 23,
        type: 'sms',
        body: 'This is a error sms',
        delivery: 'error',
        timestamp: Date.now()
      };
      this.sinon.stub(Utils, 'confirm');
      request = {};
      this.sinon.stub(MessageManager, 'getMessage').returns(request);
      this.sinon.stub(MessageManager, 'resendMessage');

      ConversationView.initializeRendering();
      ConversationView.appendMessage(message).then(() => {
        this.errorMsg = ConversationView.container.querySelector('.error');
      }).then(done, done);
    });

    teardown(function() {
      ConversationView.stopRendering();
    });

    test('clicking on an error message bubble in a thread with 1 message ' +
      'should try to resend and remove the errored message',
      function(done) {
      var confirmPromise = Promise.resolve();
      Utils.confirm.returns(confirmPromise);
      this.errorMsg.querySelector('.message-status').click();

      sinon.assert.calledWith(Utils.confirm, 'resend-confirmation');

      confirmPromise.then(function() {
        request.result = message;
        request.onsuccess && request.onsuccess.call(request);

        assert.isNull(ConversationView.container.querySelector('li'));
        sinon.assert.calledWithMatch(
          MessageManager.resendMessage,
          {
            onerror: sinon.match.func,
            onsuccess: sinon.match.func,
            message: message
          }
        );
      }).then(done, done);
    });
  });

  // TODO: Move these tests to an integration test suite.
  // Bug 868056 - Clean up SMS test suite

  suite('Actions on the links >', function() {
    var messageId = 23, link, phone = '123123123';
    setup(function(done) {
      this.sinon.spy(LinkActionHandler, 'onClick');

      this.sinon.stub(LinkHelper, 'searchAndLinkClickableData', function() {
        return '<a data-dial="' + phone +
        '" data-action="dial-link">' + phone + '</a>';
      });

      ConversationView.initializeRendering();
      ConversationView.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test with 123123123',
        delivery: 'error',
        timestamp: Date.now()
      }).then(() => {
        // Retrieve DOM element for executing the event
        var messageDOM = document.getElementById('message-' + messageId);
        link = messageDOM.querySelector('a');
      }).then(done, done);
    });

    teardown(function() {
      ConversationView.container.innerHTML = '';
      link = null;
      ConversationView.stopRendering();
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

      ConversationView.updateCarrier(thread, contacts);
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
        ConversationView.updateCarrier(thread, contacts);
        assert.isTrue(threadMessages.classList.contains('has-carrier'));
      });

      test(' And no contacts and any phone details available', function() {
        ConversationView.updateCarrier(thread, []);

        assert.isFalse(threadMessages.classList.contains('has-carrier'));
        assert.isNull(carrierTag.querySelector('.has-phone-type'));
        assert.isNull(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' And only phone type is available', function() {
        ConversationView.updateCarrier(thread, [{
          tel: [{
            value: number,
            type: 'type'
          }]
        }]);

        assert.ok(carrierTag.querySelector('.has-phone-type'));
        assert.isNull(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' And only phone carrier is available', function() {
        ConversationView.updateCarrier(thread, [{
          tel: [{
            value: number,
            carrier: 'T-Mobile'
          }]
        }]);

        assert.isNull(carrierTag.querySelector('.has-phone-type'));
        assert.ok(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' And phone type and carrier are available', function() {
        ConversationView.updateCarrier(thread, contacts);

        assert.ok(carrierTag.querySelector('.has-phone-type'));
        assert.ok(carrierTag.querySelector('.has-phone-carrier'));
      });

      test(' If there is one participant (email) & contacts', function() {
        MockSettings.supportEmailRecipient = true;
        var thread = {
          participants: [email]
        };

        ConversationView.updateCarrier(thread, contacts, detailsEmail);
        assert.isTrue(threadMessages.classList.contains('has-carrier'));
      });

      test(' If there is one participant (email) & no contacts', function() {
        MockSettings.supportEmailRecipient = true;
        var thread = {
          participants: [email]
        };

        ConversationView.updateCarrier(thread, [], detailsEmail);
        assert.isFalse(threadMessages.classList.contains('has-carrier'));
      });
    });
  });

  suite('Long press on the bubble >', function() {
    var messageId = 23;
    var link, messageDOM, contextMenuEvent;
    setup(function(done) {
      contextMenuEvent = new CustomEvent('contextmenu', {
        'bubbles': true,
        'cancelable': true
      });

      this.sinon.spy(LinkActionHandler, 'onClick');
      this.sinon.spy(ConversationView, 'promptContact');

      this.sinon.stub(LinkHelper, 'searchAndLinkClickableData', function() {
        return '<a data-dial="123123123" data-action="dial-link">123123123</a>';
      });

      ConversationView.initializeRendering();
      ConversationView.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test with 123123123',
        delivery: 'sent',
        timestamp: Date.now()
      }).then(() => {
        // Retrieve DOM element for executing the event
        messageDOM = document.getElementById('message-' + messageId);
        link = messageDOM.querySelector('a');
      }).then(done, done);
    });

    teardown(function() {
      ConversationView.container.innerHTML = '';
      link = null;
      ConversationView.stopRendering();
    });

    test(' "click" on bubble (not in link-action) has no effect', function() {
      messageDOM.click();
      assert.ok(LinkActionHandler.onClick.calledOnce);
      // As there is no action, we are not going to show any menu
      assert.isFalse(ConversationView.promptContact.calledOnce);
    });

    test(' "long-press" on link-action is not redirected to "onClick"',
      function() {
      // Dispatch custom event for testing long press
      link.dispatchEvent(contextMenuEvent);
      assert.isFalse(LinkActionHandler.onClick.calledOnce);
    });

    test(' "long-press" on empty area return null',
      function() {
      assert.doesNotThrow(() => {
        ConversationView.handleEvent({
          type: 'contextmenu',
          target: document.getElementById('messages-container'),
          preventDefault: sinon.stub(),
          stopPropagation: sinon.stub()
        });
      });
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
      // Show menu with 'select text' option
      assert.equal(
        MockOptionMenu.calls[0].items[1].l10nId,
        'select-text'
      );
      // Show menu with 'delete' option
      assert.equal(
        MockOptionMenu.calls[0].items[2].l10nId,
        'view-message-report'
      );
      // Show menu with 'delete' option
      assert.equal(
        MockOptionMenu.calls[0].items[3].l10nId,
        'delete'
      );
    });

    test(' "long-press" on an error bubble shows a menu with resend option',
      function(done) {
        // Create a message with a delivery error
        ConversationView.appendMessage({
          id: 9,
          type: 'sms',
          body: 'This is a test with 123123123',
          delivery: 'error',
          timestamp: Date.now()
        }).then(() => {
          // Retrieve the message node
          link = document.getElementById('message-9').querySelector('a');

          // Dispatch custom event for testing long press
          link.dispatchEvent(contextMenuEvent);
          assert.ok(MockOptionMenu.calls.length, 1);

          // Confirm that the menu contained a "resend-message" option
          assert.equal(
            MockOptionMenu.calls[0].items[4].l10nId,
            'resend-message'
          );
        }).then(done, done);
    });

    test(' "long-press" on an error outgoing mms bubble shows a menu' +
      'with resend option',
      function(done) {
        // Create a message with a sending error
        ConversationView.appendMessage({
          id: 10,
          type: 'mms',
          delivery: 'error',
          deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
          attachments: [],
          subject: 'error sending'
        }).then(() => {
          // Retrieve the message node
          link = document.querySelector('#message-10 section');

          // Dispatch custom event for testing long press
          link.dispatchEvent(contextMenuEvent);
          assert.ok(MockOptionMenu.calls.length, 1);

          // Confirm that the menu contained a "resend-message" option
          assert.equal(
            MockOptionMenu.calls[0].items[4].l10nId,
            'resend-message'
          );
        }).then(done, done);
    });

    test(' "long-press" on an incoming download error mms bubble should not '+
      'show a menu with resend option',
      function(done) {
        // Create a message with a download error
        ConversationView.appendMessage({
          id: 11,
          sender: '123456',
          iccId: 'B',
          type: 'mms',
          delivery: 'not-downloaded',
          deliveryInfo: [{receiver: null, deliveryStatus: 'error'}],
          attachments: [],
          subject: 'error download',
          expiryDate: Date.now()
        }).then(() => {
          // Retrieve the message node
          link = document.querySelector('#message-11 section');

          // Dispatch custom event for testing long press
          link.dispatchEvent(contextMenuEvent);
          assert.ok(MockOptionMenu.calls.length, 1);

          // Confirm that the menu doesn't contained a "resend-message" option
          assert.isTrue(MockOptionMenu.calls[0].items.every(function(item) {
            return item.l10nId !== 'resend-message';
          }));
        }).then(done, done);
    });

    test(' "long-press" on an not downloaded message ' +
      'bubble shows a menu without forward option',
      function(done) {
        // Create a message with an undownloaded attachment:
        ConversationView.appendMessage({
          id: 12,
          type: 'mms',
          body: 'This is mms message test without attachment',
          delivery: 'received',
          subject:'',
          attachments: null,
          timestamp: Date.now()
        }).then(() => {
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
        }).then(done, done);
    });

    suite('message context menu actions >', function() {
      setup(function() {
        this.sinon.spy(ConversationView, 'navigateToComposer');

        link.dispatchEvent(contextMenuEvent);
      });

      test('correctly forwards message', function() {
        // Call forward menu item method.
        MockOptionMenu.calls[0].items[0].method(messageId);

        sinon.assert.calledWith(
          ConversationView.navigateToComposer, { messageId: messageId }
        );
      });
    });
  });

  suite('Message resending UI', function() {
    setup(function(done) {
      var promises = [];

      promises.push(ConversationView.appendMessage({
        id: 23,
        type: 'sms',
        body: 'This is a test',
        delivery: 'error',
        timestamp: Date.now()
      }), ConversationView.appendMessage({
        id: 45,
        type: 'sms',
        body: 'This is another test',
        delivery: 'sent',
        timestamp: Date.now()
      }));

      ConversationView.initializeRendering();
      Promise.all(promises).then(() => {
        this.sinon.stub(Utils, 'confirm').returns(Promise.resolve());
        this.sinon.stub(ConversationView, 'resendMessage');
        this.elems = {
          errorMsg: ConversationView.container.querySelector('.error'),
          sentMsg: ConversationView.container.querySelector('.sent')
        };
      }).then(done, done);
    });

    teardown(function() {
      ConversationView.stopRendering();
    });

    test('clicking on "message-status" aside in an error message' +
      'triggers a confirmation dialog',
      function() {
      this.elems.errorMsg.querySelector('.message-status').click();
      sinon.assert.calledOnce(Utils.confirm);
    });

    test('clicking on p element in an error message' +
      'does not triggers a confirmation  dialog',
      function() {
      this.elems.errorMsg.querySelector('.bubble p').click();
      sinon.assert.notCalled(Utils.confirm);
    });

    test('clicking on an error message does not trigger a confirmation dialog',
      function() {
      this.elems.errorMsg.click();
      sinon.assert.notCalled(Utils.confirm);
    });

    test('clicking on "message-status" aside in an error message and ' +
      'accepting the confirmation dialog triggers a message re-send operation',
    function(done) {
      var confirmPromise = Promise.resolve();
      Utils.confirm.returns(confirmPromise);
      this.elems.errorMsg.querySelector('.message-status').click();

      confirmPromise.then(function() {
        sinon.assert.calledOnce(ConversationView.resendMessage);
      }).then(done, done);
    });

    test('clicking on an error message bubble and rejecting the ' +
      'confirmation dialog does not trigger a message re-send operation',
      function(done) {
      var confirmPromise = Promise.reject();
      Utils.confirm.returns(confirmPromise);
      this.elems.errorMsg.querySelector('.bubble').click();

      confirmPromise.catch(function() {
        sinon.assert.notCalled(ConversationView.resendMessage);
      }).then(done, done);
    });

    test('clicking on a sent message does not trigger a confirmation dialog ' +
      'nor a message re-send operation', function() {
      this.elems.sentMsg.click();
      sinon.assert.notCalled(Utils.confirm);
      sinon.assert.notCalled(ConversationView.resendMessage);
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
        var output = ConversationView.createMmsContent(inputArray);

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
        var output = ConversationView.createMmsContent(inputArray);

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
        var output = ConversationView.createMmsContent(inputArray);

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
      var output = ConversationView.createMmsContent(inputArray);
      var attachmentDOM = output.childNodes[0];

      // need to get a container from ConversationView because event is
      // delegated.
      messageContainer = ConversationView.getMessageContainer(
        Date.now(), false
      );
      messageContainer.appendChild(output);
      this.sinon.stub(ConversationView, 'handleMessageClick');

      // Start the test: simulate a click event
      attachmentDOM.click();

      assert.equal(viewSpy.callCount, 1);
      assert.ok(viewSpy.calledWith, { allowSave: true });
    });

    suite('after rendering a MMS', function() {
      var inputArray = [{
        name: 'imageTest.jpg',
        blob: testImageBlob
      }];
      var message;

      setup(function() {
        this.sinon.spy(Attachment.prototype, 'render');
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        this.sinon.stub(HTMLElement.prototype, 'scrollIntoView');
        this.sinon.stub(SMIL, 'parse').returns(Promise.resolve(inputArray));

        // fake content so that there is something to scroll
        container.innerHTML = ConversationView.tmpl.message.interpolate({
          id: '1',
          bodyHTML: 'test #1'
        });
        message = MockMessages.mms();
        ConversationView.initializeRendering();
      });

      teardown(function() {
        container.innerHTML = '';
        ConversationView.stopRendering();
      });

      test('should scroll when the view is scrolled to the bottom',
        function(done) {

        ConversationView.isScrolledManually = false;
        ConversationView.appendMessage(message).then(() => {
          sinon.assert.called(HTMLElement.prototype.scrollIntoView);
        }).then(done, done);
      });

      test('should not scroll when the user scrolled up the view',
        function(done) {

        ConversationView.isScrolledManually = true;
        ConversationView.appendMessage(message).then(() => {
          sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
        }).then(done, done);
      });

      test('should not scroll if not in the right panel', function(done) {
        Navigation.isCurrentPanel.withArgs('thread').returns(false);
        ConversationView.isScrolledManually = false;
        ConversationView.appendMessage(message).then(() => {
          sinon.assert.notCalled(HTMLElement.prototype.scrollIntoView);
        }).then(done, done);
      });
    });
  });

  suite('Header Actions/Display', function() {
    setup(function() {
      MockActivityPicker.dial.mSetup();
    });

    teardown(function() {
      MockActivityPicker.dial.mTeardown();
    });

    suite('OptionMenu >', function() {
      setup(function() {
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);

        setActiveThread();
      });

      suite('one recipient >', function() {
        setup(function() {
          Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
          Navigation.isCurrentPanel.withArgs('thread').returns(true);
        });

        suite('prompt()', function() {
          test('Known recipient', function() {
            var contact = new MockContact();

            var header = document.createElement('div');

            ConversationView.prompt({
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
            ConversationView.prompt({
              number: '999',
              isContact: false
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            // Ensures that the OptionMenu was given
            // the phone number to display
            assert.equal(call.header.textContent, '999');
            assert.ok(call.header.classList.contains('unknown-contact-header'));
            assert.equal(call.header.tagName, 'BDI');

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

            ConversationView.prompt({
              email: 'a@b.com',
              isContact: false
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            // Ensures that the OptionMenu was given
            // the email address to display
            assert.equal(call.header.textContent, 'a@b.com');
            assert.ok(call.header.classList.contains('unknown-contact-header'));
            assert.equal(call.header.tagName, 'BDI');

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

          test('Unknown recipient (email and support for email recipients)',
          function() {
            MockSettings.supportEmailRecipient = true;

            this.sinon.spy(ActivityPicker, 'email');
            this.sinon.spy(ConversationView, 'navigateToComposer');

            ConversationView.prompt({
              email: 'a@b.com',
              isContact: false
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            // Ensures that the OptionMenu was given
            assert.equal(call.header.tagName, 'BDI');
            // the email address to display
            assert.equal(call.header.textContent, 'a@b.com');
            assert.ok(call.header.classList.contains('unknown-contact-header'));

            // Only known Contact details should appear in the "section"
            assert.isUndefined(call.section);

            assert.equal(items.length, 5);

            // The first item is a "sendEmail" option
            assert.equal(items[0].l10nId, 'sendEmail');

            // Trigger the option to ensure that correct Activity is used.
            items[0].method();

            sinon.assert.called(ActivityPicker.email);

            // The second item is a "sendMMSToEmail" option
            assert.equal(items[1].l10nId, 'sendMMSToEmail');
            // We shouldn't navigate to Thread panel if we're in Participants
            // panel and would like to send new MMS
            assert.equal(items[1].incomplete, true);

            // Trigger the option to ensure that correct Activity is used.
            items[1].method();

            sinon.assert.calledWith(
              ConversationView.navigateToComposer, { number: 'a@b.com' }
            );

            // The third item is a "createNewContact" option
            assert.equal(items[2].l10nId, 'createNewContact');

            // The fourth item is a "addToExistingContact" option
            assert.equal(items[3].l10nId, 'addToExistingContact');

            // The fifth and last item is a "cancel" option
            assert.equal(items[4].l10nId, 'cancel');
          });

          test('No menu displayed while activating header in activity',
          function() {
            ActivityClient.hasPendingRequest.returns(true);

            var contact = new MockContact();

            ConversationView.prompt({
              number: '999',
              contactId: contact.id,
              isContact: true,
              header: document.createElement('div')
            });

            assert.equal(MockOptionMenu.calls.length, 0);

          });

          test('No view contact option while in message and activity',
          function() {
            ActivityClient.hasPendingRequest.returns(true);

            var contact = new MockContact();

            ConversationView.prompt({
              number: '999',
              contactId: contact.id,
              isContact: true,
              inMessage: true,
              header: document.createElement('div')
            });

            assert.equal(MockOptionMenu.calls.length, 1);

            var call = MockOptionMenu.calls[0];
            var items = call.items;

            assert.equal(items.length, 3);

            // The only item is a "cancel" option
            assert.equal(items[0].l10nId, 'call');

            // The only item is a "cancel" option
            assert.equal(items[1].l10nId, 'sendMessage');

            // The only item is a "cancel" option
            assert.equal(items[2].l10nId, 'cancel');
          });
        });

        suite('onHeaderActivation >', function() {
          setup(function() {
            this.sinon.spy(Contacts, 'findByAddress');
          });

          test('Known recipient', function(done) {
            this.sinon.spy(ContactRenderer.prototype, 'render');

            setActiveThread(1, ['+12125559999']);

            headerText.dataset.isContact = true;
            headerText.dataset.number = '+12125559999';

            ConversationView.onHeaderActivation();

            Contacts.findByAddress.lastCall.returnValue.then(() => {
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
            }).then(done, done);
          });

          test('Unknown recipient', function() {
            setActiveThread(1, ['777']);

            headerText.dataset.isContact = false;
            headerText.dataset.number = '777';

            ConversationView.onHeaderActivation();

            var calls = MockOptionMenu.calls;

            assert.equal(calls.length, 1);
            assert.equal(calls[0].header.textContent, '777');
            assert.ok(
              calls[0].header.classList.contains('unknown-contact-header')
            );
            assert.equal(calls[0].header.tagName, 'BDI');
            assert.equal(calls[0].items.length, 3);
            assert.equal(typeof calls[0].complete, 'function');
          });

          test('Known recipient email', function(done) {
            MockSettings.supportEmailRecipient = true;
            this.sinon.spy(ContactRenderer.prototype, 'render');

            setActiveThread(1, ['a@b.com']);

            headerText.dataset.isContact = true;
            headerText.dataset.number = 'a@b.com';

            ConversationView.onHeaderActivation();

            Contacts.findByAddress.lastCall.returnValue.then(() => {
              var calls = MockOptionMenu.calls;

              assert.equal(calls.length, 1);

              // contacts do not show up in the body
              assert.isUndefined(calls[0].section);

              // contacts show up in the header
              sinon.assert.calledWithMatch(ContactRenderer.prototype.render, {
                target: calls[0].header
              });

              assert.equal(calls[0].items.length, 4);
              assert.equal(typeof calls[0].complete, 'function');
            }).then(done, done);
          });

          test('Unknown recipient email', function() {
            MockSettings.supportEmailRecipient = true;

            setActiveThread(1, ['a@b']);

            headerText.dataset.isContact = false;
            headerText.dataset.number = 'a@b';

            ConversationView.onHeaderActivation();

            var calls = MockOptionMenu.calls;

            assert.equal(calls.length, 1);
            assert.equal(calls[0].header.textContent, 'a@b');
            assert.ok(
              calls[0].header.classList.contains('unknown-contact-header')
            );
            assert.equal(calls[0].header.tagName, 'BDI');
            assert.equal(calls[0].items.length, 5);
            assert.equal(typeof calls[0].complete, 'function');
          });
        });
      });

      suite('multi recipients, in group view >', function() {
        setup(function() {
          this.sinon.spy(ConversationView, 'navigateToComposer');

          Navigation.isCurrentPanel.withArgs('group-view').returns(true);

          setActiveThread(1, ['999', '888']);
        });

        test('known recipient', function() {
          var header = document.createElement('div');

          ConversationView.prompt({
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
          // We shouldn't navigate to Thread panel if we're in Participants
          // panel and would like to send new SMS
          assert.equal(items[1].incomplete, true);

          items[1].method();

          sinon.assert.calledWith(
            ConversationView.navigateToComposer, { number: '999' }
          );

          // The third and last item is a "cancel" option
          assert.equal(items[2].l10nId, 'cancel');
        });

        test('Unknown recipient', function() {
          ConversationView.prompt({
            number: '999',
            isContact: false
          });

          assert.equal(MockOptionMenu.calls.length, 1);

          var call = MockOptionMenu.calls[0];
          var items = call.items;

          // Ensures that the OptionMenu was given
          // the phone number to display
          assert.equal(call.header.textContent, '999');
          assert.ok(call.header.classList.contains('unknown-contact-header'));
          assert.equal(call.header.tagName, 'BDI');

          assert.equal(items.length, 5);

          // The first item is a "call" option
          assert.equal(items[0].l10nId, 'call');

          // The second item is a "sendMessage" option
          assert.equal(items[1].l10nId, 'sendMessage');
          // We shouldn't navigate to Thread panel if we're in Participants
          // panel and would like to send new SMS
          assert.equal(items[1].incomplete, true);

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
      var fakeContactOne, fakeContactTwo;
      setup(function() {
        fakeContactOne = {
          name: ['TestName'],
          tel: [{ value: '+1111' }]
        };

        fakeContactTwo = {
          name: ['TestName#2'],
          tel: [{ value: '+2222' }]
        };

        this.sinon.spy(navigator.mozL10n, 'setAttributes');

        this.sinon.stub(Contacts, 'findByAddress');
        Contacts.findByAddress.withArgs('+1111').returns(
          Promise.resolve(fakeContactOne)
        );
        Contacts.findByAddress.withArgs('+2222').returns(
          Promise.resolve(fakeContactTwo)
        );

        this.sinon.spy(ConversationView, 'updateCarrier');
      });

      test('does not update anything if there is no active thread',
      function(done) {
        Threads.currentId = Threads.active = null;

        ConversationView.updateHeaderData().then(() => {
          sinon.assert.notCalled(Contacts.findByAddress);
          sinon.assert.notCalled(ConversationView.updateCarrier);
        }).then(done, done);
      });

      test('updates header for single-participant thread', function(done) {
        setActiveThread(1, ['+1111']);

        ConversationView.updateHeaderData().then(() => {
          assert.equal(headerText.dataset.number, '+1111');
          assert.equal(headerText.dataset.isContact, 'true');
          assert.equal(headerText.dataset.title, fakeContactOne.name[0]);
          assert.equal(
            headerText.innerHTML,
            '<bdi class="ellipsis-dir-fix">' + fakeContactOne.name[0] + '</bdi>'
          );
          assert.isFalse(headerText.hasAttribute('data-l10n-id'));

          sinon.assert.calledWith(
            ConversationView.updateCarrier, Threads.active, fakeContactOne
          );
        }).then(done, done);
      });

      test('updates header for multi-participant thread', function(done) {
        setActiveThread(1, ['+2222', '+1111', '+3333']);

        ConversationView.updateHeaderData().then(() => {
          assert.equal(headerText.dataset.number, '+2222');
          assert.equal(headerText.dataset.isContact, 'true');
          assert.equal(headerText.dataset.title, fakeContactTwo.name[0]);
          assert.equal(
            headerText.innerHTML,
            '<span class="group-header-title"><bdi class="ellipsis-dir-fix">' +
            fakeContactTwo.name[0] + '</bdi>&nbsp;<bdi dir="ltr">(+' +
            (Threads.active.participants.length - 1) + ')</bdi></span>'
          );
          assert.isFalse(headerText.hasAttribute('data-l10n-id'));

          sinon.assert.calledWith(
            ConversationView.updateCarrier, Threads.active, fakeContactTwo
          );
        }).then(done, done);
      });
    });

    suite('navigateToComposer', function() {
      setup(function() {
        this.sinon.spy(Navigation, 'toPanel');
        this.sinon.spy(ConversationView, 'discardDraft');
        this.sinon.stub(Utils, 'confirm');
        this.sinon.stub(Compose, 'isEmpty').returns(true);
        this.sinon.stub(MessageManager, 'findThreadFromNumber');
      });

      test('immediately navigates to Composer if no unsent message',
      function(done) {
        ConversationView.navigateToComposer({ test: 'test' }).then(() => {
          sinon.assert.calledWith(
            Navigation.toPanel,
            'composer',
            {
              activity: { test: 'test' },
              focusComposer: sinon.match.falsy
            }
          );
          sinon.assert.notCalled(Utils.confirm);
        }).then(done, done);
      });

      test('navigates to Composer when user discards unsent message',
      function(done) {
        Compose.isEmpty.returns(false);
        Utils.confirm.returns(Promise.resolve());

        ConversationView.navigateToComposer({ test: 'test' }).then(() => {
          sinon.assert.calledWith(
            Utils.confirm,
            'unsent-message-text',
            'unsent-message-title',
            { text: 'unsent-message-option-discard', className: 'danger' }
          );
          sinon.assert.called(ConversationView.discardDraft);
          sinon.assert.calledWith(
            Navigation.toPanel,
            'composer',
            {
              activity: { test: 'test' },
              focusComposer: sinon.match.falsy
            }
          );
        }).then(done, done);
      });

      test('navigates to Composer if can not find conversation for number',
      function(done) {
        MessageManager.findThreadFromNumber.withArgs('+123').returns(
          Promise.reject()
        );

        ConversationView.navigateToComposer({ number: '+123' }).then(() => {
          sinon.assert.calledWith(
            Navigation.toPanel,
            'composer', 
            {
              activity: { number: '+123' },
              focusComposer: true
            }
          );
        }).then(done, done);
      });

      test('navigates to Conversation if can find conversation for number',
      function(done) {
          MessageManager.findThreadFromNumber.withArgs('+123').returns(
            Promise.resolve(100)
          );

          ConversationView.navigateToComposer({ number: '+123' }).then(() => {
            sinon.assert.calledWith(
              Navigation.toPanel, 'thread', { id: 100, focusComposer: true }
            );
          }).then(done, done);
        });

      test('stays in the current panel if user wants to keep unsent message',
      function(done) {
        Compose.isEmpty.returns(false);
        Utils.confirm.returns(Promise.reject());

        ConversationView.navigateToComposer({ test: 'test' }).then(() => {
          throw new Error('navigateToComposer should be rejected!');
        }, () => {
          sinon.assert.calledWith(
            Utils.confirm,
            'unsent-message-text',
            'unsent-message-title',
            { text: 'unsent-message-option-discard', className: 'danger' }
          );
          sinon.assert.notCalled(ConversationView.discardDraft);
          sinon.assert.notCalled(Navigation.toPanel);
        }).then(done, done);
      });
    });

    // See: utils_test.js
    // Utils.getPhoneDetails
    //
    suite('Single participant', function() {

      suite('Carrier Tag', function() {
        setup(function() {
          this.sinon.stub(MockContacts, 'findByAddress').returns(
            Promise.resolve(MockContact.list())
          );

          this.sinon.stub(MockUtils, 'getPhoneDetails');

          this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
          Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);

          setActiveThread(1, ['+12125559999']);
        });

        test('Carrier Tag (non empty string)', function(done) {
          MockUtils.getPhoneDetails.returns('non empty string');

          ConversationView.updateHeaderData().then(() => {
            assert.isTrue(threadMessages.classList.contains('has-carrier'));
          }).then(done, done);
        });

        test('Carrier Tag (empty string)', function(done) {
          MockUtils.getPhoneDetails.returns('');

          ConversationView.updateHeaderData().then(() => {
            assert.isFalse(threadMessages.classList.contains('has-carrier'));
          }).then(done, done);
        });
      });
    });

    suite('Multi participant', function() {
      setup(function() {
        MockActivityPicker.dial.mSetup();

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        setActiveThread(1, ['999', '888']);
      });

      teardown(function() {
        MockActivityPicker.dial.mTeardown();
      });

      suite('Options', function() {

        test('DOES NOT Invoke Activities', function() {

          headerText.dataset.isContact = true;
          headerText.dataset.number = '999';

          ConversationView.onHeaderActivation();

          assert.equal(MockActivityPicker.dial.called, false);
          assert.equal(MockActivityPicker.dial.calledWith, null);
        });

        test('DOES NOT Invoke Options', function() {

          headerText.dataset.isContact = true;
          headerText.dataset.number = '999';

          ConversationView.onHeaderActivation();

          assert.equal(MockOptionMenu.calls.length, 0);
        });

        test('Moves to Group information View', function() {
          this.sinon.spy(Navigation, 'toPanel');

          ConversationView.onHeaderActivation();

          sinon.assert.calledWithMatch(
            Navigation.toPanel, 'group-view', { id: 1 }
          );

          Navigation.isCurrentPanel.withArgs('thread').returns(false);
          Navigation.isCurrentPanel.withArgs('group-view').returns(true);

          ConversationView.onHeaderActivation();

          // View should not go back to thread view when header is
          // activated in group-view
          sinon.assert.calledOnce(Navigation.toPanel);
        });
      });

      suite('Carrier Tag', function() {
        test('Carrier Tag (empty string)', function() {

          ConversationView.updateHeaderData();

          assert.isFalse(threadMessages.classList.contains('has-carrier'));
        });

      });
    });

    suite('setHeaderContent', function() {
      setup(function() {
        this.sinon.spy(navigator.mozL10n, 'setAttributes');
      });

      test('Correctly sets HTML string', function() {
        headerText.textContent = 'Header';
        headerText.setAttribute('data-l10n-id', 'header-id');

        ConversationView.setHeaderContent({ html: '<bdi>BiDi Header</bdi>' });

        assert.equal(headerText.innerHTML, '<bdi>BiDi Header</bdi>');
        assert.isFalse(headerText.hasAttribute('data-l10n-id'));
      });

      test('Correctly sets localizable string', function() {
        headerText.innerHTML = '<bdi>BiDi Header</bdi>';

        ConversationView.setHeaderContent('header-l10n-id');

        assert.equal(headerText.innerHTML, '');
        assert.equal(headerText.getAttribute('data-l10n-id'), 'header-l10n-id');

        // If previous header content isn't HTML then content isn't manually
        // cleared, but rather left for l10n lib to update it
        headerText.textContent = 'Header';

        ConversationView.setHeaderContent('other-header-l10n-id');

        assert.equal(headerText.innerHTML, 'Header');
        sinon.assert.calledWithExactly(
          navigator.mozL10n.setAttributes,
          headerText,
          'other-header-l10n-id',
          undefined
        );
      });

      test('Correctly sets localizable string with arguments', function() {
        headerText.innerHTML = '<bdi>BiDi Header</bdi>';

        ConversationView.setHeaderContent({
          id: 'header-l10n-id',
          args: { arg: 'header-l10n-arg' }
        });

        assert.equal(headerText.innerHTML, '');
        sinon.assert.calledWithExactly(
          navigator.mozL10n.setAttributes,
          headerText,
          'header-l10n-id',
          { arg: 'header-l10n-arg' }
        );

        // If previous header content isn't HTML then content isn't manually
        // cleared, but rather left for l10n lib to update it
        headerText.textContent = 'Header';

        ConversationView.setHeaderContent({
          id: 'other-header-l10n-id',
          args: { arg: 'other-header-l10n-arg' }
        });

        assert.equal(headerText.innerHTML, 'Header');
        sinon.assert.calledWithExactly(
          navigator.mozL10n.setAttributes,
          headerText,
          'other-header-l10n-id',
          { arg: 'other-header-l10n-arg' }
        );
      });
    });
  });

  suite('Sending Behavior (onSendClick)', function() {
    function clickButton() {
      clickButtonAndSelectSim(0);
    }

    function clickButtonAndSelectSim(serviceId) {
      ConversationView.onSendClick();
      // we get a string from the MultiSimActionButton
      ConversationView.simSelectedCallback(undefined, '' + serviceId);
    }

    setup(function() {
      this.sinon.stub(Compose, 'focus');
      this.sinon.stub(Compose, 'getContent');
      this.sinon.stub(Compose, 'isEmpty').returns(false);

      Compose.type = 'sms';

      this.sinon.stub(MessageManager, 'sendSMS');
      this.sinon.stub(MessageManager, 'sendMMS');

      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);
      this.sinon.stub(Settings, 'isDualSimDevice').returns(false);

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      this.sinon.spy(Navigation, 'toPanel');
      ConversationView.initRecipients();
    });

    test('SMS, 1 Recipient, moves to thread', function() {
      var body = 'foo';
      var recipient = '999';

      ConversationView.recipients.add({
        number: recipient
      });

      Compose.getContent.returns([body]);

      clickButton();

      sinon.assert.called(Compose.focus);
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

      ConversationView.recipients.add({
        number: recipient
      });

      Compose.getContent.returns([mockAttachment(512)]);
      Compose.type = 'mms';

      clickButton();

      sinon.assert.called(Compose.focus);
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
          ConversationView.recipients.add({
            number: recipient
          });
        });

        Compose.getContent.returns([body]);

        clickButton();

        sinon.assert.notCalled(Compose.focus);
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
        this.sinon.stub(ConversationView, 'close');
        ActivityClient.hasPendingRequest.returns(true);

        sendSmsToSeveralRecipients();
        sinon.assert.calledWith(Navigation.toPanel, 'thread-list');

        this.sinon.clock.tick(ConversationView.LEAVE_ACTIVITY_DELAY);

        sinon.assert.called(ConversationView.close);
      });
    });

    test('MMS, >1 Recipient, moves to thread', function() {
      var recipients = ['999', '888'];

      recipients.forEach(function(recipient) {
        ConversationView.recipients.add({
          number: recipient
        });
      });

      Compose.getContent.returns([mockAttachment(512)]);
      Compose.type = 'mms';

      clickButton();

      sinon.assert.called(Compose.focus);
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

        ConversationView.recipients.add({
          number: recipient
        });

        Compose.getContent.returns([mockAttachment(512)]);
        Compose.type = 'mms';

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

        ConversationView.recipients.add({
          number: recipient
        });

        Compose.getContent.returns([body]);

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
        ConversationView.recipients.add({
          number: '999'
        });

        this.sinon.spy(ConversationView, 'onMessageSendRequestCompleted');
      });

      test('called if SMS is successfully sent', function() {
        MessageManager.sendSMS.yieldsTo('oncomplete', {});

        Compose.getContent.returns(['foo']);

        clickButton();

        sinon.assert.called(ConversationView.onMessageSendRequestCompleted);
      });

      test('is not called if SMS is failed to be sent', function() {
        MessageManager.sendSMS.yieldsTo('oncomplete', {
          hasError: true,
          return: [{
            success: true
          }]
        });

        Compose.getContent.returns(['foo']);

        clickButton();

        sinon.assert.notCalled(ConversationView.onMessageSendRequestCompleted);
      });

      test('called if MMS is successfully sent', function() {
        MessageManager.sendMMS.yieldsTo('onsuccess', {});

        Compose.getContent.returns([mockAttachment(512)]);
        Compose.type = 'mms';

        clickButton();

        sinon.assert.called(ConversationView.onMessageSendRequestCompleted);
      });

      test('is not called if MMS is failed to be sent', function() {
        MessageManager.sendMMS.yieldsTo('onerror', new Error('failed'));

        Compose.getContent.returns([mockAttachment(512)]);
        Compose.type = 'mms';

        clickButton();

        sinon.assert.notCalled(ConversationView.onMessageSendRequestCompleted);
      });
    });

    test('Deletes draft if there was a draft', function() {
      this.sinon.spy(Drafts, 'delete');
      this.sinon.spy(Drafts, 'store');

      ConversationView.draft = {id: 3};
      ConversationView.recipients.add({
        number: '888'
      });

      Compose.getContent.returns(['foo']);

      clickButton();

      sinon.assert.calledOnce(Drafts.delete);
      sinon.assert.calledOnce(Drafts.store);
      sinon.assert.callOrder(Drafts.delete, Drafts.store);

      assert.isNull(ConversationView.draft);
    });

    suite('sendMMS errors', function() {
      setup(function() {
        this.sinon.spy(MockErrorDialog.prototype, 'show');

        ConversationView.recipients.add({
          number: '999'
        });
        ConversationView.showErrorInFailedEvent = '';

        Compose.getContent.returns([mockAttachment(512)]);
        Compose.type = 'mms';

        clickButton();
      });

      test('NotFoundError', function() {
        MessageManager.sendMMS.yieldTo('onerror', { name: 'NotFoundError' });
        sinon.assert.notCalled(MockErrorDialog.prototype.show);
      });

      test('NonActiveSimCardError', function() {
        MessageManager.sendMMS.yieldTo('onerror',
          { name: 'NonActiveSimCardError' });
        assert.equal(
          ConversationView.showErrorInFailedEvent, 'NonActiveSimCardError'
        );
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
      this.sinon.spy(ConversationView, 'assimilateRecipients');
      ConversationView.initRecipients();
    });
    teardown(function() {
      Recipients.View.isFocusable = true;
    });

    test('assimilate called after mousedown on picker button', function() {
      ConversationView.contactPickButton.dispatchEvent(
        new CustomEvent('mousedown')
      );
      assert.ok(ConversationView.assimilateRecipients.called);
    });

    test('Click event on picker button should not be propagate', function() {
      var event = new MouseEvent('click', { bubbles: true, cancelable: true });
      this.sinon.spy(event, 'stopPropagation');
      ConversationView.contactPickButton.dispatchEvent(event);
      sinon.assert.called(event.stopPropagation);
    });

    suite('Recipients.View.isFocusable', function() {
      test('false during activity', function() {
        ConversationView.requestContact();
        assert.isFalse(Recipients.View.isFocusable);
      });

      test('true after activity', function() {
        this.sinon.stub(Utils, 'basicContact').returns({});

        ConversationView.requestContact();

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
      ConversationView.requestContact();

      var requestedProps = MockMozActivity.calls[0].data.contactProperties;
      assert.include(requestedProps, 'tel');
      assert.include(requestedProps, 'email');
    });

    test('pick in the case of Settings.supportEmailRecipient = false',
    function() {
      MockSettings.supportEmailRecipient = false;
      ConversationView.requestContact();

      var requestedProps = MockMozActivity.calls[0].data.contactProperties;
      assert.include(requestedProps, 'tel');
    });
  });

  suite('recipient handling >', function() {
    var setL10nAttributes;

    setup(function() {
      this.sinon.spy(Compose, 'refresh');

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      // Please, auto-answering stub, don't interfere with my test
      var noopThenable = { then: () => noopThenable };
      this.sinon.stub(Contacts, 'findExact').returns(noopThenable);

      setL10nAttributes = this.sinon.spy(navigator.mozL10n, 'setAttributes');

      ConversationView.initRecipients();
    });

    function testPickButtonEnabled() {
      test('pick button is enabled', function() {
        var pickButton = ConversationView.contactPickButton;
        assert.isFalse(pickButton.classList.contains('disabled'));
      });
    }

    suite('no recipients', function() {
      setup(function() {
        ConversationView.updateComposerHeader();
      });

      test('header is correct', function() {
        sinon.assert.calledWith(setL10nAttributes, headerText, 'newMessage');
      });

      test('Compose.refresh is not called', function() {
        sinon.assert.notCalled(Compose.refresh);
      });

      testPickButtonEnabled();
    });

    suite('add one recipient', function() {
      setup(function() {
        ConversationView.recipients.add({
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

      test('Compose.refresh is called once', function() {
        sinon.assert.calledOnce(Compose.refresh);
      });

      testPickButtonEnabled();
    });

    suite('add two recipients', function() {
      setup(function() {
        ConversationView.recipients.add({
          number: '999'
        });
        ConversationView.recipients.add({
          number: '888'
        });
      });

      test('header is correct', function() {
        sinon.assert.calledTwice(setL10nAttributes);
        sinon.assert.calledWith(
          setL10nAttributes, headerText, 'recipient', {n: 2}
        );
      });

      test('Compose.refresh is called twice', function() {
        sinon.assert.calledTwice(Compose.refresh);
      });

      testPickButtonEnabled();
    });

    suite('add one questionable recipient', function() {
      setup(function() {
        ConversationView.recipients.add({
          number: 'foo',
          isQuestionable: true
        });
      });

      test('header is correct', function() {
        sinon.assert.notCalled(setL10nAttributes);
      });
    });

    suite('edit a recipient', function() {
      setup(function() {
        var placeholder = document.createElement('span');
        placeholder.setAttribute('contenteditable', 'true');
        placeholder.isPlaceholder = true;
        placeholder.textContent = '999';
        recipientsList.appendChild(placeholder);

        ConversationView.recipients.inputValue = '999';

        placeholder.dispatchEvent(new CustomEvent('input', { bubbles: true }));
      });

      test('Compose.refresh is called', function() {
        sinon.assert.calledOnce(Compose.refresh);
      });
    });
  });

  suite('saveDraft() > ', function() {
    var addSpy, arg;

    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);

      addSpy = this.sinon.spy(Drafts, 'add');

      ConversationView.initRecipients();
      ConversationView.recipients.add({
        number: '999'
      });

      this.sinon.stub(Compose, 'getContent').returns(['foo']);
    });

    suite('threadless >', function() {
      setup(function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
      });

      test('do not preserve draft for replacement', function() {
        ConversationView.saveDraft();

        assert.isNull(ConversationView.draft);
      });

      test('preserve pre-existing draft for replacement', function() {
        var draft = {id: 55};
        ConversationView.draft = draft;
        ConversationView.saveDraft(true /* preserveDraft */);

        assert.isNotNull(ConversationView.draft);
        assert.equal(ConversationView.draft, draft);
      });

      test('preserve new draft for replacement', function() {
        ConversationView.draft = null;
        ConversationView.saveDraft(true /* preserveDraft */);

        assert.isNotNull(ConversationView.draft);
        assert.deepEqual(ConversationView.draft.recipients, ['999']);
        assert.equal(ConversationView.draft.content, 'foo');
        assert.equal(ConversationView.draft.threadId, null);
      });

      test('has entered content and recipients', function() {
        ConversationView.saveDraft();
        arg = addSpy.firstCall.args[0];

        assert.deepEqual(arg.recipients, ['999']);
        assert.deepEqual(arg.content, ['foo']);
      });

      test('has entered recipients but not content', function() {
        Compose.getContent.returns([]);
        ConversationView.saveDraft();
        arg = addSpy.firstCall.args[0];

        assert.deepEqual(arg.recipients, ['999']);
        assert.deepEqual(arg.content, []);
      });

      test('has entered content but not recipients', function() {
        ConversationView.recipients.remove('999');
        ConversationView.saveDraft();
        arg = addSpy.firstCall.args[0];

        assert.deepEqual(arg.recipients, []);
        assert.deepEqual(arg.content, ['foo']);
      });

      test('correctly saves threadless draft', function() {
        ConversationView.draft = { id: 1 };
        ConversationView.saveDraft();

        sinon.assert.calledWith(Drafts.add, sinon.match({ id: 1 }));
      });
    });

    suite('within an existing thread >', function() {
       setup(function() {
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);

        setActiveThread();
       });

      test('saves draft to existing thread', function() {
        ConversationView.saveDraft();

        sinon.assert.calledWith(
          Drafts.add, sinon.match({ threadId: 1, content: ['foo'] })
        );

        Compose.getContent.returns(['foobaz']);
        ConversationView.saveDraft();

        sinon.assert.calledWith(
          Drafts.add, sinon.match({ threadId: 1, content: ['foobaz'] })
        );

        Compose.getContent.returns(['foobazfoo']);
        ConversationView.saveDraft();

        sinon.assert.calledWith(
          Drafts.add, sinon.match({ threadId: 1, content: ['foobazfoo'] })
        );
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
      ConversationView.draft = null;
    });

    setup(function() {
      this.sinon.stub(ConversationView, 'saveDraft');
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
        ConversationView.initRecipients();

        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.calledOnce(ConversationView.saveDraft);
        sinon.assert.calledWith(ConversationView.saveDraft, true);
      });

      test('new: has message, has recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        ConversationView.initRecipients();

        ConversationView.recipients.length = 1;
        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.calledOnce(ConversationView.saveDraft);
        sinon.assert.calledWith(ConversationView.saveDraft, true);
      });

      test('thread: has message', function() {
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.calledOnce(ConversationView.saveDraft);
        sinon.assert.calledWith(ConversationView.saveDraft, true);
      });
    });

    suite('Draft saved: content OR recipients exist', function() {
      test('new: has message, no recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        this.sinon.stub(Compose, 'isEmpty').returns(false);
        ConversationView.initRecipients();

        ConversationView.recipients.length = 0;
        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.calledOnce(ConversationView.saveDraft);
        sinon.assert.calledWith(ConversationView.saveDraft, true);
      });

      test('new: no message, has recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        this.sinon.stub(Compose, 'isEmpty').returns(true);
        ConversationView.initRecipients();

        ConversationView.recipients.length = 1;
        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.calledOnce(ConversationView.saveDraft);
        sinon.assert.calledWith(ConversationView.saveDraft, true);
      });
    });

    suite('Draft not saved: content or recipients do not exist', function() {
      setup(function() {
        this.sinon.stub(Compose, 'isEmpty').returns(true);
        ConversationView.initRecipients();
        ConversationView.recipients.length = 0;
      });

      test('new: no message', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.notCalled(ConversationView.saveDraft);
      });

      test('new: no message, no recipients', function() {
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        ConversationView.recipients.length = 0;
        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.notCalled(ConversationView.saveDraft);
      });

      test('thread: no message', function() {
        Navigation.isCurrentPanel.withArgs('thread').returns(true);

        ConversationView.recipients.length = 1;
        isDocumentHidden = true;

        ConversationView.onVisibilityChange();

        sinon.assert.notCalled(ConversationView.saveDraft);
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

        this.sinon.stub(Compose, 'getContent');
        this.sinon.stub(Compose, 'isEmpty');

        this.sinon.stub(ConversationView, 'isKeyboardDisplayed').returns(false);
        this.sinon.stub(ConversationView, 'stopRendering');

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('composer').returns(true);

        ConversationView.initRecipients();
        ConversationView.recipients.add({
          number: '999'
        });

        ConversationView.draft = null;
      });

      test('Displays OptionMenu prompt if recipients', function(done) {
        ConversationView.back().then(function() {
          assert.isTrue(OptionMenu.calledOnce);
          assert.isTrue(showCalled);

          var items = OptionMenu.args[0][0].items;

          // Assert the correct menu items were displayed
          assert.equal(items[0].l10nId, 'save-as-draft');
          assert.equal(items[1].l10nId, 'delete-draft');
          assert.equal(items[2].l10nId, 'cancel');
        }).then(done, done);
      });

      test('Displays OptionMenu prompt if recipients & content',
      function(done) {
        Compose.getContent.returns(['foo']);
        Compose.isEmpty.returns(false);

        ConversationView.back().then(function() {
          assert.isTrue(OptionMenu.calledOnce);
          assert.isTrue(showCalled);

          var items = OptionMenu.args[0][0].items;

          // Assert the correct menu items were displayed
          assert.equal(items[0].l10nId, 'save-as-draft');
          assert.equal(items[1].l10nId, 'delete-draft');
          assert.equal(items[2].l10nId, 'cancel');
        }).then(done, done);
      });

      test('Displays OptionMenu prompt if content', function(done) {
        ConversationView.recipients.remove('999');
        Compose.getContent.returns(['foo']);
        Compose.isEmpty.returns(false);

        ConversationView.back().then(function() {
          assert.isTrue(OptionMenu.calledOnce);
          assert.isTrue(showCalled);

          var items = OptionMenu.args[0][0].items;

          // Assert the correct menu items were displayed
          assert.equal(items[0].l10nId, 'save-as-draft');
          assert.equal(items[1].l10nId, 'delete-draft');
          assert.equal(items[2].l10nId, 'cancel');
        }).then(done, done);
      });

      suite('OptionMenu operations', function() {
        setup(function() {
          this.sinon.spy(Navigation, 'toPanel');
          this.sinon.spy(ConversationView, 'saveDraft');
          this.sinon.spy(Drafts, 'delete');
          this.sinon.spy(Drafts, 'store');
        });

        test('Save as Draft', function(done) {
          optionMenuTargetItemIndex = 0;

          ConversationView.back().then(function() {
            sinon.assert.calledOnce(ConversationView.saveDraft);
            sinon.assert.calledWith(Navigation.toPanel, 'thread-list', {
              notifyAboutSavedDraft: true
            });
          }).then(done, done);
        });

        test('Discard', function(done) {
          optionMenuTargetItemIndex = 1;
          ConversationView.draft = new Draft({id: 3});
          ConversationView.draft.isEdited = true;

          ConversationView.back().then(function() {
            sinon.assert.calledWith(Navigation.toPanel, 'thread-list');
            sinon.assert.callOrder(Drafts.delete, Drafts.store);
            assert.isNull(ConversationView.draft);
            sinon.assert.calledWith(Navigation.toPanel, 'thread-list', {
              notifyAboutSavedDraft: undefined
            });
          }).then(done, done);
        });

        test('Cancel', function(done) {
          optionMenuTargetItemIndex = 2;

          ConversationView.back().then(function() {
            throw new Error('Success callback should not have been called.');
          }, function() {
            sinon.assert.notCalled(ConversationView.saveDraft);
            sinon.assert.notCalled(Navigation.toPanel);
          }).then(done, done);
        });
      });

      suite('If existing draft', function() {

        suite('If draft edited', function() {

          setup(function() {
            ConversationView.initRecipients();
            ConversationView.recipients.add({
              number: '999'
            });

            ConversationView.draft = new Draft({
              id: 55
            });

            // Can't set this via options.
            ConversationView.draft.isEdited = true;
          });

          test('Prompts for replacement if recipients', function(done) {
            ConversationView.back().then(function() {
              assert.isTrue(OptionMenu.calledOnce);
              assert.isTrue(showCalled);

              var items = OptionMenu.args[0][0].items;

              // Assert the correct menu items were displayed
              assert.equal(items[0].l10nId, 'replace-draft');
              assert.equal(items[1].l10nId, 'delete-draft');
              assert.equal(items[2].l10nId, 'cancel');
            }).then(done, done);
          });

          test('Prompts for replacement if recipients & content',
          function(done) {
            Compose.getContent.returns(['foo']);
            Compose.isEmpty.returns(false);

            ConversationView.back().then(function() {
              assert.isTrue(OptionMenu.calledOnce);
              assert.isTrue(showCalled);

              var items = OptionMenu.args[0][0].items;

              // Assert the correct menu items were displayed
              assert.equal(items[0].l10nId, 'replace-draft');
              assert.equal(items[1].l10nId, 'delete-draft');
              assert.equal(items[2].l10nId, 'cancel');
            }).then(done, done);
          });

          test('Prompts for replacement if content', function(done) {
            ConversationView.recipients.remove('999');
            Compose.getContent.returns(['foo']);
            Compose.isEmpty.returns(false);

            ConversationView.back().then(function() {
              assert.isTrue(OptionMenu.calledOnce);
              assert.isTrue(showCalled);

              var items = OptionMenu.args[0][0].items;

              // Assert the correct menu items were displayed
              assert.equal(items[0].l10nId, 'replace-draft');
              assert.equal(items[1].l10nId, 'delete-draft');
              assert.equal(items[2].l10nId, 'cancel');
            }).then(done, done);
          });
        });

        suite('If draft not edited', function() {

          setup(function() {
            ConversationView.draft = {id: 55};
          });

          test('No prompt for replacement if recipients', function(done) {
            ConversationView.draft.isEdited = false;

            ConversationView.back().then(function() {
              assert.isNull(ConversationView.draft);
              assert.isFalse(OptionMenu.calledOnce);
              assert.isFalse(showCalled);
            }).then(done, done);
          });

          test('No prompt for replacement if recipients & content',
          function(done) {
            ConversationView.draft.isEdited = false;

            Compose.getContent.returns(['foo']);
            Compose.isEmpty.returns(false);

            ConversationView.back().then(function() {
              assert.isNull(ConversationView.draft);
              assert.isFalse(OptionMenu.calledOnce);
              assert.isFalse(showCalled);
            }).then(done, done);
          });

          test('No prompt for replacement if content', function(done) {
            ConversationView.recipients.remove('999');
            ConversationView.draft.isEdited = false;

            Compose.getContent.returns(['foo']);
            Compose.isEmpty.returns(false);

            ConversationView.back().then(function() {
              assert.isNull(ConversationView.draft);
              assert.isFalse(OptionMenu.calledOnce);
              assert.isFalse(showCalled);
            }).then(done, done);
          });
        });
      });
    });
  });

  suite('Close button behaviour', function() {
    test('Call ActivityClient.postResult', function(done) {
      this.sinon.stub(ConversationView, 'cleanFields');
      ConversationView.initRecipients();

      ConversationView.close().then(function() {
        sinon.assert.called(ConversationView.cleanFields);
        sinon.assert.calledWithExactly(ActivityClient.postResult);
      }).then(done, done);
    });
  });

  suite('New Message banner', function() {
    var notice;

    function addMessages() {
      var promises = [];
      for (var i = 0; i < 15; i++) {
        var message = MockMessages.sms({
          id: i
        });
        promises.push(ConversationView.appendMessage(message));
      }
      return Promise.all(promises);
    }

    setup(function(done) {
      this.sinon.spy(Contacts, 'findByPhoneNumber');
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      container.style.overflow = 'scroll';
      container.style.height = '50px';
      notice = document.getElementById('messages-new-message-notice');
      var testMessage = MockMessages.sms({
        id: 20
      });

      addMessages().then(() => {
        //Put the scroll on top
        container.scrollTop = 0;
        dispatchScrollEvent(container);

        MessageManager.on.withArgs('message-received').yield({
          message: testMessage
        });

        // The "new message" banner is displayed after a findByPhoneNumber call,
        // so we need to run tests after the promise resolves.
        return Contacts.findByPhoneNumber.lastCall.returnValue;
      }).then(() => done(), done);
      ConversationView.initializeRendering();
    });

    teardown(function() {
      ConversationView.stopRendering();
    });

    suite('should be shown', function() {
      test('when new message is received', function() {
        assert.isFalse(notice.classList.contains('hide'));
      });
    });

    suite('should be closed', function() {
      test('when the notice is clicked', function() {
        notice.click();
        assert.isFalse(ConversationView.isScrolledManually);
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

    suite('opens from new message', function() {
      var options;
      setup(function() {
        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
      });

      test('should show proper options', function() {
        ConversationView.showOptions();
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

        ConversationView.showOptions();
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
      var data = ConversationView.getMessageBubble(span);

      assert.equal(data.node, section);
      assert.equal(data.id, 1);
    });

    test('Finds the bubble (event target is bubble)', function() {
      var data = ConversationView.getMessageBubble(section);

      assert.equal(data.node, section);
      assert.equal(data.id, 1);
    });

    test('Does not find the bubble (event target is higher)', function() {
      var data = ConversationView.getMessageBubble(li);

      assert.equal(data, null);
    });
  });

  suite('Edit mode tests', function() {
    var mainWrapper;

    setup(function() {
      mainWrapper = document.getElementById('main-wrapper');
    });

    test('Enter edit mode', function() {
      ConversationView.startEdit();
      assert.isTrue(mainWrapper.classList.contains('edit'));
    });

    test('Exit edit mode', function() {
      ConversationView.cancelEdit();
      assert.isTrue(!mainWrapper.classList.contains('edit'));
    });

    test('Exit edit mode is idempotent', function() {
      ConversationView.startEdit();
      assert.isTrue(mainWrapper.classList.contains('edit'));
      ConversationView.cancelEdit();
      assert.isTrue(!mainWrapper.classList.contains('edit'));
      assert.isTrue(!mainWrapper.classList.contains('edit'));
    });
  });

  suite('isCurrentConversation(current threadId is 1)', function() {
    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
    });

    [1, 2].forEach((id) => {
      test('check thread panel with threadId is' + id, function() {
        Navigation.isCurrentPanel.withArgs('thread', { id: 1 }).returns(true);

        assert.equal(ConversationView.isCurrentConversation(id), id === 1);
      });

      test('check report panel with threadId is' + id, function() {
        Navigation.isCurrentPanel.withArgs(
          'report-view', { threadId: 1 }
        ).returns(true);

        assert.equal(ConversationView.isCurrentConversation(id), id === 1);
      });

      test('check group panel with threadId is' + id, function() {
        Navigation.isCurrentPanel.withArgs(
          'group-view', { id: 1 }
        ).returns(true);

        assert.equal(ConversationView.isCurrentConversation(id), id === 1);
      });
    });
  });

  suite('isConversationPanel(threadId is 1)', function() {
    test('panel description is not available', function() {
      assert.isFalse(ConversationView.isConversationPanel(1, null));
    });

    [1, 2].forEach((id) => {
      test('check thread panel with threadId is' + id, function() {
        var panel = {
          panel: 'thread',
          args: { id: 1 }
        };

        assert.equal(ConversationView.isConversationPanel(id, panel), id === 1);
      });

      test('check report panel with threadId is' + id, function() {
        var panel = {
          panel: 'report-view',
          args: { threadId: 1 }
        };

        assert.equal(ConversationView.isConversationPanel(id, panel), id === 1);
      });

      test('check group panel with threadId is' + id, function() {
        var panel = {
          panel: 'group-view',
          args: { id: 1 }
        };

        assert.equal(ConversationView.isConversationPanel(id, panel), id === 1);
      });
    });
  });

  suite('onMessageSending()', function() {
    // some more tests are in the "sending behavior" part

    setup(function() {
      this.sinon.stub(ConversationView, 'appendMessage');
      this.sinon.stub(ConversationView, 'isCurrentConversation').returns(false);

      this.sinon.spy(Navigation, 'toPanel');
    });

    test('should append message if the user is in correct thread', function() {
      // not implemented yet: https://github.com/cjohansen/Sinon.JS/issues/461
      // Navigation.isCurrentPanel.withExactArgs('thread').returns(true);
      ConversationView.isCurrentConversation.withArgs(1).returns(true);

      var message = MockMessages.sms({
        threadId: 1
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: message
      });

      sinon.assert.called(ConversationView.appendMessage);
    });

    test('should do nothing if the user is not in correct thread', function() {
      var message = MockMessages.sms({
        threadId: 2
      });

      MessageManager.on.withArgs('message-sending').yield({
        message: message
      });

      sinon.assert.notCalled(ConversationView.appendMessage);

      // should not change the panel since we didn't click the send button
      sinon.assert.notCalled(Navigation.toPanel);
    });
  });

  suite('onMessageReceived >', function() {
    setup(function() {
      this.sinon.stub(ConversationView, 'isCurrentConversation').returns(false);
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

      ConversationView.isCurrentConversation.withArgs(1).returns(true);

      MessageManager.on.withArgs('message-received').yield({
        message: message
      });

      sinon.assert.calledWith(MessageManager.markMessagesRead, [message.id]);
    });
  });

  suite('handleDraft()', function() {
    var draft;

    setup(function() {
      draft = new Draft({
        id: 1234,
        recipients: [],
        content: []
      });

      ConversationView.initRecipients();
      this.sinon.spy(Compose, 'fromDraft');
      this.sinon.stub(Compose, 'focus');
      this.sinon.stub(Drafts, 'delete').returns(Drafts);
      this.sinon.stub(Drafts, 'store').returns(Drafts);
      this.sinon.spy(ConversationView.recipients, 'add');
      this.sinon.spy(ConversationView, 'updateHeaderData');
      this.sinon.stub(Contacts, 'findByAddress');

      this.sinon.stub(Drafts, 'byDraftId').withArgs(draft.id).returns(draft);
    });

    teardown(function() {
      ConversationView.draft = null;
    });

    test('Calls Compose.fromDraft(), no recipients loaded', function() {
      ConversationView.handleDraft(draft.id);

      sinon.assert.calledOnce(Compose.fromDraft);
      sinon.assert.notCalled(ConversationView.recipients.add);
      sinon.assert.notCalled(ConversationView.updateHeaderData);
      sinon.assert.notCalled(Contacts.findByAddress);
    });

    test('with recipients', function(done) {
      draft.recipients = ['800 732 0872', '+346578888888'];

      Contacts.findByAddress.withArgs('800 732 0872').returns(
        Promise.resolve([])
      );

      Contacts.findByAddress.withArgs('+346578888888').returns(
        Promise.resolve([new MockContact()])
      );

      ConversationView.handleDraft(draft.id);

      Contacts.findByAddress.lastCall.returnValue.then(() => {
        sinon.assert.calledWith(ConversationView.recipients.add, {
          number: '800 732 0872',
          source: 'manual'
        });

        sinon.assert.calledWith(ConversationView.recipients.add, {
          carrier: 'TEF',
          name: 'Pepito O\'Hare',
          number: '+346578888888',
          source: 'contacts',
          type: 'Mobile'
        });

        sinon.assert.notCalled(ConversationView.updateHeaderData);
      }).then(done, done);
    });

    test('discards draft record', function() {
      ConversationView.handleDraft(draft.id);

      sinon.assert.callOrder(Drafts.delete, Drafts.store);
    });

    test('focus composer', function() {
      ConversationView.handleDraft(draft.id);
      sinon.assert.calledWith(Compose.fromDraft, draft);
    });
  });

  suite('handleActivity() >', function() {
    setup(function() {
      ConversationView.initRecipients();
      this.sinon.stub(Compose, 'fromDraft');
      this.sinon.stub(Compose, 'fromMessage');
      this.sinon.stub(Compose, 'focus');
      this.sinon.stub(ConversationView.recipients, 'focus');
      this.sinon.stub(Contacts, 'findByAddress');
      this.sinon.stub(MessageManager, 'getMessage');
    });

    test('with unknown contact', function(done) {
      var activity = { number: '998' };

      Contacts.findByAddress.withArgs(activity.number).returns(
        Promise.resolve([])
      );

      ConversationView.handleActivity(activity).then(() => {
        var recipients = ConversationView.recipients.list;
        assert.equal(recipients.length, 1);
        assert.equal(recipients[0].number, '998');
        assert.equal(recipients[0].source, 'manual');
        sinon.assert.calledWith(Compose.fromMessage, activity);
      }).then(done, done);
    });

    test('with known contact', function(done) {
      var activity = { number: '+346578888888' };
      var contacts = MockContact.list();

      Contacts.findByAddress.withArgs(activity.number).returns(
        Promise.resolve(contacts)
      );

      ConversationView.handleActivity(activity).then(() => {
        var recipients = ConversationView.recipients.list;
        assert.equal(recipients.length, 1);
        assert.equal(recipients[0].number, '+346578888888');
        assert.equal(recipients[0].source, 'contacts');
        sinon.assert.calledWith(Compose.fromMessage, activity);
      }).then(done, done);
    });

    test('with message body', function(done) {
      var activity = {
        number: '998',
        body: 'test'
      };

      Contacts.findByAddress.withArgs(activity.number).returns(
        Promise.resolve([])
      );

      ConversationView.handleActivity(activity).then(() => {
        sinon.assert.calledWith(Compose.fromMessage, activity);
      }).then(done, done);
    });

    test('with message id', function(done) {
      // This the case when user would like to forward existing message.
      var message = MockMessages.mms();

      MessageManager.getMessage.withArgs(message.id).returns(
        Promise.resolve(message)
      );

      ConversationView.afterEnterComposer(
        { activity: { messageId: message.id } }
      ).then(() => {
        sinon.assert.calledWith(Compose.fromMessage, message);
        sinon.assert.notCalled(Compose.focus);
        sinon.assert.called(ConversationView.recipients.focus);
      }).then(done, done);
    });

    test('No contact and no number', function(done) {
      var activity = {
        number: null,
        body: 'Youtube url'
      };

      ConversationView.handleActivity(activity).then(() => {
        assert.equal(ConversationView.recipients.numbers.length, 0);
        sinon.assert.calledWith(Compose.fromMessage, activity);
      }).then(done, done);
    });

    test('focus composer if there is at least one recipient', function(done) {
      var activity = {
        number: '998',
        body: 'test'
      };

      Contacts.findByAddress.withArgs(activity.number).returns(
        Promise.resolve([])
      );

      ConversationView.afterEnterComposer(
        { activity: activity, focusComposer: true }
      ).then(() => {
        sinon.assert.called(Compose.focus);
        sinon.assert.notCalled(ConversationView.recipients.focus);
      }).then(done, done);
    });

    test('focus recipients if there isn\'t any contact or number',
    function(done) {
      var activity = {
        number: null,
        body: 'Youtube url'
      };
      ConversationView.afterEnterComposer({ activity: activity }).then(() => {
        sinon.assert.notCalled(Compose.focus);
        sinon.assert.called(ConversationView.recipients.focus);
      }).then(done, done);
    });
  });

  suite('beforeLeave() ', function() {
    var transitionArgs = { meta: {} };

    test('to inbox, exits edit mode', function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);

      ConversationView.startEdit();
      ConversationView.beforeLeave(transitionArgs);

      assert.isFalse(mainWrapper.classList.contains('edit'));
    });

    test('to thread view, exits edit mode', function() {
      // this can happen when the user clicks a notification
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      ConversationView.startEdit();
      ConversationView.beforeLeave(transitionArgs);

      assert.isFalse(mainWrapper.classList.contains('edit'));
    });

    test('revokes all attachment thumbnail URLs', function(done) {
      this.sinon.stub(window.URL, 'revokeObjectURL');
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('thread').returns(true);

      var attachments = [{
        location: 'image',
        content: testImageBlob
      }, {
        location: 'image',
        content: testImageBlob
      }, {
        location: 'video',
        content: testVideoBlob
      }];

      ConversationView.initializeRendering();
      var promises = attachments.map((attachment, index) =>
        ConversationView.appendMessage(MockMessages.mms({
          id: index + 1,
          attachments: [attachment]
        })).then(() => {
          if (attachment.content.type.indexOf('image') >= 0) {
            var attachmentContainer = ConversationView.container.querySelector(
              '[data-message-id="' + (index + 1) + '"] .attachment-container'
            );
            attachmentContainer.dataset.thumbnail = 'blob:fake' + index;
          }
        })
      );

      Promise.all(promises).then(() => {
        ConversationView.stopRendering();
        ConversationView.beforeLeave(transitionArgs);

        sinon.assert.calledTwice(window.URL.revokeObjectURL);
        sinon.assert.calledWith(window.URL.revokeObjectURL, 'blob:fake0');
        sinon.assert.calledWith(window.URL.revokeObjectURL, 'blob:fake1');
      }).then(done, done);
    });
  });

  suite('afterLeave()', function() {
    setup(function() {
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      this.sinon.spy(Compose, 'clear');
    });

    test('properly clean the composer when moving back to thread list',
    function() {
      Navigation.isCurrentPanel.withArgs('thread-list').returns(true);
      ConversationView.initRecipients();
      ConversationView.recipients.add({
        number: '999'
      });
      threadMessages.classList.add('new');

      ConversationView.afterLeave();

      sinon.assert.calledOnce(Compose.clear);
      assert.equal(ConversationView.recipients.length, 0);
      assert.isFalse(threadMessages.classList.contains('new'));
    });

    test('properly clean the composer when moving to thread panel', function() {
      // This case only happens when user sends new message and then
      // automatically navigated to the thread panel and composer fields are
      // cleaned in the sendMessage, so afterLeave isn't supposed to clean it.
      Navigation.isCurrentPanel.withArgs('thread').returns(true);
      ConversationView.initRecipients();
      ConversationView.recipients.add({
        number: '999'
      });
      threadMessages.classList.add('new');

      ConversationView.afterLeave();

      assert.equal(ConversationView.recipients.length, 0);
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

      ConversationView.updateCarrier(thread, [contact]);
      assert.isTrue(threadMessages.classList.contains('has-carrier'));

      // Show call button
      ConversationView.callNumberButton.classList.remove('hide');

      ConversationView.afterLeave();

      assert.isFalse(threadMessages.classList.contains('has-carrier'));
      assert.isTrue(
        ConversationView.callNumberButton.classList.contains('hide')
      );
    });
  });

  function beforeEnterGeneralTests(getTransitionArgs) {
    suite('beforeEnter()', function() {
      var transitionArgs;

      setup(function() {
        transitionArgs = getTransitionArgs();
        this.sinon.spy(MockLazyLoader, 'load');
        this.sinon.spy(window, 'MultiSimActionButton');
        ConversationView.beforeEnter(transitionArgs);
      });

      test('sets "back" header action if it is not in activity', function() {
        var messagesHeader = document.getElementById('messages-header');

        assert.equal(messagesHeader.getAttribute('action'), 'back');

        ActivityClient.hasPendingRequest.returns(true);
        ConversationView.beforeEnter(transitionArgs);

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
        ConversationView.beforeEnter(transitionArgs);
        sinon.assert.calledOnce(MultiSimActionButton);
      });

      test('loads the audio played when a message is sent', function() {
        var sentAudio = ConversationView.sentAudio;

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

      test('clear convert banners', function() {
        var convertBanner = document.getElementById('messages-convert-notice');
        convertBanner.classList.remove('hide');
        ConversationView.beforeEnter(transitionArgs);
        assert.ok(
          convertBanner.classList.contains('hide'),
          'the conversion notice cleared'
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

        this.sinon.stub(Compose, 'setupLock');
      });

      beforeEnterGeneralTests(() => transitionArgs);

      suite('composer-specific tests', function() {
        setup(function() {
          ConversationView.initRecipients();
          this.sinon.spy(ConversationView, 'cleanFields');
          this.sinon.spy(ConversationView.recipients, 'focus');

          this.sinon.stub(Compose, 'getContent').returns(['some stuff']);
          this.sinon.stub(Compose, 'isEmpty').returns(false);
          this.sinon.spy(Compose, 'clear');

          ConversationView.draft = null;
          ConversationView.recipients.add({number: '456789'});

          Recipients.View.isFocusable = false;

          ConversationView.beforeEnter(transitionArgs);
        });

        test('Should set the isFocusable value to \'true\'', function() {
          assert.isTrue(Recipients.View.isFocusable);
        });

        test(' all fields cleaned', function() {
          sinon.assert.called(ConversationView.cleanFields);
        });

        test(' layout updated', function() {
          assert.ok(threadMessages.classList.contains('new'));
        });

        test('cleans up the state', function() {
          sinon.assert.calledOnce(Compose.clear);
          assert.equal(ConversationView.recipients.length, 0);
        });

        test('updates the header', function() {
          assert.equal(headerText.dataset.l10nId, 'newMessage');
        });

        suite('Setups correct Composer lock', function() {
          var composeLock;
          setup(function() {
            composeLock = Compose.setupLock.lastCall.args[0];

            ConversationView.initRecipients();
          });

          test('lock object consists of correct functions', function() {
            sinon.assert.calledOnce(Compose.setupLock);
            sinon.assert.calledWith(Compose.setupLock, {
              canSend: sinon.match.func,
              forceType: sinon.match.func
            });
          });

          test('forceType works correctly', function() {
            // Returns null if email recipients are not supported.
            Settings.supportEmailRecipient = false;
            assert.isNull(composeLock.forceType());

            // Returns null if email recipients are supported, but email
            // recipients are not entered.
            Settings.supportEmailRecipient = true;
            ConversationView.recipients.add({
              number: '888'
            });
            assert.isNull(composeLock.forceType());

            ConversationView.recipients.add({
              number: 'moz@example.com'
            });
            assert.equal(composeLock.forceType(), 'mms');
          });

          test('canSend works correctly', function() {
            // Returns false if there is no recipients found.
            assert.isFalse(composeLock.canSend());

            ConversationView.recipients.add({
              number: '888'
            });
            assert.isTrue(composeLock.canSend());

            // Returns false if currently edited number is not valid.
            ConversationView.recipients.remove('888');
            ConversationView.recipients.inputValue = 'invalid';
            assert.isFalse(composeLock.canSend());

            // Returns true if currently edited number is valid.
            ConversationView.recipients.inputValue = '+123';
            assert.isTrue(composeLock.canSend());
          });
        });
      });

      test('coming from a thread, should reset currentId', function() {
        setActiveThread();

        ConversationView.beforeEnter(transitionArgs);

        assert.isNull(Threads.currentId);
      });
    });

    suite('afterEnter()', function() {
      setup(function() {
        ConversationView.initRecipients();
        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        this.sinon.stub(ConversationView.recipients, 'focus');

        // we test these functions separately so it's fine to merely test
        // they're called
        this.sinon.stub(ConversationView, 'handleActivity');
        this.sinon.stub(ConversationView, 'handleDraft');
      });

      test('handles the activity', function() {
        transitionArgs.activity = {};
        ConversationView.afterEnter(transitionArgs);
        sinon.assert.calledWith(
          ConversationView.handleActivity, transitionArgs.activity
        );
      });

      test('recalls the draft', function() {
        transitionArgs.draftId = '1';
        ConversationView.afterEnter(transitionArgs);
        sinon.assert.calledWith(
          ConversationView.handleDraft, +transitionArgs.draftId
        );
      });

      test('focus the composer', function() {
        ConversationView.afterEnter(transitionArgs);
        sinon.assert.called(ConversationView.recipients.focus);
      });

      test('fires visually-loaded once view is ready', function() {
        var onVisuallyLoaded = sinon.stub();

        ConversationView.once('visually-loaded', onVisuallyLoaded);
        ConversationView.afterEnter(transitionArgs);

        sinon.assert.calledOnce(onVisuallyLoaded);
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

      multiParticipantTransitionArgs = {
        id: multiParticipantThreadId,
        meta: {
          next: { panel: 'thread', args: { id: multiParticipantThreadId } },
          prev: { panel: 'thread-list', args: {} }
        }
      };

      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      this.sinon.stub(InboxView, 'markReadUnread');
      this.sinon.stub(MessageManager, 'markThreadRead');
      this.sinon.stub(ConversationView, 'renderMessages');
      this.sinon.stub(Threads, 'get').returns({});
      this.sinon.stub(Compose, 'fromDraft');
      this.sinon.stub(Utils, 'closeNotificationsForThread');
      Utils.closeNotificationsForThread.returns(Promise.resolve());

      this.sinon.spy(ConversationView, 'updateHeaderData');
    });

    suite('beforeEnter()', function() {
      setup(function() {
        setActiveThread(threadId, ['999']);

        Navigation.isCurrentPanel.withArgs('thread-list').returns(true);

        this.sinon.stub(Compose, 'setupLock');
      });

      beforeEnterGeneralTests(() => transitionArgs);

      suite('beforeEnter() specific tests', function() {
        setup(function() {
          ConversationView.beforeEnter(transitionArgs);
        });

        test('calls updateHeaderData', function() {
          sinon.assert.called(ConversationView.updateHeaderData);
        });

        test('updates Threads.currentId', function() {
          assert.equal(Threads.currentId, threadId);
        });

        test('correctly shows "Call" header button', function() {
          // It's shown for single participant non-email thread
          assert.isFalse(
            ConversationView.callNumberButton.classList.contains('hide')
          );

          ConversationView.callNumberButton.classList.add('hide');
          setActiveThread(multiParticipantThreadId, ['999', '888']);
          ConversationView.beforeEnter(multiParticipantTransitionArgs);

          // Hidden for multi participant thread
          assert.isTrue(
            ConversationView.callNumberButton.classList.contains('hide')
          );

          ConversationView.callNumberButton.classList.add('hide');
          Settings.supportEmailRecipient = true;

          setActiveThread(threadId, ['nobody@mozilla.com']);

          ConversationView.beforeEnter(transitionArgs);

          // Hidden for email participant thread
          assert.isTrue(
            ConversationView.callNumberButton.classList.contains('hide')
          );
        });

        suite('conversion banner activation', function () {
          setup(function () {
            Compose.on.reset();
          });

          test('coming from composer, won\'t show banners', function() {
            transitionArgs.meta.prev.panel = 'composer';
            ConversationView.beforeEnter(transitionArgs);

            var onMessageTypeChange = ConversationView.onMessageTypeChange;
            assert.isFalse(Compose.on.calledWith('type', onMessageTypeChange));
          });

          test('coming from elsewhere, it will show banners', function() {
            ConversationView.beforeEnter(transitionArgs);

            var onMessageTypeChange = ConversationView.onMessageTypeChange;
            sinon.assert.calledWith(Compose.on, 'type', onMessageTypeChange);
          });
        });

        test('correctly setups Compose lock for non-email thread', function() {
          sinon.assert.calledOnce(Compose.setupLock);
          sinon.assert.calledWith(Compose.setupLock, {
            forceType: sinon.match.func
          });

          assert.isNull(Compose.setupLock.lastCall.args[0].forceType());
        });

        test('correctly setups Compose lock for email thread', function() {
          Settings.supportEmailRecipient = true;
          setActiveThread(threadId, ['nobody@mozilla.com']);
          ConversationView.beforeEnter(transitionArgs);

          assert.equal(Compose.setupLock.lastCall.args[0].forceType(), 'mms');
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

      test('mark thread as read when Inbox is loaded', function(done) {
        ConversationView.afterEnter(transitionArgs);

        sinon.assert.notCalled(InboxView.markReadUnread);

        App.whenReady().then(() => {
          this.sinon.clock.tick();

          sinon.assert.calledWithExactly(
            InboxView.markReadUnread, [threadId], /* isRead */ true
          );
        }).then(done, done);
      });

      test('renders messages', function() {
        ConversationView.afterEnter(transitionArgs);

        sinon.assert.calledWith(ConversationView.renderMessages, threadId);
      });

      test('closes notifications', function() {
        ConversationView.afterEnter(transitionArgs);

        sinon.assert.calledWith(Utils.closeNotificationsForThread, threadId);
      });

      test('focuses Composer only if requested', function() {
        this.sinon.spy(Compose, 'focus');

        ConversationView.afterEnter(transitionArgs);

        sinon.assert.notCalled(Compose.focus);

        ConversationView.afterEnter(
          Object.assign({ focusComposer: true }, transitionArgs)
        );

        sinon.assert.calledOnce(Compose.focus);
      });

      suite('entering from composer', function() {
        setup(function() {
          Compose.on.reset();
          transitionArgs.meta.prev.panel = 'composer';
        });

        test('will show conversion banners', function() {
          ConversationView.afterEnter(transitionArgs);

          var onMessageTypeChange = ConversationView.onMessageTypeChange;
          sinon.assert.calledWith(Compose.on, 'type', onMessageTypeChange);
        });
      });

      suite('recalls draft for this thread >', function() {
        var draft;

        setup(function() {
          // Make this call synchronous for easier test
          this.sinon.stub(Drafts, 'request').returns(
            { then: (callback) => callback() }
          );

          this.sinon.stub(Compose, 'focus');

          // ensures a clean state
          ConversationView.draft = null;

          draft = {};
          Threads.get.withArgs(threadId).returns({
            getDraft: () => draft
          });

          ConversationView.afterEnter(transitionArgs);
        });

        test('Draft rendered after clearing composer', function() {
          sinon.assert.callOrder(
            ConversationView.renderMessages, Compose.fromDraft
          );
          sinon.assert.calledWith(Compose.fromDraft, draft);
          sinon.assert.called(Compose.focus);
          assert.equal(draft, ConversationView.draft);
          assert.isFalse(ConversationView.draft.isEdited);
        });

      });
    });

    suite('enter from report view', function() {
      setup(function() {
        transitionArgs.meta.prev = {
          panel: 'report-view',
          args: { id: 1, threadId: threadId }
        };

        setActiveThread(threadId);

        Navigation.isCurrentPanel.withArgs('report-view').returns(true);
        ConversationView.beforeEnter(transitionArgs);
        Navigation.isCurrentPanel.withArgs('report-view').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
        ConversationView.afterEnter(transitionArgs);
      });

      test('does not render messages', function() {
        sinon.assert.notCalled(ConversationView.renderMessages);
      });

      test('calls InboxView.markReadUnread', function(done) {
        sinon.assert.notCalled(InboxView.markReadUnread);

        App.whenReady().then(() => {
          this.sinon.clock.tick();

          sinon.assert.calledWithExactly(
            InboxView.markReadUnread, [threadId], /* isRead */ true
          );
        }).then(done, done);
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

        setActiveThread(threadId);

        Navigation.isCurrentPanel.withArgs('group-view').returns(true);
        ConversationView.beforeEnter(transitionArgs);
        Navigation.isCurrentPanel.withArgs('group-view').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
        ConversationView.afterEnter(transitionArgs);
      });

      test('does not render messages', function() {
        sinon.assert.notCalled(ConversationView.renderMessages);
      });

      test('calls InboxView.markReadUnread', function(done) {
        sinon.assert.notCalled(InboxView.markReadUnread);

        App.whenReady().then(() => {
          this.sinon.clock.tick();

          sinon.assert.calledWithExactly(
            InboxView.markReadUnread, [threadId], /* isRead */ true
          );
        }).then(done, done);
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

        setActiveThread(threadId);

        this.sinon.stub(Compose, 'getContent').returns(['some existing text']);
        this.sinon.stub(Compose, 'isEmpty').returns(false);

        // threadMessages is in edit mode
        threadMessages.classList.add('new');

        Navigation.isCurrentPanel.withArgs('composer').returns(true);
        ConversationView.beforeLeave(transitionArgs);
        ConversationView.beforeEnter(transitionArgs);
        Navigation.isCurrentPanel.withArgs('composer').returns(false);
        Navigation.isCurrentPanel.withArgs('thread').returns(true);
        Navigation.isCurrentPanel.withArgs('thread', { id: threadId })
          .returns(true);
        ConversationView.afterLeave(transitionArgs);
        ConversationView.afterEnter(transitionArgs);
      });

      test('renders messages', function() {
        sinon.assert.calledWith(ConversationView.renderMessages, threadId);
      });

      test('calls InboxView.markReadUnread', function(done) {
        sinon.assert.notCalled(InboxView.markReadUnread);

        App.whenReady().then(() => {
          this.sinon.clock.tick();

          sinon.assert.calledWithExactly(
            InboxView.markReadUnread, [threadId], /* isRead */ true
          );
        }).then(done, done);
      });

      test('removes "new" class from messages container', function() {
        assert.isFalse(threadMessages.classList.contains('new'));
      });

      test('calls updateHeaderData', function() {
        sinon.assert.called(ConversationView.updateHeaderData);
      });

      test('updates Threads.currentId', function() {
        assert.equal(Threads.currentId, threadId);
      });
    });
  });

  suite('Compose mode tests', function() {
    suite('recipients panel mode change', function() {
      setup(function() {
        this.sinon.stub(Recipients.prototype, 'on');

        ConversationView.init();

        ConversationView.initRecipients();
      });

      test('multiline-recipients mode is turned off by default', function() {
        assert.isFalse(
          threadMessages.classList.contains('multiline-recipients-mode')
        );
      });

      test('correctly toggles multiline-recipients mode', function() {
        ConversationView.recipients.on.withArgs('modechange').yield(
          'singleline-mode'
        );
        assert.isFalse(
          threadMessages.classList.contains('multiline-recipients-mode'),
          'Single line mode event should not add multiline class'
        );

        ConversationView.recipients.on.withArgs('modechange').yield(
          'multiline-mode'
        );
        assert.isTrue(
          threadMessages.classList.contains('multiline-recipients-mode'),
          'Multi line mode event should add multiline class'
        );

        ConversationView.recipients.on.withArgs('modechange').yield(
          'singleline-mode'
        );
        assert.isFalse(
          threadMessages.classList.contains('multiline-recipients-mode'),
          'Single line mode event should remove multiline class if it is set'
        );
      });
    });
  });

  suite('onMessageSendRequestCompleted >', function() {
    setup(function() {
       this.sinon.stub(ConversationView, 'sentAudio', {
         play: sinon.stub()
       });
    });

    test('play sent audio if it is enabled', function() {
      this.sinon.stub(ConversationView, 'sentAudioEnabled', true);

      ConversationView.onMessageSendRequestCompleted();

      sinon.assert.called(ConversationView.sentAudio.play);
    });

    test('does not play sent audio if it is not enabled', function() {
      this.sinon.stub(ConversationView, 'sentAudioEnabled', false);

      ConversationView.onMessageSendRequestCompleted();

      sinon.assert.notCalled(ConversationView.sentAudio.play);
    });
  });

  suite('Bubble selection', function() {
    var messageDOM, messageId, node, threadMessagesClass, range, ctMenuEvent;

    setup(function(done) {
      threadMessagesClass = ConversationView.threadMessages.classList;
      messageId = 1;
      ctMenuEvent = new MouseEvent('contextmenu', {
        'bubbles': true,
        'cancelable': true
      });
      ConversationView.appendMessage({
        id: messageId,
        type: 'sms',
        body: 'This is a test',
        delivery: 'sent',
        timestamp: Date.now()
      }).then(() => {
        messageDOM = document.getElementById('message-' + messageId);
        node = messageDOM.querySelector('.message-content-body');
        this.sinon.spy(node, 'focus');
        this.sinon.stub(node, 'addEventListener');
        this.sinon.spy(ConversationView.container, 'addEventListener');
        this.sinon.spy(ConversationView.container, 'removeEventListener');
      }).then(done, done);
    });

    test('Enable bubble selection mode', function() {
      // Status checking for bubble select mode disabled
      assert.isTrue(threadMessagesClass.contains('editable-select-mode'));
      ConversationView.enableBubbleSelection(node);

      range = window.getSelection().rangeCount;
      sinon.assert.called(node.focus);
      // Status checking for bubble select mode enabled
      assert.isFalse(threadMessagesClass.contains('editable-select-mode'));
      assert.isTrue(range > 0);
    });

    test('Contextmenu disabled while bubble select mode enable', function() {
      // Enable bubble select mode
      ConversationView.enableBubbleSelection(node);
      // Dispatch custom event for testing long press
      messageDOM.querySelector('section').dispatchEvent(ctMenuEvent);

      assert.equal(MockOptionMenu.calls.length, 0);
    });

    test('Disable bubble selection mode', function() {
      ConversationView.enableBubbleSelection(node);
      node.addEventListener.yield('blur');

      range = window.getSelection().rangeCount;
      assert.isTrue(threadMessagesClass.contains('editable-select-mode'));
      assert.isTrue(range === 0);
      sinon.assert.calledWithMatch(
        ConversationView.container.addEventListener,
        'contextmenu',
        ConversationView
      );
      // Dispatch custom event for testing long press after mode exit
      messageDOM.querySelector('section').dispatchEvent(ctMenuEvent);

      assert.equal(MockOptionMenu.calls.length, 1);
    });
  });

  suite('Handling draft modifications', function() {
    setup(function() {
      ConversationView.draft = { isEdited: false };

      ConversationView.initRecipients();
    });

    test('Draft is marked as modified if subject is changed', function() {
      Compose.on.withArgs('subject-change').yield();

      assert.isTrue(ConversationView.draft.isEdited);
    });

    test('Draft is marked as modified if content is changed', function() {
      Compose.on.withArgs('input').yield();

      assert.isTrue(ConversationView.draft.isEdited);
    });

    test('Draft is marked as modified if recipients are changed', function() {
      ConversationView.recipients.add({ number: '999' });
      assert.isTrue(ConversationView.draft.isEdited);

      ConversationView.draft.isEdited = false;

      ConversationView.recipients.remove('999');
      assert.isTrue(ConversationView.draft.isEdited);
    });
  });
});
