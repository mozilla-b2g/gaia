(function(define){'use strict';define(['require','exports','module','gaia-component'],function(require,exports,module){
/*jshint esnext:true*/
/*jshint node:true*/
/*globals define*/

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Exports
 */

module.exports = component.register('gaia-sub-header', {
  created: function() {
    this.setupShadowRoot();
  },

  template: `<div class="inner">
      <div class="line left"></div>
      <div class="middle"><content></content></div>
      <div class="line right"></div>
    </div>

    <style>

    :host {
      display: block;
    }

    .inner {
      display: flex;
      margin: 16px 16px 0 16px;
      align-items: center;
    }

    .line {
      position: relative;
      height: 2px;
      flex: 1;

      background:
        var(--border-color,
        var(--background-plus));
    }

    .middle {
      margin: 0 14px 0 14px;
      padding: 0;
      text-transform: uppercase;
      font-size: 14px;
      font-weight: normal;

      color:
        var(--color-epsilon);
    }

    a,
    button {
      position: relative;
      display: block;
      padding-right: 16px;
      font: inherit;
      cursor: pointer;

      color:
        var(--highlight-color);
    }

    /**
     * .pressed
     */

    a:active,
    button:active {
      opacity: 0.5;
    }

    a:after,
    button:after {
      content: " ";
      position: absolute;
      width: 0px;
      height: 0px;
      top: 6px;
      right: 0px;
      border-bottom: 8px solid;
      border-left: 8px solid transparent;

      border-bottom-color:
        var(--highlight-color,
        var(--color-zeta))
    }

    </style>`
});

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('gaia-sub-header',this));
