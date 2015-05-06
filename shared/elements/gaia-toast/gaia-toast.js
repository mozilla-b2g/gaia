;(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Exports
 */

module.exports = component.register('gaia-toast', {

  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      bread: this.shadowRoot.querySelector('.bread')
    };

    this.timeout = this.getAttribute('timeout');
  },


  show: function() {
    this.els.bread.removeEventListener('animationend', this.onAnimateOutEnd);
    clearTimeout(this.hideTimeout);

    this.els.inner.classList.add('visible');
    var reflow = this.els.inner.offsetTop;
    this.els.bread.classList.remove('animate-out');
    this.els.bread.classList.add('animate-in');
    this.hideTimeout = setTimeout(this.hide.bind(this), this.timeout);
  },

  hide: function() {
    var self = this;

    clearTimeout(this.hideTimeout);
    this.els.bread.classList.remove('animate-in');
    this.els.bread.classList.add('animate-out');

    this.els.bread.removeEventListener('animationend', this.onAnimateOutEnd);
    this.onAnimateOutEnd = function() {
      self.els.bread.removeEventListener('animationend', self.onAnimateOutEnd);
      self.els.bread.classList.remove('animate-out');
      self.els.inner.classList.remove('visible');
    };

    this.els.bread.addEventListener('animationend', this.onAnimateOutEnd);
  },

  animateOut: function() {},

  attrs: {
    timeout: {
      get: function() { return this.getAttribute('timeout') || 1000; },
      set: function(value) {
        var current = this.getAttribute('timeout');
        if (current == value) { return; }
        else if (!value) { this.removeAttribute('timeout'); }
        else { this.setAttribute('timeout', value); }
      }
    }
  },

  template: `
    <div class="inner">
      <div class="bread">
        <content></content>
      </div>
    </div>

    <style>

    /** Host
     ---------------------------------------------------------*/

    :host {
      position: fixed;
      left: 0;
      bottom: 0;
      width: 100%;
      font-style: italic;
      text-align: center;
      z-index: 100;

      color:
        var(--highlight-color);
    }

    /** Inner
      ---------------------------------------------------------*/

    .inner {
      display: none;
      padding: 16px;
    }

    .inner.visible {
      display: block;
    }

    /**
     ---------------------------------------------------------*/

    .bread {
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
      box-shadow: 0px 1px 0px 0px rgba(0, 0, 0, 0.15);
      transform: translateY(100%);

      background:
        var(--background-plus,
        white);
    }

    .bread.animate-in {
      animation-name: gaia-toast-enter;
      animation-fill-mode: forwards;
      animation-duration: 300ms;
    }

    .bread.animate-out {
      animation-name: gaia-toast-leave;
      animation-duration: 600ms;
      transform: translateY(0%);
    }

    </style>
  `,

  globalCss: `
    @keyframes gaia-toast-enter {
      0% {
        transform: translateY(100%);
        opacity: 0;
      }

      40% {
        opacity: 0;
      }

      100% {
        transform: translateY(0%);
        opacity: 1;
      }
    }

    @keyframes gaia-toast-leave {
      0% {
        opacity: 1;
      }

      100% {
        opacity: 0;
      }
    }
  `
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-toast',this));
