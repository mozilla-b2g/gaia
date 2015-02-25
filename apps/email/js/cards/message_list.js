/*jshint browser: true */
/*global define, console, FontSizeUtils, requestAnimationFrame */
'use strict';

define(function(require) {

var msgHeaderItemNode = require('tmpl!./msg/header_item.html'),
    deleteConfirmMsgNode = require('tmpl!./msg/delete_confirm.html'),
    largeMsgConfirmMsgNode = require('tmpl!./msg/large_message_confirm.html'),
    cards = require('cards'),
    ConfirmDialog = require('confirm_dialog'),
    date = require('date'),
    evt = require('evt'),
    toaster = require('toaster'),
    model = require('model'),
    headerCursor = require('header_cursor').cursor,
    htmlCache = require('html_cache'),
    mozL10n = require('l10n!'),
    VScroll = require('vscroll'),
    MessageListTopBar = require('message_list_topbar'),
    accessibilityHelper = require('shared/js/accessibility_helper'),
    messageDisplay = require('message_display');


var MATCHED_TEXT_CLASS = 'highlight';

function appendMatchItemTo(matchItem, node) {
  var text = matchItem.text;
  var idx = 0;
  for (var iRun = 0; iRun <= matchItem.matchRuns.length; iRun++) {
    var run;
    if (iRun === matchItem.matchRuns.length) {
      run = { start: text.length, length: 0 };
    } else {
      run = matchItem.matchRuns[iRun];
    }

    // generate the un-highlighted span
    if (run.start > idx) {
      var tnode = document.createTextNode(text.substring(idx, run.start));
      node.appendChild(tnode);
    }

    if (!run.length) {
      continue;
    }
    var hspan = document.createElement('span');
    hspan.classList.add(MATCHED_TEXT_CLASS);
    hspan.textContent = text.substr(run.start, run.length);
    node.appendChild(hspan);
    idx = run.start + run.length;
  }
}

// Default data used for the VScroll component, when data is not
// loaded yet for display in the virtual scroll listing.
var defaultVScrollData = {
  'isPlaceholderData': true,
  'id': 'INVALID',
  'author': {
    'name': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583',
    'address': '',
    'contactId': null
  },
  'to': [
    {
      'name': ' ',
      'address': ' ',
      'contactId': null
    }
  ],
  'cc': null,
  'bcc': null,
  'date': '0',
  'hasAttachments': false,
  'snippet': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' +
             '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' +
             '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583',
  'isRead': true,
  'isStarred': false,
  'sendStatus': {},
  'subject': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' +
             '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' +
             '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583'
};

// We will display this loading data for any messages we are
// pretending exist so that the UI has a reason to poke the search
// slice to do more work.
var defaultSearchVScrollData = {
  header: defaultVScrollData,
  matches: []
};

/**
 * Minimum number of items there must be in the message slice
 * for us to attempt to limit the selection of snippets to fetch.
 */
var MINIMUM_ITEMS_FOR_SCROLL_CALC = 10;

/**
 * Maximum amount of time between issuing snippet requests.
 */
var MAXIMUM_MS_BETWEEN_SNIPPET_REQUEST = 6000;

/**
 * Fetch up to 4kb while scrolling
 */
var MAXIMUM_BYTES_PER_MESSAGE_DURING_SCROLL = 4 * 1024;

/**
 * List messages for listing the contents of folders ('nonsearch' mode) and
 * searches ('search' mode).  Multi-editing is just a state of the card.
 *
 * Nonsearch and search modes exist together in the same card because so much
 * of what they do is the same.  We have the cards differ by marking nodes that
 * are not shared with 'msg-nonsearch-only' or 'msg-search-only'.  We add the
 * collapsed class to all of the nodes that are not applicable for a node at
 * startup.
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
  require('./base')(require('template!./message_list.html')),
  {
    createdCallback: function() {
      var mode = this.mode;

      if (mode === 'nonsearch') {
        this.batchAddClass('msg-search-only', 'collapsed');
      } else {
        this.batchAddClass('msg-nonsearch-only', 'collapsed');
        // Favor the use of the card background color for the status bar instead
        // of the default color.
        this.dataset.statuscolor = 'background';
      }

      this.bindContainerHandler(this.messagesContainer, 'click',
                                this.onClickMessage.bind(this));
      // Sync display
      this._needsSizeLastSync = true;
      this.updateLastSynced();

      // -- search mode
      if (mode === 'search') {
        this.bindContainerHandler(
          this.querySelector('.filter'),
          'click', this.onSearchFilterClick.bind(this));
        this.searchFilterTabs = this.querySelectorAll('.filter [role="tab"]');
      }

      this.editMode = false;
      this.selectedMessages = null;

      this.curFolder = null;
      this.isIncomingFolder = true;
      this._emittedContentEvents = false;

      this.usingCachedNode = this.dataset.cached === 'cached';

      // Set up the list data source for VScroll
      var listFunc = (function(index) {
         return headerCursor.messagesSlice.items[index];
      }.bind(this));

      listFunc.size = function() {
        // This method could get called during VScroll updates triggered
        // by messages_splice. However at that point, the headerCount may
        // not be correct, like when fetching more messages from the
        // server. So approximate by using the size of slice.items.
        var slice = headerCursor.messagesSlice;
        // coerce headerCount to 0 if it was undefined to avoid a NaN
        return Math.max(slice.headerCount || 0, slice.items.length);
      };
      this.listFunc = listFunc;

      // We need to wait for the slice to complete before we can issue any
      // sensible growth requests.
      this.waitingOnChunk = true;
      this.desiredHighAbsoluteIndex = 0;
      this._needVScrollData = false;
      this.vScroll = new VScroll(
        this.messagesContainer,
        this.scrollContainer,
        msgHeaderItemNode,
        (this.mode === 'nonsearch' ?
                       defaultVScrollData : defaultSearchVScrollData)
      );

      // Called by VScroll wants to bind some data to a node it wants to
      // display in the DOM.
      if (this.mode === 'nonsearch') {
        this.vScroll.bindData = (function bindNonSearch(model, node) {
          model.element = node;
          node.message = model;
          this.updateMessageDom(true, model);
        }).bind(this);
      } else {
        this.vScroll.bindData = (function bindSearch(model, node) {
          model.element = node;
          node.message = model.header;
          this.updateMatchedMessageDom(true, model);
        }).bind(this);
      }

      // Called by VScroll when it detects it will need more data in the near
      // future. VScroll does not know if it already asked for this information,
      // so this function needs to be sure it actually needs to ask for more
      // from the back end.
      this.vScroll.prepareData = (function(highAbsoluteIndex) {
        var items = headerCursor.messagesSlice &&
                    headerCursor.messagesSlice.items,
            headerCount = headerCursor.messagesSlice.headerCount;

        if (!items || !headerCount) {
          return;
        }

        // Make sure total amount stays within possible range.
        if (highAbsoluteIndex > headerCount - 1) {
          highAbsoluteIndex = headerCount - 1;
        }

        // We're already prepared if the slice is already that big.
        if (highAbsoluteIndex < items.length) {
          return;
        }

        this.loadNextChunk(highAbsoluteIndex);
      }.bind(this));

      this._hideSearchBoxByScrolling =
                                      this._hideSearchBoxByScrolling.bind(this);
      this._onVScrollStopped = this._onVScrollStopped.bind(this);

      // Event listeners for VScroll events.
      this.vScroll.on('inited', this._hideSearchBoxByScrolling);
      this.vScroll.on('dataChanged', this._hideSearchBoxByScrolling);
      this.vScroll.on('scrollStopped', this._onVScrollStopped);
      this.vScroll.on('recalculated', function(calledFromTop) {
        if (calledFromTop) {
          this._hideSearchBoxByScrolling();
        }
      }.bind(this));

      this._topBar = new MessageListTopBar(
        this.querySelector('.message-list-topbar')
      );
      this._topBar.bindToElements(this.scrollContainer, this.vScroll);

      // Binding "this" to some functions as they are used for
      // event listeners.
      this._folderChanged = this._folderChanged.bind(this);
      this.onNewMail = this.onNewMail.bind(this);
      this.onFoldersSliceChange = this.onFoldersSliceChange.bind(this);
      this.messages_splice = this.messages_splice.bind(this);
      this.messages_change = this.messages_change.bind(this);
      this.messages_status = this.messages_status.bind(this);
      this.messages_complete = this.messages_complete.bind(this);

      this.onFolderPickerClosing = this.onFolderPickerClosing.bind(this);
      evt.on('folderPickerClosing', this.onFolderPickerClosing);

      model.latest('folder', this._folderChanged);
      model.on('newInboxMessages', this.onNewMail);
      model.on('backgroundSendStatus', this.onBackgroundSendStatus.bind(this));

      model.on('foldersSliceOnChange', this.onFoldersSliceChange);

      this.sliceEvents.forEach(function(type) {
        var name = 'messages_' + type;
        headerCursor.on(name, this[name]);
      }.bind(this));

      this.onCurrentMessage = this.onCurrentMessage.bind(this);
      headerCursor.on('currentMessage', this.onCurrentMessage);

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
      if (this.curFolder && this.mode === 'nonsearch') {
        var items = headerCursor.messagesSlice &&
                    headerCursor.messagesSlice.items;
        if (items && items.length) {
          this.messages_splice(0, 0, items);
          this.messages_complete(0);
        }
      }
    },

    // Hack to get separate modules for search vs non-search, but
    // eventually the search branches in this file should be moved
    // to message_list_search
    mode: 'nonsearch',

    /**
     * @type {MessageListTopbar}
     * @private
     */
    _topBar: null,

    /**
     * Cache the distance between messages since rows are effectively fixed
     * height.
     */
    _distanceBetweenMessages: 0,

    sliceEvents: ['splice', 'change', 'status', 'complete'],

    toolbarEditButtonNames:['starBtn', 'readBtn', 'deleteBtn', 'moveBtn'],

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
      this.vScroll.visibleOffset =
                                  this.searchBar.getBoundingClientRect().height;

      // Also tell the MessageListTopBar
      this._topBar.visibleOffset = this.vScroll.visibleOffset;

      // For search we want to make sure that we capture the screen size prior
      // to focusing the input since the FxOS keyboard will resize our window to
      // be smaller which messes up our logic a bit.  We trigger metric
      // gathering in non-search cases too for consistency.
      this.vScroll.captureScreenMetrics();
      if (this.mode === 'search') {
        this.searchInput.focus();
      }
    },

    onSearchButton: function() {
      // Do not bother if there is no current folder.
      if (!this.curFolder) {
        return;
      }

      cards.pushCard(
        'message_list_search', 'animate',
        {
          folder: this.curFolder
        });
    },

    setEditMode: function(editMode) {
      // Do not bother if this is triggered before
      // a folder has loaded.
      if (!this.curFolder) {
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
        model.api.setOutboxSyncEnabled(model.account, !editMode, function() {
          this._setEditMode(editMode);
        }.bind(this));
      } else {
        this._setEditMode(editMode);
      }
    },

    // This function is called from setEditMode() after ensuring that
    // the backend is in a state where we can safely use edit mode.
    _setEditMode: function(editMode) {
      var i;

      this.editMode = editMode;

      // XXX the manual DOM play here is now a bit overkill; we should very
      // probably switch top having the CSS do this for us or at least invest
      // some time in cleanup.
      if (editMode) {
        this.normalHeader.classList.add('collapsed');
        this.searchHeader.classList.add('collapsed');
        this.normalToolbar.classList.add('collapsed');
        this.editHeader.classList.remove('collapsed');
        this.editToolbar.classList.remove('collapsed');
        this.messagesContainer.classList.add('show-edit');

        this.selectedMessages = [];
        this.selectedMessagesUpdated();
      }
      else {
        if (this.mode === 'nonsearch') {
          this.normalHeader.classList.remove('collapsed');
        } else {
          this.searchHeader.classList.remove('collapsed');
        }
        this.normalToolbar.classList.remove('collapsed');
        this.editHeader.classList.add('collapsed');
        this.editToolbar.classList.add('collapsed');
        this.messagesContainer.classList.remove('show-edit');

        this.selectedMessages = null;
      }

      // Reset checked mode for all message items.
      var msgNodes = this.messagesContainer.querySelectorAll(
        '.msg-header-item');
      for (i = 0; i < msgNodes.length; i++) {
        this.setMessageChecked(msgNodes[i], false);
      }

      // UXXX do we want to disable the buttons if nothing is selected?
    },

    // Event handler wired up in HTML template
    setEditModeStart: function() {
      this.setEditMode(true);
    },

    // Event handler wired up in HTML template
    setEditModeDone: function() {
      this.setEditMode(false);
    },

    /**
     * Update the edit mode UI bits sensitive to a change in the set of selected
     * messages.  This means the label that says how many messages are selected,
     * whether the buttons are enabled, which of the toggle-pairs are visible.
     */
    selectedMessagesUpdated: function() {
      mozL10n.setAttributes(this.headerNode, 'message-multiedit-header',
                            { n: this.selectedMessages.length });

      var hasMessages = !!this.selectedMessages.length;

      // Enabling/disabling rules (not UX-signed-off):  Our bias is that people
      // want to star messages and mark messages unread (since it they naturally
      // end up unread), so unless messages are all in this state, we assume
      // that is the desired action.
      var numStarred = 0, numRead = 0;
      for (var i = 0; i < this.selectedMessages.length; i++) {
        var msg = this.selectedMessages[i];
        if (msg.isStarred) {
          numStarred++;
        }
        if (msg.isRead) {
          numRead++;
        }
      }

      // Unstar if everything is starred, otherwise star
      this.setAsStarred = !(numStarred && numStarred ===
                            this.selectedMessages.length);
      mozL10n.setAttributes(this.starBtn,
        this.setAsStarred ? 'message-star-button' : 'message-unstar-button');

      // Mark read if everything is unread, otherwise unread
      this.setAsRead = (hasMessages && numRead === 0);

      // Update mark read/unread button to show what action will be taken.
      this.readBtn.classList.toggle('unread', numRead > 0);
      mozL10n.setAttributes(this.readBtn, numRead > 0 ?
        'message-mark-unread-button' : 'message-mark-read-button');

      // Update disabled state based on if there are selected messages
      this.toolbarEditButtonNames.forEach(function(key) {
        this[key].disabled = !hasMessages;
      }.bind(this));
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
      // Note that when we call this.vScroll.clearDisplay() we
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
        onPushed: function() {
          this.headerMenuNode.classList.add('transparent');
        }.bind(this)
      });
    },

    onCompose: function() {
      cards.pushCard('compose', 'animate');
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
        this.vScroll.clearDisplay();
      }
      this._needVScrollData = true;

      this.curFolder = folder;

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
      this.messagesContainer.setAttribute('aria-label', folder.name);
      this.hideEmptyLayout();

      // You can't refresh messages in the localdrafts folder.
      this.refreshBtn.classList.toggle('collapsed',
                                               folder.type === 'localdrafts');
      // You can't move messages in localdrafts or the outbox.
      this.moveBtn.classList.toggle('collapsed',
                                            folder.type === 'localdrafts' ||
                                            folder.type === 'outbox');
      // You can't flag or change the read status of messages in the outbox.
      this.starBtn.classList.toggle('collapsed',
                                            folder.type === 'outbox');
      this.readBtn.classList.toggle('collapsed',
                                            folder.type === 'outbox');

      this.updateLastSynced(folder.lastSyncedAt);

      if (forceNewSlice) {
        // We are creating a new slice, so any pending snippet requests are
        // moot.
        this._snippetRequestPending = false;
        headerCursor.freshMessagesSlice();
      }

      this.onFolderShown();

      return true;
    },

    showSearch: function(phrase, filter) {
      console.log('sf: showSearch. phrase:', phrase, phrase.length);

      this.curFolder = model.folder;
      this.vScroll.clearDisplay();
      this.curPhrase = phrase;
      this.curFilter = filter;

      // We are creating a new slice, so any pending snippet requests are moot.
      this._snippetRequestPending = false;
      // Don't bother the new slice with requests until we hears it completion
      // event.
      this.waitingOnChunk = true;
      headerCursor.startSearch(phrase, {
        author: filter === 'all' || filter === 'author',
        recipients: filter === 'all' || filter === 'recipients',
        subject: filter === 'all' || filter === 'subject',
        body: filter === 'all' || filter === 'body'
      });

      return true;
    },

    onSearchFilterClick: function(filterNode, event) {
      accessibilityHelper.setAriaSelected(filterNode.firstElementChild,
        this.searchFilterTabs);
      this.showSearch(this.searchInput.value, filterNode.dataset.filter);
    },

    onSearchTextChange: function(event) {
      console.log('sf: typed, now:', this.searchInput.value);
      this.showSearch(this.searchInput.value, this.curFilter);
    },

    onSearchSubmit: function(event) {
      // Not a real form to submit, so stop actual submission.
      event.preventDefault();

      // Blur the focus away from the text input. This has the effect of hiding
      // the keyboard. This is useful for the two cases where this function is
      // currently triggered: Enter on the keyboard or Cancel on form submit.
      // Note that the Cancel button has a type="submit", which is technically
      // an incorrect use of that type. However the /shared styles depend on it
      // being marked as such for style reasons.
      this.searchInput.blur();
    },

    onCancelSearch: function(event) {
      // Only care about real clicks on actual button, not fake ones triggered
      // by a form submit from the Enter button on the keyboard.
      // Note: the cancel button should not really be a type="submit", but it is
      // that way because the /shared styles for this search form wants to see
      // a submit. Longer term this should be changed in the /shared components.
      // This event test is used because in form submit cases, the
      // explicitOriginalTarget (the text input) is not the same as the target
      // (the button).
      if (event.explicitOriginalTarget !== event.target) {
        return;
      }

      try {
        headerCursor.endSearch();
      }
      catch (ex) {
        console.error('problem killing slice:', ex, '\n', ex.stack);
      }
      cards.removeCardAndSuccessors(this, 'animate');
    },

    onGetMoreMessages: function() {
      if (!headerCursor.messagesSlice) {
        return;
      }

      headerCursor.messagesSlice.requestGrowth(1, true);
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

    // The funny name because it is auto-bound as a listener for
    // messagesSlice events in headerCursor using a naming convention.
    messages_status: function(newStatus) {
      if (headerCursor.searchMode !== this.mode) {
        return;
      }

      // The outbox's refresh button is used for sending messages, so we
      // ignore any syncing events generated by the slice. The outbox
      // doesn't need to show many of these indicators (like the "Load
      // More Messages..." node, etc.) and it has its own special
      // "refreshing" display, as documented elsewhere in this file.
      if (this.curFolder.type === 'outbox') {
        return;
      }

      if (newStatus === 'synchronizing' ||
         newStatus === 'syncblocked') {
          this.syncingNode.classList.remove('collapsed');
          this.syncMoreNode.classList.add('collapsed');
          this.hideEmptyLayout();
          this.setRefreshState(true);
      } else if (newStatus === 'syncfailed' ||
                 newStatus === 'synced') {
        if (newStatus === 'syncfailed') {
          // If there was a problem talking to the server, notify the user and
          // provide a means to attempt to talk to the server again.  We have
          // made onRefresh pretty clever, so it can do all the legwork on
          // accomplishing this goal.
          toaster.toast({
            text: mozL10n.get('toaster-retryable-syncfailed')
          });
        }
        this.setRefreshState(false);
        this.syncingNode.classList.add('collapsed');
        this._manuallyTriggeredSync = false;
      }
    },

    isEmpty: function() {
      return headerCursor.messagesSlice.items.length === 0;
    },

    /**
     * Hide buttons that are not appropriate if we have no messages and display
     * the appropriate l10n string in the message list proper.
     */
    showEmptyLayout: function() {
      this._clearCachedMessages();

      mozL10n.setAttributes(
        this.messageEmptyText,
        (this.mode === 'search') ? 'messages-search-empty' :
                                   'messages-folder-empty');
      this.messageEmptyContainer.classList.remove('collapsed');

      this.editBtn.disabled = true;

      // The outbox can't refresh anything if there are no messages.
      if (this.curFolder.type === 'outbox') {
        this.refreshBtn.disabled = true;
      }

      this._hideSearchBoxByScrolling();
    },
    /**
     * Show buttons we hid in `showEmptyLayout` and hide the "empty folder"
     * message.
     */
    hideEmptyLayout: function() {
      this.messageEmptyContainer.classList.add('collapsed');
      this.editBtn.disabled = false;
      this.refreshBtn.disabled = false;
    },


    /**
     * @param {number=} newEmailCount Optional number of new messages.
     * The funny name because it is auto-bound as a listener for
     * messagesSlice events in headerCursor using a naming convention.
     */
    messages_complete: function(newEmailCount) {
      if (headerCursor.searchMode !== this.mode) {
        return;
      }

      console.log('message_list complete:',
                  headerCursor.messagesSlice.items.length, 'items of',
                  headerCursor.messagesSlice.headerCount,
                  'alleged known headers. canGrow:',
                  headerCursor.messagesSlice.userCanGrowDownwards);

    // Show "load more", but only if the slice can grow and if there is a
    // non-zero headerCount. If zero headerCount, it likely means the folder
    // has never been synchronized, and this display was an offline display,
    // so it is hard to know if messages can be synchronized. In this case,
    // canGrow is not enough of an indicator, because as far as the back end is
    // concerned, it could grow, it just has no way to check for sure yet. So
    // hide the "load more", the user can use the refresh icon once online to
    // load messages.
    if (headerCursor.messagesSlice.userCanGrowDownwards &&
        headerCursor.messagesSlice.headerCount) {
        this.syncMoreNode.classList.remove('collapsed');
      } else {
        this.syncMoreNode.classList.add('collapsed');
      }

      // Show empty layout, unless this is a slice with fake data that
      // will get changed soon.
      if (headerCursor.messagesSlice.items.length === 0) {
        this.showEmptyLayout();
      }

      // Search does not trigger normal conditions for a folder changed,
      // so if vScroll is missing its data, set it up now.
      if (this.mode === 'search' && !this.vScroll.list) {
        this.vScroll.setData(this.listFunc);
      }

      this.onNewMail(newEmailCount);

      this.waitingOnChunk = false;
      // Load next chunk if one is pending
      if (this.desiredHighAbsoluteIndex) {
        this.loadNextChunk(this.desiredHighAbsoluteIndex);
        this.desiredHighAbsoluteIndex = 0;
      }

      // It's possible for a synchronization to result in a change to
      // headerCount without resulting in a splice.  This is very likely
      // to happen with a search filter when it was lying about another
      // messages existing, but it's also possible to happen in
      // synchronizations.
      //
      // XXX Our total correctness currently depends on headerCount only
      // changing as a result of a synchronization triggered by this slice.
      // This does not hold up when confronted with periodic background sync; we
      // need to finish cleanup up the headerCount change notification stuff.
      //
      // (However, this is acceptable glitchage right now.  We just need to make
      // sure it doesn't happen for searches since it's so blatant.)
      //
      // So, anyways, use updateDataBind() to cause VScroll to double-check that
      // our list size didn't change from what it thought it was.  (It renders
      // coordinate-space predictively based on our headerCount, but we
      // currently only provide strong correctness guarantees for actually
      // reported `items`, so we must do this.)  If our list size is the same,
      // this call is effectively a no-op.
      this.vScroll.updateDataBind(0, [], 0);


      // Inform that content is ready. There could actually be a small delay
      // with vScroll.updateDataBind from rendering the final display, but it is
      // small enough that it is not worth trying to break apart the design to
      // accommodate this metrics signal.
      if (!this._emittedContentEvents) {
        evt.emit('metrics:contentDone');
        this._emittedContentEvents = true;
      }
    },

    onNewMail: function(newEmailCount) {
      var inboxFolder = model.foldersSlice.getFirstFolderWithType('inbox');

      if (inboxFolder.id === this.curFolder.id &&
          newEmailCount && newEmailCount > 0) {
        if (!cards.isVisible(this)) {
          this._whenVisible = this.onNewMail.bind(this, newEmailCount);
          return;
        }

        // If the user manually synced, then want to jump to show the new
        // messages. Otherwise, show the top bar.
        if (this._manuallyTriggeredSync) {
          this.vScroll.jumpToIndex(0);
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
     * Waits for scrolling to stop before fetching snippets.
     */
    _onVScrollStopped: function() {
      // Give any pending requests in the slice priority.
      if (!headerCursor.messagesSlice ||
          headerCursor.messagesSlice.pendingRequestCount) {
        return;
      }

      // Do not bother fetching snippets if this card is not in view.
      // The card could still have a scroll event triggered though
      // by the next/previous work done in message_reader.
      if (cards.isVisible(this) && !this._hasSnippetRequest()) {
        this._requestSnippets();
      }
    },

    _hasSnippetRequest: function() {
      var max = MAXIMUM_MS_BETWEEN_SNIPPET_REQUEST;
      var now = Date.now();

      // if we before the maximum time to wait between requests...
      var beforeTimeout =
        (this._lastSnippetRequest + max) > now;

      // there is an important case where the backend may be slow OR have some
      // fatal error which would prevent us from ever requesting an new set of
      // snippets because we wait until the last batch finishes. To prevent that
      // from ever happening we maintain the request start time and if more then
      // MAXIMUM_MS_BETWEEN_SNIPPET_REQUEST passes we issue a new request.
      if (
        this._snippetRequestPending &&
        beforeTimeout
      ) {
        return true;
      }

      return false;
    },

    _pendingSnippetRequest: function() {
      this._snippetRequestPending = true;
      this._lastSnippetRequest = Date.now();
    },

    _clearSnippetRequest: function() {
      this._snippetRequestPending = false;
    },

    _requestSnippets: function() {
      var items = headerCursor.messagesSlice.items;
      var len = items.length;

      if (!len) {
        return;
      }

      var clearSnippets = this._clearSnippetRequest.bind(this);
      var options = {
        // this is per message
        maximumBytesToFetch: MAXIMUM_BYTES_PER_MESSAGE_DURING_SCROLL
      };

      if (len < MINIMUM_ITEMS_FOR_SCROLL_CALC) {
        this._pendingSnippetRequest();
        headerCursor.messagesSlice.maybeRequestBodies(0,
            MINIMUM_ITEMS_FOR_SCROLL_CALC - 1, options, clearSnippets);
        return;
      }

      var visibleIndices = this.vScroll.getVisibleIndexRange();

      if (visibleIndices) {
        this._pendingSnippetRequest();
        headerCursor.messagesSlice.maybeRequestBodies(
          visibleIndices[0],
          visibleIndices[1],
          options,
          clearSnippets
        );
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
      return this.cacheableFolderId === this.curFolder.id &&
             this.mode === 'nonsearch' &&
             !this.editMode;
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
      cacheNode.dataset.cached = 'cached';

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
        cacheNode.querySelector('.msg-messages-container'),
        this._cacheListLimit
      );

      htmlCache.saveFromNode(cacheNode);
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
          this.vScroll.firstRenderedIndex === 0 &&
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
        this.messagesContainer.innerHTML = '';
        this.usingCachedNode = false;
      }
    },

    /**
     * Request data through desiredHighAbsoluteIndex if we don't have it
     * already and we think it exists.  If we already have an outstanding
     * request we will save off this most recent request to process once
     * the current request completes.  Any previously queued request will
     * be forgotten regardless of how it compares to the newly queued
     * request.
     *
     * @param  {Number} desiredHighAbsoluteIndex
     */
    loadNextChunk: function(desiredHighAbsoluteIndex) {
      // The recalculate logic will trigger a call to prepareData, so
      // it's okay for us to bail.  It's advisable for us to bail
      // because any calls to prepareData will be based on outdated
      // index information.
      if (this.vScroll.waitingForRecalculate) {
        return;
      }

      if (this.waitingOnChunk) {
        this.desiredHighAbsoluteIndex = desiredHighAbsoluteIndex;
        return;
      }

      // Do not bother asking for more than exists
      if (desiredHighAbsoluteIndex >= headerCursor.messagesSlice.headerCount) {
        desiredHighAbsoluteIndex = headerCursor.messagesSlice.headerCount - 1;
      }

      // Do not bother asking for more than what is already
      // fetched
      var items = headerCursor.messagesSlice.items;
      var curHighAbsoluteIndex = items.length - 1;
      var amount = desiredHighAbsoluteIndex - curHighAbsoluteIndex;
      if (amount > 0) {
        // IMPORTANT NOTE!
        // 1 is unfortunately a special value right now for historical reasons
        // that the other side interprets as a request to grow downward with the
        // default growth size.  XXX change backend and its tests...
        console.log('message_list loadNextChunk growing', amount,
                    (amount === 1 ? '(will get boosted to 15!) to' : 'to'),
                    (desiredHighAbsoluteIndex + 1), 'items out of',
                    headerCursor.messagesSlice.headerCount, 'alleged known');
        headerCursor.messagesSlice.requestGrowth(
          amount,
          // the user is not requesting us to go synchronize new messages
          false);
        this.waitingOnChunk = true;
      }
    },

    // The funny name because it is auto-bound as a listener for
    // messagesSlice events in headerCursor using a naming convention.
    messages_splice: function(index, howMany, addedItems,
                               requested, moreExpected, fake) {

      // If no work to do, or wrong mode, just skip it.
      if (headerCursor.searchMode !== this.mode ||
         (index === 0 && howMany === 0 && !addedItems.length)) {
        return;
      }

      this._clearCachedMessages();

      if (this._needVScrollData) {
        this.vScroll.setData(this.listFunc);
        this._needVScrollData = false;
      }

      this.vScroll.updateDataBind(index, addedItems, howMany);

      // Remove the no message text while new messages added:
      if (addedItems.length > 0) {
        this.hideEmptyLayout();
      }

      // If the end result is no more messages, then show empty layout.
      // This is needed mostly because local drafts do not trigger
      // a messages_complete callback when removing the last draft
      // from the compose triggered in that view. The scrollStopped
      // is used to avoid a flash where the old message is briefly visible
      // before cleared, and having the empty layout overlay it.
      // Using the slice's headerCount because it is updated before splice
      // listeners are notified, so should be accurate.
      if (!headerCursor.messagesSlice.headerCount) {
        this.vScroll.once('scrollStopped', function() {
          // Confirm there are still no messages. Since this callback happens
          // async, some items could have appeared since first issuing the
          // request to show empty.
          if (!headerCursor.messagesSlice.headerCount) {
            this.showEmptyLayout();
          }
        }.bind(this));
      }

      // Only cache if it is an add or remove of items
      if (addedItems.length || howMany) {
        this._considerCacheDom(index);
      }
    },

    // The funny name because it is auto-bound as a listener for
    // messagesSlice events in headerCursor using a naming convention.
    messages_change: function(message, index) {
      if (headerCursor.searchMode !== this.mode) {
        return;
      }

      if (this.mode === 'nonsearch') {
        this.onMessagesChange(message, index);
      } else {
        this.updateMatchedMessageDom(false, message);
      }
    },

    onMessagesChange: function(message, index) {
      this.updateMessageDom(false, message);

      // Since the DOM change, cache may need to change.
      this._considerCacheDom(index);
    },

    _updatePeepDom: function(peep) {
      peep.element.textContent = peep.name || peep.address;
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
      msgNode.classList[classAction](this.vScroll.itemDefaultDataClass);

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
        listPerson.onchange = this._updatePeepDom;
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
      var sendState = (message.sendStatus && message.sendStatus.state) ||
        'none';

      syncNode.classList.toggle('msg-header-syncing-section-syncing',
                                sendState === 'sending');
      syncNode.classList.toggle('msg-header-syncing-section-error',
                                sendState === 'error');
      // Set the accessible label for the syncNode.
      mozL10n.setAttributes(syncNode, 'message-header-state-' + sendState);

      // edit mode select state
      this.setSelectState(msgNode, message);
    },

    updateMatchedMessageDom: function(firstTime, matchedHeader) {
      var msgNode = matchedHeader.element,
          matches = matchedHeader.matches,
          message = matchedHeader.header;

      if (!msgNode) {
        return;
      }

      // If the placeholder data, indicate that in case VScroll
      // wants to go back and fix later.
      var classAction = message.isPlaceholderData ? 'add' : 'remove';
      msgNode.classList[classAction](this.vScroll.itemDefaultDataClass);

      // Even though updateMatchedMessageDom is only used in searches,
      // which likely will not be cached, the dataset.is is set to
      // maintain parity withe updateMessageDom and so click handlers
      // can always just use the dataset property.
      msgNode.dataset.id = matchedHeader.id;

      // some things only need to be done once
      var dateNode = msgNode.querySelector('.msg-header-date');
      var subjectNode = msgNode.querySelector('.msg-header-subject');
      if (firstTime) {
        // author
        var authorNode = msgNode.querySelector('.msg-header-author');
        if (matches.author) {
          authorNode.textContent = '';
          appendMatchItemTo(matches.author, authorNode);
        }
        else {
          // we can only update the name if it wasn't matched on.
          message.author.element = authorNode;
          message.author.onchange = this._updatePeepDom;
          message.author.onchange(message.author);
        }

        // date
        dateNode.dataset.time = message.date.valueOf();
        dateNode.textContent = date.prettyDate(message.date);

        // subject
        if (matches.subject) {
          subjectNode.textContent = '';
          appendMatchItemTo(matches.subject[0], subjectNode);
        } else {
          messageDisplay.subject(subjectNode, message);
        }

        // snippet
        var snippetNode = msgNode.querySelector('.msg-header-snippet');
        if (matches.body) {
          snippetNode.textContent = '';
          appendMatchItemTo(matches.body[0], snippetNode);
        } else {
          snippetNode.textContent = message.snippet;
        }

        // attachments (can't change within a message but can change between
        // messages, and since we reuse DOM nodes...)
        var attachmentsNode =
          msgNode.querySelector('.msg-header-attachments');
        attachmentsNode.classList.toggle('msg-header-attachments-yes',
                                         message.hasAttachments);
        // snippet needs to be shorter if icon is shown
        snippetNode.classList.toggle('icon-short', message.hasAttachments);
      }

      // Set unread state.
      msgNode.classList.toggle('unread', !message.isRead);

      // star
      var starNode = msgNode.querySelector('.msg-header-star');
      starNode.classList.toggle('msg-header-star-starred', message.isStarred);
      // subject needs to give space for star if it is visible
      subjectNode.classList.toggle('icon-short', message.isStarred);

      // edit mode select state
      this.setSelectState(msgNode, message);
    },

    /**
     * Set or unset the select state based on the edit mode.
     */
    setSelectState: function(msgNode, message) {
      if (this.editMode) {
        this.setMessageChecked(msgNode,
          this.selectedMessages.indexOf(message) !== -1);
      } else {
        msgNode.removeAttribute('aria-selected');
      }
    },

    /**
     * Set the checked state for the message item in the list. It sets both
     * checkbox checked and aria-selected states.
     */
    setMessageChecked: function(msgNode, checked) {
      var checkbox = msgNode.querySelector('input[type=checkbox]');
      checkbox.checked = checked;
      msgNode.setAttribute('aria-selected', checked);
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
      if (this.mode === 'search') {
        return;
      }

      var account = model.account,
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
      this.vScroll.nowVisible();

      // On first construction, or if done in background,
      // this card would not be visible to do the last sync
      // sizing so be sure to check it now.
      this.sizeLastSync();
    },

    onClickMessage: function(messageNode, event) {
      // You cannot open a message if this is the outbox and it is syncing.
      if (this.curFolder &&
          this.curFolder.type === 'outbox' && this.outboxSyncInProgress) {
        return;
      }

      var header = messageNode.message;

      // Skip nodes that are default/placeholder ones.
      if (header && header.isPlaceholderData) {
        return;
      }

      if (this.editMode) {
        var idx = this.selectedMessages.indexOf(header);
        if (idx !== -1) {
          this.selectedMessages.splice(idx, 1);
        }
        else {
          this.selectedMessages.push(header);
        }
        this.setMessageChecked(messageNode, idx === -1);
        this.selectedMessagesUpdated();
        return;
      }

      if (this.curFolder && this.curFolder.type === 'localdrafts') {
        var composer = header.editAsDraft(function() {
          cards.pushCard('compose', 'animate',
                         { composer: composer });
        });
        return;
      }

      // When tapping a message in the outbox, don't open the message;
      // instead, move it to localdrafts and edit the message as a
      // draft.
      if (this.curFolder && this.curFolder.type === 'outbox') {
        // If the message is currently being sent, abort.
        if (header.sendStatus.state === 'sending') {
          return;
        }
        var draftsFolder =
              model.foldersSlice.getFirstFolderWithType('localdrafts');

        console.log('outbox: Moving message to localdrafts.');
        model.api.moveMessages([header], draftsFolder, function(moveMap) {
          header.id = moveMap[header.id];
          console.log('outbox: Editing message in localdrafts.');
          var composer = header.editAsDraft(function() {
            cards.pushCard('compose', 'animate',
                           { composer: composer });
          });
        });

        return;
      }

      function pushMessageCard() {
        cards.pushCard(
          'message_reader', 'animate',
          {
            // The header here may be undefined here, since the click
            // could be on a cached HTML node before the back end has
            // started up. It is OK if header is not available as the
            // message_reader knows how to wait for the back end to
            // start up to get the header value later.
            header: header,
            // Use the property on the HTML, since the click could be
            // from a cached HTML node and the real data object may not
            // be available yet.
            messageSuid: messageNode.dataset.id
          });
      }

      if (header) {
        headerCursor.setCurrentMessage(header);
      } else if (messageNode.dataset.id) {
        // a case where header was not set yet, like clicking on a
        // cookie cached node, or virtual scroll item that is no
        // longer backed by a header.
        headerCursor.setCurrentMessageBySuid(messageNode.dataset.id);
      } else {
        // Not an interesting click, bail
        return;
      }

      // If the message is really big, warn them before they open it.
      // Ideally we'd only warn if you're on a cell connection
      // (metered), but as of now `navigator.connection.metered` isn't
      // implemented.

      // This number is somewhat arbitrary, based on a guess that most
      // plain-text/HTML messages will be smaller than this. If this
      // value is too small, users get warned unnecessarily. Too large
      // and they download a lot of data without knowing. Since we
      // currently assume that all network connections are metered,
      // they'll always see this if they get a large message...
      var LARGE_MESSAGE_SIZE = 1 * 1024 * 1024;

      // watch out, header might be undefined here (that's okay, see above)
      if (header && header.bytesToDownloadForBodyDisplay > LARGE_MESSAGE_SIZE) {
        this.showLargeMessageWarning(
          header.bytesToDownloadForBodyDisplay, function(result) {
          if (result) {
            pushMessageCard();
          } else {
            // abort
          }
        });
      } else {
        pushMessageCard();
      }
    },

    /**
     * Scroll to make sure that the current message is in our visible window.
     *
     * @param {header_cursor.CurrentMessage} currentMessage representation of
     *     the email we're currently reading.
     * @param {Number} index the index of the message in the messagesSlice
     */
    onCurrentMessage: function(currentMessage, index) {
      if (!currentMessage || headerCursor.searchMode !== this.mode) {
        return;
      }

      var visibleIndices = this.vScroll.getVisibleIndexRange();
      if (visibleIndices &&
          (index < visibleIndices[0] || index > visibleIndices[1])) {
        this.vScroll.jumpToIndex(index);
      }
    },

    onHoldMessage: function(messageNode, event) {
      if (this.curFolder) {
        this.setEditMode(true);
      }
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
      var items = this.messagesContainer.getElementsByClassName(
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
        this.editBtn.disabled = this.isEmpty();

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
      model.api.sendOutboxMessages(model.account);
    },

    onStarMessages: function() {
      var op = model.api.markMessagesStarred(this.selectedMessages,
                                           this.setAsStarred);
      this.setEditMode(false);
      toaster.toastOperation(op);
    },

    onMarkMessagesRead: function() {
      var op = model.api.markMessagesRead(this.selectedMessages,
                                          this.setAsRead);
      this.setEditMode(false);
      toaster.toastOperation(op);
    },

    onDeleteMessages: function() {
      // TODO: Batch delete back-end mail api is not ready for IMAP now.
      //       Please verify this function under IMAP when api completed.

      if (this.selectedMessages.length === 0) {
        return this.setEditMode(false);
      }

      var dialog = deleteConfirmMsgNode.cloneNode(true);
      var content = dialog.getElementsByTagName('p')[0];
      mozL10n.setAttributes(content, 'message-multiedit-delete-confirm',
                            { n: this.selectedMessages.length });
      ConfirmDialog.show(dialog,
        { // Confirm
          id: 'msg-delete-ok',
          handler: function() {
            var op = model.api.deleteMessages(this.selectedMessages);
            toaster.toastOperation(op);
            this.setEditMode(false);
          }.bind(this)
        },
        { // Cancel
          id: 'msg-delete-cancel',
          handler: null
        }
      );
    },

    /**
     * Show a warning that the given message is large.
     * Callback is called with cb(true|false) to continue.
     */
    showLargeMessageWarning: function(size, cb) {
      var dialog = largeMsgConfirmMsgNode.cloneNode(true);
      // TODO: If UX designers want the size included in the warning
      // message, add it here.
      ConfirmDialog.show(dialog,
        { // Confirm
          id: 'msg-large-message-ok',
          handler: function() { cb(true); }
        },
        { // Cancel
          id: 'msg-large-message-cancel',
          handler: function() { cb(false); }
        }
      );
    },

    onMoveMessages: function() {
      // TODO: Batch move back-end mail api is not ready now.
      //       Please verify this function when api landed.

      cards.folderSelector(function(folder) {
        var op = model.api.moveMessages(this.selectedMessages, folder);
        toaster.toastOperation(op);
        this.setEditMode(false);
      }.bind(this), function(folder) {
        return folder.isValidMoveTarget;
      });


    },

    _folderChanged: function(folder) {
      // It is possible that the notification of latest folder is fired
      // but in the meantime the foldersSlice could be cleared due to
      // a change in the current account, before this listener is called.
      // So skip this work if no foldersSlice, this method will be called
      // again soon.
      if (!model.foldersSlice) {
        return;
      }

      // Folder could have changed because account changed. Make sure
      // the cacheableFolderId is still set correctly.
      var inboxFolder = model.foldersSlice.getFirstFolderWithType('inbox');
      this.cacheableFolderId =
                             model.account === model.acctsSlice.defaultAccount ?
                            inboxFolder.id : null;

      this.folder = folder;

      if (this.mode == 'nonsearch') {
        if (this.showFolder(folder)) {
          this._hideSearchBoxByScrolling();
        }
      } else {
        this.showSearch('', 'all');
      }
    },

    die: function() {
      this.sliceEvents.forEach(function(type) {
        var name = 'messages_' + type;
        headerCursor.removeListener(name, this[name]);
      }.bind(this));

      evt.removeListener('folderPickerClosing', this.onFolderPickerClosing);

      model.removeListener('folder', this._folderChanged);
      model.removeListener('newInboxMessages', this.onNewMail);
      model.removeListener('foldersSliceOnChange', this.onFoldersSliceChange);
      headerCursor.removeListener('currentMessage', this.onCurrentMessage);

      this.vScroll.destroy();
    }
  }
];
});
