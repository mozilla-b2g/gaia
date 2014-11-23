'use strict';

/* global HandwritingPadView, KeyView, KeyboardEvent */

(function(exports) {
/**
 * Each keyboard layout may have multiple pages, one for default and another
 * for symbol input, etc.
 * LayoutPageView represents each page in the keyboard.
 */
function LayoutPageView(layout, options, viewManager) {
  this.layout = layout;
  this.options = options;
  this.viewManager = viewManager;
  this.isUpperCase = undefined;
}

LayoutPageView.prototype.render = function render() {
  var layout = this.layout;

  var layoutWidth = layout.width || 10;
  var placeHolderWidth = this.options.totalWidth / layoutWidth;

  var content = document.createDocumentFragment();

  var container = document.createElement('div');
  if (this.options.classList) {
    container.classList.add.apply(container.classList, this.options.classList);
  }

  if (layout.specificCssRule) {
    container.classList.add(layout.layoutName);
  }

  // Create canvas for handwriting.
  if ('handwritingPadOptions' in layout) {
    var target = {
      isHandwritingPad: true
    };
    var handwritingPadView = new HandwritingPadView(target,
                                                    null,
                                                    this.viewManager);
    handwritingPadView.render();
    content.appendChild(handwritingPadView.element);
  }

  layout.keys.forEach((function buildKeyboardRow(row, nrow) {
    var kbRow = document.createElement('div');
    var rowLayoutWidth = 0;
    kbRow.classList.add('keyboard-row');
    kbRow.classList.add('row' + nrow);

    if (nrow === layout.keys.length - 1) {
      kbRow.classList.add('keyboard-last-row');
    }

    row.forEach((function buildKeyboardColumns(key) {
      var ratio = key.ratio || 1;
      rowLayoutWidth += ratio;

      // One key in layout may be used to create multiple keyViews in
      // different pages, so create a unique instance here.
      var target = Object.freeze(Object.create(key));
      var options = {
        keyClassName: layout.keyClassName,
        outputChar: key.uppercaseValue,
        keyWidth: (placeHolderWidth * ratio)
      };

      if (layout.secondLayout) {
        options.altOutputChar = key.value;
      }

      var keyView = new KeyView(target, options, this.viewManager);
      keyView.render();
      kbRow.appendChild(keyView.element);
    }.bind(this)));

    if ('handwritingPadOptions' in layout &&
        nrow < layout.handwritingPadOptions.rowspan) {
      rowLayoutWidth += layout.handwritingPadOptions.ratio;
    }

    kbRow.dataset.layoutWidth = rowLayoutWidth;

    content.appendChild(kbRow);
  }).bind(this));

  // If this layout does not require different rendering for lowercase state,
  // we default to uppercase rendering -- this class will tell CSS file to
  // never toggle button label <span> elements.
  if (!layout.secondLayout) {
    container.classList.add('uppercase-only');
  }

  container.appendChild(content);

  this.element = container;
};

// Accepts a state object with two properties.
//   Set isUpperCaseLocked to true if locked
//   Set isUpperCase to true when uppercase is enabled
//   Use false on both of these properties when uppercase is disabled
LayoutPageView.prototype.setUpperCaseLock = function setUpperCaseLock(state) {
  this.isUpperCase = (state.isUpperCase || state.isUpperCaseLocked);

  // Toggle the entire container in case this layout require different
  // rendering for upper case state, i.e. |secondLayout = true|.
  var container = this.element;
  container.classList.toggle('lowercase', !this.isUpperCase);

  //XXX: this should be changed to accessing the KeyView directly.
  var capsLockKey = container.querySelector(
    'button:not([disabled])' +
    '[data-keycode="' + KeyboardEvent.DOM_VK_CAPS_LOCK + '"]'
  );

  if (!capsLockKey) {
    return;
  }

  if (state.isUpperCaseLocked) {
    capsLockKey.classList.remove('kbr-key-active');
    capsLockKey.classList.add('kbr-key-hold');
  } else if (state.isUpperCase) {
    capsLockKey.classList.add('kbr-key-active');
    capsLockKey.classList.remove('kbr-key-hold');
  } else {
    capsLockKey.classList.remove('kbr-key-active');
    capsLockKey.classList.remove('kbr-key-hold');
  }

  capsLockKey.setAttribute('aria-pressed',
    state.isUpperCaseLocked || state.isUpperCase);
};

LayoutPageView.prototype.hide = function hide() {
  delete this.element.dataset.active;
};

LayoutPageView.prototype.show = function show() {
  // For automated testing to locate the active pageView
  this.element.dataset.active = true;
};

LayoutPageView.prototype.highlightKey = function highlightKey(target) {
  var keyView = this.viewManager.getView(target);
  keyView.highlight({upperCase: this.isUpperCase});
};

LayoutPageView.prototype.unHighlightKey = function unHighlightKey(target) {
  var keyView = this.viewManager.getView(target);
  keyView.unHighlight();
};

exports.LayoutPageView = LayoutPageView;

})(window);
