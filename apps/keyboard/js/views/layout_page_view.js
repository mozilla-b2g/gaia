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

  this.rows = new Map();
  // Each row would contain the following info:
  //{ width: '10',  // the width ratio of this row.
  //  element:   ,  // DOM element for this row
  //  keys:      ,  // A map to store all the keys.
  //}
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

    var keyCount = 0;
    var keyMap = new Map();

    row.forEach((function buildKeyboardColumns(key, keyIndex) {
      var ratio = key.ratio || 1;
      rowLayoutWidth += ratio;

      // One key in layout may be used to create multiple keyViews in
      // different pages, so create a unique instance here.
      var target = Object.freeze(Object.create(key));

      var options = {
        classList: [],
        outputChar: key.uppercaseValue,
        keyWidth: (placeHolderWidth * ratio)
      };

      if (layout.keyClassName) {
        options.classList = options.classList.concat(
          layout.keyClassName.split(' '));
      }

      if (keyIndex === 0) {
        options.classList.push('float-key-first');
      } else if (keyIndex === row.length - 1) {
        options.classList.push('float-key-last');
      }

      if (layout.secondLayout) {
        options.altOutputChar = key.value;
      }

      var keyView = new KeyView(target, options, this.viewManager);
      keyView.render();
      kbRow.appendChild(keyView.element);

      keyMap.set(keyCount, keyView);
      keyCount++;
    }.bind(this)));

    if ('handwritingPadOptions' in layout &&
        nrow < layout.handwritingPadOptions.rowspan) {
      rowLayoutWidth += layout.handwritingPadOptions.ratio;
    }

    kbRow.dataset.layoutWidth = rowLayoutWidth;
    this.rows.set(nrow, {
      width: rowLayoutWidth,
      element: kbRow,
      keys: keyMap
    });

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

LayoutPageView.prototype.resize = function resize(totalWidth) {
  var layoutWidth = this.layout.width || 10;
  var placeHolderWidth = totalWidth / layoutWidth;

  this.rows.forEach(function(row, rIx) {
    row.keys.forEach(function(keyView, kIx) {
      var wrapperRatio = keyView.target.ratio || 1;
      var keyRatio = wrapperRatio;

      // First and last keys should fill up space
      if (kIx === 0 ||
          kIx === row.keys.size - 1) {
        keyRatio = wrapperRatio + ((layoutWidth - row.width) / 2);
      }

      keyView.resize((placeHolderWidth | 0) * keyRatio,
                     (placeHolderWidth | 0) * wrapperRatio);
    }, this);
  }, this);

  // Set width and height for handwriting pad.
  /*
  if ('handwritingPadOptions' in layout) {
    var canvas = activeIme.querySelectorAll('.handwriting-pad')[0];

    var width = Math.floor(placeHolderWidth *
        layout.handwritingPadOptions.ratio);
    canvas.width = width * window.devicePixelRatio;
    canvas.style.width = width + 'px';

    var rowHeight = rows[0].clientHeight;
    var height = Math.floor(rowHeight * layout.handwritingPadOptions.rowspan);
    canvas.height = height * window.devicePixelRatio;
    canvas.style.height = height + 'px';
  }
  */
};

LayoutPageView.prototype.getVisualData = function getVisualData() {
  // Now that key sizes have been set and adjusted for the row,
  // loop again and record the size and position of each. If we
  // do this as part of the loop above, we get bad position data.
  // We do this in a seperate loop to avoid reflowing
  var keyArray = [];

  this.rows.forEach(function (row) {
    row.keys.forEach(function(keyView) {
      var visualKey = keyView.element.querySelector('.visual-wrapper');
      keyArray.push({
        code: keyView.target.keyCode,
        x: visualKey.offsetLeft,
        y: visualKey.offsetTop,
        width: visualKey.clientWidth,
        height: visualKey.clientHeight
      });
    });
  });

  return keyArray;
};

exports.LayoutPageView = LayoutPageView;

})(window);
