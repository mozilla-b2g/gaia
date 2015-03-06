'use strict';

/* global EmojiKeyView, KeyView */

(function(exports) {

/**
 * SwipeablePanelView is used to render a panel that is swipeable to go through
 * several sections.
 */

function SwipeablePanelView(layout, options, viewManager) {
  this.layout = layout;
  this.options = options;
  this.viewManager = viewManager;

  this.sections = [];
  this.currentSectionIndex = 0;

  this.indicators = [];

  this.startX = 0;
}

SwipeablePanelView.prototype.COLUMN_COUNT = 6;

SwipeablePanelView.prototype.KEY_COUNT_PER_PANEL = 18;

SwipeablePanelView.prototype.SWIPE_THRESHOLD = 20;

SwipeablePanelView.prototype.render = function() {
  var panel = document.createElement('div');
  panel.classList.add('swipe-panel');

  panel.addEventListener('touchstart', this);

  var i = 0;
  while (true) {
    var section = this._renderSection(i);
    if (!section) {
      break;
    }
    this.sections.push(section);

    section.classList.add('swipe-section');
    panel.appendChild(section);
    i++;
  }

  // Create section indicator
  var indicatorContainer = document.createElement('div');
  indicatorContainer.classList.add('section-indicator-container');
  for (var j = 0; j < this.sections.length; j++) {
    var dot = document.createElement('span');
    dot.classList.add('section-indicator');
    this.indicators.push(dot);
    indicatorContainer.appendChild(dot);
  }
  this._updateIndicator();

  panel.appendChild(indicatorContainer);
  this.element = panel;
};

SwipeablePanelView.prototype.gotoSection = function(index) {
  // Stay on the current section.
  if (index === this.currentSectionIndex) {
    var currentPos = this.sections[this.currentSectionIndex].
      getBoundingClientRect();
    if (currentPos.left !== 0) {
      // Move the previous section backwards
      if (index > 0) {
        this._moveSection(index - 1, -this.options.totalWidth);
      }

      this._moveSection(index, 0);

      // Move the next section forwards
      if (index < this.sections.length - 1) {
        this._moveSection(index + 1, this.options.totalWidth);
      }
    }

    return;
  }

  this._moveSection(index, 0);

  var forward = (index >= this.currentSectionIndex) ? 1 : -1;
  // Move the original section
  this._moveSection(this.currentSectionIndex,
                    -forward * this.options.totalWidth);

  this.currentSectionIndex = index;
  this._updateIndicator();
};

SwipeablePanelView.prototype._moveSection = function(index, distance) {
  var style = this.sections[index].style;
  style.transform = 'translateX(' + distance + 'px)';
  style.transition = 'transform ' + 300 + 'ms ease';
};

SwipeablePanelView.prototype._updateIndicator = function() {
  // Change the section indicator.
  this.indicators.forEach(function(indicator, index) {
      indicator.classList.toggle('active',
        (index == this.currentSectionIndex));
  }, this);
};

SwipeablePanelView.prototype.handleEvent = function(evt) {
  var totalWidth;

  switch (evt.type) {
    case 'touchstart':
      this.touchStartTimestamp = evt.timeStamp;
      this.startX = evt.touches[0].pageX;
      this.deltaX = 0;
      this.element.addEventListener('touchmove', this);
      break;

    case 'touchmove':
      // Clear all transition styles
      this.sections.forEach(function(section) {
        section.style.transition = '';
      });

      totalWidth = this.options.totalWidth;
      var currentX = evt.touches[0].pageX;
      this.deltaX = currentX - this.startX;

      var previous;
      var next;
      var current;
      var forward = this.deltaX < 0;

      if (this.currentSectionIndex === 0) {
        if (forward) {
          this.sections[1].style.transform =
            'translateX(' + (totalWidth + this.deltaX) + 'px)';
          this.sections[0].style.transform =
            'translateX(' + this.deltaX + 'px)';
        } else {
          this.startX = currentX;
        }
      } else if (this.currentSectionIndex === this.sections.length - 1) {
        previous =
          this.sections[this.currentSectionIndex - 1].style;

        if (this.deltaX >= 0) {
          previous.transform =
            'translateX(' + (-totalWidth + this.deltaX) + 'px)';
          this.sections[this.currentSectionIndex].style.transform =
            'translateX(' + this.deltaX + 'px)';
        } else {
          this.startX = currentX;
        }
      } else {
        previous = this.sections[this.currentSectionIndex - 1].style;
        next = this.sections[this.currentSectionIndex + 1].style;
        if (this.deltaX >= 0) {
          previous.transform =
            'translateX(' + (-totalWidth + this.deltaX) + 'px)';
          // If we change direction make sure there isn't any part
          // of the page on the other side that stays visible.
          if (forward) {
            forward = false;
            next.transform = 'translateX(' + totalWidth + 'px)';
          }
        } else {
          next.transform = 'translateX(' + (totalWidth + this.deltaX) + 'px)';
          // If we change direction make sure there isn't any part
          // of the page on the other side that stays visible.
          if (!forward) {
            forward = true;
            previous.transform =
              'translateX(-' + totalWidth + 'px)';
          }
        }

        current = this.sections[this.currentSectionIndex].style;
        current.transform = 'translateX(' + this.deltaX + 'px)';
      }

      this.element.addEventListener('touchend', this);
      break;

    case 'touchend':
      this.element.removeEventListener('touchmove', this);
      // If the actual distance plus the coast distance is more than 20px,
      // transition to the next page.
      // XXX: need a better way to decide when to go to the other page.
      var targetIndex = this.currentSectionIndex;
      if (Math.abs(this.deltaX) > this.SWIPE_THRESHOLD) {
        forward = this.deltaX < 0;
        if (forward && this.currentSectionIndex < this.sections.length - 1) {
          targetIndex = this.currentSectionIndex + 1;
        } else if (!forward && this.currentSectionIndex > 0) {
          targetIndex = this.currentSectionIndex - 1;
        }
      }

      this.gotoSection(targetIndex);
      break;
  }
};

SwipeablePanelView.prototype._renderSection = function(index) {
  var panelKeys = this.layout.panelKeys;

  var startIndex = this.KEY_COUNT_PER_PANEL * index;
  if (startIndex >= panelKeys.length) {
    return null;
  }

  var endIndex = Math.min(startIndex + this.KEY_COUNT_PER_PANEL,
                          panelKeys.length);

  var section = document.createElement('div');
  for (var i = startIndex; i < endIndex; i++) {
    var keyView = this._createKeyView(panelKeys[i]);
    keyView.render();
    section.appendChild(keyView.element);
  }

  // Create a dummy element to make the UI look like a grid.
  var itemCount =  i - startIndex;
  if (itemCount % this.COLUMN_COUNT !== 0) {
    var dummyEl = document.createElement('span');
    dummyEl.style.flex = this.COLUMN_COUNT - (itemCount % this.COLUMN_COUNT);
    section.appendChild(dummyEl);
  }

  this.element = section;
  return section;
};

SwipeablePanelView.prototype._createKeyView = function(keyObject) {
  var target = Object.create(keyObject);
  // Set selection property as true, so it won't trigger send key when
  // swiping.
  target.selection = true;

  var keyView;

  switch (target.type) {
    case 'emoji':
      keyView = new EmojiKeyView(target, {}, this.viewManager);
      break;
    default:
      keyView = new KeyView(target, {}, this.viewManager);
      break;
  }

  return keyView;
};

exports.SwipeablePanelView = SwipeablePanelView;
})(window);
