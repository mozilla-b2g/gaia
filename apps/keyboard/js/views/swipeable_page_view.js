'use strict';

/* global LayoutPageView, KeyView, SwipeablePanelView */

(function(exports) {
/**
 * SwipeablePageView is used to render a swipeable page,
 * like the pages in emoji layout.
 */

function SwipeablePageView() {
  LayoutPageView.apply(this, arguments);
}

SwipeablePageView.prototype = Object.create(LayoutPageView.prototype);

SwipeablePageView.prototype.render = function() {
  var layout = this.layout;

  var container = document.createElement('div');
  this.element = container;

  if (this.options.classNames) {
    container.classList.add.apply(container.classList, this.options.classNames);
  }

  if (layout.specificCssRule) {
    container.classList.add(layout.layoutName);
  }

  var swipeablePanel = new SwipeablePanelView(this.layout,
      { totalWidth: this.options.totalWidth },
      this.viewManager);
  swipeablePanel.render();

  container.appendChild(swipeablePanel.element);

  this._renderKeys();

  // XXX: need this so that the switching keys would be visible.
  if (!layout.secondLayout) {
    container.classList.add('uppercase-only');
  }
};

SwipeablePageView.prototype._renderKeys = function() {
  var layout = this.layout;

  // Render the bottom row for switching different type of emojis
  layout.keys.forEach(function buildKeyboardRow(row) {
    var kbRow = document.createElement('div');
    kbRow.classList.add('keyboard-row', 'swipe-switching-buttons');

    row.forEach(function buildKeyboardColumns(key, keyIndex) {
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

      var keyView = new KeyView(target, options, this.viewManager);
      keyView.render();
      kbRow.appendChild(keyView.element);
    }, this);

    this.element.appendChild(kbRow);
  }, this);
};

SwipeablePageView.prototype.getHeight = function() {
  return this.element.clientHeight;
};

exports.SwipeablePageView = SwipeablePageView;

})(window);
