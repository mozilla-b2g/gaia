/*global FontSizeUtils, requestAnimationFrame */
'use strict';

define(function(require, exports, module) {

var cards = require('cards'),
    date = require('date'),
    defaultVScrollData = require('./lst/default_vscroll_data'),
    evt = require('evt'),
    toaster = require('toaster'),
    HeaderCursor = require('header_cursor'),
    htmlCache = require('html_cache'),
    mozL10n = require('l10n!'),
    MessageListTopBar = require('message_list_topbar'),
    messageDisplay = require('message_display'),
    updatePeepDom = require('./lst/peep_dom').update,
    VScroll = require('vscroll');

/**
 * List messages for listing the contents of folders. Multi-editing is just a
 * state of the card.
 *
 * == Cache behavior ==
 *
 * This is a card that can be instantiated using the cached HTML stored by the
 * html_cache. As such, it is constructed to allow clicks on message list items
 * before the back end has loaded up, and to know how to refresh the cached
 * state by looking at the use the usingCachedNode property. It also prevents
 * clicks from button actions that need back end data to complete if the click
 * would result in a card that cannot also handle delayed back end startup.
 * It tracks if the back end has started up by checking curFolder, which is
 * set to a data object sent from the back end.
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
 * XXX this class wants to be cleaned up, badly.  A lot of this may want to
 * happen via pushing more of the hiding/showing logic out onto CSS, taking
 * care to use efficient selectors.
 *
 */
return [
  require('./base_card')(require('template!./message_list.html')),
  require('./lst/edit_controller'),
  require('./lst/msg_click'),

  {
    createdCallback: function() {
      // Sync display
      this._needsSizeLastSync = true;
      this.updateLastSynced();

      this.curFolder = null;
      this.isIncomingFolder = true;

      // Binding "this" to some functions as they are used for event listeners.
      this._hideSearchBoxByScrolling =
                                      this._hideSearchBoxByScrolling.bind(this);
      this._folderChanged = this._folderChanged.bind(this);
      this.onNewMail = this.onNewMail.bind(this);
      this.onFoldersSliceChange = this.onFoldersSliceChange.bind(this);

      this.usingCachedNode = this.dataset.cached === 'cached';

      this.msgVScroll.on('messagesSpliceStart', function(index,
                                                         howMany,
                                                         addedItems,
                                                         requested,
                                                         moreExpected) {
        this._clearCachedMessages();
      }.bind(this));

      this.msgVScroll.on('messagesSpliceEnd', function(index,
                                                       howMany,
                                                       addedItems,
                                                       requested,
                                                       moreExpected) {
        // Only cache if it is an add or remove of items
        if (addedItems.length || howMany) {
          this._considerCacheDom(index);
        }
      }.bind(this));

      this.msgVScroll.on('messagesChange', function(message, index) {
        this.onMessagesChange(message, index);
      }.bind(this));

      this._emittedContentEvents = false;
      this.msgVScroll.on('messagesComplete', function(newEmailCount) {
        this.onNewMail(newEmailCount);

        // Inform that content is ready. There could actually be a small delay
        // with vScroll.updateDataBind from rendering the final display, but it
        // is small enough that it is not worth trying to break apart the design
        // to accommodate this metrics signal.
        if (!this._emittedContentEvents) {
          evt.emit('metrics:contentDone');
          this._emittedContentEvents = true;
        }
      }.bind(this));

      // Outbox has some special concerns, override status method to account for
      // it. Do this **before** initing the vscroll, so that the override is
      // used.
      var oldMessagesStatus = this.msgVScroll.messages_status;
      this.msgVScroll.messages_status = function(newStatus) {
        // The outbox's refresh button is used for sending messages, so we
        // ignore any syncing events generated by the slice. The outbox
        // doesn't need to show many of these indicators (like the "Load
        // More Messages..." node, etc.) and it has its own special
        // "refreshing" display, as documented elsewhere in this file.
        if (!this.curFolder || this.curFolder.type === 'outbox') {
          return;
        }

        return oldMessagesStatus.call(this.msgVScroll, newStatus);
      }.bind(this);

      this.msgVScroll.on('emptyLayoutShown', function() {
        this._clearCachedMessages();

        // The outbox can't refresh anything if there are no messages.
        if (this.curFolder.type === 'outbox') {
          this.refreshBtn.disabled = true;
        }

        this.editBtn.disabled = true;

        this._hideSearchBoxByScrolling();

      }.bind(this));
      this.msgVScroll.on('emptyLayoutHidden', function() {
        this.editBtn.disabled = false;
        this.refreshBtn.disabled = false;
      }.bind(this));

      this.msgVScroll.on('syncInProgress', function(syncInProgress) {
        if (syncInProgress) {
          this.setRefreshState(true);
        } else {
          this.setRefreshState(false);
          this._manuallyTriggeredSync = false;
        }
      }.bind(this));

      var vScrollBindData = (function bindNonSearch(model, node) {
          model.element = node;
          node.message = model;
          this.updateMessageDom(true, model);
        }).bind(this);
      this.msgVScroll.init(this.scrollContainer,
                           vScrollBindData,
                           defaultVScrollData);

      // Event listeners for VScroll events.
      this.msgVScroll.vScroll.on('inited', this._hideSearchBoxByScrolling);
      this.msgVScroll.vScroll.on('dataChanged', this._hideSearchBoxByScrolling);
      this.msgVScroll.vScroll.on('recalculated', function(calledFromTop) {
        if (calledFromTop) {
          this._hideSearchBoxByScrolling();
        }
      }.bind(this));

      this._topBar = new MessageListTopBar(
        this.querySelector('.message-list-topbar')
      );
      this._topBar.bindToElements(this.scrollContainer,
                                  this.msgVScroll.vScroll);

      this.onFolderPickerClosing = this.onFolderPickerClosing.bind(this);
      evt.on('folderPickerClosing', this.onFolderPickerClosing);
    },

    onArgs: function(args) {
      var model = this.model = args.model;
      var headerCursor = this.headerCursor = args.headerCursor ||
                                             new HeaderCursor(model);
      this.msgVScroll.setHeaderCursor(headerCursor);

      model.latest('folder', this._folderChanged);
      model.on('newInboxMessages', this.onNewMail);
      model.on('backgroundSendStatus', this.onBackgroundSendStatus.bind(this));

      model.on('foldersSliceOnChange', this.onFoldersSliceChange);

      // If this card is created after header_cursor is set up
      // with a messagesSlice, then need to bootstrap this card
      // to catch up, since the normal events will not fire.
      // Common scenarios for this case are: going back to the
      // message list after reading a message from a notification,
      // or from a compose triggered from an activity. However,
      // only do this if there is a current folder. A case
      // where there is not a folder: after deleting an account,
      // and the UI is bootstrapping back to existing account.
      // Also, search pushes a new message_list card, but search
      // needs a special slice, created only when the search
      // actually starts. So do not bootstrap in that case.
      if (this.curFolder) {
        var items = headerCursor.messagesSlice &&
                    headerCursor.messagesSlice.items;
        if (items && items.length) {
          this.msgVScroll.messages_splice(0, 0, items);
          this.msgVScroll.messages_complete(0);
        }
      }
    },

    /**
     * Inform Cards to not emit startup content events, this card will trigger
     * them once data from back end has been received and the DOM is up to date
     * with that data.
     * @type {Boolean}
     */
    skipEmitContentEvents: true,

    postInsert: function() {
      this._hideSearchBoxByScrolling();

      // Now that _hideSearchBoxByScrolling has activated the display
      // of the search box, get the height of the search box and tell
      // vScroll about it, but only do this once the DOM is displayed
      // so the ClientRect gives an actual height.
      this.msgVScroll.vScroll.visibleOffset =
                                  this.searchBar.getBoundingClientRect().height;

      // Also tell the MessageListTopBar
      this._topBar.visibleOffset = this.msgVScroll.vScroll.visibleOffset;

      // For search we want to make sure that we capture the screen size prior
      // to focusing the input since the FxOS keyboard will resize our window to
      // be smaller which messes up our logic a bit.  We trigger metric
      // gathering in non-search cases too for consistency.
      this.msgVScroll.vScroll.captureScreenMetrics();
    },

    onSearchButton: function() {
      // Do not bother if there is no current folder.
      if (!this.curFolder) {
        return;
      }

      cards.pushCard(
        'message_list_search', 'animate',
        {
          model: this.model,
          folder: this.curFolder
        });
    },

    _hideSearchBoxByScrolling: function() {
      // scroll the search bit out of the way
      var searchBar = this.searchBar,
          scrollContainer = this.scrollContainer;

      // Search bar could have been collapsed with a cache load,
      // make sure it is visible, but if so, adjust the scroll
      // position in case the user has scrolled before this code
      // runs.
      if (searchBar.classList.contains('collapsed')) {
        searchBar.classList.remove('collapsed');
        scrollContainer.scrollTop += searchBar.offsetHeight;
      }

      // Adjust scroll position now that there is something new in
      // the scroll region, but only if at the top. Otherwise, the
      // user's purpose scroll positioning may be disrupted.
      //
      // Note that when we call vScroll.clearDisplay() we
      // inherently scroll back up to the top, so this check is still
      // okay even when switching folders.  (We do not want to start
      // index 50 in our new folder because we were at index 50 in our
      // old folder.)
      if (scrollContainer.scrollTop === 0) {
        scrollContainer.scrollTop = searchBar.offsetHeight;
      }
    },

    onShowFolders: function() {
      cards.pushCard('folder_picker', 'immediate', {
        model: this.model,
        onPushed: function() {
          this.headerMenuNode.classList.add('transparent');
        }.bind(this)
      });
    },

    onCompose: function() {
      cards.pushCard('compose', 'animate', {
        model: this.model
      });
    },

    /**
     * If the last synchronised label is more than half the length
     * of its display area, set a "long" style on it that allows
     * different styling. But only do this once per card instance,
     * the label should not change otherwise.
     * TODO though, once locale changing in app is supported, this
     * should be revisited.
     */
    sizeLastSync: function() {
      if (this._needsSizeLastSync && this.lastSyncedLabel.scrollWidth) {
        var label = this.lastSyncedLabel;
        var overHalf = label.scrollWidth > label.parentNode.clientWidth / 2;
        label.parentNode.classList[(overHalf ? 'add' : 'remove')]('long');
        this._needsSizeLastSync = false;
      }
    },

    updateLastSynced: function(value) {
      var method = value ? 'remove' : 'add';
      this.lastSyncedLabel.classList[method]('collapsed');
      date.setPrettyNodeDate(this.lastSyncedAtNode, value);
      this.sizeLastSync();
    },

    updateUnread: function(num) {
      var content = '';
      if (num > 0) {
        content = num > 999 ? mozL10n.get('messages-folder-unread-max') : num;
      }

      this.folderUnread.textContent = content;
      this.folderUnread.classList.toggle('collapsed', !content);
      this.callHeaderFontSize();
    },

    onFoldersSliceChange: function(folder) {
      if (folder === this.curFolder) {
        this.updateUnread(folder.unread);
        this.updateLastSynced(folder.lastSyncedAt);
      }
    },

    /**
     * A workaround for shared/js/font_size_utils not recognizing child node
     * content changing, and if it did, it would be noisy/extra work if done
     * generically. Using a rAF call to not slow down the rest of card updates,
     * it is something that can happen lazily on another turn.
     */
    callHeaderFontSize: function(node) {
      requestAnimationFrame(function() {
        FontSizeUtils._reformatHeaderText(this.folderLabel);
      }.bind(this));
    },

    /**
     * Show a folder, returning true if we actually changed folders or false if
     * we did nothing because we were already in the folder.
     */
    showFolder: function(folder, forceNewSlice) {
      if (folder === this.curFolder && !forceNewSlice) {
        return false;
      }

      // If using a cache, do not clear the HTML as it will
      // be cleared once real data has been fetched.
      if (!this.usingCachedNode) {
        // This inherently scrolls us back up to the top of the list.
        this.msgVScroll.vScroll.clearDisplay();
      }
      this.msgVScroll._needVScrollData = true;

      this.curFolder = folder;

      // Now that a folder is available, enable edit mode toggling.
      this.editModeEnabled = true;

      switch (folder.type) {
        case 'drafts':
        case 'localdrafts':
        case 'outbox':
        case 'sent':
          this.isIncomingFolder = false;
          break;
        default:
          this.isIncomingFolder = true;
          break;
      }

      this.folderNameNode.textContent = folder.name;
      this.updateUnread(folder.unread);
      this.msgVScroll.setAttribute('aria-label', folder.name);
      this.msgVScroll.hideEmptyLayout();

      // You can't refresh messages in the localdrafts folder.
      this.refreshBtn.classList.toggle('collapsed',
                                               folder.type === 'localdrafts');

      this.editToolbar.updateDomFolderType(folder.type);

      this.updateLastSynced(folder.lastSyncedAt);

      if (forceNewSlice) {
        // We are creating a new slice, so any pending snippet requests are
        // moot.
        this.msgVScroll._snippetRequestPending = false;
        this.headerCursor.freshMessagesSlice();
      }

      this.onFolderShown();

      return true;
    },

    /**
     * This is an override of setEditMode in lst/edit_controller because the
     * outbox needs special treatment.
     */
    setEditMode: function(editMode) {
      // Do not bother if edit mode is not enabled yet.
      if (!this.editModeEnabled) {
        return;
      }

      if (this.curFolder.type === 'outbox') {
        // You cannot edit the outbox messages if the outbox is syncing.
        if (editMode && this.outboxSyncInProgress) {
          return;
        }

        // Outbox Sync and Edit Mode are mutually exclusive. Disable
        // outbox syncing before allowing us to enter edit mode, and
        // vice versa. The callback shouldn't take long, but we wait to
        // trigger edit mode until outbox sync has been fully disabled,
        // to prevent ugly theoretical race conditions.
        var model = this.model;
        model.api.setOutboxSyncEnabled(model.account, !editMode, function() {
          this._setEditMode(editMode);
        }.bind(this));
      } else {
        this._setEditMode(editMode);
      }
    },

    /**
     * Set the refresh button state based on the new message status.
     */
    setRefreshState: function(syncing) {
      if (syncing) {
          this.refreshBtn.dataset.state = 'synchronizing';
          this.refreshBtn.setAttribute('role', 'progressbar');
          mozL10n.setAttributes(this.refreshBtn, 'messages-refresh-progress');
      } else {
        this.refreshBtn.dataset.state = 'synchronized';
        this.refreshBtn.removeAttribute('role');
        mozL10n.setAttributes(this.refreshBtn, 'messages-refresh-button');
      }
    },

    onNewMail: function(newEmailCount) {
      var inboxFolder = this.model.foldersSlice.getFirstFolderWithType('inbox');

      if (inboxFolder.id === this.curFolder.id &&
          newEmailCount && newEmailCount > 0) {
        if (!cards.isVisible(this)) {
          this._whenVisible = this.onNewMail.bind(this, newEmailCount);
          return;
        }

        // If the user manually synced, then want to jump to show the new
        // messages. Otherwise, show the top bar.
        if (this._manuallyTriggeredSync) {
          this.msgVScroll.vScroll.jumpToIndex(0);
        } else {
          // Update the existing status bar.
          this._topBar.showNewEmailCount(newEmailCount);
        }
      }
    },

    // When an email is being sent from the app (and not from an outbox
    // refresh), we'll receive notification here. Play a sound and
    // raise a toast, if appropriate.
    onBackgroundSendStatus: function(data) {
      if (this.curFolder.type === 'outbox') {
        if (data.state === 'sending') {
          // If the message is now sending, make sure we're showing the
          // outbox as "currently being synchronized".
          this.toggleOutboxSyncingDisplay(true);
        } else if (data.state === 'syncDone') {
          this.toggleOutboxSyncingDisplay(false);
        }
      }

      if (data.emitNotifications) {
        toaster.toast({
          text: data.localizedDescription
        });
      }
    },

    /**
     * How many items in the message list to keep for the _cacheDom call.
     * @type {Number}
     */
    _cacheListLimit: 7,

    /**
     * Tracks if a DOM cache save is scheduled for later.
     * @type {Number}
     */
    _cacheDomTimeoutId: 0,

    /**
     * Confirms card state is in a visual state suitable for caching.
     */
    _isCacheableCardState: function() {
      return this.cacheableFolderId === this.curFolder.id && !this.editMode;
    },

    /**
     * Caches the DOM for this card, but trims it down a bit first.
     */
    _cacheDom: function() {
      this._cacheDomTimeoutId = 0;
      if (!this._isCacheableCardState()) {
        return;
      }

      // Safely clone the node so we can mutate the tree to cut out the parts
      // we do not want/need.
      var cacheNode =
            htmlCache.cloneAsInertNodeAvoidingCustomElementHorrors(this);

      // Make sure toolbar is visible, could be hidden by drawer
      cacheNode.querySelector('menu[type="toolbar"]')
               .classList.remove('transparent');

      // Hide search field as it will not operate and gets scrolled out
      // of view after real load.
      var removableCacheNode = cacheNode.querySelector('.msg-search-tease-bar');
      if (removableCacheNode) {
        removableCacheNode.classList.add('collapsed');
      }

      // Hide "new mail" topbar too
      removableCacheNode = cacheNode.querySelector('.message-list-topbar');
      if (removableCacheNode) {
        this._topBar.resetNodeForCache(removableCacheNode);
      }

      // Hide the last sync number
      var tempNode = cacheNode.querySelector('.msg-last-synced-label');
      if (tempNode) {
        tempNode.classList.add('collapsed');
      }
      tempNode = cacheNode.querySelector('.msg-last-synced-value');
      if (tempNode) {
        tempNode.innerHTML = '';
      }

      // Trim vScroll containers that are not in play
      VScroll.trimMessagesForCache(
        cacheNode.querySelector('.msg-vscroll-container'),
        this._cacheListLimit
      );

      htmlCache.saveFromNode(module.id, cacheNode);
    },

    /**
     * Considers a DOM cache, but only if it meets the criteria for what
     * should be saved in the cache, and if a save is not already scheduled.
     * @param  {Number} index the index of the message that triggered
     *                  this call.
     */
    _considerCacheDom: function(index) {
      // Only bother if not already waiting to update cache and
      if (!this._cacheDomTimeoutId &&
          // card visible state is appropriate
          this._isCacheableCardState() &&
          // if the scroll area is at the top (otherwise the
          // virtual scroll may be showing non-top messages)
          this.msgVScroll.vScroll.firstRenderedIndex === 0 &&
          // if actually got a numeric index and
          (index || index === 0) &&
          // if it affects the data we cache
          index < this._cacheListLimit) {
        this._cacheDomTimeoutId = setTimeout(this._cacheDom.bind(this), 600);
      }
    },

    /**
     * Clears out the messages HTML in messageContainer from using the cached
     * nodes that were picked up when the HTML cache of this list was used
     * (which is indicated by usingCachedNode being true). The cached HTML
     * needs to be purged when the real data is finally available and will
     * replace the cached state. A more sophisticated approach would be to
     * compare the cached HTML to what would be inserted in its place, and
     * if no changes, skip this step, but that comparison operation could get
     * tricky, and it is cleaner just to wipe it and start fresh. Once the
     * cached HTML has been cleared, then usingCachedNode is set to false
     * to indicate that the main piece of content in the card, the message
     * list, is no longer from a cached node.
     */
    _clearCachedMessages: function() {
      if (this.usingCachedNode) {
        this.msgVScroll.removeMessagesHtml();
        this.usingCachedNode = false;
      }
    },

    onMessagesChange: function(message, index) {
      this.updateMessageDom(false, message);

      // Since the DOM change, cache may need to change.
      this._considerCacheDom(index);
    },

    /**
     * Update the state of the given DOM node.  Note that DOM nodes are reused
     * so although you can depend on `firstTime` to be accurate, you must ensure
     * that this method cleans up any dirty state resulting from any possible
     * prior operation of this method.
     *
     * Also note that there is a separate method `updateMatchedMessageDom` for
     * our search mode.  If you are changing this method you probably also want
     * to be changing that method.
     */
    updateMessageDom: function(firstTime, message) {
      var msgNode = message.element;

      if (!msgNode) {
        return;
      }

      // If the placeholder data, indicate that in case VScroll
      // wants to go back and fix later.
      var classAction = message.isPlaceholderData ? 'add' : 'remove';
      var defaultDataClass = this.msgVScroll.vScroll.itemDefaultDataClass;
      msgNode.classList[classAction](defaultDataClass);

      // ID is stored as a data- attribute so that it can survive
      // serialization to HTML for storing in the HTML cache, and
      // be usable before the actual data from the backend has
      // loaded, as clicks to the message list are allowed before
      // the back end is available. For this reason, click
      // handlers should use dataset.id when wanting the ID.
      msgNode.dataset.id = message.id;

      // some things only need to be done once
      var dateNode = msgNode.querySelector('.msg-header-date');
      var subjectNode = msgNode.querySelector('.msg-header-subject');
      var snippetNode = msgNode.querySelector('.msg-header-snippet');
      if (firstTime) {
        var listPerson;
        if (this.isIncomingFolder) {
          listPerson = message.author;
        // XXX This is not to UX spec, but this is a stop-gap and that would
        // require adding strings which we cannot justify as a slipstream fix.
        } else if (message.to && message.to.length) {
          listPerson = message.to[0];
        } else if (message.cc && message.cc.length) {
          listPerson = message.cc[0];
        } else if (message.bcc && message.bcc.length) {
          listPerson = message.bcc[0];
        } else {
          listPerson = message.author;
        }

        // author
        listPerson.element =
          msgNode.querySelector('.msg-header-author');
        listPerson.onchange = updatePeepDom;
        listPerson.onchange(listPerson);
        // date
        var dateTime = message.date.valueOf();
        dateNode.dataset.time = dateTime;
        dateNode.textContent = dateTime ? date.prettyDate(message.date) : '';
        // subject
        messageDisplay.subject(msgNode.querySelector('.msg-header-subject'),
                              message);

        // attachments (can't change within a message but can change between
        // messages, and since we reuse DOM nodes...)
        var attachmentsNode = msgNode.querySelector('.msg-header-attachments');
        attachmentsNode.classList.toggle('msg-header-attachments-yes',
                                         message.hasAttachments);
        // snippet needs to be shorter if icon is shown
        snippetNode.classList.toggle('icon-short', message.hasAttachments);
      }

      // snippet
      snippetNode.textContent = message.snippet;

      // update styles throughout the node for read vs unread
      msgNode.classList.toggle('unread', !message.isRead);

      // star
      var starNode = msgNode.querySelector('.msg-header-star');

      starNode.classList.toggle('msg-header-star-starred', message.isStarred);
      // subject needs to give space for star if it is visible
      subjectNode.classList.toggle('icon-short', message.isStarred);

      // sync status
      var syncNode =
            msgNode.querySelector('.msg-header-syncing-section');

      // sendState is only intended for outbox messages, so not all
      // messages will have sendStatus defined.
      var sendState = message.sendStatus && message.sendStatus.state;

      syncNode.classList.toggle('msg-header-syncing-section-syncing',
                                sendState === 'sending');
      syncNode.classList.toggle('msg-header-syncing-section-error',
                                sendState === 'error');

      // Set the accessible label for the syncNode.
      if (sendState) {
        mozL10n.setAttributes(syncNode, 'message-header-state-' + sendState);
      } else {
        syncNode.removeAttribute('data-l10n-id');
      }

      // edit mode select state, defined in lst/edit_controller
      this.updateDomSelectState(msgNode, message);
    },

    /**
     * Called when the folder picker is animating to close. Need to
     * listen for it so this card can animate fading in the header menu.
     */
    onFolderPickerClosing: function() {
      this.headerMenuNode.classList.remove('transparent');
    },

    /**
     * Listener called when a folder is shown. The listener emits an
     * 'inboxShown' for the current account, if the inbox is really being shown
     * and the app is visible. Useful if periodic sync is involved, and
     * notifications need to be closed if the inbox is visible to the user.
     */
    onFolderShown: function() {
      var model = this.model,
          account = model.account,
          foldersSlice = model.foldersSlice;

      // The extra checks here are to allow for lazy startup when we might have
      // a card instance but not a full model available. Once the model is
      // available though, this method will get called again, so the event
      // emitting is still correctly done in the lazy startup case.
      if (!document.hidden && account && foldersSlice && this.curFolder) {
        var inboxFolder = foldersSlice.getFirstFolderWithType('inbox');
        if (inboxFolder === this.curFolder) {
          evt.emit('inboxShown', account.id);
        }

        // If user tapped in search box on message_list before the JS for the
        // card is attached, then treat that as the signal to go to search. Only
        // do this when first starting up though.
        if (document.activeElement === this.searchTextTease) {
          this.onSearchButton();
        }
      }
    },

    /**
     * An API method for the cards infrastructure, that Cards will call when the
     * page visibility changes and this card is the currently displayed card.
     */
    onCurrentCardDocumentVisibilityChange: function() {
      this.onFolderShown();
    },

    /**
     * Called by Cards when the instance of this card type is the
     * visible card.
     */
    onCardVisible: function() {
      if (this._whenVisible) {
        var fn = this._whenVisible;
        this._whenVisible = null;
        fn();
      }

      // In case the vScroll was initialized when the card was not visible, like
      // in an activity/notification flow when this card is created in the
      // background behind the compose/reader card, let it know it is visible
      // now in case it needs to finish initializing and initial display.
      this.msgVScroll.vScroll.nowVisible();

      // On first construction, or if done in background,
      // this card would not be visible to do the last sync
      // sizing so be sure to check it now.
      this.sizeLastSync();
    },

    /**
     * The outbox has a special role in the message_list, compared to
     * other folders. We don't expect to synchronize the outbox with the
     * server, but we do allow the user to use the refresh button to
     * trigger all of the outbox messages to send.
     *
     * While they're sending, we need to display several spinny refresh
     * icons: One next to each message while it's queued for sending,
     * and also the main refresh button.
     *
     * However, the outbox send operation doesn't happen all in one go;
     * the backend only fires one 'sendOutboxMessages' at a time,
     * iterating through the pending messages. Fortunately, it notifies
     * the frontend (via `onBackgroundSendStatus`) whenever the state of
     * any message changes, and it provides a flag to let us know
     * whether or not the outbox sync is fully complete.
     *
     * So the workflow for outbox's refresh UI display is as follows:
     *
     * 1. The user taps the "refresh" button. In response:
     *
     *    1a. Immediately make all visible refresh icons start spinning.
     *
     *    1b. Immediately kick off a 'sendOutboxMessages' job.
     *
     * 2. We will start to see send status notifications, in this
     *    class's onBackgroundSendStatus notification. We listen to
     *    these events as they come in, and wait until we see a
     *    notification with state === 'syncDone'. We'll keep the main
     *    refresh icon spinning throughout this process.
     *
     * 3. As messages send or error out, we will receive slice
     *    notifications for each message (handled here in `messages_change`).
     *    Since each message holds its own status as `header.sendStatus`,
     *    we don't need to do anything special; the normal rendering logic
     *    will reset each message's status icon to the appropriate state.
     *
     * But don't take my word for it; see `jobs/outbox.js` and
     * `jobmixins.js` in GELAM for backend-centric descriptions of how
     * the outbox sending process works.
     */
    toggleOutboxSyncingDisplay: function(syncing) {
      // Use an internal guard so that we only trigger changes to the UI
      // when necessary, rather than every time, which could break animations.
      if (syncing === this._outboxSyncing) {
        return;
      }

      this._outboxSyncing = syncing;

      var i;
      var items = this.msgVScroll.getElementsByClassName(
        'msg-header-syncing-section');

      if (syncing) {
        // For maximum perceived responsiveness, show the spinning icons
        // next to each message immediately, rather than waiting for the
        // backend to actually start sending each message. When the
        // backend reports back with message results, it'll update the
        // icon to reflect the proper result.
        for (i = 0; i < items.length; i++) {
          items[i].classList.add('msg-header-syncing-section-syncing');
          items[i].classList.remove('msg-header-syncing-section-error');
        }

        this.editBtn.disabled = true;
      } else {
        // After sync, the edit button should remain disabled only if
        // the list is empty.
        this.editBtn.disabled = this.msgVScroll.isEmpty();

        // Similarly, we must stop the refresh icons for each message
        // from rotating further. For instance, if we are offline, we
        // won't actually attempt to send any of those messages, so
        // they'll still have a spinny icon until we forcibly remove it.
        for (i = 0; i < items.length; i++) {
          items[i].classList.remove('msg-header-syncing-section-syncing');
        }
      }
      this.setRefreshState(syncing);
    },

    onRefresh: function() {
      var headerCursor = this.headerCursor;

      if (!headerCursor.messagesSlice) {
        return;
      }

      // If this is the outbox, refresh has a different meaning.
      if (this.curFolder.type === 'outbox') {
        // Rather than refreshing the folder, we'll send the pending
        // outbox messages, and spin the refresh icon while doing so.
        this.toggleOutboxSyncingDisplay(true);
      }
      // If this is a normal folder...
      else {
        switch (headerCursor.messagesSlice.status) {
        // If we're still synchronizing, then the user is not well served by
        // queueing a refresh yet, let's just squash this.
        case 'new':
        case 'synchronizing':
          break;
        // If we fully synchronized, then yes, let us refresh.
        case 'synced':
          this._manuallyTriggeredSync = true;
          headerCursor.messagesSlice.refresh();
          break;
        // If we failed to talk to the server, then let's only do a refresh if
        // we know about any messages.  Otherwise let's just create a new slice
        // by forcing reentry into the folder.
        case 'syncfailed':
          if (headerCursor.messagesSlice.items.length) {
            headerCursor.messagesSlice.refresh();
          } else {
            this.showFolder(this.curFolder, /* force new slice */ true);
          }
          break;
        }
      }

      // Even if we're not actually viewing the outbox right now, we
      // should still attempt to sync any pending messages. It's fairly
      // harmless to kick off this job here, but it could also make
      // sense to do this at the backend level. There are a number of
      // cases where we might also want to  sendOutboxMessages() if
      // we follow up with a more comprehensive sync setting -- e.g. on
      // network change, on app startup, etc., so it's worth revisiting
      // this and how coupled we want incoming vs outgoing sync to be.
      this.model.api.sendOutboxMessages(this.model.account);
    },

    _folderChanged: function(folder) {
      // It is possible that the notification of latest folder is fired
      // but in the meantime the foldersSlice could be cleared due to
      // a change in the current account, before this listener is called.
      // So skip this work if no foldersSlice, this method will be called
      // again soon.
      if (!this.model.foldersSlice) {
        return;
      }

      // Folder could have changed because account changed. Make sure
      // the cacheableFolderId is still set correctly.
      var model = this.model;
      var inboxFolder = model.foldersSlice.getFirstFolderWithType('inbox');
      this.cacheableFolderId =
                             model.account === model.acctsSlice.defaultAccount ?
                            inboxFolder.id : null;

      if (this.showFolder(folder)) {
        this._hideSearchBoxByScrolling();
      }
    },

    die: function() {
      this.msgVScroll.die();

      evt.removeListener('folderPickerClosing', this.onFolderPickerClosing);

      var model = this.model;
      model.removeListener('folder', this._folderChanged);
      model.removeListener('newInboxMessages', this.onNewMail);
      model.removeListener('foldersSliceOnChange', this.onFoldersSliceChange);
    }
  }
];
});
