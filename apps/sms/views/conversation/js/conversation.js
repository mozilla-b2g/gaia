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
         TaskRunner
*/
/*exported ConversationView */

(function(exports) {
'use strict';

var attachmentMap = new WeakMap();

function conv_mmsAttachmentClick(target) {
  var attachment = attachmentMap.get(target);
  if (!attachment) {
    return false;
  }

  attachment.view({
    allowSave: true
  });

  return true;
}

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
  CHUNK_SIZE: 10,
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

  draft: null,
  recipients: null,
  // Set to |true| when in edit mode
  inEditMode: false,
  isNewMessageNoticeShown: false,
  shouldChangePanelNextEvent: false,
  showErrorInFailedEvent: '',
  previousSegment: 0,

  timeouts: {
    update: null,
    subjectLengthNotice: null
  },

  multiSimActionButton: null,
  init: function conv_init() {
    var templateIds = [
      'message',
      'message-sim-information',
      'message-status',
      'not-downloaded',
      'recipient',
      'date-group',
      'header',
      'group-header'
    ];

    // Fields with 'messages' label
    [
      'container', 'to-field', 'recipients-list', 'compose-form', 'header',
      'edit-header', 'check-uncheck-all-button', 'contact-pick-button',
      'send-button', 'delete-button', 'call-number-button', 'options-button',
      'new-message-notice', 'edit-mode', 'edit-form', 'header-text',
      'max-length-notice', 'convert-notice', 'resize-notice',
      'new-message-notice', 'subject-max-length-notice', 'sms-counter-notice',
      'recipient-suggestions'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('messages-' + id);
    }, this);

    this.mainWrapper = document.getElementById('main-wrapper');
    this.threadMessages = document.getElementById('thread-messages');

    window.addEventListener('resize', this.resizeHandler.bind(this));

    // binding so that we can remove this listener later
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange',
                              this.onVisibilityChange);

    this.toField.addEventListener(
      'keypress', this.toFieldKeypress.bind(this), true
    );

    this.toField.addEventListener(
      'input', this.toFieldInput.bind(this), true
    );

    this.toField.addEventListener(
      'focus', this.toFieldInput.bind(this), true
    );

    this.sendButton.addEventListener(
      'click', this.onSendClick.bind(this)
    );

    this.sendButton.addEventListener(
      'contextmenu', this.onSendClick.bind(this)
    );

    this.container.addEventListener(
      'scroll', this.manageScroll.bind(this)
    );

    this.editHeader.addEventListener(
      'action', this.cancelEdit.bind(this)
    );

    this.header.addEventListener(
      'action', this.onHeaderAction.bind(this)
    );

    this.optionsButton.addEventListener(
      'click', this.showOptions.bind(this)
    );

    this.callNumberButton.addEventListener('click', function() {
      ActivityPicker.dial(Threads.active.participants[0]);
    });

    this.deleteButton.addEventListener(
      'click', this.delete.bind(this)
    );

    this.headerText.addEventListener(
      'click', this.onHeaderActivation.bind(this)
    );

    this.newMessageNotice.addEventListener(
      'click', this.onNewMessageNoticeClick.bind(this)
    );

    // These events will be handled in handleEvent function
    this.container.addEventListener('click', this);
    this.container.addEventListener('contextmenu', this);
    this.editForm.addEventListener('submit', this);
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

    navigator.mozContacts.addEventListener(
      'contactchange',
      this.updateHeaderData.bind(this)
    );

    this.recipientSuggestions.addEventListener(
      'click',
      this.onRecipientSuggestionClick.bind(this)
    );

    MessageManager.on('message-sending', this.onMessageSending.bind(this));
    MessageManager.on('message-sent', this.onMessageSent.bind(this));
    MessageManager.on('message-received', this.onMessageReceived.bind(this));
    MessageManager.on(
      'message-failed-to-send',
      this.onMessageFailed.bind(this)
    );
    MessageManager.on('message-delivered', this.onDeliverySuccess.bind(this));
    MessageManager.on('message-read', this.onReadSuccess.bind(this));

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
  },

  onVisibilityChange: function conv_onVisibilityChange(e) {
    // If we leave the app and are in a thread or compose window
    // save a message draft if necessary
    if (document.hidden) {
      // Auto-save draft if the user has entered anything
      // in the composer or into To field (for composer panel only).
      var isAutoSaveRequired = false;

      if (Navigation.isCurrentPanel('composer')) {
        isAutoSaveRequired = !Compose.isEmpty() ||
          !!ConversationView.recipients.length;
      } else if (Navigation.isCurrentPanel('thread')) {
        isAutoSaveRequired = !Compose.isEmpty();
      }

      if (isAutoSaveRequired) {
        ConversationView.saveDraft(true /* preserveDraft */);
      }
    }
  },

  /**
   * Executes when the header 'action' button is tapped.
   *
   * @private
   */
  onHeaderAction: function conv_onHeaderAction() {
    this.backOrClose();
  },

  /**
   * We always go back to the previous pane, unless we're in an activity, then
   * in selected cases we exit the activity.
   *
   * @private
   */
  backOrClose: function conv_backOrClose() {
    var inActivity = ActivityClient.hasPendingRequest();
    var isComposer = Navigation.isCurrentPanel('composer');
    var isThread = Navigation.isCurrentPanel('thread');
    var action = inActivity && (isComposer || isThread) ? 'close' : 'back';
    this[action]();
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

  getIdIterator: function conv_getIdIterator() {
    return Threads.active.messages.keys();
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
    navigator.mozL10n.setAttributes(
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

    if (!this.multiSimActionButton) {
      // handles the various actions on the send button and encapsulates the
      // DSDS specific behavior
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
      case 'thread':
        return this.beforeEnterThread(args);
      default:
        console.error(
          'preEnter was called with an unexpected panel name:',
          next
        );
        return Promise.reject();
    }
  },

  beforeEnterThread: function conv_beforeEnterThread(args) {
    // TODO should we implement hooks to Navigation so that Threads could
    // get an event whenever the panel changes?
    Threads.currentId = args.id;

    var prevPanel = args.meta.prev;

    var emailThread = Settings.supportEmailRecipient &&
      Threads.active.participants.some(Utils.isEmailAddress);

    Compose.setupLock({ forceType: () => emailThread ? 'mms' : null });

    // If transitioning from composer, we don't need to notify about type
    // conversion but only after the type of the thread is set
    // (afterEnterThread)
    if (!prevPanel || prevPanel.panel !== 'composer') {
      this.enableConvertNoticeBanners();
    }

    if (!this.isConversationPanel(args.id, prevPanel)) {
      this.initializeRendering();
    }

    // Call button should be shown only for non-email single-participant thread
    if (Threads.active.participants.length === 1 && !emailThread) {
      this.callNumberButton.classList.remove('hide');
    }

    return this.updateHeaderData();
  },

  afterEnter: function conv_afterEnter(args) {
    var next = args.meta.next.panel;
    switch (next) {
      case 'composer':
        return this.afterEnterComposer(args);
      case 'thread':
        return this.afterEnterThread(args);
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
    if (args.activity) {
      this.handleActivity(args.activity);
    } else if (args.draftId) {
      this.handleDraft(+args.draftId);
    }

    if (args.focusComposer) {
      Compose.focus();
    } else {
      this.recipients.focus();
    }

    this.emit('visually-loaded');

    // not strictly necessary but better for consistency
    return Promise.resolve();
  },

  afterEnterThread: function conv_afterEnterThread(args) {
    var threadId = +args.id;

    var prevPanel = args.meta.prev;

    if (!this.isConversationPanel(threadId, prevPanel)) {
      this.renderMessages(threadId);

      // Populate draft if there is one
      // TODO merge with handleDraft ? Bug 1164431
      Drafts.request().then(() => {
        this.draft = Threads.get(threadId).getDraft();

        if (this.draft) {
          this.draft.isEdited = false;

          Compose.fromDraft(this.draft);
          Compose.focus();
        }
      });
    }

    // Let's mark thread only when inbox is fully rendered and target node
    // is in the DOM tree.
    App.whenReady().then(function() {
      // We use setTimeout (macrotask) here to allow reflow happen as soon as
      // possible and to not interrupt it with non-critical task since Promise
      // callback only (microtask) won't help here.
      setTimeout(
        () => InboxView.markReadUnread([threadId], /* isRead */ true)
      );
    });

    // Enable notifications redirected from composer only after the user enters.
    if (prevPanel && prevPanel.panel === 'composer') {
      this.enableConvertNoticeBanners();
    }

    if (args.focusComposer) {
      Compose.focus();
    }

    return Utils.closeNotificationsForThread(threadId);
  },

  beforeLeave: function conv_beforeLeave(args) {
    this.disableConvertNoticeBanners();

    var nextPanel = args.meta.next;

    // This should be in afterLeave, but the edit mode interface does not seem
    // to slide correctly. Bug 1009541
    this.cancelEdit();

    if (Navigation.isCurrentPanel('thread')) {
      // Revoke thumbnail URL for every image attachment rendered within thread
      var nodes = this.container.querySelectorAll(
        '.attachment-container[data-thumbnail]'
      );
      Array.from(nodes).forEach((node) => {
        window.URL.revokeObjectURL(node.dataset.thumbnail);
      });
    }

    // TODO move most of back() here: Bug 1010223
    if (!this.isConversationPanel(Threads.currentId, nextPanel)) {
      this.cleanFields();
    }
  },

  afterLeave: function conv_afterLeave(args) {
    if (Navigation.isCurrentPanel('thread-list')) {
      this.container.textContent = '';
      this.cleanFields();
      Threads.currentId = null;
    }
    if (!Navigation.isCurrentPanel('composer')) {
      this.threadMessages.classList.remove('new');

      if (this.recipients) {
        this.recipients.length = 0;
      }

      this.toggleRecipientSuggestions();
    }

    if (!Navigation.isCurrentPanel('thread')) {
      this.threadMessages.classList.remove('has-carrier');
      this.callNumberButton.classList.add('hide');
    }
  },

  handleActivity: function conv_handleActivity(params) {
    var parametersPromise;

    if (params.number) {
      parametersPromise = Contacts.findByAddress(params.number).then(
      (contacts) => {
        if (!contacts.length) {
          throw new Error('No contacts found for %s', params.number);
        }

        return Object.assign(
          Utils.basicContact(params.number, contacts), { source: 'contacts'}
        );
      }).catch(() => {
        return { source: 'manual', number: params.number };
      }).then((recipient) => {
        this.recipients.add(recipient);

        return params;
      });
    } else if (params.messageId) {
      parametersPromise = MessageManager.getMessage(params.messageId);
    } else {
      parametersPromise = Promise.resolve(params);
    }

    return parametersPromise.then(
      (parameters) => Compose.fromMessage(parameters)
    );
  },

  // recalling draft for composer only
  // Bug 1164431 might use it for thread drafts too
  handleDraft: function conv_handleDraft(draftId) {
    // We'll revisit this.draft necessity in bug 1164435.
    this.draft = Drafts.byDraftId(draftId);

    if (!this.draft) {
      return;
    }

    // Recipients will exist for draft messages in threads
    // Otherwise find them from draft recipient numbers
    this.draft.recipients.forEach(function(number) {
      Contacts.findByAddress(number).then(function(contacts) {
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
      }.bind(this));
    }, this);

    // Render draft contents into the composer input area.
    Compose.fromDraft(this.draft);

    // Discard this draft object and update the backing store
    Drafts.delete(this.draft).store();

    this.draft.isEdited = false;
  },

  beforeEnterComposer() {
    Recipients.View.isFocusable = true;

    this.enableConvertNoticeBanners();

    // TODO add the activity/forward/draft stuff here
    // instead of in afterEnter: Bug 1010223

    Threads.currentId = null;
    this.cleanFields();
    this.initRecipients();
    this.updateComposerHeader();

    Compose.setupLock({
      canSend: () => this.hasValidRecipients(),
      // Null means that we want to use default type detection strategy.
      forceType: () => this.hasEmailRecipients() ? 'mms' : null
    });

    this.container.textContent = '';
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

    this.appendMessage(message);
    TimeHeaders.updateAll('header[data-time-update]');
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
   * @param {number} conversationId Id of the conversation.
   * @param {Object} panel Panel description object to compare against.
   * @returns {boolean}
   */
  isConversationPanel:
  function conv_isConversationPanel(conversationId, panel) {
    if (!panel) {
      return false;
    }

    return panel.panel === 'thread' && panel.args.id === conversationId ||
      panel.panel === 'report-view' && panel.args.threadId === conversationId ||
      panel.panel === 'group-view' && panel.args.id === conversationId;
  },

  onMessageReceived: function conv_onMessageReceived(e) {
    var message = e.message;

    // If user currently in other thread then there is nothing to do here
    if (!this.isCurrentConversation(message.threadId)) {
      return;
    }

    MessageManager.markMessagesRead([message.id]);

    this.onMessage(message);
    this.scrollViewToBottom();
    if (this.isScrolledManually) {
      this.showNewMessageNotice(message);
    }
  },

  onMessageSending: function conv_onMessageReceived(e) {
    var message = e.message;
    if (this.isCurrentConversation(message.threadId)) {
      this.onMessage(message);
      this.forceScrollViewToBottom();
    } else {
      if (this.shouldChangePanelNextEvent) {
        Navigation.toPanel('thread', { id: message.threadId });
        this.shouldChangePanelNextEvent = false;
      }
    }
  },

  onNewMessageNoticeClick: function conv_onNewMessageNoticeClick(event) {
    event.preventDefault();
    this.hideNewMessageNotice();
    this.forceScrollViewToBottom();
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
    // Scroll to bottom
    this.scrollViewToBottom();
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

  // scroll position is considered as "manual" if the view is not completely
  // scrolled to the bottom
  isScrolledManually: false,

  // We define an edge for showing the following chunk of elements
  manageScroll: function conv_manageScroll(oEvent) {
    var scrollTop = this.container.scrollTop;
    var scrollHeight = this.container.scrollHeight;
    var clientHeight = this.container.clientHeight;

    this.isScrolledManually = ((scrollTop + clientHeight) < scrollHeight);

    // Check if the banner has been showed and close it when the scroll
    // reach the bottom
    if (!this.isScrolledManually && this.isNewMessageNoticeShown) {
      this.hideNewMessageNotice();
    }

    // kEdge will be the limit (in pixels) for showing the next chunk
    var kEdge = 30;
    if (scrollTop < kEdge) {
      this.showChunkOfMessages(this.CHUNK_SIZE);
      // We update the scroll to the previous position
      // taking into account the previous offset to top
      // and the current height due to we have added a new
      // chunk of visible messages
      this.container.scrollTop =
        (this.container.scrollHeight - scrollHeight) + scrollTop;
    }
  },

  scrollViewToBottom: function conv_scrollViewToBottom() {
    if (!this.isScrolledManually &&
        this.container.lastElementChild &&
        Navigation.isCurrentPanel('thread')) {
      this.container.lastElementChild.scrollIntoView(false);
    }
  },

  forceScrollViewToBottom: function conv_forceScrollViewToBottom() {
    this.isScrolledManually = false;
    this.scrollViewToBottom();
  },

  showNewMessageNotice: function conv_showNewMessageNotice(message) {
    Contacts.findByPhoneNumber(message.sender).then((contacts) => {
      var sender = message.sender;
      if (contacts.length) {
        var details = Utils.getContactDetails(sender, contacts[0]);
        sender = details.title || sender;
        // Get the first name
        var index = sender.indexOf(' ');
        if (index !== -1) {
          sender = sender.slice(0, index);
        }
      }

      var notice = this.newMessageNotice;
      var newMessageContactNode = notice.querySelector('.contact');
      newMessageContactNode.textContent = sender;

      this.isNewMessageNoticeShown = true;
      notice.classList.remove('hide');
    });
  },

  hideNewMessageNotice: function conv_hideNewMessageNotice() {
    this.isNewMessageNoticeShown = false;
    //Hide the new message's banner
    this.newMessageNotice.classList.add('hide');
  },

  close: function conv_close() {
    return this._onNavigatingBack().then(() => {
      this.cleanFields();
      return ActivityClient.postResult();
    }).catch(function(e) {
      // If we don't have any error that means that action was rejected
      // intentionally and there is nothing critical to report about.
      e && console.error('Unexpected error while closing the activity: ', e);

      return Promise.reject(e);
    });
  },

  back: function conv_back() {
    return this._onNavigatingBack().then(function(isDraftSaved) {
      Navigation.toPanel('thread-list', {
        notifyAboutSavedDraft: isDraftSaved
      });
    }.bind(this)).catch(function(e) {
      e && console.error('Unexpected error while navigating back: ', e);

      return Promise.reject(e);
    });
  },

  /**
   * Navigates user to Composer or Thread panel with custom parameters.
   * @param {*} parameters Optional navigation parameters.
   * @returns {Promise} Promise that is resolved once navigation is completed.
   */
  navigateToComposer: function(parameters) {
    var draftDiscardPromise;

    // We should check if draft is not saved instead, to be fixed in bug 1153940
    if (Compose.isEmpty()) {
      draftDiscardPromise = Promise.resolve();
    } else {
      draftDiscardPromise = Utils.confirm(
        'unsent-message-text',
        'unsent-message-title',
        { text: 'unsent-message-option-discard', className: 'danger' }
      ).then(() => this.discardDraft());
    }

    return draftDiscardPromise.then(() => {
      // Now we'll try to find existing thread for the new message, otherwise
      // let's fallback to new message composer.
      var threadPromise = Promise.reject();
      if (parameters && parameters.number) {
        threadPromise = MessageManager.findThreadFromNumber(parameters.number);
      }

      // The rejected promise will be returned in case we can't find thread
      // for the specified number.
      return threadPromise.then((id) => {
        return Navigation.toPanel('thread', { id: id, focusComposer: true });
      }, () => {
        return Navigation.toPanel('composer', {
          activity: parameters,
          focusComposer: !!(parameters && parameters.number)
        });
      });
    });
  },

  _onNavigatingBack: function() {
    this.stopRendering();

    // We're waiting for the keyboard to disappear before animating back
    return this._ensureKeyboardIsHidden().then(function() {
      // Need to assimilate recipients in order to check if any entered
      this.assimilateRecipients();

      // If we're leaving a thread's message view,
      // ensure that the thread object's unreadCount
      // value is current (set = 0)
      if (Threads.active) {
        Threads.active.unreadCount = 0;
      }

      // If the composer is empty and we are either
      // in an active thread or there are no recipients
      // do not prompt to save a draft and remove saved drafts
      // as the user deleted them manually
      if (Compose.isEmpty() &&
        (Threads.active || this.recipients.length === 0)) {
        this.discardDraft();
        return;
      }

      // If there is a draft and the content and recipients
      // never got edited, re-save if threadless,
      // then leave without prompting to replace
      if (this.draft && !this.draft.isEdited) {
        // Thread-less drafts are orphaned at this point
        // so they need to be resaved for persistence
        // Otherwise, clear the draft directly before leaving
        if (!Threads.currentId) {
          this.saveDraft();
        } else {
          this.draft = null;
        }
        return;
      }

      return this._showMessageSaveOrDiscardPrompt();
    }.bind(this));
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

  _showMessageSaveOrDiscardPrompt: function() {
    var deferred = Utils.Promise.defer();

    var options = {
      items: [
        {
          l10nId: this.draft ? 'replace-draft' : 'save-as-draft',
          method: () => {
            this.saveDraft();
            deferred.resolve(true /* isDraftSaved */);
          }
        },
        {
          l10nId: 'delete-draft',
          method: () => {
            this.discardDraft();
            deferred.resolve();
          }
        },
        {
          l10nId: 'cancel',
          method: deferred.reject
        }
      ]
    };

    new OptionMenu(options).show();

    return deferred.promise;
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

      navigator.mozL10n.setAttributes(
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

  updateCarrier: function conv_updateCarrier(thread, contacts) {
    var carrierTag = document.getElementById('contact-carrier');
    var threadMessages = this.threadMessages;
    var number = thread.participants[0];
    var phoneDetails;
    var address;

    // The carrier banner is meaningless and confusing in
    // group message mode.
    if (thread.participants.length === 1 && contacts.length) {

      address = Settings.supportEmailRecipient && Utils.isEmailAddress(number) ?
                contacts[0].email : contacts[0].tel;

      phoneDetails = Utils.getPhoneDetails(number, address);

      if (phoneDetails) {
        carrierTag.innerHTML = SharedComponents.phoneDetails(
          phoneDetails
        ).toString();

        threadMessages.classList.add('has-carrier');
      } else {
        threadMessages.classList.remove('has-carrier');
      }
    } else {
      // Hide carrier tag in group message or unknown contact cases.
      threadMessages.classList.remove('has-carrier');
    }
  },

  // Method for updating the header with the info retrieved from Contacts API
  updateHeaderData: function conv_updateHeaderData() {
    var thread, number;

    thread = Threads.active;

    if (!thread) {
      return Promise.resolve();
    }

    number = thread.participants[0];

    // Add data to contact activity interaction
    this.headerText.dataset.number = number;

    return Contacts.findByAddress(number).then((contacts) => {
      // For the basic display, we only need the first contact's information
      // e.g. for 3 contacts, the app displays:
      //
      //    Jane Doe (+2)
      //
      var details = Utils.getContactDetails(number, contacts);
      // Bug 867948: contacts null is a legitimate case, and
      // getContactDetails is okay with that.
      var contactName = details.title || number;
      this.headerText.dataset.isContact = !!details.isContact;
      this.headerText.dataset.title = contactName;

      var headerContentTemplate = thread.participants.length > 1 ?
        this.tmpl.groupHeader : this.tmpl.header;
      this.setHeaderContent({
        html: headerContentTemplate.interpolate({
          name: contactName,
          participantCount: (thread.participants.length - 1).toString()
        })
      });

      this.updateCarrier(thread, contacts);
    });
  },

  /**
   * Updates header content since it's used for different panels and should be
   * carefully handled for every case. In Thread panel header contains HTML
   * markup to support bidirectional content, but other panels still use it with
   * mozL10n.setAttributes as it would contain only localizable text. We should
   * get rid of this method once bug 961572 and bug 1011085 are landed.
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
      navigator.mozL10n.setAttributes(
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

  initializeRendering: function conv_initializeRendering() {
    // Clean fields
    this.cleanFields();

    // Clean list of messages
    this.container.innerHTML = '';
    // Initialize infinite scroll params
    this.messageIndex = 0;
    // reset stopRendering boolean
    this._stopRenderingNextStep = false;
  },

  // Method for stopping the rendering when clicking back
  stopRendering: function conv_stopRendering() {
    this._stopRenderingNextStep = true;
  },

  // Method for rendering the first chunk at the beginning
  showFirstChunk: function conv_showFirstChunk() {
    // Show chunk of messages
    this.showChunkOfMessages(this.CHUNK_SIZE);
    // Boot update of headers
    TimeHeaders.updateAll('header[data-time-update]');
    // Go to Bottom
    this.scrollViewToBottom();

    this.emit('visually-loaded');
  },

  createMmsContent: function conv_createMmsContent(dataArray) {
    var container = document.createDocumentFragment();

    dataArray.forEach(function(messageData) {

      if (messageData.blob) {
        var attachment = new Attachment(messageData.blob, {
          name: messageData.name
        });
        var mediaElement = attachment.render();
        container.appendChild(mediaElement);
        attachmentMap.set(mediaElement, attachment);
      }

      if (messageData.text) {
        var textElement = document.createElement('span');

        // escape text for html and look for clickable numbers, etc.
        var text = Template.escape(messageData.text);
        text = LinkHelper.searchAndLinkClickableData(text);

        textElement.innerHTML = text;
        container.appendChild(textElement);
      }
    });
    return container;
  },

  // Method for rendering the list of messages using infinite scroll
  renderMessages: function conv_renderMessages(threadId, callback) {
    // Use taskRunner to make sure message appended in proper order
    var taskQueue = new TaskRunner();
    var onMessagesRendered = (function messagesRendered() {
      if (this.messageIndex < this.CHUNK_SIZE) {
        taskQueue.push(this.showFirstChunk.bind(this));
      }

      if (callback) {
        callback();
      }
    }).bind(this);

    var onRenderMessage = (function renderMessage(message) {
      if (this._stopRenderingNextStep) {
        // stop the iteration and clear the taskQueue
        taskQueue = null;
        return false;
      }
      taskQueue.push(() => {
        if (!this._stopRenderingNextStep) {
          Threads.registerMessage(message);
          return this.appendMessage(message,/*hidden*/ true);
        }
        return false;
      });
      this.messageIndex++;
      if (this.messageIndex === this.CHUNK_SIZE) {
        taskQueue.push(this.showFirstChunk.bind(this));
      }
      return true;
    }).bind(this);

    if (this._stopRenderingNextStep) {
      // we were already asked to stop rendering, before even starting
      return;
    }

    var filter = { threadId: threadId };

    // We call getMessages with callbacks
    var renderingOptions = {
      each: onRenderMessage,
      filter: filter,
      invert: false,
      end: onMessagesRendered
    };

    MessageManager.getMessages(renderingOptions);

    // force the next scroll to bottom
    this.isScrolledManually = false;
  },

  // generates the html for not-downloaded messages - pushes class names into
  // the classNames array also passed in, returns an HTML string
  _createNotDownloadedHTML:
  function conv_createNotDownloadedHTML(message, classNames) {
    // default strings:
    var messageL10nId = 'tobedownloaded-attachment';
    var downloadL10nId = 'download-attachment';

    // assuming that incoming message only has one deliveryInfo
    var status = message.deliveryInfo[0].deliveryStatus;

    var dateTimeOptions = {
      weekday: 'long',
      month: 'short',
      day: '2-digit',
    };
    var formatter = 
      new Intl.DateTimeFormat(navigator.languages, dateTimeOptions);
    var expireFormatted = formatter.format(new Date(+message.expiryDate));

    var expired = +message.expiryDate < Date.now();

    if (expired) {
      classNames.push('expired');
      messageL10nId = 'expired-attachment';
    }

    if (status === 'error') {
      classNames.push('error');
    }

    if (status === 'pending') {
      downloadL10nId = 'downloading-attachment';
      classNames.push('pending');
    }

    return this.tmpl.notDownloaded.interpolate({
      messageL10nId: messageL10nId,
      messageL10nArgs: JSON.stringify({ date: expireFormatted }),
      messageL10nDate: message.expiryDate.toString(),
      messageL10nDateFormat: JSON.stringify(dateTimeOptions),
      downloadL10nId: downloadL10nId
    });
  },

  // Check deliveryStatus for both single and multiple recipient case.
  // In multiple recipient case, we return true only when all the recipients
  // deliveryStatus set to success.
  shouldShowDeliveryStatus: function conv_shouldShowDeliveryStatus(message) {
    if (message.delivery !== 'sent') {
      return false;
    }

    if (message.type === 'mms') {
      return message.deliveryInfo.every(function(info) {
        return info.deliveryStatus === 'success';
      });
    } else {
      return message.deliveryStatus === 'success';
    }
  },

  // Check readStatus for both single and multiple recipient case.
  // In multiple recipient case, we return true only when all the recipients
  // deliveryStatus set to success.
  shouldShowReadStatus: function conv_shouldShowReadStatus(message) {
    // Only mms message has readStatus
    if (message.delivery !== 'sent' || message.type === 'sms' ||
      !message.deliveryInfo) {
      return false;
    }

    return message.deliveryInfo.every(function(info) {
      return info.readStatus === 'success';
    });
  },

  buildMessageDOM: function conv_buildMessageDOM(message, hidden) {
    var messageDOM = document.createElement('li'),
        bodyHTML = '';

    var messageStatus = message.delivery,
        isNotDownloaded = messageStatus === 'not-downloaded',
        isIncoming = messageStatus === 'received' || isNotDownloaded;

    // If the MMS has invalid empty content(message without attachment and
    // subject) or contains only subject, we will display corresponding message
    // and layout type in the message bubble.
    //
    // Returning attachments would be different based on gecko version:
    // null in b2g18 / empty array in master.
    var noAttachment = (message.type === 'mms' && !isNotDownloaded &&
      (message.attachments === null || message.attachments.length === 0));
    var invalidEmptyContent = (noAttachment && !message.subject);

    if (this.shouldShowReadStatus(message)) {
      messageStatus = 'read';
    } else if (this.shouldShowDeliveryStatus(message)) {
      messageStatus = 'delivered';
    }

    var classNames = [
      'message', message.type, messageStatus,
      isIncoming ? 'incoming' : 'outgoing'
    ];

    if (hidden) {
      classNames.push('hidden');
    }

    if (message.type && message.type === 'mms' && message.subject) {
      classNames.push('has-subject');
    }

    if (message.type && message.type === 'sms') {
      var escapedBody = Template.escape(message.body || '');
      bodyHTML = LinkHelper.searchAndLinkClickableData(escapedBody);
    }

    if (isNotDownloaded) {
      bodyHTML = this._createNotDownloadedHTML(message, classNames);
    }

    if (invalidEmptyContent) {
      classNames = classNames.concat(['error', 'invalid-empty-content']);
    } else if (noAttachment) {
      classNames.push('no-attachment');
    }

    if (classNames.indexOf('error') >= 0) {
      messageStatus = 'error';
    } else if (classNames.indexOf('pending') >= 0) {
      messageStatus = 'pending';
    }

    messageDOM.className = classNames.join(' ');
    messageDOM.id = 'message-' + message.id;
    messageDOM.dataset.messageId = message.id;
    messageDOM.dataset.iccId = message.iccId;
    var simServiceId = Settings.getServiceIdByIccId(message.iccId);
    var showSimInformation = Settings.hasSeveralSim() && simServiceId !== null;
    var simInformationHTML = '';
    if (showSimInformation) {
      simInformationHTML = this.tmpl.messageSimInformation.interpolate({
        simNumberL10nArgs: JSON.stringify({ id: simServiceId + 1 })
      });
    }

    messageDOM.innerHTML = this.tmpl.message.interpolate({
      id: String(message.id),
      bodyHTML: bodyHTML,
      timestamp: String(message.timestamp),
      subject: String(message.subject),
      simInformationHTML: simInformationHTML,
      messageStatusHTML: this.getMessageStatusMarkup(messageStatus).toString()
    }, {
      safe: ['bodyHTML', 'simInformationHTML', 'messageStatusHTML']
    });

    TimeHeaders.update(messageDOM.querySelector('time'));

    var pElement = messageDOM.querySelector('p');
    if (invalidEmptyContent) {
      pElement.setAttribute('data-l10n-id', 'no-attachment-text');
    }

    var result;
    if (message.type === 'mms' && !isNotDownloaded && !noAttachment) { // MMS
      result = SMIL.parse(message).then(
        (slideArray) => this.createMmsContent(slideArray)
      ).then(
        (mmsContent) => pElement.appendChild(mmsContent)
      ).then(
        () => messageDOM
      );
    } else {
      result = Promise.resolve(messageDOM);
    }

    return result;
  },

  getMessageStatusMarkup: function(status) {
    return ['read', 'delivered', 'sending', 'error'].indexOf(status) >= 0 ?
      this.tmpl.messageStatus.prepare({
        statusL10nId: 'message-delivery-status-' + status
      }) : '';
  },

  appendMessage: function conv_appendMessage(message, hidden) {
    var timestamp = +message.timestamp;

    // look for an old message and remove it first - prevent anything from ever
    // double rendering for now
    var messageDOM = document.getElementById('message-' + message.id);

    if (messageDOM) {
      this.removeMessageDOM(messageDOM);
    }

    // build messageDOM adding the links
    return this.buildMessageDOM(message, hidden).then((messageDOM) => {
      if (this._stopRenderingNextStep) {
        return;
      }

      messageDOM.dataset.timestamp = timestamp;

      // Add to the right position
      var messageContainer = this.getMessageContainer(timestamp, hidden);
      this._insertTimestampedNodeToContainer(messageDOM, messageContainer);

      if (this.inEditMode) {
        this.updateSelectionStatus();
      }

      if (!hidden) {
        // Go to Bottom
        this.scrollViewToBottom();
      }
    });
  },

  /**
   * Inserts DOM node to the container respecting 'timestamp' data attribute of
   * the node to insert and sibling nodes in ascending order.
   * @param {Node} nodeToInsert DOM node to insert.
   * @param {Node} container Container DOM node to insert to.
   * @private
   */
  _insertTimestampedNodeToContainer: function(nodeToInsert, container) {
    var currentNode = container.firstElementChild,
        nodeTimestamp = nodeToInsert.dataset.timestamp;

    while (currentNode && nodeTimestamp > +currentNode.dataset.timestamp) {
      currentNode = currentNode.nextElementSibling;
    }

    // With this function, "inserting before 'null'" means "appending"
    container.insertBefore(nodeToInsert, currentNode || null);
  },

  showChunkOfMessages: function conv_showChunkOfMessages(number) {
    var elements = this.container.getElementsByClassName('hidden');

    Array.slice(elements, -number).forEach((element) => {
      element.classList.remove('hidden');
      if (element.tagName === 'HEADER') {
        TimeHeaders.update(element);
      }
    });
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

  startEdit: function conv_edit() {
    function editModeSetup() {
      /*jshint validthis:true */
      this.inEditMode = true;
      this.selectionHandler.cleanForm();
      this.mainWrapper.classList.toggle('edit');
    }

    if (!this.selectionHandler) {
      LazyLoader.load('/views/shared/js/selection_handler.js', () => {
        this.selectionHandler = new SelectionHandler({
          // Elements
          container: this.container,
          checkUncheckAllButton: this.checkUncheckAllButton,
          // Methods
          updateSelectionStatus: this.updateSelectionStatus.bind(this),
          getIdIterator: this.getIdIterator.bind(this),
          isInEditMode: this.isInEditMode.bind(this)
        });
        editModeSetup.call(this);
      });
    } else {
      editModeSetup.call(this);
    }
  },

  isInEditMode: function conv_isInEditMode() {
    return this.inEditMode;
  },

  deleteUIMessages: function conv_deleteUIMessages(list, callback) {
    // Strategy:
    // - Delete message/s from the DOM
    // - Update the thread in inbox without re-rendering
    // the entire list
    // - move to thread list if needed

    if (!Array.isArray(list)) {
      list = [list];
    }

    // Removing from DOM all messages to delete
    for (var i = 0, l = list.length; i < l; i++) {
      Threads.unregisterMessage(list[i]);
      ConversationView.removeMessageDOM(
        document.getElementById('message-' + list[i])
      );
    }

    callback = typeof callback === 'function' ? callback : function() {};

    // Do we remove all messages of the Thread?
    if (!ConversationView.container.firstElementChild) {
      callback();
      this.backOrClose();
    } else {
      // Retrieve latest message in the UI
      var lastDateGroup = ConversationView.container.lastElementChild;
      var lastMessage = lastDateGroup.querySelector('li:last-child');
      // We need to make thread-list to show the same info
      var request = MessageManager.getMessage(+lastMessage.dataset.messageId);
      request.onsuccess = function() {
        callback();
        InboxView.updateThread(request.result, { deleted: true });
      };
      request.onerror = function() {
        console.error('Error when updating the list of threads');
        callback();
      };
    }
  },

  delete: function conv_delete() {
    function performDeletion() {
      /* jshint validthis: true */

      WaitingScreen.show();
      var items = this.selectionHandler.selectedList;
      var delNumList = items.map(item => +item);

      // Complete deletion in DB and in UI
      MessageManager.deleteMessages(delNumList,
        function onDeletionDone() {
          ConversationView.deleteUIMessages(delNumList, function() {
            ConversationView.cancelEdit();
            WaitingScreen.hide();
          });
        }
      );
    }

    return Utils.confirm(
      {
        id: 'deleteMessages-confirmation-message',
        args: { n: this.selectionHandler.selectedCount }
      },
      null,
      {
        text: 'delete',
        className: 'danger'
      }
    ).then(performDeletion.bind(this));
  },

  cancelEdit: function conv_cancelEdit() {
    if (this.inEditMode) {
      this.inEditMode = false;
      this.mainWrapper.classList.remove('edit');
    }
  },

  updateSelectionStatus: function conv_updateSelectionStatus() {
    var selected = this.selectionHandler.selectedCount;

    // Manage buttons enabled\disabled state
    if (this.selectionHandler.allSelected()) {
      this.checkUncheckAllButton.setAttribute('data-l10n-id', 'deselect-all');
    } else {
      this.checkUncheckAllButton.setAttribute('data-l10n-id', 'select-all');
    }

    if (selected > 0) {
      this.deleteButton.disabled = false;
      navigator.mozL10n.setAttributes(this.editMode, 'selected-messages',
        {n: selected});
    } else {
      this.deleteButton.disabled = true;
      navigator.mozL10n.setAttributes(this.editMode, 'deleteMessages-title');
    }
  },

  handleMessageClick: function conv_handleMessageClick(evt) {
    var currentNode = evt.target;
    var elems = {};

    // Walk up the DOM, inspecting all the elements
    while (currentNode && currentNode.classList) {
      if (currentNode.classList.contains('bubble')) {
        elems.bubble = currentNode;
      } else if (currentNode.classList.contains('message')) {
        elems.message = currentNode;
      } else if (currentNode.classList.contains('message-status')) {
        elems.messageStatus = currentNode;
      }
      currentNode = currentNode.parentNode;
    }

    // Click event handlers that occur outside of a message element should be
    // defined elsewhere.
    if (!(elems.message && elems.bubble)) {
      return;
    }

    // handle not-downloaded messages
    if (elems.message.classList.contains('not-downloaded')) {

      // do nothing for pending downloads, or expired downloads
      if (elems.message.classList.contains('expired') ||
        elems.message.classList.contains('pending')) {
        return;
      }
      this.retrieveMMS(elems.message);
      return;
    }

    // Do nothing for invalid empty content error because it's not possible to
    // retrieve message again in this edge case.
    if (elems.message.classList.contains('invalid-empty-content')) {
      return;
    }

    // Click events originating from a "message-status" aside of an error
    // message should trigger a prompt for retransmission.
    if (elems.message.classList.contains('error') && elems.messageStatus) {
      Utils.confirm('resend-confirmation').then(() => {
        this.resendMessage(elems.message.dataset.messageId);
      });
    }
  },

  /*
   * Given an element of a message, this function will dive into
   * the DOM for getting the bubble container of this message.
   */
  getMessageBubble: function conv_getMessageContainer(element) {
    var node = element;
    var bubble;

    do {
      if (node.classList.contains('bubble')) {
        bubble = node;
      }

      // If we have a bubble and we reach the li with dataset.messageId
      if (bubble) {
        if (node.dataset && node.dataset.messageId) {
          return {
            id: +node.dataset.messageId,
            node: bubble
          };
        }
      }

      // If we reach the container, quit.
      if (node.id === 'thread-messages') {
        return null;
      }
    } while ((node = node.parentNode));

    return null;
  },

  handleEvent: function conv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (this.inEditMode) {
          return;
        }

        // if the click wasn't on an attachment check for other clicks
        if (!conv_mmsAttachmentClick(evt.target)) {
          this.handleMessageClick(evt);
          LinkActionHandler.onClick(evt);
        }
        return;
      case 'contextmenu':
        evt.preventDefault();
        evt.stopPropagation();

        var messageBubble = this.getMessageBubble(evt.target);

        if (!messageBubble) {
          return;
        }
        var lineClassList = messageBubble.node.parentNode.classList;

        // Show options per single message
        var messageId = messageBubble.id;
        var params = {
          type: 'action',
          header: { l10nId: 'message-options' },
          items:[]
        };

        if (!lineClassList.contains('not-downloaded')) {
          params.items.push({
            l10nId: 'forward',
            method: () => {
              this.navigateToComposer({ messageId: messageId });
            }
          });
        }

        params.items.push(
          {
            l10nId: 'select-text',
            method: (node) => {
              this.enableBubbleSelection(
                node.querySelector('.message-content-body')
              );
            },
            params: [messageBubble.node]
          },
          {
            l10nId: 'view-message-report',
            method: function showMessageReport(messageId) {
              // Fetch the message by id for displaying corresponding message
              // report. threadId here is to make sure thread is updatable
              // when current view report panel.
              Navigation.toPanel('report-view', {
                id: messageId,
                threadId: Threads.currentId
              });
            },
            params: [messageId]
          },
          {
            l10nId: 'delete',
            method: function deleteMessage(messageId) {
              Utils.confirm(
                'deleteMessage-confirmation', null,
                { text: 'delete', className: 'danger' }
              ).then(() => {
                MessageManager.deleteMessages(
                  messageId, () => ConversationView.deleteUIMessages(messageId)
                );
              });
            },
            params: [messageId]
          }
        );

        if (lineClassList.contains('error') &&
            lineClassList.contains('outgoing')) {
          params.items.push({
            l10nId: 'resend-message',
            method: this.resendMessage.bind(this, messageId),
            params: [messageId]
          });
        }

        params.items.push({
          l10nId: 'cancel'
        });

        var options = new OptionMenu(params);
        options.show();

        break;
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
      recipients = Threads.active.participants;
    }

    // Clean composer fields (this lock any repeated click in 'send' button)
    this.disableConvertNoticeBanners();
    this.cleanFields();
    this.enableConvertNoticeBanners();

    // If there was a draft, it just got sent so delete it.
    if (this.draft) {
      Drafts.delete(this.draft).store();
      this.draft = null;
    }

    this.updateHeaderData();

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
          setTimeout(this.close.bind(this), this.LEAVE_ACTIVITY_DELAY);
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

  onMessageSent: function conv_onMessageSent(e) {
    this.setMessageStatus(e.message.id, 'sent');
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
    var serviceId = Settings.getServiceIdByIccId(message.iccId);

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

            Settings.switchMmsSimHandler(serviceId).then(
              this.resendMessage.bind(this, message.id))
            .catch(function(err) {
                err && console.error(
                  'Unexpected error while resending the MMS message', err);
            });
          }.bind(this)
        }
      );
    }
  },

  onDeliverySuccess: function conv_onDeliverySuccess(e) {
    var message = e.message;
    // We need to make sure all the recipients status got success event.
    if (!this.shouldShowDeliveryStatus(message)) {
      return;
    }

    this.setMessageStatus(message.id, 'delivered');
  },

  onReadSuccess: function conv_onReadSuccess(e) {
    var message = e.message;
    // We need to make sure all the recipients status got success event.
    if (!this.shouldShowReadStatus(message)) {
      return;
    }

    this.setMessageStatus(message.id, 'read');
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

  removeMessageDOM: function conv_removeMessageDOM(messageDOM) {
    var messagesContainer = messageDOM.parentNode;

    messageDOM.remove();

    // If we don't have any other messages in the list, then we remove entire
    // date group (date header + messages container).
    if (!messagesContainer.firstElementChild) {
      messagesContainer.parentNode.remove();
    }
  },

  setMessageStatus: function(id, status) {
    var messageDOM = document.getElementById('message-' + id);

    if (!messageDOM || messageDOM.classList.contains(status)) {
      return;
    }

    var newStatusMarkup = this.getMessageStatusMarkup(status),
        oldStatusNode = messageDOM.querySelector('.message-status');

    messageDOM.classList.remove(
      'sending', 'pending', 'sent', 'received', 'delivered', 'read', 'error'
    );
    messageDOM.classList.add(status);

    if (oldStatusNode) {
      oldStatusNode.remove();
    }

    if (newStatusMarkup) {
      messageDOM.querySelector('.message-details').appendChild(
        newStatusMarkup.toDocumentFragment()
      );
    }
  },

  retrieveMMS: function conv_retrieveMMS(messageDOM) {
    // force a number
    var id = +messageDOM.dataset.messageId;
    var iccId = messageDOM.dataset.iccId;

    var request = MessageManager.retrieveMMS(id);

    var button = messageDOM.querySelector('button');

    this.setMessageStatus(id, 'pending');
    button.setAttribute('data-l10n-id', 'downloading-attachment');

    request.onsuccess = (function retrieveMMSSuccess() {
      Threads.unregisterMessage(id);
      this.removeMessageDOM(messageDOM);
    }).bind(this);

    request.onerror = (function retrieveMMSError() {
      this.setMessageStatus(id, 'error');
      button.setAttribute('data-l10n-id', 'download-attachment');

      // Show NonActiveSimCard/Other error dialog while retrieving MMS
      var errorCode = (request.error && request.error.name) ?
        request.error.name : null;

      if (!navigator.mozSettings) {
        console.error('Settings unavailable');
        return;
      }

      // Replacing error code to show more specific error message for this case
      if (errorCode === 'RadioDisabledError') {
        errorCode = 'RadioDisabledToDownloadError';
      }

      if (errorCode) {
        this.showMessageError(errorCode, {
          confirmHandler: function stateResetAndRetry() {
            var serviceId = Settings.getServiceIdByIccId(iccId);
            if (serviceId === null) {
              // TODO Bug 981077 should change this error message
              this.showMessageError('NoSimCardError');
              return;
            }

            // TODO move this before trying to call retrieveMMS in Bug 981077
            // Avoid user to click the download button while sim state is not
            // ready yet.
            this.setMessageStatus(id, 'pending');
            button.setAttribute('data-l10n-id', 'downloading-attachment');
            Settings.switchMmsSimHandler(serviceId).then(
              this.retrieveMMS.bind(this, messageDOM))
            .catch(function(err) {
                err && console.error(
                  'Unexpected error while retrieving the MMS message', err);
            });
          }.bind(this)
        });
      }
    }).bind(this);
  },

  resendMessage: function conv_resendMessage(id) {
    // force id to be a number
    id = +id;

    var request = MessageManager.getMessage(id);

    request.onsuccess = (function() {
      var message = request.result;
      // Strategy:
      // - Delete from the DOM
      // - Resend (the resend will remove from the backend)
      // - resend accepts a optional callback that follows with
      // the result of the resending
      var messageDOM = document.getElementById('message-' + id);
      var resendOpts = {
        message: message,
        onerror: function onError(error) {
          var errorName = error.name;
          this.showMessageSendingError(
            errorName,
            { recipients: error.data.receivers || [error.data.receiver] }
          );
        }.bind(this),
        onsuccess: function() {
           this.onMessageSendRequestCompleted();
        }.bind(this)
      };
      Threads.unregisterMessage(id);
      this.removeMessageDOM(messageDOM);
      MessageManager.resendMessage(resendOpts);
    }).bind(this);
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

  onHeaderActivation: function conv_onHeaderActivation() {
    // Do nothing while in participants list view.
    if (!Navigation.isCurrentPanel('thread')) {
      return;
    }

    var participants = Threads.active && Threads.active.participants;

    // >1 Participants will enter "group view"
    if (participants && participants.length > 1) {
      Navigation.toPanel('group-view', {
        id: Threads.currentId
      });
      return;
    }

    var number = this.headerText.dataset.number;

    var tel, email;
    if (Settings.supportEmailRecipient && Utils.isEmailAddress(number)) {
      email = number;
    } else {
      tel = number;
    }

    if (this.headerText.dataset.isContact === 'true') {
      this.promptContact({
        number: number
      });
    } else {
      this.prompt({
        number: tel,
        email: email,
        isContact: false
      });
    }
  },

  promptContact: function conv_promptContact(opts) {
    opts = opts || {};

    var inMessage = opts.inMessage || false;
    var number = opts.number || '';
    var tel, email;

    if (Settings.supportEmailRecipient && Utils.isEmailAddress(number)) {
      email = number || '';
    } else {
      tel = number || '';
    }

    Contacts.findByAddress(number).then(function(contacts) {
      var isContact = contacts.length;
      var contact = contacts[0];
      var id;

      var fragment;

      if (isContact) {
        id = contact.id;

        fragment = document.createDocumentFragment();

        ContactRenderer.flavor('prompt').render({
          contact: contact,
          input: number,
          target: fragment
        });
      }

      this.prompt({
        number: tel,
        email: email,
        header: fragment,
        contactId: id,
        isContact: isContact,
        inMessage: inMessage
      });
    }.bind(this));
  },

  prompt: function conv_prompt(opt) {
    var complete = (function complete() {
      if (!Navigation.isCurrentPanel('thread')) {
        Navigation.toPanel('thread', { id: Threads.currentId });
      }
    }).bind(this);

    var thread = Threads.active;
    var number = opt.number || '';
    var email = opt.email || '';
    var isContact = opt.isContact || false;
    var inMessage = opt.inMessage || false;
    var header = opt.header;
    var items = [];
    var params;

    // Create a params object.
    //  - complete: callback to be invoked when a
    //      button in the menu is pressed
    //  - header: string or node to display in the
    //      in the header of the option menu
    //  - items: array of options to display in menu
    //
    if (!header && (number || email)) {
      header = document.createElement('bdi');
      header.className = 'unknown-contact-header';
      header.textContent = number || email;
    }

    params = {
      classes: ['contact-prompt'],
      complete: complete,
      header: header || '',
      items: null
    };

    // All non-email activations (except for single participant thread) will
    // see a "Call" option
    if (email) {
      items.push({
        l10nId: 'sendEmail',
        method: function oEmail(param) {
          ActivityPicker.email(param);
        },
        params: [email]
      });
      if (Settings.supportEmailRecipient) {
        items.push({
          l10nId: 'sendMMSToEmail',
          method: () => {
            this.navigateToComposer({ number: email });
          },
          // As we change panel here, we don't want to call 'complete' that
          // changes the panel as well
          incomplete: true
        });
      }
    } else {
      // Multi-participant activations or in-message numbers
      // will include a "Call" and "Send Message" options in the menu
      if ((thread && thread.participants.length > 1) || inMessage) {
        items.push({
          l10nId: 'call',
          method: function() {
            ActivityPicker.dial(number);
          }
        });

        items.push({
          l10nId: 'sendMessage',
          method: () => {
            this.navigateToComposer({ number: number });
          },
          // As we change panel here, we don't want to call 'complete' that
          // changes the panel as well
          incomplete: true
        });
      }
    }

    params.items = items;

    if (!isContact) {
      var newContactInfo = number ? { tel: number } : { email: email };

      // Unknown participants will have options to
      //  - Create A New Contact
      //  - Add To An Existing Contact
      //
      params.items.push({
          l10nId: 'createNewContact',
          method: () => ActivityPicker.createNewContact(newContactInfo)
        },
        {
          l10nId: 'addToExistingContact',
          method: () => ActivityPicker.addToExistingContact(newContactInfo)
        }
      );
    }

    if (opt.contactId && !ActivityClient.hasPendingRequest()) {
        params.items.push({
          l10nId: 'viewContact',
          method: () => ActivityPicker.viewContact({ id: opt.contactId })
        }
      );
    }

    // Menu should not be displayed if no option required, otherwise all
    // activations will see a "Cancel" option
    if (params.items.length === 0) {
      return;
    }

    params.items.push({
      l10nId: 'cancel',
      incomplete: true
    });

    new OptionMenu(params).show();
  },

  discardDraft: function conv_discardDraft() {
    // If we were tracking a draft properly, update the Drafts object entry.
    if (!this.draft) {
      return;
    }

    Drafts.delete(this.draft).store();

    this.draft = null;
  },

  /**
   * Saves currently unsent message content and/or recipients into a Draft
   * object. Preserves currently active draft if specified. Draft preservation
   * is intended to keep this.draft populated with the currently active draft
   * when app is hidden, so that when app becomes visible again, it knows there
   * is a draft to continue to keep track of.
   *
   * @param {boolean?} preserveDraft Optional boolean parameter that indicates
   * whether or not we should preserve draft.
   */
  saveDraft: function conv_saveDraft(preserveDraft) {
    var thread = Threads.active;

    // Do we need to save participants for thread draft?
    var recipients = thread ? thread.participants : this.recipients.numbers;

    var draft = new Draft({
      id: this.draft && this.draft.id,
      threadId: thread && thread.id,
      recipients: recipients,
      content: Compose.getContent(),
      subject: Compose.getSubject(),
      type: Compose.type
    });

    Drafts.add(draft);

    // Set draft property if it is not already set and meant to be preserved.
    if (preserveDraft && !this.draft) {
      this.draft = draft;
    } else if (!preserveDraft) {
      // Clear draft property if not explicitly asked to be preserved by draft
      // replacement case.
      this.draft = null;
    }
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
  },

  /**
   * If the bubble selection mode is disabled, all the non-editable element
   * should be set to user-select: none to prevent selection triggered
   * unexpectedly. Selection functionality should be enabled only by bubble
   * context menu. While in bubble selection mode, context menu is disabled
   * temporary for better use experience.
   * Since long press is used for context menu first, selection need to be
   * triggered by selection API manually. Focus/blur events are used for
   * simulating selection changed event, which is only been used in system.
   * When the node gets blur event, bubble selection mode should be dismissed.
   * @param {Object} node element that contains message bubble text content.
   */
  enableBubbleSelection: function(node) {
    var threadMessagesClass = this.threadMessages.classList;
    var disable = () => {
      this.container.addEventListener('contextmenu', this);
      node.removeEventListener('blur', disable);
      threadMessagesClass.add('editable-select-mode');
      // TODO: Remove this once the gecko could clear selection automatically
      // in bug 1101376.
      window.getSelection().removeAllRanges();
    };

    node.addEventListener('blur', disable);
    this.container.removeEventListener('contextmenu', this);
    threadMessagesClass.remove('editable-select-mode');
    node.focus();
    window.getSelection().selectAllChildren(node);
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
