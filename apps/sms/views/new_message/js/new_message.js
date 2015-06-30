/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Compose, Recipients, Utils, Template, Settings,
         SMIL, ErrorDialog, MessageManager, LinkHelper,
         ActivityPicker, InboxView, OptionMenu, Threads, Contacts,
         Attachment, WaitingScreen, MozActivity, LinkActionHandler,
         TimeHeaders, ContactRenderer, Draft, Drafts,
         MultiSimActionButton, Navigation, Promise, LazyLoader,
         App,
         SharedComponents,
         ActivityClient,
         Errors,
         EventDispatcher,
         SelectionHandler,
         TaskRunner,
         MessagingClient,
         MozMobileConnectionsClient
*/
/*exported ConversationView */

(function(exports) {
'use strict';

// reduce the Composer.getContent() into slide format used by SMIL.generate some
// day in the future, we should make the SMIL and Compose use the same format
function conv_generateSmilSlides(slides, content) {
  var length = slides.length;
  if (typeof content === 'string') {
    if (!length || slides[length - 1].text) {
      slides.push({
        text: content
      });
    } else {
      slides[length - 1].text = content;
    }
  } else {
    slides.push({
      blob: content.blob,
      name: content.name
    });
  }
  return slides;
}

var ConversationView = {
  // duration of the notification that message type was converted
  CONVERTED_MESSAGE_DURATION: 3000,
  IMAGE_RESIZE_DURATION: 3000,
  BANNER_DURATION: 2000,

  // Toast duration when you write a long text and need more than one SMS
  // to send it
  ANOTHER_SMS_TOAST_DURATION: 3000,

  // when sending an sms to several recipients in activity, we'll exit the
  // activity after this delay after moving to the thread list.
  LEAVE_ACTIVITY_DELAY: 3000,

  THROTTLE_DELAY: 300,
  THROTTLE_OPTS: {
    preventFirstCall: true,
    preventLastCall: false
  },

  draft: null,
  recipients: null,

  shouldChangePanelNextEvent: false,
  showErrorInFailedEvent: '',
  previousSegment: 0,

  /**
   * Set to true after init is run.
   */
  _isReady: false,

  timeouts: {
    update: null,
    subjectLengthNotice: null
  },

  multiSimActionButton: null,
  init: function conv_init() {
    var templateIds = [
      'recipient',
      'header'
    ];

    // Fields with 'messages' label
    [
      'container', 'to-field', 'recipients-list', 'compose-form', 'header',
      'contact-pick-button',
      'send-button', 'options-button',
      'header-text',
      'max-length-notice', 'convert-notice', 'resize-notice',
      'subject-max-length-notice', 'sms-counter-notice',
      'recipient-suggestions'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('messages-' + id);
    }, this);

    this.mainWrapper = document.getElementById('main-wrapper');
    this.threadMessages = document.querySelector('.panel-ConversationView');

    window.addEventListener('resize', this.resizeHandler.bind(this));

    // binding so that we can remove this listener later
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange',
                              this.onVisibilityChange);

    this.toField.addEventListener(
      'keypress',
      Utils.throttle(
        this.toFieldKeypress.bind(this),
        this.THROTTLE_DELAY,
        this.THROTTLE_OPTS),
      true
    );

    this.toField.addEventListener(
      'input',
      Utils.throttle(
        this.toFieldInput.bind(this),
        this.THROTTLE_DELAY,
        this.THROTTLE_OPTS),
      true
    );

    this.toField.addEventListener(
      'focus',
      Utils.throttle(
        this.toFieldInput.bind(this),
        this.THROTTLE_DELAY,
        this.THROTTLE_OPTS),
      true
    );

    this.sendButton.addEventListener(
      'click', this.onSendClick.bind(this)
    );

    this.sendButton.addEventListener(
      'contextmenu', this.onSendClick.bind(this)
    );

    this.header.addEventListener(
      'action', this.backOrClose.bind(this)
    );

    this.optionsButton.addEventListener(
      'click', this.showOptions.bind(this)
    );

    this.composeForm.addEventListener('submit', this);

    // For picking a contact from Contacts. It's mouse down for
    // avoiding weird effect of keyboard, as in 'send' button.
    this.contactPickButton.addEventListener(
      'mousedown', this.requestContact.bind(this)
    );

    // Avoid click event propagate to recipient view, otherwise Recipients.View
    // constructor will attach click event on the messages-to-field element.
    this.contactPickButton.addEventListener(
      'click', function onClick(event) {
        event.stopPropagation();
      }
    );

    this.recipientSuggestions.addEventListener(
      'click',
      this.onRecipientSuggestionClick.bind(this)
    );

    MessageManager.on('message-sending', this.onMessageSending.bind(this));
    MessageManager.on(
      'message-failed-to-send',
      this.onMessageFailed.bind(this)
    );

    this.tmpl = templateIds.reduce(function(tmpls, name) {
      tmpls[Utils.camelCase(name)] =
        Template('messages-' + name + '-tmpl');
      return tmpls;
    }, {});

    Compose.init('messages-compose-form');

    // In case of input, we have to resize the input following UX Specs.
    Compose.on('input', this.onMessageContentChange.bind(this));
    Compose.on('subject-change', this.onSubjectChange.bind(this));
    Compose.on('segmentinfochange', this.onSegmentInfoChange.bind(this));

    // Assimilations
    // -------------------------------------------------
    // If the user manually types a recipient number
    // into the recipients list and does not "accept" it
    // via <ENTER> or ";", but proceeds to either
    // the message or attachment options, attempt to
    // gather those stranded recipients and assimilate them.
    //
    // Previously, an approach using the "blur" event on
    // the Recipients' "messages-to-field" element was used,
    // however the to-field will frequently lose "focus"
    // to any of its recipient children. If we assimilate on
    // to-field blur, the result is entirely unusable:
    //
    //  1. Focus will jump from the recipient input to the
    //      message input
    //  2. 1 or 2 characters may remain in the recipient
    //      editable, which will be "assimilated"
    //  3. If a user has made it past 1 & 2, any attempts to
    //      select a contact from contact search results
    //      will also jump focus to the message input field
    //
    // So we assimilate recipients if user starts to interact with Composer
    Compose.on('interact', this.assimilateRecipients.bind(this));

    this.container.addEventListener(
      'click', this.assimilateRecipients.bind(this)
    );

    this.multiSimActionButton = null;

    this.timeouts.update = null;

    this.shouldChangePanelNextEvent = false;

    this.showErrorInFailedEvent = '';

    // Bound methods to be detachables
    this.onMessageTypeChange = this.onMessageTypeChange.bind(this);

    this._isReady = true;
  },

  isReady() {
    return this._isReady;
  },

  onVisibilityChange: function conv_onVisibilityChange() {
    // If we leave the app and are in a thread or compose window update a
    // message draft if necessary.
    var isDraftUpdateNeeded = document.hidden &&
      (Navigation.isCurrentPanel('composer') ||
      Navigation.isCurrentPanel('thread'));

    if (isDraftUpdateNeeded) {
      this.updateDraft();
    }
  },

  /**
   * We always go back to the previous pane, unless we're in an activity, then
   * in selected cases we exit the activity.
   *
   * @private
   */
  backOrClose: function conv_backOrClose() {
    var backOrClosePromise;
    if (ActivityClient.hasPendingRequest()) {
      backOrClosePromise = this.updateDraft().then(
        () => ActivityClient.postResult()
      );
    } else {
      // We're waiting for the keyboard to disappear before animating back.
      backOrClosePromise = this._ensureKeyboardIsHidden().then(
        () => Navigation.toPanel('thread-list')
      );
    }

    return backOrClosePromise.catch((e) => {
      console.error('Unexpected error while navigating back: ', e);

      return Promise.reject(e);
    });
  },

  // Initialize Recipients list and Recipients.View (DOM)
  initRecipients: function conv_initRecipients() {
    var recipientsChanged = (function recipientsChanged(length, record) {
      if (this.draft) {
        this.draft.isEdited = true;
      }
      var isOk = true;
      var strategy;

      if (record && (record.isQuestionable || record.isLookupable)) {
        if (record.isQuestionable) {
          isOk = false;
        }

        strategy = record.isLookupable ? 'searchContact' : 'exactContact';

        this[strategy](record.number).then(
          (contacts) => this.validateContact(record, record.number, contacts)
        );
      }

      // Clean search result after recipient count change.
      this.toggleRecipientSuggestions();

      // The isOk flag will prevent "questionable" recipient entries from
      //
      //    - Updating the header
      //    - Enabling send.
      //
      //  Ideally, the contact will be found by the
      //  searchContact + validateContact operation and the
      //  handler will be re-called with a known
      //  and valid recipient from the user's contacts.
      if (isOk) {
        // update composer header whenever recipients change
        this.updateComposerHeader();

        Compose.refresh();
      }
    }).bind(this);

    if (this.recipients) {
      this.recipients.length = 0;
      this.recipients.visible('singleline');
      this.recipients.focus();
    } else {
      this.recipients = new Recipients({
        outer: 'messages-to-field',
        inner: 'messages-recipients-list',
        template: this.tmpl.recipient
      });

      this.recipients.on('add', recipientsChanged);
      this.recipients.on('remove', recipientsChanged);
      this.recipients.on('modechange', function(mode) {
        this.threadMessages.classList.toggle(
          'multiline-recipients-mode',
           mode === 'multiline-mode'
        );
      }.bind(this));
    }
    this.toggleRecipientSuggestions();
  },

  hasValidRecipients() {
    if (this.recipients.numbers.length) {
      return true;
    }

    var notValidatedNumber = this.recipients.inputValue;
    return !!notValidatedNumber && isFinite(notValidatedNumber);
  },

  hasEmailRecipients() {
    if (!Settings.supportEmailRecipient) {
      return false;
    }

    /**
     * When non-contact recipient is tapped by user, Recipients component
     * removes recipient pill, fires "remove" event and only then populates
     * recipients input with the content to edit.
     *
     * In case we have only one recipient, then in "remove" handler we'll have
     * both empty recipients list and input (since input is not populated yet).
     * At the same time in Conversation view we listen for the modification of
     * recipients input. So we have two consequent events where we want to know
     * how many and what recipients we have to possibly disable send button and
     * change message type if we have email recipient. That leads to two
     * consequent message type change banners.
     *
     * To preserve original behavior and avoid double banner issue we just don't
     * try to detect email in recipients input.
     */
    return this.recipients.numbers.some(Utils.isEmailAddress);
  },

  initSentAudio: function conv_initSentAudio() {
    if (this.sentAudio) {
      return;
    }

    this.sentAudio = new Audio();
    this.sentAudio.preload = 'none';
    this.sentAudio.src = '/sounds/firefox_msg_sent.opus';
    this.sentAudio.mozAudioChannelType = 'notification';

    // TODO move sentAudioEnabled management to Settings
    this.sentAudioKey = 'message.sent-sound.enabled';
    this.sentAudioEnabled = false;

    // navigator.mozSettings may not be defined in all environments
    if (navigator.mozSettings) {
      try {
        var req = navigator.mozSettings.createLock().get(this.sentAudioKey);
        req.onsuccess = (function onsuccess() {
          this.sentAudioEnabled = req.result[this.sentAudioKey];
        }).bind(this);

        navigator.mozSettings.addObserver(this.sentAudioKey, (function(e) {
          this.sentAudioEnabled = e.settingValue;
        }).bind(this));
      } catch (e) {
        this.sentAudioEnabled = false;
      }
    }
  },

  setHeaderAction: function conv_setHeaderAction(icon) {
    this.header.setAttribute('action', icon);
  },

  onMessageContentChange() {
    // Track when content is edited for draft replacement case
    if (this.draft) {
      this.draft.isEdited = true;
    }

    if (Compose.type === 'sms') {
      this.hideMaxLengthNotice();
      return;
    }

    if (Compose.isResizing) {
      this.resizeNotice.classList.remove('hide');

      if (this._resizeNoticeTimeout) {
        clearTimeout(this._resizeNoticeTimeout);
        this._resizeNoticeTimeout = null;
      }
    } else {
      this.checkMessageSize();
      if (this.resizeNotice.classList.contains('hide') ||
          this._resizeNoticeTimeout) {
        return;
      }

      this._resizeNoticeTimeout = setTimeout(function hideResizeNotice() {
        this.resizeNotice.classList.add('hide');
        this._resizeNoticeTimeout = null;
      }.bind(this), this.IMAGE_RESIZE_DURATION);
    }
  },

  showMaxLengthNotice: function conv_showMaxLengthNotice(opts) {
    document.l10n.setAttributes(
      this.maxLengthNotice.querySelector('p'), opts.l10nId, opts.l10nArgs
    );
    this.maxLengthNotice.classList.remove('hide');
  },

  hideMaxLengthNotice: function conv_hideMaxLengthNotice() {
    this.maxLengthNotice.classList.add('hide');
  },

  showSubjectMaxLengthNotice: function conv_showSubjectMaxLengthNotice() {
    this.subjectMaxLengthNotice.classList.remove('hide');

    if (this.timeouts.subjectLengthNotice) {
      clearTimeout(this.timeouts.subjectLengthNotice);
    }
    this.timeouts.subjectLengthNotice = setTimeout(
      this.hideSubjectMaxLengthNotice.bind(this),
      this.BANNER_DURATION
    );
  },

  hideSubjectMaxLengthNotice: function conv_hideSubjectMaxLengthNotice() {
    this.subjectMaxLengthNotice.classList.add('hide');
    this.timeouts.subjectLengthNotice &&
      clearTimeout(this.timeouts.subjectLengthNotice);
  },

  /*
   * This function will be called before we slide to the thread or composer
   * panel. This way it can change things in the panel before the panel is
   * visible.
   */
  beforeEnter: function conv_beforeEnter(args) {
    this.clearConvertNoticeBanners();
    this.setHeaderAction(ActivityClient.hasPendingRequest() ? 'close' : 'back');

    // This is useful only the first time it's called. Then it's a no-op.
    this.header.removeAttribute('no-font-fit');

    if (!this.multiSimActionButton) {
      // handles the various actions on the send button and encapsulates the
      // DSDS specific behavior
      var gaiaSimPicker = document.getElementById('sim-picker');
      gaiaSimPicker.classList.remove('hide');
      this.multiSimActionButton =
        new MultiSimActionButton(
          this.sendButton,
          this.simSelectedCallback.bind(this),
          Settings.SERVICE_ID_KEYS.smsServiceId
      );

      this.initSentAudio();
    }

    var next = args.meta.next.panel;
    switch (next) {
      case 'composer':
        return this.beforeEnterComposer(args);
      default:
        console.error(
          'preEnter was called with an unexpected panel name:',
          next
        );
        return Promise.reject();
    }
  },

  afterEnter: function conv_afterEnter(args) {
    var next = args.meta.next.panel;
    switch (next) {
      case 'composer':
        return this.afterEnterComposer(args);
      default:
        console.error(
          'afterEnter was called with an unexpected panel name:',
          next
        );
        return Promise.reject();
    }
  },

  afterEnterComposer: function conv_afterEnterComposer(args) {
    // TODO Bug 1010223: should move to beforeEnter
    var draftPromise =
      args.draftId ? this.handleDraft(+args.draftId) : Promise.resolve();

    return draftPromise.then(() => {
      switch (args.focus) {
        case 'composer':
          Compose.focus();
          break;
        case 'recipients':
          this.recipients.focus();
          break;
        default:
          if (this.hasValidRecipients()) {
            Compose.focus();
          } else {
            this.recipients.focus();
          }
          break;
      }

      this.emit('visually-loaded');
    });
  },

  beforeLeave: function conv_beforeLeave(args) {
    this.disableConvertNoticeBanners();

    var nextPanel = args.meta.next;

    // This should be in afterLeave, but the edit mode interface does not seem
    // to slide correctly. Bug 1009541
    this.cancelEdit();

    if (Navigation.isCurrentPanel('thread')) {
      // If we're leaving conversation view, ensure that the thread object's
      // unreadCount value is current (set = 0).
      this.activeThread.unreadCount = 0;
    }

    this.updateDraft();

    // TODO move most of back() here: Bug 1010223
    // We don't want to clean fields, reset active conversation reference or
    // current draft if user going to report or group view in the scope of the
    // current conversation.
    if (!this.activeThread ||
        !this.isConversationPanel(this.activeThread.id, nextPanel)) {

      this.draft = null;
      this.activeThread = null;

      // Clean fields when moving out of a conversation.
      this.cleanFields();
    }
  },

  afterLeave: function conv_afterLeave(args) {
    if (Navigation.isCurrentPanel('thread-list')) {
      // We don't want to clean these things when moving from composer to
      // conversation

      this.clearContainer();
      this.cleanFields();
    }
    if (!Navigation.isCurrentPanel('composer')) {
      // Cleaning things up when moving from composer to conversation.
      this.threadMessages.classList.remove('new');

      if (this.recipients) {
        this.recipients.length = 0;
      }

      this.toggleRecipientSuggestions();
    }

    if (!Navigation.isCurrentPanel('thread')) {
      // Things we do when we move from composer to inbox.
      // When we're in a thread, we already changed these things in beforeEnter.
      this.threadMessages.classList.remove('has-carrier');
      this.callNumberButton.classList.add('hide');
    }
  },

  // recalling draft for composer only
  // Bug 1164431 might use it for thread drafts too
  handleDraft: function conv_handleDraft(draftId) {
    return Drafts.request().then(() => {
      // We'll revisit this.draft necessity in bug 1164435.
      this.draft = Drafts.byDraftId(draftId);

      if (!this.draft) {
        return;
      }

      // Render draft contents into the composer input area.
      Compose.fromDraft(this.draft);
      this.draft.isEdited = false;

      // Recipients will exist for draft messages in threads
      // Otherwise find them from draft recipient numbers
      return Promise.all(this.draft.recipients.map((number) => {
        return Contacts.findByAddress(number).then((contacts) => {
          var recipient;
          if (contacts.length) {
            recipient = Utils.basicContact(number, contacts[0]);
            recipient.source = 'contacts';
          } else {
            recipient = {
              number: number,
              source: 'manual'
            };
          }

          this.recipients.add(recipient);

          // Since recipient is added from draft, we should not consider it as
          // edit operation.
          this.draft.isEdited = false;
        });
      }));
    });
  },

  beforeEnterComposer() {
    Recipients.View.isFocusable = true;

    this.enableConvertNoticeBanners();

    // TODO add the activity/forward/draft stuff here
    // instead of in afterEnter: Bug 1010223

    this.clearContainer();
    this.cleanFields();
    this.initRecipients();
    this.updateComposerHeader();

    Compose.setupLock({
      canSend: () => this.hasValidRecipients(),
      // Null means that we want to use default type detection strategy.
      forceType: () => this.hasEmailRecipients() ? 'mms' : null
    });

    this.threadMessages.classList.add('new');

    // not strictly necessary but being consistent
    return Promise.resolve();
  },

  assimilateRecipients: function conv_assimilateRecipients() {
    var isNew = Navigation.isCurrentPanel('composer');
    var node = this.recipientsList.lastChild;
    var typed;

    if (!isNew || node === null) {
      return;
    }

    // Ensure that Recipients does not trigger focus
    // on itself, which will cause the cursor to "jump"
    // back to the recipients input from the message input.
    Recipients.View.isFocusable = false;

    // Restore the recipients list input area to
    // single line view.
    this.recipients.visible('singleline');

    do {
      if (node.isPlaceholder) {
        typed = node.textContent.trim();

        // Clicking on the compose input will trigger
        // an assimilation. If the recipient input
        // is a lone semi-colon:
        //
        //  1. Clear the contents of the editable placeholder
        //  2. Do not assimilate the value.
        //
        if (typed === ';') {
          node.textContent = '';
          break;
        }

        // If the user actually typed something,
        // assume it's a manually entered recipient.
        // Push a recipient into the recipients
        // list with the left behind entry.
        if (typed) {
          this.recipients.add({
            name: typed,
            number: typed,
            source: 'manual'
          });

          break;
        }
      }
    } while ((node = node.previousSibling));
  },

  // Function for handling when a new message (sent/received)
  // is detected
  onMessage: function onMessage(message) {
    // Update the stored thread data
    Threads.registerMessage(message);

    return this.appendMessage(message).then(
      () => TimeHeaders.updateAll('header[data-time-update]')
    );
  },

  /**
   * Checks if specified conversation id is currently active. It can be true for
   * either conversation, participants or report panels.
   * @param {number} conversationId Id of the conversation.
   * @returns {boolean}
   */
  isCurrentConversation: function conv_isCurrentConversation(conversationId) {
    return Navigation.isCurrentPanel('thread', { id: conversationId }) ||
      Navigation.isCurrentPanel('report-view', {
        threadId: conversationId
      }) ||
      Navigation.isCurrentPanel('group-view', {
        id: conversationId
      });
  },

  /**
   * Checks if specified panel corresponds to the specified conversation id. It
   * can be true for either conversation, participants or report panels.
   * @param {number} id Id of the conversation.
   * @param {Object} panel Panel description object to compare against.
   * @returns {boolean}
   */
  isConversationPanel(id, panel) {
    if (!panel) {
      return false;
    }

    id = +id;

    return panel.panel === 'thread' && +panel.args.id === id ||
      panel.panel === 'report-view' && +panel.args.threadId === id ||
      panel.panel === 'group-view' && +panel.args.id === id;
  },

  onMessageSending: function conv_onMessageSending(e) {
    if (this.shouldChangePanelNextEvent) {
      Navigation.toPanel('thread', { id: e.message.threadId });
      this.shouldChangePanelNextEvent = false;
    }
  },

  /**
   * Fires once user clicks on any recipient in the suggestions list.
   */
  onRecipientSuggestionClick: function(event) {
    event.stopPropagation();
    event.preventDefault();

    // Since the "dataset" DOMStringMap property is essentially
    // just an object of properties that exactly match the properties
    // used for recipients, push the whole dataset object into
    // the current recipients list as a new entry.
    this.recipients.add(event.target.dataset).focus();
  },

  // Message composer type changed:
  onMessageTypeChange: function conv_onMessageTypeChange() {
    var message = 'converted-to-' + Compose.type;
    var messageContainer = this.convertNotice.querySelector('p');
    messageContainer.setAttribute('data-l10n-id', message);
    this.convertNotice.classList.remove('hide');

    if (this._convertNoticeTimeout) {
      clearTimeout(this._convertNoticeTimeout);
    }

    this._convertNoticeTimeout = setTimeout(
      this.clearConvertNoticeBanners.bind(this),
      this.CONVERTED_MESSAGE_DURATION
    );
  },

  clearConvertNoticeBanners: function conv_clearConvertNoticeBanner() {
    this.convertNotice.classList.add('hide');
  },

  enableConvertNoticeBanners: function conv_enableConvertNoticeBanner() {
    Compose.on('type', this.onMessageTypeChange);
  },

  disableConvertNoticeBanners: function conv_disableConvertNoticeBanner() {
    Compose.off('type', this.onMessageTypeChange);
  },

  onSubjectChange: function conv_onSubjectChange() {
    if (this.draft) {
      this.draft.isEdited = true;
    }

    if (Compose.isSubjectVisible && Compose.isSubjectMaxLength()) {
      this.showSubjectMaxLengthNotice();
    } else {
      this.hideSubjectMaxLengthNotice();
    }
  },

  // Triggered when the onscreen keyboard appears/disappears.
  resizeHandler: function conv_resizeHandler() {
    // Make sure the caret in the "Compose" area is visible
    Compose.scrollMessageContent();
  },

  // Create a recipient from contacts activity.
  requestContact: function conv_requestContact() {
    // assimilate stranded string before picking a contact.
    this.assimilateRecipients();

    if (typeof MozActivity === 'undefined') {
      console.log('MozActivity unavailable');
      return;
    }

    // Ensure that Recipients does not trigger focus on
    // itself, which causes the keyboard to appear.
    Recipients.View.isFocusable = false;
    var contactProperties = ['tel'];

    if (Settings.supportEmailRecipient) {
      contactProperties.push('email');
    }

    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'webcontacts/select',
        contactProperties: contactProperties
      }
    });

    activity.onsuccess = (function() {
      if (!activity.result ||
          !activity.result.select ||
          !activity.result.select.length ||
          !activity.result.select[0].value) {
        console.error('The pick activity result is invalid.');
        return;
      }

      Recipients.View.isFocusable = true;

      var data = Utils.basicContact(
        activity.result.select[0].value, activity.result.contact
      );
      data.source = 'contacts';

      this.recipients.add(data);
    }).bind(this);

    activity.onerror = (function(e) {
      Recipients.View.isFocusable = true;

      console.log('WebActivities unavailable? : ' + e);
    }).bind(this);
  },

  // Method for updating the header when needed
  updateComposerHeader: function conv_updateComposerHeader() {
    var recipientCount = this.recipients.numbers.length;
    if (recipientCount > 0) {
      this.setHeaderContent({
        id: 'recipient',
        args: { n: recipientCount }
      });
    } else {
      this.setHeaderContent('newMessage');
    }
  },

  forceScrollViewToBottom: function conv_forceScrollViewToBottom() {
    this.isScrolledManually = false;
    this.scrollViewToBottom();
  },

  /**
   * Navigates user to Composer or Thread panel with custom parameters.
   * @param {Object} parameters Navigation parameters. `number` and `messageId`
   * are mutually exclusive in the current implementation.
   * @param {String} [parameters.number] Phone number or e-mail to send a
   * message to.
   * @param {Number} [parameters.messageId] Template message to resend.
   * @returns {Promise} Promise that is resolved once navigation is completed.
   * Promise is rejected if no navigation happened, especially if the user did
   * not want to discard an existing message.
   */
  initiateNewMessage: function(parameters) {
    var navigateToComposer = () => {
      var draftCreatePromise;

      if (parameters.messageId) {
        draftCreatePromise = this.storeDraftFromMessage(parameters.messageId);
      } else if (parameters.number) {
        var draft = new Draft({
          recipients: [parameters.number],
          type: Utils.isEmailAddress(parameters.number) ? 'mms' : 'sms'
        });
        draftCreatePromise = Drafts.add(draft).store().then(() => draft.id);
      } else {
        throw new TypeError('Unknown parameter');
      }

      return draftCreatePromise.then(
        (draftId) => Navigation.toPanel('composer', { draftId })
      );
    };

    var threadExistingPromise = parameters && parameters.number ?
      // A rejected promise will be returned in case we can't find thread
      // for the specified number.
      MessageManager.findThreadFromNumber(parameters.number) :
      Promise.reject();

    return threadExistingPromise.then(
      (id) => Navigation.toPanel('thread', { id: id, focus: 'composer' }),
      navigateToComposer
    );
  },

  isKeyboardDisplayed: function conv_isKeyboardDisplayed() {
    /* XXX: Detect if the keyboard is visible. The keyboard minimal height is
     * 150px; when in reduced attention screen mode however the difference
     * between window height and the screen height will be larger than 150px
     * thus correctly yielding false here. */
    return ((window.screen.height - window.innerHeight) > 150);
  },

  _ensureKeyboardIsHidden: function() {
    if (this.isKeyboardDisplayed()) {
      return new Promise(function(resolve) {
        var setTimer = window.setTimeout(resolve, 400);
        window.addEventListener('resize', function keyboardHidden() {
          window.clearTimeout(setTimer);
          window.removeEventListener('resize', keyboardHidden);
          resolve();
        });
      });
    }
    return Promise.resolve();
  },

  onSegmentInfoChange: function conv_onSegmentInfoChange() {
    var currentSegment = Compose.segmentInfo.segments;

    var isValidSegment = currentSegment > 0;
    var isSegmentChanged = this.previousSegment !== currentSegment;
    var isStartingFirstSegment = this.previousSegment === 0 &&
          currentSegment === 1;

    if (Compose.type === 'sms' && isValidSegment && isSegmentChanged &&
        !isStartingFirstSegment) {
      this.previousSegment = currentSegment;

      document.l10n.setAttributes(
        this.smsCounterNotice.querySelector('p'),
        'sms-counter-notice-label',
        { number: currentSegment }
      );
      this.smsCounterNotice.classList.remove('hide');
      window.setTimeout(function() {
        this.smsCounterNotice.classList.add('hide');
      }.bind(this), this.ANOTHER_SMS_TOAST_DURATION);
    }
  },

  checkMessageSize: function conv_checkMessageSize() {
    // Counter should be updated when image resizing complete
    if (Compose.isResizing) {
      return false;
    }

    if (Settings.mmsSizeLimitation) {
      if (Compose.size > Settings.mmsSizeLimitation) {
        this.showMaxLengthNotice({
          l10nId: 'multimedia-message-exceeded-max-length',
          l10nArgs: {
            mmsSize: (Settings.mmsSizeLimitation / 1024).toFixed(0)
          }
        });
        return false;
      } else if (Compose.size === Settings.mmsSizeLimitation) {
        this.showMaxLengthNotice({ l10nId: 'messages-max-length-text' });
        return true;
      }
    }

    this.hideMaxLengthNotice();
    return true;
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  getMessageContainer:
    function conv_getMessageContainer(messageTimestamp, hidden) {
    var startOfDayTimestamp = Utils.getDayDate(messageTimestamp);
    var messageDateGroup = document.getElementById('mc_' + startOfDayTimestamp);

    var header,
        messageContainer;

    if (messageDateGroup) {
      header = messageDateGroup.firstElementChild;
      messageContainer = messageDateGroup.lastElementChild;

      if (messageTimestamp < header.dataset.time) {
        header.dataset.time = messageTimestamp;
      }
      return messageContainer;
    }

    // If there is no messageContainer we have to create it
    messageDateGroup = this.tmpl.dateGroup.prepare({
      id: 'mc_' + startOfDayTimestamp,
      timestamp: startOfDayTimestamp.toString(),
      headerTimeUpdate: 'repeat',
      headerTime: messageTimestamp.toString(),
      headerDateOnly: 'true'
    }).toDocumentFragment().firstElementChild;

    header = messageDateGroup.firstElementChild;
    messageContainer = messageDateGroup.lastElementChild;

    if (hidden) {
      header.classList.add('hidden');
    } else {
      TimeHeaders.update(header);
    }

    this._insertTimestampedNodeToContainer(messageDateGroup, this.container);

    return messageContainer;
  },

  /**
   * Updates header content since it's used for different panels and should be
   * carefully handled for every case. In Thread panel header contains HTML
   * markup to support bidirectional content, but other panels still use it
   * with document.l10n.setAttributes as it would contain only localizable
   * text. We should get rid of this method once bug 961572 and bug 1011085 are
   * landed.
   * @param {string|{ html: string }|{id: string, args: Object }} contentL10n
   * Should be either safe HTML string or l10n properties.
   * @public
   */
  setHeaderContent: function conv_setHeaderContent(contentL10n) {
    if (typeof contentL10n === 'string') {
      contentL10n = { id: contentL10n };
    }

    if (contentL10n.id) {
      // Remove rich HTML content before we set l10n attributes as l10n lib
      // fails in this case
      this.headerText.firstElementChild && (this.headerText.textContent = '');
      document.l10n.setAttributes(
        this.headerText, contentL10n.id, contentL10n.args
      );
      return;
    }

    if (contentL10n.html) {
      this.headerText.removeAttribute('data-l10n-id');
      this.headerText.innerHTML = contentL10n.html;
      return;
    }
  },

  clearContainer() {
    // Clean list of messages
    this.container.textContent = '';
  },

  showOptions: function conv_showOptions() {
    /**
      * Different situations depending on the state
      * - 'Add Subject' if there's none, 'Delete subject' if already added
      * - 'Delete messages' for existing conversations
      */
    var params = {
      header: { l10nId: 'message' },
      items: []
    };

    // Subject management
    var subjectItem;
    if (Compose.isSubjectVisible) {
      subjectItem = {
        l10nId: 'remove-subject',
        method: Compose.hideSubject
      };
    } else {
      subjectItem = {
        l10nId: 'add-subject',
        method: Compose.showSubject
      };
    }
    params.items.push(subjectItem);

    // If we are on a thread, we can call to SelectMessages
    if (Navigation.isCurrentPanel('thread')) {
      params.items.push({
        l10nId: 'selectMessages-label',
        method: this.startEdit.bind(this)
      });
    }

    // Last item is the Cancel button
    params.items.push({
      l10nId: 'cancel',
      incomplete: true
    });

    new OptionMenu(params).show();
  },

  handleEvent: function conv_handleEvent(evt) {
    switch (evt.type) {
      case 'submit':
        evt.preventDefault();
        break;
    }
  },

  cleanFields: function conv_cleanFields() {
    this.previousSegment = 0;

    if (this.recipients) {
      this.recipients.length = 0;
    }

    Compose.clear();
  },

  onSendClick: function conv_onSendClick() {
    if (Compose.isEmpty()) {
      return;
    }

    // Assimilation 3 (see "Assimilations" above)
    // User may return to recipients, type a new recipient
    // manually and then click the sendButton without "accepting"
    // the recipient.
    this.assimilateRecipients();

    // not sure why this happens - replace me if you know
    this.container.classList.remove('hide');
  },

  // FIXME/bug 983411: phoneNumber not needed.
  simSelectedCallback: function conv_simSelected(phoneNumber, cardIndex) {
    if (Compose.isEmpty()) {
      return;
    }

    cardIndex = +cardIndex;
    if (isNaN(cardIndex)) {
      cardIndex = 0;
    }

    this.sendMessage({ serviceId: cardIndex });
  },

  sendMessage: function conv_sendMessage(opts) {
    var content = Compose.getContent(),
        subject = Compose.getSubject(),
        messageType = Compose.type,
        serviceId = opts.serviceId === undefined ? null : opts.serviceId,
        recipients;

    var inComposer = Navigation.isCurrentPanel('composer');

    // Depending where we are, we get different nums
    if (inComposer) {
      if (!this.recipients.length) {
        console.error('The user tried to send the message but no recipients ' +
            'are entered. This should not happen because we should disable ' +
            'the send button in that case');
        return;
      }
      recipients = this.recipients.numbers;
    } else {
      recipients = this.activeThread.participants;
    }

    // Clean composer fields (this lock any repeated click in 'send' button)
    this.disableConvertNoticeBanners();
    this.cleanFields();
    this.enableConvertNoticeBanners();

    // If there was a draft, it just got sent so delete it.
    this.updateDraft();

    this.shouldChangePanelNextEvent = inComposer;

    // Send the Message
    if (messageType === 'sms') {
      MessageManager.sendSMS({
        recipients: recipients,
        content: content[0],
        serviceId: serviceId,
        oncomplete: function onComplete(requestResult) {
          if (!requestResult.hasError) {
            this.onMessageSendRequestCompleted();
            return;
          }

          var errors = {};
          requestResult.return.forEach(function(result) {
            if (result.success) {
              return;
            }

            if (errors[result.code.name] === undefined) {
              errors[result.code.name] = [result.recipient];
            } else {
              errors[result.code.name].push(result.recipient);
            }
          });

          for (var key in errors) {
            this.showMessageSendingError(key, {recipients: errors[key]});
          }
        }.bind(this)
      });

      if (recipients.length > 1) {
        this.shouldChangePanelNextEvent = false;
        Navigation.toPanel('thread-list');
        if (ActivityClient.hasPendingRequest()) {
          // When app is run as activity, "backOrClose" always closes app.
          setTimeout(this.backOrClose.bind(this), this.LEAVE_ACTIVITY_DELAY);
        }

        // Early return to prevent compose focused for multi-recipients sms case
        return;
      }

    } else {
      var smilSlides = content.reduce(conv_generateSmilSlides, []);
      var mmsOpts = {
        recipients: recipients,
        subject: subject,
        content: smilSlides,
        serviceId: serviceId,
        onsuccess: function() {
          this.onMessageSendRequestCompleted();
        }.bind(this),
        onerror: function onError(error) {
          var errorName = error.name;
          this.showMessageSendingError(errorName);
        }.bind(this)
      };

      MessageManager.sendMMS(mmsOpts);
    }

    // Retaining the focus on composer.
    Compose.focus();
  },

  /**
   * Fires once message (both SMS and MMS) send/resend request initiated by the
   * current application instance is successfully completed.
   */
  onMessageSendRequestCompleted: function conv_onMessageSendRequestCompleted() {
    // Play the audio notification
    if (this.sentAudioEnabled) {
      this.sentAudio.play();
    }
  },

  onMessageFailed: function conv_onMessageFailed(e) {
    var message = e.message;

    // When this is the first message in a thread, we haven't displayed
    // the new thread yet. The error flag will be shown when the thread
    // will be rendered. See Bug 874043
    this.setMessageStatus(message.id, 'error');

    if (this.showErrorInFailedEvent === 'NonActiveSimCardError') {
      this.showErrorInFailedEvent = '';
      this.showMessageError(
        'NonActiveSimCardToSendError',
        {
          confirmHandler: function() {
            // Update messageDOM state to 'sending' while sim switching
            this.setMessageStatus(message.id, 'sending');

            MozMobileConnectionsClient.switchMmsSimHandler(message.iccId).then(
              this.resendMessage.bind(this, message.id)
            ).catch(function(err) {
                err && console.error(
                  'Unexpected error while resending the MMS message', err);
            });
          }.bind(this)
        }
      );
    }
  },

  // Some error return from sending error need some specific action instead of
  // showing the error prompt directly.
  showMessageSendingError: function conv_showMsgSendingError(errorName, opts) {
    // TODO: We handle NonActiveSimCard error in onMessageFailed because we
    // could not get message id from this error handler. Need to be removed when
    // bug 824717 is landed.
    if (errorName === 'NonActiveSimCardError') {
      this.showErrorInFailedEvent = errorName;
      return;
    }
    if (errorName === 'NotFoundError') {
      console.info('The message was deleted or is no longer available.');
      return;
    }
    this.showMessageError(errorName, opts);
  },

  showMessageError: function conv_showMessageOnError(errorCode, opts) {
    var dialog = new ErrorDialog(Errors.get(errorCode), opts);
    dialog.show();
  },

  toFieldKeypress: function(event) {
    if (event.keyCode === 13 || event.keyCode === event.DOM_VK_ENTER) {
      this.toggleRecipientSuggestions();
    }
  },

  toFieldInput: function(event) {
    var typed;

    if (event.target.isPlaceholder) {
      typed = event.target.textContent.trim();
      this.searchContact(typed).then(
        (contacts) => this.listContacts(typed, contacts)
      );
    }

    Compose.refresh();
  },

  exactContact: function conv_exactContact(fValue) {
    return Contacts.findExact(fValue);
  },

  searchContact: function conv_searchContact(fValue) {
    if (!fValue) {
      // In cases where searchContact was invoked for "input"
      // that was actually a "delete" that removed the last
      // character in the recipient input field,
      // eg. type "a", then delete it.
      return Promise.resolve([]);
    }

    return Contacts.findByString(fValue);
  },

  validateContact: function conv_validateContact(source, fValue, contacts) {
    var isInvalid = true;
    var index = this.recipients.length - 1;
    var last = this.recipientsList.lastElementChild;
    var typed = last && last.textContent.trim();
    var isContact = false;
    var record, length, number, contact;

    if (index < 0) {
      index = 0;
    }

    var props = ['tel'];
    if (Settings.supportEmailRecipient) {
      props.push('email');
    }

    // If there is greater than zero matches,
    // process the first found contact into
    // an accepted Recipient.
    if (contacts.length) {
      isInvalid = false;
      record = contacts[0];
      var values = props.reduce((values, prop) => {
        var propValue = record[prop];
        if (propValue && propValue.length) {
          return values.concat(propValue);
        }

        return values;
      }, []);
      length = values.length;

      // Received an exact match with a single tel or email record
      if (source.isLookupable && !source.isQuestionable && length === 1) {
        if (Utils.probablyMatches(values[0].value, fValue)) {
          isContact = true;
          number = values[0].value;
        }
      } else {
        // Received an exact match that may have multiple tel records
        for (var i = 0; i < length; i++) {
          var propValue = values[i].value;
          if (this.recipients.numbers.indexOf(propValue) === -1) {
            number = propValue;
            break;
          }
        }

        // If number is not undefined, then it's safe to assume
        // that this number is unique to the recipient list and
        // can be added as an accepted recipient from the user's
        // known contacts.
        //
        // It _IS_ possible for this to appear to be a duplicate
        // of an existing accepted recipient: by display name ONLY;
        // however this case will always have a different number.
        //
        if (typeof number !== 'undefined') {
          isContact = true;
        } else {
          // If no number match could be made, then this
          // contact record is actually inValid.
          isInvalid = true;
        }
      }
    }

    // Either an exact contact with a single tel record was matched
    // or an exact contact with multiple tel records and we've taken
    // one of the non-accepted tel records to add a new recipient.
    if (isContact) {

      // Remove the last assimilated recipient entry.
      this.recipients.remove(index);

      contact = Utils.basicContact(number, record);
      contact.source = 'contacts';

      // Add the newly minted contact as an accepted recipient
      this.recipients.add(contact).focus();

      return;
    }

    // Received multiple contact matches and the current
    // contact record had a number that has already been
    // accepted as a recipient. Try the next contact in the
    // set of results.
    if (isInvalid && contacts.length > 1) {
      this.validateContact(source, fValue, contacts.slice(1));
      return;
    }

    // Plain numbers with no contact matches can never be "invalid"
    if (!source.isQuestionable && !length) {
      isInvalid = false;
    }

    // If there are no contacts matched
    // this input was definitely invalid.
    source.isInvalid = isInvalid;

    // Avoid colliding with an "edit-in-progress".
    if (!typed) {
      this.recipients.update(index, source).focus();
    }
  },

  listContacts: function conv_listContacts(fValue, contacts) {
    this.toggleRecipientSuggestions();

    // If the user has cleared the typed input before the
    // results came back, prevent the results from being rendered
    // by returning immediately.
    if (!this.recipients.inputValue) {
      return;
    }

    if (!contacts.length) {
      return;
    }

    // There are contacts that match the input.
    var suggestionList = document.createDocumentFragment();

    // Render each contact in the contacts results
    var renderer = ContactRenderer.flavor('suggestion');
    var unknownContactsRenderer = ContactRenderer.flavor('suggestionUnknown');

    contacts.forEach(function(contact) {
      var rendererArg = {
        contact: contact,
        input: fValue,
        target: suggestionList,
        skip: this.recipients.numbers
      };
      if (contact.source != 'unknown') {
        renderer.render(rendererArg);
      }
      else {
        unknownContactsRenderer.render(rendererArg);
      }
    }, this);

    this.toggleRecipientSuggestions(suggestionList);
  },

  updateDraft() {
    var conversation = this.activeThread;

    // Need to assimilate recipients in order to check if any entered.
    this.assimilateRecipients();

    // If message content is not empty and/or we have _valid_ recipients in
    // NewMessage view.
    var hasDraftToSave = !Compose.isEmpty() ||
      (!conversation && this.recipients.numbers.length);

    // Check if conversation has been just removed, can happen when user selects
    // all messages in Conversation view and removes all of them, in this case
    // we delete the conversation-bound draft and create a "new message" draft
    // instead.
    var isConversationRemoved = conversation && !conversation.messages.size;

    // If we're going to remove or add drafts, we should take care about storing
    // updated draft collection to a persistent storage.
    var shouldStoreDrafts = false;

    // If we have active draft, but user cleared it up or removed conversation
    // this draft belonged to, we should discard it.
    if (this.draft && (!hasDraftToSave || isConversationRemoved)) {
      Drafts.delete(this.draft);

      this.draft = null;

      shouldStoreDrafts = true;
    }

    // We should save a new draft in case composer is not empty and it has not
    // been saved before.
    if (hasDraftToSave && (!this.draft || this.draft.isEdited)) {
      // Otherwise we should save new draft.
      this.draft = new Draft({
        id: this.draft && this.draft.id,
        threadId: !isConversationRemoved ?
          conversation && conversation.id : null,
        recipients: conversation ?
          conversation.participants : this.recipients.numbers,
        content: Compose.getContent(),
        subject: Compose.getSubject(),
        type: Compose.type
      });

      Drafts.add(this.draft);

      shouldStoreDrafts = true;
    }

    return shouldStoreDrafts ? Drafts.store() : Promise.resolve();
  },

  /**
   * From a messageId, this stores a new draft with the content of this message.
   *
   * @param {Number} messageId Message to store as draft.
   * @returns {Promise.<Number>} Resolved with the draft id once the draft is
   * stored.
   */
  storeDraftFromMessage(messageId) {
    var message = Threads.Messages.get(messageId);

    // TODO store parsed version of SMIL in memory or local DB
    var contentPromise;
    if (message.type === 'sms') {
      contentPromise = Promise.resolve([message.body]);
    } else {
      contentPromise = SMIL.parse(message).then(
        (elements) => elements.reduce((result, element) => {
          if (element.blob) {
            result.push(new Attachment(element.blob, {
              name: element.name,
              isDraft: true
            }));
          }
          if (element.text) {
            result.push(element.text);
          }

          return result;
        }, [])
      );
    }

    return contentPromise.then((content) => {
      var draft = new Draft({
        subject: message.subject,
        type: message.type,
        content
      });

      return Drafts.add(draft).store().then(
        () => draft.id
      );
    });
  },

  /**
   * Shows recipient suggestions if available, otherwise removes it from the DOM
   * and hides suggestions container.
   * @param {DocumentFragment} suggestions DocumentFragment node that contains
   * recipient suggestion to display.
   */
  toggleRecipientSuggestions: function(suggestions) {
    var contactList = this.recipientSuggestions.querySelector('.contact-list');

    this.recipientSuggestions.classList.toggle('hide', !suggestions);

    if (!suggestions) {
      contactList.textContent = '';
    } else {
      contactList.appendChild(suggestions);
      this.recipientSuggestions.scrollTop = 0;
    }
  }
};

Object.defineProperty(exports, 'ConversationView', {
  get: function () {
    delete exports.ConversationView;

    var allowedEvents = ['visually-loaded'];
    return (exports.ConversationView =
      EventDispatcher.mixin(ConversationView, allowedEvents));
  },
  configurable: true,
  enumerable: true
});
}(this));
