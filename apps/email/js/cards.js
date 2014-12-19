'use strict';
/*global startupCacheEventsSent */
define(function(require) {

var mozL10n = require('l10n!'),
    evt = require('evt'),
    toaster = require('toaster'),
    hookupInputAreaResetButtons = require('input_areas');

function addClass(domNode, name) {
  if (domNode) {
    domNode.classList.add(name);
  }
}

function removeClass(domNode, name) {
  if (domNode) {
    domNode.classList.remove(name);
  }
}

// XXX when a bigger rename can happen, remove the need
// to translate between custom element names and moz-style
// underbar naming, and consider the card- as part of the
// input names.
function translateCustomElementName(customElementName) {
  return customElementName.replace(/^cards-/, '').replace(/-/g, '_');
}

/**
 * Fairly simple card abstraction with support for simple horizontal animated
 * transitions.  We are cribbing from deuxdrop's mobile UI's cards.js
 * implementation created jrburke.
 */
var cards = {
  _cardDefs: {},

  /*
   * Existing cards, left-to-right, new cards getting pushed onto the right.
   */
  _cardStack: [],
  activeCardIndex: -1,
  /*
   * @oneof[null @listof[cardName modeName]]{
   *   If a lazy load is causing us to have to wait before we push a card, this
   *   is the type of card we are planning to push.  This is used by hasCard
   *   to avoid returning misleading answers while an async push is happening.
   * }
   */
  _pendingPush: null,

  /**
   * Cards can stack on top of each other, make sure the stacked set is
   * visible over the lower sets.
   */
  _zIndex: 0,

  /**
   * The DOM node that contains the _containerNode ("#cardContainer") and which
   * we inject popup and masking layers into.  The choice of doing the popup
   * stuff at this layer is arbitrary.
   */
  _rootNode: null,

  /**
   * The "#cardContainer" node which serves as the scroll container for the
   * contained _cardsNode ("#cards").  It is as wide as the viewport.
   */
  _containerNode: null,

  /**
   * The "#cards" node that holds the cards; it is as wide as all of the cards
   * it contains and has its left offset changed in order to change what card
   * is visible.
   */
  _cardsNode: null,

  /**
   * The DOM nodes that should be removed from their parent when our current
   * transition ends.
   */
  _animatingDeadDomNodes: [],

  /**
   * Tracks the number of transition events per card animation. Since each
   * animation ends up with two transitionend events since two cards are
   * moving, need to wait for the last one to be finished before doing
   * cleanup, like DOM removal.
   */
  _transitionCount: 0,

  /**
   * Tracks if startup events have been emitted. The events only need to be
   * emitted once.
   * @type {Boolean}
   */
  _startupEventsEmitted: false,

  /**
   * Is a popup visible, suggesting that any click that is not on the popup
   * should be taken as a desire to close the popup?  This is not a boolean,
   * but rather info on the active popup.
   */
  _popupActive: null,

  /**
   * Are we eating all click events we see until we transition to the next
   * card (possibly due to a call to pushCard that has not yet occurred?).
   * Set by calling `eatEventsUntilNextCard`.
   */
  _eatingEventsUntilNextCard: false,

  /**
   * Initialize and bind ourselves to the DOM which should now be fully loaded.
   */
  _init: function() {
    this._rootNode = document.body;
    this._containerNode = document.getElementById('cardContainer');
    this._cardsNode = document.getElementById('cards');

    this._statusColorMeta = document.querySelector('meta[name="theme-color"]');

    toaster.init(this._containerNode);

    this._containerNode.addEventListener('click',
                                         this._onMaybeIntercept.bind(this),
                                         true);

    // XXX be more platform detecty. or just add more events. unless the
    // prefixes are already gone with webkit and opera?
    this._cardsNode.addEventListener('transitionend',
                                     this._onTransitionEnd.bind(this),
                                     false);

    // Listen for visibility changes to let current card know of them too.
    // Do this here instead of each card needing to listen, and needing to know
    // if it is also the current card.
    document.addEventListener('visibilitychange', function(evt) {
      var card = this._cardStack[this.activeCardIndex];
      if (card && card.onCurrentCardDocumentVisibilityChange) {
        card.onCurrentCardDocumentVisibilityChange(document.hidden);
      }
    }.bind(this));
  },

  /**
   * If the tray is active and a click happens in the tray area, transition
   * back to the visible thing (which must be to our right currently.)
   */
  _onMaybeIntercept: function(event) {
    if (this._eatingEventsUntilNextCard) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    if (this._popupActive) {
      event.stopPropagation();
      event.preventDefault();
      this._popupActive.close();
      return;
    }

    // Find the card containing the event target.
    var cardNode = event.target;
    for (cardNode = event.target; cardNode; cardNode = cardNode.parentElement) {
      if (cardNode.classList.contains('card')) {
        break;
      }
    }
  },

  /**
   * Push a card onto the card-stack.
   */
  /* @args[
   *   @param[type]
   *   @param[showMethod @oneof[
   *     @case['animate']{
   *       Perform an animated scrolling transition.
   *     }
   *     @case['immediate']{
   *       Immediately warp to the card without animation.
   *     }
   *     @case['none']{
   *       Don't touch the view at all.
   *     }
   *   ]]
   *   @param[args Object]{
   *     An arguments object to provide to the card's constructor when
   *     instantiating.
   *   }
   *   @param[placement #:optional @oneof[
   *     @case[undefined]{
   *       The card gets pushed onto the end of the stack.
   *     }
   *     @case['left']{
   *       The card gets inserted to the left of the current card.
   *     }
   *     @case['right']{
   *       The card gets inserted to the right of the current card.
   *     }
   *   }
   * ]
   */
  pushCard: function(type, showMethod, args, placement) {
    var cardDef = this._cardDefs[type];

    args = args || {};

    if (!cardDef) {
      var cbArgs = Array.slice(arguments);
      this._pendingPush = [type];

      // Only eat clicks if the card will be visibly displayed.
      if (showMethod !== 'none') {
        this.eatEventsUntilNextCard();
      }

      require(['element!cards/' + type], function(Ctor) {
        this._cardDefs[type] = Ctor;
        this.pushCard.apply(this, cbArgs);
      }.bind(this));
      return;
    }

    this._pendingPush = null;

    console.log('pushCard for type: ' + type);

    var domNode = args.cachedNode || new cardDef();

    if (domNode.extraClasses) {
      domNode.classList.add.apply(domNode.classList, domNode.extraClasses);
    }
    if (args && domNode.onArgs) {
      domNode.onArgs(args);
    }
    domNode.classList.add('card');
    domNode.setAttribute('data-type', type);

    var cardIndex, insertBuddy;
    if (!placement) {
      cardIndex = this._cardStack.length;
      insertBuddy = null;
      domNode.classList.add(cardIndex === 0 ? 'before' : 'after');
    }
    else if (placement === 'left') {
      cardIndex = this.activeCardIndex++;
      insertBuddy = this._cardsNode.children[cardIndex];
      domNode.classList.add('before');
    }
    else if (placement === 'right') {
      cardIndex = this.activeCardIndex + 1;
      if (cardIndex >= this._cardStack.length) {
        insertBuddy = null;
      } else {
        insertBuddy = this._cardsNode.children[cardIndex];
      }
      domNode.classList.add('after');
    }
    this._cardStack.splice(cardIndex, 0, domNode);

    if (!args.cachedNode) {
      this._cardsNode.insertBefore(domNode, insertBuddy);
    }

    // If the card has any <button type="reset"> buttons,
    // make them clear the field they're next to and not the entire form.
    // See input_areas.js and shared/style/input_areas.css.
    hookupInputAreaResetButtons(domNode);

    // Only do auto font size watching for cards that do not have more
    // complicated needs, like message_list, which modifies children contents
    // that are not caught by the font_size_util.
    if (!domNode.callHeaderFontSize) {
      // We're appending new elements to DOM so to make sure headers are
      // properly resized and centered, we emit a lazyload event.
      // This will be removed when the gaia-header web component lands.
      window.dispatchEvent(new CustomEvent('lazyload', {
        detail: domNode
      }));
    }

    if ('postInsert' in domNode) {
      domNode.postInsert();
    }

    if (showMethod !== 'none') {
      // make sure the reflow sees the new node so that the animation
      // later is smooth.
      if (!args.cachedNode) {
        domNode.clientWidth;
      }

      this._showCard(cardIndex, showMethod, 'forward');
    }

    if (args.onPushed) {
      args.onPushed(domNode);
    }
  },

  /**
   * Pushes a new card if none exists, otherwise, uses existing
   * card and passes args to that card via tellCard. Arguments
   * are the same as pushCard.
   * @return {Boolean} true if card was pushed.
   */
  pushOrTellCard: function(type, showMethod, args, placement) {
    var query = type;
    if (this.hasCard(query)) {
      this.tellCard(query, args);
      return false;
    } else {
      this.pushCard.apply(this, Array.slice(arguments));
      return true;
    }
  },

  /**
   * Sets the status bar color. The element, or any of its children, can specify
   * the color by setting data-statuscolor to one of the following values:
   * - default: uses the default data-statuscolor set on the meta theme-color
   * tag is used.
   * - background: the CSS background color, via getComputedStyle, is used. This
   * is useful if the background that is desired is not the one from the element
   * itself, but from one of its children.
   * - a specific color value.
   *
   * If no data-statuscolor attribute is found, then the background color for
   * the element, via getComputedStyle, is used. If that value is not a valid
   * color value, then the default statuscolor on the meta tag is used.
   *
   * Note that this method uses getComputedStyle. This could be expensive
   * depending on when it is called. For the card infrastructure, since it is
   * done as part of a card transition, and done before the card transition code
   * applies transition styles, the target element should not be visible at the
   * time of the query. In practice no negligble end user effect has been seen,
   * and that query is much more desirable than hardcoding colors in JS or HTML.
   *
   * @param {Element} [element] the card element of interest. If no element is
   * passed, the the current card is used.
   */
  setStatusColor: function(element) {
    var color;
    // Some use cases, like dialogs, are outside the card stack, so they may
    // not know what element to use for a baseline. In those cases, Cards
    // decides the target element.
    if (!element) {
      element = this._cardStack[this.activeCardIndex];
    }

    // Try first for specific color override. Do a node query, since for custom
    // elements, the custom elment tag may not set its color, but the template
    // used inside the tag may.
    var statusElement = element.dataset.statuscolor ? element :
                        element.querySelector('[data-statuscolor]');

    if (statusElement) {
      color = statusElement.dataset.statuscolor;
      // Allow cards to just indicate they want the default.
      if (color === 'default') {
        color = null;
      } else if (color === 'background') {
        color = getComputedStyle(statusElement).backgroundColor;
      }
    } else {
      // Just use the background color of the original element.
      color = getComputedStyle(element).backgroundColor;
    }

    // Only use specific color values, not values like 'transparent'.
    if (color && color.indexOf('rgb') !== 0 && color.indexOf('#') !== 0) {
      color = null;
    }

    color = color || this._statusColorMeta.dataset.statuscolor;
    var existingColor = this._statusColorMeta.getAttribute('content');
    if (color !== existingColor) {
      this._statusColorMeta.setAttribute('content', color);
    }
  },

  _findCardUsingType: function(type) {
    for (var i = 0; i < this._cardStack.length; i++) {
      var domNode = this._cardStack[i];
      if (translateCustomElementName(this.cardName(domNode)) === type) {
        return i;
      }
    }
  },

  _findCard: function(query, skipFail) {
    var result;
    if (typeof query === 'string') {
      result = this._findCardUsingType(query, skipFail);
    } else if (typeof(query) === 'number') { // index number
      result = query;
    } else {
      // query is a DOM node in this case
      result = this._cardStack.indexOf(query);
    }

    if (result > -1) {
      return result;
    } else if (!skipFail) {
      throw new Error('Unable to find card with query:', query);
    } else {
      // Returning undefined explicitly so that index comparisons, like
      // the one in hasCard, are correct.
      return undefined;
    }
  },

  cardName: function(node) {
    return node.nodeName.toLowerCase();
  },

  hasCard: function(query) {
    if (this._pendingPush && this._pendingPush === query) {
      return true;
    }

    return this._findCard(query, true) > -1;
  },

  isVisible: function(domNode) {
    return !!(domNode &&
              domNode.classList.contains('center'));
  },

  findCardObject: function(query) {
    return this._cardStack[this._findCard(query)];
  },

  getCurrentCardType: function() {
    var result = null,
        card = this._cardStack[this.activeCardIndex];

    // Favor any _pendingPush value as it is about to
    // become current, just waiting on an async cycle
    // to finish. Otherwise use current card value.
    if (this._pendingPush) {
      result = this._pendingPush;
    } else if (card) {
      result = translateCustomElementName(this.cardName(card));
    }
    return result;
  },

  // Filter is an optional paramater. It is a function that returns
  // true if the folder passed to it should be included in the selector
  folderSelector: function(callback, filter) {
    var self = this;

    require(['model', 'value_selector'], function(model, ValueSelector) {
      // XXX: Unified folders will require us to make sure we get the folder
      //      list for the account the message originates from.
      if (!self.folderPrompt) {
        var selectorTitle = mozL10n.get('messages-folder-select');
        self.folderPrompt = new ValueSelector(selectorTitle);
      }

      model.latestOnce('foldersSlice', function(foldersSlice) {
        var folders = foldersSlice.items;
        folders.forEach(function(folder) {
          var isMatch = !filter || filter(folder);
          if (folder.neededForHierarchy || isMatch) {
            self.folderPrompt.addToList(folder.name, folder.depth,
              isMatch,
              function(folder) {
                return function() {
                  self.folderPrompt.hide();
                  callback(folder);
                };
              }(folder));
          }
        });
        self.folderPrompt.show();
      });
    });
  },

  moveToCard: function(query, showMethod) {
    this._showCard(this._findCard(query), showMethod || 'animate');
  },

  tellCard: function(query, what) {
    var cardIndex = this._findCard(query),
        domNode = this._cardStack[cardIndex];
    if (!('told' in domNode)) {
      console.warn('Tried to tell a card that\'s not listening!', query, what);
    } else {
      domNode.told(what);
    }
  },

  /**
   * Remove the card identified by its DOM node and all the cards to its right.
   * Pass null to remove all of the cards! If cardDomNode passed, but there
   * are no cards before it, cards.getDefaultCard is called to set up a before
   * card.
   */
  /* @args[
   *   @param[cardDomNode]{
   *     The DOM node that is the first card to remove; all of the cards to its
   *     right will also be removed.  If null is passed it is understood you
   *     want to remove all cards.
   *   }
   *   @param[showMethod @oneof[
   *     @case['animate']{
   *       Perform an animated scrolling transition.
   *     }
   *     @case['immediate']{
   *       Immediately warp to the card without animation.
   *     }
   *     @case['none']{
   *       Remove the nodes immediately, don't do anything about the view
   *       position.  You only want to do this if you are going to push one
   *       or more cards and the last card will use a transition of 'immediate'.
   *     }
   *   ]]
   *   @param[numCards #:optional Number]{
   *     The number of cards to remove.  If omitted, all the cards to the right
   *     of this card are removed as well.
   *   }
   *   @param[nextCardSpec #:optional]{
   *     If a showMethod is not 'none', the card to show after removal.
   *   }
   *   @param[skipDefault #:optional Boolean]{
   *     Skips the default pushCard if the removal ends up with no more
   *     cards in the stack.
   *   }
   * ]
   */
  removeCardAndSuccessors: function(cardDomNode, showMethod, numCards,
                                    nextCardSpec, skipDefault) {
    if (!this._cardStack.length) {
      return;
    }

    if (cardDomNode && this._cardStack.length === 1 && !skipDefault) {
      // No card to go to when done, so ask for a default
      // card and continue work once it exists.
      return cards.pushDefaultCard(function() {
        this.removeCardAndSuccessors(cardDomNode, showMethod, numCards,
                                    nextCardSpec);
      }.bind(this));
    }

    var firstIndex, iCard, domNode;
    if (cardDomNode === undefined) {
      throw new Error('undefined is not a valid card spec!');
    }
    else if (cardDomNode === null) {
      firstIndex = 0;
      // reset the z-index to 0 since we may have cards in the stack that
      // adjusted the z-index (and we are definitively clearing all cards).
      this._zIndex = 0;
    }
    else {
      for (iCard = this._cardStack.length - 1; iCard >= 0; iCard--) {
        domNode = this._cardStack[iCard];
        if (domNode === cardDomNode) {
          firstIndex = iCard;
          break;
        }
      }
      if (firstIndex === undefined) {
        throw new Error('No card represented by that DOM node');
      }
    }
    if (!numCards) {
      numCards = this._cardStack.length - firstIndex;
    }

    if (showMethod === 'none') {
      // If a 'none' remove, and the remove is for a DOM node that used
      // anim-overlay, which would have increased the _zIndex when added, adjust
      // the zIndex appropriately.
      if (cardDomNode && cardDomNode.classList.contains('anim-overlay')) {
        this._zIndex -= 10;
      }
    } else {
      var nextCardIndex = -1;
      if (nextCardSpec) {
        nextCardIndex = this._findCard(nextCardSpec);
      } else if (this._cardStack.length) {
        nextCardIndex = Math.min(firstIndex - 1, this._cardStack.length - 1);
      }

      if (nextCardIndex > -1) {
        this._showCard(nextCardIndex, showMethod, 'back');
      }
    }

    // Update activeCardIndex if nodes were removed that would affect its
    // value.
    if (firstIndex <= this.activeCardIndex) {
      this.activeCardIndex -= numCards;
      if (this.activeCardIndex < -1) {
        this.activeCardIndex = -1;
      }
    }

    var deadDomNodes = this._cardStack.splice(
                          firstIndex, numCards);
    for (iCard = 0; iCard < deadDomNodes.length; iCard++) {
      domNode = deadDomNodes[iCard];
      try {
        domNode.die();
      }
      catch (ex) {
        console.warn('Problem cleaning up card:', ex, '\n', ex.stack);
      }
      switch (showMethod) {
        case 'animate':
        case 'immediate': // XXX handle properly
          this._animatingDeadDomNodes.push(domNode);
          break;
        case 'none':
          domNode.parentNode.removeChild(domNode);
          break;
      }
    }

    // Reset aria-hidden attributes to handle cards visibility.
    this._setScreenReaderVisibility();
  },

  /**
   * Shortcut for removing all the cards
   */
  removeAllCards: function() {
    return this.removeCardAndSuccessors(null, 'none');
  },

  _showCard: function(cardIndex, showMethod, navDirection) {
    // Do not do anything if this is a show card for the current card.
    if (cardIndex === this.activeCardIndex) {
      return;
    }

    // If the active element is one that can have focus, blur it so that the
    // keyboard goes away.
    var activeElement = document.activeElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }

    if (cardIndex > this._cardStack.length - 1) {
      // Some cards were removed, adjust.
      cardIndex = this._cardStack.length - 1;
    }
    if (this.activeCardIndex > this._cardStack.length - 1) {
      this.activeCardIndex = -1;
    }

    if (this.activeCardIndex === -1) {
      this.activeCardIndex = cardIndex === 0 ? cardIndex : cardIndex - 1;
    }

    var domNode = (cardIndex !== null) ? this._cardStack[cardIndex] : null;
    var beginNode = this._cardStack[this.activeCardIndex];
    var endNode = this._cardStack[cardIndex];
    var isForward = navDirection === 'forward';

    if (this._cardStack.length === 1) {
      // Reset zIndex so that it does not grow ever higher when all but
      // one card are removed
      this._zIndex = 0;
    }

    // If going forward and it is an overlay node, then do not animate the
    // beginning node, it will just sit under the overlay.
    if (isForward && endNode.classList.contains('anim-overlay')) {
      beginNode = null;

      // anim-overlays are the transitions to new layers in the stack. If
      // starting a new one, it is forward movement and needs a new zIndex.
      // Otherwise, going back to
      this._zIndex += 10;
    }

    // If going back and the beginning node was an overlay, do not animate
    // the end node, since it should just be hidden under the overlay.
    if (beginNode && beginNode.classList.contains('anim-overlay')) {
      if (isForward) {
        // If a forward animation and overlay had a vertical transition,
        // disable it, use normal horizontal transition.
        if (showMethod !== 'immediate') {
          if (beginNode.classList.contains('anim-vertical')) {
            removeClass(beginNode, 'anim-vertical');
            addClass(beginNode, 'disabled-anim-vertical');
          } else if (beginNode.classList.contains('anim-fade')) {
            removeClass(beginNode, 'anim-fade');
            addClass(beginNode, 'disabled-anim-fade');
          }
        }
      } else {
        this.setStatusColor(endNode);
        endNode = null;
        this._zIndex -= 10;
      }
    }

    // If the zindex is not zero, then in an overlay stack, adjust zindex
    // accordingly.
    if (endNode && isForward && this._zIndex) {
      endNode.style.zIndex = this._zIndex;
    }

    var cardsNode = this._cardsNode;

    // Do the status bar color work before triggering transitions, otherwise
    // we lose some animation frames on the card transitions.
    if (endNode) {
      this.setStatusColor(endNode);
    }

    if (showMethod === 'immediate') {
      addClass(beginNode, 'no-anim');
      addClass(endNode, 'no-anim');

      // make sure the reflow sees the transition is turned off.
      cardsNode.clientWidth;
      // explicitly clear since there will be no animation
      this._eatingEventsUntilNextCard = false;
    }
    else if (showMethod === 'none') {
      // do not set _eatingEventsUntilNextCard, but don't clear it either.
    }
    else {
      this._transitionCount = (beginNode && endNode) ? 2 : 1;
      this._eatingEventsUntilNextCard = true;
    }

    if (this.activeCardIndex === cardIndex) {
      // same node, no transition, just bootstrapping UI.
      removeClass(beginNode, 'before');
      removeClass(beginNode, 'after');
      addClass(beginNode, 'center');
    } else if (this.activeCardIndex > cardIndex) {
      // back
      removeClass(beginNode, 'center');
      addClass(beginNode, 'after');

      removeClass(endNode, 'before');
      addClass(endNode, 'center');
    } else {
      // forward
      removeClass(beginNode, 'center');
      addClass(beginNode, 'before');

      removeClass(endNode, 'after');
      addClass(endNode, 'center');
    }

    if (showMethod === 'immediate') {
      // make sure the instantaneous transition is seen before we turn
      // transitions back on.
      cardsNode.clientWidth;

      removeClass(beginNode, 'no-anim');
      removeClass(endNode, 'no-anim');

      this._onCardVisible(domNode);
    }

    // Hide toaster while active card index changed:
    toaster.hide();

    this.activeCardIndex = cardIndex;

    // Reset aria-hidden attributes to handle cards visibility.
    this._setScreenReaderVisibility();
  },

  _setScreenReaderVisibility: function() {
    // We use aria-hidden to handle visibility instead of CSS because there are
    // semi-transparent cards, such as folder picker.
    this._cardStack.forEach(function(card, index) {
      card.setAttribute('aria-hidden', index !== this.activeCardIndex);
    }, this);
  },

  _onTransitionEnd: function(event) {
    // Avoid other transitions except ones on cards as a whole.
    if (!event.target.classList.contains('card')) {
      return;
    }

    var activeCard = this._cardStack[this.activeCardIndex];
    // If no current card, this could be initial setup from cache, no valid
    // cards yet, so bail.
    if (!activeCard) {
      return;
    }

    // Multiple cards can animate, so there can be multiple transitionend
    // events. Only do the end work when all have finished animating.
    if (this._transitionCount > 0) {
      this._transitionCount -= 1;
    }

    if (this._transitionCount === 0) {
      if (this._eatingEventsUntilNextCard) {
        this._eatingEventsUntilNextCard = false;
      }
      if (this._animatingDeadDomNodes.length) {
        // Use a setTimeout to give the animation some space to settle.
        setTimeout(function() {
          this._animatingDeadDomNodes.forEach(function(domNode) {
            if (domNode.parentNode) {
              domNode.parentNode.removeChild(domNode);
            }
          });
          this._animatingDeadDomNodes = [];
        }.bind(this), 100);
      }

      // If an vertical overlay transition was was disabled, if
      // current node index is an overlay, enable it again.
      var endNode = activeCard;

      if (endNode.classList.contains('disabled-anim-vertical')) {
        removeClass(endNode, 'disabled-anim-vertical');
        addClass(endNode, 'anim-vertical');
      } else if (endNode.classList.contains('disabled-anim-fade')) {
        removeClass(endNode, 'disabled-anim-fade');
        addClass(endNode, 'anim-fade');
      }

      // If any action to do at the end of transition trigger now.
      if (this._afterTransitionAction) {
        var afterTransitionAction = this._afterTransitionAction;
        this._afterTransitionAction = null;
        afterTransitionAction();
      }

      this._onCardVisible(activeCard);

      // If the card has next cards that can be preloaded, load them now.
      // Use of nextCards should be balanced with startup performance.
      // nextCards can result in smoother transitions to new cards on first
      // navigation to that new card type, but loading the extra module may
      // also compete with current card and data model performance.
      var nextCards = activeCard.nextCards;
      if (nextCards) {
        console.log('Preloading cards: ' + nextCards);
        require(nextCards.map(function(id) {
          return 'cards/' + id;
        }));
      }
    }
  },

  /**
   * Handles final notification of card visibility in the stack.
   * @param  {Card} domNode the card instance.
   */
  _onCardVisible: function(domNode) {
    if (domNode.onCardVisible) {
      domNode.onCardVisible();
    }
    this._emitStartupEvents(domNode.skipEmitContentEvents);
  },

  /**
   * Handles emitting startup events used for performance tracking.
   * @param  {Boolean} skipEmitContentEvents if content events should be skipped
   * because the card itself handles it.
   */
  _emitStartupEvents: function(skipEmitContentEvents) {
    if (!this._startupEventsEmitted) {
      if (startupCacheEventsSent) {
        // Cache already loaded, so at this point the content shown is wired
        // to event handlers.
        window.performance.mark('contentInteractive');
        window.dispatchEvent(new CustomEvent('moz-content-interactive'));
      } else {
        // Cache was not used, so only now is the chrome dom loaded.
        window.performance.mark('navigationLoaded');
        window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
      }
      window.performance.mark('navigationInteractive');
      window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));

      // If a card that has a simple static content DOM, content is complete.
      // Otherwise, like message_list, need backend data to call complete.
      if (!skipEmitContentEvents) {
        evt.emit('metrics:contentDone');
      }

      this._startupEventsEmitted = true;
    }
  },

  /**
   * Helper that causes (some) events targeted at our cards to be eaten until
   * we get to the next card.  The idea is to avoid bugs caused by the user
   * still being able to click things while our cards are transitioning or
   * while we are performing a (reliable) async wait before we actually initiate
   * a pushCard in response to user stimulus.
   *
   * This is automatically triggered when performing an animated transition;
   * other code should only call this in the async wait case mentioned above.
   *
   * For example, we don't want the user to have 2 message readers happening
   * at the same time because they managed to click on a second message before
   * the first reader got displayed.
   */
  eatEventsUntilNextCard: function() {
    this._eatingEventsUntilNextCard = true;
  },

  /**
   * Stop eating events, presumably because eatEventsUntilNextCard was used
   * as a hack for a known-fast async operation to avoid bugs (where we knew
   * full well that we weren't going to show a card).
   */
  stopEatingEvents: function() {
    this._eatingEventsUntilNextCard = false;
  },

  /**
   * If there are any cards on the deck right now, log an error and clear them
   * all out.  Our caller is strongly asserting that there should be no cards
   * and the presence of any indicates a bug.
   */
  assertNoCards: function() {
    if (this._cardStack.length) {
      throw new Error('There are ' + this._cardStack.length + ' cards but' +
                      ' there should be ZERO');
    }
  }
};

return cards;

});

