/* global define */
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Pointer event abstraction to make
 * it work for touch and mouse.
 *
 * @type {Object}
 */
/*jshint ignore:start */
var pointer = [
  { down: 'touchstart', up: 'touchend', move: 'touchmove' },
  { down: 'mousedown', up: 'mouseup', move: 'mousemove' }
]['ontouchstart' in window ? 0 : 1];
/*jshint ignore:end */

/**
 * Exports
 */

module.exports = component.register('gaia-list', {
  extends: HTMLUListElement.prototype,

  created: function() {
    this.setupShadowRoot();
    this.els = { inner: this.shadowRoot.querySelector('.inner') };
    this.addEventListener('click', this.onPointerDown);
    this.makeAccessible();
  },

  makeAccessible: function() {
    [].forEach.call(this.children, (el) => { el.tabIndex = 0; });
  },

  itemShouldRipple: function(el) {
    if (scrolling) { return false; }
    else if (el.classList.contains('ripple')) { return true; }
    else if (el.classList.contains('no-ripple')) { return false; }
    else if (this.classList.contains('ripple')){ return true; }
    else if (this.classList.contains('no-ripple')){ return false; }
    else if (el.tagName === 'A') { return true; }
    else { return false; }
  },

  onPointerDown: function(e) {
    var point = e.touches ? e.changedTouches[0] : e;
    var target = this.getChild(e.target);

    if (!this.itemShouldRipple(target)) { return; }

    var pos = {
      list: this.getBoundingClientRect(),
      item: target.getBoundingClientRect()
    };

    var els = {
      container: document.createElement('div'),
      ripple: document.createElement('div')
    };

    requestAnimationFrame(this.ripple.bind(this, point, pos, els));
  },

  ripple: function(point, pos, els) {
    els.container.className = 'ripple-container';
    els.container.style.left = (pos.item.left - pos.list.left) + 'px';
    els.container.style.top = (pos.item.top - pos.list.top) + 'px';
    els.container.style.width = pos.item.width + 'px';
    els.container.style.height = pos.item.height + 'px';

    var offset = {
      x: point.clientX - pos.item.left,
      y: point.clientY - pos.item.top
    };

    els.ripple.className = 'ripple';
    els.ripple.style.left = offset.x + 'px';
    els.ripple.style.top = offset.y + 'px';
    els.ripple.style.visibility = 'hidden';

    els.container.appendChild(els.ripple);
    this.els.inner.appendChild(els.container);

    var end = 'transitionend';
    requestAnimationFrame(function() {
      els.ripple.style.visibility = '';
      els.ripple.style.transform = 'scale(' + pos.item.width + ')';
      els.ripple.style.transitionDuration = '500ms';

      els.ripple.addEventListener(end, function fn() {
        els.ripple.removeEventListener(end, fn);
        els.ripple.style.transitionDuration = '1000ms';
        els.ripple.style.opacity = '0';

        els.ripple.addEventListener(end, function fn() {
          els.ripple.removeEventListener(end, fn);
          els.container.remove();
        });
      });
    });
  },

  getChild: function(el) {
    return el && (el.parentNode === this ? el : this.getChild(el.parentNode));
  },

  template: `
    <div class="inner">
      <content></content>
    </div>

    <style>

    /** Reset
     ---------------------------------------------------------*/

    label { background: none; }

    /** Host
     ---------------------------------------------------------*/

    :host {
      position: relative;

      display: block;
      overflow: hidden;
      font-size: 17px;
    }

    /** Children
     ---------------------------------------------------------*/

    ::content > *:not(style) {
      position: relative;
      z-index: 2;

      box-sizing: border-box;
      display: flex;
      width: 100%;
      min-height: 60px;
      padding: 9px 16px;
      margin: 0;
      border: 0;
      outline: 0;

      font-size: 18px;
      font-weight: normal;
      font-style: normal;
      background: transparent;
      align-items: center;
      list-style-type: none;

      color:
        var(--text-color);
    }

    ::content > a {
      cursor: pointer;
    }

    /** Titles
     ---------------------------------------------------------*/

    ::content h1,
    ::content h2,
    ::content h3,
    ::content h4 {
      font-weight: 400;
    }

    /** Layout Helpers
     ---------------------------------------------------------*/

    /**
     * [flexbox]
     *
     * A helper attribute to allow users to
     * quickly define content as a flexbox.
     */

    ::content [flexbox] {
      display: flex;
    }

    /**
     * [flex]
     *
     * A helper attribute to allow users to
     * quickly define area as flexible.
     */

    ::content [flex] {
      flex: 1;
    }

    /** Border
     ---------------------------------------------------------*/

    ::content > *:before {
      content: '';
      position: absolute;
      top: 0px;
      left: 16px;
      right: 16px;
      height: 1px;

      background:
        var(--border-color,
        var(--background-plus));
    }

    /* Hack: Hide the line before the second element, since the first element is
     * the <style scoped> element */
    ::content > :first-child:before,
    ::content > style:first-child ~ :nth-child(2):before,
    ::content > gaia-header:first-child ~ :nth-child(2):before,
    ::content > gaia-sub-header:first-child ~ :nth-child(2):before,
    ::content > h1:first-child ~ :nth-child(2):before,
    ::content > h2:first-child ~ :nth-child(2):before,
    ::content > .borderless:before {
      display: none;
    }

    /** Descriptions
     ---------------------------------------------------------*/

    ::content small,
    ::content p {
      font-size: 0.7em;
      line-height: 1.35em;
    }

    /** Icon
     ---------------------------------------------------------*/

    ::content i {
      display: inline-block;
      width: 40px;
    }

    ::content i:before {
      display: block;
    }

    ::content > * > i:last-child {
      width: auto;
    }

    /**
     * Reverse the icons when the document is RTL mode
     */

    :host-context([dir=rtl]) ::content i:before {
      transform: scale(-1, 1);
      text-align: end;
    }

    /** Divided
     ---------------------------------------------------------*/

    ::content .divided {
      -moz-border-start: solid 1px;
      -moz-padding-start: 14px;

      border-color:
        var(--border-color,
        var(--background-plus));
    }

    /** Ripple Container
     ---------------------------------------------------------*/

    .ripple-container.ripple-container {
      box-sizing: content-box;
      position: absolute;
      z-index: -1;
      padding-top: 1px;
      overflow: hidden;
    }

    /** Ripple
     ---------------------------------------------------------*/

    .ripple-container > .ripple {
      background: var(--border-color);
      position: absolute;
      left: 0;
      top: 0;
      width: 2px;
      height: 2px;
      margin: -1px;
      border-radius: 50%;
      transition-property: transform, opacity;
      will-change: transform;
    }

    </style>
  `
});

var scrolling = false;
var scrollTimeout;

addEventListener('scroll', function() {
  scrolling = true;
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(function() {
    scrolling = false;
  }, 100);
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-list',this));
