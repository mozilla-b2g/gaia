'use strict';

define(function(require, exports) {

var cards = require('cards'),
    containerListen = require('container_listen'),
    mozL10n = require('l10n!'),
    msgHeaderItemNode = require('tmpl!../msg/header_item.html'),
    toaster = require('toaster'),
    VScroll = require('vscroll');

var sliceEvents = ['splice', 'change', 'status', 'complete'];

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
 * Component that shows a message-based vscroll. Assumes the following are set
 * on the this component before vscroll is active:
 * - headerCursor
 */
return [
  require('../base')(require('template!./msg_vscroll.html')),
  {
    createdCallback: function() {
      this.setAttribute('role', 'listbox');
      this.setAttribute('aria-multiselectable', 'true');

      mozL10n.setAttributes(this.messageEmptyText, this.dataset.emptyL10nId);

      containerListen(this.vScrollContainer, 'click',
                      this.onClickMessage.bind(this));
    },

    /**
     * Call this from the createdCallback of the module that wants to display
     * a message-based vscroll.
     */
    init: function(scrollContainer, bindData, defaultVScrollData) {
      this.scrollContainer = scrollContainer;

      // Set up the list data source for VScroll
      var listFunc = (function(index) {
         return this.headerCursor.messagesSlice.items[index];
      }.bind(this));

      listFunc.size = (function() {
        // This method could get called during VScroll updates triggered
        // by messages_splice. However at that point, the headerCount may
        // not be correct, like when fetching more messages from the
        // server. So approximate by using the size of slice.items.
        var slice = this.headerCursor.messagesSlice;
        // coerce headerCount to 0 if it was undefined to avoid a NaN
        return Math.max(slice.headerCount || 0, slice.items.length);
      }.bind(this));
      this.listFunc = listFunc;

      // We need to wait for the slice to complete before we can issue any
      // sensible growth requests.
      this.waitingOnChunk = true;
      this.desiredHighAbsoluteIndex = 0;
      this._needVScrollData = false;
      this.vScroll = new VScroll(
        this.vScrollContainer,
        this.scrollContainer,
        msgHeaderItemNode,
        defaultVScrollData
      );

      // Called by VScroll wants to bind some data to a node it wants to
      // display in the DOM.
      this.vScroll.bindData = bindData;

      // Called by VScroll when it detects it will need more data in the near
      // future. VScroll does not know if it already asked for this
      // information, so this function needs to be sure it actually needs to
      // ask for more from the back end.
      this.vScroll.prepareData = (function(highAbsoluteIndex) {
        var items = this.headerCursor.messagesSlice &&
                    this.headerCursor.messagesSlice.items,
            headerCount = this.headerCursor.messagesSlice.headerCount;

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
    },

    setHeaderCursor: function(headerCursor) {
      if (this.headerCursor) {
        throw new Error('headerCursor already set');
      }

      this.headerCursor = headerCursor;

      sliceEvents.forEach(function(type) {
        var name = 'messages_' + type;
        // Bind to local, but replace property name here so that removing the
        // listeners are easier in die().
        this[name] = this[name].bind(this);
        headerCursor.on(name, this[name]);
      }.bind(this));

      this.onCurrentMessage = this.onCurrentMessage.bind(this);
      headerCursor.on('currentMessage', this.onCurrentMessage);

      // Find the containing element that is a card, for use when asking if that
      // card is visible and extra work should be done.
      var parent = this;
      while((parent = parent.parentNode)) {
        if (parent.classList.contains('card')) {
          break;
        }
      }
      this.cardParent = parent;

      this._onVScrollStopped = this._onVScrollStopped.bind(this);
      this.vScroll.on('scrollStopped', this._onVScrollStopped);
    },

    /**
     * Used to remove the cached HTML from a cache restore of HTML. Do not use
     * this for clearing the display of messages when the list of messages
     * change, instead use methods on the vScroll object.
     */
    removeMessagesHtml: function() {
      this.vScrollContainer.innerHTML = '';
    },

    onClickMessage: function(node, event) {
      this.emitDomEvent('messageClick', node);
    },

    /**
     * Waits for scrolling to stop before fetching snippets.
     */
    _onVScrollStopped: function() {
      // Give any pending requests in the slice priority.
      if (!this.headerCursor.messagesSlice ||
          this.headerCursor.messagesSlice.pendingRequestCount) {
        return;
      }

      // Do not bother fetching snippets if this card is not in view.
      // The card could still have a scroll event triggered though
      // by the next/previous work done in message_reader.
      if (cards.isVisible(this.cardParent) && !this._hasSnippetRequest()) {
        this._requestSnippets();
      }
    },

    onGetMoreMessages: function() {
      if (!this.headerCursor.messagesSlice) {
        return;
      }

      // For accessibility purposes, focus on the first newly loaded item in the
      // messages list. This will ensure that screen reader's cursor position
      // will get updated to the right place.
      this.vScroll.once('recalculated', function(calledFromTop, refIndex) {
        // refIndex is the index of the first new message item.
        this.vScrollContainer.querySelector(
          '[data-index="' + refIndex + '"]').focus();
      }.bind(this));

      this.headerCursor.messagesSlice.requestGrowth(1, true);
    },

    isEmpty: function() {
      return this.headerCursor.messagesSlice.items.length === 0;
    },

    /**
     * Hide buttons that are not appropriate if we have no messages and display
     * the appropriate l10n string in the message list proper.
     */
    showEmptyLayout: function() {
      this.messageEmptyContainer.classList.remove('collapsed');
      this.emit('emptyLayoutShown');
    },
    /**
     * Show buttons we hid in `showEmptyLayout` and hide the "empty folder"
     * message.
     */
    hideEmptyLayout: function() {
      this.messageEmptyContainer.classList.add('collapsed');
      this.emit('emptyLayoutHidden');
    },

    // The funny name because it is auto-bound as a listener for
    // messagesSlice events in headerCursor using a naming convention.
    messages_status: function(newStatus) {
      var syncInProgress = true;
      if (newStatus === 'synchronizing' ||
         newStatus === 'syncblocked') {
          this.syncingNode.classList.remove('collapsed');
          this.syncMoreNode.classList.add('collapsed');
          this.hideEmptyLayout();
      } else if (newStatus === 'syncfailed' ||
                 newStatus === 'synced') {
        syncInProgress = false;
        if (newStatus === 'syncfailed') {
          // If there was a problem talking to the server, notify the user and
          // provide a means to attempt to talk to the server again.  We have
          // made onRefresh pretty clever, so it can do all the legwork on
          // accomplishing this goal.
          toaster.toast({
            text: mozL10n.get('toaster-retryable-syncfailed')
          });
        }
        this.syncingNode.classList.add('collapsed');
      }
      this.emit('syncInProgress', syncInProgress);
    },

    /**
     * @param {number=} newEmailCount Optional number of new messages.
     * The funny name because it is auto-bound as a listener for
     * messagesSlice events in headerCursor using a naming convention.
     */
    messages_complete: function(newEmailCount) {
      var headerCursor = this.headerCursor;

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

      this.emit('messagesComplete', newEmailCount);
    },

    // The funny name because it is auto-bound as a listener for
    // messagesSlice events in headerCursor using a naming convention.
    messages_splice: function(index, howMany, addedItems,
                              requested, moreExpected) {
      var headerCursor = this.headerCursor;

      // If no work to do, just skip it.
      if (index === 0 && howMany === 0 && !addedItems.length) {
        return;
      }

      this.emit('messagesSpliceStart', index, howMany, addedItems,
                                       requested, moreExpected);

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

      this.emit('messagesSpliceEnd', index, howMany, addedItems,
                                       requested, moreExpected);
    },

    // The funny name because it is auto-bound as a listener for
    // messagesSlice events in headerCursor using a naming convention.
    messages_change: function(message, index) {
      this.emit('messagesChange', message, index);
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
      var headerCursor = this.headerCursor;
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

    /**
     * Scroll to make sure that the current message is in our visible window.
     *
     * @param {header_cursor.CurrentMessage} currentMessage representation of
     *     the email we're currently reading.
     * @param {Number} index the index of the message in the messagesSlice
     */
    onCurrentMessage: function(currentMessage, index) {
      if (!currentMessage) {
        return;
      }

      var visibleIndices = this.vScroll.getVisibleIndexRange();
      if (visibleIndices &&
          (index < visibleIndices[0] || index > visibleIndices[1])) {
        this.vScroll.jumpToIndex(index);
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
      if (this._snippetRequestPending && beforeTimeout) {
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
      var headerCursor = this.headerCursor;
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

    die: function() {
      sliceEvents.forEach(function(type) {
        var name = 'messages_' + type;
        this.headerCursor.removeListener(name, this[name]);
      }.bind(this));

      this.headerCursor.removeListener('currentMessage', this.onCurrentMessage);
      this.vScroll.destroy();
    }
  }
];

});
