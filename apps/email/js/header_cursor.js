/*global define */
/**
 * @fileoverview Bug 918303 - HeaderCursor added to provide MessageListCard and
 *     MessageReaderCard the current message and whether there are adjacent
 *     messages that can be advanced to. Expect for [other] consumers to add
 *     additional data to messagesSlice items after they've left the MailAPI.
 */
define(function(require) {
  var array = require('array'),
      evt = require('evt'),
      model = require('model');

  function makeListener(type, obj) {
    return function() {
      var args = Array.slice(arguments);
      this.emit.apply(this, ['messages_' + type].concat(args));
    }.bind(obj);
  }

  /**
   * @constructor
   */
  function HeaderCursor() {
    // Inherit from evt.Emitter.
    evt.Emitter.call(this);

    // Listen for some slice events to do some special work.
    this.on('messages_splice', this.onMessagesSplice.bind(this));
    this.on('messages_remove', this.onMessagesSpliceRemove.bind(this));
    this.on('messages_complete', function() {
      // Consumers, like message_list, always want their 'complete' work
      // to fire, but by default the slice removes the complete handler
      // at the end. So rebind on each call here.
      if (this.messagesSlice) {
        this.messagesSlice.oncomplete = makeListener('complete', this);
      }
    }.bind(this));

    // Listen to model for folder changes.
    this.onLatestFolder = this.onLatestFolder.bind(this);
    model.latest('folder', this.onLatestFolder);
  }

  HeaderCursor.prototype = evt.mix({
    /**
     * @type {CurrentMessage}
     */
    currentMessage: null,

    /**
     * @type {HeadersViewSlice}
     */
    messagesSlice: null,

    /**
     * @type {String}
     */
    expectingMessageSuid: null,

    /**
     * @type {Array}
     */
    sliceEvents: ['splice', 'change', 'status', 'remove', 'complete'],

    /**
     * The messageReader told us it wanted to advance, so we should go ahead
     * and update our currentMessage appropriately and then report the new one.
     *
     * @param {string} direction either 'next' or 'previous'.
     */
    advance: function(direction) {
      var index = this.indexOfMessageById(this.currentMessage.header.id);
      switch (direction) {
        case 'previous':
          index -= 1;
          break;
        case 'next':
          index += 1;
          break;
      }

      var messages = this.messagesSlice.items;
      if (index < 0 || index >= messages.length) {
        // We can't advance that far!
        return;
      }

      this.setCurrentMessageByIndex(index);
    },

    /**
     * Tracks a messageSuid to use in selecting
     * the currentMessage once the slice data loads.
     * @param {String} messageSuid The message suid.
     */
    setCurrentMessageBySuid: function(messageSuid) {
      this.expectingMessageSuid = messageSuid;
      this.checkExpectingMessageSuid();
    },

    /**
     * Sets the currentMessage if there are messages now to check
     * against expectingMessageSuid. Only works if current folder
     * is set to an "inbox" type, so only useful for jumps into
     * the email app from an entry point like a notification.
     * @param  {Boolean} eventIfNotFound if set to true, an event
     * is emitted if the messageSuid is not found in the set of
     * messages.
     */
    checkExpectingMessageSuid: function(eventIfNotFound) {
      var messageSuid = this.expectingMessageSuid;
      if (!messageSuid || !model.folder || model.folder.type !== 'inbox') {
        return;
      }

      var index = this.indexOfMessageById(messageSuid);
      if (index > -1) {
        this.expectingMessageSuid = null;
        return this.setCurrentMessageByIndex(index);
      }

      if (eventIfNotFound) {
        console.error('header_cursor could not find messageSuid ' +
                      messageSuid + ', emitting messageSuidNotFound');
        this.emit('messageSuidNotFound', messageSuid);
      }
    },

    /**
     * @param {MailHeader} header message header.
     */
    setCurrentMessage: function(header) {
      if (!header) {
        return;
      }

      this.setCurrentMessageByIndex(this.indexOfMessageById(header.id));
    },

    setCurrentMessageByIndex: function(index) {
      var messages = this.messagesSlice.items;

      // Do not bother if not a valid index.
      if (index === -1 || index > messages.length - 1) {
        return;
      }

      var header = messages[index];
      if ('header' in header) {
        header = header.header;
      }

      var currentMessage = new CurrentMessage(header, {
        hasPrevious: index !== 0,                 // Can't be first
        hasNext: index !== messages.length - 1    // Can't be last
      });

      this.emit('currentMessage', currentMessage);
      this.currentMessage = currentMessage;
    },

    /**
     * @param {string} id message id.
     * @return {number} the index of the message cursor's current message
     *     in the message slice it has checked out.
     */
    indexOfMessageById: function(id) {
      var messages = (this.messagesSlice && this.messagesSlice.items) || [];
      return array.indexOfGeneric(messages, function(message) {
        var other = 'header' in message ? message.header.id : message.id;
        return other === id;
      });
    },

    /**
     * @param {Object} folder the folder we switched to.
     */
    onLatestFolder: function(folder) {
      // It is possible that the notification of latest folder is fired
      // but in the meantime the foldersSlice could be cleared due to
      // a change in the current account, before this listener is called.
      // So skip this work if no foldersSlice, this method will be called
      // again soon.
      if (!model.foldersSlice) {
        return;
      }

      this.freshMessagesSlice();
    },

    startSearch: function(phrase, whatToSearch) {
      this.bindToSlice(model.api.searchFolderMessages(model.folder,
                                                      phrase,
                                                      whatToSearch));
    },

    endSearch: function() {
      this.die();
      this.freshMessagesSlice();
    },

    freshMessagesSlice: function() {
      this.bindToSlice(model.api.viewFolderMessages(model.folder));
    },

    /**
     * holds on to messagesSlice and binds some events to it.
     * @param  {Slice} messagesSlice the new messagesSlice.
     */
    bindToSlice: function(messagesSlice) {
      this.die();

      this.messagesSlice = messagesSlice;
      this.sliceEvents.forEach(function(type) {
        messagesSlice['on' + type] = makeListener(type, this);
      }.bind(this));
    },

    onMessagesSplice: function(index, howMany, addedItems,
                                         requested, moreExpected) {
      // Avoid doing work if get called while in the process of
      // shutting down.
      if (!this.messagesSlice) {
        return;
      }

      // If there was a messageSuid expected and at the top, then
      // check to see if it was received. This is really just nice
      // for when a new message notification comes in, as the atTop
      // test is a bit fuzzy generally. Not all slices go to the top.
      if (this.messagesSlice.atTop && this.expectingMessageSuid &&
          this.messagesSlice.items && this.messagesSlice.items.length) {
        this.checkExpectingMessageSuid(true);
      }
    },

    /**
     * Choose a new currentMessage if we spilled the existing one.
     * Otherwise, emit 'currentMessage' event to update stale listeners
     * in case we spilled a sibling.
     *
     * @param {MailHeader} removedHeader header that got removed.
     * @param {number} removedFromIndex index header was removed from.
     */
    onMessagesSpliceRemove: function(removedHeader, removedFromIndex) {
      if (this.currentMessage !== removedHeader) {
        // Emit 'currentMessage' event in case we're spilling a sibling.
        return this.setCurrentMessage(this.currentMessage);
      }

      var messages = this.messagesSlice.items;
      if (messages.length === 0) {
        // No more messages... sad!
        return this.currentMessage = null;
      }

      var index = Math.min(removedFromIndex, messages.length - 1);
      var message = this.messagesSlice.items[index];
      this.setCurrentMessage(message);
    },

    die: function() {
      if (this.messagesSlice) {
        this.messagesSlice.die();
        this.messagesSlice = null;
      }

      this.currentMessage = null;
    }
  });

  /**
   * @constructor
   * @param {MailHeader} header message header.
   * @param {Object} siblings whether message has next and previous siblings.
   */
  function CurrentMessage(header, siblings) {
    this.header = header;
    this.siblings = siblings;
  }

  CurrentMessage.prototype = {
    /**
     * @type {MailHeader}
     */
    header: null,

    /**
     * Something like { hasPrevious: true, hasNext: false }.
     * @type {Object}
     */
    siblings: null
  };

  return {
    CurrentMessage: CurrentMessage,
    cursor: new HeaderCursor()
  };
});
