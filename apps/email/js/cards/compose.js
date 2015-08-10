/**
 * Card definitions/logic for composition, contact picking, and attaching
 * things.  Although ideally, the picking and attaching will be handled by a
 * web activity or shared code.
 **/

/*global MozActivity */
'use strict';
define(function(require, exports, module) {

var cmpAttachmentItemNode = require('tmpl!./cmp/attachment_item.html'),
    cmpContactMenuNode = require('tmpl!./cmp/contact_menu.html'),
    cmpDraftMenuNode = require('tmpl!./cmp/draft_menu.html'),
    cmpPeepBubbleNode = require('tmpl!./cmp/peep_bubble.html'),
    cmpInvalidAddressesNode = require('tmpl!./cmp/invalid_addresses.html'),
    msgAttachConfirmNode = require('tmpl!./msg/attach_confirm.html'),
    evt = require('evt'),
    htmlCache = require('html_cache'),
    toaster = require('toaster'),
    model = require('model'),
    iframeShims = require('iframe_shims'),
    Marquee = require('marquee'),
    mozL10n = require('l10n!'),

    cards = require('cards'),
    ConfirmDialog = require('confirm_dialog'),
    mimeToClass = require('mime_to_class'),
    fileDisplay = require('file_display'),
    addrPropNames = ['to', 'cc', 'bcc'],
    dataIdCounter = 0;

/**
 * Previously we limited to 5MiB because of device limitations primarily
 * related to downloading attachments larger than 5MiB on Tarako devices.
 * On more capable devices this is less of a concern and the dominating
 * factor becomes the limits of the mail providers themselves.  The value
 * converged upon by most providers is 25MiB.  Because of encoding overhead
 * and message body concerns, for now we're sticking to 22MiB, but we should
 * bump this as appropriate.
 */
var MAX_ATTACHMENT_SIZE = 22 * 1024 * 1024;

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
  if (event.explicitOriginalTarget === input) {
    return;
  }
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


return [
  require('./base')(require('template!./compose.html')),
  require('./editor_mixins'),
  {
    createdCallback: function() {
      // Save a cached version before anything is changed on the pristine
      // template state.
      htmlCache.cloneAndSave(module.id, this);

      this.sending = false;

      // Management of attachment work, to limit memory use
      this._totalAttachmentsFinishing = 0;
      this._totalAttachmentsDone = 0;
      this._wantAttachment = false;
      this._onAttachmentDone = this._onAttachmentDone.bind(this);

      // Pass text node to editor mixins
      this._bindEditor(this.textBodyNode);

      // Add subject focus for larger hitbox
      var subjectContainer = this.querySelector('.cmp-subject');
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

      // Tracks if the card closed itself, in which case
      // no draft saving is needed. If something else
      // causes the card to die, then we want to save any
      // state.
      this._selfClosed = false;

      // Set up unique data IDs for data-sensitive operations that could be in
      // progress. These IDs are unique per kind of action, not unique per
      // instance of a kind of action. However, these IDs are just used to know
      // if a hard shutdown should be delayed a bit, and are unique enough for
      // those purposes.
      var dataId = module.id + '-' + (dataIdCounter += 1);
      this._dataIdSaveDraft = dataId + '-saveDraft';
      this._dataIdSendEmail = dataId + '-sendEmail';

      // Set up filter for the autocomplete results to avoid dupes in addresses.
      this.autocomplete.getExistingEntries =
                              this.getExistingEntriesForAutocomplete.bind(this);
    },

    onArgs: function(args) {
      this.composer = args.composer;
      this.composerData = args.composerData || {};
      this.activity = args.activity;
    },

    onCardVisible: function() {
      // Once the card is visible, tell the autocomplete about some extra space
      // to use when positioning the autocomplete so that there is nice space
      // around the + button and there are not small scroll janks when
      // positioning and scrolling the input to the top of the view.
      var props = getComputedStyle(this.firstEnvelopeLine),
          space = parseInt(props['padding-top'], 10) +
                  parseInt(props['margin-top'], 10);

      this.autocomplete.verticalSpace = space;
    },

    /**
     * Inform Cards to not emit startup content events, this card will trigger
     * them once data from back end has been received and the DOM is up to date
     * with that data.
     * @type {Boolean}
     */
    skipEmitContentEvents: true,

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
      if (event) {
        event.stopPropagation();
      }

      // Selection/range manipulation is the easiest way to force the cursor
      // to a specific location.
      //
      // Note: Once the user has pressed return once, the editor will create a
      // bogus <br type="_moz"> that is always the last element.  Even though
      // this bogus node will be the last child, nothing tremendously bad
      // happens.
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


    postInsert: function() {
      // the HTML bit needs us linked into the DOM so the iframe can be
      // linked in, hence this happens in postInsert.
      require(['iframe_shims'], function() {

        // NOTE: when the compose card changes to allow switching the From
        // account then this logic will need to change, both the acquisition of
        // the account pref and the folder to use for the composer. So it is
        // good to group this logic together, since they both will need to
        // change later.
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
    },

    _loadStateFromComposer: function() {
      var self = this;
      function expandAddresses(node, addresses) {
        if (!addresses) {
          return '';
        }
        addresses.forEach(function(aval) {
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

      this.validateAddresses();

      this.renderSendStatus();

      // Add attachments
      this.renderAttachments();

      this.subjectNode.value = this.composer.subject;
      // Save the initial state of the composer so that if the user immediately
      // hits the back button without doing anything we can simply discard the
      // draft. This is not for avoiding redundant saves or any attempt at
      // efficiency.
      this.origText = this.composer.body.text;

      this.populateEditor(this.composer.body.text);

      if (this.composer.body.html) {
        // Although (still) sanitized, this is still HTML we did not create and
        // so it gets to live in an iframe.  Its read-only and the user needs to
        // be able to see what they are sending, so reusing the viewing
        // functionality is desirable.
        var ishims = iframeShims.createAndInsertIframeForContent(
          this.composer.body.html, this.scrollContainer,
          this.htmlBodyContainer, /* append */ null,
          'noninteractive',
          /* no click handler because no navigation desired */ null);
        this.htmlIframeNode = ishims.iframe;
      }

      // There is a bit more possibility of async work done in the iframeShims
      // internals, but this is close enough and is better than breaking open
      // the internals of the iframeShims to get the final number.
      if (!this._emittedContentEvents) {
        evt.emit('metrics:contentDone');
        this._emittedContentEvents = true;
      }
    },

    /**
     * If this draft came from the outbox, it might have a sendStatus
     * description explaining why the send failed. Display it if so.
     *
     * The sendStatus information on this messages is provided through
     * the sendOutboxMessages job; see `jobs/outbox.js` in GELAM for details.
     */
    renderSendStatus: function() {
      var sendStatus = this.composer.sendStatus || {};
      if (sendStatus.state === 'error') {
        var badAddresses = sendStatus.badAddresses || [];

        // For debugging, report some details to the console, masking
        // recipients for privacy.
        console.log('Editing a failed outbox message. Details:',
        JSON.stringify({
          err: sendStatus.err,
          badAddressCount: badAddresses.length,
          sendFailures: sendStatus.sendFailures
        }, null, ' '));

        var l10nId;
        if (badAddresses.length || sendStatus.err === 'bad-recipient') {
          l10nId = 'send-failure-recipients';
        } else {
          l10nId = 'send-failure-unknown';
        }

        this.errorMessage.setAttribute('data-l10n-id', l10nId);
        this.errorMessage.classList.remove('collapsed');
      } else {
        this.errorMessage.classList.add('collapsed');
      }
    },

    /**
     * Return true if the given address is syntactically valid.
     *
     * @param {String} address
     *   The email address to validate, as a string.
     * @return {Boolean}
     */
    isValidAddress: function(address) {
      // An address is valid if model.api.parseMailbox thinks it
      // contains a valid address. (It correctly classifies names that
      // are not valid addresses.)
      var mailbox = model.api.parseMailbox(address);
      return mailbox && mailbox.address;
    },

    /**
     * Extract addresses from the bubbles and/or inputs, returning a map
     * with keys for 'to', 'cc', 'bcc', 'all', and 'invalid' addresses.
     */
    extractAddresses: function() {
      var allAddresses = [];
      var invalidAddresses = [];

      // Extract the addresses from the bubbles as well as any partial
      // addresses entered in the text input.
      var frobAddressNode = (function(node) {
        var bubbles = node.parentNode.querySelectorAll('.cmp-peep-bubble');
        var addrList = [];
        for (var i = 0; i < bubbles.length; i++) {
          var dataSet = bubbles[i].dataset;
          addrList.push({ name: dataSet.name, address: dataSet.address });
        }
        if (node.value.trim().length !== 0) {
          var mailbox = model.api.parseMailbox(node.value);
          addrList.push({ name: mailbox.name, address: mailbox.address });
        }
        addrList.forEach(function(addr) {
          allAddresses.push(addr);
          if (!this.isValidAddress(addr.address)) {
            invalidAddresses.push(addr);
          }
        }.bind(this));
        return addrList;
      }.bind(this));

      // NOTE: allAddresses contains invalidAddresses, but we never
      // actually send a message directly using either of those lists.
      // We use to/cc/bcc for that, and our send validation here
      // prevents users from sending a message with invalid addresses.

      return {
        to: frobAddressNode(this.toNode),
        cc: frobAddressNode(this.ccNode),
        bcc: frobAddressNode(this.bccNode),
        all: allAddresses,
        invalid: invalidAddresses
      };
    },

    haveAddressesChanged: function() {
      var addrs = this.extractAddresses();
      function addressesDiffer(a, b) {
        return a.length !== b.length || a.some(function(e, i) {
          return e !== b[i].address;
        });
      }
      return addressesDiffer(this.composer.to, addrs.to) ||
        addressesDiffer(this.composer.cc, addrs.cc) ||
        addressesDiffer(this.composer.bcc, addrs.bcc);
    },

    _saveStateToComposer: function() {
      var addrs = this.extractAddresses();
      this.composer.to = addrs.to;
      this.composer.cc = addrs.cc;
      this.composer.bcc = addrs.bcc;
      this.composer.subject = this.subjectNode.value;
      this.composer.body.text = this.fromEditor();
      // The HTML representation cannot currently change in our UI, so no
      // need to save it.  However, what we send to the back-end is what gets
      // sent, so if you want to implement editing UI and change this here,
      // go crazy.
    },

    _closeCard: function() {
      this._selfClosed = true;
      cards.removeCardAndSuccessors(this, 'animate');
    },

    _saveNeeded: function() {
      // If no composer, then it means the card was destroyed before full
      // setup, which means there is nothing to save.
      if (!this.composer) {
        return false;
      }

      var hasNewContent = this.fromEditor() !== this.composer.body.text;

      // We need `to save / ask about deleting the draft if:
      // There's any recipients listed, there's a subject, there's anything in
      // the body, there are attachments, or we already created a draft for this
      // guy in which case we really want to provide the option to delete the
      // draft.
      return (this.subjectNode.value || hasNewContent ||
          this.haveAddressesChanged() || this.composer.attachments.length ||
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
      evt.emit('uiDataOperationStart', this._dataIdSaveDraft);
      this.composer.saveDraft(function() {
        evt.emit('uiDataOperationStop', this._dataIdSaveDraft);
        if (callback) {
          callback();
        }
      }.bind(this));
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

    getExistingEntriesForAutocomplete: function() {
      var addrs = this.extractAddresses(),
          all = [];

      addrPropNames.forEach(function(prop) {
        var ary = addrs[prop];
        if (ary.length) {
          all = all.concat(ary);
        }
      });

      return all;
    },

    autocompleteSelected: function(event) {
      var match = event.detail.match,
          inputNode = event.detail.inputNode;
      this.addFromEntry(match, inputNode);
    },

    addFromEntry: function(match, inputNode) {
      inputNode.style.width = '0.5rem';
      this.insertBubble(inputNode, match.name, match.address);
      inputNode.value = '';
      inputNode.focus();
    },

    /**
     * insertBubble: We can set the input text node, name and address to
     *               insert a bubble before text input.
     */
    insertBubble: function(node, name, address) {
      var container = node.parentNode;
      var bubble = this.createBubbleNode(name || address, address);
      container.insertBefore(bubble, node);
      this.validateAddresses();
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

      this.validateAddresses();
    },

    /**
     * editBubble: Turn the bubble back into editable text.
     */
    editBubble: function(node) {
      if (!node) {
        return;
      }
      var container = node.parentNode;
      if (node.classList.contains('cmp-peep-bubble')) {
        container.removeChild(node);
        var input = container.querySelector('.cmp-addr-text');
        // If there is already a partially or fully entered address in
        // the typing area, force it to be converted into a bubble, even
        // though the resulting address may not be valid. If it's not
        // valid, that bubble can subsequently be edited. This helps
        // avoid the user losing anything they typed in.
        if (input.value.length > 0) {
          input.value = input.value + ',';
          this.onAddressInput({ target: input }); // Bubblize if necessary.
        }
        var address = node.dataset.address;
        var selStart = input.value.length;
        var selEnd = selStart + address.length;
        input.value += address;
        input.focus();
        this.onAddressInput({ target: input }); // Force width calculations.
        input.setSelectionRange(selStart, selEnd);
      }
      this.validateAddresses();
    },

    /**
     * Handle bubble deletion while keyboard backspace keydown.
     */
    onAddressKeydown: function(evt) {
      var node = evt.target;

      if (evt.keyCode === 8 && node.value === '') {
        //delete bubble
        var previousBubble = node.previousElementSibling;
        this.deleteBubble(previousBubble);
        // Deleting a bubble changes the positions of the inputs, let the
        // autocomplete know about it.
        this.autocomplete.onInput();
      }
    },

    /**
     * Handle bubble creation while keyboard comma input.
     */
    onAddressInput: function(evt) {
      var node = evt.target;

      var entryMatch;
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
        entryMatch = model.api.parseMailbox(node.value);
        this.addFromEntry(entryMatch, node);
      }

      // XXX: Workaround to get the length of the string. Here we create a dummy
      //      div for computing actual string size for changing input
      //      size dynamically.
      if (!this.stringContainer) {
        this.stringContainer = document.createElement('div');
        this.appendChild(this.stringContainer);

        var inputStyle = window.getComputedStyle(node);
        this.stringContainer.style.fontSize = inputStyle.fontSize;
      }
      this.stringContainer.style.display = 'inline-block';
      this.stringContainer.textContent = node.value;
      node.style.width =
        (this.stringContainer.clientWidth + 2) + 'px';

      this.validateAddresses();
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
        cards.setStatusColor(contents);
        document.body.appendChild(contents);
        Marquee.activate('alternate', 'ease');

        var formSubmit = (function(evt) {
          cards.setStatusColor();
          document.body.removeChild(contents);
          switch (evt.explicitOriginalTarget.className) {
            case 'cmp-contact-menu-edit':
              this.editBubble(target);
              break;
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
        // Note! attachments with an "s" versus the case below.
        mozL10n.setAttributes(title, 'composer-attachments-large');
        mozL10n.setAttributes(content, 'compose-attchments-size-exceeded');
      } else {
        mozL10n.setAttributes(title, 'composer-attachment-large');
        mozL10n.setAttributes(content, 'compose-attchment-size-exceeded');
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
     * Used to count when attachment has been fully processed by this.composer.
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
        if (toaster.isShowing()) {
          toaster.hide();
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
     * possible and generate an error message for any we can't attach.  This
     * will update the UI as a side-effect; you do not need to do it.
     */
    addAttachmentsSubjectToSizeLimits: function(toAttach) {
      // Tally the size of the already-attached attachments.
      var totalSize = this.calculateTotalAttachmentsSize();

      // Keep attaching until we find one that puts us over the limit.  Then
      // generate an error whose plurality is based on the number of attachments
      // we are not attaching.  We do not do any bin-packing smarts where we try
      // and see if any of the attachments in `toAttach` might fit.
      //
      // This specific behaviour is potentially a little odd; we're going with
      // consistency of the original implementation of bug 871852 but without
      // the horrible bug introduced by bug 871897 and being addressed by this
      // in bug 1006271.
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
      if (this.composer.attachments && this.composer.attachments.length) {
        // Clean the container before we insert the new attachments
        this.attachmentsContainer.innerHTML = '';

        var attTemplate = cmpAttachmentItemNode,
            filenameTemplate =
              attTemplate.getElementsByClassName('cmp-attachment-filename')[0],
            filesizeTemplate =
              attTemplate.getElementsByClassName('cmp-attachment-filesize')[0];

        for (var i = 0; i < this.composer.attachments.length; i++) {
          var attachment = this.composer.attachments[i];

          filenameTemplate.textContent = attachment.name;
          fileDisplay.fileSize(filesizeTemplate, attachment.blob.size);
          var attachmentNode = attTemplate.cloneNode(true);
          this.attachmentsContainer.appendChild(attachmentNode);

          attachmentNode.classList.add(mimeToClass(attachment.blob.type));
          attachmentNode.getElementsByClassName('cmp-attachment-remove')[0]
            .addEventListener('click',
                              this.onClickRemoveAttachment.bind(
                                this, attachmentNode, attachment));
        }

        this.updateAttachmentsSize();

        this.attachmentsContainer.classList.remove('collapsed');
      }
      else {
        this.attachmentsContainer.classList.add('collapsed');
      }
      this.updateAttachmentsAriaLabel();
    },

    /**
     * Update the label used for accessibility that describes the attachments
     * included.
     */
    updateAttachmentsAriaLabel: function() {
      // Only include total size in KB if there is more than 1 attachment.
      var kilobytes = this.composer.attachments.length > 1 ?
        Math.ceil(this.calculateTotalAttachmentsSize() / 1024) : 0;
      mozL10n.setAttributes(this.attachmentsContainer,
        'compose-attachments-container', { kilobytes: kilobytes });
    },

    /**
     * Calculate the total size of all attachments included.
     */
    calculateTotalAttachmentsSize: function() {
      var totalSize = 0;
      for (var i = 0; i < this.composer.attachments.length; i++) {
        totalSize += this.composer.attachments[i].blob.size;
      }
      return totalSize;
    },

    /**
     * Update the summary that says how many attachments we have and the
     * aggregate attachment size.
     */
    updateAttachmentsSize: function() {
      mozL10n.setAttributes(this.attachmentLabel, 'compose-attachments',
                            { n: this.composer.attachments.length });

      if (this.composer.attachments.length === 0) {
        this.attachmentsSize.textContent = '';

        // When there is no attachments, hide the container
        // to keep the style of empty attachments
        this.attachmentsContainer.classList.add('collapsed');
      }
      else {
        fileDisplay.fileSize(this.attachmentsSize,
          this.calculateTotalAttachmentsSize());
      }

      // Only display the total size when the number of attachments is more
      // than 1
      if (this.composer.attachments.length > 1) {
        this.attachmentTotal.classList.remove('collapsed');
      } else {
        this.attachmentTotal.classList.add('collapsed');
      }
    },

    onClickRemoveAttachment: function(node, attachment) {
      node.parentNode.removeChild(node);
      this.composer.removeAttachment(attachment);

      this.updateAttachmentsAriaLabel();
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
      cards.setStatusColor(menu);
      document.body.appendChild(menu);

      var formSubmit = (function(evt) {
        cards.setStatusColor();
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
     * Save the draft if there's anything to it. Called by Cards if this card
     * is also the current card.
     */
    onCurrentCardDocumentVisibilityChange: function() {
      if (document.hidden && this._saveNeeded()) {
        console.log('compose: autosaving; we became hidden and save needed.');
        this._saveDraft('automatic');
      }
    },

    /**
     * Validate that the provided addresses are valid. Enable the send
     * button conditional on all addresses being correct. If all
     * addresses are correct and we had previously displayed a
     * sendStatus error, hide the sendStatus error display.
     *
     * @return {Boolean}
     *   True if all addresses are valid, otherwise false.
     */
    validateAddresses: function() {
      var addrs = this.extractAddresses();

      // The send button should only be disabled if the addresses are
      // empty. They can still tap the send button if there are invalid
      // addresses.
      if (addrs.all.length === 0) {
        this.sendButton.setAttribute('aria-disabled', 'true');
      } else {
        this.sendButton.setAttribute('aria-disabled', 'false');
      }

      if (addrs.invalid.length === 0) {
        // If the error message is visible, meaning they opened this
        // message from the outbox after a send failure, remove the error
        // when they've corrected the recipients.
        this.errorMessage.classList.add('collapsed');
        return true; // No invalid addresses.
      } else {
        return false; // Some addresses were invalid.
      }
    },

    /**
     * If the user attempts to tap the send button while there are
     * invalid addresses, display a dialog to warn them to correct the
     * error. Otherwise, go ahead and send the message.
     */
    onSend: function() {
      if (!this.validateAddresses()) {
        ConfirmDialog.show(cmpInvalidAddressesNode.cloneNode(true), {
          id: 'cmp-confirm-invalid-addresses',
          handler: function() {
            // There is nothing to do.
          }
        });
      } else {
        this.reallySend();
      }
    },

    /**
     * Actually send the message, foregoing any validation that the
     * addresses are valid (as we did in `onSend` above).
     */
    reallySend: function() {
      /* Check if already lock is enabled,
       * If so disable it and then re enable the lock
       */
      this._saveStateToComposer();

      var activity = this.activity;

      // Indicate we are sending so we can suppress any of our auto-save logic
      // from trying to fire.
      this.sending = true;

      // Initiate the send.
      console.log('compose: initiating send');
      evt.emit('uiDataOperationStart', this._dataIdSendEmail);

      this.composer.finishCompositionSendMessage(function(sendInfo) {
        evt.emit('uiDataOperationStop', this._dataIdSendEmail);

        // Card could have been destroyed in the meantime,
        // via an app card reset (not a _selfClosed case),
        // so do not bother with the rest of this work if
        // that was the case.
        if (!this.composer) {
          return;
        }

        if (activity) {
          // Just mention the action completed, but do not give
          // specifics, to maintain some privacy.
          activity.postResult('complete');
          activity = null;
        }

        this._closeCard();

      }.bind(this));
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
        // Use a separate flag than testing if the toaster is showing, in case
        // the toaster is shown for some other reason. In that case, do not want
        // to trigger activity after previous attachment completes.
        this._wantAttachment = true;
        toaster.toast({
          text: mozL10n.get('compose-attachment-still-working')
        });
        return;
      }

      try {
        console.log('compose: attach: triggering web activity');
        var activity = new MozActivity({
          name: 'pick',
          data: {
            type: ['image/*', 'video/*', 'audio/*', 'application/*',
                   'text/vcard'],
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

      if (this.composer) {
        this.composer.die();
        this.composer = null;
      }
    }
  }
];

});
