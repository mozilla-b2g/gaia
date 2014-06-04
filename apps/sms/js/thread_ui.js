/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Compose, Recipients, Utils, AttachmentMenu, Template, Settings,
         SMIL, ErrorDialog, MessageManager, MozSmsFilter, LinkHelper,
         ActivityPicker, ThreadListUI, OptionMenu, Threads, Contacts,
         Attachment, WaitingScreen, MozActivity, LinkActionHandler,
         ActivityHandler, TimeHeaders, ContactRenderer, Draft, Drafts,
         Thread, MultiSimActionButton, LazyLoader, Navigation, Promise */
/*exported ThreadUI */

(function(global) {
'use strict';

var attachmentMap = new WeakMap();
var isEmptyOnBackspace = false;
var isHoldingBackspace = false;

function thui_mmsAttachmentClick(target) {
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
function thui_generateSmilSlides(slides, content) {
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

var ThreadUI = global.ThreadUI = {
  CHUNK_SIZE: 10,
  // duration of the notification that message type was converted
  CONVERTED_MESSAGE_DURATION: 3000,
  IMAGE_RESIZE_DURATION: 3000,
  BANNER_DURATION: 2000,
  // delay between 2 counter updates while composing a message
  UPDATE_DELAY: 500,

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

  timeouts: {
    update: null,
    subjectLengthNotice: null
  },
  multiSimActionButton: null,
  init: function thui_init() {
    var templateIds = [
      'message',
      'not-downloaded',
      'recipient',
      'date-group'
    ];

    Compose.init('messages-compose-form');
    AttachmentMenu.init('attachment-options-menu');

    // Fields with 'messages' label
    [
      'container', 'subheader', 'to-field', 'recipients-list', 'recipient',
      'input', 'compose-form', 'check-all-button', 'uncheck-all-button',
      'contact-pick-button', 'back-button', 'close-button', 'send-button',
      'attach-button', 'delete-button', 'cancel-button', 'subject-input',
      'new-message-notice', 'options-icon', 'edit-mode', 'edit-form',
      'tel-form', 'header-text', 'max-length-notice', 'convert-notice',
      'resize-notice', 'dual-sim-information',
      'new-message-notice', 'subject-max-length-notice'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('messages-' + id);
    }, this);

    this.mainWrapper = document.getElementById('main-wrapper');
    this.threadMessages = document.getElementById('thread-messages');
    this.composerContainer = document.getElementById('composer-container');

    // Allow for stubbing in environments that do not implement the
    // `navigator.mozMobileMessage` API
    this._mozMobileMessage = navigator.mozMobileMessage ||
      window.DesktopMockNavigatormozMobileMessage;

    window.addEventListener('resize', this.resizeHandler.bind(this));

    // binding so that we can remove this listener later
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    document.addEventListener('visibilitychange',
                              this.onVisibilityChange);

    // In case of input, we have to resize the input following UX Specs.
    Compose.on('input', this.messageComposerInputHandler.bind(this));

    Compose.on('type', this.onMessageTypeChange.bind(this));

    // Changes on subject input can change the type of the message
    // and size of fields
    this.subjectInput.addEventListener(
      'keydown', this.onSubjectKeydown.bind(this)
    );

    this.subjectInput.addEventListener(
      'keyup', this.onSubjectKeyup.bind(this)
    );

    this.subjectInput.addEventListener(
      'blur', this.onSubjectBlur.bind(this)
    );

    this.toField.addEventListener(
      'keypress', this.toFieldKeypress.bind(this), true
    );

    this.toField.addEventListener(
      'input', this.toFieldInput.bind(this), true
    );

    this.toField.addEventListener(
      'focus', this.toFieldInput.bind(this), true
    );

    // Handlers for send button and avoiding to hide keyboard instead
    this.sendButton.addEventListener(
      'mousedown', function mouseDown(event) {
        event.preventDefault();
        event.target.classList.add('active');
      }
    );

    this.sendButton.addEventListener(
      'mouseup', function mouseUp(event) {
        event.target.classList.remove('active');
      }
    );

    this.sendButton.addEventListener(
      'mouseout', function mouseOut(event) {
        event.target.classList.remove('active');
      }
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

    this.backButton.addEventListener(
      'click', this.back.bind(this)
    );

    this.closeButton.addEventListener(
      'click', this.close.bind(this)
    );

    this.checkAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this, true)
    );

    this.uncheckAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this, false)
    );

    this.cancelButton.addEventListener(
      'click', this.cancelEdit.bind(this)
    );

    this.optionsIcon.addEventListener(
      'click', this.showOptions.bind(this)
    );

    this.deleteButton.addEventListener(
      'click', this.delete.bind(this)
    );

    this.headerText.addEventListener(
      'click', this.onHeaderActivation.bind(this)
    );

    this.newMessageNotice.addEventListener(
      'click', this.onNewMessageNoticeClick.bind(this)
    );

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
    //  Currently, there are 3 Assimilations.
    //

    var assimilate = this.assimilateRecipients.bind(this);

    // Assimilation 1
    this.input.addEventListener(
      'focus', assimilate
    );
    // Assimilation 1
    this.input.addEventListener(
      'click', assimilate
    );
    // Assimilation 2
    this.attachButton.addEventListener(
      'click', assimilate
    );

    this.container.addEventListener(
      'click', this.handleEvent.bind(this)
    );
    this.container.addEventListener(
      'contextmenu', this.handleEvent.bind(this)
    );
    this.editForm.addEventListener(
      'submit', this.handleEvent.bind(this)
    );
    this.composeForm.addEventListener(
      'submit', this.handleEvent.bind(this)
    );
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

    this.tmpl = templateIds.reduce(function(tmpls, name) {
      tmpls[Utils.camelCase(name)] =
        Template('messages-' + name + '-tmpl');
      return tmpls;
    }, {});

    this.initRecipients();

    // Initialized here, but used in ThreadUI.cleanFields
    this.previousPanel = null;

    this.multiSimActionButton = null;

    this.timeouts.update = null;

    this.shouldChangePanelNextEvent = false;

    this.showErrorInFailedEvent = '';
  },

  onVisibilityChange: function thui_onVisibilityChange(e) {
    // If we leave the app and are in a thread or compose window
    // save a message draft if necessary
    if (document.hidden) {
      // Auto-save draft if the user has entered anything
      // in the composer.
      if ((Navigation.isCurrentPanel('composer') ||
           Navigation.isCurrentPanel('thread')) &&
          (!Compose.isEmpty() || ThreadUI.recipients.length)) {
        ThreadUI.saveDraft({preserve: true, autoSave: true});
        Drafts.store();
      }
    }
  },

  // Initialize Recipients list and Recipients.View (DOM)
  initRecipients: function thui_initRecipients() {
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

        this[strategy](
          record.number, this.validateContact.bind(this, record)
        );
      }

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
        // check for enable send whenever recipients change
        this.enableSend();
      }

      // Clean search result after recipient count change.
      this.container.textContent = '';

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
    }
    this.container.textContent = '';
  },

  initSentAudio: function thui_initSentAudio() {
    if (this.sentAudio) {
      return;
    }

    this.sentAudioKey = 'message.sent-sound.enabled';
    this.sentAudio = new Audio('/sounds/sent.opus');
    this.sentAudio.mozAudioChannelType = 'notification';
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

  getAllInputs: function thui_getAllInputs() {
    if (this.container) {
      return Array.prototype.slice.call(
        this.container.querySelectorAll('input[type=checkbox]')
      );
    } else {
      return [];
    }
  },

  getSelectedInputs: function thui_getSelectedInputs() {
    if (this.container) {
      return Array.prototype.slice.call(
        this.container.querySelectorAll('input[type=checkbox]:checked')
      );
    } else {
      return [];
    }
  },

  messageComposerInputHandler: function thui_messageInputHandler(event) {
    this.enableSend();

    if (Compose.type === 'sms') {
      return;
    }

    if (Compose.isResizing) {
      this.resizeNotice.classList.remove('hide');

      if (this._resizeNoticeTimeout) {
        clearTimeout(this._resizeNoticeTimeout);
        this._resizeNoticeTimeout = null;
      }
    } else {
      // Update counter after image resize complete
      this.updateCounterForMms();
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
  onSubjectKeydown: function thui_onSubjectKeydown(event) {
    if (event.keyCode === event.DOM_VK_BACK_SPACE) {
      if (!isHoldingBackspace) {
        isEmptyOnBackspace = Compose.isSubjectEmpty();
        isHoldingBackspace = true;
      }
    } else {
      isHoldingBackspace = false;
      // We dont let to add more characters if we reach the maximum
      if (Compose.isSubjectMaxLength()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  },
  onSubjectKeyup: function thui_onSubjectKeyup(event) {
    // Show the warning when the subject field has the focus
    if (Compose.isSubjectMaxLength()) {
      this.showSubjectMaxLengthNotice();
    } else {
      this.hideSubjectMaxLengthNotice();
    }
    // User removes subject field by either:
    // - Selecting options menu in top right hand corner, or
    // - Selecting the delete button in the keyboard. if all
    // the text is removed from the subject field and the user
    // selects delete on the keyboard the subject field is removed
    if (event.keyCode === event.DOM_VK_BACK_SPACE &&
        isHoldingBackspace &&
        isEmptyOnBackspace) {
      Compose.toggleSubject();
    }
    isEmptyOnBackspace = false;
    isHoldingBackspace = false;
  },

  onSubjectBlur: function thui_onSubjectBlur() {
    this.hideSubjectMaxLengthNotice();
  },

  showMaxLengthNotice: function thui_showMaxLengthNotice(l10nKey) {
    navigator.mozL10n.localize(
      this.maxLengthNotice.querySelector('p'), l10nKey);
    this.maxLengthNotice.classList.remove('hide');
  },

  hideMaxLengthNotice: function thui_hideMaxLengthNotice() {
    this.maxLengthNotice.classList.add('hide');
  },

  showSubjectMaxLengthNotice: function thui_showSubjectMaxLengthNotice() {
    this.subjectMaxLengthNotice.classList.remove('hide');

    if (this.timeouts.subjectLengthNotice) {
      clearTimeout(this.timeouts.subjectLengthNotice);
    }
    this.timeouts.subjectLengthNotice = setTimeout(
      this.hideSubjectMaxLengthNotice.bind(this),
      this.BANNER_DURATION
    );
  },

  hideSubjectMaxLengthNotice: function thui_hideSubjectMaxLengthNotice() {
    this.subjectMaxLengthNotice.classList.add('hide');
    this.timeouts.subjectLengthNotice &&
      clearTimeout(this.timeouts.subjectLengthNotice);
  },

  /*
   * This function will be called before we slide to the thread or composer
   * panel. This way it can change things in the panel before the panel is
   * visible.
   */
  beforeEnter: function thui_beforeEnter(args) {
    Recipients.View.isFocusable = true;
    if (!this.multiSimActionButton) {
      // handles the various actions on the send button and encapsulates the
      // DSDS specific behavior
      this.multiSimActionButton =
        new MultiSimActionButton(
          this.sendButton,
          this.simSelectedCallback.bind(this),
          Settings.SERVICE_ID_KEYS.smsServiceId
      );

      var simPickerElt = document.getElementById('sim-picker');
      LazyLoader.load([simPickerElt], function() {
        navigator.mozL10n.translate(simPickerElt);
      });
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

  beforeEnterThread: function thui_beforeEnterThread(args) {
    // TODO should we implement hooks to Navigation so that Threads could
    // get an event whenever the panel changes?
    Threads.currentId = args.id;

    return this.updateHeaderData();
  },

  afterEnter: function thui_afterEnter(args) {
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

  afterEnterComposer: function thui_afterEnterComposer(args) {
    // TODO Bug 1010223: should move to beforeEnter
    this.handleActivity(args.activity);
    this.handleForward(args.forward);
    this.handleDraft(+args.draftId);
    this.recipients.focus();

    // not strictly necessary but better for consistency
    return Promise.resolve();
  },

  afterEnterThread: function thui_afterEnterThread(args) {
    var threadId = +args.id;

    var prevPanel = args.meta.prev && args.meta.prev.panel;

    if (prevPanel !== 'group-view' && prevPanel !== 'report-view') {
      this.renderMessages(threadId);

      // Populate draft if there is one
      // TODO merge with handleDraft ? Bug 1010216
      var thread = Threads.get(threadId);
      if (thread.hasDrafts) {
        this.draft = thread.drafts.latest;
        Compose.fromDraft(this.draft);
        this.draft.isEdited = false;
      } else {
        this.draft = null;
      }
    }

    ThreadListUI.mark(threadId, 'read');
    return Utils.closeNotificationsForThread(threadId);
  },

  beforeLeave: function thui_beforeLeave(args) {
    // This should be in afterLeave, but the edit mode interface does not seem
    // to slide correctly. Bug 1009541
    this.cancelEdit();

    // TODO move most of back() here: Bug 1010223
  },

  afterLeave: function thui_afterLeave(args) {
    if (Navigation.isCurrentPanel('thread-list')) {
      this.container.textContent = '';
      this.cleanFields(true);
      this.recipients.length = 0;
      Threads.currentId = null;
    }
    if (!Navigation.isCurrentPanel('composer')) {
      this.threadMessages.classList.remove('new');
    }

    if (!Navigation.isCurrentPanel('thread')) {
      this.threadMessages.classList.remove('has-carrier');
    }
  },

  handleForward: function thui_handleForward(forward) {
    // TODO use a promise here
    if (!forward) {
      return;
    }

    var request = MessageManager.getMessage(+forward.messageId);

    request.onsuccess = (function() {
      Compose.fromMessage(request.result);

      ThreadUI.recipients.focus();
    }).bind(this);

    request.onerror = function() {
      console.error('Error while forwarding:', this.error.name);
    };
  },

  handleActivity: function thui_handleActivity(activity) {
    // TODO use a promise here
    if (!activity) {
      return;
    }
    /**
     * Choose the appropriate contact resolver:
     *  - if we have a phone number and no contact, rely on findByPhoneNumber
     *    to get a contact matching the number;
     *  - if we have a contact object and no phone number, just use a dummy
     *    source that returns the contact.
     */
    var findByPhoneNumber = Contacts.findByPhoneNumber.bind(Contacts);
    var number = activity.number;
    if (activity.contact && !number) {
      findByPhoneNumber = function dummySource(contact, cb) {
        cb(activity.contact);
      };
      number = activity.contact.number || activity.contact.tel[0].value;
    }

    // Add recipients and fill+focus the Compose area.
    if (activity.contact && number) {
      Utils.getContactDisplayInfo(
        findByPhoneNumber, number, function onData(data) {
          data.source = 'contacts';
          ThreadUI.recipients.add(data);
          Compose.fromMessage(activity);
        }
      );
    } else {
      if (number) {
        // If the activity delivered the number of an unknown recipient,
        // create a recipient directly.
        this.recipients.add({
          number: number,
          source: 'manual'
        });
      }
      Compose.fromMessage(activity);
    }
  },

  // recalling draft for composer only
  // Bug 1010216 might use it for thread drafts too
  handleDraft: function thui_handleDraft(threadId) {
    // TODO Bug 1010216: remove this.draft
    var draft = this.draft ||
      Drafts.get(threadId || Threads.currentId);

    // Draft recipients are added as the composer launches
    if (draft) {
      // Recipients will exist for draft messages in threads
      // Otherwise find them from draft recipient numbers
      draft.recipients.forEach(function(number) {
        Contacts.findByPhoneNumber(number, function(records) {
          if (records.length) {
            this.recipients.add(
              Utils.basicContact(number, records[0])
            );
          } else {
            this.recipients.add({
              number: number
            });
          }
        }.bind(this));
      }, this);

      // Render draft contents into the composer input area.
      Compose.fromDraft(draft);

      // Discard this draft object and update the backing store
      Drafts.delete(draft).store();
    }

    if (this.draft) {
      this.draft.isEdited = false;
    }
  },

  beforeEnterComposer: function thui_beforeEnterComposer(args) {
    // TODO add the activity/forward/draft stuff here
    // instead of in afterEnter: Bug 1010223

    Threads.currentId = null;
    this.cleanFields(true);
    this.initRecipients();
    this.updateComposerHeader();
    this.container.textContent = '';
    this.threadMessages.classList.add('new');

    // not strictly necessary but being consistent
    return Promise.resolve();
  },

  assimilateRecipients: function thui_assimilateRecipients() {
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

  onMessageTypeChange: function thui_onMessageType(event) {
    // if we are changing to sms type, we might want to cancel
    if (Compose.type === 'sms') {
      this.updateSmsSegmentLimit(function segmentLimitCallback(overLimit) {
        if (overLimit) {
          // we can't change to sms after all
          Compose.type = 'mms';
          return;
        }

        this.messageComposerTypeHandler();
      }.bind(this));
    } else {
      this.messageComposerTypeHandler();
    }
  },

  // Function for handling when a new message (sent/received)
  // is detected
  onMessage: function onMessage(message) {
    // Update the stored thread data
    Threads.set(message.threadId, Thread.create(message));

    this.appendMessage(message);
    TimeHeaders.updateAll('header[data-time-update]');
  },

  onMessageReceived: function thui_onMessageReceived(message) {
    this.onMessage(message);
    this.scrollViewToBottom();
    if (this.isScrolledManually) {
      this.showNewMessageNotice(message);
    }
  },

  onMessageSending: function thui_onMessageReceived(message) {
    if (Navigation.isCurrentPanel('thread', { id: message.threadId })) {
      this.onMessage(message);
      this.forceScrollViewToBottom();
    } else {
      if (this.shouldChangePanelNextEvent) {
        Navigation.toPanel('thread', { id: message.threadId });
        this.shouldChangePanelNextEvent = false;
      }
    }
  },

  onNewMessageNoticeClick: function thui_onNewMessageNoticeClick(event) {
    event.preventDefault();
    this.hideNewMessageNotice();
    this.forceScrollViewToBottom();
  },

  // Message composer type changed:
  messageComposerTypeHandler: function thui_messageComposerTypeHandler() {
    this.updateCounter();

    var oldType = this.composeForm.dataset.messageType;
    var type = Compose.type;
    if (oldType === type) {
      return;
    }
    this.composeForm.dataset.messageType = type;

    var message = 'converted-to-' + type;
    var messageContainer = this.convertNotice.querySelector('p');
    navigator.mozL10n.localize(messageContainer, message);
    this.convertNotice.classList.remove('hide');

    if (this._convertNoticeTimeout) {
      clearTimeout(this._convertNoticeTimeout);
    }

    this._convertNoticeTimeout = setTimeout(function hideConvertNotice() {
      this.convertNotice.classList.add('hide');
    }.bind(this), this.CONVERTED_MESSAGE_DURATION);
  },

  // Triggered when the onscreen keyboard appears/disappears.
  resizeHandler: function thui_resizeHandler() {
    // Scroll to bottom
    this.scrollViewToBottom();
    // Make sure the caret in the "Compose" area is visible
    Compose.scrollMessageContent();
  },

  // Create a recipient from contacts activity.
  requestContact: function thui_requestContact() {
    // assimilate stranded string before picking a contact.
    this.assimilateRecipients();

    if (typeof MozActivity === 'undefined') {
      console.log('MozActivity unavailable');
      return;
    }

    // Ensure that Recipients does not trigger focus on
    // itself, which causes the keyboard to appear.
    Recipients.View.isFocusable = false;

    var activity = new MozActivity({
      name: 'pick',
      data: {
        type: 'webcontacts/tel'
      }
    });

    activity.onsuccess = (function() {
      if (!activity.result ||
          !activity.result.tel ||
          !activity.result.tel.length ||
          !activity.result.tel[0].value) {
        console.error('The pick activity result is invalid.');
        return;
      }

      Recipients.View.isFocusable = true;

      var data = Utils.basicContact(
        activity.result.tel[0].value, activity.result
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
  updateComposerHeader: function thui_updateComposerHeader() {
    var recipientCount = this.recipients.numbers.length;
    if (recipientCount > 0) {
      navigator.mozL10n.localize(this.headerText, 'recipient', {
          n: recipientCount
      });
    } else {
      navigator.mozL10n.localize(this.headerText, 'newMessage');
    }
    // Check if we need to enable send button.
    this.enableSend();
  },

  // scroll position is considered as "manual" if the view is not completely
  // scrolled to the bottom
  isScrolledManually: false,

  // We define an edge for showing the following chunk of elements
  manageScroll: function thui_manageScroll(oEvent) {
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

  scrollViewToBottom: function thui_scrollViewToBottom() {
    if (!this.isScrolledManually && this.container.lastElementChild) {
      this.container.lastElementChild.scrollIntoView(false);
    }
  },

  forceScrollViewToBottom: function thui_forceScrollViewToBottom() {
    this.isScrolledManually = false;
    this.scrollViewToBottom();
  },

  showNewMessageNotice: function thui_showNewMessageNotice(message) {
    Contacts.findByPhoneNumber(message.sender, (function gotContact(contact) {
      var sender = message.sender;
      if (contact && contact.length) {
        var details = Utils.getContactDetails(sender, contact[0]);
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
    }).bind(this));
  },

  hideNewMessageNotice: function thui_hideNewMessageNotice() {
    this.isNewMessageNoticeShown = false;
    //Hide the new message's banner
    this.newMessageNotice.classList.add('hide');
  },

  close: function thui_close() {
    return this._onNavigatingBack().then(function() {
      ActivityHandler.leaveActivity();
    }).catch(function(e) {
      // If we don't have any error that means that action was rejected
      // intentionally and there is nothing critical to report about.
      e && console.error('Unexpected error while closing the activity: ', e);

      return Promise.reject(e);
    });
  },

  back: function thui_back() {
    if (Navigation.isCurrentPanel('group-view') ||
        Navigation.isCurrentPanel('report-view')) {
      Navigation.toPanel('thread', { id: Threads.currentId });
      this.updateHeaderData();

      return Promise.resolve();
    }

    return this._onNavigatingBack().then(function() {
      this.cleanFields(true);
      Navigation.toPanel('thread-list');
    }.bind(this)).catch(function(e) {
      e && console.error('Unexpected error while navigating back: ', e);

      return Promise.reject(e);
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
          this.saveDraft({autoSave: true});
        } else {
          this.draft = null;
        }
        return;
      }

      return this._showMessageSaveOrDiscardPrompt();
    }.bind(this));
  },

  isKeyboardDisplayed: function thui_isKeyboardDisplayed() {
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
    return new Promise(function(resolve, reject) {
      var options = {
        items: [
          {
            l10nId: this.draft ? 'replace-draft' : 'save-as-draft',
            method: function onSave() {
              this.saveDraft();
              resolve();
            }.bind(this)
          },
          {
            l10nId: 'discard-message',
            method: function onDiscard() {
              this.discardDraft();
              resolve();
            }.bind(this)
          },
          {
            l10nId: 'cancel',
            method: function onCancel() {
              reject();
            }
          }
        ]
      };
      new OptionMenu(options).show();
    }.bind(this));
  },

  enableSend: function thui_enableSend() {
    this.initSentAudio();

    // should disable if we have no message input
    var disableSendMessage = Compose.isEmpty() || Compose.isResizing;
    var messageNotLong = this.updateCounter();
    var recipientsValue = this.recipients.inputValue;
    var hasRecipients = false;

    // Set hasRecipients to true based on the following conditions:
    //
    //  1. There is a valid recipients object
    //  2. One of the following is true:
    //      - The recipients object contains at least 1 valid recipient
    //        - OR -
    //      - There is >=1 character typed and the value is a finite number
    //
    if (this.recipients &&
        (this.recipients.numbers.length ||
          (recipientsValue && isFinite(recipientsValue)))) {

      hasRecipients = true;
    }

    // should disable if the message is too long
    disableSendMessage = disableSendMessage || !messageNotLong;

    // should disable if we have no recipients in the "new thread" view
    disableSendMessage = disableSendMessage ||
      (Navigation.isCurrentPanel('composer') && !hasRecipients);

    this.sendButton.disabled = disableSendMessage;
  },

  // asynchronously updates the counter for sms segments when in text only mode
  // pass 'true' to the callback when the limit is over the segment limit
  updateSmsSegmentLimit: function thui_updateSmsSegmentLimit(callback) {
    if (!(this._mozMobileMessage &&
          this._mozMobileMessage.getSegmentInfoForText)) {
      return false;
    }

    var value = Compose.getText();
    var kMaxConcatenatedMessages = Settings.maxConcatenatedMessages;

    // Use backend api for precise sms segmentation information.
    var smsInfoRequest = this._mozMobileMessage.getSegmentInfoForText(value);
    smsInfoRequest.onsuccess = (function onSmsInfo(event) {
      if (Compose.type !== 'sms') {
        // bailout if the type changed since the request started
        return;
      }

      var smsInfo = event.target.result;
      var segments = smsInfo.segments;
      var availableChars = smsInfo.charsAvailableInLastSegment;

      // in MMS mode, the counter value isn't used anyway, so we can update this
      this.sendButton.dataset.counter = availableChars + '/' + segments;

      // if we are going to force MMS, this is true anyway, so adding
      // has-counter again doesn't hurt us.
      var showCounter = (segments && (segments > 1 || availableChars <= 20));
      this.sendButton.classList.toggle('has-counter', showCounter);

      var overLimit = segments > kMaxConcatenatedMessages;
      callback(overLimit);
    }).bind(this);
    smsInfoRequest.onerror = (function onSmsInfoError(e) {
      this.sendButton.classList.remove('has-counter');
    }).bind(this);
  },

  // will return true if we can send the message, false if we can't send the
  // message
  updateCounter: function thui_updateCount() {
    if (Compose.type === 'mms') {
      return this.updateCounterForMms();
    } else {
      Compose.lock = false;
      if (this.timeouts.update === null) {
        this.timeouts.update = setTimeout(this.updateCounterForSms.bind(this),
            this.UPDATE_DELAY);
      }
      return true;
    }
  },

  updateCounterForSms: function thui_updateCounterForSms() {
    // We nullify this timeout here rather than in the updateSmsSegmentLimit
    // callback because otherwise we could display an information that is not
    // current.
    // With the timeout, the risk of having 2 requests in the same time,
    // returning in a different order, which would actually display old
    // information, is very tiny, so we should be good without adding another
    // lock.
    this.timeouts.update = null;
    this.hideMaxLengthNotice();
    this.updateSmsSegmentLimit((function segmentLimitCallback(overLimit) {
      if (overLimit) {
        Compose.type = 'mms';
      }
    }).bind(this));
    return true;
  },

  updateCounterForMms: function thui_updateCounterForMms() {
    // always turn on the counter for mms, it just displays "MMS"
    this.sendButton.classList.add('has-counter');
    // Counter should be updated when image resizing complete
    if (Compose.isResizing) {
      return false;
    }

    if (Settings.mmsSizeLimitation) {
      if (Compose.size > Settings.mmsSizeLimitation) {
        Compose.lock = true;
        this.showMaxLengthNotice('message-exceeded-max-length');
        return false;
      } else if (Compose.size === Settings.mmsSizeLimitation) {
        Compose.lock = true;
        this.showMaxLengthNotice('messages-max-length-text');
        return true;
      }
    }

    Compose.lock = false;
    this.hideMaxLengthNotice();
    return true;
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  getMessageContainer:
    function thui_getMessageContainer(messageTimestamp, hidden) {
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
    messageDateGroup = this._htmlStringToDomNode(
      this.tmpl.dateGroup.interpolate({
        id: 'mc_' + startOfDayTimestamp,
        timestamp: startOfDayTimestamp.toString(),
        headerTimeUpdate: 'repeat',
        headerTime: messageTimestamp.toString(),
        headerDateOnly: 'true'
      })
    );
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

  updateCarrier: function thui_updateCarrier(thread, contacts, details) {
    var carrierTag = document.getElementById('contact-carrier');
    var threadMessages = this.threadMessages;
    var number = thread.participants[0];
    var carrierDetails;

    // The carrier banner is meaningless and confusing in
    // group message mode.
    if (thread.participants.length === 1 &&
        (contacts && contacts.length)) {

      carrierDetails = Utils.getCarrierTag(
        number, contacts[0].tel, details
      );

      if (carrierDetails) {
        var phoneType = carrierTag.querySelector('.phone-type'),
            phoneDetails = carrierTag.querySelector('.phone-details');

        phoneType.dataset.l10nId = carrierDetails.type;
        // We need this line for the unknown phone type case, so that we display
        // phone type instead of empty string if we can't translate it.
        phoneType.textContent = carrierDetails.type;
        phoneDetails.textContent = carrierDetails.carrier ||
          carrierDetails.number;

        navigator.mozL10n.translate(carrierTag);

        carrierTag.classList.toggle(
          'has-phone-type',
          !!carrierDetails.type
        );
        carrierTag.classList.toggle(
          'has-phone-details',
          carrierDetails.carrier || carrierDetails.number
        );
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
  updateHeaderData: function thui_updateHeaderData() {
    var thread, number, others;

    thread = Threads.active;

    if (!thread) {
      return Promise.resolve();
    }

    number = thread.participants[0];
    others = thread.participants.length - 1;

    // For Desktop testing, there is a fake mozContacts but it's not working
    // completely. So in the case of Desktop testing we are going to execute
    // the callback directly in order to make it work!
    // https://bugzilla.mozilla.org/show_bug.cgi?id=836733
    if (!this._mozMobileMessage) {
      navigator.mozL10n.localize(this.headerText, 'thread-header-text', {
        name: number,
        n: others
      });
      return Promise.resolve();
    }

    // Add data to contact activity interaction
    this.headerText.dataset.number = number;

    return new Promise(function(resolve, reject) {
      Contacts.findByPhoneNumber(number, function gotContact(contacts) {
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
        navigator.mozL10n.localize(this.headerText, 'thread-header-text', {
            name: contactName,
            n: others
        });

        this.updateCarrier(thread, contacts, details);
        resolve();
      }.bind(this));
    }.bind(this));
  },

  initializeRendering: function thui_initializeRendering() {
    // Clean fields
    this.cleanFields();
    this.checkInputs();
    // Clean list of messages
    this.container.innerHTML = '';
    // Initialize infinite scroll params
    this.messageIndex = 0;
    // reset stopRendering boolean
    this._stopRenderingNextStep = false;
  },

  // Method for stopping the rendering when clicking back
  stopRendering: function thui_stopRendering() {
    this._stopRenderingNextStep = true;
  },

  // Method for rendering the first chunk at the beginning
  showFirstChunk: function thui_showFirstChunk() {
    // Show chunk of messages
    ThreadUI.showChunkOfMessages(this.CHUNK_SIZE);
    // Boot update of headers
    TimeHeaders.updateAll('header[data-time-update]');
    // Go to Bottom
    ThreadUI.scrollViewToBottom();
  },

  createMmsContent: function thui_createMmsContent(dataArray) {
    var container = document.createDocumentFragment();
    var scrollViewToBottom = ThreadUI.scrollViewToBottom.bind(ThreadUI);

    dataArray.forEach(function(messageData) {

      if (messageData.blob) {
        var attachment = new Attachment(messageData.blob, {
          name: messageData.name
        });
        var mediaElement = attachment.render(scrollViewToBottom);
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
  renderMessages: function thui_renderMessages(threadId, callback) {
    var onMessagesRendered = (function messagesRendered() {
      if (this.messageIndex < this.CHUNK_SIZE) {
        this.showFirstChunk();
      }

      if (callback) {
        callback();
      }
    }).bind(this);

    function onMessagesDone() {
      setTimeout(
        MessageManager.markThreadRead.bind(MessageManager, filter.threadId)
      );
    }

    var onRenderMessage = (function renderMessage(message) {
      if (this._stopRenderingNextStep) {
        // stop the iteration
        return false;
      }
      this.appendMessage(message,/*hidden*/ true);
      this.messageIndex++;
      if (this.messageIndex === this.CHUNK_SIZE) {
        this.showFirstChunk();
      }
      return true;
    }).bind(this);

    // We initialize all params before rendering
    this.initializeRendering();

    var filter = new MozSmsFilter();
    filter.threadId = threadId;

    // We call getMessages with callbacks
    var renderingOptions = {
      each: onRenderMessage,
      filter: filter,
      invert: false,
      end: onMessagesRendered,
      done: onMessagesDone
    };

    MessageManager.getMessages(renderingOptions);

    // force the next scroll to bottom
    this.isScrolledManually = false;
  },

  // generates the html for not-downloaded messages - pushes class names into
  // the classNames array also passed in, returns an HTML string
  _createNotDownloadedHTML:
  function thui_createNotDownloadedHTML(message, classNames) {
    // default strings:
    var messageL10nId = 'not-downloaded-attachment';
    var downloadL10nId = 'download-attachment';

    // assuming that incoming message only has one deliveryInfo
    var status = message.deliveryInfo[0].deliveryStatus;

    var expireFormatted = Utils.date.format.localeFormat(
      new Date(+message.expiryDate), navigator.mozL10n.get('expiry-date-format')
    );

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
      messageL10nDate: +message.expiryDate,
      messageL10nDateFormat: 'dateTimeFormat_%x',
      downloadL10nId: downloadL10nId
    });
  },

  // Check deliveryStatus for both single and multiple recipient case.
  // In multiple recipient case, we return true only when all the recipients
  // deliveryStatus set to success.
  shouldShowDeliveryStatus: function thui_shouldShowDeliveryStatus(message) {
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
  shouldShowReadStatus: function thui_shouldShowReadStatus(message) {
    // Only mms message has readStatus
    if (message.delivery !== 'sent' || message.type === 'sms' ||
      !message.deliveryInfo) {
      return false;
    }

    return message.deliveryInfo.every(function(info) {
      return info.readStatus === 'success';
    });
  },

  buildMessageDOM: function thui_buildMessageDOM(message, hidden) {
    var bodyHTML = '';
    var delivery = message.delivery;

    var isDelivered = this.shouldShowDeliveryStatus(message);
    var isRead = this.shouldShowReadStatus(message);
    var isNotDownloaded = delivery === 'not-downloaded';
    var isIncoming = delivery === 'received' || isNotDownloaded;

    var messageDOM = document.createElement('li');

    var classNames = ['message', message.type, delivery];
    var attachments = message.attachments;

    // If the MMS has invalid empty content(message without attachment and
    // subject) or contains only subject, we will display corresponding message
    // and layout type in the message bubble.
    //
    // Returning attachments would be different based on gecko version:
    // null in b2g18 / empty array in master.
    var noAttachment = (message.type === 'mms' && !isNotDownloaded &&
      (attachments === null || attachments.length === 0));
    var invalidEmptyContent = (noAttachment && !message.subject);

    classNames.push(isIncoming ? 'incoming' : 'outgoing');

    if (isRead) {
      classNames.push('read');
    } else if (isDelivered) {
      classNames.push('delivered');
    }

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

    messageDOM.className = classNames.join(' ');
    messageDOM.id = 'message-' + message.id;
    messageDOM.dataset.messageId = message.id;
    messageDOM.dataset.iccId = message.iccId;

    messageDOM.innerHTML = this.tmpl.message.interpolate({
      id: String(message.id),
      bodyHTML: bodyHTML,
      timestamp: String(message.timestamp),
      subject: String(message.subject),
      // Incoming and outgoing messages are displayed using different
      // backgrounds, therefore progress indicator should be styled differently.
      progressIndicatorClassName: isIncoming ? 'light' : ''
    }, {
      safe: ['bodyHTML']
    });

    navigator.mozL10n.translate(messageDOM);
    TimeHeaders.update(messageDOM.querySelector('time'));

    var pElement = messageDOM.querySelector('p');
    if (invalidEmptyContent) {
      navigator.mozL10n.localize(pElement, 'no-attachment-text');
    }

    if (message.type === 'mms' && !isNotDownloaded && !noAttachment) { // MMS
      SMIL.parse(message, function(slideArray) {
        pElement.appendChild(ThreadUI.createMmsContent(slideArray));
      });
    }

    return messageDOM;
  },

  appendMessage: function thui_appendMessage(message, hidden) {
    var timestamp = +message.timestamp;

    // look for an old message and remove it first - prevent anything from ever
    // double rendering for now
    var messageDOM = document.getElementById('message-' + message.id);

    if (messageDOM) {
      this.removeMessageDOM(messageDOM);
    }

    // build messageDOM adding the links
    messageDOM = this.buildMessageDOM(message, hidden);

    messageDOM.dataset.timestamp = timestamp;

    // Add to the right position
    var messageContainer = this.getMessageContainer(timestamp, hidden);
    this._insertTimestampedNodeToContainer(messageDOM, messageContainer);

    if (this.mainWrapper.classList.contains('edit')) {
      this.checkInputs();
    }
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

  /**
   * Parses html string to DOM node. Works with html string wrapped into single
   * element only.
   * NOTE: it's supposed that htmlString parameter is sanitized in advance as
   * there aren't any sanitizing checks performed inside this method!
   * @param {string} htmlString Valid html string.
   * @returns {Node} DOM node create from the specified html string.
   * @private
   */
  _htmlStringToDomNode: function(htmlString) {
    var tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlString;
    return tempContainer.firstElementChild;
  },

  showChunkOfMessages: function thui_showChunkOfMessages(number) {
    var elements = ThreadUI.container.getElementsByClassName('hidden');
    for (var i = elements.length - 1; i >= 0; i--) {
      var element = elements[i];
      element.classList.remove('hidden');
      if (element.tagName === 'HEADER') {
        TimeHeaders.update(element);
      }
    }
  },

  cleanForm: function thui_cleanForm() {
    // Reset all inputs
    var inputs = this.allInputs;
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    // Reset vars for deleting methods
    this.checkInputs();
  },

  clear: function thui_clear() {
    this.initRecipients();
  },

  toggleCheckedAll: function thui_select(value) {
    var inputs = this.container.querySelectorAll(
      'input[type="checkbox"]' +
      // value ?
      //   true : query for currently unselected threads
      //   false: query for currently selected threads
      (value ? ':not(:checked)' : ':checked')
    );
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = value;
      this.chooseMessage(inputs[i]);
    }
    this.checkInputs();
  },

  showOptions: function thui_showOptions() {
    /**
      * Different situations depending on the state
      * - 'Add Subject' if there's none, 'Delete subject' if already added
      * - 'Delete messages' for existing conversations
      */
    var params = {
      header: navigator.mozL10n.get('message'),
      items: []
    };

    // Subject management
    params.items.push({
      l10nId: Compose.isSubjectVisible ? 'remove-subject' : 'add-subject',
      method: function tSubject() {
        Compose.toggleSubject();
      }
    });

    // If we are on a thread, we can call to DeleteMessages
    if (Navigation.isCurrentPanel('thread')) {
      params.items.push({
        l10nId: 'deleteMessages-label',
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

  startEdit: function thui_edit() {
    this.inEditMode = true;
    this.cleanForm();

    this.mainWrapper.classList.toggle('edit');

    // Ensure the Edit Mode menu does not occlude the final messages in the
    // thread.
    this.container.style.height = 'calc(100% - ' +
        this.HEADER_HEIGHT + 'px - ' +
        this.editForm.querySelector('menu').offsetHeight + 'px)';
  },

  deleteUIMessages: function thui_deleteUIMessages(list, callback) {
    // Strategy:
    // - Delete message/s from the DOM
    // - Update the thread in thread-list without re-rendering
    // the entire list
    // - move to thread list if needed

    if (!Array.isArray(list)) {
      list = [list];
    }

    // Removing from DOM all messages to delete
    for (var i = 0, l = list.length; i < l; i++) {
      ThreadUI.removeMessageDOM(
        document.getElementById('message-' + list[i])
      );
    }

    callback = typeof callback === 'function' ? callback : function() {};

    // Do we remove all messages of the Thread?
    if (!ThreadUI.container.firstElementChild) {
      // Remove the thread from DOM and go back to the thread-list
      ThreadListUI.removeThread(Threads.currentId);
      callback();
      Navigation.toPanel('thread-list');
    } else {
      // Retrieve latest message in the UI
      var lastMessage = ThreadUI.container.lastElementChild.querySelector(
        'li:last-child'
      );
      // We need to make Thread-list to show the same info
      var request = MessageManager.getMessage(+lastMessage.dataset.messageId);
      request.onsuccess = function() {
        callback();
        ThreadListUI.updateThread(request.result, { deleted: true });
      };
      request.onerror = function() {
        console.error('Error when updating the list of threads');
        callback();
      };
    }
  },

  delete: function thui_delete() {
    var question = navigator.mozL10n.get('deleteMessages-confirmation');
    if (window.confirm(question)) {
      WaitingScreen.show();
      var delNumList = [];
      var inputs = ThreadUI.selectedInputs;
      var length = inputs.length;
      for (var i = 0; i < length; i++) {
        delNumList.push(+inputs[i].value);
      }
      // Complete deletion in DB and in UI
      MessageManager.deleteMessage(delNumList,
        function onDeletionDone() {
          ThreadUI.deleteUIMessages(delNumList, function uiDeletionDone() {
            ThreadUI.cancelEdit();
            WaitingScreen.hide();
          });
        }
      );
    }
  },

  cancelEdit: function thlui_cancelEdit() {
    if (this.inEditMode) {
      this.inEditMode = false;
      this.mainWrapper.classList.remove('edit');
    }
  },

  chooseMessage: function thui_chooseMessage(target) {
    // Toggling red bubble
    // TODO: Can we replace that 'parentNode.parentNode' with something more
    // readable?
    target.parentNode.parentNode.classList.toggle('selected', target.checked);
  },

  checkInputs: function thui_checkInputs() {
    var selected = this.selectedInputs;
    var allInputs = this.allInputs;

    var isAnySelected = selected.length > 0;

    // Manage buttons enabled\disabled state
    this.checkAllButton.disabled = selected.length === allInputs.length;
    this.uncheckAllButton.disabled = !isAnySelected;
    this.deleteButton.disabled = !isAnySelected;

    if (isAnySelected) {
      navigator.mozL10n.localize(this.editMode, 'selected',
        {n: selected.length});
    } else {
      navigator.mozL10n.localize(this.editMode, 'deleteMessages-title');
    }
  },

  handleMessageClick: function thui_handleMessageClick(evt) {
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
      if (window.confirm(navigator.mozL10n.get('resend-confirmation'))) {
        this.resendMessage(elems.message.dataset.messageId);
      }
      return;
    }
  },

  /*
   * Given an element of a message, this function will dive into
   * the DOM for getting the bubble container of this message.
   */
  getMessageBubble: function thui_getMessageContainer(element) {
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

  handleEvent: function thui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (this.inEditMode) {
          var input = evt.target.parentNode.querySelector('input');
          if (input) {
            this.chooseMessage(input);
            this.checkInputs();
          }
          return;
        }

        // If we're in composer, let's focus on message editor on click.
        if (Navigation.isCurrentPanel('composer')) {
          Compose.focus();
          return;
        }

        // if the click wasn't on an attachment check for other clicks
        if (!thui_mmsAttachmentClick(evt.target)) {
          this.handleMessageClick(evt);
          LinkActionHandler.onClick(evt);
        }
        return;
      case 'contextmenu':
        evt.preventDefault();
        evt.stopPropagation();
        var messageBubble = this.getMessageBubble(evt.target);
        var lineClassList = messageBubble.node.parentNode.classList;

        if (!messageBubble) {
          return;
        }

        // Show options per single message
        var messageId = messageBubble.id;
        var params = {
          type: 'action',
          header: navigator.mozL10n.get('message-options'),
          items:[]
        };

        if (!lineClassList.contains('not-downloaded')) {
          params.items.push({
            l10nId: 'forward',
            method: function forwardMessage(messageId) {
              Navigation.toPanel('composer', {
                forward: {
                  messageId: messageId
                }
              });
            },
            params: [messageId]
          });
        }

        params.items.push(
          {
            l10nId: 'view-message-report',
            method: function showMessageReport(messageId) {
              // Fetch the message by id and display report
              Navigation.toPanel('report-view', {
                id: messageId
              });
            },
            params: [messageId]
          },
          {
            l10nId: 'delete',
            method: function deleteMessage(messageId) {
              // Complete deletion in DB and UI
              MessageManager.deleteMessage(messageId,
                function onDeletionDone() {
                  ThreadUI.deleteUIMessages(messageId);
                }
              );
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

  cleanFields: function thui_cleanFields(forceClean) {
    var clean = (function clean() {
      // Compose.clear might cause a conversion from mms -> sms
      // Therefore we're reseting the message type here because
      // in messageComposerTypeHandler we're using this value to know
      // if the message type changed, and to display the convertNotice
      // accordingly
      this.composeForm.dataset.messageType = 'sms';

      Compose.clear();

      // reset the counter
      this.sendButton.dataset.counter = '';
      this.sendButton.classList.remove('has-counter');
    }).bind(this);

    // TODO understand this : bug 1009568
    if (Navigation.isCurrentPanel(this.previousPanel) ||
        (this.previousPanel && this.previousPanel.panel === 'composer')) {
      if (forceClean) {
        clean();
      }
    } else {
      clean();
    }
    this.enableSend();
    this.previousPanel = Navigation.getCurrentPanel();
  },

  onSendClick: function thui_onSendClick() {
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
  simSelectedCallback: function thui_simSelected(phoneNumber, cardIndex) {
    if (Compose.isEmpty()) {
      return;
    }

    cardIndex = +cardIndex;
    if (isNaN(cardIndex)) {
      cardIndex = 0;
    }

    this.sendMessage({ serviceId: cardIndex });
  },

  sendMessage: function thui_sendMessage(opts) {
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
    this.cleanFields(true);

    // If there was a draft, it just got sent
    // so delete it
    if (this.draft) {
      ThreadListUI.removeThread(this.draft.id);
      Drafts.delete(this.draft);
      Drafts.store();
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
        if (ActivityHandler.isInActivity()) {
          setTimeout(this.close.bind(this), this.LEAVE_ACTIVITY_DELAY);
        }
      }

    } else {
      var smilSlides = content.reduce(thui_generateSmilSlides, []);
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
  },

  onMessageSent: function thui_onMessageSent(message) {
    var messageDOM = document.getElementById('message-' + message.id);

    if (!messageDOM) {
      return;
    }

    // Update class names to reflect message state
    messageDOM.classList.remove('sending');
    messageDOM.classList.add('sent');
  },

  /**
   * Fires once message (both SMS and MMS) send/resend request initiated by the
   * current application instance is successfully completed.
   */
  onMessageSendRequestCompleted: function thui_onMessageSendRequestCompleted() {
    // Play the audio notification
    if (this.sentAudioEnabled) {
      this.sentAudio.play();
    }
  },

  onMessageFailed: function thui_onMessageFailed(message) {
    var messageDOM = document.getElementById('message-' + message.id);
    var serviceId = Settings.getServiceIdByIccId(message.iccId);
    // When this is the first message in a thread, we haven't displayed
    // the new thread yet. The error flag will be shown when the thread
    // will be rendered. See Bug 874043
    if (messageDOM) {

      // Check if it was painted as 'error' before
      if (messageDOM.classList.contains('error')) {
        return;
      }

      // Update class names to reflect message state
      messageDOM.classList.remove('sending');
      messageDOM.classList.add('error');
    }

    if (this.showErrorInFailedEvent === 'NonActiveSimCardError') {
      this.showErrorInFailedEvent = '';
      this.showMessageError(
        'NonActiveSimCardToSendError',
        {
          confirmHandler: function() {
            // Update messageDOM state to 'sending' while sim switching
            messageDOM.classList.remove('error');
            messageDOM.classList.add('sending');

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

  onDeliverySuccess: function thui_onDeliverySuccess(message) {
    // We need to make sure all the recipients status got success event.
    if (!this.shouldShowDeliveryStatus(message)) {
      return;
    }

    var messageDOM = document.getElementById('message-' + message.id);

    if (!messageDOM) {
      return;
    }
    // Update class names to reflect message state
    messageDOM.classList.add('delivered');
  },

  onReadSuccess: function thui_onReadSuccess(message) {
    // We need to make sure all the recipients status got success event.
    if (!this.shouldShowReadStatus(message)) {
      return;
    }

    var messageDOM = document.getElementById('message-' + message.id);

    if (!messageDOM) {
      return;
    }
    // Update class names to reflect message state
    messageDOM.classList.remove('delivered');
    messageDOM.classList.add('read');
  },

  // Some error return from sending error need some specific action instead of
  // showing the error prompt directly.
  showMessageSendingError: function thui_showMsgSendingError(errorName, opts) {
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

  showMessageError: function thui_showMessageOnError(errorName, opts) {
    var dialog = new ErrorDialog(errorName, opts);
    dialog.show();
  },

  removeMessageDOM: function thui_removeMessageDOM(messageDOM) {
    var messagesContainer = messageDOM.parentNode;

    messageDOM.remove();

    // If we don't have any other messages in the list, then we remove entire
    // date group (date header + messages container).
    if (!messagesContainer.firstElementChild) {
      messagesContainer.parentNode.remove();
    }
  },

  retrieveMMS: function thui_retrieveMMS(messageDOM) {
    // force a number
    var id = +messageDOM.dataset.messageId;
    var iccId = messageDOM.dataset.iccId;

    var request = MessageManager.retrieveMMS(id);

    var button = messageDOM.querySelector('button');

    messageDOM.classList.add('pending');
    messageDOM.classList.remove('error');
    navigator.mozL10n.localize(button, 'downloading-attachment');

    request.onsuccess = (function retrieveMMSSuccess() {
      this.removeMessageDOM(messageDOM);
    }).bind(this);

    request.onerror = (function retrieveMMSError() {
      messageDOM.classList.remove('pending');
      messageDOM.classList.add('error');
      navigator.mozL10n.localize(button, 'download-attachment');

      // Show NonActiveSimCard/Other error dialog while retrieving MMS
      var errorCode = (request.error && request.error.name) ?
        request.error.name : null;

      if (!navigator.mozSettings) {
        console.error('Settings unavailable');
        return;
      }

      if (errorCode) {
        this.showMessageError(errorCode, {
          messageId: id,
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
            messageDOM.classList.add('pending');
            messageDOM.classList.remove('error');
            navigator.mozL10n.localize(button, 'downloading-attachment');
            Settings.switchMmsSimHandler(serviceId).then(
              this.retrieveMMS.bind(this, messageDOM))
            .catch(function(err) {
                err && console.error(
                  'Unexpected error while resending the MMS message', err);
            });
          }.bind(this)
        });
      }
    }).bind(this);
  },

  resendMessage: function thui_resendMessage(id) {
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
          this.showMessageSendingError(errorName);
        }.bind(this),
        onsuccess: function() {
           this.onMessageSendRequestCompleted();
        }.bind(this)
      };
      this.removeMessageDOM(messageDOM);
      MessageManager.resendMessage(resendOpts);
    }).bind(this);
  },

  toFieldKeypress: function(event) {
    if (event.keyCode === 13 || event.keyCode === event.DOM_VK_ENTER) {
      this.container.textContent = '';
    }
  },

  toFieldInput: function(event) {
    var typed;

    if (event.target.isPlaceholder) {
      typed = event.target.textContent.trim();
      this.searchContact(typed, this.listContacts.bind(this));
    }

    this.enableSend();
  },

  exactContact: function thui_searchContact(fValue, handler) {
    Contacts.findExact(fValue, handler.bind(null, fValue));
  },

  searchContact: function thui_searchContact(fValue, handler) {
    if (!fValue) {
      // In cases where searchContact was invoked for "input"
      // that was actually a "delete" that removed the last
      // character in the recipient input field,
      // eg. type "a", then delete it.
      // Always remove the the existing results.
      this.container.textContent = '';
      return;
    }

    Contacts.findByString(fValue, handler.bind(null, fValue));
  },

  validateContact: function thui_validateContact(source, fValue, contacts) {
    // fValue is currently unused here, but must be in the parameter
    // list in order for exactContact and searchContact to both use
    // validateContact as a handler.
    //
    var isInvalid = true;
    var index = this.recipients.length - 1;
    var last = this.recipientsList.lastElementChild;
    var typed = last && last.textContent.trim();
    var isContact = false;
    var record, tel, length, number, contact;

    if (index < 0) {
      index = 0;
    }

    // If there is greater than zero matches,
    // process the first found contact into
    // an accepted Recipient.
    if (contacts && contacts.length) {
      isInvalid = false;
      record = contacts[0];
      length = record.tel.length;

      // Received an exact match with a single tel record
      if (source.isLookupable && !source.isQuestionable && length === 1) {
        if (Utils.probablyMatches(record.tel[0].value, fValue)) {
          isContact = true;
          number = record.tel[0].value;
        }
      } else {
        // Received an exact match that may have multiple tel records
        for (var i = 0; i < length; i++) {
          tel = record.tel[i];
          if (this.recipients.numbers.indexOf(tel.value) === -1) {
            number = tel.value;
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

  listContacts: function thui_listContacts(fValue, contacts) {
    // If the user has cleared the typed input before the
    // results came back, prevent the results from being rendered
    // by returning immediately.
    if (!this.recipients.inputValue) {
      return;
    }

    this.container.textContent = '';
    if (!contacts || !contacts.length) {
      return;
    }

    // There are contacts that match the input.

    // TODO Modify in Bug 861227 in order to create a standalone element
    var ul = document.createElement('ul');
    ul.classList.add('contact-list');
    ul.addEventListener('click', function ulHandler(event) {
      event.stopPropagation();
      event.preventDefault();
      // Since the "dataset" DOMStringMap property is essentially
      // just an object of properties that exactly match the properties
      // used for recipients, push the whole dataset object into
      // the current recipients list as a new entry.
      this.recipients.add(
        event.target.dataset
      ).focus();

      // Clean up the event listener
      ul.removeEventListener('click', ulHandler);
    }.bind(this));

    // Render each contact in the contacts results
    var renderer = ContactRenderer.flavor('suggestion');
    var unknownContactsRenderer = ContactRenderer.flavor('suggestionUnknown');

    contacts.forEach(function(contact) {
      var rendererArg = {
        contact: contact,
        input: fValue,
        target: ul,
        skip: this.recipients.numbers
      };
      if (contact.source != 'unknown') {
        renderer.render(rendererArg);
      }
      else {
        unknownContactsRenderer.render(rendererArg);
      }
    }, this);

    this.container.appendChild(ul);
  },

  onHeaderActivation: function thui_onHeaderActivation() {
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

    if (this.headerText.dataset.isContact === 'true') {
      this.promptContact({
        number: number
      });
    } else {
      this.prompt({
        number: number,
        isContact: false
      });
    }
  },

  promptContact: function thui_promptContact(opts) {
    opts = opts || {};

    var inMessage = opts.inMessage || false;
    var number = opts.number || '';

    Contacts.findByPhoneNumber(number, function(results) {
      var isContact = results && results.length;
      var contact = results[0];
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
        number: number,
        header: fragment || number,
        contactId: id,
        isContact: isContact,
        inMessage: inMessage
      });
    }.bind(this));
  },

  prompt: function thui_prompt(opt) {
    var complete = (function complete() {
      if (!Navigation.isCurrentPanel('thread')) {
        Navigation.toPanel('thread', { id: Threads.currentId });
      }
    }).bind(this);

    var thread = Threads.get(Threads.currentId);
    var number = opt.number || '';
    var email = opt.email || '';
    var isContact = opt.isContact || false;
    var inMessage = opt.inMessage || false;
    var header = opt.header || number || email || '';
    var items = [];
    var params, props;

    // Create a params object.
    //  - complete: callback to be invoked when a
    //      button in the menu is pressed
    //  - header: string or node to display in the
    //      in the header of the option menu
    //  - items: array of options to display in menu
    //
    params = {
      classes: ['contact-prompt'],
      complete: complete,
      header: header,
      items: null
    };

    // All non-email activations will see a "Call" option
    if (email) {
      items.push({
        l10nId: 'sendEmail',
        method: function oEmail(param) {
          ActivityPicker.email(param);
        },
        params: [email]
      });
    } else {
      items.push({
        l10nId: 'call',
        method: function oCall(param) {
          ActivityPicker.dial(param);
        },
        params: [number]
      });

      // Multi-participant activations or in-message numbers
      // will include a "Send Message" option in the menu
      if ((thread && thread.participants.length > 1) || inMessage) {
        items.push({
          l10nId: 'sendMessage',
          method: function oMessage(param) {
            ActivityPicker.sendMessage(param);
          },
          params: [number],
          // As activity picker changes the panel we don't want
          // to call 'complete' that changes the panel as well
          incomplete: true
        });
      }
    }

    params.items = items;

    if (!isContact) {

      props = [
        number ? {tel: number} : {email: email}
      ];

      // Unknown participants will have options to
      //  - Create A New Contact
      //  - Add To An Existing Contact
      //
      params.items.push({
          l10nId: 'createNewContact',
          method: function oCreate(param) {
            ActivityPicker.createNewContact(
              param, ThreadUI.onCreateContact
            );
          },
          params: props
        },
        {
          l10nId: 'addToExistingContact',
          method: function oAdd(param) {
            ActivityPicker.addToExistingContact(
              param, ThreadUI.onCreateContact
            );
          },
          params: props
        }
      );
    }

    if (opt.contactId) {

        props = [{ id: opt.contactId }];

        params.items.push({
          l10nId: 'viewContact',
          method: function oView(param) {
            ActivityPicker.viewContact(
              param
            );
          },
          params: props
        }
      );
    }

    // All activations will see a "Cancel" option
    params.items.push({
      l10nId: 'cancel',
      incomplete: true
    });

    new OptionMenu(params).show();
  },

  onCreateContact: function thui_onCreateContact() {
    ThreadListUI.updateContactsInfo();
    // Update Header if needed
    if (Navigation.isCurrentPanel('thread')) {
      ThreadUI.updateHeaderData();
    }
  },

  discardDraft: function thui_discardDraft() {
    // If we were tracking a draft
    // properly update the Drafts object
    // and ThreadList entries
    if (this.draft) {
      Drafts.delete(this.draft);
      if (Threads.active) {
        Threads.active.timestamp = Date.now();
        ThreadListUI.updateThread(Threads.active);
      } else {
        ThreadListUI.removeThread(this.draft.id);
      }
      this.draft = null;
    }
  },

   /**
   * saveDraft
   *
   * Saves the currently unsent message content or recipients
   * into a Draft object.  Preserves the currently marked
   * draft if specified.  Draft preservation is intended to
   * keep this.draft populated with the currently
   * showing draft when the app is hidden, so when the app
   * comes out of hiding, it knows there is a draft to continue
   * to keep track of.
   *
   * @param {Object} opts Optional parameters for saving a draft.
   *                  - preserve, boolean whether or not to preserve draft.
   *                  - autoSave, boolean whether this is an auto save.
   */
  saveDraft: function thui_saveDraft(opts) {
    var content, draft, recipients, subject, thread, threadId, type;

    content = Compose.getContent();
    subject = Compose.getSubject();
    type = Compose.type;

    if (Threads.active) {
      recipients = Threads.active.participants;
      threadId = Threads.currentId;
    } else {
      recipients = this.recipients.numbers;
    }

    var draftId = this.draft ? this.draft.id : null;

    draft = new Draft({
      recipients: recipients,
      content: content,
      subject: subject,
      threadId: threadId,
      type: type,
      id: draftId
    });

    Drafts.add(draft);

    // If an existing thread list item is associated with
    // the presently saved draft, update the displayed Thread
    if (threadId) {
      thread = Threads.active || Threads.get(threadId);

      // Overwrite the thread's own timestamp with
      // the drafts timestamp.
      thread.timestamp = draft.timestamp;

      ThreadListUI.updateThread(thread);
    } else {
      ThreadListUI.updateThread(draft);
    }

    // Clear the MessageManager draft if
    // not explicitly preserved for the
    // draft replacement case
    if (!opts || (opts && !opts.preserve)) {
      this.draft = null;
    }

    // Set the MessageManager draft if it is
    // not already set and meant to be preserved
    if (!this.draft && (opts && opts.preserve)) {
      this.draft = draft;
    }

    // Show draft saved banner if not an
    // auto save operation
    if (!opts || (opts && !opts.autoSave)) {
      ThreadListUI.onDraftSaved();
    }
  }
};

Object.defineProperty(ThreadUI, 'allInputs', {
  get: function() {
    return this.getAllInputs();
  }
});

Object.defineProperty(ThreadUI, 'selectedInputs', {
  get: function() {
    return this.getSelectedInputs();
  }
});

window.confirm = window.confirm; // allow override in unit tests

}(this));
