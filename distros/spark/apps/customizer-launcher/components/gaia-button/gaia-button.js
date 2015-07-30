(function(define){define(function(require,exports,module){
/*jshint esnext:true*/
'use strict';

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Exports
 */

module.exports = component.register('gaia-button', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      content: this.shadowRoot.querySelector('.content')
    };

    this.circular = this.hasAttribute('circular');
    this.disabled = this.hasAttribute('disabled');
    this.setAttribute('role', 'button');
    this.tabIndex = 0;
  },

  attrs: {
    circular: {
      get: function() { this.getAttribute('circular'); },
      set: function(value) {
        value = !!(value === '' || value);
        if (value) {
          this.setAttribute('circular', '');
          this.els.inner.setAttribute('circular', '');
        } else {
          this.removeAttribute('circular');
          this.els.inner.removeAttribute('circular');
        }
      }
    },

    disabled: {
      get: function() { this.getAttribute('disabled'); },
      set: function(value) {
        value = !!(value === '' || value);
        if (value) {
          this.setAttribute('disabled', '');
          this.els.inner.setAttribute('disabled', '');
        } else {
          this.removeAttribute('disabled');
          this.els.inner.removeAttribute('disabled');
        }
      }
    }
  },

  template: `
    <div class="inner">
      <div class="background"></div>
      <div class="content"><content></content></div>
    </div>

    <style>

    :host {
      display: block;
      box-sizing: border-box;
      height: 50px;
      min-width: 50%;
      margin: var(--base-m, 18px);
      outline: 0;
      font-style: italic;
      font-size: 17px;
    }

    @media(min-width:500px) {
      :host { min-width: 140px; }
    }

    :host([circular]) {
      width: 50px;
      min-width: 0;
    }

    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }

    /** Inner
     ---------------------------------------------------------*/

    .inner {
      position: relative;
      height: 100%;
      border-radius: 50px;
      overflow: hidden;
      cursor: pointer;
      -moz-user-select: none;
      line-height: 1;
      transition: color 0ms 300ms;

      background:
        var(--button-background,
        var(--input-background,
        var(--background-plus,
        #fff)));

      color:
        var(--button-color,
        var(--text-color,
        inherit));

      box-shadow:
        var(--button-box-shadow,
        var(--box-shadow,
        none));
    }

    /**
     * [circular]
     */

    .inner[circular] {
      border-radius: 50%;
    }

    /**
     * .pressed
     */

    .inner:active {
      transition: none;
      color: var(--button-color-active, #fff);
      box-shadow: var(--button-box-shadow-active, none);
    }

    /** Background
     ---------------------------------------------------------*/

    .background {
      content: '';
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;

      transition: opacity 500ms 200ms;

      background:
        var(--button-background-active,
        var(--highlight-color,
        #333));
    }

    :active .background {
      transition: none;
      opacity: 1;
    }

    .released .background {
      transition: opacity 500ms;
    }

    i:before {
      font-size: 26px;
    }

    ::content i {
      margin-left: -2px;
      margin-right: -2px;
    }

    ::content i + span,
    ::content span + i {
      -moz-margin-start: 8px;
    }



    /** Content
     ---------------------------------------------------------*/

    /**
     * 1. In some cases events seems to be getting
     *    swallowed by text-nodes. Ignoring pointer-
     *    events means we can listen on parent nodes
     *    instead.
     */

    .content {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
      height: 100%;
      padding: 0 18px;
      pointer-events: none; /* 1 */
    }

    [circular] .content {
      padding: 0;
    }

    </style>`
});

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('gaia-button',this));
