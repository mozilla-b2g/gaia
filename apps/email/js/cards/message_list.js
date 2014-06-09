/*jshint browser: true */
/*global define, console */
'use strict';

define(function(require) {

var templateNode = require('tmpl!./message_list.html'),
    msgHeaderItemNode = require('tmpl!./msg/header_item.html'),
    deleteConfirmMsgNode = require('tmpl!./msg/delete_confirm.html'),
    largeMsgConfirmMsgNode = require('tmpl!./msg/large_message_confirm.html'),
    common = require('mail_common'),
    date = require('date'),
    evt = require('evt'),
    model = require('model'),
    headerCursor = require('header_cursor').cursor,
    htmlCache = require('html_cache'),
    MessageListTopbar = require('message_list_topbar'),
    mozL10n = require('l10n!'),
    VScroll = require('vscroll'),
    Cards = common.Cards,
    Toaster = common.Toaster,
    ConfirmDialog = common.ConfirmDialog,
    batchAddClass = common.batchAddClass,
    bindContainerHandler = common.bindContainerHandler,
    appendMatchItemTo = common.appendMatchItemTo,
    displaySubject = common.displaySubject,
    prettyDate = common.prettyDate,
    accessibilityHelper = require('shared/js/accessibility_helper');

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
  'subject': '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' +
             '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583' +
             '\u2583\u2583\u2583\u2583\u2583\u2583\u2583\u2583'
};

// We will display this loading data for any messages we are
// pretending exist so that the UI has a reason to poke the search
// slice to do more work.
var defaultSearchVScrollData = {
  header: defaultVScrollData,
  matches: [],
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
function MessageListCard(domNode, mode, args) {
  this.domNode = domNode;
  this.mode = mode;
  this.headerMenuNode = this.domNode.querySelector('menu[type="toolbar"]');
  this.scrollNode = domNode.getElementsByClassName('msg-list-scrollouter')[0];

  if (mode === 'nonsearch') {
    batchAddClass(domNode, 'msg-search-only', 'collapsed');
  } else {
    batchAddClass(domNode, 'msg-nonsearch-only', 'collapsed');
  }

  this.messagesContainer =
    domNode.getElementsByClassName('msg-messages-container')[0];
  bindContainerHandler(this.messagesContainer, 'click',
                       this.onClickMessage.bind(this));

  this.messageEmptyContainer =
    domNode.getElementsByClassName('msg-list-empty-container')[0];

  this.scrollContainer =
    domNode.getElementsByClassName('msg-list-scrollouter')[0];

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

  // search bar, non-edit mode
  this.searchBar =
                 this.domNode.getElementsByClassName('msg-search-tease-bar')[0];

  // - toolbar: non-edit mode
  this.toolbar = {};
  this.toolbar.lastSyncedAtNode = domNode
                            .getElementsByClassName('msg-last-synced-value')[0];
  this.toolbar.lastSyncedLabel = domNode
                            .getElementsByClassName('msg-last-synced-label')[0];
  this._needsSizeLastSync = true;
  this.updateLastSynced();
  this.toolbar.editBtn = domNode.getElementsByClassName('msg-edit-btn')[0];
  this.toolbar.editBtn
    .addEventListener('click', this.setEditMode.bind(this, true), false);
  this.toolbar.refreshBtn =
    domNode.getElementsByClassName('msg-refresh-btn')[0];
  this.toolbar.refreshBtn
    .addEventListener('click', this.onRefresh.bind(this), false);

  // - header buttons: edit mode
  domNode.getElementsByClassName('msg-listedit-cancel-btn')[0]
    .addEventListener('click', this.setEditMode.bind(this, false), false);

  // - toolbar: edit mode
  domNode.getElementsByClassName('msg-star-btn')[0]
    .addEventListener('click', this.onStarMessages.bind(this, true), false);
  domNode.getElementsByClassName('msg-mark-read-btn')[0]
    .addEventListener('click', this.onMarkMessagesRead.bind(this, true), false);
  domNode.getElementsByClassName('msg-delete-btn')[0]
    .addEventListener('click', this.onDeleteMessages.bind(this, true), false);
  this.toolbar.moveBtn = domNode.getElementsByClassName('msg-move-btn')[0];
  this.toolbar.moveBtn
    .addEventListener('click', this.onMoveMessages.bind(this, true), false);

  // -- non-search mode
  if (mode === 'nonsearch') {
    // - search teaser bar
    // Focusing the teaser bar's text field is the same as hitting the search
    // button.
    domNode.getElementsByClassName('msg-search-text-tease')[0]
      .addEventListener('focus', this.onSearchButton.bind(this), false);
  }
  // -- search mode
  else if (mode === 'search') {
    domNode.getElementsByClassName('msg-search-cancel')[0]
      .addEventListener('click', this.onCancelSearch.bind(this), false);

    bindContainerHandler(
      domNode.getElementsByClassName('filter')[0],
      'click', this.onSearchFilterClick.bind(this));
    this.searchFilterTabs = domNode.querySelectorAll('.filter [role="tab"]');
    this.searchInput = domNode.getElementsByClassName('msg-search-text')[0];
    this.searchInput.addEventListener(
      'input', this.onSearchTextChange.bind(this), false);
  }

  this.editMode = false;
  this.selectedMessages = null;

  this.curFolder = null;
  this.isIncomingFolder = true;

  this.usingCachedNode = !!args.cachedNode;


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

  // We need to wait for the slice to complete before we can issue any sensible
  // growth requests.
  this.waitingOnChunk = true;
  this.desiredHighAbsoluteIndex = 0;
  this._needVScrollData = false;
  this.vScroll = new VScroll(
    this.messagesContainer,
    this.scrollNode,
    msgHeaderItemNode,
    (this.mode === 'nonsearch' ? defaultVScrollData : defaultSearchVScrollData)
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
    var items = headerCursor.messagesSlice && headerCursor.messagesSlice.items,
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

  this._hideSearchBoxByScrolling = this._hideSearchBoxByScrolling.bind(this);
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
    var items = headerCursor.messagesSlice && headerCursor.messagesSlice.items;
    if (items && items.length) {
      this.messages_splice(0, 0, items);
      this.messages_complete(0);
    }
  }
}
MessageListCard.prototype = {
  /**
   * How many milliseconds since our last progress update event before we put
   * the progressbar in the indeterminate "candybar" state?
   *
   * This value is currently arbitrarily chosen by asuth to try and avoid us
   * flipping back and forth from non-candybar state to candybar state
   * frequently.  This should be updated with UX or VD feedback.
   */
  PROGRESS_CANDYBAR_TIMEOUT_MS: 2000,

  /**
   * @type {MessageListTopbar}
   * @private
   */
  _topbar: null,

  /**
   * Cache the distance between messages since rows are effectively fixed
   * height.
   */
  _distanceBetweenMessages: 0,

  sliceEvents: ['splice', 'change', 'status', 'complete'],

  postInsert: function() {
    this._hideSearchBoxByScrolling();

    // Now that _hideSearchBoxByScrolling has activated the display
    // of the search box, get the height of the search box and tell
    // vScroll about it, but only do this once the DOM is displayed
    // so the ClientRect gives an actual height.
    this.vScroll.visibleOffset = this.searchBar.getBoundingClientRect().height;

    // For search we want to make sure that we capture the screen size prior to
    // focusing the input since the FxOS keyboard will resize our window to be
    // smaller which messes up our logic a bit.  We trigger metric gathering in
    // non-search cases too for consistency.
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

    Cards.pushCard(
      'message_list', 'search', 'animate',
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

    var i,
        domNode = this.domNode;

    // XXX the manual DOM play here is now a bit overkill; we should very
    // probably switch top having the CSS do this for us or at least invest
    // some time in cleanup.
    var normalHeader = domNode.getElementsByClassName('msg-list-header')[0],
        searchHeader = domNode.getElementsByClassName('msg-search-header')[0],
        editHeader = domNode.getElementsByClassName('msg-listedit-header')[0],
        normalToolbar =
          domNode.getElementsByClassName('msg-list-action-toolbar')[0],
        editToolbar =
          domNode.getElementsByClassName('msg-listedit-action-toolbar')[0];

    this.editMode = editMode;

    if (editMode) {
      normalHeader.classList.add('collapsed');
      searchHeader.classList.add('collapsed');
      normalToolbar.classList.add('collapsed');
      editHeader.classList.remove('collapsed');
      editToolbar.classList.remove('collapsed');
      this.messagesContainer.classList.add('show-edit');

      this.selectedMessages = [];
      var cbs = this.messagesContainer.querySelectorAll('input[type=checkbox]');
      for (i = 0; i < cbs.length; i++) {
        cbs[i].checked = false;
      }
      this.selectedMessagesUpdated();
    }
    else {
      if (this.mode === 'nonsearch') {
        normalHeader.classList.remove('collapsed');
      } else {
        searchHeader.classList.remove('collapsed');
      }
      normalToolbar.classList.remove('collapsed');
      editHeader.classList.add('collapsed');
      editToolbar.classList.add('collapsed');
      this.messagesContainer.classList.remove('show-edit');

      // (Do this based on the DOM nodes actually present; if the user has been
      // scrolling a lot, this.selectedMessages may contain messages that no
      // longer have a domNode around.)
      var selectedMsgNodes =
        domNode.getElementsByClassName('msg-header-item-selected');
      for (i = selectedMsgNodes.length - 1; i >= 0; i--) {
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
      mozL10n.get('message-multiedit-header',
                  { n: this.selectedMessages.length });

    var starBtn = this.domNode.getElementsByClassName('msg-star-btn')[0],
        readBtn = this.domNode.getElementsByClassName('msg-mark-read-btn')[0];

    // Enabling/disabling rules (not UX-signed-off):  Our bias is that people
    // want to star messages and mark messages unread (since it they naturally
    // end up unread), so unless messages are all in this state, we assume that
    // is the desired action.
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
    // Mark read if everything is unread, otherwise unread
    this.setAsRead = (this.selectedMessages.length && numRead === 0);

    if (!this.setAsStarred) {
      starBtn.classList.add('msg-btn-active');
    } else {
      starBtn.classList.remove('msg-btn-active');
    }

    if (this.setAsRead) {
      readBtn.classList.add('msg-btn-active');
    } else {
      readBtn.classList.remove('msg-btn-active');
    }
  },

  _hideSearchBoxByScrolling: function() {
    // scroll the search bit out of the way
    var searchBar = this.searchBar,
        scrollNode = this.scrollNode;

    // Search bar could have been collapsed with a cache load,
    // make sure it is visible, but if so, adjust the scroll
    // position in case the user has scrolled before this code
    // runs.
    if (searchBar.classList.contains('collapsed')) {
      searchBar.classList.remove('collapsed');
      scrollNode.scrollTop += searchBar.offsetHeight;
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
    if (scrollNode.scrollTop === 0) {
      scrollNode.scrollTop = searchBar.offsetHeight;
    }
  },

  onShowFolders: function() {
    Cards.pushCard('folder_picker', 'default', 'immediate', {
      onPushed: function() {
        this.headerMenuNode.classList.add('transparent');
      }.bind(this)
    });
  },

  onCompose: function() {
    Cards.pushCard('compose', 'default', 'animate');
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
    if (this._needsSizeLastSync && this.toolbar.lastSyncedLabel.scrollWidth) {
      var label = this.toolbar.lastSyncedLabel;
      var overHalf = label.scrollWidth > label.parentNode.clientWidth / 2;
      label.parentNode.classList[(overHalf ? 'add' : 'remove')]('long');
      this._needsSizeLastSync = false;
    }
  },

  updateLastSynced: function(value) {
    var method = value ? 'remove' : 'add';
    this.toolbar.lastSyncedLabel.classList[method]('collapsed');
    date.setPrettyNodeDate(this.toolbar.lastSyncedAtNode, value);
    this.sizeLastSync();
  },

  onFoldersSliceChange: function(folder) {
    // Just care about updating the last sync time
    if (folder === this.curFolder) {
      this.updateLastSynced(folder.lastSyncedAt);
    }
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
      case 'sent':
        this.isIncomingFolder = false;
        break;
      default:
        this.isIncomingFolder = true;
        break;
    }

    this.domNode.getElementsByClassName('msg-list-header-folder-label')[0]
      .textContent = folder.name;

    this.hideEmptyLayout();

    // you can't refresh the localdrafts folder or move messages out of it.
    if (folder.type === 'localdrafts') {
      this.toolbar.refreshBtn.classList.add('collapsed');
      this.toolbar.moveBtn.classList.add('collapsed');
    }
    else {
      this.toolbar.refreshBtn.classList.remove('collapsed');
      this.toolbar.moveBtn.classList.remove('collapsed');
    }

    this.updateLastSynced(folder.lastSyncedAt);

    if (forceNewSlice) {
      // We are creating a new slice, so any pending snippet requests are moot.
      this._snippetRequestPending = false;
      headerCursor.freshMessagesSlice();
    }

    return true;
  },

  showSearch: function(phrase, filter) {
    console.log('sf: showSearch. phrase:', phrase, phrase.length);

    this.curFolder = model.folder;
    this.vScroll.clearDisplay();
    this.curPhrase = phrase;
    this.curFilter = filter;

    if (phrase.length < 1) {
      return false;
    }

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

  onCancelSearch: function(event) {
    try {
      headerCursor.endSearch();
    }
    catch (ex) {
      console.error('problem killing slice:', ex, '\n', ex.stack);
    }
    Cards.removeCardAndSuccessors(this.domNode, 'animate');
  },

  onGetMoreMessages: function() {
    if (!headerCursor.messagesSlice) {
      return;
    }

    headerCursor.messagesSlice.requestGrowth(1, true);
  },

  // The funny name because it is auto-bound as a listener for
  // messagesSlice events in headerCursor using a naming convention.
  messages_status: function(newStatus) {
    if (headerCursor.searchMode !== this.mode) {
      return;
    }

    if (newStatus === 'synchronizing' ||
       newStatus === 'syncblocked') {
        this.syncingNode.classList.remove('collapsed');
        this.syncMoreNode.classList.add('collapsed');
        this.hideEmptyLayout();

        this.toolbar.refreshBtn.dataset.state = 'synchronizing';
    } else if (newStatus === 'syncfailed' ||
               newStatus === 'synced') {
      if (newStatus === 'syncfailed') {
        // If there was a problem talking to the server, notify the user and
        // provide a means to attempt to talk to the server again.  We have made
        // onRefresh pretty clever, so it can do all the legwork on
        // accomplishing this goal.
        Toaster.logRetryable(newStatus, this.onRefresh.bind(this));
      }
      this.toolbar.refreshBtn.dataset.state = 'synchronized';
      this.syncingNode.classList.add('collapsed');
    }
  },

  /**
   * Hide buttons that are not appropriate if we have no messages and display
   * the appropriate l10n string in the message list proper.
   */
  showEmptyLayout: function() {
    var text = this.domNode.
      getElementsByClassName('msg-list-empty-message-text')[0];

    this._clearCachedMessages();

    text.textContent = this.mode == 'search' ?
      mozL10n.get('messages-search-empty') :
      mozL10n.get('messages-folder-empty');
    this.messageEmptyContainer.classList.remove('collapsed');
    this.toolbar.editBtn.classList.add('disabled');
    this._hideSearchBoxByScrolling();
  },
  /**
   * Show buttons we hid in `showEmptyLayout` and hide the "empty folder"
   * message.
   */
  hideEmptyLayout: function() {
    this.messageEmptyContainer.classList.add('collapsed');
    this.toolbar.editBtn.classList.remove('disabled');
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
    if (headerCursor.messagesSlice.userCanGrowDownwards) {
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
    // messages existing, but it's also possible to happen in synchronizations.
    //
    // XXX Our total correctness currently depends on headerCount only changing
    // as a result of a synchronization triggered by this slice.  This does not
    // hold up when confronted with periodic background sync; we need to finish
    // cleanup up the headerCount change notification stuff.
    //
    // (However, this is acceptable glitchage right now.  We just need to make
    // sure it doesn't happen for searches since it's so blatant.)
    //
    // So, anyways, use updateDataBind() to cause VScroll to double-check that
    // our list size didn't change from what it thought it was.  (It renders
    // coordinate-space predictively based on our headerCount, but we currently
    // only provide strong correctness guarantees for actually reported `items`,
    // so we must do this.)  If our list size is the same, this call is
    // effectively a no-op.
    this.vScroll.updateDataBind(0, [], 0);
  },

  onNewMail: function(newEmailCount) {
    var inboxFolder = model.foldersSlice.getFirstFolderWithType('inbox');

    if (inboxFolder.id === this.curFolder.id &&
        newEmailCount && newEmailCount > 0) {
      if (!Cards.isVisible(this)) {
        this._whenVisible = this.onNewMail.bind(this, newEmailCount);
        return;
      }

      // Decorate or update the little notification bar that tells the user
      // how many new emails they've received after a sync.
      if (this._topbar && this._topbar.getElement() !== null) {
        // Update the existing status bar.
        this._topbar.updateNewEmailCount(newEmailCount);
      } else {
        this._topbar = new MessageListTopbar(
            this.scrollContainer, newEmailCount);

        var el =
            document.getElementsByClassName(MessageListTopbar.CLASS_NAME)[0];
        this._topbar.decorate(el);
        this._topbar.render();
      }
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
    if (Cards.isVisible(this) && !this._hasSnippetRequest()) {
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
    // snippets because we wait until the last batch finishes... To prevent that
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

    var cacheNode = this.domNode.cloneNode(true);

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
    removableCacheNode = cacheNode
                           .querySelector('.' + MessageListTopbar.CLASS_NAME);
    if (removableCacheNode) {
      removableCacheNode.classList.add('collapsed');
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

  // The funny name because it is auto-bound as a listener for
  // messagesSlice events in headerCursor using a naming convention.
  onMessagesChange: function(message, index) {
    this.updateMessageDom(false, message);

    // Since the DOM change, cache may need to change.
    this._considerCacheDom(index);
  },

  _updatePeepDom: function(peep) {
    peep.element.textContent = peep.name || peep.address;
  },

  /**
   * Update the state of the given DOM node.  Note that DOM nodes are reused so
   * although you can depend on `firstTime` to be accurate, you must ensure that
   * this method cleans up any dirty state resulting from any possible prior
   * operation of this method.
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
    var classAction = message.isPlaceholderData ? 'add': 'remove';
    msgNode.classList[classAction](this.vScroll.itemDefaultDataClass);

    // ID is stored as a data- attribute so that it can survive
    // serialization to HTML for storing in the HTML cache, and
    // be usable before the actual data from the backend has
    // loaded, as clicks to the message list are allowed before
    // the back end is available. For this reason, click
    // handlers should use dataset.id when wanting the ID.
    msgNode.dataset.id = message.id;

    // some things only need to be done once
    var dateNode = msgNode.getElementsByClassName('msg-header-date')[0];
    var subjectNode = msgNode.getElementsByClassName('msg-header-subject')[0];
    var snippetNode = msgNode.getElementsByClassName('msg-header-snippet')[0];
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
        msgNode.getElementsByClassName('msg-header-author')[0];
      listPerson.onchange = this._updatePeepDom;
      listPerson.onchange(listPerson);
      // date
      var dateTime = message.date.valueOf();
      dateNode.dataset.time = dateTime;
      dateNode.textContent = dateTime ? prettyDate(message.date) : '';
      // subject
      displaySubject(msgNode.getElementsByClassName('msg-header-subject')[0],
                     message);

      // attachments (can't change within a message but can change between
      // messages, and since we reuse DOM nodes...)
      var attachmentsNode =
        msgNode.getElementsByClassName('msg-header-attachments')[0];
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
    var starNode = msgNode.getElementsByClassName('msg-header-star')[0];
    starNode.classList.toggle('msg-header-star-starred', message.isStarred);
    // subject needs to give space for star if it is visible
    subjectNode.classList.toggle('icon-short', message.isStarred);

    // edit mode select state
    if (this.editMode) {
      var checkbox = msgNode.querySelector('input[type=checkbox]');
      checkbox.checked = this.selectedMessages.indexOf(message) !== -1;
    }
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
    var classAction = message.isPlaceholderData ? 'add': 'remove';
    msgNode.classList[classAction](this.vScroll.itemDefaultDataClass);

    // Even though updateMatchedMessageDom is only used in searches,
    // which likely will not be cached, the dataset.is is set to
    // maintain parity withe updateMessageDom and so click handlers
    // can always just use the dataset property.
    msgNode.dataset.id = matchedHeader.id;

    // some things only need to be done once
    var dateNode = msgNode.getElementsByClassName('msg-header-date')[0];
    var subjectNode = msgNode.getElementsByClassName('msg-header-subject')[0];
    if (firstTime) {
      // author
      var authorNode = msgNode.getElementsByClassName('msg-header-author')[0];
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
      dateNode.textContent = prettyDate(message.date);

      // subject
      if (matches.subject) {
        subjectNode.textContent = '';
        appendMatchItemTo(matches.subject[0], subjectNode);
      } else {
        displaySubject(subjectNode, message);
      }

      // snippet
      var snippetNode = msgNode.getElementsByClassName('msg-header-snippet')[0];
      if (matches.body) {
        snippetNode.textContent = '';
        appendMatchItemTo(matches.body[0], snippetNode);
      } else {
        snippetNode.textContent = message.snippet;
      }

      // attachments (can't change within a message but can change between
      // messages, and since we reuse DOM nodes...)
      var attachmentsNode =
        msgNode.getElementsByClassName('msg-header-attachments')[0];
      attachmentsNode.classList.toggle('msg-header-attachments-yes',
                                       message.hasAttachments);
      // snippet needs to be shorter if icon is shown
      snippetNode.classList.toggle('icon-short', message.hasAttachments);
    }

    // unread (we use very specific classes directly on the nodes rather than
    // child selectors for hypothetical speed)
    var unreadNode =
      msgNode.getElementsByClassName('msg-header-unread-section')[0];
    unreadNode.classList.toggle('msg-header-unread-section-unread',
                                !message.isRead);
    dateNode.classList.toggle('msg-header-date-unread', !message.isRead);

    // star
    var starNode = msgNode.getElementsByClassName('msg-header-star')[0];
    starNode.classList.toggle('msg-header-star-starred', message.isStarred);
    // subject needs to give space for star if it is visible
    subjectNode.classList.toggle('icon-short', message.isStarred);

    // edit mode select state
    if (this.editMode) {
      var checkbox = msgNode.querySelector('input[type=checkbox]');
      checkbox.checked = this.selectedMessages.indexOf(message) !== -1;
    }
  },

  /**
   * Called when the folder picker is animating to close. Need to
   * listen for it so this card can animate fading in the header menu.
   */
  onFolderPickerClosing: function() {
    this.headerMenuNode.classList.remove('transparent');
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
    // background behind the compose/reader card, let it know it is visible now
    // in case it needs to finish initializing and initial display.
    this.vScroll.nowVisible();

    // On first construction, or if done in background,
    // this card would not be visible to do the last sync
    // sizing so be sure to check it now.
    this.sizeLastSync();
  },

  onClickMessage: function(messageNode, event) {
    var header = messageNode.message;

    // Skip nodes that are default/placeholder ones.
    if (header && header.isPlaceholderData) {
      return;
    }

    if (this.editMode) {
      var idx = this.selectedMessages.indexOf(header);
      var cb = messageNode.querySelector('input[type=checkbox]');
      if (idx !== -1) {
        this.selectedMessages.splice(idx, 1);
        cb.checked = false;
      }
      else {
        this.selectedMessages.push(header);
        cb.checked = true;
      }
      this.selectedMessagesUpdated();
      return;
    }

    if (this.curFolder && this.curFolder.type === 'localdrafts') {
      var composer = header.editAsDraft(function() {
        Cards.pushCard('compose', 'default', 'animate',
                       { composer: composer });
      });
      return;
    }

    function pushMessageCard() {
      Cards.pushCard(
        'message_reader', 'default', 'animate',
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
   * @param {header_cursor.CurrentMessage} currentMessage representation of the
   *     email we're currently reading.
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

  onRefresh: function() {
    if (!headerCursor.messagesSlice) {
      return;
    }

    switch (headerCursor.messagesSlice.status) {
      // If we're still synchronizing, then the user is not well served by
      // queueing a refresh yet, let's just squash this.
      case 'new':
      case 'synchronizing':
        break;
      // If we fully synchronized, then yes, let us refresh.
      case 'synced':
        headerCursor.messagesSlice.refresh();
        break;
      // If we failed to talk to the server, then let's only do a refresh if we
      // know about any messages.  Otherwise let's just create a new slice by
      // forcing reentry into the folder.
      case 'syncfailed':
        if (headerCursor.messagesSlice.items.length) {
          headerCursor.messagesSlice.refresh();
        } else {
          this.showFolder(this.curFolder, /* force new slice */ true);
        }
        break;
    }
  },

  onStarMessages: function() {
    var op = model.api.markMessagesStarred(this.selectedMessages,
                                         this.setAsStarred);
    this.setEditMode(false);
    Toaster.logMutation(op);
  },

  onMarkMessagesRead: function() {
    var op = model.api.markMessagesRead(this.selectedMessages, this.setAsRead);
    this.setEditMode(false);
    Toaster.logMutation(op);
  },

  onDeleteMessages: function() {
    // TODO: Batch delete back-end mail api is not ready for IMAP now.
    //       Please verify this function under IMAP when api completed.

    if (this.selectedMessages.length === 0) {
      return this.setEditMode(false);
    }

    var dialog = deleteConfirmMsgNode.cloneNode(true);
    var content = dialog.getElementsByTagName('p')[0];
    content.textContent = mozL10n.get('message-multiedit-delete-confirm',
                                      { n: this.selectedMessages.length });
    ConfirmDialog.show(dialog,
      { // Confirm
        id: 'msg-delete-ok',
        handler: function() {
          var op = model.api.deleteMessages(this.selectedMessages);
          Toaster.logMutation(op);
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
    Cards.folderSelector(function(folder) {
      var op = model.api.moveMessages(this.selectedMessages, folder);
      Toaster.logMutation(op);
      this.setEditMode(false);
    }.bind(this));
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
    this.cacheableFolderId = model.account === model.acctsSlice.defaultAccount ?
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
};

Cards.defineCard({
  name: 'message_list',
  modes: {
    nonsearch: {
      tray: false
    },
    search: {
      tray: false
    }
  },
  constructor: MessageListCard,
  templateNode: templateNode
});

return MessageListCard;
});
