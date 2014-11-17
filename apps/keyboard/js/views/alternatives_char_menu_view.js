'use strict';

/* globals KeyView */

(function(exports) {

/**
 * AlternativesCharMenuView handles the rendering of the alternatives char menu.
 * The interaction is handled by AlternativesCharMenuManager, so this module
 * could focus on UI rendering.
 */
function AlternativesCharMenuView(rootElement, altChars, options, viewManager) {
  this.rootElement = rootElement;
  this.altChars = altChars;

  // XXX: need a better to load the dependencies
  this.keyWidth = options.keyWidth;
  this.screenInPortraitMode = options.screenInPortraitMode;

  this.menu = null;
  this._rowCount = 0;
  this.altKeyTargets = [];

  this.viewManager = viewManager;
}

exports.AlternativesCharMenuView = AlternativesCharMenuView;

AlternativesCharMenuView.prototype.MENU_LINE_HEIGHT = 6;   // in rem

AlternativesCharMenuView.prototype.show = function(keyElem) {
  var content = document.createDocumentFragment();

  // XXX: should not cause reflow by ref. innerWidth
  var cachedWindowWidth = window.innerWidth;

  var left = (cachedWindowWidth / 2 > keyElem.offsetLeft);
  this._direction = left ? 'left' : 'right';

  var menu = document.createElement('div');
  menu.id = 'keyboard-accent-char-menu';

  // Make the menu extend to the left hand side.
  if (!left) {
    menu.classList.add('kbr-menu-left');
  }

  // Decide the height of the menu
  var widthRatio = 0;

  if (this.altChars.length > 5) {
    widthRatio = Math.ceil(this.altChars.length / 2);

    menu.style.top = (keyElem.offsetTop - this.getLineHeight() * 2)  + 'px';
    this._columnCount = widthRatio;
    this._rowCount = 2;

    // Specify the width so that it will be folded into 2 rows.
    menu.style.width =  this.keyWidth * widthRatio + 'px';

    menu.classList.add('multi-row');
  } else {
    // menu height -  4 (top margin of the visual wrapper)
    menu.style.top = (keyElem.offsetTop - this.getLineHeight() + 4) +  'px';
    this._rowCount = 1;
    this._columnCount = this.altChars.length;
  }

  // Determine the horizontal positioning of the menu
  if (left) {
    var keyRight = keyElem.offsetLeft + keyElem.offsetWidth;
    var posLeft = keyRight - this.keyWidth;
    menu.style.left = posLeft + 'px';
    if (posLeft === 0) {
      menu.classList.add('left-edge');
    }
  } else {
    var menuRight = keyElem.offsetLeft + this.keyWidth;
    var posRight = cachedWindowWidth - menuRight;
    menu.style.right =  posRight + 'px';
    if (posRight === 0) {
      menu.classList.add('right-edge');
    }
  }

  // Build a key for each alternative
  this.altChars.forEach(function(alt, index) {
    // TODO: the renderer should not be creating a business logic object,
    // let's move it to somewhere else, and/or allow normalization directly
    // to take place at LayoutNormalizer
    var altKeyTarget = alt.length == 1 ? {
      value: alt,
      keyCode: alt.charCodeAt(0),
      keyCodeUpper: alt.toUpperCase().charCodeAt(0)
    } : { 'compositeKey': alt,
          value: alt };

    // Make each of these alternative keys as wide as the key that
    // it is an alternative for, but adjust for the relative number of
    // characters in the original and the alternative.
    var width = this.keyWidth;

    // Only adjust the width when there is one row, since the key width
    // would be fixed in 2-row case.
    if (alt.length > 1 && this._rowCount === 1) {
      // Add some padding to the composite key.
      width = this._getCharWidth(alt) + 10;
      width = Math.max(width, this.keyWidth);
    }

    var altKey = new KeyView(altKeyTarget,
                             {keyWidth: width},
                             this.viewManager);
    altKey.render();
    content.appendChild(altKey.element);

    this.altKeyTargets.push(altKeyTarget);
  }.bind(this));

  menu.appendChild(content);

  // Adjust menu style
  // Put menu in keyboard container
  this.rootElement.appendChild(menu);
  this.menu = menu;
};

AlternativesCharMenuView.prototype.hide = function() {
  this.rootElement.removeChild(this.menu);
};

AlternativesCharMenuView.prototype.getRowCount = function() {
  return this._rowCount;
};

AlternativesCharMenuView.prototype.getMenuContainer = function() {
  return this.menu;
};

AlternativesCharMenuView.prototype.getBoundingClientRect = function() {
  return this.menu.getBoundingClientRect();
};

AlternativesCharMenuView.prototype.getLineHeight = function() {
  var scale = parseFloat(document.documentElement.style.fontSize);
  return this.MENU_LINE_HEIGHT * scale;
};

AlternativesCharMenuView.prototype._getCharWidth = function(textContent) {
  var scaleContext = document.createElement('canvas')
    .getContext('2d', { willReadFrequently: true });

  var fontSize = this.screenInPortraitMode() ? '2.4rem' : '2.8rem';
  scaleContext.font = fontSize + ' sans-serif';

  return scaleContext.measureText(textContent).width;
};

AlternativesCharMenuView.prototype.getMenuTarget = function(x, y) {
  var menuRect = this.getBoundingClientRect();

  // Limit the x,y in the menu
  if (x <= menuRect.left) {
    x = menuRect.left + 1;
  } else if (x >= menuRect.right) {
    // Cannot find element if x hit the edge, so -1 here.
    x = menuRect.right - 1;
  }

  var xOffset = 0;
  if (this._direction === 'left') {
    // menu extends to left
    xOffset = x - menuRect.left;
  } else {
    // menu extends to right
    xOffset = menuRect.right - x;
  }

  // Redirect to upper row
  y = y - this.getLineHeight();
  if (y <= menuRect.top) {
    // Cannot find element if y hit the edge, so +1 here.
    y = menuRect.top + 1;
  }

  var columnCount = this._columnCount;
  var targetIndex = Math.floor(xOffset / menuRect.width * columnCount);

  if ((menuRect.bottom - y) > this.getLineHeight()) {
    targetIndex += columnCount;
  }

  // UX spec: if the targetIndex is out of the length of the alt chars,
  // we want to highlight the last alt char.
  if (targetIndex >= this.altKeyTargets.length) {
    targetIndex = this.altKeyTargets.length - 1;
  }

  return this.altKeyTargets[targetIndex];
};

AlternativesCharMenuView.prototype.isMenuTarget = function(target) {
  return (this.altKeyTargets.indexOf(target) !== -1);
};

})(window);
