/*global define, console, window, navigator, document, MozActivity */
define(function(require) {

var MimeMapper,
    templateNode = require('tmpl!./message_reader.html'),
    msgDeleteConfirmNode = require('tmpl!./msg/delete_confirm.html'),
    msgContactMenuNode = require('tmpl!./msg/contact_menu.html'),
    msgReplyMenuNode = require('tmpl!./msg/reply_menu.html'),
    msgBrowseConfirmNode = require('tmpl!./msg/browse_confirm.html'),
    msgPeepBubbleNode = require('tmpl!./msg/peep_bubble.html'),
    msgAttachmentItemNode = require('tmpl!./msg/attachment_item.html'),
    msgAttachmentDisabledConfirmNode =
                         require('tmpl!./msg/attachment_disabled_confirm.html'),
    common = require('mail_common'),
    model = require('model'),
    headerCursor = require('header_cursor').cursor,
    evt = require('evt'),
    iframeShims = require('iframe_shims'),
    Marquee = require('marquee'),
    mozL10n = require('l10n!'),

    Cards = common.Cards,
    Toaster = common.Toaster,
    ConfirmDialog = common.ConfirmDialog,
    displaySubject = common.displaySubject,
    prettyDate = common.prettyDate,
    prettyFileSize = common.prettyFileSize;
var CONTENT_TYPES_TO_CLASS_NAMES = [
    null,
    'msg-body-content',
    'msg-body-signature',
    'msg-body-leadin',
    null,
    'msg-body-disclaimer',
    'msg-body-list',
    'msg-body-product',
    'msg-body-ads'
  ];
var CONTENT_QUOTE_CLASS_NAMES = [
    'msg-body-q1',
    'msg-body-q2',
    'msg-body-q3',
    'msg-body-q4',
    'msg-body-q5',
    'msg-body-q6',
    'msg-body-q7',
    'msg-body-q8',
    'msg-body-q9'
  ];
var MAX_QUOTE_CLASS_NAME = 'msg-body-qmax';

function MessageReaderCard(domNode, mode, args) {
  // Set up instance-specific storage for events
  evt.Emitter.call(this);

  this.domNode = domNode;
  this.messageSuid = args.messageSuid;

  this.previousBtn = domNode.getElementsByClassName('msg-up-btn')[0];
  this.previousIcon = domNode.getElementsByClassName('icon-up')[0];
  this.nextBtn = domNode.getElementsByClassName('msg-down-btn')[0];
  this.nextIcon = this.domNode.getElementsByClassName('icon-down')[0];

  // The body elements for the (potentially multiple) iframes we created to hold
  // HTML email content.
  this.htmlBodyNodes = [];

  this._on('msg-back-btn', 'click', 'onBack', true);
  this._on('msg-up-btn', 'click', 'onPrevious');
  this._on('msg-down-btn', 'click', 'onNext');
  this._on('msg-reply-btn', 'click', 'onReplyMenu');
  this._on('msg-delete-btn', 'click', 'onDelete');
  this._on('msg-star-btn', 'click', 'onToggleStar');
  this._on('msg-move-btn', 'click', 'onMove');
  this._on('msg-envelope-bar', 'click', 'onEnvelopeClick');
  this._on('msg-reader-load-infobar', 'click', 'onLoadBarClick');

  this.disableReply();

  this.scrollContainer =
    domNode.getElementsByClassName('scrollregion-below-header')[0];
  this.loadBar =
    this.domNode.getElementsByClassName('msg-reader-load-infobar')[0];
  this.rootBodyNode = domNode.getElementsByClassName('msg-body-container')[0];

  // whether or not we've built the body DOM the first time
  this._builtBodyDom = false;

  // Bind some methods to this so they can be used as event listeners
  this.handleBodyChange = this.handleBodyChange.bind(this);
  this.onMessageSuidNotFound = this.onMessageSuidNotFound.bind(this);
  this.onCurrentMessage = this.onCurrentMessage.bind(this);

  headerCursor.on('messageSuidNotFound', this.onMessageSuidNotFound);
  headerCursor.latest('currentMessage', this.onCurrentMessage);

  // This should handle the case where we jump right into the reader.
  headerCursor.setCurrentMessage(this.header);
}
MessageReaderCard.prototype = {
  _contextMenuType: {
    VIEW_CONTACT: 1,
    CREATE_CONTACT: 2,
    ADD_TO_CONTACT: 4,
    REPLY: 8,
    NEW_MESSAGE: 16
  },

  // Method to help bind event listeners to method names, and ensures
  // a header object before activating the method, to protect the buttons
  // from being activated while the model is still loading.
  _on: function(className, eventName, method, skipProtection) {
    this.domNode.getElementsByClassName(className)[0]
    .addEventListener(eventName, function(evt) {
      if (this.header || skipProtection)
        return this[method](evt);
    }.bind(this), false);
  },

  _setHeader: function(header) {
    this.header = header.makeCopy();
    this.hackMutationHeader = header;

    // - mark message read (if it is not already)
    if (!this.header.isRead)
      this.header.setRead(true);

    if (this.hackMutationHeader.isStarred)
      this.domNode.getElementsByClassName('msg-star-btn')[0].classList
             .add('msg-btn-active');

    this.emit('header');
  },

  postInsert: function() {
    this._inDom = true;

    // If have a message that is waiting for the DOM, finish
    // out the display work.
    if (this._afterInDomMessage) {
      this.onCurrentMessage(this._afterInDomMessage);
      this._afterInDomMessage = null;
    }
  },

  told: function(args) {
    if (args.messageSuid) {
      this.messageSuid = args.messageSuid;
    }
  },

  handleBodyChange: function(evt) {
    this.buildBodyDom(evt.changeDetails);
  },

  onBack: function(event) {
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  /**
   * Broadcast that we need to move previous if there's a previous sibling.
   *
   * @param {Event} event previous arrow click event.
   */
  onPrevious: function(event) {
    headerCursor.advance('previous');
  },

  /**
   * Broadcast that we need to move next if there's a next sibling.
   *
   * @param {Event} event next arrow click event.
   */
  onNext: function(event) {
    headerCursor.advance('next');
  },

  onMessageSuidNotFound: function(messageSuid) {
    // If no message was found, then go back. This card
    // may have been created from obsolete data, like an
    // old notification for a message that no longer exists.
    // This stops atTop since the most likely case for this
    // entry point is either clicking on a message that is
    // at the top of the inbox in the HTML cache, or from a
    // notification for a new message, which would be near
    // the top.
    if (this.messageSuid === messageSuid) {
      this.onBack();
    }
  },

  /**
   * Set the message we're reading.
   *
   * @param {MessageCursor.CurrentMessage} currentMessage representation of the
   *     email we're currently reading.
   */
  onCurrentMessage: function(currentMessage) {
    // If the card is not in the DOM yet, do not proceed, as
    // the iframe work needs to happen once DOM is available.
    if (!this._inDom) {
      this._afterInDomMessage = currentMessage;
      return;
    }

    // Set our current message.
    this.messageSuid = null;
    this._setHeader(currentMessage.header);
    this.clearDom();

    // Display the header and fetch the body for display.
    this.latestOnce('header', function() {
      // iframes need to be linked into the DOM tree before their
      // contentDocument can be instantiated.
      this.buildHeaderDom(this.domNode);

      this.header.getBody({ downloadBodyReps: true }, function(body) {
        this.body = body;

        // always attach the change listener.
        body.onchange = this.handleBodyChange;

        // if the body reps are downloaded show the message immediately.
        if (body.bodyRepsDownloaded) {
          this.buildBodyDom();
        }

        // XXX trigger spinner
        //
      }.bind(this));
    }.bind(this));

    // Previous.
    var hasPrevious = currentMessage.siblings.hasPrevious;
    this.previousBtn.disabled = !hasPrevious;
    this.previousIcon.classList[hasPrevious ? 'remove' : 'add'](
      'icon-disabled');

    // Next.
    var hasNext = currentMessage.siblings.hasNext;
    this.nextBtn.disabled = !hasNext;
    this.nextIcon.classList[hasNext ? 'remove' : 'add']('icon-disabled');
  },

  reply: function() {
    Cards.eatEventsUntilNextCard();
    var composer = this.header.replyToMessage(null, function() {
      Cards.pushCard('compose', 'default', 'animate',
                     { composer: composer });
    });
  },

  replyAll: function() {
    Cards.eatEventsUntilNextCard();
    var composer = this.header.replyToMessage('all', function() {
      Cards.pushCard('compose', 'default', 'animate',
                     { composer: composer });
    });
  },

  forward: function() {
    var needToPrompt = this.header.hasAttachments ||
      this.body.embeddedImageCount > 0;

    var forwardMessage = (function() {
      Cards.eatEventsUntilNextCard();
      var composer = this.header.forwardMessage('inline', function() {
        Cards.pushCard('compose', 'default', 'animate',
                       { composer: composer });
      });
    }.bind(this));

    if (needToPrompt) {
      var dialog = msgAttachmentDisabledConfirmNode.cloneNode(true);
      ConfirmDialog.show(dialog,
        {
          id: 'msg-attachment-disabled-ok',
          handler: function() {
            forwardMessage();
          }
        },
        {
          id: 'msg-attachment-disabled-cancel',
          handler: null
        }
      );
    } else {
      forwardMessage();
    }
  },

  // TODO: canReplyAll should be moved into GELAM.
  /** Returns true if Reply All should be shown as a distinct option. */
  canReplyAll: function() {
    // If any e-mail is listed as 'to' or 'cc' and doesn't match this
    // user's account, 'Reply All' should be enabled.
    var myAddresses = model.account.identities.map(function(ident) {
      return ident.address;
    });

    var otherAddresses = (this.header.to || []).concat(this.header.cc || []);
    if (this.header.replyTo) {
      otherAddresses.push(this.header.replyTo.author);
    }
    for (var i = 0; i < otherAddresses.length; i++) {
      if (myAddresses.indexOf(otherAddresses[i].address) == -1) {
        return true;
      }
    }

    return false;
  },

  onReplyMenu: function(event) {
    var contents = msgReplyMenuNode.cloneNode(true);
    document.body.appendChild(contents);

    // reply menu selection handling
    var formSubmit = (function(evt) {
      document.body.removeChild(contents);
      switch (evt.explicitOriginalTarget.className) {
      case 'msg-reply-menu-reply':
        this.reply();
        break;
      case 'msg-reply-menu-reply-all':
        this.replyAll();
        break;
      case 'msg-reply-menu-forward':
        this.forward();
        break;
      case 'msg-reply-menu-cancel':
        break;
      }
      return false;
    }).bind(this);
    contents.addEventListener('submit', formSubmit);

    if (!this.canForward()) {
      contents.querySelector('.msg-reply-menu-forward')
        .classList.add('collapsed');
    }

    if (!this.canReplyAll()) {
      contents.querySelector('.msg-reply-menu-reply-all')
        .classList.add('collapsed');
    }
  },

  onDelete: function() {
    var dialog = msgDeleteConfirmNode.cloneNode(true);
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'msg-delete-ok',
        handler: function() {
          var op = this.header.deleteMessage();
          Toaster.logMutation(op, true);
          Cards.removeCardAndSuccessors(this.domNode, 'animate');
        }.bind(this)
      },
      { // Cancel
        id: 'msg-delete-cancel',
        handler: null
      }
    );
  },

  onToggleStar: function() {
    var button = this.domNode.getElementsByClassName('msg-star-btn')[0];
    if (!this.hackMutationHeader.isStarred)
      button.classList.add('msg-btn-active');
    else
      button.classList.remove('msg-btn-active');

    this.hackMutationHeader.isStarred = !this.hackMutationHeader.isStarred;
    this.header.setStarred(this.hackMutationHeader.isStarred);
  },

  onMove: function() {
    //TODO: Please verify move functionality after api landed.
    Cards.folderSelector(function(folder) {
      var op = this.header.moveMessage(folder);
      Toaster.logMutation(op, true);
      Cards.removeCardAndSuccessors(this.domNode, 'animate');
    }.bind(this));
  },

  /**
   * Handle peep bubble click event and trigger context menu.
   */
  onEnvelopeClick: function(event) {
    var target = event.target;
    if (!target.classList.contains('msg-peep-bubble')) {
      return;
    }
    // - peep click
    this.onPeepClick(target);
  },

  onPeepClick: function(target) {
    var contents = msgContactMenuNode.cloneNode(true);
    var peep = target.peep;
    var headerNode = contents.getElementsByTagName('header')[0];
    // Setup the marquee structure
    Marquee.setup(peep.address, headerNode);

    // Activate marquee once the contents DOM are added to document
    document.body.appendChild(contents);
    // XXX Remove 'ease' if linear animation is wanted
    Marquee.activate('alternate', 'ease');

    // -- context menu selection handling
    var formSubmit = (function(evt) {
      document.body.removeChild(contents);
      switch (evt.explicitOriginalTarget.className) {
        // All of these mutations are immediately reflected, easily observed
        // and easily undone, so we don't show them as toaster actions.
        case 'msg-contact-menu-new':
          Cards.pushCard('compose', 'default', 'animate', {
            composerData: {
              message: this.header,
              onComposer: function(composer) {
                composer.to = [{
                  address: peep.address,
                  name: peep.name
                }];
              }
            }
          });
          break;
        case 'msg-contact-menu-view':
          var activity = new MozActivity({
            name: 'open',
            data: {
              type: 'webcontacts/contact',
              params: {
                'id': peep.contactId
              }
            }
          });
          break;
        case 'msg-contact-menu-create-contact':
          var params = {
            'email': peep.address
          };

          if (peep.name)
            params.givenName = peep.name;

          var activity = new MozActivity({
            name: 'new',
            data: {
              type: 'webcontacts/contact',
              params: params
            }
          });

          // since we already have contact change listeners that are hooked up
          // to the UI, we leave it up to them to update the UI for us.
          break;
        case 'msg-contact-menu-add-to-existing-contact':
          var activity = new MozActivity({
            name: 'update',
            data: {
              type: 'webcontacts/contact',
              params: {
                'email': peep.address
              }
            }
          });

          // since we already have contact change listeners that are hooked up
          // to the UI, we leave it up to them to update the UI for us.
          break;
        case 'msg-contact-menu-reply':
          //TODO: We need to enter compose view with specific email address.
          var composer = this.header.replyToMessage(null, function() {
            Cards.pushCard('compose', 'default', 'animate',
                           { composer: composer });
          });
          break;
      }
      return false;
    }).bind(this);
    contents.addEventListener('submit', formSubmit);

    // -- populate context menu
    var contextMenuOptions = this._contextMenuType.NEW_MESSAGE;
    var messageType = peep.type;

    if (messageType === 'from')
      contextMenuOptions |= this._contextMenuType.REPLY;

    if (peep.isContact) {
      contextMenuOptions |= this._contextMenuType.VIEW_CONTACT;
    } else {
      contextMenuOptions |= this._contextMenuType.CREATE_CONTACT;
      contextMenuOptions |= this._contextMenuType.ADD_TO_CONTACT;
    }

    if (contextMenuOptions & this._contextMenuType.VIEW_CONTACT)
      contents.querySelector('.msg-contact-menu-view')
        .classList.remove('collapsed');
    if (contextMenuOptions & this._contextMenuType.CREATE_CONTACT)
      contents.querySelector('.msg-contact-menu-create-contact')
        .classList.remove('collapsed');
    if (contextMenuOptions & this._contextMenuType.ADD_TO_CONTACT)
      contents.querySelector('.msg-contact-menu-add-to-existing-contact')
        .classList.remove('collapsed');
    if (contextMenuOptions & this._contextMenuType.REPLY)
      contents.querySelector('.msg-contact-menu-reply')
        .classList.remove('collapsed');
    if (contextMenuOptions & this._contextMenuType.NEW_MESSAGE)
      contents.querySelector('.msg-contact-menu-new')
        .classList.remove('collapsed');
  },

  onLoadBarClick: function(event) {
    var self = this;
    var loadBar = this.loadBar;
    if (!this.body.embeddedImagesDownloaded) {
      this.body.downloadEmbeddedImages(function() {
        // this gets nulled out when we get killed, so use this to bail.
        // XXX of course, this closure will cause us to potentially hold onto
        // a lot of garbage, so it would be better to add an
        // 'onimagesdownloaded' to body so that the closure would end up as
        // part of a cycle that would get collected.
        if (!self.domNode)
          return;

        for (var i = 0; i < self.htmlBodyNodes.length; i++) {
          self.body.showEmbeddedImages(self.htmlBodyNodes[i],
                                       self.iframeResizeHandler);
        }
      });
      // XXX really we should check for external images to display that load
      // bar, although it's a bit silly to have both in a single e-mail.
      loadBar.classList.add('collapsed');
    }
    else {
      for (var i = 0; i < this.htmlBodyNodes.length; i++) {
        this.body.showExternalImages(this.htmlBodyNodes[i],
                                     this.iframeResizeHandler);
      }
      loadBar.classList.add('collapsed');
    }
  },

  getAttachmentBlob: function(attachment, callback) {
    try {
      // Get the file contents as a blob, so we can open the blob
      var storageType = attachment._file[0];
      var filename = attachment._file[1];
      var storage = navigator.getDeviceStorage(storageType);
      var getreq = storage.get(filename);

      getreq.onerror = function() {
        console.warn('Could not open attachment file: ', filename,
                     getreq.error.name);
      };

      getreq.onsuccess = function() {
        // Now that we have the file, return the blob within callback function
        var blob = getreq.result;
        callback(blob);
      };
    } catch (ex) {
      console.warn('Exception getting attachment from device storage:',
                   attachment._file, '\n', ex, '\n', ex.stack);
    }
  },

  onDownloadAttachmentClick: function(node, attachment) {
    node.setAttribute('state', 'downloading');
    attachment.download(function downloaded() {
      if (!attachment._file)
        return;

      node.setAttribute('state', 'downloaded');
    });
  },

  onViewAttachmentClick: function(node, attachment) {
    console.log('trying to open', attachment._file, 'type:',
                attachment.mimetype);
    if (!attachment._file)
      return;

    if (attachment.isDownloaded) {
      this.getAttachmentBlob(attachment, function(blob) {
        try {
          // Now that we have the file, use an activity to open it
          if (!blob) {
            throw new Error('Blob does not exist');
          }

          // To delegate a correct activity, we should try to avoid the unsure
          // mimetype because types like "application/octet-stream" which told
          // by the e-mail client are not supported.
          // But it doesn't mean we really don't support that attachment
          // what we can do here is:
          // 1. Check blob.type, most of the time it will not be empty
          //    because it's reported by deviceStorage, it should be a
          //    correct mimetype, or
          // 2. Use the original mimetype from the attachment,
          //    but it's possibly an unsupported mimetype, like
          //    "application/octet-stream" which cannot be used correctly, or
          // 3. Use MimeMapper to help us, if it's still an unsure mimetype,
          //    MimeMapper can guess the possible mimetype from extension,
          //    then we can delegate a right activity.
          var extension = attachment.filename.split('.').pop();
          var originalType = blob.type || attachment.mimetype;
          var mappedType = (MimeMapper.isSupportedType(originalType)) ?
            originalType : MimeMapper.guessTypeFromExtension(extension);

          var activity = new MozActivity({
            name: 'open',
            data: {
              type: mappedType,
              blob: blob
            }
          });
          activity.onerror = function() {
            console.warn('Problem with "open" activity', activity.error.name);
          };
          activity.onsuccess = function() {
            console.log('"open" activity allegedly succeeded');
          };
        }
        catch (ex) {
          console.warn('Problem creating "open" activity:', ex, '\n', ex.stack);
        }
      });
    }
  },

  onHyperlinkClick: function(event, linkNode, linkUrl, linkText) {
    var dialog = msgBrowseConfirmNode.cloneNode(true);
    var content = dialog.getElementsByTagName('p')[0];
    content.textContent = mozL10n.get('browse-to-url-prompt', { url: linkUrl });
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'msg-browse-ok',
        handler: function() {
          window.open(linkUrl, '_blank');
        }.bind(this)
      },
      { // Cancel
        id: 'msg-browse-cancel',
        handler: null
      }
    );
  },

  _populatePlaintextBodyNode: function(bodyNode, rep) {
    for (var i = 0; i < rep.length; i += 2) {
      var node = document.createElement('div'), cname;

      var etype = rep[i] & 0xf, rtype = null;
      if (etype === 0x4) {
        var qdepth = (((rep[i] >> 8) & 0xff) + 1);
        if (qdepth > 8)
          cname = MAX_QUOTE_CLASS_NAME;
        else
          cname = CONTENT_QUOTE_CLASS_NAMES[qdepth];
      }
      else {
        cname = CONTENT_TYPES_TO_CLASS_NAMES[etype];
      }
      if (cname)
        node.setAttribute('class', cname);

      var subnodes = model.api.utils.linkifyPlain(rep[i + 1], document);
      for (var iNode = 0; iNode < subnodes.length; iNode++) {
        node.appendChild(subnodes[iNode]);
      }

      bodyNode.appendChild(node);
    }
  },

  buildHeaderDom: function(domNode) {
    var header = this.header, body = this.body;

    // -- Header
    function updatePeep(peep) {
      var nameNode = peep.element.getElementsByClassName('msg-peep-content')[0];

      if (peep.type === 'from') {
        // We display the sender of the message's name in the header and the
        // address in the bubble.
        domNode.getElementsByClassName('msg-reader-header-label')[0]
          .textContent = peep.name || peep.address;

        nameNode.textContent = peep.address;
        nameNode.classList.add('msg-peep-address');
      }
      else {
        nameNode.textContent = peep.name || peep.address;
        if (!peep.name && peep.address) {
          nameNode.classList.add('msg-peep-address');
        } else {
          nameNode.classList.remove('msg-peep-address');
        }
      }
    }

    function addHeaderEmails(type, peeps) {
      var lineClass = 'msg-envelope-' + type + '-line';
      var lineNode = domNode.getElementsByClassName(lineClass)[0];

      if (!peeps || !peeps.length) {
        lineNode.classList.add('collapsed');
        return;
      }

      // Make sure it is not hidden from a next/prev action.
      lineNode.classList.remove('collapsed');

      // Because we can avoid having to do multiple selector lookups, we just
      // mutate the template in-place...
      var peepTemplate = msgPeepBubbleNode;

      for (var i = 0; i < peeps.length; i++) {
        var peep = peeps[i];
        peep.type = type;
        peep.element = peepTemplate.cloneNode(true);
        peep.element.peep = peep;
        peep.onchange = updatePeep;
        updatePeep(peep);
        lineNode.appendChild(peep.element);
      }
    }

    addHeaderEmails('from', [header.author]);
    addHeaderEmails('to', header.to);
    addHeaderEmails('cc', header.cc);
    addHeaderEmails('bcc', header.bcc);

    var dateNode = domNode.getElementsByClassName('msg-envelope-date')[0];
    dateNode.dataset.time = header.date.valueOf();
    dateNode.textContent = prettyDate(header.date);

    displaySubject(domNode.getElementsByClassName('msg-envelope-subject')[0],
                   header);
  },

  clearDom: function() {
    var domNode = this.domNode;
    if (!domNode) {
      // Nothing to do!
      return;
    }

    // Clear header emails.
    Array.slice(domNode.querySelectorAll('.msg-peep-bubble')).forEach(
      function(node) {
        node.parentNode.removeChild(node);
      }
    );

    // Nuke rendered attachments.
    var attachmentsContainer =
      domNode.getElementsByClassName('msg-attachments-container')[0];
    attachmentsContainer.innerHTML = '';

    // Nuke existing body, show progress while waiting
    // for message to load.
    this.rootBodyNode.innerHTML = '<progress></progress>';

    // Make sure load bar is not shown between loads too.
    this.loadBar.classList.add('collapsed');
  },

  /**
   * Render the DOM nodes for bodyReps and the attachments container.
   * If we have information on which parts of the message changed,
   * only update those DOM nodes; otherwise, update the whole thing.
   *
   * @param {object} changeDetails
   * @param {array} changeDetails.bodyReps An array of changed item indexes.
   * @param {array} changeDetails.attachments An array of changed item indexes.
   */
  buildBodyDom: function(/* optional */ changeDetails) {
    var body = this.body,
        domNode = this.domNode,
        rootBodyNode = this.rootBodyNode,
        reps = body.bodyReps,
        hasExternalImages = false,
        showEmbeddedImages = body.embeddedImageCount &&
                             body.embeddedImagesDownloaded;


    // The first time we build the body DOM, do one-time bootstrapping:
    if (!this._builtBodyDom) {
      iframeShims.bindSanitizedClickHandler(rootBodyNode,
                                            this.onHyperlinkClick.bind(this),
                                            rootBodyNode,
                                            null);
      this._builtBodyDom = true;
    }

    // If we have fully downloaded one body part, the user has
    // something to read so get rid of the spinner.
    // XXX: Potentially improve the UI to show if we're still
    // downloading the rest of the body even if we already have some
    // of it.
    if (reps.length && reps[0].isDownloaded) {
      // remove progress bar if we've retrieved the first rep
      var progressNode = rootBodyNode.querySelector('progress');
      if (progressNode) {
        progressNode.parentNode.removeChild(progressNode);
      }
    }

    // The logic below depends on having removed the progress node!

    for (var iRep = 0; iRep < reps.length; iRep++) {
      var rep = reps[iRep];

      // Create an element to hold this body rep. Even if we aren't
      // updating this rep right now, we need to have a placeholder.
      var repNode = rootBodyNode.childNodes[iRep];
      if (!repNode) {
        repNode = rootBodyNode.appendChild(document.createElement('div'));
      }

      // Skip updating this rep if it's not updated.
      if (changeDetails && changeDetails.bodyReps &&
          changeDetails.bodyReps.indexOf(iRep) === -1) {
        continue;
      }

      // Wipe out the existing contents of the rep node so we can
      // replace it. We can just nuke innerHTML since we add click
      // handlers on the rootBodyNode, and for text/html parts the
      // listener is a child of repNode so it will get destroyed too.
      repNode.innerHTML = '';

      if (rep.type === 'plain') {
        this._populatePlaintextBodyNode(repNode, rep.content);
      }
      else if (rep.type === 'html') {
        var iframeShim = iframeShims.createAndInsertIframeForContent(
          rep.content, this.scrollContainer, repNode, null,
          'interactive', this.onHyperlinkClick.bind(this));
        var iframe = iframeShim.iframe;
        var bodyNode = iframe.contentDocument.body;
        this.iframeResizeHandler = iframeShim.resizeHandler;
        model.api.utils.linkifyHTML(iframe.contentDocument);
        this.htmlBodyNodes.push(bodyNode);

        if (body.checkForExternalImages(bodyNode))
          hasExternalImages = true;
        if (showEmbeddedImages)
          body.showEmbeddedImages(bodyNode, this.iframeResizeHandler);
      }
    }

    // The image logic checks embedded image counts, so this should be
    // able to run every time:
    // -- HTML-referenced Images
    var loadBar = this.loadBar;
    if (body.embeddedImageCount && !body.embeddedImagesDownloaded) {
      loadBar.classList.remove('collapsed');
      loadBar.textContent =
        mozL10n.get('message-download-images',
                    { n: body.embeddedImageCount });
    }
    else if (hasExternalImages) {
      loadBar.classList.remove('collapsed');
      loadBar.textContent =
        mozL10n.get('message-show-external-images');
    }
    else {
      loadBar.classList.add('collapsed');
    }

    // -- Attachments (footer)
    // An attachment can be in 1 of 3 possible states for UI purposes:
    // - Not downloadable: We can't download this message because we wouldn't
    //   be able to do anything with it if we downloaded it.  Anything that's
    //   not a supported image type falls in this category.
    // - Downloadable, not downloaded: The user can trigger download of the
    //   attachment to DeviceStorage.
    // - Downloadable, downloaded: The attachment is already fully downloaded
    //   to DeviceStorage and we can trigger its display.
    var attachmentsContainer =
      domNode.getElementsByClassName('msg-attachments-container')[0];
    if (body.attachments && body.attachments.length) {
      // If buildBodyDom is called multiple times, the attachment
      // state might change, so we must ensure the attachment list is
      // not collapsed if we now have attachments.
      attachmentsContainer.classList.remove('collapsed');
      // We need MimeMapper to help us determining the downloadable attachments
      // but it might not be loaded yet, so load before use it
      require(['shared/js/mime_mapper'], function(mapper) {
        if (!MimeMapper)
          MimeMapper = mapper;

        var attTemplate = msgAttachmentItemNode,
            filenameTemplate =
              attTemplate.getElementsByClassName('msg-attachment-filename')[0],
            filesizeTemplate =
              attTemplate.getElementsByClassName('msg-attachment-filesize')[0];
        for (var iAttach = 0; iAttach < body.attachments.length; iAttach++) {

          // Create an element to hold this attachment.
          var attNode = attachmentsContainer.childNodes[iAttach];
          if (!attNode) {
            attNode = attachmentsContainer.appendChild(
              document.createElement('li'));
          }

          // Skip updating this attachment if it's not updated.
          if (changeDetails && changeDetails.attachments &&
              changeDetails.attachments.indexOf(iAttach) === -1) {
            continue;
          }

          var attachment = body.attachments[iAttach], state;
          var extension = attachment.filename.split('.').pop();

          if (attachment.isDownloaded)
            state = 'downloaded';
          else if (!attachment.isDownloadable)
            state = 'nodownload';
          else if (MimeMapper.isSupportedType(attachment.mimetype) ||
                   MimeMapper.isSupportedExtension(extension))
            state = 'downloadable';
          else
            state = 'nodownload';
          attTemplate.setAttribute('state', state);
          filenameTemplate.textContent = attachment.filename;
          filesizeTemplate.textContent = prettyFileSize(
            attachment.sizeEstimateInBytes);

          var attachmentNode = attTemplate.cloneNode(true);
          attachmentsContainer.replaceChild(attachmentNode, attNode);
          attachmentNode.getElementsByClassName('msg-attachment-download')[0]
            .addEventListener('click',
                              this.onDownloadAttachmentClick.bind(
                                this, attachmentNode, attachment));
          attachmentNode.getElementsByClassName('msg-attachment-view')[0]
            .addEventListener('click',
                              this.onViewAttachmentClick.bind(
                                this, attachmentNode, attachment));
          this.enableReply();
        }
      }.bind(this));
    }
    else {
      attachmentsContainer.classList.add('collapsed');
      this.enableReply();
    }
  },

  disableReply: function() {
    var btn = this.domNode.getElementsByClassName('msg-reply-btn')[0];
    btn.setAttribute('aria-disabled', true);
  },

  enableReply: function() {
    var btn = this.domNode.getElementsByClassName('msg-reply-btn')[0];
    btn.removeAttribute('aria-disabled');
  },

  die: function() {
    headerCursor.removeListener('messageSuidNotFound',
                                this.onMessageSuidNotFound);
    headerCursor.removeListener('currentMessage', this.onCurrentMessage);

    // Our header was makeCopy()d from the message-list and so needs to be
    // explicitly removed since it is not part of a slice.
    if (this.header) {
      this.header.__die();
      this.header = null;
    }
    if (this.body) {
      this.body.die();
      this.body = null;
    }
    this.domNode = null;
  }
};

evt.mix(MessageReaderCard.prototype);

Cards.defineCardWithDefaultMode(
    'message_reader',
    { tray: false },
    MessageReaderCard,
    templateNode
);

return MessageReaderCard;
});
