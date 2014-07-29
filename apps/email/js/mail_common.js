/**
 * UI infrastructure code and utility code for the gaia email app.
 **/
/*jshint browser: true */
/*global define, console, startupCacheEventsSent */
'use strict';
define(function(require, exports) {

var Cards,
    Toaster = require('./toaster'),
    evt = require('evt'),
    mozL10n = require('l10n!'),
    confirmDialogTemplateNode = require('tmpl!./cards/confirm_dialog.html'),
    ValueSelector = require('value_selector');

var hookupInputAreaResetButtons = require('input_areas');

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

function batchAddClass(domNode, searchClass, classToAdd) {
  var nodes = domNode.getElementsByClassName(searchClass);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.add(classToAdd);
  }
}

var MATCHED_TEXT_CLASS = 'highlight';

function appendMatchItemTo(matchItem, node) {
  var text = matchItem.text;
  var idx = 0;
  for (var iRun = 0; iRun <= matchItem.matchRuns.length; iRun++) {
    var run;
    if (iRun === matchItem.matchRuns.length)
      run = { start: text.length, length: 0 };
    else
      run = matchItem.matchRuns[iRun];

    // generate the un-highlighted span
    if (run.start > idx) {
      var tnode = document.createTextNode(text.substring(idx, run.start));
      node.appendChild(tnode);
    }

    if (!run.length)
      continue;
    var hspan = document.createElement('span');
    hspan.classList.add(MATCHED_TEXT_CLASS);
    hspan.textContent = text.substr(run.start, run.length);
    node.appendChild(hspan);
    idx = run.start + run.length;
  }
}

/**
 * Add an event listener on a container that, when an event is encounted on
 * a descendant, walks up the tree to find the immediate child of the container
 * and tells us what the click was on.
 */
function bindContainerHandler(containerNode, eventName, func) {
  containerNode.addEventListener(eventName, function(event) {
    var node = event.target;
    // bail if they clicked on the container and not a child...
    if (node === containerNode)
      return;
    while (node && node.parentNode !== containerNode) {
      node = node.parentNode;
    }
    func(node, event);
  }, false);
}

/**
 * Fairly simple card abstraction with support for simple horizontal animated
 * transitions.  We are cribbing from deuxdrop's mobile UI's cards.js
 * implementation created jrburke.
 */
Cards = {
  /* @dictof[
   *   @key[name String]
   *   @value[@dict[
   *     @key[name String]{
   *       The name of the card, which should also be the name of the css class
   *       used for the card when 'card-' is prepended.
   *     }
   *     @key[modes @dictof[
   *       @key[modeName String]
   *       @value[modeDef @dict[
   *         @key[tray Boolean]{
   *           Should this card be displayed as a tray that leaves the edge of
   *           the adjacent card visible?  (The width of the edge being a
   *           value consistent across all cards.)
   *         }
   *       ]
   *     ]]
   *     @key[constructor Function]{
   *       The constructor to use to create an instance of the card.
   *     }
   *   ]]
   * ]
   */
  _cardDefs: {},

  /* @listof[@typedef[CardInstance @dict[
   *   @key[domNode]{
   *   }
   *   @key[cardDef]
   *   @key[modeDef]
   *   @key[left Number]{
   *     Left offset of the card in #cards.
   *   }
   *   @key[cardImpl]{
   *     The result of calling the card's constructor.
   *   }
   * ]]]{
   *   Existing cards, left-to-right, new cards getting pushed onto the right.
   * }
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
   * Is a tray card visible, suggesting that we need to intercept clicks in the
   * tray region so that we can transition back to the thing visible because of
   * the tray and avoid the click triggering that card's logic.
   */
  _trayActive: false,
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

    Toaster.init(this._containerNode);

    this._containerNode.addEventListener('click',
                                         this._onMaybeIntercept.bind(this),
                                         true);

    // XXX be more platform detecty. or just add more events. unless the
    // prefixes are already gone with webkit and opera?
    this._cardsNode.addEventListener('transitionend',
                                     this._onTransitionEnd.bind(this),
                                     false);
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
      if (cardNode.classList.contains('card'))
        break;
    }

    // If tray is active and the click is in the card that is after
    // current card (in the gutter), then just transition back to
    // that card.
    if (this._trayActive && cardNode && cardNode.classList.contains('after')) {
      event.stopPropagation();
      event.preventDefault();

      // Look for a card with a data-tray-target attribute
      var targetIndex = -1;
      this._cardStack.some(function(card, i) {
        if (card.domNode.hasAttribute('data-tray-target')) {
          targetIndex = i;
          return true;
        }
      });

      // Choose a default of one card ahead
      if (targetIndex === -1)
        targetIndex = this.activeCardIndex + 1;

      var indexDiff = targetIndex - (this.activeCardIndex + 1);
      if (indexDiff > 0) {
        this._afterTransitionAction = (function() {
          this.removeCardAndSuccessors(this._cardStack[0].domNode,
                                       'none', indexDiff);
          this.moveToCard(targetIndex, 'animate', 'forward');
        }.bind(this));
      }

      this.moveToCard(this.activeCardIndex + 1, 'animate', 'forward');
    }
  },

  /**
   * Called whenever the default card for the app should be inserted.
   * Override this method in the app. The app should call Card.pushCard
   * with the card of its choosing, and call the onPushed function passed
   * in to pushDefaultCard once the default card has been pushed. The
   * default card should be pushed with showMethod of 'none' so that
   * whatever the onPushed function does will work well with card nav.
   * @param  {Function} onPushed pass as the onPushed arg to pushCard.
   */
  pushDefaultCard: function(onPushed) {},

  defineCard: function(cardDef) {
    if (!cardDef.name)
      throw new Error('The card type needs a name');
    if (this._cardDefs.hasOwnProperty(cardDef.name))
      throw new Error('Duplicate card name: ' + cardDef.name);
    this._cardDefs[cardDef.name] = cardDef;

    // normalize the modes
    for (var modeName in cardDef.modes) {
      var mode = cardDef.modes[modeName];
      if (!mode.hasOwnProperty('tray'))
        mode.tray = false;
      mode.name = modeName;
    }
  },

  defineCardWithDefaultMode: function(name, defaultMode, constructor,
                                      templateNode) {
    var cardDef = {
      name: name,
      modes: {},
      constructor: constructor,
      templateNode: templateNode
    };
    cardDef.modes['default'] = defaultMode;
    this.defineCard(cardDef);
  },

  /**
   * Push a card onto the card-stack.
   */
  /* @args[
   *   @param[type]
   *   @param[mode String]{
   *   }
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
  pushCard: function(type, mode, showMethod, args, placement) {
    var cardDef = this._cardDefs[type];

    args = args || {};

    if (!cardDef) {
      var cbArgs = Array.slice(arguments);
      this._pendingPush = [type, mode];

      // Only eat clicks if the card will be visibly displayed.
      if (showMethod !== 'none')
        this.eatEventsUntilNextCard();

      require(['cards/' + type], function() {
        this.pushCard.apply(this, cbArgs);
      }.bind(this));
      return;
    }

    this._pendingPush = null;

    var modeDef = cardDef.modes[mode];
    if (!modeDef)
      throw new Error('No such card mode: ' + mode);

    console.log('pushCard for type: ' + type);

    var domNode = args.cachedNode ?
                  args.cachedNode : cardDef.templateNode.cloneNode(true);

    domNode.setAttribute('data-type', type);
    domNode.setAttribute('data-mode', mode);

    var cardImpl = new cardDef.constructor(domNode, mode, args);
    var cardInst = {
      domNode: domNode,
      cardDef: cardDef,
      modeDef: modeDef,
      cardImpl: cardImpl
    };
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
      if (cardIndex >= this._cardStack.length)
        insertBuddy = null;
      else
        insertBuddy = this._cardsNode.children[cardIndex];
      domNode.classList.add('after');
    }
    this._cardStack.splice(cardIndex, 0, cardInst);

    if (!args.cachedNode) {
      this._cardsNode.insertBefore(domNode, insertBuddy);
    }

    // If the card has any <button type="reset"> buttons,
    // make them clear the field they're next to and not the entire form.
    // See input_areas.js and shared/style/input_areas.css.
    hookupInputAreaResetButtons(domNode);

    // We're appending new elements to DOM so to make sure headers are
    // properly resized and centered, we emmit a lazyload event.
    // This will be removed when the gaia-header web component lands.
    window.dispatchEvent(new CustomEvent('lazyload', {
      detail: domNode
    }));

    if ('postInsert' in cardImpl)
      cardImpl.postInsert();

    if (showMethod !== 'none') {
      // make sure the reflow sees the new node so that the animation
      // later is smooth.
      if (!args.cachedNode)
        domNode.clientWidth;

      this._showCard(cardIndex, showMethod, 'forward');
    }

    if (args.onPushed)
      args.onPushed(cardImpl);
  },

  /**
   * Pushes a new card if none exists, otherwise, uses existing
   * card and passes args to that card via tellCard. Arguments
   * are the same as pushCard.
   * @return {Boolean} true if card was pushed.
   */
  pushOrTellCard: function(type, mode, showMethod, args, placement) {
    var query = [type, mode];
    if (this.hasCard(query)) {
      this.tellCard(query, args);
      return false;
    } else {
      this.pushCard.apply(this, Array.slice(arguments));
      return true;
    }
  },

  _findCardUsingTypeAndMode: function(type, mode) {
    for (var i = 0; i < this._cardStack.length; i++) {
      var cardInst = this._cardStack[i];
      if (cardInst.cardDef.name === type &&
          cardInst.modeDef.name === mode) {
        return i;
      }
    }
  },

  _findCardUsingImpl: function(impl) {
    for (var i = 0; i < this._cardStack.length; i++) {
      var cardInst = this._cardStack[i];
      if (cardInst.cardImpl === impl)
        return i;
    }
  },

  _findCard: function(query, skipFail) {
    var result;
    if (Array.isArray(query))
      result = this._findCardUsingTypeAndMode(query[0], query[1], skipFail);
    else if (typeof(query) === 'number') // index number
      result = query;
    else
      result = this._findCardUsingImpl(query);

    if (result > -1)
      return result;
    else if (!skipFail)
      throw new Error('Unable to find card with query:', query);
    else
      // Returning undefined explicitly so that index comparisons, like
      // the one in hasCard, are correct.
      return undefined;
  },

  hasCard: function(query) {
    if (this._pendingPush && Array.isArray(query) && query.length === 2 &&
        this._pendingPush[0] === query[0] &&
        this._pendingPush[1] === query[1])
      return true;

    return this._findCard(query, true) > -1;
  },

  isVisible: function(cardImpl) {
    return !!(cardImpl.domNode &&
              cardImpl.domNode.classList.contains('center'));
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
      result = [card.cardDef.name, card.cardImpl.mode];
    }
    return result;
  },

  folderSelector: function(callback) {
    var self = this;

    require(['model'], function(model) {
      // XXX: Unified folders will require us to make sure we get the folder
      //      list for the account the message originates from.
      if (!self.folderPrompt) {
        var selectorTitle = mozL10n.get('messages-folder-select');
        self.folderPrompt = new ValueSelector(selectorTitle);
      }

      model.latestOnce('foldersSlice', function(foldersSlice) {
        var folders = foldersSlice.items;
        for (var i = 0; i < folders.length; i++) {
          var folder = folders[i];
          self.folderPrompt.addToList(folder.name, folder.depth,
            folder.selectable,
            function(folder) {
              return function() {
                self.folderPrompt.hide();
                callback(folder);
              };
            }(folder));

        }
        self.folderPrompt.show();
      });
    });
  },

  moveToCard: function(query, showMethod) {
    this._showCard(this._findCard(query), showMethod || 'animate');
  },

  tellCard: function(query, what) {
    var cardIndex = this._findCard(query),
        cardInst = this._cardStack[cardIndex];
    if (!('told' in cardInst.cardImpl))
      console.warn('Tried to tell a card that\'s not listening!', query, what);
    else
      cardInst.cardImpl.told(what);
  },

  /**
   * Create a mask that shows only the given node by creating 2 or 4 div's,
   * returning the container that holds those divs.  It's not clear if a single
   * div with some type of fancy clipping would be better.
   */
  _createMaskForNode: function(domNode, bounds) {
    var anchorIn = this._rootNode, cleanupDivs = [];
    var uiWidth = this._containerNode.offsetWidth,
        uiHeight = this._containerNode.offsetHeight;

    // inclusive pixel coverage
    function addMask(left, top, right, bottom) {
      var node = document.createElement('div');
      node.classList.add('popup-mask');
      node.style.left = left + 'px';
      node.style.top = top + 'px';
      node.style.width = (right - left + 1) + 'px';
      node.style.height = (bottom - top + 1) + 'px';
      cleanupDivs.push(node);
      anchorIn.appendChild(node);
    }
    if (bounds.left > 1)
      addMask(0, bounds.top, bounds.left - 1, bounds.bottom);
    if (bounds.top > 0)
      addMask(0, 0, uiWidth - 1, bounds.top - 1);
    if (bounds.right < uiWidth - 1)
      addMask(bounds.right + 1, bounds.top, uiWidth - 1, bounds.bottom);
    if (bounds.bottom < uiHeight - 1)
      addMask(0, bounds.bottom + 1, uiWidth - 1, uiHeight - 1);
    return function() {
      for (var i = 0; i < cleanupDivs.length; i++) {
        anchorIn.removeChild(cleanupDivs[i]);
      }
    };
  },

  /**
   * Remove the card identified by its DOM node and all the cards to its right.
   * Pass null to remove all of the cards! If cardDomNode passed, but there
   * are no cards before it, Cards.getDefaultCard is called to set up a before
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
    if (!this._cardStack.length)
      return;

    if (cardDomNode && this._cardStack.length === 1 && !skipDefault) {
      // No card to go to when done, so ask for a default
      // card and continue work once it exists.
      return Cards.pushDefaultCard(function() {
        this.removeCardAndSuccessors(cardDomNode, showMethod, numCards,
                                    nextCardSpec);
      }.bind(this));
    }

    var firstIndex, iCard, cardInst;
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
        cardInst = this._cardStack[iCard];
        if (cardInst.domNode === cardDomNode) {
          firstIndex = iCard;
          break;
        }
      }
      if (firstIndex === undefined)
        throw new Error('No card represented by that DOM node');
    }
    if (!numCards)
      numCards = this._cardStack.length - firstIndex;

    if (showMethod !== 'none') {
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

    var deadCardInsts = this._cardStack.splice(
                          firstIndex, numCards);
    for (iCard = 0; iCard < deadCardInsts.length; iCard++) {
      cardInst = deadCardInsts[iCard];
      try {
        cardInst.cardImpl.die();
      }
      catch (ex) {
        console.warn('Problem cleaning up card:', ex, '\n', ex.stack);
      }
      switch (showMethod) {
        case 'animate':
        case 'immediate': // XXX handle properly
          this._animatingDeadDomNodes.push(cardInst.domNode);
          break;
        case 'none':
          cardInst.domNode.parentNode.removeChild(cardInst.domNode);
          break;
      }
    }
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

    var cardInst = (cardIndex !== null) ? this._cardStack[cardIndex] : null;
    var beginNode = this._cardStack[this.activeCardIndex].domNode;
    var endNode = this._cardStack[cardIndex].domNode;
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

      this._onCardVisible(cardInst);
    }

    // Hide toaster while active card index changed:
    Toaster.hide();

    this.activeCardIndex = cardIndex;
    if (cardInst)
      this._trayActive = cardInst.modeDef.tray;
  },

  _onTransitionEnd: function(event) {
    // Avoid other transitions except ones on cards as a whole.
    if (!event.target.classList.contains('card')) {
      return;
    }

    var activeCard = this._cardStack[this.activeCardIndex];
    // If no current card, this could be initial setup from cache, no valid
    // cards yet, so bail.
    if (!activeCard)
      return;

    // Multiple cards can animate, so there can be multiple transitionend
    // events. Only do the end work when all have finished animating.
    if (this._transitionCount > 0)
      this._transitionCount -= 1;

    if (this._transitionCount === 0) {
      if (this._eatingEventsUntilNextCard) {
        this._eatingEventsUntilNextCard = false;
      }
      if (this._animatingDeadDomNodes.length) {
        // Use a setTimeout to give the animation some space to settle.
        setTimeout(function() {
          this._animatingDeadDomNodes.forEach(function(domNode) {
            if (domNode.parentNode)
              domNode.parentNode.removeChild(domNode);
          });
          this._animatingDeadDomNodes = [];
        }.bind(this), 100);
      }

      // If an vertical overlay transition was was disabled, if
      // current node index is an overlay, enable it again.
      var endNode = activeCard.domNode;

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
      var nextCards = activeCard.cardImpl.nextCards;
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
   * @param  {Card} cardInst the card instance.
   */
  _onCardVisible: function(cardInst) {
    if (cardInst.cardImpl.onCardVisible) {
      cardInst.cardImpl.onCardVisible();
    }
    this._emitStartupEvents(cardInst.cardImpl.skipEmitContentEvents);
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
        window.dispatchEvent(new CustomEvent('moz-content-interactive'));
      } else {
        // Cache was not used, so only now is the chrome dom loaded.
        window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
      }
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
    if (this._cardStack.length)
      throw new Error('There are ' + this._cardStack.length + ' cards but' +
                      ' there should be ZERO');
  }
};

////////////////////////////////////////////////////////////////////////////////
// ConfirmDialog: defined inline with mail_common because of a cycle
// with Cards. When Cards is split out of mail_common, this card
// can be moved out too.
function ConfirmDialog(domNode, mode, args) {
  this.domNode = domNode;

  var dialogBodyNode = args.dialogBodyNode,
      confirm = args.confirm,
      cancel = args.cancel,
      callback = args.callback;

  if (dialogBodyNode) {
    this.domNode.appendChild(dialogBodyNode);
  } else {
    // If no dialogBodyNode passed in, use the default form display, and
    // configure the confirm/cancel hand, for the simple way of handling
    // confirm dialogs.
    dialogBodyNode = this.domNode.querySelector('.confirm-dialog-form');

    dialogBodyNode.querySelector('.confirm-dialog-message')
                  .textContent = args.message;

    dialogBodyNode.classList.remove('collapsed');

    confirm = {
      handler: function() {
        callback(true);
      }
    };
    cancel = {
      handler: function() {
        callback(false);
      }
    };
  }

  // Wire up the event handling
  dialogBodyNode.addEventListener('submit', function(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    this.hide();

    var target = evt.explicitOriginalTarget,
        targetId = target.id,
        isOk = target.classList.contains('confirm-dialog-ok'),
        isCancel = target.classList.contains('confirm-dialog-cancel');

    if ((isOk || targetId === confirm.id) && confirm.handler) {
      confirm.handler();
    } else if ((isCancel || targetId === cancel.id) && cancel.handler) {
      cancel.handler();
    }
  }.bind(this));
}

ConfirmDialog.prototype = {
  hide: function() {
    Cards.removeCardAndSuccessors(this.domNode, 'immediate', 1, null, true);
  },
  die: function() {
  }
};

/**
 * A class method used by others to create confirm dialogs.
 * This method has two call types, to accommodate older
 * code that used ConfirmDialog to pass a full form node:
 *
 *  ConfirmDialog.show(dialogFormNode, confirmObject, cancelObject);
 *
 * and simpler code that just wants to pass a string message
 * and a callback that returns true (if OK is pressed) or
 * false (if cancel is pressed):
 *
 *  ConfirmDialog.show(messageString, function(confirmed) {});
 *
 * This newer style mimics a plain confirm dialog, with an
 * OK and Cancel that are not customizable.
 */
ConfirmDialog.show = function(message, callback, cancel) {
  var dialogBodyNode;

  // Old style confirms that have their own form.
  if (typeof message !== 'string') {
    dialogBodyNode = message;
    message = null;
  }

  Cards.pushCard('confirm_dialog', 'default', 'immediate', {
    dialogBodyNode: dialogBodyNode,
    message: message,
    confirm: callback,
    callback: callback,
    cancel: cancel
  }, 'right');
};

Cards.defineCardWithDefaultMode(
    'confirm_dialog',
    { tray: false },
    ConfirmDialog,
    confirmDialogTemplateNode
);


////////////////////////////////////////////////////////////////////////////////
// Attachment Formatting Helpers

/**
 * Display a human-readable file size.  Currently we always display things in
 * kilobytes because we are targeting a mobile device and we want bigger sizes
 * (like megabytes) to be obviously large numbers.
 */
function prettyFileSize(sizeInBytes) {
  var kilos = Math.ceil(sizeInBytes / 1024);
  return mozL10n.get('attachment-size-kib', { kilobytes: kilos });
}

/**
 * Display a human-readable relative timestamp.
 */
function prettyDate(time, useCompactFormat) {
  var f = new mozL10n.DateTimeFormat();
  return f.fromNow(time, useCompactFormat);
}

(function() {
  var formatter = new mozL10n.DateTimeFormat();
  var updatePrettyDate = function updatePrettyDate() {
    var labels = document.querySelectorAll('[data-time]');
    var i = labels.length;
    while (i--) {
      labels[i].textContent = formatter.fromNow(
        labels[i].dataset.time,
        // the presence of the attribute is our indicator; not its value
        'compactFormat' in labels[i].dataset);
    }
  };
  var timer = setInterval(updatePrettyDate, 60 * 1000);

  function updatePrettyDateOnEvent() {
    clearTimeout(timer);
    updatePrettyDate();
    timer = setInterval(updatePrettyDate, 60 * 1000);
  }
  // When user changes the language, update timestamps.
  mozL10n.ready(updatePrettyDateOnEvent);

  // On visibility change to not hidden, update timestamps
  document.addEventListener('visibilitychange', function() {
    if (document && !document.hidden) {
      updatePrettyDateOnEvent();
    }
  });

})();

////////////////////////////////////////////////////////////////////////////////

/**
 * Class to handle form input navigation.
 *
 * If 'Enter' is hit, next input element will be focused,
 * and if the input element is the last one, trigger 'onLast' callback.
 *
 * options:
 *   {
 *     formElem: element,             // The form element
 *     checkFormValidity: function    // Function to check form validity
 *     onLast: function               // Callback when 'Enter' in the last input
 *   }
 */
function FormNavigation(options) {
  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  if (!options.formElem) {
    throw new Error('The form element should be defined.');
  }

  var self = this;
  this.options = extend({
    formElem: null,
    checkFormValidity: function checkFormValidity() {
      return self.options.formElem.checkValidity();
    },
    onLast: function() {}
  }, options);

  this.options.formElem.addEventListener('keypress',
    this.onKeyPress.bind(this));
}

FormNavigation.prototype = {
  onKeyPress: function formNav_onKeyPress(event) {
    if (event.keyCode === 13) {
      // If the user hit enter, focus the next form element, or, if the current
      // element is the last one and the form is valid, submit the form.
      var nextInput = this.focusNextInput(event);
      if (!nextInput && this.options.checkFormValidity()) {
        this.options.onLast(event);
      }
    }
  },

  focusNextInput: function formNav_focusNextInput(event) {
    var currentInput = event.target;
    var inputElems = this.options.formElem.getElementsByTagName('input');
    var currentInputFound = false;

    for (var i = 0; i < inputElems.length; i++) {
      var input = inputElems[i];
      if (currentInput === input) {
        currentInputFound = true;
        continue;
      } else if (!currentInputFound) {
        continue;
      }

      if (input.type === 'hidden' || input.type === 'button') {
        continue;
      }

      input.focus();
      if (document.activeElement !== input) {
        // We couldn't focus the element we wanted.  Try with the next one.
        continue;
      }
      return input;
    }

    // If we couldn't find anything to focus, just blur the initial element.
    currentInput.blur();
    return null;
  }
};

/**
 * Format the message subject appropriately.  This means ensuring that if the
 * subject is empty, we use a placeholder string instead.
 *
 * @param {DOMElement} subjectNode the DOM node for the message's subject.
 * @param {Object} message the message object.
 */
function displaySubject(subjectNode, message) {
  var subject = message.subject && message.subject.trim();
  if (subject) {
    subjectNode.textContent = subject;
    subjectNode.classList.remove('msg-no-subject');
  }
  else {
    subjectNode.textContent = mozL10n.get('message-no-subject');
    subjectNode.classList.add('msg-no-subject');
  }
}

/**
 * Given a mime type, generates a CSS class name that uses just the first part
 * of the mime type. So, audio/ogg becomes mime-audio.
 * @param  {String} mimeType
 * @return {String} a class name usable in CSS.
 */
function mimeToClass(mimeType) {
  mimeType = mimeType || '';
  return 'mime-' + (mimeType.split('/')[0] || '');
}

exports.Cards = Cards;
exports.ConfirmDialog = ConfirmDialog;
exports.FormNavigation = FormNavigation;
exports.prettyDate = prettyDate;
exports.prettyFileSize = prettyFileSize;
exports.addClass = addClass;
exports.removeClass = removeClass;
exports.batchAddClass = batchAddClass;
exports.bindContainerHandler = bindContainerHandler;
exports.appendMatchItemTo = appendMatchItemTo;
exports.displaySubject = displaySubject;
exports.mimeToClass = mimeToClass;
});
