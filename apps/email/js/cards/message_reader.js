/*global MozActivity */
'use strict';
define(function(require) {

var MimeMapper,
    msgDeleteConfirmNode = require('tmpl!./msg/delete_confirm.html'),
    msgContactMenuNode = require('tmpl!./msg/contact_menu.html'),
    msgReplyMenuNode = require('tmpl!./msg/reply_menu.html'),
    msgBrowseConfirmNode = require('tmpl!./msg/browse_confirm.html'),
    msgPeepBubbleNode = require('tmpl!./msg/peep_bubble.html'),
    msgAttachmentItemNode = require('tmpl!./msg/attachment_item.html'),
    msgAttachmentDisabledConfirmNode =
                         require('tmpl!./msg/attachment_disabled_confirm.html'),
    msgAttachmentDidNotOpenAlertNode =
      require('tmpl!./msg/attachment_did_not_open_alert.html'),
    cards = require('cards'),
    ConfirmDialog = require('confirm_dialog'),
    date = require('date'),
    toaster = require('toaster'),
    model = require('model'),
    headerCursor = require('header_cursor').cursor,
    evt = require('evt'),
    iframeShims = require('iframe_shims'),
    Marquee = require('marquee'),
    mozL10n = require('l10n!'),
    queryURI = require('query_uri'),
    mimeToClass = require('mime_to_class'),
    fileDisplay = require('file_display'),
    messageDisplay = require('message_display');

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

var OCTET_STREAM_TYPE = 'application/octet-stream';

// This function exists just to avoid lint errors around
// "do not use 'new' for side effects.
function sendActivity(obj) {
  return new MozActivity(obj);
}

return [
  require('./base')(require('template!./message_reader.html')),
  {
    createdCallback: function() {
      // The body elements for the (potentially multiple) iframes we created to
      // hold HTML email content.
      this.htmlBodyNodes = [];

      this._on('msg-up-btn', 'click', 'onPrevious');
      this._on('msg-down-btn', 'click', 'onNext');
      this._on('msg-reply-btn', 'click', 'onReplyMenu');
      this._on('msg-delete-btn', 'click', 'onDelete');
      this._on('msg-star-btn', 'click', 'onToggleStar');
      this._on('msg-move-btn', 'click', 'onMove');
      this._on('msg-mark-read-btn', 'click', 'onMarkRead');
      this._on('msg-envelope-bar', 'click', 'onEnvelopeClick');
      this._on('msg-reader-load-infobar', 'click', 'onLoadBarClick');

      this._emittedContentEvents = false;
      this.disableReply();

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
    },

    onArgs: function(args) {
      this.messageSuid = args.messageSuid;
    },

    _contextMenuType: {
      VIEW_CONTACT: 1,
      CREATE_CONTACT: 2,
      ADD_TO_CONTACT: 4,
      REPLY: 8,
      NEW_MESSAGE: 16
    },

    /**
     * Inform Cards to not emit startup content events, this card will trigger
     * them once data from back end has been received and the DOM is up to date
     * with that data.
     * @type {Boolean}
     */
    skipEmitContentEvents: true,

    // Method to help bind event listeners to method names, and ensures
    // a header object before activating the method, to protect the buttons
    // from being activated while the model is still loading.
    _on: function(className, eventName, method, skipProtection) {
      this.getElementsByClassName(className)[0]
      .addEventListener(eventName, function(evt) {
        if (this.header || skipProtection) {
          return this[method](evt);
        }
      }.bind(this), false);
    },

    _setHeader: function(header) {
      this.header = header.makeCopy();
      this.hackMutationHeader = header;

      // - mark message read (if it is not already)
      if (!this.header.isRead) {
        this.header.setRead(true);
      } else {
        this.readBtn.classList.remove('unread');
        mozL10n.setAttributes(this.readBtn, 'message-mark-read-button');
      }

      this.starBtn.classList.toggle('msg-star-btn-on',
                                     this.hackMutationHeader.isStarred);
      this.starBtn.setAttribute('aria-pressed',
        this.hackMutationHeader.isStarred);

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
      cards.removeCardAndSuccessors(this, 'animate');
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
     * @param {MessageCursor.CurrentMessage} currentMessage representation of
     * the email we're currently reading.
     */
    onCurrentMessage: function(currentMessage) {
      // If the card is not in the DOM yet, do not proceed, as
      // the iframe work needs to happen once DOM is available.
      if (!this._inDom) {
        this._afterInDomMessage = currentMessage;
        return;
      }

      // Ignore doing extra work if current message is the same as the one
      // already tied to this message reader.
      if (this.header && this.header.id === currentMessage.header.id) {
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
        this.buildHeaderDom(this);

        this.header.getBody({ downloadBodyReps: true }, function(body) {
          // If the header has changed since the last getBody call, ignore.
          if (this.header.id !== body.id) {
            return;
          }

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
      cards.eatEventsUntilNextCard();
      var composer = this.header.replyToMessage(null, function() {
        cards.pushCard('compose', 'animate', { composer: composer });
      });
    },

    replyAll: function() {
      cards.eatEventsUntilNextCard();
      var composer = this.header.replyToMessage('all', function() {
        cards.pushCard('compose', 'animate', { composer: composer });
      });
    },

    forward: function() {
      var needToPrompt = this.header.hasAttachments ||
        this.body.embeddedImageCount > 0;

      var forwardMessage = (function() {
        cards.eatEventsUntilNextCard();
        var composer = this.header.forwardMessage('inline', function() {
          cards.pushCard('compose', 'animate', { composer: composer });
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
      if (this.header.replyTo && this.header.replyTo.author) {
        otherAddresses.push(this.header.replyTo.author);
      }
      for (var i = 0; i < otherAddresses.length; i++) {
        var otherAddress = otherAddresses[i];
        if (otherAddress.address &&
            myAddresses.indexOf(otherAddress.address) == -1) {
          return true;
        }
      }

      return false;
    },

    onReplyMenu: function(event) {
      var contents = msgReplyMenuNode.cloneNode(true);
      cards.setStatusColor(contents);
      document.body.appendChild(contents);

      // reply menu selection handling
      var formSubmit = (function(evt) {
        cards.setStatusColor();
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

      if (!this.canReplyAll()) {
        contents.querySelector('.msg-reply-menu-reply-all')
          .classList.add('collapsed');
      }
    },

    onDelete: function() {
      var dialog = msgDeleteConfirmNode.cloneNode(true);
      var content = dialog.getElementsByTagName('p')[0];
      mozL10n.setAttributes(content, 'message-edit-delete-confirm');
      ConfirmDialog.show(dialog,
        { // Confirm
          id: 'msg-delete-ok',
          handler: function() {
            var op = this.header.deleteMessage();
            cards.removeCardAndSuccessors(this, 'animate');
            toaster.toastOperation(op);
          }.bind(this)
        },
        { // Cancel
          id: 'msg-delete-cancel',
          handler: null
        }
      );
    },

    onToggleStar: function() {
      this.starBtn.classList.toggle('msg-star-btn-on',
                                    !this.hackMutationHeader.isStarred);

      this.hackMutationHeader.isStarred = !this.hackMutationHeader.isStarred;
      this.starBtn.setAttribute('aria-pressed',
        this.hackMutationHeader.isStarred);
      this.header.setStarred(this.hackMutationHeader.isStarred);
    },

    onMove: function() {
      //TODO: Please verify move functionality after api landed.
      cards.folderSelector(function(folder) {
        var op = this.header.moveMessage(folder);
        cards.removeCardAndSuccessors(this, 'animate');
        toaster.toastOperation(op);
      }.bind(this), function(folder) {
        return folder.isValidMoveTarget;
      });
    },

    setRead: function(isRead) {
      this.hackMutationHeader.isRead = isRead;
      this.header.setRead(isRead);

      // Want the button state to reflect the current read state.
      this.readBtn.classList.toggle('unread', !isRead);
      mozL10n.setAttributes(this.readBtn,
        isRead ? 'message-mark-read-button' : 'message-mark-unread-button');
    },

    onMarkRead: function() {
      this.setRead(!this.hackMutationHeader.isRead);
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
            cards.pushCard('compose', 'animate', {
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
            sendActivity({
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

            if (peep.name) {
              params.givenName = peep.name;
            }

            sendActivity({
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
            sendActivity({
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
              cards.pushCard('compose', 'animate',
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

      if (messageType === 'from') {
        contextMenuOptions |= this._contextMenuType.REPLY;
      }

      if (peep.isContact) {
        contextMenuOptions |= this._contextMenuType.VIEW_CONTACT;
      } else {
        contextMenuOptions |= this._contextMenuType.CREATE_CONTACT;
        contextMenuOptions |= this._contextMenuType.ADD_TO_CONTACT;
      }

      if (contextMenuOptions & this._contextMenuType.VIEW_CONTACT) {
        contents.querySelector('.msg-contact-menu-view')
          .classList.remove('collapsed');
      }
      if (contextMenuOptions & this._contextMenuType.CREATE_CONTACT) {
        contents.querySelector('.msg-contact-menu-create-contact')
          .classList.remove('collapsed');
      }
      if (contextMenuOptions & this._contextMenuType.ADD_TO_CONTACT) {
        contents.querySelector('.msg-contact-menu-add-to-existing-contact')
          .classList.remove('collapsed');
      }
      if (contextMenuOptions & this._contextMenuType.REPLY) {
        contents.querySelector('.msg-contact-menu-reply')
          .classList.remove('collapsed');
      }
      if (contextMenuOptions & this._contextMenuType.NEW_MESSAGE) {
        contents.querySelector('.msg-contact-menu-new')
          .classList.remove('collapsed');
      }
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
          if (!self.body) {
            return;
          }

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
      // We register all downloads with the download manager.  Previously we had
      // thought about only registering non-media types because the media types
      // were already covered by built-in apps.  But we didn't have a good
      // reason for that; perhaps risk avoidance?  So everybody gets logged!
      // Note that POP3 also does this, but that happens in pop3/sync.js in
      // the back-end and the front-end has no control over that.
      var registerWithDownloadManager = true;
      attachment.download(function downloaded() {
        if (!attachment._file) {
          return;
        }

        node.setAttribute('state', 'downloaded');
      }, null, registerWithDownloadManager);
    },

    onViewAttachmentClick: function(node, attachment) {
      console.log('trying to open', attachment._file, 'known type:',
                  attachment.mimetype);
      if (!attachment._file) {
        return;
      }

      if (attachment.isDownloaded) {
        this.getAttachmentBlob(attachment, function(blob) {
          try {
            // Now that we have the file, use an activity to open it
            if (!blob) {
              throw new Error('Blob does not exist');
            }

            // - Figure out the best MIME type
            //
            // We have three MIME type databases at our disposal:
            //
            // - mimetypes(.js): A reasonably comprehensive database but that's
            //   not continually updated and potentially is out-of-date about
            //   some audio and video types.
            //
            // - nsIMIMEService via DeviceStorage.  Anything that was stored
            //   in DeviceStorage will have its MIME type looked-up using
            //   nsIMIMEService which in turn checks a short hard-coded list
            //   (mainly containing the core web video/audio/doc types),
            //   preferences, the OS, extensions, plugins, category manager
            //   stuff, and then a slightly longer list of hard-coded entries.
            //
            // - shared/js/mime_mapper.js: It knows about all of the media types
            //   supported by Gecko and our media apps.  It at least has
            //   historically been updated pretty promptly.
            //
            //
            // For IMAP and POP3, we get the MIME type from the composer of the
            // message.  They explicitly include a MIME type.  Assuming the
            // author of the message also created the attachment, there's a very
            // high probability they included a valid MIME type (based on a
            // local file extension mapping).  If the author forwarded a message
            // with the attachment maintained, there's also a good chance the
            // MIME type was maintained.  If the author downloaded the
            // attachment but lacked a mapping for the file extension, the
            // reported MIME type is probably application/octet-stream.  As
            // of writing this, our IMAP and POP3 implementations do not
            // second-guess the reported MIME type if it is
            // application/octet-stream.
            //
            // In the ActiveSync case, we are not given any MIME type
            // information and our ActiveSync library uses mimetypes.js to
            // map the extension type.  This may result in
            // application/octet-stream being returned.
            //
            // Given all of this, our process for determining MIME types is to:
            // - Trust the MIME type we have on file for the message if it's
            //   anything other than application/octet-stream.
            var useType = attachment.mimetype;
            // - If it was octet-stream (or somehow missing), we check if
            //   DeviceStorage has an opinion.  We use it if so.
            if (!useType || useType === OCTET_STREAM_TYPE) {
              useType = blob.type;
            }
            // - If we still think it's octet-stream (or falsey), we ask the
            //   MimeMapper to map the file extension to a MIME type.
            if (!useType || useType === OCTET_STREAM_TYPE) {
              useType = MimeMapper.guessTypeFromFileProperties(
                          attachment.filename, OCTET_STREAM_TYPE);
            }
            // - If it's falsey (MimeMapper returns an emptry string if it
            //   can't map), we set the value to application/octet-stream.
            if (!useType) {
              useType = OCTET_STREAM_TYPE;
            }
            // - At this point, we're fine with application/octet-stream.
            //   Although there are some file-types where we can just chuck
            //   "application/" on the front, there aren't enough of them.
            //   Apps can, however, use a regexp filter on the filename we
            //   provide to capture extension types that way.
            console.log('triggering open activity with MIME type:', useType);

            var activity = new MozActivity({
              name: 'open',
              data: {
                type: useType,
                filename: attachment.filename,
                blob: blob,
                // the PDF viewer really wants a "url".  download_helper.js
                // provides the local filesystem path which is sketchy and
                // non-sensical.  We just provide the filename again.
                url: attachment.filename
              }
            });
            activity.onerror = function() {
              console.warn('Problem with "open" activity', activity.error.name);
              // NO_PROVIDER is returned if there's nothing to service the
              // activity.
              if (activity.error.name === 'NO_PROVIDER') {
                var dialog = msgAttachmentDidNotOpenAlertNode.cloneNode(true);
                ConfirmDialog.show(dialog,
                  {
                    id: 'msg-attachment-did-not-open-ok',
                    handler: null
                  },
                  {
                    handler: null
                  }
                );
              }
            };
            activity.onsuccess = function() {
              console.log('"open" activity allegedly succeeded');
            };
          }
          catch (ex) {
            console.warn('Problem creating "open" activity:', ex, '\n',
                         ex.stack);
          }
        });
      }
    },

    onHyperlinkClick: function(event, linkNode, linkUrl, linkText) {
      var dialog = msgBrowseConfirmNode.cloneNode(true);
      var content = dialog.getElementsByTagName('p')[0];
      mozL10n.setAttributes(content, 'browse-to-url-prompt', { url: linkUrl });
      ConfirmDialog.show(dialog,
        { // Confirm
          id: 'msg-browse-ok',
          handler: function() {
            if (/^mailto:/i.test(linkUrl)) {
              // Fast path to compose. Works better than an activity, since
              // "canceling" the activity has freaky consequences: what does it
              // mean to cancel ourselves? What is the sound of one hand
              // clapping?
              var data = queryURI(linkUrl);
              cards.pushCard('compose', 'animate', {
                composerData: {
                  onComposer: function(composer, composeCard) {
                    // Copy the to, cc, bcc, subject, body to the compose.
                    // It is OK to do this blind key copy since queryURI
                    // explicitly only populates expected fields, does not
                    // blindly accept input from the outside, and the queryURI
                    // properties match the property names allowed on composer.
                    Object.keys(data).forEach(function(key) {
                      composer[key] = data[key];
                    });
                  }
                }
              });
            } else {
              // Pop out to what is likely the browser, or the user's preferred
              // viewer for the URL. This keeps the URL out of our cookie
              // jar/data space too.
              sendActivity({
                name: 'view',
                data: {
                  type: 'url',
                  url: linkUrl
                }
              });
            }
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

        var etype = rep[i] & 0xf;
        if (etype === 0x4) {
          var qdepth = (((rep[i] >> 8) & 0xff) + 1);
          if (qdepth > 8) {
            cname = MAX_QUOTE_CLASS_NAME;
          } else {
            cname = CONTENT_QUOTE_CLASS_NAMES[qdepth];
          }
        }
        else {
          cname = CONTENT_TYPES_TO_CLASS_NAMES[etype];
        }
        if (cname) {
          node.setAttribute('class', cname);
        }

        var subnodes = model.api.utils.linkifyPlain(rep[i + 1], document);
        for (var iNode = 0; iNode < subnodes.length; iNode++) {
          node.appendChild(subnodes[iNode]);
        }

        bodyNode.appendChild(node);
      }
    },

    buildHeaderDom: function(domNode) {
      var header = this.header;

      // -- Header
      function updatePeep(peep) {
        var nameNode = peep.element.querySelector('.msg-peep-content');

        if (peep.type === 'from') {
          // We display the sender of the message's name in the header and the
          // address in the bubble.
          domNode.querySelector('.msg-reader-header-label')
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

      var dateNode = domNode.querySelector('.msg-envelope-date');
      dateNode.dataset.time = header.date.valueOf();
      dateNode.textContent = date.prettyDate(header.date);

      messageDisplay.subject(domNode.querySelector('.msg-envelope-subject'),
                             header);
    },

    clearDom: function() {
      // Clear header emails.
      Array.slice(this.querySelectorAll('.msg-peep-bubble')).forEach(
        function(node) {
          node.parentNode.removeChild(node);
        }
      );

      // Nuke rendered attachments.
      var attachmentsContainer =
        this.querySelector('.msg-attachments-container');
      attachmentsContainer.innerHTML = '';

      // Nuke existing body, show progress while waiting
      // for message to load.
      this.rootBodyNode.innerHTML =
        '<progress data-l10n-id="message-body-container-progress"></progress>';

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
     * @param {array} changeDetails.attachments An array of changed item
     * indexes.
     */
    buildBodyDom: function(/* optional */ changeDetails) {
      var body = this.body;

      // If the card has been destroyed (so no more body, as it is nulled in
      // die()) or header has changed since this method was scheduled to be
      // called (rapid taps of the next/previous buttons), ingore the call.
      if (!body || this.header.id !== body.id) {
        return;
      }

      var domNode = this,
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

          if (body.checkForExternalImages(bodyNode)) {
            hasExternalImages = true;
          }
          if (showEmbeddedImages) {
            body.showEmbeddedImages(bodyNode, this.iframeResizeHandler);
          }
        }
      }

      // The image logic checks embedded image counts, so this should be
      // able to run every time:
      // -- HTML-referenced Images
      var loadBar = this.loadBar;
      if (body.embeddedImageCount && !body.embeddedImagesDownloaded) {
        loadBar.classList.remove('collapsed');
        mozL10n.setAttributes(this.loadBarText, 'message-download-images-tap',
                              { n: body.embeddedImageCount });
      }
      else if (hasExternalImages) {
        loadBar.classList.remove('collapsed');
        mozL10n.setAttributes(this.loadBarText, 'message-show-external-images');
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
                            domNode.querySelector('.msg-attachments-container');
      if (body.attachments && body.attachments.length) {
        // If buildBodyDom is called multiple times, the attachment
        // state might change, so we must ensure the attachment list is
        // not collapsed if we now have attachments.
        attachmentsContainer.classList.remove('collapsed');
        // We need MimeMapper to help us determining the downloadable
        // attachments but it might not be loaded yet, so load before use it.
        require(['shared/js/mime_mapper'], function(mapper) {
          if (!MimeMapper) {
            MimeMapper = mapper;
          }

          var attTemplate = msgAttachmentItemNode,
              filenameTemplate =
                attTemplate.querySelector('.msg-attachment-filename'),
              filesizeTemplate =
                attTemplate.querySelector('.msg-attachment-filesize');
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

            var MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
            var attachmentDownloadable = true;
            var mimeClass = mimeToClass(attachment.mimetype ||
                            MimeMapper.guessTypeFromExtension(extension));

            if (attachment.isDownloaded) {
              state = 'downloaded';
            } else if (!attachment.isDownloadable) {
              state = 'nodownload';
              attachmentDownloadable = false;
            } else if (attachment.sizeEstimateInBytes > MAX_ATTACHMENT_SIZE) {
              state = 'toolarge';
              attachmentDownloadable = false;
            } else {
              state = 'downloadable';
            }
            attTemplate.setAttribute('state', state);
            filenameTemplate.textContent = attachment.filename;
            fileDisplay.fileSize(filesizeTemplate,
                                 attachment.sizeEstimateInBytes);

            var attachmentNode = attTemplate.cloneNode(true);
            attachmentNode.classList.add(mimeClass);
            attachmentsContainer.replaceChild(attachmentNode, attNode);

            var downloadButton = attachmentNode.querySelector(
                                 '.msg-attachment-download');
            downloadButton.disabled = !attachmentDownloadable;
            if (attachmentDownloadable) {
              downloadButton.addEventListener(
                'click', this.onDownloadAttachmentClick.bind(
                  this, attachmentNode, attachment));
            }
            attachmentNode.setAttribute('aria-disabled',
              !attachmentDownloadable);
            attachmentNode.querySelector('.msg-attachment-view')
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
      var btn = this.querySelector('.msg-reply-btn');
      btn.setAttribute('aria-disabled', true);
    },

    enableReply: function() {
      var btn = this.querySelector('.msg-reply-btn');
      btn.removeAttribute('aria-disabled');

      // Inform that content is ready. Done here because reply is only enabled
      // once the full body is available.
      if (!this._emittedContentEvents) {
        evt.emit('metrics:contentDone');
        this._emittedContentEvents = true;
      }
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
    }
  }
];
});
