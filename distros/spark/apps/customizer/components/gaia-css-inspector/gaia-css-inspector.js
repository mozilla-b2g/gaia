;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 1 ? console.log.bind(console) : function() {};

/**
 * Register the element.
 *
 * @return {Element} constructor
 */
module.exports = component.register('gaia-css-inspector', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    debug('created');
    this.setupShadowRoot();
    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      styles: this.shadowRoot.querySelector('.styles')
    };
  },

  set: function(el) {
    debug('set element', el);
    this.root = el;
    this.render();
  },

  render: function() {
    var styles = getStylesForElement(this.root);
    this.renderStyles(styles);
  },

  renderStyles: function(styles) {
    this.els.styles.innerHTML = '';
    for (var prop in styles) {
      var li = document.createElement('li');
      li.innerHTML = `<span class="prop">${prop}: </span><span class="value">${styles[prop]}</span>`;
      this.els.styles.appendChild(li);
    }
  },

  template: `
    <style>
      * { box-sizing: border-box; }

      :host {
        display: block;
      }

      .inner {
        color: var(--text-color);
        background: var(--background);
        font-family: Consolas,Monaco,"Andale Mono",monospace;
        line-height: 1;
        -moz-user-select: none;
        cursor: default;
      }

      .styles {
        list-style-type: none;
        margin: 0;
        padding: 0;
      }

      .styles li {
        margin-bottom: 0.27em;
      }


      .styles li > .prop {

      }

      .styles li > .value {
        color: var(--highlight-color);
      }

    </style>
    <div class="inner">
      <ul class="styles"></ul>
    </div>
  `
});

function getStylesForElement(el) {
  var styles = {};

  [].forEach.call(document.styleSheets, (sheet) => {
    [].forEach.call(sheet.cssRules, (rule) => {
      if (!el.matches(rule.selectorText)) return;
      debug('matching rule', rule);
      var style = rule.style;
      [].forEach.call(style, (prop) => {
        styles[prop] = style[prop];
      });
    });
  });

  debug('got styles', styles);
  return styles;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-css-inspector',this));
