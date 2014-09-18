'use strict';

(function(exports) {

/**
 * AlternativesCharMenuView handles the rendering of the alternatives char menu.
 * The interaction is handled by AlternativesCharMenuManager, so this module
 * could focus on UI rendering.
 */
function AlternativesCharMenuView(rootElement, altChars, renderer) {
  this.rootElement = rootElement;
  this.altChars = altChars;

  // XXX: need a better to load the dependencies
  this.ARIA_LABELS = renderer.ARIA_LABELS;
  this.buildKey = renderer.buildKey;
  this.keyWidth = renderer.keyWidth;
  this.screenInPortraitMode = renderer.screenInPortraitMode;

  this.menu = null;
  this._rowCount = 0;
}

exports.AlternativesCharMenuView = AlternativesCharMenuView;

AlternativesCharMenuView.prototype.MENU_LINE_HEIGHT = 6;   // in rem

AlternativesCharMenuView.prototype.show = function(key) {
  var content = document.createDocumentFragment();

  // XXX: should not cause reflow by ref. innerWidth
  var cachedWindowWidth = window.innerWidth;

  var left = (cachedWindowWidth / 2 > key.offsetLeft);

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

    menu.style.top = (key.offsetTop - this.getLineHeight() * 2)  + 'px';
    this._rowCount = 2;

    // Specify the width so that it will be folded into 2 rows.
    menu.style.width =  this.keyWidth * widthRatio + 'px';

    menu.classList.add('multi-row');
  } else {
    // menu height -  4 (top margin of the visual wrapper)
    menu.style.top = (key.offsetTop - this.getLineHeight() + 4) +  'px';
    this._rowCount = 1;
  }

  // Determine the horizontal positioning of the menu
  if (left) {
    var keyRight = key.offsetLeft + key.offsetWidth;
    var posLeft = keyRight - this.keyWidth;
    menu.style.left = posLeft + 'px';
    if (posLeft === 0) {
      menu.classList.add('left-edge');
    }
  } else {
    var menuRight = key.offsetLeft + this.keyWidth;
    var posRight = cachedWindowWidth - menuRight;
    menu.style.right =  posRight + 'px';
    if (posRight === 0) {
      menu.classList.add('right-edge');
    }
  }

  // Build a key for each alternative
  this.altChars.forEach(function(alt, index) {
    var dataset = alt.length == 1 ?
    [
      { 'key': 'keycode', 'value': alt.charCodeAt(0) },
      { 'key': 'keycodeUpper', 'value': alt.toUpperCase().charCodeAt(0) }
    ] :
    [ { 'key': 'compositeKey', 'value': alt } ];

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

  var attributeList = [];

  if (this.ARIA_LABELS && this.ARIA_LABELS[alt]) {
    attributeList.push({
      key: 'data-l10n-id',
      value: this.ARIA_LABELS[alt]
    });
  } else {
    attributeList.push({
      key: 'aria-label',
      value: alt
    });
  }

  attributeList.push({
    key: 'role',
    value: 'key'
  });

  content.appendChild(
      this.buildKey(alt, '', width + 'px', dataset, null, attributeList));
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

})(window);
