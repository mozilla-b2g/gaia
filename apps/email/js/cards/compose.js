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
    Toaster = common.Toaster,
    model = require('model'),
    iframeShims = require('iframe_shims'),
    Marquee = require('marquee'),
    mozL10n = require('l10n!'),

    prettyFileSize = common.prettyFileSize,
    Cards = common.Cards,
    ConfirmDialog = common.ConfirmDialog,
    mimeToClass = common.mimeToClass;

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
  // Stop bubbling to avoid our other focus-handlers!
  event.stopPropagation();

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
  this.wifiLock = null;

  // Management of attachment work, to limit memory use
  this._totalAttachmentsFinishing = 0;
  this._totalAttachmentsDone = 0;
  this._wantAttachment = false;
  this._onAttachmentDone = this._onAttachmentDone.bind(this);

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

  // Likewise, clicking on the empty space below our contenteditable region
  // or on our immutable HTML quoting box should result in us positioning
  // the cursor in our contenteditable region.
  this.scrollContainer.addEventListener(
    'click',
    function(event) {
      // Only do this if the click is BELOW the text area.
      var bounds = this.textBodyNode.getBoundingClientRect();
      if (event.clientY > bounds.bottom) {
        this._focusEditorWithCursorAtEnd(event);
      }
    }.bind(this));
  this.htmlBodyContainer.addEventListener(
    'click', this._focusEditorWithCursorAtEnd.bind(this));

  // Tracks if the card closed itself, in which case
  // no draft saving is needed. If something else
  // causes the card to die, then we want to save any
  // state.
  this._selfClosed = false;

  // Sent sound init
  this.sentAudio = new Audio('/sounds/sent.ogg');
  this.sentAudio.mozAudioChannelType = 'notification';
  this.playSoundOnSend = false;
}
ComposeCard.prototype = {

  /**
   * Focus our contenteditable region and position the cursor at the last
   * valid editing cursor position.
   *
   * The intent is so that if the user taps below our editing region that we
   * still correctly position the cursor.  We previously relied on min-height
   * to do this for us, but that results in ugly problems when we have quoted
   * HTML that follows and our editable region is not big enough to satisfy
   * the height.
   *
   * Note: When we are quoting HTML, the "Bob wrote:" stuff does go in the
   * contenteditable text area, so we may actually want to get smarter and
   * position the cursor before that node instead.
   */
  _focusEditorWithCursorAtEnd: function(event) {
    if (event)
      event.stopPropagation();

    // Selection/range manipulation is the easiest way to force the cursor
    // to a specific location.
    //
    // Note: Once the user has pressed return once, the editor will create a
    // bogus <br type="_moz"> that is always the last element.  Even though this
    // bogus node will be the last child, nothing tremendously bad happens.
    //
    // Note: This technique does result in our new text existing in its own,
    // new text node.  So don't make any assumptions about how text nodes are
    // arranged.
    var insertAfter = this.textBodyNode.lastChild;
    var range = document.createRange();
    range.setStartAfter(insertAfter);
    range.setEndAfter(insertAfter);

    this.textBodyNode.focus();
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  },

  /**
   * Inserts an email into the contenteditable element
   */
  populateEditor: function(value) {
    var lines = value.split('\n');
    var frag = document.createDocumentFragment();
    for (var i = 0, len = lines.length; i < len; i++) {
      if (i) {
        frag.appendChild(document.createElement('br'));
      }
      frag.appendChild(document.createTextNode(lines[i]));
    }
    this.textBodyNode.appendChild(frag);
  },

  /**
   * Gets the raw value from a contenteditable div
   */
  fromEditor: function(value) {
    var content = '';
    var len = this.textBodyNode.childNodes.length;
    for (var i = 0; i < len; i++) {
      var node = this.textBodyNode.childNodes[i];
      if (node.nodeName === 'BR' &&
          // Gecko's contenteditable implementation likes to create a synthetic
          // trailing BR with type="_moz".  We do not like/need this synthetic
          // BR, so we filter it out.  Check out
          // nsTextEditRules::CreateTrailingBRIfNeeded to find out where it
          // comes from.
          node.getAttribute('type') !== '_moz') {
        content += '\n';
      } else {
        content += node.textContent;
      }
    }

    return content;
  },

  postInsert: function() {
    // the HTML bit needs us linked into the DOM so the iframe can be
    // linked in, hence this happens in postInsert.
    require(['iframe_shims'], function() {

      // NOTE: when the compose card changes to allow switching the From account
      // then this logic will need to change, both the acquisition of the
      // account pref and the folder to use for the composer. So it is good to
      // group this logic together, since they both will need to change later.
      model.latestOnce('account', function(account) {
        this.playSoundOnSend = !!account.playSoundOnSend;

        if (this.composer) {
          this._loadStateFromComposer();
        } else {
          var data = this.composerData;
          model.latestOnce('folder', function(folder) {
            this.composer = model.api.beginMessageComposition(data.message,
                                                              folder,
                                                              data.options,
                                                              function() {
              if (data.onComposer) {
                data.onComposer(this.composer, this);
              }

              this._loadStateFromComposer();
            }.bind(this));
          }.bind(this));
        }
      }.bind(this));
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
    this.renderAttachments();

    this.subjectNode.value = this.composer.subject;
    this.populateEditor(this.composer.body.text);

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
    this.composer.body.text = this.fromEditor();
    // The HTML representation cannot currently change in our UI, so no
    // need to save it.  However, what we send to the back-end is what gets
    // sent, so if you want to implement editing UI and change this here,
    // go crazy.
  },

  _closeCard: function() {
    this._selfClosed = true;
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

    // If no composer, then it means the card was destroyed before full
    // setup, which means there is nothing to save.
    if (!this.composer) {
      return false;
    }

    // We need to save / ask about deleting the draft if:
    // There's any recipients listed, there's a subject, there's anything in the
    // body, there are attachments, or we already created a draft for this
    // guy in which case we really want to provide the option to delete the
    // draft.
    return (this.subjectNode.value || this.textBodyNode.textContent ||
        !checkAddressEmpty() || this.composer.attachments.length ||
        this.composer.hasDraft);
  },

  _saveDraft: function(reason, callback) {
    // If the send process is happening, suppress automatic saves.
    // (Manual saves should not happen when 'sending' is true, but breaking
    // auto-saves would be very bad form.)
    if (this.sending && reason === 'automatic') {
      console.log('compose: skipping autosave because send in progress');
      return;
    }
    this._saveStateToComposer();
    this.composer.saveDraft(callback);
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
    var bubble = this.createBubbleNode(name || address, address);
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
   * Helper to show the appropriate error when we refuse to add attachments.
   */
  _warnAttachmentSizeExceeded: function(numAttachments) {
    var dialog = msgAttachConfirmNode.cloneNode(true);
    var title = dialog.getElementsByTagName('h1')[0];
    var content = dialog.getElementsByTagName('p')[0];

    if (numAttachments > 1) {
      title.textContent = mozL10n.get('composer-attachments-large');
      content.textContent = mozL10n.get('compose-attchments-size-exceeded');
    } else {
      title.textContent = mozL10n.get('composer-attachment-large');
      content.textContent = mozL10n.get('compose-attchment-size-exceeded');
    }
    ConfirmDialog.show(dialog,
     {
      // ok
      id: 'msg-attach-ok',
      handler: function() {
        // There is nothing to do.
      }.bind(this)
     }
    );
  },

  /**
   * Used to count when an attachment has been fully processed by this.composer.
   * Broken out as a separate member method to avoid inline closures in
   * addAttachmentsSubjectToSizeLimits that may lead to holding on to too much
   * memory.
   */
  _onAttachmentDone: function() {
    this._totalAttachmentsDone += 1;
    if (this._totalAttachmentsDone < this._totalAttachmentsFinishing) {
      return;
    }

    // Give a bit of time for all the DB transactions to clean up.
    // Unfortunately there are no good signals to do this decisively so just
    // adding a bit of a buffer, just to be nice for super low memory
    // devices. Not a catastrophe if work is still going on when the timeout
    // fires.
    setTimeout(function() {
      var wantAttachment = this._wantAttachment;
      this._totalAttachmentsFinishing = 0;
      this._totalAttachmentsDone = 0;
      this._wantAttachment = false;

      // Close out the toaster if it was showing. While the toaster could
      // be showing for some other reason, this is the most likely cause,
      // and want to give the user the impression of fast action.
      if (Toaster.isShowing()) {
        Toaster.hide();
      }

      // If the user wanted to add something else, proceed, since in many
      // cases, the user just had to wait a second or so before we could
      // proceed anyway.
      if (wantAttachment) {
        this.onAttachmentAdd();
      }
    }.bind(this), 600);
  },

  /**
   * Given a list of Blobs/Files that we want to attach, attach as many as
   * possible and generate an error message for any we can't attach.  This will
   * update the UI as a side-effect; you do not need to do it.
   */
  addAttachmentsSubjectToSizeLimits: function(toAttach) {
    var totalSize = 0;
    // Tally the size of the already-attached attachments.
    if (this.composer.attachments) {
      // Using a for loop to avoid any closures that may capture
      // the large attachments.
      for (var i = 0; i < this.composer.attachments.length; i++) {
        totalSize += this.composer.attachments[i].blob.size;
      }
    }

    // Keep attaching until we find one that puts us over the limit.  Then
    // generate an error whose plurality is based on the number of attachments
    // we are not attaching.  We do not do any bin-packing smarts where we try
    // and see if any of the attachments in `toAttach` might fit.
    //
    // This specific behaviour is potentially a little odd; we're going with
    // consistency of the original implementation of bug 871852 but without the
    // horrible bug introduced by bug 871897 and being addressed by this in bug
    // 1006271.
    var attachedAny = false;
    while (toAttach.length) {
      var attachment = toAttach.shift();
      totalSize += attachment.blob.size;
      if (totalSize >= MAX_ATTACHMENT_SIZE) {
        this._warnAttachmentSizeExceeded(1 + toAttach.length);
        break;
      }

      this._totalAttachmentsFinishing += 1;
      this.composer.addAttachment(attachment, this._onAttachmentDone);
      attachedAny = true;
    }

    if (attachedAny) {
      this.renderAttachments();
    }
  },

  /**
   * Build the UI that displays the current attachments.  Invokes
   * `updateAttachmentsSize` too so you don't have to.
   */
  renderAttachments: function() {
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

      for (var i = 0; i < this.composer.attachments.length; i++) {
        var attachment = this.composer.attachments[i];

        filenameTemplate.textContent = attachment.name;
        filesizeTemplate.textContent = prettyFileSize(attachment.blob.size);
        var attachmentNode = attTemplate.cloneNode(true);
        attachmentsContainer.appendChild(attachmentNode);

        attachmentNode.classList.add(mimeToClass(attachment.blob.type));
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

  /**
   * Update the summary that says how many attachments we have and the aggregate
   * attachment size.
   */
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
    if (this.composer.attachments.length > 1) {
      attachmentTotal.classList.remove('collapsed');
    } else {
      attachmentTotal.classList.add('collapsed');
    }
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
    this._savePromptMenu = menu;
    document.body.appendChild(menu);

    var formSubmit = (function(evt) {
      document.body.removeChild(menu);
      this._savePromptMenu = null;

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

  releaseLocks: function() {
    if (this.wifiLock) {
      this.wifiLock.unlock();
      this.wifiLock = null;
    }
  },

  onSend: function() {
    /* Check if already lock is enabled,
     * If so disable it and then re enable the lock
     */
    this.releaseLocks();
    if (navigator.requestWakeLock) {
      this.wifiLock = navigator.requestWakeLock('wifi');
    }
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
        // Card could have been destroyed in the meantime,
        // via an app card reset (not a _selfClosed case),
        // so do not bother with the rest of this work if
        // that was the case.
        if (!this.composer) {
          return;
        }

        console.log('compose: callback triggered, err:', error);
        // releasing the wake lock on send response
        this.releaseLocks();
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

        if (self.playSoundOnSend) {
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
          var name = this.result.name;
          if (Array.isArray(name)) {
              name = name[0];
          }
          self.insertBubble(emt, name, this.result.email);
          self.sendButton.setAttribute('aria-disabled', 'false');
        }
      };
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  onAttachmentAdd: function(event) {
    if (event) {
      event.stopPropagation();
    }

    // To be nice on memory consumption, wait for any previous attachment to
    // finish attaching before triggering another attachment action.
    if (this._totalAttachmentsFinishing > 0) {
      // Use a separate flag than testing if the toaster is showing, in case the
      // toaster is shown for some other reason. In that case, do not want to
      // trigger activity after previous attachment completes.
      this._wantAttachment = true;
      Toaster.show('text', mozL10n.get('compose-attachment-still-working'));
      return;
    }

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

          this.addAttachmentsSubjectToSizeLimits([{
            name: name,
            blob: activity.result.blob
          }]);
        }.bind(this));
      }).bind(this);
    } catch (e) {
      console.log('WebActivities unavailable? : ' + e);
    }
  },

  die: function() {
    document.removeEventListener('visibilitychange',
                                 this._bound_onVisibilityChange);

    // If confirming for prompt when destroyed, just remove
    // and if save is needed, it will be autosaved below.
    if (this._savePromptMenu) {
      document.body.removeChild(this._savePromptMenu);
      this._savePromptMenu = null;
    }

    // If something else besides the card causes this card
    // to die, but we have a draft to save, do it now.
    // However, wait for the draft save to complete before
    // completely shutting down the composer.
    if (!this._selfClosed && this._saveNeeded()) {
      console.log('compose: autosaving draft because not self-closed');
      this._saveDraft('automatic');
    }

    this.releaseLocks();

    if (this.composer) {
      this.composer.die();
      this.composer = null;
    }
  }
};
Cards.defineCardWithDefaultMode('compose', {}, ComposeCard, templateNode);

return ComposeCard;
});
