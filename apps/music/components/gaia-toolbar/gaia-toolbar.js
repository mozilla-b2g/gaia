;(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var GaiaDialogMenu = require('gaia-dialog-menu');

/**
 * Locals
 */

var forEach = [].forEach;
var slice = [].slice;

/**
 * Extend from the `HTMLElement` prototype
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function() {
  this.createShadowRoot().innerHTML = template;

  this.els = {
    inner: this.shadowRoot.querySelector('.inner'),
    moreButton: this.shadowRoot.querySelector('.more-button')
  };

  this.els.moreButton.addEventListener('click', this.openOverflow.bind(this));

  var self = this;
  this.reflow_raf = rafWrap(this.reflow, this);
  addEventListener('resize', this.reflow_raf);
  this.shadowStyleHack();

  if (document.readyState === 'loading') {
    addEventListener('load', this.reflow.bind(this));
    return;
  }

  this.style.visibility = 'hidden';
  self.reflow_raf();
};

proto.attachedCallback = function() {
  this.style.visibility = 'hidden';
  this.reflow_raf();
};

proto.reflow = function() {
  this.release();
  var overflow = this.getOverflowData();
  if (overflow.overflowed) { this.onOverflowed(overflow); }
  this.style.visibility = '';
};

proto.getOverflowData = function() {
  var space = this.els.inner.clientWidth;
  var child = this.children[0];
  var overflowed = false;
  var willFit = 0;
  var total = 0;
  var overflow;
  var width;

  while (child) {
    width = child.clientWidth;
    overflow = width + total - space;

    if (overflow > 3) {
      overflowed = true;
      break;
    }

    willFit++;
    total += width;
    child = child.nextElementSibling;
  }

  return {
    willFit: willFit,
    remaining: space - total,
    overflowed: overflowed
  };
};

proto.onOverflowed = function(overflow) {
  var items = slice.call(this.children, 0, -1);
  var minMoreButtonWidth = 70;
  var extra = overflow.remaining < minMoreButtonWidth ? 1 : 0;
  var numToHide = items.length - overflow.willFit + extra;

  this.hiddenChildren = slice.call(items, 0 - numToHide);
  this.hiddenChildren.forEach(function(el) { el.classList.add('overflowing'); });
  this.els.inner.classList.add('overflowed');
};

proto.release = function() {
  if (!this.hiddenChildren) { return; }
  this.els.inner.classList.remove('overflowed');
  forEach.call(this.hiddenChildren, function(el) {
    el.classList.remove('overflowing');
  });
};

proto.getTotalItemLength = function() {
  return [].reduce.call(this.children, function(total, el) {
    return total + el.clientWidth;
  }, 0);
};

proto.shadowStyleHack = function() {
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

proto.openOverflow = function(e) {
  this.dialog = new GaiaDialogMenu();

  this.hiddenChildren.forEach(function(el) {
    this.dialog.appendChild(el);
    el.classList.remove('overflowing');
  }, this);

  this.appendChild(this.dialog);
  this.dialog.addEventListener('click', this.dialog.close.bind(this.dialog));
  this.dialog.addEventListener('closed', this.onDialogClosed.bind(this));
  this.dialog.open(e);
};

proto.onDialogClosed = function() {
  this.dialog.remove();
  this.dialog = null;

  this.hiddenChildren.forEach(function(el) {
    el.classList.add('overflowing');
    this.insertBefore(el, this.lastChild);
  }, this);

};

var template = `
<style>

/** Reset
 ---------------------------------------------------------*/

::-moz-focus-inner { border: 0; }

/** Host
 ---------------------------------------------------------*/

.-host {
  display: block;
}

/** Inner
 ---------------------------------------------------------*/

.inner {
  display: flex;
  height: 45px;
  overflow: hidden;

  border-top: 1px solid;
  border-color:
    var(--border-color,
    var(--background-plus));

  justify-content: space-between;
}

/** Direct Children
 ---------------------------------------------------------*/

.-content > *,
.more-button {
  box-sizing: border-box;
  flex: 1 0 0;
  height: 100%;
  margin: 0;
  padding: 0 6px;
  border: 0;
  font-size: 17px;
  line-height: 45px;
  font-style: italic;
  font-weight: lighter;
  background: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms 300ms;

  color:
    var(--text-color, inherit);
}

/**
 * :active
 */

.more-button :active,
.-content > :active {
  transition: none;
  color: var(--highlight-color);
}

/**
 * .overflowing
 */

.-content > .overflowing {
  display: none;
}

/**
 * [disabled]
 */

.-content > [disabled] {
  pointer-events: none;
  opacity: 0.3;
}

.-content > [data-icon] {
  font-size: 0;
}

/** Style
 ---------------------------------------------------------*/

style {
  display: none !important;
}

/** More Button
 ---------------------------------------------------------*/

.more-button {
  display: none;
  flex: 0.7;
}

/** More Button Icon
 ---------------------------------------------------------*/

.more-button:before {
  font-family: 'gaia-icons';
  font-weight: 500;
  content: 'more';
  text-rendering: optimizeLegibility;
  font-style: normal;
  font-size: 32px;
}

/**
 * .overflowed
 */

.overflowed .more-button {
  display: block;
}

</style>

<div class="inner">
  <content></content>
  <button class="more-button"></button>
</div>`;


function rafWrap(fn, ctx) {
  var raf = requestAnimationFrame;
  var frame;

  return function() {
    if (frame) { return; }
    var args = arguments;

    frame = raf(function() {
      raf(function() {
        frame = null;
        fn.apply(ctx, arguments);
      });
    });
  };
}

// Register and expose the constructor
try {
  module.exports = document.registerElement('gaia-toolbar', { prototype: proto });
  module.exports.proto = proto;
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-toolbar',this));
