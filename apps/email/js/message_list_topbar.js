
/**
 * @fileoverview This file provides a MessageListTopbar which is
 *     a little notification bar that tells the user
 *     how many new emails they've received after a sync.
 */

define(['l10n!'], function(mozL10n) {
/**
 * @constructor
 * @param {Element} scrollContainer Element containing folder messages.
 * @param {number} newEmailCount The number of new messages we received.
 */
function MessageListTopbar(scrollContainer, newEmailCount) {
  this._scrollContainer = scrollContainer;
  this._newEmailCount = newEmailCount;
}


/**
 * @const {string}
 */
MessageListTopbar.CLASS_NAME = 'msg-list-topbar';


/**
 * Number of milliseconds after which the status bar should disappear.
 * @const {number}
 */
MessageListTopbar.DISAPPEARS_AFTER_MILLIS = 5000;


MessageListTopbar.prototype = {
  /**
   * @type {Element}
   * @private
   */
  _el: null,


  /**
   * @type {Element}
   * @private
   */
  _scrollContainer: null,


  /**
   * @type {number}
   * @private
   */
  _newEmailCount: 0,


  /**
   * Update the div with the correct new email count and
   * listen to it for mouse clicks.
   * @param {Element} el The div we'll decorate.
   */
  decorate: function(el) {
    // bind() creates a unique function object, so save a handle to
    // it in order to remove the listener later.
    this._clickHandler = this._onclick.bind(this);
    el.addEventListener('click', this._clickHandler);
    this._el = el;
    this.updateNewEmailCount();
    return this._el;
  },


  /**
   * Show our element and set a timer to destroy it after
   * DISAPPEARS_AFTER_MILLIS.
   */
  render: function() {
    this._el.classList.remove('collapsed');
    setTimeout(
        this.destroy.bind(this),
        MessageListTopbar.DISAPPEARS_AFTER_MILLIS
    );
  },


  /**
   * Release the element and any event listeners and cleanup our data.
   */
  destroy: function() {
    if (this._el) {
      this._el.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
      this._el.classList.add('collapsed');
      this._el.textContent = '';
      this._el = null;
    }
  },


  /**
   * @return {Element} Our underlying element.
   */
  getElement: function() {
    return this._el;
  },


  /**
   * @param {number} newEmailCount Optional number of new messages we received.
   */
  updateNewEmailCount: function(newEmailCount) {
    if (newEmailCount !== undefined) {
      this._newEmailCount += newEmailCount;
    }

    if (this._el !== null) {
      this._el.textContent =
          mozL10n.get('new-emails', { n: this._newEmailCount });
    }
  },


  /**
   * @type {Event} evt Some mouseclick event.
   */
  _onclick: function(evt) {
    this.destroy();

    var scrollTop = this._scrollContainer.scrollTop;
    var dest = this._getScrollDestination();
    if (scrollTop <= dest) {
      return;
    }

    this._scrollUp(this._scrollContainer, dest, 0, 50);
  },


  /**
   * Move the element up to the specified position over time by increments.
   * @param {Element} el Some element to scroll.
   * @param {number} dest The eventual scrollTop value.
   * @param {number} timeout How long to wait between each time.
   * @param {number} inc How far to scroll each time.
   * @private
   */
  _scrollUp: function(el, dest, timeout, inc) {
    var next = el.scrollTop - inc;
    if (dest >= next) {
      // This is the last scroll.
      el.scrollTop = dest;
      return;
    }

    el.scrollTop = next;
    setTimeout(this._scrollUp.bind(this, el, dest, timeout, inc), timeout);
  },


  /**
   * @return {number} The point where we should scroll to calculated from
   *     the search box height.
   * @private
   */
  _getScrollDestination: function() {
    var searchBar =
        document.getElementsByClassName('msg-search-tease-bar')[0];
    return searchBar.offsetHeight;
  }
};

return MessageListTopbar;
});

