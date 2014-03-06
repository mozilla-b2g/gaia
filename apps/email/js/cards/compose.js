/**
 * Card definitions/logic for composition, contact picking, and attaching
 * things.  Although ideally, the picking and attaching will be handled by a
 * web activity or shared code.
 **/

/*jshint browser: true */
/*global define, console, MozActivity, alert */
define(function(require) {

var templateNode = require('tmpl!./compose.html'),
    cmpAttachmentItemNode = require('tmpl!./cmp/attachment_item.html'),
    cmpContactMenuNode = require('tmpl!./cmp/contact_menu.html'),
    cmpDraftMenuNode = require('tmpl!./cmp/draft_menu.html'),
    cmpPeepBubbleNode = require('tmpl!./cmp/peep_bubble.html'),
    cmpSendFailedConfirmNode = require('tmpl!./cmp/send_failed_confirm.html'),
    cmpSendingContainerNode = require('tmpl!./cmp/sending_container.html'),
    msgAttachConfirmNode = require('tmpl!./msg/attach_confirm.html'),
    common = require('mail_common'),
    model = require('model'),
    iframeShims = require('iframe_shims'),
    Marquee = require('marquee'),
    mozL10n = require('l10n!'),

    prettyFileSize = common.prettyFileSize,
    Cards = common.Cards,
    ConfirmDialog = common.ConfirmDialog;

/**
 * Max composer attachment size is defined as 5120000 bytes.
 */
var MAX_ATTACHMENT_SIZE = 5120000;

/**
 * To make it easier to focus input boxes, we have clicks on their owning
 * container cause a focus event to occur on the input.  This method helps us
 * also position the cursor based on the location of the click so the cursor
 * can end up at the edges of the input box which could otherwise be very hard
 * to do.
 */
function focusInputAndPositionCursorFromContainerClick(event, input) {
  // Do not do anything if the event is happening on the input already or we
  // will disrupt the default positioning logic!  We use explicitOriginalTarget
  // because under Gecko originalTarget may contain anonymous content.
  if (event.explicitOriginalTarget === input)
    return;

  // coordinates are relative to the viewport origin
  var bounds = input.getBoundingClientRect();
  var midX = bounds.left + bounds.width / 2;
  // and that's what clientX is too!
  input.focus();
  var cursorPos = 0;
  if (event.clientX >= midX) {
    cursorPos = input.value.length;
  }
  input.setSelectionRange(cursorPos, cursorPos);
}

/**
 * Composer card; wants an initialized message composition object when it is
 * created (for now).
 */
function ComposeCard(domNode, mode, args) {
  this.domNode = domNode;
  this.composer = args.composer;
  this.composerData = args.composerData || {};
  this.activity = args.activity;
  this.sending = false;

  domNode.getElementsByClassName('cmp-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this), false);
  this.sendButton = domNode.getElementsByClassName('cmp-send-btn')[0];
  this.sendButton.addEventListener('click', this.onSend.bind(this), false);
  this._bound_onVisibilityChange = this.onVisibilityChange.bind(this);
  document.addEventListener('visibilitychange',
                            this._bound_onVisibilityChange);

  this.toNode = domNode.getElementsByClassName('cmp-to-text')[0];
  this.ccNode = domNode.getElementsByClassName('cmp-cc-text')[0];
  this.bccNode = domNode.getElementsByClassName('cmp-bcc-text')[0];
  this.subjectNode = domNode.getElementsByClassName('cmp-subject-text')[0];
  this.textBodyNode = domNode.getElementsByClassName('cmp-body-text')[0];
  this.textBodyNode.addEventListener('input',
                                     this.onTextBodyDelta.bind(this));
  this.textBodyNode.addEventListener('change',
                                     this.onTextBodyDelta.bind(this));
  this.htmlBodyContainer = domNode.getElementsByClassName('cmp-body-html')[0];
  this.htmlIframeNode = null;

  this.scrollContainer =
    domNode.getElementsByClassName('scrollregion-below-header')[0];

  // Add input event listener for handling the bubble creation/deletion.
  this.toNode.addEventListener('keydown', this.onAddressKeydown.bind(this));
  this.ccNode.addEventListener('keydown', this.onAddressKeydown.bind(this));
  this.bccNode.addEventListener('keydown', this.onAddressKeydown.bind(this));
  this.toNode.addEventListener('input', this.onAddressInput.bind(this));
  this.ccNode.addEventListener('input', this.onAddressInput.bind(this));
  this.bccNode.addEventListener('input', this.onAddressInput.bind(this));
  // Add Contact-add buttons event listener
  var addBtns = domNode.getElementsByClassName('cmp-contact-add');
  for (var i = 0; i < addBtns.length; i++) {
    addBtns[i].addEventListener('click', this.onContactAdd.bind(this));
  }
  // Add input focus:
  var containerList = domNode.getElementsByClassName('cmp-combo');
  for (var i = 0; i < containerList.length; i++) {
    containerList[i].addEventListener('click',
      this.onContainerClick.bind(this));
  }
  // Add attachments area event listener
  var attachmentBtns =
    domNode.getElementsByClassName('cmp-attachment-btn');
  for (var i = 0; i < attachmentBtns.length; i++) {
    attachmentBtns[i].addEventListener('click',
                                       this.onAttachmentAdd.bind(this));
  }

  // Add subject focus for larger hitbox
  var subjectContainer = domNode.querySelector('.cmp-subject');
  subjectContainer.addEventListener('click', function subjectFocus(evt) {
    focusInputAndPositionCursorFromContainerClick(
      evt, subjectContainer.querySelector('input'));
  });

  // Sent sound init
  this.sentAudioKey = 'mail.sent-sound.enabled';
  this.sentAudio = new Audio('/sounds/sent.ogg');
  this.sentAudio.mozAudioChannelType = 'notification';
  this.sentAudioEnabled = false;

  if (navigator.mozSettings) {
    var req = navigator.mozSettings.createLock().get(this.sentAudioKey);
    req.onsuccess = (function onsuccess() {
      this.sentAudioEnabled = req.result[this.sentAudioKey];
    }).bind(this);

    navigator.mozSettings.addObserver(this.sentAudioKey, (function(e) {
      this.sentAudioEnabled = e.settingValue;
    }).bind(this));
  }
}
ComposeCard.prototype = {
  postInsert: function() {
    // the HTML bit needs us linked into the DOM so the iframe can be
    // linked in, hence this happens in postInsert.
    require(['iframe_shims'], function() {
      if (this.composer) {
        this._loadStateFromComposer();
      } else {
        var data = this.composerData;
        model.latestOnce('folder', function(folder) {
          this.composer = model.api.beginMessageComposition(data.message,
                                                            folder,
                                                            data.options,
                                                            function() {
            if (data.onComposer)
              data.onComposer(this.composer);

            this._loadStateFromComposer();
          }.bind(this));
        }.bind(this));
      }
    }.bind(this));
  },

  _loadStateFromComposer: function() {
    var self = this;
    function expandAddresses(node, addresses) {
      if (!addresses)
        return '';
      var container = node.parentNode;
      var normed = addresses.map(function(aval) {
        var name, address;
        if (typeof(aval) === 'string') {
          // TODO: We will apply email address parser for showing bubble
          //       properly. We set both name and address same as aval string
          //       before parser is ready.
          name = address = aval;
        } else {
          name = aval.name;
          address = aval.address;
        }
        self.insertBubble(node, name, address);
      });
    }
    expandAddresses(this.toNode, this.composer.to);
    expandAddresses(this.ccNode, this.composer.cc);
    expandAddresses(this.bccNode, this.composer.bcc);

    if (this.isEmptyAddress()) {
      this.sendButton.setAttribute('aria-disabled', 'true');
    }

    // Add attachments
    this.insertAttachments();

    this.subjectNode.value = this.composer.subject;
    this.textBodyNode.value = this.composer.body.text;
    // force the textarea to be sized.
    this.onTextBodyDelta();

    if (this.composer.body.html) {
      // Although (still) sanitized, this is still HTML we did not create and so
      // it gets to live in an iframe.  Its read-only and the user needs to be
      // able to see what they are sending, so reusing the viewing functionality
      // is desirable.
      var ishims = iframeShims.createAndInsertIframeForContent(
        this.composer.body.html, this.scrollContainer,
        this.htmlBodyContainer, /* append */ null,
        'noninteractive',
        /* no click handler because no navigation desired */ null);
      this.htmlIframeNode = ishims.iframe;
    }
  },

  _saveStateToComposer: function() {
    function frobAddressNode(node) {
      var container = node.parentNode;
      var addrList = [];
      var bubbles = container.querySelectorAll('.cmp-peep-bubble');
      for (var i = 0; i < bubbles.length; i++) {
        var dataSet = bubbles[i].dataset;
        addrList.push({ name: dataSet.name, address: dataSet.address });
      }
      if (node.value.trim().length !== 0) {
        var mailbox = model.api.parseMailbox(node.value);
        addrList.push({ name: mailbox.name, address: mailbox.address });
      }
      return addrList;
    }
    this.composer.to = frobAddressNode(this.toNode);
    this.composer.cc = frobAddressNode(this.ccNode);
    this.composer.bcc = frobAddressNode(this.bccNode);
    this.composer.subject = this.subjectNode.value;
    this.composer.body.text = this.textBodyNode.value;
    // The HTML representation cannot currently change in our UI, so no
    // need to save it.  However, what we send to the back-end is what gets
    // sent, so if you want to implement editing UI and change this here,
    // go crazy.
  },

  _closeCard: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  _saveNeeded: function() {
    var self = this;
    var checkAddressEmpty = function() {
      var bubbles = self.domNode.querySelectorAll('.cmp-peep-bubble');
      if (bubbles.length === 0 && !self.toNode.value && !self.ccNode.value &&
          !self.bccNode.value)
        return true;
      else
        return false;
    };

    // We need to save / ask about deleting the draft if:
    // There's any recipients listed, there's a subject, there's anything in the
    // body, there are attachments, or we already created a draft for this
    // guy in which case we really want to provide the option to delete the
    // draft.
    return (this.subjectNode.value || this.textBodyNode.value ||
        !checkAddressEmpty() || this.composer.attachments.length ||
        this.composer.hasDraft);
  },

  _saveDraft: function(reason) {
    // If the send process is happening, suppress automatic saves.
    // (Manual saves should not happen when 'sending' is true, but breaking
    // auto-saves would be very bad form.)
    if (this.sending && reason === 'automatic') {
      console.log('compose: skipping autosave because send in progress');
      return;
    }
    this._saveStateToComposer();
    this.composer.saveDraft();
  },

  createBubbleNode: function(name, address) {
    var bubble = cmpPeepBubbleNode.cloneNode(true);
    bubble.classList.add('peep-bubble');
    bubble.classList.add('msg-peep-bubble');
    bubble.setAttribute('data-address', address);
    bubble.querySelector('.cmp-peep-address').textContent = address;
    var nameNode = bubble.querySelector('.cmp-peep-name');
    if (!name) {
      nameNode.textContent = address.indexOf('@') !== -1 ?
                    address.split('@')[0] : address;
    } else {
      nameNode.textContent = name;
      bubble.setAttribute('data-name', name);
    }
    return bubble;
  },

  /**
   * insertBubble: We can set the input text node, name and address to
   *               insert a bubble before text input.
   */
  insertBubble: function(node, name, address) {
    var container = node.parentNode;
    var bubble = this.createBubbleNode(name, address);
    container.insertBefore(bubble, node);
  },
  /**
   * deleteBubble: Delete the bubble from the parent container.
   */
  deleteBubble: function(node) {
    if (!node) {
      return;
    }
    var container = node.parentNode;
    if (node.classList.contains('cmp-peep-bubble')) {
      container.removeChild(node);
    }
    if (this.isEmptyAddress()) {
      this.sendButton.setAttribute('aria-disabled', 'true');
    }
  },

  /**
   * Check if envelope-bar is empty or contains any string or bubble.
   */
  isEmptyAddress: function() {
    var inputSet = this.toNode.value + this.ccNode.value + this.bccNode.value;
    var addrBar = this.domNode.getElementsByClassName('cmp-envelope-bar')[0];
    var bubbles = addrBar.querySelectorAll('.cmp-peep-bubble');
    if (!inputSet.replace(/\s/g, '') && bubbles.length === 0) {
      return true;
    }
    return false;
  },

  /**
   * Handle bubble deletion while keyboard backspace keydown.
   */
  onAddressKeydown: function(evt) {
    var node = evt.target;
    var container = evt.target.parentNode;

    if (evt.keyCode === 8 && node.value === '') {
      //delete bubble
      var previousBubble = node.previousElementSibling;
      this.deleteBubble(previousBubble);
      if (this.isEmptyAddress()) {
        this.sendButton.setAttribute('aria-disabled', 'true');
      }
    }
  },

  /**
   * Handle bubble creation while keyboard comma input.
   */
  onAddressInput: function(evt) {
    var node = evt.target;
    var container = evt.target.parentNode;

    if (this.isEmptyAddress()) {
      this.sendButton.setAttribute('aria-disabled', 'true');
      return;
    }
    this.sendButton.setAttribute('aria-disabled', 'false');
    var makeBubble = false;
    // When do we want to tie off this e-mail address, put it into a bubble
    // and clear the input box so the user can type another address?
    switch (node.value.slice(-1)) {
      // If they hit space and we believe they've already typed an email
      // address!  (Space is okay in a display name or to delimit a display
      // name from the e-mail address)
      //
      // We use the presence of an '@' character as indicating that the e-mail
      // address
      case ' ':
        makeBubble = node.value.indexOf('@') !== -1;
        break;
      // We started out supporting comma, but now it's not on our keyboard at
      // all in type=email mode!  We aren't terribly concerned about it not
      // being usable in display names, although we really should check for
      // quoting...
      case ',':
      // Semicolon is on the keyboard, and we also don't care about it not
      // being usable in display names.
      case ';':
        makeBubble = true;
        break;
    }
    if (makeBubble) {
      // TODO: Need to match the email with contact name.
      node.style.width = '0.5rem';
      var mailbox = model.api.parseMailbox(node.value);
      this.insertBubble(node, mailbox.name, mailbox.address);
      node.value = '';
    }
    // XXX: Workaround to get the length of the string. Here we create a dummy
    //      div for computing actual string size for changing input
    //      size dynamically.
    if (!this.stringContainer) {
      this.stringContainer = document.createElement('div');
      this.domNode.appendChild(this.stringContainer);

      var inputStyle = window.getComputedStyle(node);
      this.stringContainer.style.fontSize = inputStyle.fontSize;
    }
    this.stringContainer.style.display = 'inline-block';
    this.stringContainer.textContent = node.value;
    node.style.width =
      (this.stringContainer.clientWidth + 2) + 'px';
  },

  onContainerClick: function(evt) {
    var target = evt.target;
    // Popup the context menu if clicked target is peer bubble.
    if (target.classList.contains('cmp-peep-bubble')) {
      var contents = cmpContactMenuNode.cloneNode(true);
      var email = target.querySelector('.cmp-peep-address').textContent;
      var headerNode = contents.getElementsByTagName('header')[0];
      // Setup the marquee structure
      Marquee.setup(email, headerNode);
      // Activate marquee once the contents DOM are added to document
      document.body.appendChild(contents);
      Marquee.activate('alternate', 'ease');

      var formSubmit = (function(evt) {
        document.body.removeChild(contents);
        switch (evt.explicitOriginalTarget.className) {
          case 'cmp-contact-menu-delete':
            this.deleteBubble(target);
            break;
          case 'cmp-contact-menu-cancel':
            break;
        }
        return false;
      }).bind(this);
      contents.addEventListener('submit', formSubmit);
      return;
    }
    // While user clicks on the container, focus on input to triger
    // the keyboard.
    var input = evt.currentTarget.getElementsByClassName('cmp-addr-text')[0];
    focusInputAndPositionCursorFromContainerClick(evt, input);
  },

  /**
   * Make our textarea grow as new lines are added...
   */
  onTextBodyDelta: function() {
    var value = this.textBodyNode.value, newlines = 0, idx = -1;
    while (true) {
      idx = value.indexOf('\n', idx + 1);
      if (idx === -1)
        break;
      newlines++;
    }
    // the last line won't have a newline
    var neededRows = newlines + 1;
    if (this.textBodyNode.rows !== neededRows)
      this.textBodyNode.rows = neededRows;
  },

  insertAttachments: function() {
    var attachmentsContainer =
      this.domNode.getElementsByClassName('cmp-attachment-container')[0];

    if (this.composer.attachments && this.composer.attachments.length) {
      // Clean the container before we insert the new attachments
      attachmentsContainer.innerHTML = '';

      var attTemplate = cmpAttachmentItemNode,
          filenameTemplate =
            attTemplate.getElementsByClassName('cmp-attachment-filename')[0],
          filesizeTemplate =
            attTemplate.getElementsByClassName('cmp-attachment-filesize')[0];
      var totalSize = 0;
      for (var i = 0; i < this.composer.attachments.length; i++) {
        var attachment = this.composer.attachments[i];
        //check for attachment max size
        if ((totalSize + attachment.blob.size) > MAX_ATTACHMENT_SIZE) {

          /*Remove all the remaining attachments from composer*/
          while (this.composer.attachments.length > i) {
            this.composer.removeAttachment(this.composer.attachments[i]);
          }
          var dialog = msgAttachConfirmNode.cloneNode(true);
          var title = dialog.getElementsByTagName('h1')[0];
          var content = dialog.getElementsByTagName('p')[0];

          if (this.composer.attachments.length > 0) {
            title.textContent = mozL10n.get('composer-attachments-large');
            content.textContent =
            mozL10n.get('compose-attchments-size-exceeded');
          } else {
            title.textContent = mozL10n.get('composer-attachment-large');
            content.textContent =
            mozL10n.get('compose-attchment-size-exceeded');
          }
          ConfirmDialog.show(dialog,
           {
            // ok
            id: 'msg-attach-ok',
            handler: function() {
              this.updateAttachmentsSize();
            }.bind(this)
           }
          );
          return;
        }
        totalSize = totalSize + attachment.blob.size;
        filenameTemplate.textContent = attachment.name;
        filesizeTemplate.textContent = prettyFileSize(attachment.blob.size);
        var attachmentNode = attTemplate.cloneNode(true);
        attachmentsContainer.appendChild(attachmentNode);

        attachmentNode.getElementsByClassName('cmp-attachment-remove')[0]
          .addEventListener('click',
                            this.onClickRemoveAttachment.bind(
                              this, attachmentNode, attachment));
      }

      this.updateAttachmentsSize();

      attachmentsContainer.classList.remove('collapsed');
    }
    else {
      attachmentsContainer.classList.add('collapsed');
    }
  },

  updateAttachmentsSize: function() {
    var attachmentLabel =
      this.domNode.getElementsByClassName('cmp-attachment-label')[0];
    var attachmentTotal =
      this.domNode.getElementsByClassName('cmp-attachment-total')[0];
    var attachmentsSize =
      this.domNode.getElementsByClassName('cmp-attachment-size')[0];

    attachmentLabel.textContent =
      mozL10n.get('compose-attachments',
                  { n: this.composer.attachments.length});

    if (this.composer.attachments.length === 0) {
      attachmentsSize.textContent = '';

      // When there is no attachments, hide the container
      // to keep the style of empty attachments
      var attachmentsContainer =
        this.domNode.getElementsByClassName('cmp-attachment-container')[0];

      attachmentsContainer.classList.add('collapsed');
    }
    else {
      var totalSize = 0;
      for (var i = 0; i < this.composer.attachments.length; i++) {
        totalSize += this.composer.attachments[i].blob.size;
      }

      attachmentsSize.textContent = prettyFileSize(totalSize);
    }

    // Only display the total size when the number of attachments is more than 1
    if (this.composer.attachments.length > 1)
      attachmentTotal.classList.remove('collapsed');
    else
      attachmentTotal.classList.add('collapsed');
  },

  onClickRemoveAttachment: function(node, attachment) {
    node.parentNode.removeChild(node);
    this.composer.removeAttachment(attachment);

    this.updateAttachmentsSize();
  },

  /**
   * Save the draft if there's anything to it, close the card.
   */
  onBack: function() {
    var goBack = (function() {
      if (this.activity) {
        // We need more testing here to make sure the behavior that back
        // to originated activity works perfectly without any crash or
        // unable to switch back.

        this.activity.postError('cancelled');
        this.activity = null;
      }

      this._closeCard();
    }).bind(this);

    if (!this._saveNeeded()) {
      console.log('compose: back: no save needed, exiting without prompt');
      goBack();
      return;
    }

    console.log('compose: back: save needed, prompting');
    var menu = cmpDraftMenuNode.cloneNode(true);
    document.body.appendChild(menu);
    var formSubmit = (function(evt) {
      document.body.removeChild(menu);
      switch (evt.explicitOriginalTarget.id) {
        case 'cmp-draft-save':
          console.log('compose: explicit draft save on exit');
          this._saveDraft('explicit');
          goBack();
          break;
        case 'cmp-draft-discard':
          console.log('compose: explicit draft discard on exit');
          this.composer.abortCompositionDeleteDraft();
          goBack();
          break;
        case 'cmp-draft-cancel':
          console.log('compose: canceled compose exit');
          break;
      }
      return false;
    }).bind(this);
    menu.addEventListener('submit', formSubmit);
  },

  /**
   * Save the draft if there's anything to it, close the card.
   */
  onVisibilityChange: function() {
    if (document.hidden && this._saveNeeded()) {
      console.log('compose: autosaving; we became hidden and save needed.');
      this._saveDraft('automatic');
    }
  },

  onSend: function() {
    this._saveStateToComposer();

    // XXX well-formedness-check (ideally just handle by not letting you send
    // if you haven't added anyone...)
    var self = this;
    var activity = this.activity;
    var domNode = this.domNode;
    var sendingTemplate = cmpSendingContainerNode;
    domNode.appendChild(sendingTemplate);

    // Indicate we are sending so we can suppress any of our auto-save logic
    // from trying to fire.
    this.sending = true;

    // Initiate the send.
    console.log('compose: initiating send');
    this.composer.finishCompositionSendMessage(
      function callback(error , badAddress, sentDate) {
        console.log('compose: callback triggered, err:', error);
        var activityHandler = function() {
          if (activity) {
            // Just mention the action completed, but do not give
            // specifics, to maintain some privacy.
            activity.postResult('complete');
            activity = null;
          }
        };

        domNode.removeChild(sendingTemplate);
        if (error) {
          // Indicate we are no longer sending so that if the user goes on to
          // change the message, we do save it.
          this.sending = false;

          // TODO: We don't have the resend now, so we use alert dialog
          //       before resend is enabled.
          // var dialog = cmpSendFailedConfirmNode.cloneNode(true);
          // document.body.appendChild(dialog);
          // var formSubmit = function(evt) {
          //   document.body.removeChild(dialog);
          //   return false;
          // };
          // dialog.addEventListener('submit', formSubmit);
          alert(mozL10n.get('compose-send-message-failed'));
          return;
        }

        if (self.sentAudioEnabled) {
          self.sentAudio.play();
        }

        activityHandler();
        this._closeCard();
      }.bind(this)
    );
  },

  onContactAdd: function(event) {
    event.stopPropagation();
    var contactBtn = event.target;
    var self = this;
    contactBtn.classList.remove('show');
    try {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'webcontacts/email'
        }
      });
      activity.onsuccess = function success() {
        if (this.result.email) {
          var emt = contactBtn.parentElement.querySelector('.cmp-addr-text');
          self.insertBubble(emt, this.result.name, this.result.email);
          self.sendButton.setAttribute('aria-disabled', 'false');
        }
      };
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  onAttachmentAdd: function(event) {
    event.stopPropagation();

    try {
      console.log('compose: attach: triggering web activity');
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: ['image/*', 'video/*', 'audio/*'], // the media files
          nocrop: true
        }
      });
      activity.onsuccess = (function success() {
        // Load the util on demand, since one small codepath needs it, and
        // it avoids needing to bundle util's dependencies in a built layer.
        require(['attachment_name'], function(attachmentName) {
          var blob = activity.result.blob,
              name = activity.result.blob.name || activity.result.name,
              count = this.composer.attachments.length + 1;

          name = attachmentName.ensureName(blob, name, count);

          console.log('compose: attach activity success:', name);

          name = name.substring(name.lastIndexOf('/') + 1);

          this.composer.addAttachment({
            name: name,
            blob: activity.result.blob
          });

          this.insertAttachments();
        }.bind(this));
      }).bind(this);
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  die: function() {
    document.removeEventListener('visibilitychange',
                                 this._bound_onVisibilityChange);
    if (this.composer) {
      this.composer.die();
      this.composer = null;
    }
  }
};
Cards.defineCardWithDefaultMode('compose', {}, ComposeCard, templateNode);

return ComposeCard;
});
