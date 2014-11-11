;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Constants
 */
var ACCELERATION_TIMEOUT = 250;
var ACCELERATION = 20;
var MINIMUM_SNAP_VELOCITY = 5;
var SNAP_ANIMATION_DURATION = 150;

/**
 * Locals
 */

// HACK: Create a <template> in memory at runtime.
// When the custom-element is created we clone
// this template and inject into the shadow-root.
// Prior to this we would have had to copy/paste
// the template into the <head> of every app that
// wanted to use <gaia-header>, this would make
// markup changes complicated, and could lead to
// things getting out of sync. This is a short-term
// hack until we can import entire custom-elements
// using HTML Imports (bug 877072).
var template = document.createElement('template');
template.innerHTML =
`<div class="gaia-carousel-container">
  <div class="gaia-carousel-item-container"></div>
  <div class="gaia-carousel-item-container"></div>
  <div class="gaia-carousel-item-container"></div>
</div>
<style scoped>
  .gaia-carousel-container[data-layout="vertical"] > .gaia-carousel-item-container {
    margin-bottom: 0;
    margin-right: 0;
  }
  .gaia-carousel-item-container {
    margin-bottom: 0;
    margin-right: 0;
  }
</style>`;

/**
 *
 *
 * @private
 */
function clamp(min, max, value) {
  return Math.min(Math.max(min, value), max);
}

/**
 *
 *
 * @private
 */
function toArray(list) {
  return Array.prototype.slice.call(list);
}

/**
 * Load in the the component's styles.
 *
 * We're working around a few platform bugs
 * here related to @import in the shadow-dom
 * stylesheet. When HTML-Imports are ready
 * we won't have to use @import anymore.
 *
 * The `-content` class is added to the element
 * as a simple 'polyfill' for `::content` selector.
 * We can use `.-content` in our CSS to indicate
 * we're styling 'distributed' nodes. This will
 * make the transition to `::content` a lot simpler.
 *
 * @private
 */
function styleHack(carousel) {
  carousel.style.visibility = 'hidden';

  var style = document.createElement('style');
  style.setAttribute('scoped', '');
  style.innerHTML =
`gaia-carousel {
  display: block;
}
.gaia-carousel-container {
  display: flex;
  flex-flow: row nowrap;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.gaia-carousel-container[data-layout="vertical"] {
  flex-flow: column nowrap;
}
.gaia-carousel-item-container {
  flex-shrink: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  will-change: transform;
}
.gaia-carousel-item-container > * {
  width: 100%;
  height: 100%;
}`;

  // There are platform issues around using
  // @import inside shadow root. Ensuring the
  // stylesheet has loaded before putting it in
  // the shadow root seems to work around this.
  style.addEventListener('load', function() {
    carousel.shadowRoot.appendChild(style.cloneNode(true));
    carousel.style.visibility = '';
    carousel.styled = true;
    carousel.dispatchEvent(new CustomEvent('styled'));
  });

  carousel.appendChild(style);
}

/**
 *
 *
 * @private
 */
function configureDir(carousel) {
  var dirAttr = carousel.getAttribute('dir');
  var dir = dirAttr === 'ltr' || dirAttr === 'rtl' ? dirAttr :
    (document.documentElement.getAttribute('dir') || 'ltr');
  if (carousel.dir !== dir) {
    carousel.container.setAttribute('dir', dir);
    carousel.dir = dir;
  }
}

/**
 *
 *
 * @private
 */
function configureLayout(carousel) {
  var layout = carousel.getAttribute('layout') === 'vertical' ?
    'vertical' : 'horizontal';
  if (carousel.layout !== layout) {
    carousel.container.setAttribute('data-layout', layout);
    carousel.layout = layout;
  }
}

/**
 *
 *
 * @private
 */
function configureItemCount(carousel) {
  var attribute = carousel.getAttribute('item-count') || '';
  var itemCount = parseInt(attribute, 10);
  if (itemCount + '' !== attribute.trim()) {
    return;
  }

  if (carousel.itemCount !== itemCount) {
    carousel.itemCount = itemCount;
  }
}

/**
 *
 *
 * @private
 */
function configureItemPadding(carousel) {
  var attribute = carousel.getAttribute('item-padding') || '';
  var itemPadding = parseInt(attribute, 10);
  if (itemPadding + '' !== attribute.trim()) {
    return;
  }

  if (carousel.itemPadding !== itemPadding) {
    carousel.itemPadding = itemPadding;
  }
}

/**
 *
 *
 * @private
 */
function configureDisabled(carousel) {
  var attribute = carousel.getAttribute('disabled');
  var disabled = attribute !== null;
  if (carousel.disabled !== disabled) {
    carousel.disabled = disabled;
  }
}

/**
 *
 *
 * @private
 */
function attachEventListeners(carousel) {
  var shadowRoot = carousel.shadowRoot;

  var lastOffset;
  var startAccelerateTimeStamp;
  var startAccelerateOffset;

  var onTouchStart = function(evt) {
    if (carousel.scrolling || carousel.disabled) {
      return;
    }

    var position = evt.type.indexOf('mouse') !== -1 ? evt : evt.touches[0];
    lastOffset = carousel.layout === 'horizontal' ? position.pageX : position.pageY;    
    startAccelerateTimeStamp = evt.timeStamp;
    startAccelerateOffset = carousel.scrollOffset;

    // Add event listeners
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mouseup', onTouchEnd);

    carousel.scrolling = true;
  };

  var onTouchMove = function(evt) {
    if (!carousel.scrolling || carousel.disabled) {
      return;
    }

    var position = (evt.type.indexOf('mouse') !== -1) ? evt : evt.touches[0];
    var currentOffset = (carousel.layout === 'horizontal') ? position.pageX : position.pageY;
    var deltaOffset = lastOffset - currentOffset;

    // Handle Right-To-Left locales.
    if (carousel.dir === 'rtl' && carousel.layout === 'horizontal') {
      deltaOffset = -deltaOffset;
    }

    carousel.scrollOffset += deltaOffset;

    window.requestAnimationFrame(() => {
      updateScrollOffset(carousel);
    });

    lastOffset = currentOffset;

    // Reset acceleration if sufficient time has passed since the last
    // `touchmove` event
    var accelerationTime = evt.timeStamp - startAccelerateTimeStamp;
    if (accelerationTime > ACCELERATION_TIMEOUT) {
      startAccelerateTimeStamp = evt.timeStamp;
      startAccelerateOffset = carousel.scrollOffset;
    }

    evt.preventDefault();
  };

  var onTouchEnd = function(evt) {
    if (!carousel.scrolling) {
      return;
    }

    // Remove event listeners
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('mousemove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('mouseup', onTouchEnd);

    // Round the scroll offset to determine which item index the
    // scrolling has landed on
    var scrollOffset = carousel.scrollOffset;
    var itemOffset = carousel.itemOffset;
    var relativeItemIndex = Math.round((scrollOffset - itemOffset) / itemOffset);

    // If the item index hasn't changed, but the scrolling velocity
    // has exceeded the threshold, automatically snap to the next/previous
    // item index ("flick" gesture)
    var acceleration = (startAccelerateTimeStamp - evt.timeStamp) / ACCELERATION;
    var velocity = (scrollOffset - startAccelerateOffset) / acceleration;

    if (relativeItemIndex === 0 && Math.abs(velocity) > MINIMUM_SNAP_VELOCITY) {
      relativeItemIndex = (velocity > 0) ? -1 : 1;
    }

    // Clamp the item index within the valid range
    var oldItemIndex = carousel.itemIndex;
    var newItemIndex = clamp(0, carousel.itemCount - 1, oldItemIndex + relativeItemIndex);

    carousel.scrolling = false;

    if (newItemIndex > oldItemIndex) {
      carousel.next();
      return;
    }

    if (newItemIndex < oldItemIndex) {
      carousel.previous();
      return;
    }

    var targetScrollOffset = carousel.itemOffset + carousel.itemPadding;
    snapScrollOffset(carousel, targetScrollOffset, SNAP_ANIMATION_DURATION);
  };

  var onResize = function(evt) {
    resetScrollOffset(carousel);
  };

  // Attach event listeners
  shadowRoot.addEventListener('touchstart', onTouchStart);
  shadowRoot.addEventListener('mousedown', onTouchStart);
  window.addEventListener('resize', onResize);
}

/**
 *
 *
 * @private
 */
function animate(carousel, direction) {
  var oldItemIndex = carousel.itemIndex;
  var newItemIndex = clamp(0, carousel.itemCount - 1, carousel.itemIndex + direction);

  if (oldItemIndex === newItemIndex) {
    return;
  }

  var container = carousel.container;
  
  if (direction === 1) {
    setNextItemVisible(carousel, true);
    container.appendChild(container.firstElementChild);

    carousel.scrollOffset -= carousel.itemOffset;

    renderItem(carousel, container.lastElementChild, newItemIndex + direction);
  } else {
    setPreviousItemVisible(carousel, true);
    container.insertBefore(container.lastElementChild, container.firstElementChild);
    
    carousel.scrollOffset += carousel.itemOffset;

    renderItem(carousel, container.firstElementChild, newItemIndex + direction);
  }

  updateScrollOffset(carousel);

  window.requestAnimationFrame(() => {
    carousel.dispatchEvent(new CustomEvent('willresetitem', {
      detail: {
        index: oldItemIndex,
        element: container.firstElementChild
      }
    }));

    carousel.dispatchEvent(new CustomEvent('changing', {
      detail: {
        oldItemIndex: oldItemIndex,
        newItemIndex: newItemIndex
      }
    }));

    carousel._itemIndex = newItemIndex;
  
    var targetScrollOffset = carousel.itemOffset + carousel.itemPadding;
    snapScrollOffset(carousel, targetScrollOffset, SNAP_ANIMATION_DURATION, () => {
      carousel.dispatchEvent(new CustomEvent('changed', {
        detail: {
          oldItemIndex: oldItemIndex,
          newItemIndex: newItemIndex
        }
      }));
    });
  });
}

/**
 *
 *
 * @private
 */
function resetScrollOffset(carousel) {
  carousel.itemOffset = carousel.layout === 'horizontal' ?
    carousel.offsetWidth : carousel.offsetHeight;
  carousel.scrollOffset = carousel.itemOffset + carousel.itemPadding;

  updateScrollOffset(carousel);
}

/**
 *
 *
 * @private
 */
function updateScrollOffset(carousel) {
  var scrollOffset = carousel.scrollOffset;
  var itemOffsetWithPadding = carousel.itemOffset + carousel.itemPadding;

  // If we're scrolling towards the next item in the carousel,
  // explicitly hide the previous item for maximum performance.
  setPreviousItemVisible(carousel, scrollOffset < itemOffsetWithPadding);

  // If we're scrolling towards the previous item in the carousel,
  // explicitly hide the next item for maximum performance.
  setNextItemVisible(carousel, scrollOffset > itemOffsetWithPadding);

  // Handle Right-To-Left locales.
  if (carousel.dir === 'rtl' && carousel.layout === 'horizontal') {
    scrollOffset = -scrollOffset - carousel.itemPadding;
  }

  if (carousel.layout === 'horizontal') {
    carousel.container.scrollTo({ left: scrollOffset, top: 0 });
  }

  else {
    carousel.container.scrollTo({ left: 0, top: scrollOffset });
  }
}

/**
 * Explicitly hides the previous item in the carousel to prevent
 * the layer from painting. #PERF
 *
 * @private
 */
function setPreviousItemVisible(carousel, visible) {
  if (carousel._previousItemVisibile === visible) {
    return;
  }

  carousel.container.firstElementChild.style.visibility =
    visible ? 'visible' : 'hidden';
  carousel._previousItemVisibile = visible;
}

/**
 * Explicitly hides the next item in the carousel to prevent
 * the layer from painting. #PERF
 *
 * @private
 */
function setNextItemVisible(carousel, visible) {
  if (carousel._nextItemVisibile === visible) {
    return;
  }

  carousel.container.lastElementChild.style.visibility =
    visible ? 'visible' : 'hidden';
  carousel._nextItemVisibile = visible;
}

/**
 *
 *
 * @private
 */
function snapScrollOffset(carousel, scrollOffset, duration, callback) {
  var startOffset = carousel.scrollOffset;
  var deltaOffset = scrollOffset - startOffset;

  var startTime;
  var lastTime;

  var tick = function(time) {

    // Stop animation if scrolling begins before animation completes
    if (carousel.scrolling) {
      return;
    }

    if (!startTime) {
      startTime = lastTime = time;
    }

    var deltaTime = (time - lastTime) / duration;

    if (time - startTime < duration) {
      lastTime = time;
      
      carousel.scrollOffset += deltaOffset * deltaTime;

      window.requestAnimationFrame((time) => {
        updateScrollOffset(carousel);
        tick(time);
      })
    }

    else {
      carousel.scrollOffset = scrollOffset;

      window.requestAnimationFrame(() => {
        updateScrollOffset(carousel);

        if (typeof callback === 'function') {
          callback();
        }
      });
    }
  };

  window.requestAnimationFrame(tick);
}

/**
 *
 *
 * @private
 */
function renderItem(carousel, itemContainer, itemIndex) {
  itemContainer.innerHTML = '';

  if (itemIndex < 0 || itemIndex >= carousel.itemCount) {
    return;
  }

  var item = carousel.items[itemIndex];
  if (item) {
    itemContainer.appendChild(item);
  }

  carousel.dispatchEvent(new CustomEvent('willrenderitem', {
    detail: {
      index: itemIndex,
      element: itemContainer
    }
  }));
}

/**
 *
 *
 * @private
 */
function renderItems(carousel) {
  if (carousel.itemCount === 0) {
    return;
  }

  var shadowRoot = carousel.shadowRoot;
  var itemContainers = carousel.container.children;

  for (var i = 0; i <= 2; i++) {
    renderItem(carousel, itemContainers[i], carousel.itemIndex + i - 1);
  }

  resetScrollOffset(carousel);
}

/**
 *
 *
 * @private
 */
function getStyle(carousel, selector) {
  var shadowRoot = carousel.shadowRoot;
  var styleElement = shadowRoot.querySelector('style');
  var cssRules = styleElement.sheet.cssRules;

  for (var i = 0, length = cssRules.length; i < length; i++) {
    if (cssRules[i].selectorText === selector) {
      return cssRules[i].style;
    }
  }

  return null;
}

/**
 *
 *
 * @private
 */
function observeDir(carousel) {
  var observer = new MutationObserver(onAttributeChanged);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['dir']
  });

  function onAttributeChanged(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.attributeName === 'dir') {
        configureDir(carousel);
        resetScrollOffset(carousel);
      }
    });
  }
}

/**
 * Element prototype, extends from HTMLElement
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

proto.previous = function() {
  animate(this, -1);
};

proto.next = function() {
  animate(this, 1);
};

proto.refresh = function() {
  renderItems(this);
};

/**
 * Called when the element is first created.
 *
 * Here we create the shadow-root and
 * inject our template into it.
 *
 * @private
 */
proto.createdCallback = function() {
  var shadow = this.createShadowRoot();
  var tmpl = template.content.cloneNode(true);

  this.container = tmpl.querySelector('.gaia-carousel-container');

  // Automatically use child elements as items (if provided)
  this.items = toArray(this.children).filter(function(element) {
    var tagName = element.tagName;
    return tagName !== 'SCRIPT' && tagName !== 'STYLE';
  });

  if (this.items.length > 0) {
    this.setAttribute('item-count', this.items.length);
  }

  shadow.appendChild(tmpl);

  styleHack(this);
  observeDir(this);
  configureDir(this);
  configureLayout(this);
  configureItemCount(this);
  configureItemPadding(this);
  attachEventListeners(this);
  resetScrollOffset(this);

  this.initialized = true;
};

/**
 * Called when one of the attributes
 * on the element changes.
 *
 * @private
 */
proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'dir':
      configureDir(this);
      break;
    case 'layout':
      configureLayout(this);
      break;
    case 'item-count':
      configureItemCount(this);
      break;
    case 'item-padding':
      configureItemPadding(this);
      break;
    case 'disabled':
      configureDisabled(this);
      break;
  }
};

// Flag indicating if scrolling is in-progress
proto.scrolling = false;

// Item width/height
proto.itemOffset = 0;

// Container scrollLeft/scrollTop
proto.scrollOffset = 0;

// Locale direction
Object.defineProperty(proto, 'dir', {
  get: function() {
    return this._dir || 'ltr';
  },

  set: function(value) {
    if (this._dir === value) {
      return;
    }

    this._dir = value;
    this.container.setAttribute('dir', this._dir);

    resetScrollOffset(this);
  }
});

// Index of current item
Object.defineProperty(proto, 'itemIndex', {
  get: function() {
    return this._itemIndex || 0;
  },

  set: function(value) {
    if (this._itemIndex === value) {
      return;
    }

    this._itemIndex = value;

    setTimeout(() => {
      renderItems(this);
    }, 1);
  }
});

// Number of items
Object.defineProperty(proto, 'itemCount', {
  get: function() {
    return this._itemCount || 0;
  },

  set: function(value) {
    if (this._itemCount === value) {
      return;
    }

    this._itemCount = value;
    this.setAttribute('item-count', this._itemCount);

    if (!this.container) {
      return;
    }

    this.itemIndex = 0;
  }
});

// Padding between items
Object.defineProperty(proto, 'itemPadding', {
  get: function() {
    return this._itemPadding || 0;
  },

  set: function(value) {
    if (this._itemPadding === value) {
      return;
    }

    this._itemPadding = value;
    this.setAttribute('item-padding', this._itemPadding);

    var verticalStyle = getStyle(this,
      '.gaia-carousel-container[data-layout="vertical"] > ' +
      '.gaia-carousel-item-container');
    var horizontalStyle = getStyle(this, '.gaia-carousel-item-container');

    verticalStyle.marginBottom = this._itemPadding + 'px';
    horizontalStyle.marginRight = this._itemPadding + 'px';

    resetScrollOffset(this);
  }
});

// Disabled flag
Object.defineProperty(proto, 'disabled', {
  get: function() {
    return this._disabled || false;
  },

  set: function(value) {
    if (this._disabled === !!value) {
      return;
    }

    this._disabled = !!value;
    if (this._disabled) {
      this.setAttribute('disabled', true);

      resetScrollOffset(this);
    } else {
      this.removeAttribute('disabled');
    }
  }
});

var GaiaCarousel = document.registerElement('gaia-carousel', { prototype: proto });

GaiaCarousel.LAYOUT_HORIZONTAL = 'horizontal';
GaiaCarousel.LAYOUT_VERTICAL = 'vertical';

// Export the constructor and expose
// the `prototype` (Bug 1048339).
module.exports = GaiaCarousel;
module.exports._prototype = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-carousel',this));
