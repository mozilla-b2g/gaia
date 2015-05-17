'use strict';

/* global HandwritingPadView, KeyView, KeyboardEvent,
   LatinCandidatePanelView, CandidatePanelView */

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
  //{ element:   ,  // DOM element for this row
  //  keys:      ,  // A map to store all the keys.
  //}

  this.candidatePanel = null;
  this.candidatePanelHeight = 3.2;

  // Cache the visual data here
  this.keyArrays = new Map();
}

LayoutPageView.prototype.render = function render() {
  var layout = this.layout;
  var content = document.createDocumentFragment();

  var container = document.createElement('div');
  if (this.options.classNames) {
    container.classList.add.apply(container.classList, this.options.classNames);
  }

  if (layout.specificCssRule) {
    container.classList.add(layout.layoutName);
  }

  // Render candidate panel
  if (this.options.showCandidatePanel) {
    var candidatePanel = this.createCandidatePanel(this.layout.imEngine);
    candidatePanel.render();

    container.classList.add('candidate-panel');
    container.appendChild(candidatePanel.element);

    this.candidatePanel = candidatePanel;
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
    this.handwritingPadView = handwritingPadView;
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

    // Calculate the layout width for each row first.
    row.forEach(function calcRowRatio(key, keyIndex) {
      var ratio = key.ratio || 1;
      rowLayoutWidth += ratio;
    });

    if ('handwritingPadOptions' in layout &&
        nrow < layout.handwritingPadOptions.rowspan) {
      rowLayoutWidth += layout.handwritingPadOptions.ratio;
    }

    row.forEach((function buildKeyboardColumns(key, keyIndex) {
      var ratio = key.ratio || 1;

      // One key in layout may be used to create multiple keyViews in
      // different pages, so create a unique instance here.
      var target = Object.freeze(Object.create(key));

      var options = {
        classNames: [],
        outputChar: key.uppercaseValue,
        outerRatio: ratio,
        innerRatio: ratio
      };

      if (layout.keyClassName) {
        options.classNames = options.classNames.concat(
          layout.keyClassName.split(' '));
      }

      var layoutWidth = layout.width || 10;
      // Adjust the width of the first and the last key if there are less keys
      // in this row.
      if (layoutWidth != rowLayoutWidth &&
          (keyIndex === 0 || keyIndex === row.length - 1)) {
        options.outerRatio = ratio + ((layoutWidth - rowLayoutWidth) / 2);
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


    this.rows.set(nrow, {
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

  container.setAttribute('lang', layout.lang);

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
  this.options.totalWidth = totalWidth;

  // Set width and height for handwriting pad.
  if (this.handwritingPadView) {
    var placeHolderWidth = totalWidth / (this.layout.width || 10);
    var width = Math.floor(placeHolderWidth *
                             this.layout.handwritingPadOptions.ratio);

    // Get row height
    var height = this.rows.get(0).element.clientHeight *
                 this.layout.handwritingPadOptions.rowspan;
    this.handwritingPadView.resize(width, height);
  }
};

LayoutPageView.prototype.getVisualData = function getVisualData() {
  var totalWidth = this.options.totalWidth;
  var keyArray = this.keyArrays.get(totalWidth);

  if (keyArray) {
    return keyArray;
  }

  keyArray = [];
  // Now that key sizes have been set and adjusted for the row,
  // loop again and record the size and position of each. If we
  // do this as part of the loop above, we get bad position data.
  // We do this in a seperate loop to avoid reflowing
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

  this.keyArrays.set(totalWidth, keyArray);

  return keyArray;
};

// A factory method to create different instances of candidate panel.
// Right now, it depends on the input method name to show different types
// of candidate panels.
LayoutPageView.prototype.createCandidatePanel = function(inputMethodName) {
  var candidatePanel;
  var target = {};
  var options = {
    className: inputMethodName,
    totalWidth: this.options.totalWidth
  };

  switch (inputMethodName) {
    case 'latin':
      candidatePanel =
        new LatinCandidatePanelView(target, options, this.viewManager);
      this.candidatePanelHeight = 3.1;
      break;

    case 'vietnamese':
      options.widthUnit = 1;
      candidatePanel =
        new CandidatePanelView(target, options, this.viewManager);
      break;

    default:
      candidatePanel =
        new CandidatePanelView(target, options, this.viewManager);
      break;
  }

  return candidatePanel;
};

LayoutPageView.prototype.resetCandidatePanel = function() {
  if (!this.candidatePanel) {
    return;
  }

  this.candidatePanel.resetScroll();
};

LayoutPageView.prototype.showCandidates = function(candidates) {
  if (!this.candidatePanel) {
    return;
  }

  this.candidatePanel.showCandidates(candidates);
};

LayoutPageView.prototype.showMoreCandidates = function(rowLimit, candidates) {
  if (!this.candidatePanel) {
    return;
  }

  this.candidatePanel.showMoreCandidates(rowLimit, candidates);
};

LayoutPageView.prototype.getNumberOfCandidatesPerRow = function() {
  if (!this.candidatePanel) {
    return;
  }

  return this.candidatePanel.countPerRow;
};

LayoutPageView.prototype.getHeight = function() {
  var totalWidth = this.options.totalWidth;
  var scale = this.viewManager.screenInPortraitMode() ?
              totalWidth / 32 :
              totalWidth / 64;

  var height = this.rows.size * (5.1 * scale);

  if (this.candidatePanel) {
    height += (this.candidatePanelHeight * scale);
  }

  return height;
};

exports.LayoutPageView = LayoutPageView;

})(window);
