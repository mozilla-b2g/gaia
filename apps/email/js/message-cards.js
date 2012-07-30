/**
 * Card definitions/logic for the message list, message reader, and message
 * search.
 **/

/**
 * Try and keep at least this many display heights worth of undisplayed
 * messages.
 */
const SCROLL_MIN_BUFFER_SCREENS = 2;
/**
 * Keep around at most this many display heights worth of undisplayed messages.
 */
const SCROLL_MAX_RETENTION_SCREENS = 7;

/**
 * List messages for listing, multi-editing, and maybe displaying searches.
 *
 * == Less-than-infinite scrolling ==
 *
 * A dream UI would be to let the user smoothly scroll through all of the
 * messages in a folder, syncing them from the server as-needed.  The limits
 * on this are 1) bandwidth cost, and 2) storage limitations.
 *
 * Our sync costs are A) initial sync of a time range, and B) update sync of a
 * time range.  #A is sufficiently expensive that it makes sense to prompt the
 * user when we are going to sync further into a time range.  #B is cheap
 * enough and having already synced the time range suggests sufficient user
 * interest.
 *
 * So the way our UI works is that we do an infinite-scroll-type thing for
 * messages that we already know about.  If we are on metered bandwidth, then
 * we require the user to click a button in the display list to sync more
 * messages.  If we are on unmetered bandwidth, we will eventually forego that.
 * (For testing purposes right now, we want to pretend everything is metered.)
 * We might still want to display a button at some storage threshold level,
 * like if the folder is already using a lot of space.
 *
 * See `onScroll` for more details.
 *
 */
function MessageListCard(domNode, mode, args) {
  this.domNode = domNode;
  this.scrollNode = domNode.getElementsByClassName('msg-list-scrollouter')[0];

  this.messagesContainer =
    domNode.getElementsByClassName('msg-messages-container')[0];

  // - message actions
  bindContainerClickAndHold(
    this.messagesContainer,
    // clicking shows the message reader for a message
    this.onClickMessage.bind(this),
    // press-and-hold shows the single-message mutation options
    this.onHoldMessage.bind(this));

  // - less-than-infinite scrolling
  this.scrollContainer =
    domNode.getElementsByClassName('msg-list-scrollouter')[0];
  this.scrollContainer.addEventListener('scroll', this.onScroll.bind(this),
                                        false);

  this.syncingNode =
    domNode.getElementsByClassName('msg-messages-syncing')[0];
  this.syncMoreNode =
    domNode.getElementsByClassName('msg-messages-sync-more')[0];
  this.syncMoreNode
    .addEventListener('click', this.onGetMoreMessages.bind(this), false);

  // - header buttons: non-edit mode
  domNode.getElementsByClassName('msg-folder-list-btn')[0]
    .addEventListener('click', this.onShowFolders.bind(this), false);
  domNode.getElementsByClassName('msg-compose-btn')[0]
    .addEventListener('click', this.onCompose.bind(this), false);

  // - toolbar: non-edit mode
  domNode.getElementsByClassName('msg-edit-btn')[0]
    .addEventListener('click', this.setEditMode.bind(this, true), false);
  domNode.getElementsByClassName('msg-refresh-btn')[0]
    .addEventListener('click', this.onRefresh.bind(this), false);

  // - header buttons: edit mode
  domNode.getElementsByClassName('msg-listedit-cancel-btn')[0]
    .addEventListener('click', this.setEditMode.bind(this, false), false);

  // - toolbar: edit mode
  domNode.getElementsByClassName('msg-star-btn')[0]
    .addEventListener('click', this.onStarMessages.bind(this, true), false);
  domNode.getElementsByClassName('msg-unstar-btn')[0]
    .addEventListener('click', this.onStarMessages.bind(this, false), false);
  domNode.getElementsByClassName('msg-mark-read-btn')[0]
    .addEventListener('click', this.onMarkMessagesRead.bind(this, true), false);
  domNode.getElementsByClassName('msg-mark-unread-btn')[0]
    .addEventListener('click', this.onMarkMessagesRead.bind(this, false),
                      false);

  this.editMode = false;
  this.selectedMessages = null;

  this.curFolder = null;
  this.messagesSlice = null;
  this._boundSliceRequestComplete = this.onSliceRequestComplete.bind(this);
  this.showFolder(args.folder);
}
MessageListCard.prototype = {
  postInsert: function() {
    this._hideSearchBoxByScrolling();
  },

  setEditMode: function(editMode) {
    var domNode = this.domNode;
    var normalHeader = domNode.getElementsByClassName('msg-list-header')[0],
        editHeader = domNode.getElementsByClassName('msg-listedit-header')[0],
        normalToolbar =
          domNode.getElementsByClassName('msg-list-action-toolbar')[0],
        editToolbar =
          domNode.getElementsByClassName('msg-listedit-action-toolbar')[0];

    this.editMode = editMode;

    if (editMode) {
      normalHeader.classList.add('collapsed');
      normalToolbar.classList.add('collapsed');
      editHeader.classList.remove('collapsed');
      editToolbar.classList.remove('collapsed');

      this.selectedMessages = [];
      this.selectedMessagesUpdated();
    }
    else {
      normalHeader.classList.remove('collapsed');
      normalToolbar.classList.remove('collapsed');
      editHeader.classList.add('collapsed');
      editToolbar.classList.add('collapsed');

      // (Do this based on the DOM nodes actually present; if the user has been
      // scrolling a lot, this.selectedMessages may contain messages that no
      // longer have a domNode around.)
      var selectedMsgNodes =
        domNode.getElementsByClassName('msg-header-item-selected');
      for (var i = selectedMsgNodes.length - 1; i >= 0; i--) {
        selectedMsgNodes[i].classList.remove('msg-header-item-selected');
      }

      this.selectedMessages = null;
    }

    // UXXX do we want to disable the buttons if nothing is selected?
  },

  /**
   * Update the edit mode UI bits sensitive to a change in the set of selected
   * messages.  This means: the label that says how many messages are selected,
   * whether the buttons are enabled, which of the toggle-pairs are visible.
   */
  selectedMessagesUpdated: function() {
    var headerNode =
      this.domNode.getElementsByClassName('msg-listedit-header-label')[0];
    headerNode.textContent =
      document.mozL10n.get('message-multiedit-header',
                           { n: this.selectedMessages.length });

    var starBtn =
          this.domNode.getElementsByClassName('msg-star-btn')[0],
        unstarBtn =
          this.domNode.getElementsByClassName('msg-unstar-btn')[0],
        readBtn =
          this.domNode.getElementsByClassName('msg-mark-read-btn')[0],
        unreadBtn =
          this.domNode.getElementsByClassName('msg-mark-unread-btn')[0];

    // Enabling/disabling rules (not UX-signed-off):  Our bias is that people
    // want to star messages and mark messages unread (since it they naturally
    // end up unread), so unless messages are all in this state, we assume that
    // is the desired action.
    var numStarred = 0, numRead = 0;
    for (var i = 0; i < this.selectedMessages.length; i++) {
      var msg = this.selectedMessages[i];
      if (msg.isStarred)
        numStarred++;
      if (msg.isRead)
        numRead++;
    }

    // Show unstar if everything is starred, otherwise star
    if (numStarred && numStarred === this.selectedMessages.length) {
      // show 'unstar'
      starBtn.classList.add('collapsed');
      unstarBtn.classList.remove('collapsed');
    }
    else {
      // show 'star'
      starBtn.classList.remove('collapsed');
      unstarBtn.classList.add('collapsed');
    }
    // Show read if everything is unread, otherwise unread
    if (this.selectedMessages.length && numRead === 0) {
      // show 'read'
      readBtn.classList.remove('collapsed');
      unreadBtn.classList.add('collapsed');
    }
    else {
      // show 'unread'
      readBtn.classList.add('collapsed');
      unreadBtn.classList.remove('collapsed');
    }
  },

  _hideSearchBoxByScrolling: function() {
    // Searching is deferred for now; do nothing; the DOM nodes have been
    // commented out.
    return;

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
    this.messagesSlice.onstatus = this.onStatusChange.bind(this);
    this.messagesSlice.oncomplete = this._boundSliceRequestComplete;
    return true;
  },

  onGetMoreMessages: function() {
    this.messagesSlice.requestGrowth(1, true);
    // Provide instant feedback that they pressed the button by hiding the
    // button.  However, don't show 'synchronizing' because that might not
    // actually happen.
    this.syncMoreNode.classList.add('collapsed');
  },

  onStatusChange: function(newStatus) {
    if (newStatus === 'synchronizing') {
      this.syncingNode.classList.remove('collapsed');
      this.syncMoreNode.classList.add('collapsed');
    }
    else {
      this.syncingNode.classList.add('collapsed');
    }
  },

  onSliceRequestComplete: function() {
    // We always want our logic to fire, but complete auto-clears before firing.
    this.messagesSlice.oncomplete = this._boundSliceRequestComplete;

    if (this.messagesSlice.userCanGrowDownwards)
      this.syncMoreNode.classList.remove('collapsed');
    else
      this.syncMoreNode.classList.add('collapsed');

    // Consider requesting more data or discarding data based on scrolling that
    // has happened since we issued the request.  (While requests were pending,
    // onScroll ignored scroll events.)
    this.onScroll(null);
  },

  /**
   * Handle scrolling by requesting more messages when we have less than the
   * minimum buffer space and trimming messages when we have more than the max.
   *
   * We don't care about the direction of scrolling, which is helpful since this
   * also lets us handle cases where message deletion might have done bad things
   * to us.  (It does, however, open the door to foolishness where we request
   * data and then immediately discard some of it.)
   */
  onScroll: function(event) {
    // Defer processing until any pending requests have completed;
    // `onSliceRequestComplete` will call us.
    if (!this.messagesSlice || this.messagesSlice.pendingRequestCount)
      return;

    var curScrollTop = this.scrollContainer.scrollTop,
        viewHeight = this.scrollContainer.clientHeight;

    var preScreens = curScrollTop / viewHeight,
        postScreens = (this.scrollContainer.scrollHeight -
                       (curScrollTop + viewHeight)) /
                      viewHeight;

    var shrinkLowIncl = 0,
        shrinkHighIncl = this.messagesSlice.items.length - 1,
        messageNode = null, targOff;
    if (preScreens < SCROLL_MIN_BUFFER_SCREENS &&
        !this.messagesSlice.atTop) {
      this.messagesSlice.requestGrowth(-1);
      return;
    }
    else if (preScreens > SCROLL_MAX_RETENTION_SCREENS) {
      // Take off one screen at a time.
      targOff = curScrollTop -
                (viewHeight * (SCROLL_MAX_RETENTION_SCREENS - 1));
      for (messageNode = this.messagesContainer.firstElementChild;
           messageNode.offsetTop + messageNode.clientHeight < targOff;
           messageNode = messageNode.nextElementSibling) {
        shrinkLowIncl++;
      }
    }

    if (postScreens < SCROLL_MIN_BUFFER_SCREENS &&
        !this.messagesSlice.atBottom) {
      this.messagesSlice.requestGrowth(1);
    }
    else if (postScreens > SCROLL_MAX_RETENTION_SCREENS) {
      targOff = curScrollTop +
                this.scrollContainer.clientHeight +
                (viewHeight * (SCROLL_MAX_RETENTION_SCREENS - 1));
      for (messageNode = this.messagesContainer.lastElementChild;
           messageNode.offsetTop > targOff;
           messageNode = messageNode.previousElementSibling) {
        shrinkHighIncl--;
      }
    }

    if (shrinkLowIncl !== 0 ||
        shrinkHighIncl !== this.messagesSlice.items.length - 1) {
      this.messagesSlice.requestShrinkage(shrinkLowIncl, shrinkHighIncl);
    }
  },

  onMessagesSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    var prevHeight;
    // - removed messages
    if (howMany) {
      // Plan to fixup the scroll position if we are deleting a message that
      // starts before the (visible) scrolled area.  (We add the container's
      // start offset because it is as big as the occluding header bar.)
      prevHeight = null;
      if (this.messagesSlice.items[index].element.offsetTop <
          this.scrollContainer.scrollTop + this.messagesContainer.offsetTop) {
        prevHeight = this.messagesContainer.clientHeight;
      }

      for (var i = index + howMany - 1; i >= index; i--) {
        var message = this.messagesSlice.items[i];
        message.element.parentNode.removeChild(message.element);
      }

      // If fixup is requred, adjust.
      if (prevHeight !== null) {
        this.scrollContainer.scrollTop -=
          (prevHeight - this.messagesContainer.clientHeight);
      }
    }

    // - added/existing
    if (!addedItems.length)
      return;
    var insertBuddy, self = this;
    if (index >= this.messagesContainer.childElementCount)
      insertBuddy = null;
    else
      insertBuddy = this.messagesContainer.children[index];
    if (insertBuddy &&
        (insertBuddy.offsetTop <
         this.scrollContainer.scrollTop + this.messagesContainer.offsetTop))
      prevHeight = this.messagesContainer.clientHeight;
    else
      prevHeight = null;

    addedItems.forEach(function(message) {
      var domMessage;
      domMessage = message.element = msgNodes['header-item'].cloneNode(true);
      domMessage.message = message;

      self.updateMessageDom(true, message);

      self.messagesContainer.insertBefore(domMessage, insertBuddy);
    });

    if (prevHeight) {
      this.scrollContainer.scrollTop +=
        (this.messagesContainer.clientHeight - prevHeight);
    }
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
    var header = messageNode.message;
    if (this.editMode) {
      var idx = this.selectedMessages.indexOf(header);
      if (idx !== -1) {
        this.selectedMessages.splice(idx, 1);
        messageNode.classList.remove('msg-header-item-selected');
      }
      else {
        this.selectedMessages.push(header);
        messageNode.classList.add('msg-header-item-selected');
      }
      this.selectedMessagesUpdated();
      return;
    }

    // For now, let's do the async load before we trigger the card to try and
    // avoid reflows during animation or visual popping.
    Cards.eatEventsUntilNextCard();
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
    var header = messageNode.message;
    Cards.popupMenuForNode(
      this.buildEditMenuForMessage(header), messageNode,
      ['menu-item'],
      function(clickedNode) {
        if (!clickedNode)
          return;

        var op = null;
        switch (clickedNode.classList[0]) {
          // All of these mutations are immediately reflected, easily observed
          // and easily undone, so we don't show them as toaster actions.
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

          // Deletion, and moves, on the other hand, require a lot of manual
          // labor, so we need to expose their undo op's.
        }
        if (op)
          Toaster.logMutation(op);
      });
  },

  onRefresh: function() {
    this.messagesSlice.refresh();
  },

  onStarMessages: function(/* curried by bind */ beStarred) {
    var op = MailAPI.markMessagesStarred(this.selectedMessages, beStarred);
    this.setEditMode(false);
    Toaster.logMutation(op);
  },

  onMarkMessagesRead: function(/* curried by bind */ beRead) {
    var op = MailAPI.markMessagesRead(this.selectedMessages, beRead);
    this.setEditMode(false);
    Toaster.logMutation(op);
  },

  buildEditMenuForMessage: function(header) {
    var contents = msgNodes['edit-menu'].cloneNode(true);

    // Remove the elements that are not relevant (versus collapsing because
    // collapsing does not make :last-child work right).
    contents.removeChild(
      contents.getElementsByClassName(
        header.isStarred ? 'msg-edit-menu-star' :
                           'msg-edit-menu-unstar')[0]);
    contents.removeChild(
      contents.getElementsByClassName(
        header.isRead ? 'msg-edit-menu-mark-read' :
                        'msg-edit-menu-mark-unread')[0]);

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
  }
};
Cards.defineCardWithDefaultMode(
    'message-list',
    { tray: false },
    MessageListCard
);

const CONTENT_TYPES_TO_CLASS_NAMES = [
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
const CONTENT_QUOTE_CLASS_NAMES = [
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
const MAX_QUOTE_CLASS_NAME = 'msg-body-qmax';

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

    // -- Header
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

    // -- Body (Plaintext)
    var bodyNode = domNode.getElementsByClassName('msg-body-container')[0];
    var rep = body.bodyRep;
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
      node.textContent = rep[i + 1];
      bodyNode.appendChild(node);
    }

    // -- Attachments (footer)
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
  }
};
Cards.defineCardWithDefaultMode(
    'message-reader',
    { tray: false },
    MessageReaderCard
);

