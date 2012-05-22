/**
 * Card definitions/logic for the message list, message reader, and message
 * search.
 **/

function MessageListCard(domNode, mode, args) {
  this.messagesContainer = domNode.getElementsByClassName('')[0];
  this.gestureDetector = new GestureDetector(this.messagesContainer);
  this.gestureDetector.startDetecting({ holdevents: true });

  domNode.getElementsByClassName('msg-folder-list-btn')[0]
    .addEventListener('click', this.onShowFolders.bind(this), false);

  // clicking shows the message reader for a message
  bindContainerHandler(this.messagesContainer, 'click',
                       this.onClickMessage.bind(this));
  // press-and-hold shows the single-message mutation options
  // (gaia/b2g maps a press for 1 second to context menu)
  bindContainerHandler(this.messageContainer, 'contextmenu',
                       this.onHoldMessage.bind(this));

  this.messagesSlice = null;
  this.showFolder(args.folder);
}
MessageListCard.prototype = {
  onShowFolders: function() {
    Cards.moveToCard('folder-picker', 'navigation');
  },

  showFolder: function(folder) {
    if (this.messagesSlice) {
      this.messagesSlice.die();
      this.messagesSlice = null;
      this.messagesContainer.innerHTML = '';
    }

    this.messagesSlice = MailAPI.viewFolderMessages(folder);
    this.messagesSlice.onsplice = this.onMessagesSplice.bind(this);
  },

  onMessagesSplice: function(index, howMany, addedItems,
                             requested, moreExpected) {
    // - removed messages
    if (howMany) {
      for (var i = index + howMany - 1; i >= index; i--) {
        var message = msgSlice.items[i];
        message.element.parentNode.removeChild(message.element);
      }
    }

    // - added/existing accounts
    var insertBuddy = (index >= this.messagesContainer.childElementCount) ?
                        null : this.messagesContainer.children[index],
        self = this;
    addedItems.forEach(function(message) {
      var domMessage = message.element =
        msgNodes['msg-header-item'].cloneNode(true);

      self.updateMessageDom(message, true);

      nodes.messagesList.insertBefore(domMessage, insertBuddy);
    });
  },

  updateMessageDom: function(message, firstTime) {
    var msgNode = message.element;

    // some things only need to be done once
    var dateNode = msgNode.getElementsByClassName('msg-header-date')[0];
    if (firstTime) {
      // author
      msgNode.getElementsByClassName('msg-header-author')[0]
        .textContent = message.author.name || message.author.address;
      // date
      dateNode.dataSet.time = message.date.valueOf();
      dateNode.textContent = prettyDate(message.date);
      // subject
      msgNode.getElementsByClassName('msg-header-subject')[0]
        .textContent = message.subject;
      // snippet
      msgNode.getElementsByClassName('msg-header-snippet')[0]
        .textContent = message.snippet;

      // attachments
      if (message.hasAttachments)
        msgNode.getElementsByClassName('msg-head-attachments')[0]
          .classList.add('msg-head-attachments-yes');
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
    Cards.pushCard(
      'message-reader', 'default', 'animate',
      {
        message: message
      });
  },

  onHoldMessage: function(messageNode, event) {
  },

  die: function() {
    this.gestureDetector.stopDetecting();
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
}
MessageReaderCard.prototype = {
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

