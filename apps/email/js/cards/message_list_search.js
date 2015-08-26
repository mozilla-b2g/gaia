'use strict';

define(function(require, exports) {

var accessibilityHelper = require('shared/js/accessibility_helper'),
    cards = require('cards'),
    containerListen = require('container_listen'),
    date = require('date'),
    HeaderCursor = require('header_cursor'),
    messageDisplay = require('message_display'),
    MessageListTopBar = require('message_list_topbar'),
    updatePeepDom = require('./lst/peep_dom').update;

// We will display this loading data for any messages we are
// pretending exist so that the UI has a reason to poke the search
// slice to do more work.
var defaultSearchVScrollData = {
  header: require('./lst/default_vscroll_data'),
  matches: []
};

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


return [
  require('./base_card')(require('template!./message_list_search.html')),
  require('./lst/edit_controller'),
  require('./lst/msg_click'),

  {

    createdCallback: function() {
      containerListen(this.querySelector('.filter'), 'click',
                      this.onSearchFilterClick.bind(this));
      this.searchFilterTabs = this.querySelectorAll('.filter [role="tab"]');

      this.isFirstTimeVisible = true;

      // Binding "this" to some functions as they are used for event listeners.
      this._folderChanged = this._folderChanged.bind(this);

      this.msgVScroll.on('emptyLayoutShown', function() {
        this.editBtn.disabled = true;
      }.bind(this));

      this.msgVScroll.on('emptyLayoutHidden', function() {
        this.editBtn.disabled = false;
      }.bind(this));

      this.msgVScroll.on('messagesChange', function(message, index) {
        this.updateMatchedMessageDom(false, message);
      }.bind(this));

      this.msgVScroll.on('messagesComplete', function(newEmailCount) {
        // Search does not trigger normal conditions for a folder changed,
        // so if vScroll is missing its data, set it up now.
        if (!this.msgVScroll.vScroll.list) {
          this.msgVScroll.vScroll.setData(this.msgVScroll.listFunc);
        }
      }.bind(this));

      var vScrollBindData = (function bindSearch(model, node) {
        model.element = node;
        node.message = model.header;
        this.updateMatchedMessageDom(true, model);
      }).bind(this);
      this.msgVScroll.init(this.scrollContainer,
                           vScrollBindData,
                           defaultSearchVScrollData);

      this._topBar = new MessageListTopBar(
        this.querySelector('.message-list-topbar')
      );
      this._topBar.bindToElements(this.scrollContainer,
                                  this.msgVScroll.vScroll);
    },

    onArgs: function(args) {
      var model = this.model = args.model;
      var headerCursor = this.headerCursor = args.headerCursor ||
                                             new HeaderCursor(model);
      this.msgVScroll.setHeaderCursor(headerCursor);

      model.latest('folder', this._folderChanged);

    },

    onCardVisible: function() {
      // First time this card is visible, want the search field focused if this
      // is a search. Do not want to do it on every cardVisible, as the user
      // could be scrolled/have their own place in the search results, and are
      // likely going back and forth between this card and message_reader.
      if (this.isFirstTimeVisible) {
        this.searchInput.focus();
      }

      this.msgVScroll.vScroll.nowVisible();

      this.isFirstTimeVisible = false;
    },


    showSearch: function(phrase, filter) {
      console.log('sf: showSearch. phrase:', phrase, phrase.length);

      this.curFolder = this.model.folder;
      this.editModeEnabled = true;
      this.msgVScroll.vScroll.clearDisplay();
      this.curPhrase = phrase;
      this.curFilter = filter;

      // We are creating a new slice, so any pending snippet requests are moot.
      this.msgVScroll._snippetRequestPending = false;
      // Don't bother the new slice with requests until we hears it completion
      // event.
      this.msgVScroll.waitingOnChunk = true;
      this.headerCursor.startSearch(phrase, {
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
        this.headerCursor.endSearch();
      }
      catch (ex) {
        console.error('problem killing slice:', ex, '\n', ex.stack);
      }
      cards.removeCardAndSuccessors(this, 'animate');
    },

    onClearSearch: function() {
      this.showSearch('', this.curFilter);
    },

    /**
     * Called from edit_controller mixin when the edit mode has changed. Used to
     * allow classes mixing in edit_controller to update UI state based on edit
     * state.
     */
    editModeChanged: function(enabled) {
      if (enabled) {
        // Set status color to match the edit header.
        cards.setStatusColor(this.editHeader);
      } else {
        // Return the status color to match this card.
        cards.setStatusColor(this);
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
      var classAction = message.isPlaceholderData ? 'add' : 'remove';
      var defaultDataClass = this.msgVScroll.vScroll.itemDefaultDataClass;
      msgNode.classList[classAction](defaultDataClass);

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
          message.author.onchange = updatePeepDom;
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

      // edit mode select state, defined in lst/edit_controller
      this.updateDomSelectState(msgNode, message);
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

      this.curFolder = folder;

      this.showSearch('', 'all');
    },

    die: function() {
      this.msgVScroll.die();
      this.model.removeListener('folder', this._folderChanged);
    }
  }
];

});
