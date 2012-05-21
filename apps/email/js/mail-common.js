/**
 * UI infrastructure code and utility code for the gaia email app.
 **/

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



/**
 * Fairly simple card abstraction with support for simple horizontal animated
 * transitions.  We are cribbing from deuxdrop's mobile UI's cards.js
 * implementation created jrburke.
 */
var Cards = {
  /**
   * @dictof[
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

  /**
   * @listof[@typedef[CardInstance @dict[
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

  _containerNode: null,
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
   * Initialize and bind ourselves to the DOM which should now be fully loaded.
   */
  _init: function() {
    this._containerNode = document.getElementById('cardContainer');
    this._cardsNode = document.getElementById('cards');
    this._templateNodes = processTemplNodes('card');

    this._adjustCardSizes();
    window.addEventListener('resize', this._adjustCardSizes.bind(this), false);

    // XXX be more platform detecty. or just add more events. unless the
    // prefixes are already gone with webkit and opera?
    this._cardsNode.addEventListener('transitionend',
                                     this._onTransitionEnd.bind(this),
                                     false);
  },

  TRAY_GUTTER_WIDTH: 80,
  _adjustCardSizes: function() {
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
  },

  defineCard: function(cardDef) {
    if (!cardDef.name)
      throw new Error('The card type needs a name');
    if (this._cardDefs.hasOwnProperty(cardDef.name))
      throw new Error('Duplicate card name: ' + cardDef.name);
    this._cardDefs[cardDef.name] = cardDef;
  },

  /**
   * Push a card onto the card-stack.
   *
   * @args[
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
   * ]
   */
  pushCard: function(type, mode, showMethod, args) {
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
      cardImpl: cardImpl,
    };
    this._cardStack.push(cardInst);
    this._cardsNode.appendChild(domNode);
    this._adjustCardSizes();

    // XXX for now, always animate... (Need to disable 'left' as an animatable
    // property, set left, and then re-enable.  Need to trigger one or more
    // reflows for that to work right.)
    if (showMethod !== 'none') {
      // Position the card so its leftmost edge lines up with the left of the
      // display.  This works with trays on the left side, but not the right
      // side.
      this._cardsNode.style.left = (-cardInst.left) + 'px';
    }
  },

  /**
   * Remove the card identified by its DOM node and all the cards to its right.
   * Pass null to remove all of the cards!
   *
   * @args[
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
   * ]
   */
  removeCardAndSuccessors: function(cardDomNode, showMethod) {
    if (!this._cardStack.length)
      return;

    var firstIndex, iCard, cardInst;
    if (cardDomNode == null) {
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

    var deadCardInsts = this._cardStack.splice(
                          firstIndex, this._cardStack.length - firstIndex);
    for (iCard = 0; iCard < deadCardInsts.length; iCard++) {
      cardInst = deadCardInsts[iCard];
      try {
        cardInst.die();
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
      var targetLeft = '0px';
      if (this._cardStack.length)
        targetLeft = (-this._cardStack[this._cardStack.length - 1].left) +
                       'px';
      this._cardsNode.style.left = targetLeft;
    }
  },

  _onTransitionEnd: function(event) {
    if (this._animatingDeadDomNodes.length) {
      this._animatingDeadDomNodes.forEach(function(domNode) {
        domNode.parentNode.removeChild(domNode);
      });
    }
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
  },
};
