!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GaiaModal=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
;(function(define){define(function(require,exports,module){
'use strict';

/**
 * Locals
 */

var textContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
var removeAttribute = HTMLElement.prototype.removeAttribute;
var setAttribute = HTMLElement.prototype.setAttribute;
var noop  = function() {};

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  var div = document.createElement('div');
  try { div.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

/**
 * Register a new component.
 *
 * @param  {String} name
 * @param  {Object} props
 * @return {constructor}
 * @public
 */
module.exports.register = function(name, props) {

  // Decide on a base protoype, create a handy
  // reference to super (extended) class, then clean up.
  var parent = props.extends ? props.extends.prototype : base;
  props.super = parent;
  delete props.extends;

  // Pull out CSS that needs to be in the light-dom
  if (props.template) {
    var output = processCss(props.template, name);

    props.template = document.createElement('template');
    props.template.innerHTML = output.template;
    props.lightCss = output.lightCss;

    props.globalCss = props.globalCss || '';
    props.globalCss += output.globalCss;
  }

  // Inject global CSS into the document,
  // and delete as no longer needed
  injectGlobalCss(props.globalCss);
  delete props.globalCss;

  // Merge base getter/setter attributes with the user's,
  // then define the property descriptors on the prototype.
  var descriptors = Object.assign(props.attrs || {}, baseAttrs);

  // Store the orginal descriptors somewhere
  // a little more private and delete the original
  props._attrs = props.attrs;
  delete props.attrs;

  // Create the prototype, extended from the parent
  var proto = Object.assign(Object.create(parent), props);

  // Define the properties directly on the prototype
  Object.defineProperties(proto, descriptors);

  // Register the custom-element and return the constructor
  return document.registerElement(name, { prototype: proto });
};

var base = Object.assign(Object.create(HTMLElement.prototype), {
  attributeChanged: noop,
  attached: noop,
  detached: noop,
  created: noop,

  createdCallback: function() {
    injectLightCss(this);
    this.created();
  },

  /**
   * It is very common to want to keep object
   * properties in-sync with attributes,
   * for example:
   *
   *   el.value = 'foo';
   *   el.setAttribute('value', 'foo');
   *
   * So we support an object on the prototype
   * named 'attrs' to provide a consistent
   * way for component authors to define
   * these properties. When an attribute
   * changes we keep the attr[name]
   * up-to-date.
   *
   * @param  {String} name
   * @param  {String||null} from
   * @param  {String||null} to
   */
  attributeChangedCallback: function(name, from, to) {
    var prop = toCamelCase(name);
    if (this._attrs && this._attrs[prop]) { this[prop] = to; }
    this.attributeChanged(name, from, to);
  },

  attachedCallback: function() { this.attached(); },
  detachedCallback: function() { this.detached(); },

  /**
   * A convenient method for setting up
   * a shadow-root using the defined template.
   *
   * @return {ShadowRoot}
   */
  setupShadowRoot: function() {
    if (!this.template) { return; }
    var node = document.importNode(this.template.content, true);
    this.createShadowRoot().appendChild(node);
    return this.shadowRoot;
  },

  /**
   * Sets an attribute internally
   * and externally. This is so that
   * we can style internal shadow-dom
   * content.
   *
   * @param {String} name
   * @param {String} value
   */
  setAttr: function(name, value) {
    var internal = this.shadowRoot.firstElementChild;
    setAttribute.call(internal, name, value);
    setAttribute.call(this, name, value);
  },

  /**
   * Removes an attribute internally
   * and externally. This is so that
   * we can style internal shadow-dom
   * content.
   *
   * @param {String} name
   * @param {String} value
   */
  removeAttr: function(name) {
    var internal = this.shadowRoot.firstElementChild;
    removeAttribute.call(internal, name);
    removeAttribute.call(this, name);
  }
});

var baseAttrs = {
  textContent: {
    set: function(value) {
      var node = firstChildTextNode(this);
      if (node) { node.nodeValue = value; }
    },

    get: function() {
      var node = firstChildTextNode(this);
      return node && node.nodeValue;
    }
  }
};

/**
 * Return the first child textNode.
 *
 * @param  {Element} el
 * @return {TextNode}
 */
function firstChildTextNode(el) {
  for (var i = 0; i < el.childNodes.length; i++) {
    var node = el.childNodes[i];
    if (node && node.nodeType === 3) { return node; }
  }
}

var regex = {
  shadowCss: /(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,
  ':host': /(?:\:host)/g,
  ':host()': /\:host\((.+)\)/g,
  ':host-context': /\:host-context\((.+)\)([^{,]+)?/g,
  '::content': /(?:\:\:content)/g
};

/**
 * Extracts the :host and ::content rules
 * from the shadow-dom CSS and rewrites
 * them to work from the <style scoped>
 * injected at the root of the component.
 *
 * @return {String}
 */
function processCss(template, name) {
  var globalCss = '';
  var lightCss = '';

  if (!hasShadowCSS) {
    template = template.replace(regex.shadowCss, function(match) {
      var hostContext = regex[':host-context'].exec(match);

      if (hostContext) {
        globalCss += match
          .replace(regex['::content'], '')
          .replace(regex[':host-context'], '$1 ' + name + '$2')
          .replace(/ +/g, ' '); // excess whitespace
      } else {
        lightCss += match
          .replace(regex[':host()'], name + '$1')
          .replace(regex[':host'], name)
          .replace(regex['::content'], name);
      }

      return '';
    });
  }

  return {
    template: template,
    lightCss: lightCss,
    globalCss: globalCss
  };
}

/**
 * Some CSS rules, such as @keyframes
 * and @font-face don't work inside
 * scoped or shadow <style>. So we
 * have to put them into 'global'
 * <style> in the head of the
 * document.
 *
 * @param  {String} css
 */
function injectGlobalCss(css) {
  if (!css) return;
  var style = document.createElement('style');
  style.innerHTML = css.trim();
  document.head.appendChild(style);
}


/**
 * The Gecko platform doesn't yet have
 * `::content` or `:host`, selectors,
 * without these we are unable to style
 * user-content in the light-dom from
 * within our shadow-dom style-sheet.
 *
 * To workaround this, we clone the <style>
 * node into the root of the component,
 * so our selectors are able to target
 * light-dom content.
 *
 * @private
 */
function injectLightCss(el) {
  if (hasShadowCSS) { return; }
  el.lightStyle = document.createElement('style');
  el.lightStyle.setAttribute('scoped', '');
  el.lightStyle.innerHTML = el.lightCss;
  el.appendChild(el.lightStyle);
}

/**
 * Convert hyphen separated
 * string to camel-case.
 *
 * Example:
 *
 *   toCamelCase('foo-bar'); //=> 'fooBar'
 *
 * @param  {Sring} string
 * @return {String}
 */
function toCamelCase(string) {
  return string.replace(/-(.)/g, function replacer(string, p1) {
    return p1.toUpperCase();
  });
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));

},{}],2:[function(require,module,exports){
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Register the element.
 *
 * @return {Element} constructor
 */
module.exports = component.register('gaia-modal', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    this.setupShadowRoot();

    // Properties
    this.active = this.getAttribute('active');
  },

  /**
   * Known attribute property
   * descriptors.
   *
   * These setters get called when matching
   * attributes change on the element.
   *
   * @type {Object}
   */
  attrs: {
    active: {
      get: function() { return this._active || false; },
      set: function(value) {
        value = !!(value || value === '');

        if (value === this.active) { return; }
        this._active = value;

        if (value) { this.setAttr('active', ''); }
        else { this.removeAttr('active'); }
      }
    }
  },

  open: function() {
    this.active = true;
  },

  close: function() {
    this.active = false;
  },

  template: `<div class="inner">
    <content></content>
  </div>

  <style>
  :host {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    transition: all 0.2s;
    transform: translate(0, 100%);
    opacity: 0;
    pointer-events: none;
  }

  :host[active] {
    transform: translate(0, 0);
    opacity: 1;
    pointer-events: auto;
  }

  .inner {
    background: var(--background, #fff);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-modal',this));

},{"gaia-component":1}]},{},[2])(2)
});