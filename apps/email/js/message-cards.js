/**
 * Card definitions/logic for the message list, message reader, and message
 * search.
 **/

function MessageListCard(domNode, mode, args) {
  this.domNode = domNode;
  this.scrollNode = domNode.getElementsByClassName('msg-list-scrollouter')[0];

  this.messagesContainer =
    domNode.getElementsByClassName('msg-messages-container')[0];

  domNode.getElementsByClassName('msg-folder-list-btn')[0]
    .addEventListener('click', this.onShowFolders.bind(this), false);
  domNode.getElementsByClassName('msg-compose-btn')[0]
    .addEventListener('click', this.onCompose.bind(this), false);

  // clicking shows the message reader for a message
  bindContainerHandler(this.messagesContainer, 'click',
                       this.onClickMessage.bind(this));
  // press-and-hold shows the single-message mutation options
  // (gaia/b2g maps a press for 1 second to context menu)
  bindContainerHandler(this.messagesContainer, 'contextmenu',
                       this.onHoldMessage.bind(this));

  domNode.getElementsByClassName('msg-refresh-btn')[0]
    .addEventListener('click', this.onRefresh.bind(this), false);

  this.curFolder = null;
  this.messagesSlice = null;
  this.showFolder(args.folder);

  // Right now, the contextmenu event does not suppress the subsequent click,
  // so we set this flag when we see contextmenu.
  this._suppressClick = false;
}
MessageListCard.prototype = {
  postInsert: function() {
    this._hideSearchBoxByScrolling();
  },

  _hideSearchBoxByScrolling: function() {
    // scroll the search bit out of the way
    var searchBar =
      this.domNode.getElementsByClassName('msg-search-tease-bar')[0];
    this.scrollNode.scrollTop = searchBar.offsetHeight;
  },

  onShowFolders: function() {
    Cards.moveToCard(['folder-picker', 'navigation']);
  },

  onCompose: function() {
    var composer = MailAPI.beginMessageComposition(null, this.curFolder, null,
      function composerReady() {
        Cards.pushCard('compose', 'default', 'animate',
                       { composer: composer });
      });
  },

  /**
   * Show a folder, returning true if we actually changed folders or false if
   * we did nothing because we were already in the folder.
   */
  showFolder: function(folder) {
    if (folder === this.curFolder)
      return false;

    if (this.messagesSlice) {
      this.messagesSlice.die();
      this.messagesSlice = null;
      this.messagesContainer.innerHTML = '';
    }
    this.curFolder = folder;

    this.domNode.getElementsByClassName('msg-list-header-folder-label')[0]
      .textContent = folder.name;

    this.messagesSlice = MailAPI.viewFolderMessages(folder);
    this.messagesSlice.onsplice = this.onMessagesSplice.bind(this);
    this.messagesSlice.onchange = this.updateMessageDom.bind(this, false);
    return true;
  },

  onMessagesSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    // - removed messages
    if (howMany) {
      for (var i = index + howMany - 1; i >= index; i--) {
        var message = this.messagesSlice.items[i];
        message.element.parentNode.removeChild(message.element);
      }
    }

    // - added/existing accounts
    var insertBuddy, self = this;
    if (index >= this.messagesContainer.childElementCount)
      insertBuddy = null;
    else
      insertBuddy = this.messagesContainer.children[index];

    addedItems.forEach(function(message) {
      var domMessage;
      domMessage = message.element = msgNodes['header-item'].cloneNode(true);
      domMessage.message = message;

      self.updateMessageDom(true, message);

      self.messagesContainer.insertBefore(domMessage, insertBuddy);
    });
  },

  updateMessageDom: function(firstTime, message) {
    var msgNode = message.element;

    // some things only need to be done once
    var dateNode = msgNode.getElementsByClassName('msg-header-date')[0];
    if (firstTime) {
      // author
      msgNode.getElementsByClassName('msg-header-author')[0]
        .textContent = message.author.name || message.author.address;
      // date
      dateNode.dataset.time = message.date.valueOf();
      dateNode.textContent = prettyDate(message.date);
      // subject
      msgNode.getElementsByClassName('msg-header-subject')[0]
        .textContent = message.subject;
      // snippet
      msgNode.getElementsByClassName('msg-header-snippet')[0]
        .textContent = message.snippet;

      // attachments
      if (message.hasAttachments)
        msgNode.getElementsByClassName('msg-header-attachments')[0]
          .classList.add('msg-header-attachments-yes');
    }

    // unread (we use very specific classes directly on the nodes rather than
    // child selectors for hypothetical speed)
    var unreadNode =
      msgNode.getElementsByClassName('msg-header-unread-section')[0];
    if (message.isRead) {
      unreadNode.classList.remove('msg-header-unread-section-unread');
      dateNode.classList.remove('msg-header-date-unread');
    }
    else {
      unreadNode.classList.add('msg-header-unread-section-unread');
      dateNode.classList.add('msg-header-date-unread');
    }
    // star
    var starNode = msgNode.getElementsByClassName('msg-header-star')[0];
    if (message.isStarred)
      starNode.classList.add('msg-header-star-starred');
    else
      starNode.classList.remove('msg-header-star-starred');
  },

  onClickMessage: function(messageNode, event) {
    // hack while contextmenu still generates a click as well...
    if (this._suppressClick) {
      this._suppressClick = false;
      return;
    }

    // For now, let's do the async load before we trigger the card to try and
    // avoid reflows during animation or visual popping.
    Cards.eatEventsUntilNextCard();
    var header = messageNode.message;
    header.getBody(function gotBody(body) {
      Cards.pushCard(
        'message-reader', 'default', 'animate',
        {
          header: header,
          body: body
        });
    });
  },

  onHoldMessage: function(messageNode, event) {
    // suppress the subsequent click if this was actually a left click
    if (event.button === 0)
      this._suppressClick = true;
    else
      event.preventDefault();

    var header = messageNode.message;
    Cards.popupMenuForNode(
      this.buildEditMenuForMessage(header), messageNode,
      ['menu-item'],
      function(clickedNode) {
        if (!clickedNode)
          return;

        switch (clickedNode.classList[0]) {
          case 'msg-edit-menu-star':
            header.setStarred(true);
            break;
          case 'msg-edit-menu-unstar':
            header.setStarred(false);
            break;
          case 'msg-edit-menu-mark-read':
            header.setRead(true);
            break;
          case 'msg-edit-menu-mark-unread':
            header.setRead(false);
            break;
        }
      });
  },

  onRefresh: function() {
    this.messagesSlice.refresh();
  },

  buildEditMenuForMessage: function(header) {
    var contents = msgNodes['edit-menu'].cloneNode(true);

    // Remove the elements that are not relevant (versus collapsing because
    // collapsing does not make :last-child work right).
    contents.removeChild(
      contents.getElementsByClassName(
        header.isStarred ? 'msg-edit-menu-star'
                         : 'msg-edit-menu-unstar')[0]);
    contents.removeChild(
      contents.getElementsByClassName(
        header.isRead ? 'msg-edit-menu-mark-read'
                      : 'msg-edit-menu-mark-unread')[0]);

    return contents;
  },

  /**
   * The folder picker is telling us to change the folder we are showing.
   */
  told: function(args) {
    if (this.showFolder(args.folder)) {
      this._hideSearchBoxByScrolling();
    }
  },

  die: function() {
    if (this.messagesSlice) {
      this.messagesSlice.die();
      this.messagesSlice = null;
    }
  },
};
Cards.defineCard({
  name: 'message-list',
  modes: {
    default: {
      tray: false,
    },
  },
  constructor: MessageListCard,
});

function MessageReaderCard(domNode, mode, args) {
  this.domNode = domNode;
  this.header = args.header;
  this.body = args.body;

  this.buildBodyDom(domNode);

  domNode.getElementsByClassName('msg-back-btn')[0]
    .addEventListener('click', this.onBack.bind(this, false));
  domNode.getElementsByClassName('msg-reply-btn')[0]
    .addEventListener('click', this.onReply.bind(this, false));

  this.envelopeNode = domNode.getElementsByClassName('msg-envelope-bar')[0];
  this.envelopeNode
    .addEventListener('click', this.onEnvelopeClick.bind(this), false);

  this.envelopeDetailsNode =
    domNode.getElementsByClassName('msg-envelope-details')[0];

  bindContainerHandler(
    domNode.getElementsByClassName('msg-attachments-container')[0],
    'click', this.onAttachmentClick.bind(this));

  // - mark message read (if it is not already)
  if (!this.header.isRead)
    this.header.setRead(true);
}
MessageReaderCard.prototype = {
  onBack: function(event) {
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  onReply: function(event) {
    var composer = this.header.replyToMessage(null, function() {
      Cards.pushCard('compose', 'default', 'animate',
                     { composer: composer });
    });
  },

  /**
   * Distinguish clicks on contacts from clicks on the envelope to toggle its
   * expanded state and then do the right thing.
   */
  onEnvelopeClick: function(event) {
    var target = event.target;
    while (target !== this.envelopeNode &&
           !target.classList.contains('msg-peep-bubble')) {
      target = target.parentNode;
    }
    // - envelope click
    if (target === this.envelopeNode) {
      this.envelopeDetailsNode.classList.toggle('collapsed');
    }
    // - peep click
    else {
      // XXX view contact...
    }
  },

  onAttachmentClick: function(event) {
  },

  buildBodyDom: function(domNode) {
    var header = this.header, body = this.body;

    function addHeaderEmails(lineClass, peeps) {
      var lineNode = domNode.getElementsByClassName(lineClass)[0];

      if (!peeps || !peeps.length) {
        lineNode.classList.add('collapsed');
        return;
      }

      // Because we can avoid having to do multiple selector lookups, we just
      // mutate the template in-place...
      var peepTemplate = msgNodes['peep-bubble'],
          nameTemplate =
            peepTemplate.getElementsByClassName('msg-peep-name')[0],
          addressTemplate =
            peepTemplate.getElementsByClassName('msg-peep-address')[0];
      for (var i = 0; i < peeps.length; i++) {
        var peep = peeps[i];
        nameTemplate.textContent = peep.name || '';
        addressTemplate.textContent = peep.address;
        lineNode.appendChild(peepTemplate.cloneNode(true));
      }
    }

    addHeaderEmails('msg-envelope-from-line', [header.author]);
    addHeaderEmails('msg-envelope-to-line', body.to);
    addHeaderEmails('msg-envelope-cc-line', body.cc);
    addHeaderEmails('msg-envelope-bcc-line', body.bcc);

    var dateNode = domNode.getElementsByClassName('msg-envelope-date')[0];
    dateNode.dataset.time = header.date.valueOf();
    dateNode.textContent = prettyDate(header.date);

    domNode.getElementsByClassName('msg-envelope-subject')[0]
      .textContent = header.subject;
    domNode.getElementsByClassName('msg-body-container')[0]
      .textContent = body.bodyText;

    var attachmentsContainer =
      domNode.getElementsByClassName('msg-attachments-container')[0];
    if (body.attachments && body.attachments.length) {
      var attTemplate = msgNodes['attachment-item'],
          filenameTemplate =
            attTemplate.getElementsByClassName('msg-attachment-filename')[0],
          filetypeTemplate =
            attTemplate.getElementsByClassName('msg-attachment-filetype')[0];
      for (var iAttach = 0; iAttach < body.attachments.length; iAttach++) {
        var attachment = body.attachments[iAttach];
        filenameTemplate.textContent = attachment.filename;
        // XXX perform localized mimetype translation stuff
        filetypeTemplate.textContent = attachment.mimetype;
        attachmentsContainer.appendChild(attTemplate.cloneNode(true));
      }
    }
    else {
      attachmentsContainer.classList.add('collapsed');
    }
  },

  die: function() {
  },
};
Cards.defineCard({
  name: 'message-reader',
  modes: {
    default: {
      tray: false,
    },
  },
  constructor: MessageReaderCard,
});

