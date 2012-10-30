/**
 * UI infrastructure code and utility code for the gaia email app.
 **/

var mozL10n = navigator.mozL10n;

function dieOnFatalError(msg) {
  console.error('FATAL:', msg);
  throw new Error(msg);
}

var fldNodes, msgNodes, cmpNodes, supNodes, tngNodes;
function processTemplNodes(prefix) {
  var holder = document.getElementById('templ-' + prefix),
      nodes = {},
      node = holder.firstElementChild,
      reInvariant = new RegExp('^' + prefix + '-');
  while (node) {
    var classes = node.classList, found = false;
    for (var i = 0; i < classes.length; i++) {
      if (reInvariant.test(classes[i])) {
        var name = classes[i].substring(prefix.length + 1);
        nodes[name] = node;
        found = true;
        break;
      }
    }
    if (!found) {
      console.warn('Bad template node for prefix "' + prefix +
                   '" for node with classes:', classes);
    }

    node = node.nextElementSibling;
  }

  return nodes;
}
function populateTemplateNodes() {
  fldNodes = processTemplNodes('fld');
  msgNodes = processTemplNodes('msg');
  cmpNodes = processTemplNodes('cmp');
  supNodes = processTemplNodes('sup');
  tngNodes = processTemplNodes('tng');
}

function batchAddClass(domNode, searchClass, classToAdd) {
  var nodes = domNode.getElementsByClassName(searchClass);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.add(classToAdd);
  }
}

function batchRemoveClass(domNode, searchClass, classToRemove) {
  var nodes = domNode.getElementsByClassName(searchClass);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove(classToRemove);
  }
}

const MATCHED_TEXT_CLASS = 'highlight';

function appendMatchItemTo(matchItem, node) {
  const text = matchItem.text;
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
 * Bind both 'click' and 'contextmenu' (synthetically created by b2g), plus
 * handling click suppression that is currently required because we still
 * see the click event.  We also suppress contextmenu's default event so that
 * we don't trigger the browser's right-click menu when operating in firefox.
 */
function bindContainerClickAndHold(containerNode, clickFunc, holdFunc) {
  // Rather than tracking suppressClick ourselves in here, we maintain the
  // state globally in Cards.  The rationale is that popup menus will be
  // triggered on contextmenu, which transfers responsibility of the click
  // event to the popup handling logic.  There is also no chance for multiple
  // contextmenu events overlapping (that we would consider reasonable).
  bindContainerHandler(
    containerNode, 'click',
    function(node, event) {
      if (Cards._suppressClick) {
        Cards._suppressClick = false;
        return;
      }
      clickFunc(node, event);
    });
  bindContainerHandler(
    containerNode, 'contextmenu',
    function(node, event) {
      // Always preventDefault, as this terminates processing of the click as a
      // drag event.
      event.preventDefault();
      // suppress the subsequent click if this was actually a left click
      if (event.button === 0) {
        Cards._suppressClick = true;
      }

      return holdFunc(node, event);
    });
}

/**
 * Fairly simple card abstraction with support for simple horizontal animated
 * transitions.  We are cribbing from deuxdrop's mobile UI's cards.js
 * implementation created jrburke.
 */
var Cards = {
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
  activeCardIndex: null,

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
   * DOM template nodes for the cards.
   */
  _templateNodes: null,

  /**
   * The DOM nodes that should be removed from their parent when our current
   * transition ends.
   */
  _animatingDeadDomNodes: [],


  /**
   * Annoying logic related to contextmenu event handling; search for the uses
   * for more info.
   */
  _suppressClick: false,
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

  TRAY_GUTTER_WIDTH: 60,

  /**
   * Initialize and bind ourselves to the DOM which should now be fully loaded.
   */
  _init: function() {
    this._rootNode = document.body;
    this._containerNode = document.getElementById('cardContainer');
    this._cardsNode = document.getElementById('cards');
    this._templateNodes = processTemplNodes('card');

    this._containerNode.addEventListener('click',
                                         this._onMaybeIntercept.bind(this),
                                         true);
    this._containerNode.addEventListener('contextmenu',
                                         this._onMaybeIntercept.bind(this),
                                         true);

    this._adjustCardSizes();
    window.addEventListener('resize', this._adjustCardSizes.bind(this), false);

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
    // Contextmenu-derived click suppression wants to gobble an explicitly
    // expected event, and so takes priority over other types of suppression.
    if (event.type === 'click' && this._suppressClick) {
      this._suppressClick = false;
      event.stopPropagation();
      return;
    }
    if (this._eatingEventsUntilNextCard) {
      event.stopPropagation();
      return;
    }
    if (this._popupActive) {
      event.stopPropagation();
      this._popupActive.close();
      return;
    }
    if (this._trayActive &&
        (event.clientX >
         this._containerNode.offsetWidth - this.TRAY_GUTTER_WIDTH)) {
      event.stopPropagation();
      this.moveToCard(this.activeCardIndex + 1);
    }
  },

  _adjustCardSizes: function(evt) {
    var cardWidth = this._containerNode.offsetWidth,
        cardHeight = this._containerNode.offsetHeight,
        totalWidth = 0;

    for (var i = 0; i < this._cardStack.length; i++) {
      var cardInst = this._cardStack[i];
      var targetWidth = cardWidth;
      if (cardInst.modeDef.tray)
        targetWidth -= this.TRAY_GUTTER_WIDTH;
      cardInst.domNode.style.width = targetWidth + 'px';
      cardInst.domNode.style.height = cardHeight + 'px';

      cardInst.left = totalWidth;
      totalWidth += targetWidth;
    }
    this._cardsNode.style.width = totalWidth + 'px';
    this._cardsNode.style.height = cardHeight + 'px';

    // Reset cards' position when container resized.
    if (evt && evt.type == 'resize') {
      this._showCard(this.activeCardIndex, 'immediate');
    }
  },

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

  defineCardWithDefaultMode: function(name, defaultMode, constructor) {
    var cardDef = {
      name: name,
      modes: {},
      constructor: constructor
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
    if (!cardDef)
      throw new Error('No such card def type: ' + type);
    var modeDef = cardDef.modes[mode];
    if (!modeDef)
      throw new Error('No such card mode: ' + mode);

    var domNode = this._templateNodes[type].cloneNode(true);

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
    }
    else if (placement === 'left') {
      cardIndex = this.activeCardIndex++;
      insertBuddy = this._cardsNode.children[cardIndex];
    }
    else if (placement === 'right') {
      cardIndex = this.activeCardIndex + 1;
      if (cardIndex >= this._cardStack.length)
        insertBuddy = null;
      else
        insertBuddy = this._cardsNode.children[cardIndex];
    }
    this._cardStack.splice(cardIndex, 0, cardInst);
    this._cardsNode.insertBefore(domNode, insertBuddy);
    this._adjustCardSizes();
    if ('postInsert' in cardImpl)
      cardImpl.postInsert();

    if (showMethod !== 'none') {
      // If we want to animate and we just inserted the card to the left, then
      // we need to update our position so that the user perceives animation.
      // (Otherwise our offset is already showing the new card.)
      if (showMethod === 'animate' && placement === 'left')
        this._showCard(this.activeCardIndex, 'immediate');

      this._showCard(cardIndex, showMethod);
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
    throw new Error('Unable to find card with type: ' + type + ' mode: ' +
                    mode);
  },

  _findCardUsingImpl: function(impl) {
    for (var i = 0; i < this._cardStack.length; i++) {
      var cardInst = this._cardStack[i];
      if (cardInst.cardImpl === impl)
        return i;
    }
    throw new Error('Unable to find card using impl:', impl);
  },

  _findCard: function(query) {
    if (Array.isArray(query))
      return this._findCardUsingTypeAndMode(query[0], query[1]);
    else if (typeof(query) === 'number') // index number
      return query;
    else
      return this._findCardUsingImpl(query);
  },

  findCardObject: function(query) {
    return this._cardStack[this._findCard(query)];
  },

  folderSelector: function(callback) {
    // XXX: Unified folders will require us to make sure we get the folder list
    //      for the account the message originates from.
    if (!this.folderPrompt) {
      var selectorTitle = mozL10n.get('messages-folder-select');
      this.folderPrompt = new ValueSelector(selectorTitle);
    }
    var self = this;
    var folderCardObj = Cards.findCardObject(['folder-picker', 'navigation']);
    var folderImpl = folderCardObj.cardImpl;
    var folders = folderImpl.foldersSlice.items;
    for (var i = 0; i < folders.length; i++) {
      var folder = folders[i];
      this.folderPrompt.addToList(folder.name, folder.depth, function(folder) {
        return function() {
          self.folderPrompt.hide();
          callback(folder);
        }
      }(folder));

    }
    this.folderPrompt.show();
  },

  moveToCard: function(query, showMethod) {
    this._showCard(this._findCard(query), showMethod || 'animate');
  },

  tellCard: function(query, what) {
    var cardIndex = this._findCard(query),
        cardInst = this._cardStack[cardIndex];
    if (!('told' in cardInst.cardImpl))
      console.warn("Tried to tell a card that's not listening!", query, what);
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
   * Create a popup associated with a given node.  We mask out the part of the
   * screen that is not the node, helping make it obvious what the menu is
   * related to.  We currently do not try to show an arrow thing, although it
   * would be friendly of us if we did.
   *
   * https://wiki.mozilla.org/Gaia/Design/Patterns#Dialogues:_Popups
   */
  popupMenuForNode: function(menuTree, domNode, legalClickTargets, callback) {
    var self = this,
        bounds = domNode.getBoundingClientRect();

    var popupInfo = this._popupActive = {
      popupNode: menuTree,
      maskNodeCleanup: this._createMaskForNode(domNode, bounds),
      close: function(result) {
        self._popupActive = false;
        self._rootNode.removeChild(popupInfo.popupNode);
        popupInfo.maskNodeCleanup();
        callback(result);
      }
    };

    var uiWidth = this._containerNode.offsetWidth,
        uiHeight = this._containerNode.offsetHeight;

    popupInfo.popupNode.classList.add('popup');
    this._rootNode.appendChild(popupInfo.popupNode);
    // now we need to position the popup...
    var menuWidth = popupInfo.popupNode.offsetWidth,
        menuHeight = popupInfo.popupNode.offsetHeight,
        nodeCenter = bounds.top + (bounds.bottom - bounds.top) / 2,
        menuTop, menuLeft;

    const MARGIN = 4;

    // - Menu goes below item
    if (nodeCenter < uiHeight / 2) {
      menuTop = bounds.bottom + MARGIN;
      if (menuTop + menuHeight >= uiHeight)
        menuTop = uiHeight - menuHeight - MARGIN;
    }
    // - Menu goes above item
    else {
      menuTop = bounds.top - menuHeight - MARGIN;

      if (menuTop < MARGIN)
        menuTop = MARGIN;
    }

    menuLeft = (uiWidth - menuWidth) / 2;

    popupInfo.popupNode.style.top = menuTop + 'px';
    popupInfo.popupNode.style.left = menuLeft + 'px';

    popupInfo.popupNode.addEventListener('click', function(event) {
      var node = event.target;
      while (node !== popupInfo.popupNode) {
        for (var i = 0; i < legalClickTargets.length; i++) {
          if (node.classList.contains(legalClickTargets[i])) {
            popupInfo.close(node);
            return;
          }
        }
      }
    }, false);
  },

  /**
   * Remove the card identified by its DOM node and all the cards to its right.
   * Pass null to remove all of the cards!
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
   * ]
   */
  removeCardAndSuccessors: function(cardDomNode, showMethod, numCards,
                                    nextCardSpec) {
    if (!this._cardStack.length)
      return;

    var firstIndex, iCard, cardInst;
    if (cardDomNode === undefined) {
      throw new Error('undefined is not a valid card spec!');
    }
    else if (cardDomNode === null) {
      firstIndex = 0;
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
    if (showMethod !== 'none') {
      var nextCardIndex = null;
      if (nextCardSpec)
        nextCardIndex = this._findCard(nextCardSpec);
      else if (this._cardStack.length)
        nextCardIndex = Math.min(firstIndex - 1, this._cardStack.length - 1);
      this._showCard(nextCardIndex, showMethod);
    }
  },

  _showCard: function(cardIndex, showMethod) {
    var cardInst = (cardIndex !== null) ? this._cardStack[cardIndex] : null;

    var targetLeft;
    if (cardInst)
      targetLeft = 'translateX(' + (-cardInst.left) + 'px)';
    else
      targetLeft = 'translateX(0px)';

    var cardsNode = this._cardsNode;
    if (cardsNode.style.MozTransform !== targetLeft) {
      if (showMethod === 'immediate') {
        // XXX cross-platform support.
        cardsNode.style.MozTransitionProperty = 'none';
        // make sure the reflow sees the transition is turned off.
        cardsNode.clientWidth;
        // explicitly clear since there will be no animation
        this._eatingEventsUntilNextCard = false;
      }
      else {
        this._eatingEventsUntilNextCard = true;
      }
      cardsNode.style.MozTransform = targetLeft;

      if (showMethod === 'immediate') {
        // make sure the instantaneous transition is seen before we turn
        // transitions back on.
        cardsNode.clientWidth;
        // CROSS-BROWSER-TODO
        cardsNode.style.MozTransitionProperty = '-moz-transform';
      }
    }
    else {
      // explicitly clear since there will be no animation
      this._eatingEventsUntilNextCard = false;
    }

    // Hide toaster while active card index changed:
    Toaster.hide();
    // Popup toaster that pended for previous card view.
    var pendingToaster = Toaster.pendingStack.slice(-1)[0];
    if (pendingToaster && showMethod == 'immediate') {
      pendingToaster();
      Toaster.pendingStack.pop();
    }

    this.activeCardIndex = cardIndex;
    if (cardInst)
      this._trayActive = cardInst.modeDef.tray;
  },

  _onTransitionEnd: function(event) {
    if (this._eatingEventsUntilNextCard)
      this._eatingEventsUntilNextCard = false;
    if (this._animatingDeadDomNodes.length) {
      this._animatingDeadDomNodes.forEach(function(domNode) {
        if (domNode.parentNode)
          domNode.parentNode.removeChild(domNode);
      });
      // Our coordinate space may have been affected, so update and re-show
      // the current card.
      this._adjustCardSizes();
      this._showCard(this.activeCardIndex, 'immediate');
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

/**
 * Central tracker of poptart messages; specifically, ongoing message sends,
 * failed sends, and recently performed undoable mutations.
 */
var Toaster = {
  get body() {
    delete this.body;
    return this.body =
           document.querySelector('section[role="status"]');
  },
  get text() {
    delete this.text;
    return this.text =
           document.querySelector('section[role="status"] p');
  },
  /**
   * Toaster timeout setting.
   */
  _timeout: 5000,
  /**
   * Toaster fadeout animation event handling.
   */
  _animationHandler: function() {
    this.body.addEventListener('transitionend', this, false);
    this.body.classList.add('fadeout');
  },
  /**
   * The list of cards that want to hear about what's up with the toaster.  For
   * now this will just be the message-list, but it might also be the
   * message-search card as well.  If it ends up being more, then we probably
   * want to rejigger things so we can just overlay stuff on most cards...
   */
  _listeners: [],

  pendingStack: [],

  /**
   * Tell toaster listeners about a mutation we just made.
   */
  logMutation: function(undoableOp, pending) {
    //Close previous toaster before showing the new one.
    if (!this.body.classList.contains('collapsed')) {
      this.hide();
    }
    if (pending) {
      this.pendingStack.push(this.show.bind(this, 'undo', undoableOp));
    } else {
      this.show('undo', undoableOp);
    }
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case 'click' :
        if (evt.target.classList.contains('toaster-banner-undo')) {
          // TODO: Need to find out why undo could not work now.
          // this.undoableOp.undo();
          this.hide();
        } else if (evt.target.classList.contains('toaster-cancel-btn')) {
          this.hide();
        }
        break;
      case 'transitionend' :
        this.hide();
        break;
    }
  },

  show: function(type, operation) {
    var text;
    if (type == 'undo') {
      this.undoableOp = operation;
      // There is no need to show toaster is affected message count < 1
      if (!this.undoableOp || this.undoableOp.affectedCount < 1) {
        return;
      }
      var textId = 'toaster-message-' + this.undoableOp.operation;
      var undoBtn = this.body.querySelector('.toaster-banner-undo');
      text = mozL10n.get(textId, { n: this.undoableOp.affectedCount });
      // https://bugzilla.mozilla.org/show_bug.cgi?id=804916
      // Remove undo email move UI for V1.
      if (this.undoableOp.operation == 'move') {
        undoBtn.classList.add('collapsed');
      } else {
        undoBtn.classList.remove('collapsed');
      }
    } else if (type == 'text') {
      text = operation;
    }

    this.body.title = type;
    this.text.textContent = text;
    this.body.addEventListener('click', this, false);
    this.body.classList.remove('collapsed');
    this.fadeTimeout = window.setTimeout(this._animationHandler.bind(this),
                                         this._timeout);
  },

  hide: function() {
    this.body.classList.add('collapsed');
    this.body.classList.remove('fadeout');
    window.clearTimeout(this.fadeTimeout);
    this.fadeTimeout = null;
    this.body.removeEventListener('click', this);
    this.body.removeEventListener('transitionend', this);
    // Clear operations:
    this.undoableOp = null;
  }
};

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

////////////////////////////////////////////////////////////////////////////////
// Pretty date logic; copied from the SMS app.
// Based on Resig's pretty date

function prettyDate(time) {

  switch (time.constructor) {
    case String:
      time = parseInt(time);
      break;
    case Date:
      time = time.getTime();
      break;
  }

  var f = new navigator.mozL10n.DateTimeFormat();
  var diff = (Date.now() - time) / 1000;
  var day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff))
    return '(incorrect date)';

  if (day_diff < 0 || diff < 0) {
    // future time
    return f.localeFormat(new Date(time), _('shortDateTimeFormat'));
  }

  return day_diff == 0 && (
    diff < 60 && 'Just Now' ||
    diff < 120 && '1 Minute Ago' ||
    diff < 3600 && Math.floor(diff / 60) + ' Minutes Ago' ||
    diff < 7200 && '1 Hour Ago' ||
    diff < 86400 && Math.floor(diff / 3600) + ' Hours Ago') ||
    day_diff == 1 && 'Yesterday' ||
    day_diff < 7 && f.localeFormat(new Date(time), '%A') ||
    f.localeFormat(new Date(time), '%x');
}

(function() {
  var updatePrettyDate = function updatePrettyDate() {
    var labels = document.querySelectorAll('[data-time]');
    var i = labels.length;
    while (i--) {
      labels[i].textContent = prettyDate(labels[i].dataset.time);
    }
  };
  var timer = setInterval(updatePrettyDate, 60 * 1000);

  window.addEventListener('message', function visibleAppUpdatePrettyDate(evt) {
    var data = evt.data;
    if (!data || (typeof(data) !== 'object') ||
        !('message' in data) || data.message !== 'visibilitychange')
      return;
    clearTimeout(timer);
    if (!data.hidden) {
      updatePrettyDate();
      timer = setInterval(updatePrettyDate, 60 * 1000);
    }
  });
})();

////////////////////////////////////////////////////////////////////////////////
