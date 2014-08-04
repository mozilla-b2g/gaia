'use strict';
/**
 * @fileoverview This file provides a MessageListTopbar which is
 *     a little notification bar that tells the user
 *     how many new emails they've received after a sync.
 */

// TODO: this file is set up to be a web component, but needs more plumbing
// changes, tracked in bug 1005446, so that template! can be used instead of
// tmpl!, which does not find and wait for referenced web components.
// Once that other bug lands, this file can be changed to a web component by:
// * change `this.domNode` to just be `this`
// * use the commented out document.registerElement() call instead of the manual
// instance creation and passing of the domNode.

/**
 * This module handles the display of either "N new messages" or showing a
 * "jump to top" arrow if the user is scrolled down more than the
 * _thresholdMultiplier amounts of screens and the user starts scrolling up.
 *
 * New message notification takes priority over top arrow display, and CSS
 * animations are used to transition between the different states. Instances of
 * this module will rely on a VScroll instance and a scrollContainer to do their
 * work. The VScroll instance is used to know if the VScroll decided to change
 * the scroll position itself (vs. a user choice), and in that case the up arrow
 * is not shown. Also, if the user taps on either the top arrow or New Messages
 * indicator, VScroll will be told to jump to the top.
 *
 * The scrollContainer is used to track the scroll events, to know whether to
 * show the top arrow.
 *
 * The contents of the element used for an instance will contain either the top
 * arrow (via background image, and accessibility text) or the New Messages
 * text. CSS styles based on the data-state attribute trigger the styling.
 *
 * Possible states for an instance:
 * - '': hidden
 * - 'top': the top arrow is showing
 * - 'message': the New Messages indicator is showing.
 *
 */
define(function(require, exports, module) {
  var mozL10n = require('l10n!');

  var proto = {
    domNode: null,
    _scrollContainer: null,
    _vScroll: null,
    _delayedState: null,
    _newEmailCount: 0,
    _scrollTop: 0,
    _thresholdMultiplier: 2,

    visibleOffset: 0,

    createdCallback: function() {
      this.domNode.addEventListener('click', this._onClick.bind(this));
      this.domNode.addEventListener('transitionend',
                                    this._onTransitionEnd.bind(this));
      this._hideNewMessage = this._hideNewMessage.bind(this);
    },

    /**
     * Resets the passed in node to not have any styles or content so that it is
     * suitable for cookie cache storage. Modifies the node in place.
     * @param  {Node} node the cloned node of message_list_topbar type.
     */
    resetNodeForCache: function(node) {
      node.classList.remove('closing');
      node.textContent = '';
      node.dataset.state = '';
      this.domNode.style.left = '';
    },

    bindToElements: function(scrollContainer, vScroll) {
      this._scrollContainer = scrollContainer;
      this._scrollContainer.addEventListener('scroll',
                                             this._onScroll.bind(this));
      this._scrollTop = this._scrollContainer.scrollTop;
      this._vScroll = vScroll;
    },

    /**
     * Main method called by consumers of this module. Will display
     * @param  {[type]} newEmailCount [description]
     * @return {[type]}               [description]
     */
    showNewEmailCount: function(newEmailCount) {
      // If already at the top, do not show the new message.
      if (this._scrollTop <= this.visibleOffset) {
        return;
      }

      this._newEmailCount = newEmailCount;
      this._showState('message');
    },

    _getState: function() {
      return this.domNode.dataset.state;
    },

    _showState: function(state) {
      var nodeState = this._getState();
      if (nodeState === state) {
        return;
      } else if (!nodeState || !state) {
        this._animateState(state);
      } else if (nodeState !== state &&
                // Favor message display to top display.
                (nodeState !== 'message' || state !== 'top')) {
        // Transition away from old state, then set the new one.
        this._delayedState = state;
        if (!this._animating) {
          this._animateState('');
        }
      }
    },

    _animateState: function(state) {
      this._animating = true;
      if (!state && this._getState()) {
        this.domNode.classList.add('closing');
      } else {
        if (state === 'message') {
          mozL10n.setAttributes(this.domNode, 'new-emails',
                                { n: this._newEmailCount });

          // Get the node width to correctly center the contents. Since l10n and
          // number of messages can change this value, do it after each content
          // set.
          var nodeWidth = this.domNode.getBoundingClientRect().width;
          this.domNode.style.left = 'calc(50% - ' + nodeWidth + 'px)';

          setTimeout(this._hideNewMessage, 5000);
        } else if (state === 'top') {
          // Update content to be an accessibility friendly string.
          this.domNode.textContent = mozL10n.get('message-list-top-action');
        }

        this.domNode.dataset.state = state;
      }
    },

    _onTransitionEnd: function(evt) {
      this._animating = false;

      if (this.domNode.classList.contains('closing')) {
        this.domNode.classList.remove('closing');
        this.domNode.dataset.state = '';
        this.domNode.style.left = '';
      }

      if (this._delayedState) {
        this._animateState(this._delayedState);
        this._delayedState = null;
      }
    },

    _onScroll: function(evt) {
      if (!this._topThreshold) {
        var rect = this._scrollContainer.getBoundingClientRect();
        this._topThreshold = rect.height * this._thresholdMultiplier;
        this.domNode.style.top = rect.top + 'px';
      }

      // If the vscroll component just recently set the scrollTop of its
      // container, then do not bother with detecting scroll and showing then
      // top action.
      if (this._vScroll.lastScrollTopSetTime &&
          (this._vScroll.lastScrollTopSetTime + 500 > Date.now())) {
        return;
      }

      var scrollTop = this._scrollContainer.scrollTop,
          scrollingDown = scrollTop > this._scrollTop,
          nodeState = this._getState();

      // Do not bother if scroll values are the same, nothing has changed.
      // Ideally the values would never be the same, but at least on the flame,
      // it was possible to get two sequential scroll events with the same
      // value.
      if (scrollTop !== this._scrollTop) {
        if (scrollTop <= this.visibleOffset) {
          this._showState('');
        } else if (scrollingDown && nodeState !== 'message') {
          this._showState('');
        } else if (nodeState !== 'top' && scrollTop > this._topThreshold) {
          this._showState('top');
        }
      }

      this._scrollTop = scrollTop;
    },

    _onClick: function(evt) {
      if (this._vScroll) {
        this._vScroll.jumpToIndex(0);
        this._showState('');
      }
    },

    _hideNewMessage: function() {
      if (this.domNode.dataset.state === 'message') {
        this._showState('');
      }
    }
  };

  // return document.registerElement(module.id.replace(/_/g, '-'), {
  //   prototype: proto
  // });

  function MessageListTopBar(domNode) {
    this.domNode = domNode;
    this.createdCallback();
  }

  MessageListTopBar.prototype = proto;

  return MessageListTopBar;
});
