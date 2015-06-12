function componentsSource() {/*
(function() {
;(function(define){'use strict';define(function(require,exports,module){

var textContent = Object.getOwnPropertyDescriptor(Node.prototype,
    'textContent');
var innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
var removeAttribute = Element.prototype.removeAttribute;
var setAttribute = Element.prototype.setAttribute;
var noop  = function() {};


exports.register = function(name, props) {
  var baseProto = getBaseProto(props.extends);
  var template = props.template || baseProto.templateString
  var extensible = props.extensible = props.hasOwnProperty('extensible')?
    props.extensible : true
  delete props.extends
  if (template) {
    if (extensible && props.template) {
      props.templateString = props.template;
    }

    var output = processCss(template, name);

    props.template = document.createElement('template');
    props.template.innerHTML = output.template;
    props.lightCss = output.lightCss;

    props.globalCss = props.globalCss || '';
    props.globalCss += output.globalCss;
  }
  injectGlobalCss(props.globalCss);
  delete props.globalCss
  var descriptors = mixin(props.attrs || {}, base.descriptors)
  props._attrs = props.attrs;
  delete props.attrs
  var proto = createProto(baseProto, props);
  Object.defineProperties(proto, descriptors)
  try {
    return document.registerElement(name, { prototype: proto });
  } catch (e) {
    if (e.name !== 'NotSupportedError') {
      throw e;
    }
  }
};

var base = {
  properties: {
    GaiaComponent: true,
    attributeChanged: noop,
    attached: noop,
    detached: noop,
    created: noop,

    createdCallback: function() {
      if (this.rtl) { addDirObserver(); }
      injectLightCss(this);
      this.created();
    },

    
    attributeChangedCallback: function(name, from, to) {
      var prop = toCamelCase(name);
      if (this._attrs && this._attrs[prop]) { this[prop] = to; }
      this.attributeChanged(name, from, to);
    },

    attachedCallback: function() { this.attached(); },
    detachedCallback: function() { this.detached(); },

    
    setupShadowRoot: function() {
      if (!this.template) { return; }
      var node = document.importNode(this.template.content, true);
      this.createShadowRoot().appendChild(node);
      return this.shadowRoot;
    },

    
    setAttr: function(name, value) {
      var internal = this.shadowRoot.firstElementChild;
      setAttribute.call(internal, name, value);
      setAttribute.call(this, name, value);
    },

    
    removeAttr: function(name) {
      var internal = this.shadowRoot.firstElementChild;
      removeAttribute.call(internal, name);
      removeAttribute.call(this, name);
    }
  },

  descriptors: {
    textContent: {
      set: function(value) {
        textContent.set.call(this, value);
        if (this.lightStyle) { this.appendChild(this.lightStyle); }
      },

      get: function() {
        return textContent.get();
      }
    },

    innerHTML: {
      set: function(value) {
        innerHTML.set.call(this, value);
        if (this.lightStyle) { this.appendChild(this.lightStyle); }
      },

      get: innerHTML.get
    }
  }
};


var defaultPrototype = createProto(HTMLElement.prototype, base.properties);


function getBaseProto(proto) {
  if (!proto) { return defaultPrototype; }
  proto = proto.prototype || proto;
  return !proto.GaiaComponent ?
    createProto(proto, base.properties) : proto;
}


function createProto(proto, props) {
  return mixin(Object.create(proto), props);
}


var hasShadowCSS = (function() {
  var div = document.createElement('div');
  try { div.querySelector(':host'); return true; }
  catch (e) { return false; }
})();


var regex = {
  shadowCss: /(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,
  ':host': /(?:\:host)/g,
  ':host()': /\:host\((.+)\)(?: \:\:content)?/g,
  ':host-context': /\:host-context\((.+)\)([^{,]+)?/g,
  '::content': /(?:\:\:content)/g
};


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
          .replace(/ +/g, ' ')
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


function injectGlobalCss(css) {
  if (!css) {return;}
  var style = document.createElement('style');
  style.innerHTML = css.trim();
  headReady().then(function() {
    document.head.appendChild(style);
  });
}



function headReady() {
  return new Promise(function(resolve) {
    if (document.head) { return resolve(); }
    window.addEventListener('load', function fn() {
      window.removeEventListener('load', fn);
      resolve();
    });
  });
}



function injectLightCss(el) {
  if (hasShadowCSS) { return; }
  el.lightStyle = document.createElement('style');
  el.lightStyle.setAttribute('scoped', '');
  el.lightStyle.innerHTML = el.lightCss;
  el.appendChild(el.lightStyle);
}


function toCamelCase(string) {
  return string.replace(/-(.)/g, function replacer(string, p1) {
    return p1.toUpperCase();
  });
}


var dirObserver;


function addDirObserver() {
  if (dirObserver) { return; }

  dirObserver = new MutationObserver(onChanged);
  dirObserver.observe(document.documentElement, {
    attributeFilter: ['dir'],
    attributes: true
  });

  function onChanged(mutations) {
    document.dispatchEvent(new Event('dirchanged'));
  }
}


function mixin(target, source) {
  for (var key in source) {
    target[key] = source[key];
  }
  return target;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-component',this));

(function(define){define(function(require,exports,module){




var base = window.GAIA_ICONS_BASE_URL
  || window.COMPONENTS_BASE_URL
  || 'bower_components/';

if (!document.documentElement) {
  window.addEventListener('load', load);
} else {
  load();
}

function load() {
  if (isLoaded()) { return; }

  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = base + 'customizer-gaia-icons/customizer-gaia-icons.css';
  document.head.appendChild(link);
  exports.loaded = true;
}

function isLoaded() {
  return exports.loaded ||
    document.querySelector('link[href*=customizer-gaia-icons]') ||
    document.documentElement.classList.contains('customizer-gaia-icons-loaded');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-icons',this));

;(function(define){define(function(require,exports,module){
'use strict';


var debug = 0 ? console.log.bind(console) : function(){};


var cache = {};


var MIN = 16;
var MAX = 24;


var BUFFER = 3;


module.exports = function(config) {
  debug('font fit', config);
  var space = config.space - BUFFER;
  var min = config.min || MIN;
  var max = config.max || MAX;
  var text = trim(config.text);
  var fontSize = max;
  var textWidth;
  var font;

  do {
    font = config.font.replace(/\d+px/, fontSize + 'px');
    textWidth = getTextWidth(text, font);
  } while (textWidth > space && fontSize !== min && fontSize--);

  return {
    textWidth: textWidth,
    fontSize: fontSize,
    overflowing: textWidth > space
  };
};


function getTextWidth(text, font) {
  var ctx = getCanvasContext(font);
  var width = ctx.measureText(text).width;
  debug('got text width', width);
  return width;
}


function getCanvasContext(font) {
  debug('get canvas context', font);

  var cached = cache[font];
  if (cached) { return cached; }

  var canvas = document.createElement('canvas');
  canvas.setAttribute('moz-opaque', 'true');
  canvas.setAttribute('width', '1px');
  canvas.setAttribute('height', '1px');
  debug('created canvas', canvas);

  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;

  return cache[font] = ctx;
}


function trim(text) {
  return text.replace(/\s+/g, ' ').trim();
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('font-fit',this));

(function(define){define(function(require,exports,module){

'use strict';



var component = require('customizer-gaia-component');
require('customizer-gaia-icons')



module.exports = component.register('customizer-gaia-text-input', {
  extends: HTMLInputElement,

  created: function() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      input: this.shadowRoot.querySelector('input'),
      clear: this.shadowRoot.querySelector('.clear')
    };

    this.type = this.getAttribute('type');
    this.disabled = this.hasAttribute('disabled');
    this.clearable = this.hasAttribute('clearable');
    this.placeholder = this.getAttribute('placeholder');
    this.required = this.getAttribute('required');
    this.value = this.getAttribute('value')
    this.els.clear.addEventListener('mousedown', (e) => e.preventDefault());
    this.els.clear.addEventListener('click', e => this.clear(e));
  },

  clear: function(e) {
    this.value = '';
  },

  focus: function() {
    this.els.input.focus();
  },

  

  attrs: {
    type: {
      get: function() { return this.els.input.getAttribute('type'); },
      set: function(value) {
        if (!value) { return; }
        this.els.inner.setAttribute('type', value);
        this.els.input.setAttribute('type', value);
      }
    },

    placeholder: {
      get: function() { return this.field.placeholder; },
      set: function(value) {
        if (!value && value !== '') { return; }
        this.els.input.placeholder = value;
      }
    },

    clearable: {
      get: function() { return this._clearable; },
      set: function(value) {
        var clearable = !!(value === '' || value);
        if (clearable === this.clearable) { return; }

        if (clearable) {
          this.els.inner.setAttribute('clearable', '');
          this.setAttribute('clearable', '');
        } else {
          this.els.inner.removeAttribute('clearable');
          this.removeAttribute('clearable');
        }

        this._clearable = clearable;
      }
    },

    value: {
      get: function() { return this.els.input.value; },
      set: function(value) { this.els.input.value = value; }
    },

    required: {
      get: function() { return this.els.input.required; },
      set: function(value) { this.els.input.required = value; }
    },

    maxlength: {
      get: function() { return this.els.input.getAttribute('maxlength'); },
      set: function(value) { this.els.input.setAttribute('maxlength', value); }
    },

    disabled: {
      get: function() { return this.els.input.disabled; },
      set: function(value) {
        value = !!(value === '' || value);
        this.els.input.disabled = value;
      }
    }
  },

  template: `
    <div class="inner">
      <content select="label"></content>
      <div class="fields">
        <input type="text"/>
        <button class="clear" tabindex="-1"></button>
        <div class="focus"></div>
      </div>
    </div>

    <style>

    :host {
      display: block;
      height: 40px;
      margin-top: var(--base-m, 18px);
      margin-bottom: var(--base-m, 18px);
    }

    

    input,
    button {
      box-sizing: border-box;
      border: 0;
      margin: 0;
      padding: 0;
    }

    

    .inner {
      height: 100%;
    }

    

    label {
      font-size: 14px;
      display: block;
      margin: 0 0 4px 16px;
    }

    

    [disabled] label {
      opacity: 0.3;
    }

    

    .fields {
      position: relative;
      width: 100%;
      height: 100%;

      --gi-border-color:
        var(--input-border-color,
        var(--border-color,
        var(--background-plus,
        #e7e7e7)));

      border-color:
        var(--gi-border-color);

      border:
        var(--input-border,
        var(--border,
        1px solid var(--gi-border-color)));
    }

    

    [type='search'] .fields {
      border-radius: 30px;
      overflow: hidden;
    }

    

    input {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
      padding: 0 16px;
      margin: 0;
      font: inherit;
      resize: none;

      

      color:
        var(--text-color, #000);

      background:
        var(--text-input-background,
        var(--input-background,
        var(--background-minus,
        #fff)));
    }

    

    input[disabled] {
      background: transparent;
    }

    

    ::-moz-placeholder {
      font-style: italic;

      color:
        var(--input-placeholder-color, #909ca7);
    }

    

    .clear {
      display: none;
      position: absolute;
      top: 11px;
      right: 10px;
      width: 18px;
      height: 18px;
      padding: 0;
      margin: 0;
      border-radius: 50%;
      opacity: 0;
      color: #fff;
      cursor: pointer;

      background:
        var(--input-clear-background, #999);
    }

    

    [clearable] .clear {
      display: block;
    }

    

    input:focus ~ .clear {
      opacity: 1;
    }

    

    .clear:before {
      font: normal 500 19px/16.5px 'customizer-gaia-icons';
      content: 'close';
      display: block;
      text-rendering: optimizeLegibility;
    }

    

    .focus {
      position: absolute;
      bottom: 0px;
      width: 100%;
      height: 3px;
      transition: all 200ms;
      transform: scaleX(0);
      visibility: hidden;
      background: var(--highlight-color, #000);
    }

    

    :focus ~ .focus {
      transform: scaleX(1);
      transition-delay: 200ms;
      visibility: visible;
    }
    </style>
  `
});

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('customizer-gaia-text-input',this));

;(function(define){'use strict';define(function(require,exports,module){


var component = require('customizer-gaia-component');


var debug = 0 ? console.log.bind(console) : function() {};



module.exports = component.register('customizer-gaia-dialog', {
  created: function() {
    this.setupShadowRoot();
    
    this.els = {
      inner: this.shadowRoot.querySelector('.dialog-inner'),
      background: this.shadowRoot.querySelector('.background'),
      window: this.shadowRoot.querySelector('.window')
    };

    this.shadowRoot.addEventListener('click', e => this.onClick(e));
    this.setupAnimationListeners();
  },

  onClick: function(e) {
    var el = closest('[on-click]', e.target, this);
    if (!el) { return; }
    debug('onClick');
    var method = el.getAttribute('on-click');
    if (typeof this[method] == 'function') { this[method](); }
  },

  setupAnimationListeners: function() {
    this.addEventListener('animationstart', this.onAnimationStart.bind(this));
    this.addEventListener('animationend', this.onAnimationEnd.bind(this));
  },

  open: function(options) {
    if (this.isOpen) { return; }
    debug('open dialog');
    requestAnimationFrame(this.animateIn.bind(this, options));
    this.isOpen = true;
    this.setAttr('opened', '');
    this.dispatch('opened');
  },

  close: function(options) {
    if (!this.isOpen) { return; }
    debug('close dialog');
    this.isOpen = false;
    requestAnimationFrame(this.animateOut.bind(this, () => {
      this.removeAttr('opened');
      this.dispatch('closed');
    }));
  },

  animateIn: function(e) {
    var hasTarget = e && ('clientX' in e || e.touches);
    if (hasTarget) { return this.animateInFromTarget(e); }
    var background = this.els.background;
    var end = 'animationend';

    debug('animate in');
    this.dispatch('animationstart');
    background.classList.add('animate-in');
    background.addEventListener(end, function fn() {
      background.removeEventListener(end, fn);
      debug(end);
      this.els.window.classList.add('animate-in');
      this.dispatch('animationend');
    }.bind(this));
  },
  animateInFromTarget: function(e) {
    debug('animate in from target');
    var pos = e.touches && e.touches[0] || e;
    var scale = Math.sqrt(window.innerWidth * window.innerHeight) / 10;
    var background = this.els.background;
    var duration = scale * 7;
    var end = 'transitionend';
    var self = this;

    background.style.transform =
      'translate(' + pos.clientX + 'px, ' + pos.clientY + 'px)';
    background.style.transitionDuration = duration + 'ms';
    background.classList.add('circular');
    debug('animation start');
    this.dispatch('animationstart');

    background.offsetTop;

    background.style.transform += ' scale(' + scale + ')';
    background.style.opacity = 1;

    background.addEventListener(end, function fn() {
      background.removeEventListener(end, fn);
      debug(end);
      self.els.window.classList.add('animate-in');
      self.dispatch('animationend');
    });
  },

  animateOut: function(callback) {
    var end = 'animationend';
    var background = this.els.background;
    var self = this;
    var classes = {
      el: this.classList,
      window: this.els.window.classList,
      background: this.els.background.classList
    };

    this.dispatch('animationstart');
    classes.window.add('animate-out');

    this.els.window.addEventListener(end, function fn(e) {
      self.els.window.removeEventListener(end, fn);
      e.stopPropagation();
      classes.background.add('animate-out');
      self.els.background.addEventListener(end, function fn() {
        self.els.background.removeEventListener(end, fn);
        classes.window.remove('animate-out', 'animate-in');
        classes.background.remove('animate-out', 'animate-in');
        background.classList.remove('circular');
        background.style = '';
        self.dispatch('animationend');
        if (callback) { callback(); }
      });
    });
  },

  onAnimationStart: function() {
    this.classList.add('animating');
  },

  onAnimationEnd: function() {
    this.classList.remove('animating');
  },

  dispatch: function(name) {
    this.dispatchEvent(new CustomEvent(name));
  },

  attrs: {
    opened: {
      get: function() { return !!this.isOpen; },
      set: function(value) {
        value = value === '' || value;
        if (!value) { this.close(); }
        else { this.open(); }
      }
    }
  },

  template: `
    <div class="dialog-inner">
      <div class="background" on-click="close"></div>
      <div class="window"><content></content></div>
    </div>

    <style>

    ::content * {
      box-sizing: border-box;
      font-weight: inherit;
      font-size: inherit;
    }

    ::content p,
    ::content h1,
    ::content h2,
    ::content h3,
    ::content h4,
    ::content button,
    ::content fieldset {
      padding: 0;
      margin: 0;
      border: 0;
    }

    :host {
      display: none;
      position: fixed;
      top: 0px; left: 0px;
      width: 100%;
      height: 100%;
      z-index: 200;
      font-style: italic;
      text-align: center;
    }

    :host[opened],
    :host.animating {
      display: block;
    }

    

    .dialog-inner {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }

    

    .background {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      background: rgba(199,199,199,0.85);
    }

    

    .background.circular {
      width: 40px;
      height: 40px;
      margin: -20px;
      border-radius: 50%;
      will-change: transform, opacity;
      transition-property: opacity, transform;
      transition-timing-function: linear;
    }

    

    .background.animate-in {
      animation-name: customizer-gaia-dialog-fade-in;
      animation-duration: 300ms;
      animation-fill-mode: forwards;
    }

    

    .background.animate-out {
      animation-name: customizer-gaia-dialog-fade-out;
      animation-delay: 300ms;
      animation-duration: 300ms;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    

    .window {
      position: relative;
      width: 90%;
      max-width: 350px;
      margin: auto;
      box-shadow: 0 1px 0 0px rgba(0,0,0,0.15);
      background: var(--color-iota);
      transition: opacity 300ms;
      opacity: 0;
    }

    .window.animate-in {
      animation-name: customizer-gaia-dialog-entrance;
      animation-duration: 300ms;
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
      animation-fill-mode: forwards;
      opacity: 1;
    }

    .window.animate-out {
      animation-name: customizer-gaia-dialog-fade-out;
      animation-duration: 200ms;
      animation-delay: 100ms;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    

    ::content h1 {
      padding: 16px;
      font-size: 23px;
      line-height: 26px;
      font-weight: 200;
      font-style: italic;
      color: #858585;
    }

    ::content strong {
      font-weight: 700;
    }

    ::content small {
      font-size: 0.8em;
    }

    

    ::content section {
      padding: 33px 18px;
      color: #858585;
    }

    ::content section > *:not(:last-child) {
      margin-bottom: 13px;
    }

    

    ::content p {
      text-align: -moz-start;
    }

    

    ::content button {
      position: relative;
      display: block;
      width: 100%;
      height: 50px;
      margin: 0;
      border: 0;
      padding: 0rem 16px;
      cursor: pointer;
      font: inherit;
      background: var(--color-beta);
      color: var(--color-epsilon);
      transition: all 200ms;
      transition-delay: 300ms;
      border-radius: 0;
    }

    

    ::content button.primary {
      color: var(--highlight-color);
    }

    

    ::content button.danger {
      color: var(--color-destructive);
    }

    

    ::content button[disabled] {
      color: var(--color-zeta);
    }

    

    ::content button:after {
      content: '';
      display: block;
      position: absolute;
      height: 1px;
      left: 6px;
      right: 6px;
      top: 49px;
      background: #E7E7E7;
    }

    ::content button:last-of-type:after {
      display: none;
    }

    ::content button:active {
      background-color: var(--highlight-color);
      color: #fff;
      transition: none;
    }

    ::content button:active:after {
      background: var(--highlight-color);
      transition: none;
    }

    ::content button[data-icon]:before {
      float: left;
    }

    

    ::content fieldset {
      overflow: hidden;
    }

    ::content fieldset button {
      position: relative;
      float: left;
      width: 50%;
    }

    ::content fieldset button:after {
      content: '';
      display: block;
      position: absolute;
      top: 6px;
      bottom: 6px;
      right: 0px;
      left: auto;
      width: 1px;
      height: calc(100% - 12px);
      background: #e7e7e7;
      transition: all 200ms;
      transition-delay: 200ms;
    }

    </style>`,

  globalCss: `
    @keyframes customizer-gaia-dialog-entrance {
      0% { transform: translateY(100px); }
      100% { transform: translateY(0px); }
    }

    @keyframes customizer-gaia-dialog-fade-in {
      0% { opacity: 0 }
      100% { opacity: 1 }
    }

    @keyframes customizer-gaia-dialog-fade-out {
      0% { opacity: 1 }
      100% { opacity: 0 }
    }`
});

function closest(selector, el, top) {
  return el && el !== top ? (el.matches(selector) ? el : closest(el.parentNode))
    : null;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-dialog',this));


;(function(define){'use strict';define(function(require,exports,module){



require('customizer-gaia-text-input');
require('customizer-gaia-dialog');
var component = require('customizer-gaia-component');


module.exports = component.register('customizer-gaia-dialog-prompt', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      dialog: this.shadowRoot.querySelector('customizer-gaia-dialog'),
      input: this.shadowRoot.querySelector('customizer-gaia-text-input'),
      submit: this.shadowRoot.querySelector('.submit'),
      cancel: this.shadowRoot.querySelector('.cancel')
    };

    this.els.dialog.addEventListener('opened', () => {
      this.setAttribute('opened', '');
    });

    this.els.dialog.addEventListener('closed', () => {
      this.removeAttribute('opened');
    });

    this.els.input.placeholder = this.firstChild.textContent;
    this.els.cancel.addEventListener('click', this.close.bind(this));
    this.els.submit.addEventListener('click', this.close.bind(this));
  },

  open: function(e) {
    this.els.dialog.open(e);
  },

  close: function() {
    this.els.dialog.close();
  },

  template: `
    <customizer-gaia-dialog>
      <div><customizer-gaia-text-input></customizer-gaia-text-input></div>
      <fieldset>
        <button class="cancel">Cancel</button>
        <button class="submit primary">Ok</button>
      </fieldset>
    </customizer-gaia-dialog>

    <style>

    :host {
      display: none;
    }

    :host[opened],
    :host.animating {
      display: block;
      position: fixed;
      width: 100%;
      height: 100%;
    }

    customizer-gaia-text-input {
      margin: 16px !important;
    }

    </style>`
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-dialog-prompt',this));

;(function(define){'use strict';define(function(require,exports,module){



var component = require('customizer-gaia-component');


var debug = 0 ? console.log.bind(console) : function() {};

const NODE_TYPES = {
  1: 'element',
  3: 'text'
};


module.exports = component.register('customizer-gaia-dom-tree', {

  
  created: function() {
    debug('created');
    this.setupShadowRoot();
    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      tree: this.shadowRoot.querySelector('.tree')
    };

    this.filter = this.getAttribute('filter');

    this.selectedTreeNode = null;
    this.selectedNode = null;
    this.treeMap = new Map();
    this.els.inner.addEventListener('click', e => this.onInnerClick(e));
    this.els.inner.addEventListener('contextmenu', e => this.onInnerClick(e));
  },

  attrs: {
    filter: {
      get: function() { return this._filter; },
      set: function(value) {
        if (value === this._filter) { return; }
        this._filter = value;
        this.setAttr('filter', value);
        this.render();
      }
    }
  },

  setRoot: function(el) {
    debug('set root', el);
    this.root = el;
  },

  render: function() {
    this.els.tree.innerHTML = '';
    if (this.root) {
      var tree = this.createTree(this.root);
      this.els.tree.appendChild(tree);
      debug('rendered');
    }
  },

  select: function(el) {
    debug('select', el);
    var treeNode = this.treeMap.get(el);
    if (!treeNode) return;
    this.selectNode(treeNode);
    this.expandNode(treeNode);
  },

  onInnerClick: function(e) {
    debug('inner click', e);
    if (e.type === 'contextmenu') e.preventDefault();
    var nodeTitle = e.target.closest('h3');
    if (nodeTitle) this.onNodeTitleClick(nodeTitle, e);
  },

  onNodeTitleClick: function(el, e) {
    var node = el.closest('li');
    if (e.type === 'click') this.toggleExpanded(node);
    this.selectNode(node, e);
  },

  expandNode: function(node) {
    debug('expand node', node);
    node.classList.add('expanded');
    var parent = node.parentNode.closest('li');
    if (parent) this.expandNode(parent);
  },

  contractNode: function(node) {
    node.classList.remove('expanded');
  },

  toggleExpanded: function(node) {
    var expanded = node.classList.contains('expanded');
    if (expanded) this.contractNode(node);
    else this.expandNode(node);
  },

  selectNode: function(treeNode, e) {
    var previous = this.selectedTreeNode;
    if (previous) previous.classList.remove('selected');
    treeNode.classList.add('selected');
    this.selectedTreeNode = treeNode;
    this.selectedNode = treeNode.sourceNode;
    this.dispatch((e && e.type === 'contextmenu') ? 'longpressed' : 'click');
  },

  dispatch: function(name) {
    this.dispatchEvent(new Event(name));
  },

  createTree: function(node) {
    var treeNode = document.createElement('li');
    var title = document.createElement('h3');
    var children = document.createElement('ul');
    var type = NODE_TYPES[node.nodeType];
    var stringified = stringify[type](node)
    var childNodes = [].filter.call(node.childNodes, (node) => {
      return node.nodeType === Node.TEXT_NODE || (
        node.nodeType === Node.ELEMENT_NODE &&
        node.nodeName !== 'GAIA-DOM-TREE' && (
          (this.filter && !node.matches(this.filter)) ||
          !this.filter
        )
      );
    });

    if (!stringified) return;

    title.innerHTML = stringified;

    treeNode.appendChild(title);
    treeNode.appendChild(children);
    treeNode.sourceNode = node;
    treeNode.classList.add(type)
    treeNode.classList.toggle('has-children', !!childNodes.length);

    childNodes.map((node) => this.createTree(node))
      .filter(node => !!node)
      .forEach(children.appendChild, children);

    this.treeMap.set(node, treeNode);
    return treeNode;
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
        overflow: auto;
        height: 100%;
      }

      ul.tree {
        padding: 0.5rem;
        height: 100%;
      }

      ul.tree > li:first-child {
        padding-bottom: 1rem;
      }

      ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
      }

      

      h3 {
        display: inline-block;
        width: 100%;
        margin: 0;
        padding: 0.2em 0.2em;
        font: inherit;
        white-space: nowrap;
      }

      

      li.selected > h3 {
        background: var(--background-plus)
      }

      li.text > h3 {
        font-style: italic;
        opacity: 0.4;
      }

      

      li > h3:before {
        content: '';
        display: inline-block;
        text-align: center;
        width: 1.4em;
        font-size: 0.8em;
        opacity: 0.2
      }

      li.element.has-children > h3:before {
        content: '▶';
      }

      

      li.expanded > h3:before {
        transform: rotate(90deg);
      }

      

      .attr-value {
        color: var(--highlight-color);
      }

      

      li > ul {
        display: none;
        -moz-padding-start: 0.8em;
      }

      

      li.expanded > ul {
        display: block;
      }

    </style>
    <div class="inner">
      <ul class="tree"></div>
    </div>
  `
});

var stringify = {
  element: function(el) {
    var tagName = el.tagName.toLowerCase();
    var attrs = stringifyAttrs(el.attributes);
    return `&lt;${tagName}<span class="attrs">${attrs}</span>&gt;`;
  },

  text: function(textNode) {
    var value = textNode.nodeValue.trim();
    debug('stringify textNode', value);
    return value;
  }
};

function stringifyAttrs(attrs) {
  return [].map.call(attrs, attr => {
    return ` ${attr.name}=&quot;<span class="attr-value">${attr.value}</span>&quot;`;
  }).join('');
}

function escape(html) {
  return html
   .replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;")
   .replace(/'/g, "&#039;");
 }

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-dom-tree',this));

;(function(define){'use strict';define(function(require,exports,module){



var component = require('customizer-gaia-component');


module.exports = component.register('customizer-gaia-modal', {

  
  created: function() {
    this.setupShadowRoot()
    this.active = this.getAttribute('active');
  },

  
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
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-modal',this));

;(function(umd){umd(function(require,exports,module){
'use strict';



var component = require('customizer-gaia-component');



module.exports = component.register('customizer-gaia-tabs', {

  
  created: function() {
    this.setupShadowRoot();

    this.els = {
      marker: this.shadowRoot.querySelector('.marker')
    };

    this.makeAccessible();
    this.addEventListener('click', this.onClick);
    this.select(this.getAttribute('selected'));
    this.setupMarker();
  },

  getLength: function() {
    var style = this.querySelector('style') ? 1 : 0;
    return this.children.length - style;
  },

  setupMarker: function() {
    this.els.marker.style.width = (1 / this.getLength() * 100) + '%';
  },

  setMarkerPosition: function(index) {
    index = document.dir === 'rtl' ? this.getLength() - index - 1 : index;
    this.els.marker.style.transform = 'translateX(' + index * 100 + '%)';
  },

  
  makeAccessible: function() {
    this.setAttribute('role', 'tablist');
    for (var el = this.firstElementChild; el; el = el.nextElementSibling) {
      el.setAttribute('role', 'tab');
      el.tabIndex = 0;
    }
  },

  
  onClick: function(e) {
    var el = e.target;
    var i;
    while (el) {
      i = [].indexOf.call(this.children, el);
      if (i > -1) { return this.select(i); }
      el = el.parentNode;
    }
  },

  
  select: function(index) {
    if (index === null) { return; }
    index = Number(index);

    var el = this.children[index];
    this.deselect(this.selected);
    this.setMarkerPosition(index);
    this.selectedChild = el;
    this.selected = index;

    el.setAttribute('aria-selected', 'true');
    el.classList.add('selected');

    var e = new CustomEvent('change');
    setTimeout(this.dispatchEvent.bind(this, e));
  },

  
  deselect: function(index) {
    var el = this.children[index];
    if (!el) { return; }
    el.removeAttribute('aria-selected');
    el.classList.remove('selected');
    if (this.current == el) {
      this.selectedChild = null;
      this.selected = null;
    }
  },

  template: `
    <div class="inner">
      <content></content>
      <div class="marker"></div>
    </div>
    <style>

    

    :host {
      display: block;
      position: relative;
      border-top: 1px solid;
      overflow: hidden;

      border-color:
        var(--border-color,
        var(--background-plus))
    }

    

    .inner {
      display: flex;
      height: 45px;
    }

    

    ::content > * {
      position: relative;

      display: block;
      height: 100%;
      text-align: center;
      line-height: 45px;
      outline: 0;
      border: 0;
      flex: 1;

      font-size: 17px;
      font-style: italic;
      font-weight: lighter;
      background: none;
      cursor: pointer;
      color: inherit;
      transition:
        color,
        opacity 0.2s;
      transition-delay: 200ms;
    }

    

    ::content > :active {
      transition: none;
      opacity: 0.3;
    }

    

    ::content > .selected {
      color: var(--highlight-color, #000);
      transition: none;
    }

    

    ::content > [disabled] {
      transition: none;
      opacity: 0.3;
      pointer-events: none;
    }

    

    ::content style {
      display: none !important;
    }

    

    .marker {
      position: absolute;
      bottom: 0px;
      left: 0px;
      height: 3px;
      background: var(--highlight-color, #000);
      transition: transform 0.2s;
      transition-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
    }

    </style>
  `
});

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-tabs',this));


;(function(define){'use strict';define(function(require,exports,module){


var component = require('customizer-gaia-component');
var fontFit = require('font-fit');


require('customizer-gaia-icons');


var debug = 0 ? console.log.bind(console) : function() {};


const KNOWN_ACTIONS = {
  menu: 'menu',
  back: 'back',
  close: 'close'
};


const TITLE_FONT = 'italic 300 24px FiraSans';


const TITLE_PADDING = 10;


const MINIMUM_FONT_SIZE_CENTERED = 20;


const MINIMUM_FONT_SIZE_UNCENTERED = 16;


const MAXIMUM_FONT_SIZE = 23;


module.exports = component.register('customizer-gaia-header', {

  
  created: function() {
    debug('created');
    this.setupShadowRoot()
    this.els = {
      actionButton: this.shadowRoot.querySelector('.action-button'),
      titles: this.getElementsByTagName('h1')
    }
    this.els.actionButton.addEventListener('click',
      e => this.onActionButtonClick(e));
    this.observer = new MutationObserver(this.onMutation.bind(this))
    this.titleEnd = this.getAttribute('title-end');
    this.titleStart = this.getAttribute('title-start');
    this.noFontFit = this.getAttribute('no-font-fit');
    this.notFlush = this.hasAttribute('not-flush');
    this.action = this.getAttribute('action');

    this.unresolved = {};
    this.pending = {};
    this._resizeThrottlingId = null
    this.onResize = this.onResize.bind(this);
  },

  
  attached: function() {
    debug('attached');
    this.runFontFitSoon();
    this.observerStart();
    window.addEventListener('resize', this.onResize);
  },

  
  detached: function() {
    debug('detached');
    window.removeEventListener('resize', this.onResize);
    this.observerStop();
    this.clearPending();
  },

  
  clearPending: function() {
    for (var key in this.pending) {
      this.pending[key].clear();
      delete this.pending[key];
    }

    window.cancelAnimationFrame(this._resizeThrottlingId);
    this._resizeThrottlingId = null;
  },

  
  runFontFit: function() {
    debug('run font-fit')
    if (this.noFontFit) { return Promise.resolve(); }

    var titles = this.els.titles;
    var space = this.getTitleSpace();
    var styles = [].map.call(titles, el => this.getTitleStyle(el, space))
    return this.setTitleStylesSoon(styles);
  },

  
  runFontFitSoon: function() {
    debug('run font-fit soon');
    if (this.pending.runFontFitSoon) { return; }
    this.pending.runFontFitSoon = this.nextTick(() => {
      delete this.pending.runFontFitSoon;
      this.runFontFit();
    });
  },

  
  getTitleStyle: function(el, space) {
    debug('get el style', el, space);
    var text = el.textContent;
    var styleId = space.start + text + space.end + '#' + space.value
    if (!text || !text.trim()) { return debug('exit: no text'); }
    if (getStyleId(el) === styleId) { return debug('exit: no change'); }

    var marginStart = this.getTitleMarginStart();
    var textSpace = space.value - Math.abs(marginStart);
    var fontFitResult = this.fontFit(text, textSpace, {
      min: MINIMUM_FONT_SIZE_CENTERED
    });

    var overflowing = fontFitResult.overflowing;
    var padding = { start: 0, end: 0 }
    if (overflowing) {
      debug('title overflowing');
      padding.start = !space.start ? TITLE_PADDING : 0;
      padding.end = !space.end ? TITLE_PADDING : 0;
      textSpace = space.value - padding.start - padding.end;
      fontFitResult = this.fontFit(text, textSpace);
      marginStart = 0;
    }

    return {
      id: styleId,
      fontSize: fontFitResult.fontSize,
      marginStart: marginStart,
      overflowing: overflowing,
      padding: padding
    };
  },

  
  setTitleStylesSoon: function(styles) {
    debug('set title styles soon', styles);
    var key = 'setStyleTitlesSoon'
    this._titleStyles = styles
    if (this.unresolved[key]) { return this.unresolved[key]; }
    this.unresolved[key] = new Promise((resolve) => {
      this.pending[key] = this.nextTick(() => {
        var styles = this._titleStyles;
        var els = this.els.titles;

        [].forEach.call(els, (el, i) => {
          if (!styles[i]) { return debug('exit'); }
          this.setTitleStyle(el, styles[i]);
        })
        delete this._titleStyles;
        delete this.unresolved[key];
        delete this.pending[key];

        resolve();
      });
    });
  },

  
  setTitleStyle: function(el, style) {
    debug('set title style', style);
    this.observerStop();
    el.style.marginLeft = style.marginStart + 'px';
    el.style.paddingLeft = style.padding.start + 'px';
    el.style.paddingRight = style.padding.end + 'px';
    el.style.fontSize = style.fontSize + 'px';
    setStyleId(el, style.id);
    this.observerStart();
  },

  
  fontFit: function(text, space, opts = {}) {
    debug('font fit:', text, space, opts);

    var fontFitArgs = {
      font: TITLE_FONT,
      min: opts.min || MINIMUM_FONT_SIZE_UNCENTERED,
      max: MAXIMUM_FONT_SIZE,
      text: text,
      space: space
    };

    return fontFit(fontFitArgs);
  },

  
  observerStart: function() {
    if (this.observing) { return; }

    this.observer.observe(this, {
      childList: true,
      attributes: true,
      subtree: true
    });

    this.observing = true;
    debug('observer started');
  },

  
  observerStop: function() {
    if (!this.observing) { return; }
    this.observer.disconnect();

    this.observing = false;
    debug('observer stopped');
  },

  
  onResize: function(e) {
    debug('onResize', this._resizeThrottlingId);

    if (this._resizeThrottlingId !== null) {
      return;
    }

    
    this._resizeThrottlingId = window.requestAnimationFrame(() => {
      this._resizeThrottlingId = null;
      this.runFontFitSoon();
    });
  },

  
  onMutation: function(mutations) {
    debug('on mutation', mutations);
    if (!this.pending.runFontFitSoon) { this.runFontFit(); }
  },

  
  getTitleSpace: function() {
    var start = this.titleStart;
    var end = this.titleEnd;
    var space = this.getWidth() - start - end;
    var result = {
      value: space,
      start: start,
      end: end
    };

    debug('get title space', result);
    return result;
  },

  
  getWidth: function() {
    var value = this.notFlush ?
      this.clientWidth : window.innerWidth;

    debug('get width', value);
    return value;
  },

  
  triggerAction: function() {
    if (this.action) { this.els.actionButton.click(); }
  },

  
  onActionButtonClick: function() {
    debug('action button click');
    var config = { detail: { type: this.action } };
    var e = new CustomEvent('action', config);
    setTimeout(() => this.dispatchEvent(e));
  },

  
  getTitleMarginStart: function() {
    var start = this.titleStart;
    var end = this.titleEnd;
    var marginStart = end - start;
    debug('get title margin start', marginStart);
    return marginStart;
  },

  
  getButtonsBeforeTitle: function() {
    var children = this.children;
    var l = children.length;
    var els = [];

    for (var i = 0; i < l; i++) {
      var el = children[i];
      if (el.tagName === 'H1') { break; }
      if (!contributesToLayout(el)) { continue; }

      els.push(el);
    }
    if (this.action) { els.push(this.els.actionButton); }
    return els;
  },

  
  getButtonsAfterTitle: function() {
    var children = this.children;
    var els = [];

    for (var i = children.length - 1; i >= 0; i--) {
      var el = children[i];
      if (el.tagName === 'H1') { break; }
      if (!contributesToLayout(el)) { continue; }

      els.push(el);
    }

    return els;
  },

  
  sumButtonWidths: function(buttons) {
    var defaultWidth = 50;
    var sum = buttons.reduce((prev, button) => {
      var isStandardButton = button === this.els.actionButton;
      var width = isStandardButton ? defaultWidth : button.clientWidth;
      return prev + width;
    }, 0);

    debug('sum button widths', buttons, sum);
    return sum;
  },

  
  attrs: {
    action: {
      get: function() { return this._action; },
      set: function(value) {
        var action = KNOWN_ACTIONS[value];
        if (action === this._action) { return; }
        this.setAttr('action', action);
        this._action = action;
      }
    },

    titleStart: {
      get: function() {
        debug('get title-start');
        if ('_titleStart' in this) { return this._titleStart; }
        var buttons = this.getButtonsBeforeTitle();
        var value = this.sumButtonWidths(buttons);
        debug('get title-start', buttons, value);
        return value;
      },

      set: function(value) {
        debug('set title-start', value);
        value = parseInt(value, 10);
        if (value === this._titleStart || isNaN(value)) { return; }
        this.setAttr('title-start', value);
        this._titleStart = value;
        debug('set');
      }
    },

    titleEnd: {
      get: function() {
        debug('get title-end');
        if ('_titleEnd' in this) { return this._titleEnd; }
        var buttons = this.getButtonsAfterTitle();
        return this.sumButtonWidths(buttons);
      },

      set: function(value) {
        debug('set title-end', value);
        value = parseInt(value, 10);
        if (value === this._titleEnd || isNaN(value)) { return; }
        this.setAttr('title-end', value);
        this._titleEnd = value;
      }
    },

    noFontFit: {
      get: function() { return this._noFontFit || false; },
      set: function(value) {
        debug('set no-font-fit', value);
        value = !!(value || value === '');

        if (value === this.noFontFit) { return; }
        this._noFontFit = value;

        if (value) { this.setAttr('no-font-fit', ''); }
        else { this.removeAttr('no-font-fit'); }
      }
    }
  },

  template: `<div class="inner">
    <button class="action-button">
      <content select=".l10n-action"></content>
    </button>
    <content></content>
  </div>

  <style>

  :host {
    display: block;
    -moz-user-select: none;

    --customizer-gaia-header-button-color:
      var(--header-button-color,
      var(--header-color,
      var(--link-color,
      inherit)));
  }

  

  :host[hidden] {
    display: none;
  }

  

  ::-moz-focus-inner { border: 0; }

  

  .inner {
    display: flex;
    min-height: 50px;
    direction: ltr;
    -moz-user-select: none;

    background:
      var(--header-background,
      var(--background,
      #fff));
  }

  

  

  .action-button {
    position: relative;

    display: none; 
    width: 50px;
    font-size: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;

    align-items: center;
    background: none;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--customizer-gaia-header-button-color)));
  }

  

  [action=back] .action-button,
  [action=menu] .action-button,
  [action=close] .action-button {
    display: flex; 
  }

  

  .action-button:active {
    transition: none;
    opacity: 0.2;
  }

  

  .action-button:before {
    font-family: 'customizer-gaia-icons';
    font-style: normal;
    text-rendering: optimizeLegibility;
    font-weight: 500;
  }

  [action=close] .action-button:before { content: 'close' }
  [action=back] .action-button:before { content: 'back' }
  [action=menu] .action-button:before { content: 'menu' }

  

  

  .action-button:before {
    display: block;
  }

  

  

  ::content .l10n-action {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    font-size: 0;
  }

  

  

  ::content h1 {
    flex: 1;
    margin: 0;
    padding: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    line-height: 50px; 
    font-weight: 300;
    font-style: italic;
    font-size: 24px;

    color:
      var(--header-title-color,
      var(--header-color,
      var(--title-color,
      var(--text-color,
      inherit))));
  }

  

  :host-context([dir=rtl]) ::content h1 {
    direction: rtl;
  }

  

  ::content a,
  ::content button {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    width: auto;
    height: auto;
    min-width: 50px;
    margin: 0;
    padding: 0 10px;
    outline: 0;
    border: 0;

    font-size: 14px;
    line-height: 1;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    text-align: center;
    background: none;
    border-radius: 0;
    font-style: italic;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color: var(--customizer-gaia-header-button-color);
  }

  

  ::content a:active,
  ::content button:active {
    transition: none;
    opacity: 0.2;
  }

  

  ::content a[hidden],
  ::content button[hidden] {
    display: none;
  }

  

  ::content a[disabled],
  ::content button[disabled] {
    pointer-events: none;
    color: var(--header-disabled-button-color);
  }

  

  

  ::content .icon,
  ::content [data-icon] {
    color:
      var(--header-icon-color,
      var(--customizer-gaia-header-button-color));
  }

  

  ::content .action {
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--customizer-gaia-header-button-color)));
  }

  

  ::content [data-icon]:empty {
    width: 50px;
  }

  </style>`,
  nextTick: nextTick
});




function contributesToLayout(el) { return el.tagName !== 'STYLE'; }


function setStyleId(el, id) { el._styleId = id; }


function getStyleId(el) { return el._styleId; }


function nextTick(fn) {
  var cleared;
  Promise.resolve().then(() => { if (!cleared) { fn(); } });
  return { clear: function() { cleared = true; }};
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-header',this));


;(function(define){'use strict';define(function(require,exports,module){



var component = require('customizer-gaia-component');



var pointer = [
  { down: 'touchstart', up: 'touchend', move: 'touchmove' },
  { down: 'mousedown', up: 'mouseup', move: 'mousemove' }
]['ontouchstart' in window ? 0 : 1];




module.exports = component.register('customizer-gaia-list', {
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

    

    label { background: none; }

    

    :host {
      position: relative;

      display: block;
      overflow: hidden;
      font-size: 17px;
    }

    

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

    

    ::content h1,
    ::content h2,
    ::content h3,
    ::content h4 {
      font-weight: 400;
    }

    

    

    ::content [flexbox] {
      display: flex;
    }

    

    ::content [flex] {
      flex: 1;
    }

    

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

    
    ::content > :first-child:before,
    ::content > style:first-child ~ :nth-child(2):before,
    ::content > customizer-gaia-header:first-child ~ :nth-child(2):before,
    ::content > customizer-gaia-sub-header:first-child ~ :nth-child(2):before,
    ::content > h1:first-child ~ :nth-child(2):before,
    ::content > h2:first-child ~ :nth-child(2):before,
    ::content > .borderless:before {
      display: none;
    }

    

    ::content small,
    ::content p {
      font-size: 0.7em;
      line-height: 1.35em;
    }

    

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

    

    :host-context([dir=rtl]) ::content i:before {
      transform: scale(-1, 1);
      text-align: end;
    }

    

    ::content .divided {
      -moz-border-start: solid 1px;
      -moz-padding-start: 14px;

      border-color:
        var(--border-color,
        var(--background-plus));
    }

    

    .ripple-container.ripple-container {
      box-sizing: content-box;
      position: absolute;
      z-index: -1;
      padding-top: 1px;
      overflow: hidden;
    }

    

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
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-list',this));

(function(define){define(function(require,exports,module){

'use strict';



var component = require('customizer-gaia-component');



module.exports = component.register('customizer-gaia-button', {
  created: function() {
    this.setupShadowRoot();
    this.setAttribute('role', 'button');
    this.tabIndex = 0;
  },

  attrs: {
    circular: {
      get: function() { return this.getAttribute('circular'); },
      set: function(value) {
        value = !!(value === '' || value);
        if (value) {
          this.setAttribute('circular', '');
        } else {
          this.removeAttribute('circular');
        }
      }
    },

    disabled: {
      get: function() { return this.getAttribute('disabled'); },
      set: function(value) {
        value = !!(value === '' || value);
        if (value) {
          this.setAttribute('disabled', '');
        } else {
          this.removeAttribute('disabled');
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
      overflow: hidden;
      height: 50px;
      min-width: 50%;
      border-radius: 50px;
      margin: var(--base-m, 18px) 0;
      outline: 0;
      font-style: italic;
      font-size: 17px;
      cursor: pointer;
      -moz-user-select: none;
      line-height: 1;

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

      transition: color 0ms 300ms;
    }

    @media(min-width:500px) {
      :host { min-width: 140px; }
    }

    

    :host(:active) {
      color: var(--button-color-active, #fff);
      box-shadow: var(--button-box-shadow-active, none);
      transition: none;
    }

    

    :host([circular]) {
      width: 50px;
      min-width: 0;
      border-radius: 50%;
    }

    :host([disabled]) {
      pointer-events: none;
      opacity: 0.5;
    }

    

    .inner {
      position: relative;
      height: 100%;
    }

    

    .background {
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



    

    

    .content {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
      height: 100%;
      padding: 0 18px;
      pointer-events: none; 
    }

    [circular] .content {
      padding: 0;
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

    </style>`
});

});})((function(n,w){return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:function(c){
var m={exports:{}},r=function(n){return w[n];};w[n]=c(r,m.exports,m)||m.exports;};})('customizer-gaia-button',this));

;(function(define){define(function(require,exports,module){

'use strict';



var GaiaDialogMenu = require('customizer-gaia-dialog-menu');



var forEach = [].forEach;
var slice = [].slice;


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



::-moz-focus-inner { border: 0; }



.-host {
  display: block;
}



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



.more-button :active,
.-content > :active {
  transition: none;
  color: var(--highlight-color);
}



.-content > .overflowing {
  display: none;
}



.-content > [disabled] {
  pointer-events: none;
  opacity: 0.3;
}

.-content > [data-icon] {
  font-size: 0;
}



style {
  display: none !important;
}



.more-button {
  display: none;
  flex: 0.7;
}



.more-button:before {
  font-family: 'customizer-gaia-icons';
  font-weight: 500;
  content: 'more';
  text-rendering: optimizeLegibility;
  font-style: normal;
  font-size: 32px;
}



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
try {
  module.exports = document.registerElement('customizer-gaia-toolbar', { prototype: proto });
  module.exports.proto = proto;
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('customizer-gaia-toolbar',this));


!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.JSZip=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict'
var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
exports.encode = function(input, utf8) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {

        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        }
        else if (isNaN(chr3)) {
            enc4 = 64;
        }

        output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);

    }

    return output;
}
exports.decode = function(input, utf8) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }

    }

    return output;

};

},{}],2:[function(_dereq_,module,exports){
'use strict';
function CompressedObject() {
    this.compressedSize = 0;
    this.uncompressedSize = 0;
    this.crc32 = 0;
    this.compressionMethod = null;
    this.compressedContent = null;
}

CompressedObject.prototype = {
    
    getContent: function() {
        return null
    },
    
    getCompressedContent: function() {
        return null
    }
};
module.exports = CompressedObject;

},{}],3:[function(_dereq_,module,exports){
'use strict';
exports.STORE = {
    magic: "\x00\x00",
    compress: function(content, compressionOptions) {
        return content
    },
    uncompress: function(content) {
        return content
    },
    compressInputType: null,
    uncompressInputType: null
};
exports.DEFLATE = _dereq_('./flate');

},{"./flate":8}],4:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');

var table = [
    0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
    0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
    0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
    0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
    0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
    0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
    0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
    0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
    0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
    0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
    0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
    0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
    0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
    0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
    0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
    0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
    0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
    0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
    0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
    0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
    0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
    0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
    0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
    0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
    0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
    0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
    0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
    0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
    0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
    0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
    0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
    0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
    0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
    0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
    0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
    0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
    0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
    0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
    0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
    0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
    0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
    0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
    0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
    0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
    0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
    0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
    0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
    0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
    0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
    0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
    0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
    0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
    0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
    0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
    0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
    0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
    0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
    0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
    0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
    0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
    0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
    0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
    0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
    0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D
];


module.exports = function crc32(input, crc) {
    if (typeof input === "undefined" || !input.length) {
        return 0;
    }

    var isArray = utils.getTypeOf(input) !== "string";

    if (typeof(crc) == "undefined") {
        crc = 0;
    }
    var x = 0;
    var y = 0;
    var b = 0;

    crc = crc ^ (-1);
    for (var i = 0, iTop = input.length; i < iTop; i++) {
        b = isArray ? input[i] : input.charCodeAt(i);
        y = (crc ^ b) & 0xFF;
        x = table[y];
        crc = (crc >>> 8) ^ x;
    }

    return crc ^ (-1);
}

},{"./utils":21}],5:[function(_dereq_,module,exports){
'use strict';
var utils = _dereq_('./utils');

function DataReader(data) {
    this.data = null
    this.length = 0;
    this.index = 0;
}
DataReader.prototype = {
    
    checkOffset: function(offset) {
        this.checkIndex(this.index + offset);
    },
    
    checkIndex: function(newIndex) {
        if (this.length < newIndex || newIndex < 0) {
            throw new Error("End of data reached (data length = " + this.length + ", asked index = " + (newIndex) + "). Corrupted zip ?");
        }
    },
    
    setIndex: function(newIndex) {
        this.checkIndex(newIndex);
        this.index = newIndex;
    },
    
    skip: function(n) {
        this.setIndex(this.index + n);
    },
    
    byteAt: function(i) {
    },
    
    readInt: function(size) {
        var result = 0,
            i;
        this.checkOffset(size);
        for (i = this.index + size - 1; i >= this.index; i--) {
            result = (result << 8) + this.byteAt(i);
        }
        this.index += size;
        return result;
    },
    
    readString: function(size) {
        return utils.transformTo("string", this.readData(size));
    },
    
    readData: function(size) {
    },
    
    lastIndexOfSignature: function(sig) {
    },
    
    readDate: function() {
        var dostime = this.readInt(4);
        return new Date(
        ((dostime >> 25) & 0x7f) + 1980,
        ((dostime >> 21) & 0x0f) - 1,
        (dostime >> 16) & 0x1f,
        (dostime >> 11) & 0x1f,
        (dostime >> 5) & 0x3f,
        (dostime & 0x1f) << 1)
    }
};
module.exports = DataReader;

},{"./utils":21}],6:[function(_dereq_,module,exports){
'use strict';
exports.base64 = false;
exports.binary = false;
exports.dir = false;
exports.createFolders = false;
exports.date = null;
exports.compression = null;
exports.compressionOptions = null;
exports.comment = null;
exports.unixPermissions = null;
exports.dosPermissions = null;

},{}],7:[function(_dereq_,module,exports){
'use strict';
var utils = _dereq_('./utils');


exports.string2binary = function(str) {
    return utils.string2binary(str);
};


exports.string2Uint8Array = function(str) {
    return utils.transformTo("uint8array", str);
};


exports.uint8Array2String = function(array) {
    return utils.transformTo("string", array);
};


exports.string2Blob = function(str) {
    var buffer = utils.transformTo("arraybuffer", str);
    return utils.arrayBuffer2Blob(buffer);
};


exports.arrayBuffer2Blob = function(buffer) {
    return utils.arrayBuffer2Blob(buffer);
};


exports.transformTo = function(outputType, input) {
    return utils.transformTo(outputType, input);
};


exports.getTypeOf = function(input) {
    return utils.getTypeOf(input);
};


exports.checkSupport = function(type) {
    return utils.checkSupport(type);
};


exports.MAX_VALUE_16BITS = utils.MAX_VALUE_16BITS;


exports.MAX_VALUE_32BITS = utils.MAX_VALUE_32BITS;



exports.pretty = function(str) {
    return utils.pretty(str);
};


exports.findCompression = function(compressionMethod) {
    return utils.findCompression(compressionMethod);
};


exports.isRegExp = function (object) {
    return utils.isRegExp(object);
};


},{"./utils":21}],8:[function(_dereq_,module,exports){
'use strict';
var USE_TYPEDARRAY = (typeof Uint8Array !== 'undefined') && (typeof Uint16Array !== 'undefined') && (typeof Uint32Array !== 'undefined');

var pako = _dereq_("pako");
exports.uncompressInputType = USE_TYPEDARRAY ? "uint8array" : "array";
exports.compressInputType = USE_TYPEDARRAY ? "uint8array" : "array";

exports.magic = "\x08\x00";
exports.compress = function(input, compressionOptions) {
    return pako.deflateRaw(input, {
        level : compressionOptions.level || -1
    });
};
exports.uncompress =  function(input) {
    return pako.inflateRaw(input);
};

},{"pako":24}],9:[function(_dereq_,module,exports){
'use strict';

var base64 = _dereq_('./base64');




function JSZip(data, options) {
    if(!(this instanceof JSZip)) return new JSZip(data, options)
    this.files = {};

    this.comment = null
    this.root = "";
    if (data) {
        this.load(data, options);
    }
    this.clone = function() {
        var newObj = new JSZip();
        for (var i in this) {
            if (typeof this[i] !== "function") {
                newObj[i] = this[i];
            }
        }
        return newObj;
    };
}
JSZip.prototype = _dereq_('./object');
JSZip.prototype.load = _dereq_('./load');
JSZip.support = _dereq_('./support');
JSZip.defaults = _dereq_('./defaults');


JSZip.utils = _dereq_('./deprecatedPublicUtils');

JSZip.base64 = {
    
    encode : function(input) {
        return base64.encode(input);
    },
    
    decode : function(input) {
        return base64.decode(input);
    }
};
JSZip.compressions = _dereq_('./compressions');
module.exports = JSZip;

},{"./base64":1,"./compressions":3,"./defaults":6,"./deprecatedPublicUtils":7,"./load":10,"./object":13,"./support":17}],10:[function(_dereq_,module,exports){
'use strict';
var base64 = _dereq_('./base64');
var ZipEntries = _dereq_('./zipEntries');
module.exports = function(data, options) {
    var files, zipEntries, i, input;
    options = options || {};
    if (options.base64) {
        data = base64.decode(data);
    }

    zipEntries = new ZipEntries(data, options);
    files = zipEntries.files;
    for (i = 0; i < files.length; i++) {
        input = files[i];
        this.file(input.fileName, input.decompressed, {
            binary: true,
            optimizedBinaryString: true,
            date: input.date,
            dir: input.dir,
            comment : input.fileComment.length ? input.fileComment : null,
            unixPermissions : input.unixPermissions,
            dosPermissions : input.dosPermissions,
            createFolders: options.createFolders
        });
    }
    if (zipEntries.zipComment.length) {
        this.comment = zipEntries.zipComment;
    }

    return this;
};

},{"./base64":1,"./zipEntries":22}],11:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';
module.exports = function(data, encoding){
    return new Buffer(data, encoding);
};
module.exports.test = function(b){
    return Buffer.isBuffer(b);
};

}).call(this,(typeof Buffer !== "undefined" ? Buffer : undefined))
},{}],12:[function(_dereq_,module,exports){
'use strict';
var Uint8ArrayReader = _dereq_('./uint8ArrayReader');

function NodeBufferReader(data) {
    this.data = data;
    this.length = this.data.length;
    this.index = 0;
}
NodeBufferReader.prototype = new Uint8ArrayReader();


NodeBufferReader.prototype.readData = function(size) {
    this.checkOffset(size);
    var result = this.data.slice(this.index, this.index + size);
    this.index += size;
    return result;
};
module.exports = NodeBufferReader;

},{"./uint8ArrayReader":18}],13:[function(_dereq_,module,exports){
'use strict';
var support = _dereq_('./support');
var utils = _dereq_('./utils');
var crc32 = _dereq_('./crc32');
var signature = _dereq_('./signature');
var defaults = _dereq_('./defaults');
var base64 = _dereq_('./base64');
var compressions = _dereq_('./compressions');
var CompressedObject = _dereq_('./compressedObject');
var nodeBuffer = _dereq_('./nodeBuffer');
var utf8 = _dereq_('./utf8');
var StringWriter = _dereq_('./stringWriter');
var Uint8ArrayWriter = _dereq_('./uint8ArrayWriter');


var getRawData = function(file) {
    if (file._data instanceof CompressedObject) {
        file._data = file._data.getContent();
        file.options.binary = true;
        file.options.base64 = false;

        if (utils.getTypeOf(file._data) === "uint8array") {
            var copy = file._data
            file._data = new Uint8Array(copy.length)
            if (copy.length !== 0) {
                file._data.set(copy, 0);
            }
        }
    }
    return file._data;
};


var getBinaryData = function(file) {
    var result = getRawData(file),
        type = utils.getTypeOf(result);
    if (type === "string") {
        if (!file.options.binary) {
            if (support.nodebuffer) {
                return nodeBuffer(result, "utf-8");
            }
        }
        return file.asBinary();
    }
    return result;
};


var dataToString = function(asUTF8) {
    var result = getRawData(this);
    if (result === null || typeof result === "undefined") {
        return "";
    }
    if (this.options.base64) {
        result = base64.decode(result);
    }
    if (asUTF8 && this.options.binary) {
        result = out.utf8decode(result);
    }
    else {
        result = utils.transformTo("string", result);
    }

    if (!asUTF8 && !this.options.binary) {
        result = utils.transformTo("string", out.utf8encode(result));
    }
    return result;
};

var ZipObject = function(name, data, options) {
    this.name = name;
    this.dir = options.dir;
    this.date = options.date;
    this.comment = options.comment;
    this.unixPermissions = options.unixPermissions;
    this.dosPermissions = options.dosPermissions;

    this._data = data;
    this.options = options;

    
    this._initialMetadata = {
      dir : options.dir,
      date : options.date
    };
};

ZipObject.prototype = {
    
    asText: function() {
        return dataToString.call(this, true);
    },
    
    asBinary: function() {
        return dataToString.call(this, false);
    },
    
    asNodeBuffer: function() {
        var result = getBinaryData(this);
        return utils.transformTo("nodebuffer", result);
    },
    
    asUint8Array: function() {
        var result = getBinaryData(this);
        return utils.transformTo("uint8array", result);
    },
    
    asArrayBuffer: function() {
        return this.asUint8Array().buffer;
    }
};


var decToHex = function(dec, bytes) {
    var hex = "",
        i;
    for (i = 0; i < bytes; i++) {
        hex += String.fromCharCode(dec & 0xff);
        dec = dec >>> 8;
    }
    return hex;
};


var extend = function() {
    var result = {}, i, attr;
    for (i = 0; i < arguments.length; i++) {
        for (attr in arguments[i]) {
            if (arguments[i].hasOwnProperty(attr) && typeof result[attr] === "undefined") {
                result[attr] = arguments[i][attr];
            }
        }
    }
    return result;
};


var prepareFileAttrs = function(o) {
    o = o || {};
    if (o.base64 === true && (o.binary === null || o.binary === undefined)) {
        o.binary = true;
    }
    o = extend(o, defaults);
    o.date = o.date || new Date();
    if (o.compression !== null) o.compression = o.compression.toUpperCase();

    return o;
};


var fileAdd = function(name, data, o) {
    var dataType = utils.getTypeOf(data),
        parent;

    o = prepareFileAttrs(o);

    if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
    }
    if (o.unixPermissions && (o.unixPermissions & 0x4000)) {
        o.dir = true;
    }
    if (o.dosPermissions && (o.dosPermissions & 0x0010)) {
        o.dir = true;
    }

    if (o.dir) {
        name = forceTrailingSlash(name);
    }

    if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
    }

    if (o.dir || data === null || typeof data === "undefined") {
        o.base64 = false;
        o.binary = false;
        data = null;
        dataType = null;
    }
    else if (dataType === "string") {
        if (o.binary && !o.base64) {
            if (o.optimizedBinaryString !== true) {
                data = utils.string2binary(data);
            }
        }
    }
    else {
        o.base64 = false;
        o.binary = true;

        if (!dataType && !(data instanceof CompressedObject)) {
            throw new Error("The data of '" + name + "' is in an unsupported format !");
        }
        if (dataType === "arraybuffer") {
            data = utils.transformTo("uint8array", data);
        }
    }

    var object = new ZipObject(name, data, o);
    this.files[name] = object;
    return object;
};


var parentFolder = function (path) {
    if (path.slice(-1) == '/') {
        path = path.substring(0, path.length - 1);
    }
    var lastSlash = path.lastIndexOf('/');
    return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
};



var forceTrailingSlash = function(path) {
    if (path.slice(-1) != "/") {
        path += "/"
    }
    return path;
};

var folderAdd = function(name, createFolders) {
    createFolders = (typeof createFolders !== 'undefined') ? createFolders : false;

    name = forceTrailingSlash(name)
    if (!this.files[name]) {
        fileAdd.call(this, name, null, {
            dir: true,
            createFolders: createFolders
        });
    }
    return this.files[name];
};


var generateCompressedObjectFrom = function(file, compression, compressionOptions) {
    var result = new CompressedObject(),
        content
    if (file._data instanceof CompressedObject) {
        result.uncompressedSize = file._data.uncompressedSize;
        result.crc32 = file._data.crc32;

        if (result.uncompressedSize === 0 || file.dir) {
            compression = compressions['STORE'];
            result.compressedContent = "";
            result.crc32 = 0;
        }
        else if (file._data.compressionMethod === compression.magic) {
            result.compressedContent = file._data.getCompressedContent();
        }
        else {
            content = file._data.getContent()
            result.compressedContent = compression.compress(utils.transformTo(compression.compressInputType, content), compressionOptions);
        }
    }
    else {
        content = getBinaryData(file);
        if (!content || content.length === 0 || file.dir) {
            compression = compressions['STORE'];
            content = "";
        }
        result.uncompressedSize = content.length;
        result.crc32 = crc32(content);
        result.compressedContent = compression.compress(utils.transformTo(compression.compressInputType, content), compressionOptions);
    }

    result.compressedSize = result.compressedContent.length;
    result.compressionMethod = compression.magic;

    return result;
};





var generateUnixExternalFileAttr = function (unixPermissions, isDir) {

    var result = unixPermissions;
    if (!unixPermissions) {
        result = isDir ? 0x41fd : 0x81b4;
    }

    return (result & 0xFFFF) << 16;
};


var generateDosExternalFileAttr = function (dosPermissions, isDir) {

    return (dosPermissions || 0)  & 0x3F;
};


var generateZipParts = function(name, file, compressedObject, offset, platform) {
    var data = compressedObject.compressedContent,
        utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)),
        comment = file.comment || "",
        utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)),
        useUTF8ForFileName = utfEncodedFileName.length !== file.name.length,
        useUTF8ForComment = utfEncodedComment.length !== comment.length,
        o = file.options,
        dosTime,
        dosDate,
        extraFields = "",
        unicodePathExtraField = "",
        unicodeCommentExtraField = "",
        dir, date
    if (file._initialMetadata.dir !== file.dir) {
        dir = file.dir;
    } else {
        dir = o.dir;
    }
    if(file._initialMetadata.date !== file.date) {
        date = file.date;
    } else {
        date = o.date;
    }

    var extFileAttr = 0;
    var versionMadeBy = 0;
    if (dir) {
        extFileAttr |= 0x00010;
    }
    if(platform === "UNIX") {
        versionMadeBy = 0x031E
        extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
    } else {
        versionMadeBy = 0x0014
        extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
    }

    dosTime = date.getHours();
    dosTime = dosTime << 6;
    dosTime = dosTime | date.getMinutes();
    dosTime = dosTime << 5;
    dosTime = dosTime | date.getSeconds() / 2;

    dosDate = date.getFullYear() - 1980;
    dosDate = dosDate << 4;
    dosDate = dosDate | (date.getMonth() + 1);
    dosDate = dosDate << 5;
    dosDate = dosDate | date.getDate();

    if (useUTF8ForFileName) {
        unicodePathExtraField =
            decToHex(1, 1) +
            decToHex(crc32(utfEncodedFileName), 4) +
            utfEncodedFileName;

        extraFields +=
            "\x75\x70" +
            decToHex(unicodePathExtraField.length, 2) +
            unicodePathExtraField;
    }

    if(useUTF8ForComment) {

        unicodeCommentExtraField =
            decToHex(1, 1) +
            decToHex(this.crc32(utfEncodedComment), 4) +
            utfEncodedComment;

        extraFields +=
            "\x75\x63" +
            decToHex(unicodeCommentExtraField.length, 2) +
            unicodeCommentExtraField;
    }

    var header = ""
    header += "\x0A\x00"
    header += (useUTF8ForFileName || useUTF8ForComment) ? "\x00\x08" : "\x00\x00"
    header += compressedObject.compressionMethod
    header += decToHex(dosTime, 2)
    header += decToHex(dosDate, 2)
    header += decToHex(compressedObject.crc32, 4)
    header += decToHex(compressedObject.compressedSize, 4)
    header += decToHex(compressedObject.uncompressedSize, 4)
    header += decToHex(utfEncodedFileName.length, 2)
    header += decToHex(extraFields.length, 2);


    var fileRecord = signature.LOCAL_FILE_HEADER + header + utfEncodedFileName + extraFields;

    var dirRecord = signature.CENTRAL_FILE_HEADER +
    decToHex(versionMadeBy, 2) +
    header +
    decToHex(utfEncodedComment.length, 2) +
    "\x00\x00" +
    "\x00\x00" +
    decToHex(extFileAttr, 4) +
    decToHex(offset, 4) +
    utfEncodedFileName +
    extraFields +
    utfEncodedComment;

    return {
        fileRecord: fileRecord,
        dirRecord: dirRecord,
        compressedObject: compressedObject
    };
}
var out = {
    
    load: function(stream, options) {
        throw new Error("Load method is not defined. Is the file jszip-load.js included ?");
    },

    
    filter: function(search) {
        var result = [],
            filename, relativePath, file, fileClone;
        for (filename in this.files) {
            if (!this.files.hasOwnProperty(filename)) {
                continue;
            }
            file = this.files[filename]
            fileClone = new ZipObject(file.name, file._data, extend(file.options));
            relativePath = filename.slice(this.root.length, filename.length);
            if (filename.slice(0, this.root.length) === this.root &&
            search(relativePath, fileClone)) {
                result.push(fileClone);
            }
        }
        return result;
    },

    
    file: function(name, data, o) {
        if (arguments.length === 1) {
            if (utils.isRegExp(name)) {
                var regexp = name;
                return this.filter(function(relativePath, file) {
                    return !file.dir && regexp.test(relativePath);
                });
            }
            else {
                return this.filter(function(relativePath, file) {
                    return !file.dir && relativePath === name;
                })[0] || null;
            }
        }
        else {
            name = this.root + name;
            fileAdd.call(this, name, data, o);
        }
        return this;
    },

    
    folder: function(arg) {
        if (!arg) {
            return this;
        }

        if (utils.isRegExp(arg)) {
            return this.filter(function(relativePath, file) {
                return file.dir && arg.test(relativePath);
            });
        }
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name)
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
    },

    
    remove: function(name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
            if (name.slice(-1) != "/") {
                name += "/";
            }
            file = this.files[name];
        }

        if (file && !file.dir) {
            delete this.files[name];
        } else {
            var kids = this.filter(function(relativePath, file) {
                return file.name.slice(0, name.length) === name;
            });
            for (var i = 0; i < kids.length; i++) {
                delete this.files[kids[i].name];
            }
        }

        return this;
    },

    
    generate: function(options) {
        options = extend(options || {}, {
            base64: true,
            compression: "STORE",
            compressionOptions : null,
            type: "base64",
            platform: "DOS",
            comment: null,
            mimeType: 'application/zip'
        });

        utils.checkSupport(options.type)
        if(
          options.platform === 'darwin' ||
          options.platform === 'freebsd' ||
          options.platform === 'linux' ||
          options.platform === 'sunos'
        ) {
          options.platform = "UNIX";
        }
        if (options.platform === 'win32') {
          options.platform = "DOS";
        }

        var zipData = [],
            localDirLength = 0,
            centralDirLength = 0,
            writer, i,
            utfEncodedComment = utils.transformTo("string", this.utf8encode(options.comment || this.comment || ""))
        for (var name in this.files) {
            if (!this.files.hasOwnProperty(name)) {
                continue;
            }
            var file = this.files[name];

            var compressionName = file.options.compression || options.compression.toUpperCase();
            var compression = compressions[compressionName];
            if (!compression) {
                throw new Error(compressionName + " is not a valid compression method !");
            }
            var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};

            var compressedObject = generateCompressedObjectFrom.call(this, file, compression, compressionOptions);

            var zipPart = generateZipParts.call(this, name, file, compressedObject, localDirLength, options.platform);
            localDirLength += zipPart.fileRecord.length + compressedObject.compressedSize;
            centralDirLength += zipPart.dirRecord.length;
            zipData.push(zipPart);
        }

        var dirEnd = ""
        dirEnd = signature.CENTRAL_DIRECTORY_END +
        "\x00\x00" +
        "\x00\x00" +
        decToHex(zipData.length, 2) +
        decToHex(zipData.length, 2) +
        decToHex(centralDirLength, 4) +
        decToHex(localDirLength, 4) +
        decToHex(utfEncodedComment.length, 2) +
        utfEncodedComment
        var typeName = options.type.toLowerCase();
        if(typeName==="uint8array"||typeName==="arraybuffer"||typeName==="blob"||typeName==="nodebuffer") {
            writer = new Uint8ArrayWriter(localDirLength + centralDirLength + dirEnd.length);
        }else{
            writer = new StringWriter(localDirLength + centralDirLength + dirEnd.length);
        }

        for (i = 0; i < zipData.length; i++) {
            writer.append(zipData[i].fileRecord);
            writer.append(zipData[i].compressedObject.compressedContent);
        }
        for (i = 0; i < zipData.length; i++) {
            writer.append(zipData[i].dirRecord);
        }

        writer.append(dirEnd);

        var zip = writer.finalize();



        switch(options.type.toLowerCase()) {
            case "uint8array" :
            case "arraybuffer" :
            case "nodebuffer" :
               return utils.transformTo(options.type.toLowerCase(), zip);
            case "blob" :
               return utils.arrayBuffer2Blob(utils.transformTo("arraybuffer", zip), options.mimeType)
            case "base64" :
               return (options.base64) ? base64.encode(zip) : zip;
            default :
               return zip;
         }

    },

    
    crc32: function (input, crc) {
        return crc32(input, crc);
    },

    
    utf8encode: function (string) {
        return utils.transformTo("string", utf8.utf8encode(string));
    },

    
    utf8decode: function (input) {
        return utf8.utf8decode(input);
    }
};
module.exports = out;

},{"./base64":1,"./compressedObject":2,"./compressions":3,"./crc32":4,"./defaults":6,"./nodeBuffer":11,"./signature":14,"./stringWriter":16,"./support":17,"./uint8ArrayWriter":19,"./utf8":20,"./utils":21}],14:[function(_dereq_,module,exports){
'use strict';
exports.LOCAL_FILE_HEADER = "PK\x03\x04";
exports.CENTRAL_FILE_HEADER = "PK\x01\x02";
exports.CENTRAL_DIRECTORY_END = "PK\x05\x06";
exports.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";
exports.ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";
exports.DATA_DESCRIPTOR = "PK\x07\x08";

},{}],15:[function(_dereq_,module,exports){
'use strict';
var DataReader = _dereq_('./dataReader');
var utils = _dereq_('./utils');

function StringReader(data, optimizedBinaryString) {
    this.data = data;
    if (!optimizedBinaryString) {
        this.data = utils.string2binary(this.data);
    }
    this.length = this.data.length;
    this.index = 0;
}
StringReader.prototype = new DataReader();

StringReader.prototype.byteAt = function(i) {
    return this.data.charCodeAt(i);
};

StringReader.prototype.lastIndexOfSignature = function(sig) {
    return this.data.lastIndexOf(sig);
};

StringReader.prototype.readData = function(size) {
    this.checkOffset(size)
    var result = this.data.slice(this.index, this.index + size);
    this.index += size;
    return result;
};
module.exports = StringReader;

},{"./dataReader":5,"./utils":21}],16:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');


var StringWriter = function() {
    this.data = [];
};
StringWriter.prototype = {
    
    append: function(input) {
        input = utils.transformTo("string", input);
        this.data.push(input);
    },
    
    finalize: function() {
        return this.data.join("");
    }
};

module.exports = StringWriter;

},{"./utils":21}],17:[function(_dereq_,module,exports){
(function (Buffer){
'use strict';
exports.base64 = true;
exports.array = true;
exports.string = true;
exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined"
exports.nodebuffer = typeof Buffer !== "undefined"
exports.uint8array = typeof Uint8Array !== "undefined";

if (typeof ArrayBuffer === "undefined") {
    exports.blob = false;
}
else {
    var buffer = new ArrayBuffer(0);
    try {
        exports.blob = new Blob([buffer], {
            type: "application/zip"
        }).size === 0;
    }
    catch (e) {
        try {
            var Builder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
            var builder = new Builder();
            builder.append(buffer);
            exports.blob = builder.getBlob('application/zip').size === 0;
        }
        catch (e) {
            exports.blob = false;
        }
    }
}

}).call(this,(typeof Buffer !== "undefined" ? Buffer : undefined))
},{}],18:[function(_dereq_,module,exports){
'use strict';
var DataReader = _dereq_('./dataReader');

function Uint8ArrayReader(data) {
    if (data) {
        this.data = data;
        this.length = this.data.length;
        this.index = 0;
    }
}
Uint8ArrayReader.prototype = new DataReader();

Uint8ArrayReader.prototype.byteAt = function(i) {
    return this.data[i];
};

Uint8ArrayReader.prototype.lastIndexOfSignature = function(sig) {
    var sig0 = sig.charCodeAt(0),
        sig1 = sig.charCodeAt(1),
        sig2 = sig.charCodeAt(2),
        sig3 = sig.charCodeAt(3);
    for (var i = this.length - 4; i >= 0; --i) {
        if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
            return i;
        }
    }

    return -1;
};

Uint8ArrayReader.prototype.readData = function(size) {
    this.checkOffset(size);
    if(size === 0) {
        return new Uint8Array(0);
    }
    var result = this.data.subarray(this.index, this.index + size);
    this.index += size;
    return result;
};
module.exports = Uint8ArrayReader;

},{"./dataReader":5}],19:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');


var Uint8ArrayWriter = function(length) {
    this.data = new Uint8Array(length);
    this.index = 0;
};
Uint8ArrayWriter.prototype = {
    
    append: function(input) {
        if (input.length !== 0) {
            input = utils.transformTo("uint8array", input);
            this.data.set(input, this.index);
            this.index += input.length;
        }
    },
    
    finalize: function() {
        return this.data;
    }
};

module.exports = Uint8ArrayWriter;

},{"./utils":21}],20:[function(_dereq_,module,exports){
'use strict';

var utils = _dereq_('./utils');
var support = _dereq_('./support');
var nodeBuffer = _dereq_('./nodeBuffer');


var _utf8len = new Array(256);
for (var i=0; i<256; i++) {
  _utf8len[i] = (i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1);
}
_utf8len[254]=_utf8len[254]=1
var string2buf = function (str) {
    var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0
    for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }
    if (support.uint8array) {
        buf = new Uint8Array(buf_len);
    } else {
        buf = new Array(buf_len);
    }
    for (i=0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        if (c < 0x80) {
            
            buf[i++] = c;
        } else if (c < 0x800) {
            
            buf[i++] = 0xC0 | (c >>> 6);
            buf[i++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
            
            buf[i++] = 0xE0 | (c >>> 12);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        } else {
            
            buf[i++] = 0xf0 | (c >>> 18);
            buf[i++] = 0x80 | (c >>> 12 & 0x3f);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        }
    }

    return buf;
}
var utf8border = function(buf, max) {
    var pos;

    max = max || buf.length;
    if (max > buf.length) { max = buf.length; }
    pos = max-1;
    while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }
    if (pos < 0) { return max; }
    if (pos === 0) { return max; }

    return (pos + _utf8len[buf[pos]] > max) ? pos : max;
}
var buf2string = function (buf) {
    var str, i, out, c, c_len;
    var len = buf.length
    var utf16buf = new Array(len*2);

    for (out=0, i=0; i<len;) {
        c = buf[i++]
        if (c < 0x80) { utf16buf[out++] = c; continue; }

        c_len = _utf8len[c]
        if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07
        while (c_len > 1 && i < len) {
            c = (c << 6) | (buf[i++] & 0x3f);
            c_len--;
        }
        if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

        if (c < 0x10000) {
            utf16buf[out++] = c;
        } else {
            c -= 0x10000;
            utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
            utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
    }
    if (utf16buf.length !== out) {
        if(utf16buf.subarray) {
            utf16buf = utf16buf.subarray(0, out);
        } else {
            utf16buf.length = out;
        }
    }
    return utils.applyFromCharCode(utf16buf);
}



exports.utf8encode = function utf8encode(str) {
    if (support.nodebuffer) {
        return nodeBuffer(str, "utf-8");
    }

    return string2buf(str);
};



exports.utf8decode = function utf8decode(buf) {
    if (support.nodebuffer) {
        return utils.transformTo("nodebuffer", buf).toString("utf-8");
    }

    buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf)
    var result = [], k = 0, len = buf.length, chunk = 65536;
    while (k < len) {
        var nextBoundary = utf8border(buf, Math.min(k + chunk, len));
        if (support.uint8array) {
            result.push(buf2string(buf.subarray(k, nextBoundary)));
        } else {
            result.push(buf2string(buf.slice(k, nextBoundary)));
        }
        k = nextBoundary;
    }
    return result.join("");

}

},{"./nodeBuffer":11,"./support":17,"./utils":21}],21:[function(_dereq_,module,exports){
'use strict';
var support = _dereq_('./support');
var compressions = _dereq_('./compressions');
var nodeBuffer = _dereq_('./nodeBuffer');

exports.string2binary = function(str) {
    var result = "";
    for (var i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) & 0xff);
    }
    return result;
};
exports.arrayBuffer2Blob = function(buffer, mimeType) {
    exports.checkSupport("blob");
	mimeType = mimeType || 'application/zip';

    try {
        return new Blob([buffer], {
            type: mimeType
        });
    }
    catch (e) {

        try {
            var Builder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
            var builder = new Builder();
            builder.append(buffer);
            return builder.getBlob(mimeType);
        }
        catch (e) {
            throw new Error("Bug : can't construct the Blob.");
        }
    }


};

function identity(input) {
    return input;
}


function stringToArrayLike(str, array) {
    for (var i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 0xFF;
    }
    return array;
}


function arrayLikeToString(array) {
    var chunk = 65536;
    var result = [],
        len = array.length,
        type = exports.getTypeOf(array),
        k = 0,
        canUseApply = true;
      try {
         switch(type) {
            case "uint8array":
               String.fromCharCode.apply(null, new Uint8Array(0));
               break;
            case "nodebuffer":
               String.fromCharCode.apply(null, nodeBuffer(0));
               break;
         }
      } catch(e) {
         canUseApply = false;
      }
      if (!canUseApply) {
         var resultStr = "";
         for(var i = 0; i < array.length;i++) {
            resultStr += String.fromCharCode(array[i]);
         }
    return resultStr;
    }
    while (k < len && chunk > 1) {
        try {
            if (type === "array" || type === "nodebuffer") {
                result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
            }
            else {
                result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
            }
            k += chunk;
        }
        catch (e) {
            chunk = Math.floor(chunk / 2);
        }
    }
    return result.join("");
}

exports.applyFromCharCode = arrayLikeToString;



function arrayLikeToArrayLike(arrayFrom, arrayTo) {
    for (var i = 0; i < arrayFrom.length; i++) {
        arrayTo[i] = arrayFrom[i];
    }
    return arrayTo;
}
var transform = {}
transform["string"] = {
    "string": identity,
    "array": function(input) {
        return stringToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["string"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return stringToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": function(input) {
        return stringToArrayLike(input, nodeBuffer(input.length));
    }
}
transform["array"] = {
    "string": arrayLikeToString,
    "array": identity,
    "arraybuffer": function(input) {
        return (new Uint8Array(input)).buffer;
    },
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodeBuffer(input);
    }
}
transform["arraybuffer"] = {
    "string": function(input) {
        return arrayLikeToString(new Uint8Array(input));
    },
    "array": function(input) {
        return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
    },
    "arraybuffer": identity,
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodeBuffer(new Uint8Array(input));
    }
}
transform["uint8array"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return input.buffer;
    },
    "uint8array": identity,
    "nodebuffer": function(input) {
        return nodeBuffer(input);
    }
}
transform["nodebuffer"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["nodebuffer"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return arrayLikeToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": identity
};


exports.transformTo = function(outputType, input) {
    if (!input) {
        input = "";
    }
    if (!outputType) {
        return input;
    }
    exports.checkSupport(outputType);
    var inputType = exports.getTypeOf(input);
    var result = transform[inputType][outputType](input);
    return result;
};


exports.getTypeOf = function(input) {
    if (typeof input === "string") {
        return "string";
    }
    if (Object.prototype.toString.call(input) === "[object Array]") {
        return "array";
    }
    if (support.nodebuffer && nodeBuffer.test(input)) {
        return "nodebuffer";
    }
    if (support.uint8array && input instanceof Uint8Array) {
        return "uint8array";
    }
    if (support.arraybuffer && input instanceof ArrayBuffer) {
        return "arraybuffer";
    }
};


exports.checkSupport = function(type) {
    var supported = support[type.toLowerCase()];
    if (!supported) {
        throw new Error(type + " is not supported by this browser");
    }
};
exports.MAX_VALUE_16BITS = 65535;
exports.MAX_VALUE_32BITS = -1


exports.pretty = function(str) {
    var res = '',
        code, i;
    for (i = 0; i < (str || "").length; i++) {
        code = str.charCodeAt(i);
        res += '\\x' + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
    }
    return res;
};


exports.findCompression = function(compressionMethod) {
    for (var method in compressions) {
        if (!compressions.hasOwnProperty(method)) {
            continue;
        }
        if (compressions[method].magic === compressionMethod) {
            return compressions[method];
        }
    }
    return null;
};

exports.isRegExp = function (object) {
    return Object.prototype.toString.call(object) === "[object RegExp]";
};


},{"./compressions":3,"./nodeBuffer":11,"./support":17}],22:[function(_dereq_,module,exports){
'use strict';
var StringReader = _dereq_('./stringReader');
var NodeBufferReader = _dereq_('./nodeBufferReader');
var Uint8ArrayReader = _dereq_('./uint8ArrayReader');
var utils = _dereq_('./utils');
var sig = _dereq_('./signature');
var ZipEntry = _dereq_('./zipEntry');
var support = _dereq_('./support');
var jszipProto = _dereq_('./object')

function ZipEntries(data, loadOptions) {
    this.files = [];
    this.loadOptions = loadOptions;
    if (data) {
        this.load(data);
    }
}
ZipEntries.prototype = {
    
    checkSignature: function(expectedSignature) {
        var signature = this.reader.readString(4);
        if (signature !== expectedSignature) {
            throw new Error("Corrupted zip or bug : unexpected signature " + "(" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
        }
    },
    
    readBlockEndOfCentral: function() {
        this.diskNumber = this.reader.readInt(2);
        this.diskWithCentralDirStart = this.reader.readInt(2);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
        this.centralDirRecords = this.reader.readInt(2);
        this.centralDirSize = this.reader.readInt(4);
        this.centralDirOffset = this.reader.readInt(4);

        this.zipCommentLength = this.reader.readInt(2)
        this.zipComment = this.reader.readString(this.zipCommentLength)
        this.zipComment = jszipProto.utf8decode(this.zipComment);
    },
    
    readBlockZip64EndOfCentral: function() {
        this.zip64EndOfCentralSize = this.reader.readInt(8);
        this.versionMadeBy = this.reader.readString(2);
        this.versionNeeded = this.reader.readInt(2);
        this.diskNumber = this.reader.readInt(4);
        this.diskWithCentralDirStart = this.reader.readInt(4);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
        this.centralDirRecords = this.reader.readInt(8);
        this.centralDirSize = this.reader.readInt(8);
        this.centralDirOffset = this.reader.readInt(8);

        this.zip64ExtensibleData = {};
        var extraDataSize = this.zip64EndOfCentralSize - 44,
            index = 0,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;
        while (index < extraDataSize) {
            extraFieldId = this.reader.readInt(2);
            extraFieldLength = this.reader.readInt(4);
            extraFieldValue = this.reader.readString(extraFieldLength);
            this.zip64ExtensibleData[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    
    readBlockZip64EndOfCentralLocator: function() {
        this.diskWithZip64CentralDirStart = this.reader.readInt(4);
        this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
        this.disksCount = this.reader.readInt(4);
        if (this.disksCount > 1) {
            throw new Error("Multi-volumes zip are not supported");
        }
    },
    
    readLocalFiles: function() {
        var i, file;
        for (i = 0; i < this.files.length; i++) {
            file = this.files[i];
            this.reader.setIndex(file.localHeaderOffset);
            this.checkSignature(sig.LOCAL_FILE_HEADER);
            file.readLocalPart(this.reader);
            file.handleUTF8();
            file.processAttributes();
        }
    },
    
    readCentralDir: function() {
        var file;

        this.reader.setIndex(this.centralDirOffset);
        while (this.reader.readString(4) === sig.CENTRAL_FILE_HEADER) {
            file = new ZipEntry({
                zip64: this.zip64
            }, this.loadOptions);
            file.readCentralPart(this.reader);
            this.files.push(file);
        }
    },
    
    readEndOfCentral: function() {
        var offset = this.reader.lastIndexOfSignature(sig.CENTRAL_DIRECTORY_END);
        if (offset === -1) {
            var isGarbage = true;
            try {
                this.reader.setIndex(0);
                this.checkSignature(sig.LOCAL_FILE_HEADER);
                isGarbage = false;
            } catch (e) {}

            if (isGarbage) {
                throw new Error("Can't find end of central directory : is this a zip file ? " +
                                "If it is, see http://stuk.github.io/jszip/documentation/howto/read_zip.html");
            } else {
                throw new Error("Corrupted zip : can't find end of central directory");
            }
        }
        this.reader.setIndex(offset);
        this.checkSignature(sig.CENTRAL_DIRECTORY_END);
        this.readBlockEndOfCentral();


        
        if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
            this.zip64 = true;

            
            offset = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            if (offset === -1) {
                throw new Error("Corrupted zip : can't find the ZIP64 end of central directory locator");
            }
            this.reader.setIndex(offset);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            this.readBlockZip64EndOfCentralLocator()
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
            this.readBlockZip64EndOfCentral();
        }
    },
    prepareReader: function(data) {
        var type = utils.getTypeOf(data);
        if (type === "string" && !support.uint8array) {
            this.reader = new StringReader(data, this.loadOptions.optimizedBinaryString);
        }
        else if (type === "nodebuffer") {
            this.reader = new NodeBufferReader(data);
        }
        else {
            this.reader = new Uint8ArrayReader(utils.transformTo("uint8array", data));
        }
    },
    
    load: function(data) {
        this.prepareReader(data);
        this.readEndOfCentral();
        this.readCentralDir();
        this.readLocalFiles();
    }
}
module.exports = ZipEntries;

},{"./nodeBufferReader":12,"./object":13,"./signature":14,"./stringReader":15,"./support":17,"./uint8ArrayReader":18,"./utils":21,"./zipEntry":23}],23:[function(_dereq_,module,exports){
'use strict';
var StringReader = _dereq_('./stringReader');
var utils = _dereq_('./utils');
var CompressedObject = _dereq_('./compressedObject');
var jszipProto = _dereq_('./object');

var MADE_BY_DOS = 0x00;
var MADE_BY_UNIX = 0x03

function ZipEntry(options, loadOptions) {
    this.options = options;
    this.loadOptions = loadOptions;
}
ZipEntry.prototype = {
    
    isEncrypted: function() {
        return (this.bitFlag & 0x0001) === 0x0001;
    },
    
    useUTF8: function() {
        return (this.bitFlag & 0x0800) === 0x0800;
    },
    
    prepareCompressedContent: function(reader, from, length) {
        return function() {
            var previousIndex = reader.index;
            reader.setIndex(from);
            var compressedFileData = reader.readData(length);
            reader.setIndex(previousIndex);

            return compressedFileData;
        };
    },
    
    prepareContent: function(reader, from, length, compression, uncompressedSize) {
        return function() {

            var compressedFileData = utils.transformTo(compression.uncompressInputType, this.getCompressedContent());
            var uncompressedFileData = compression.uncompress(compressedFileData);

            if (uncompressedFileData.length !== uncompressedSize) {
                throw new Error("Bug : uncompressed data size mismatch");
            }

            return uncompressedFileData;
        };
    },
    
    readLocalPart: function(reader) {
        var compression, localExtraFieldsLength
        reader.skip(22)
        this.fileNameLength = reader.readInt(2);
        localExtraFieldsLength = reader.readInt(2)
        this.fileName = reader.readString(this.fileNameLength);
        reader.skip(localExtraFieldsLength);

        if (this.compressedSize == -1 || this.uncompressedSize == -1) {
            throw new Error("Bug or corrupted zip : didn't get enough informations from the central directory " + "(compressedSize == -1 || uncompressedSize == -1)");
        }

        compression = utils.findCompression(this.compressionMethod);
        if (compression === null) {
            throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + this.fileName + ")");
        }
        this.decompressed = new CompressedObject();
        this.decompressed.compressedSize = this.compressedSize;
        this.decompressed.uncompressedSize = this.uncompressedSize;
        this.decompressed.crc32 = this.crc32;
        this.decompressed.compressionMethod = this.compressionMethod;
        this.decompressed.getCompressedContent = this.prepareCompressedContent(reader, reader.index, this.compressedSize, compression);
        this.decompressed.getContent = this.prepareContent(reader, reader.index, this.compressedSize, compression, this.uncompressedSize)
        if (this.loadOptions.checkCRC32) {
            this.decompressed = utils.transformTo("string", this.decompressed.getContent());
            if (jszipProto.crc32(this.decompressed) !== this.crc32) {
                throw new Error("Corrupted zip : CRC32 mismatch");
            }
        }
    },

    
    readCentralPart: function(reader) {
        this.versionMadeBy = reader.readInt(2);
        this.versionNeeded = reader.readInt(2);
        this.bitFlag = reader.readInt(2);
        this.compressionMethod = reader.readString(2);
        this.date = reader.readDate();
        this.crc32 = reader.readInt(4);
        this.compressedSize = reader.readInt(4);
        this.uncompressedSize = reader.readInt(4);
        this.fileNameLength = reader.readInt(2);
        this.extraFieldsLength = reader.readInt(2);
        this.fileCommentLength = reader.readInt(2);
        this.diskNumberStart = reader.readInt(2);
        this.internalFileAttributes = reader.readInt(2);
        this.externalFileAttributes = reader.readInt(4);
        this.localHeaderOffset = reader.readInt(4);

        if (this.isEncrypted()) {
            throw new Error("Encrypted zip are not supported");
        }

        this.fileName = reader.readString(this.fileNameLength);
        this.readExtraFields(reader);
        this.parseZIP64ExtraField(reader);
        this.fileComment = reader.readString(this.fileCommentLength);
    },

    
    processAttributes: function () {
        this.unixPermissions = null;
        this.dosPermissions = null;
        var madeBy = this.versionMadeBy >> 8
        this.dir = this.externalFileAttributes & 0x0010 ? true : false;

        if(madeBy === MADE_BY_DOS) {
            this.dosPermissions = this.externalFileAttributes & 0x3F;
        }

        if(madeBy === MADE_BY_UNIX) {
            this.unixPermissions = (this.externalFileAttributes >> 16) & 0xFFFF
        }
        if (!this.dir && this.fileName.slice(-1) === '/') {
            this.dir = true;
        }
    },

    
    parseZIP64ExtraField: function(reader) {

        if (!this.extraFields[0x0001]) {
            return;
        }
        var extraReader = new StringReader(this.extraFields[0x0001].value)
        if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
            this.uncompressedSize = extraReader.readInt(8);
        }
        if (this.compressedSize === utils.MAX_VALUE_32BITS) {
            this.compressedSize = extraReader.readInt(8);
        }
        if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
            this.localHeaderOffset = extraReader.readInt(8);
        }
        if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
            this.diskNumberStart = extraReader.readInt(4);
        }
    },
    
    readExtraFields: function(reader) {
        var start = reader.index,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;

        this.extraFields = this.extraFields || {};

        while (reader.index < start + this.extraFieldsLength) {
            extraFieldId = reader.readInt(2);
            extraFieldLength = reader.readInt(2);
            extraFieldValue = reader.readString(extraFieldLength);

            this.extraFields[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    
    handleUTF8: function() {
        if (this.useUTF8()) {
            this.fileName = jszipProto.utf8decode(this.fileName);
            this.fileComment = jszipProto.utf8decode(this.fileComment);
        } else {
            var upath = this.findExtraFieldUnicodePath();
            if (upath !== null) {
                this.fileName = upath;
            }
            var ucomment = this.findExtraFieldUnicodeComment();
            if (ucomment !== null) {
                this.fileComment = ucomment;
            }
        }
    },

    
    findExtraFieldUnicodePath: function() {
        var upathField = this.extraFields[0x7075];
        if (upathField) {
            var extraReader = new StringReader(upathField.value)
            if (extraReader.readInt(1) !== 1) {
                return null;
            }
            if (jszipProto.crc32(this.fileName) !== extraReader.readInt(4)) {
                return null;
            }

            return jszipProto.utf8decode(extraReader.readString(upathField.length - 5));
        }
        return null;
    },

    
    findExtraFieldUnicodeComment: function() {
        var ucommentField = this.extraFields[0x6375];
        if (ucommentField) {
            var extraReader = new StringReader(ucommentField.value)
            if (extraReader.readInt(1) !== 1) {
                return null;
            }
            if (jszipProto.crc32(this.fileComment) !== extraReader.readInt(4)) {
                return null;
            }

            return jszipProto.utf8decode(extraReader.readString(ucommentField.length - 5));
        }
        return null;
    }
};
module.exports = ZipEntry;

},{"./compressedObject":2,"./object":13,"./stringReader":15,"./utils":21}],24:[function(_dereq_,module,exports){
'use strict';

var assign    = _dereq_('./lib/utils/common').assign;

var deflate   = _dereq_('./lib/deflate');
var inflate   = _dereq_('./lib/inflate');
var constants = _dereq_('./lib/zlib/constants');

var pako = {};

assign(pako, deflate, inflate, constants);

module.exports = pako;
},{"./lib/deflate":25,"./lib/inflate":26,"./lib/utils/common":27,"./lib/zlib/constants":30}],25:[function(_dereq_,module,exports){
'use strict';


var zlib_deflate = _dereq_('./zlib/deflate.js');
var utils = _dereq_('./utils/common');
var strings = _dereq_('./utils/strings');
var msg = _dereq_('./zlib/messages');
var zstream = _dereq_('./zlib/zstream');





var Z_NO_FLUSH      = 0;
var Z_FINISH        = 4;

var Z_OK            = 0;
var Z_STREAM_END    = 1;

var Z_DEFAULT_COMPRESSION = -1;

var Z_DEFAULT_STRATEGY    = 0;

var Z_DEFLATED  = 8;
















var Deflate = function(options) {

  this.options = utils.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY,
    to: ''
  }, options || {});

  var opt = this.options;

  if (opt.raw && (opt.windowBits > 0)) {
    opt.windowBits = -opt.windowBits;
  }

  else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
    opt.windowBits += 16;
  }

  this.err    = 0
  this.msg    = ''
  this.ended  = false
  this.chunks = []

  this.strm = new zstream();
  this.strm.avail_out = 0;

  var status = zlib_deflate.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );

  if (status !== Z_OK) {
    throw new Error(msg[status]);
  }

  if (opt.header) {
    zlib_deflate.deflateSetHeader(this.strm, opt.header);
  }
};


Deflate.prototype.push = function(data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;

  if (this.ended) { return false; }

  _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH : Z_NO_FLUSH)
  if (typeof data === 'string') {
    strm.input = strings.string2buf(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = zlib_deflate.deflate(strm, _mode);    

    if (status !== Z_STREAM_END && status !== Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }
    if (strm.avail_out === 0 || (strm.avail_in === 0 && _mode === Z_FINISH)) {
      if (this.options.to === 'string') {
        this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
      } else {
        this.onData(utils.shrinkBuf(strm.output, strm.next_out));
      }
    }
  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END)
  if (_mode === Z_FINISH) {
    status = zlib_deflate.deflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === Z_OK;
  }

  return true;
};



Deflate.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};



Deflate.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};



function deflate(input, options) {
  var deflator = new Deflate(options);

  deflator.push(input, true)
  if (deflator.err) { throw deflator.msg; }

  return deflator.result;
}



function deflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return deflate(input, options);
}



function gzip(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate(input, options);
}


exports.Deflate = Deflate;
exports.deflate = deflate;
exports.deflateRaw = deflateRaw;
exports.gzip = gzip;
},{"./utils/common":27,"./utils/strings":28,"./zlib/deflate.js":32,"./zlib/messages":37,"./zlib/zstream":39}],26:[function(_dereq_,module,exports){
'use strict';


var zlib_inflate = _dereq_('./zlib/inflate.js');
var utils = _dereq_('./utils/common');
var strings = _dereq_('./utils/strings');
var c = _dereq_('./zlib/constants');
var msg = _dereq_('./zlib/messages');
var zstream = _dereq_('./zlib/zstream');
var gzheader = _dereq_('./zlib/gzheader');














var Inflate = function(options) {

  this.options = utils.assign({
    chunkSize: 16384,
    windowBits: 0,
    to: ''
  }, options || {});

  var opt = this.options
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err    = 0
  this.msg    = ''
  this.ended  = false
  this.chunks = []

  this.strm   = new zstream();
  this.strm.avail_out = 0;

  var status  = zlib_inflate.inflateInit2(
    this.strm,
    opt.windowBits
  );

  if (status !== c.Z_OK) {
    throw new Error(msg[status]);
  }

  this.header = new gzheader();

  zlib_inflate.inflateGetHeader(this.strm, this.header);
};


Inflate.prototype.push = function(data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;
  var next_out_utf8, tail, utf8str;

  if (this.ended) { return false; }
  _mode = (mode === ~~mode) ? mode : ((mode === true) ? c.Z_FINISH : c.Z_NO_FLUSH)
  if (typeof data === 'string') {
    strm.input = strings.binstring2buf(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);    

    if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === c.Z_STREAM_END || (strm.avail_in === 0 && _mode === c.Z_FINISH)) {

        if (this.options.to === 'string') {

          next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

          tail = strm.next_out - next_out_utf8;
          utf8str = strings.buf2string(strm.output, next_out_utf8)
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) { utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

          this.onData(utf8str);

        } else {
          this.onData(utils.shrinkBuf(strm.output, strm.next_out));
        }
      }
    }
  } while ((strm.avail_in > 0) && status !== c.Z_STREAM_END);

  if (status === c.Z_STREAM_END) {
    _mode = c.Z_FINISH;
  }
  if (_mode === c.Z_FINISH) {
    status = zlib_inflate.inflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === c.Z_OK;
  }

  return true;
};



Inflate.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};



Inflate.prototype.onEnd = function(status) {
  if (status === c.Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};



function inflate(input, options) {
  var inflator = new Inflate(options);

  inflator.push(input, true)
  if (inflator.err) { throw inflator.msg; }

  return inflator.result;
}



function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate(input, options);
}





exports.Inflate = Inflate;
exports.inflate = inflate;
exports.inflateRaw = inflateRaw;
exports.ungzip  = inflate;

},{"./utils/common":27,"./utils/strings":28,"./zlib/constants":30,"./zlib/gzheader":33,"./zlib/inflate.js":35,"./zlib/messages":37,"./zlib/zstream":39}],27:[function(_dereq_,module,exports){
'use strict';


var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                (typeof Uint16Array !== 'undefined') &&
                (typeof Int32Array !== 'undefined');


exports.assign = function (obj ) {
  var sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    var source = sources.shift();
    if (!source) { continue; }

    if (typeof(source) !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (var p in source) {
      if (source.hasOwnProperty(p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
}
exports.shrinkBuf = function (buf, size) {
  if (buf.length === size) { return buf; }
  if (buf.subarray) { return buf.subarray(0, size); }
  buf.length = size;
  return buf;
};


var fnTyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs+len), dest_offs);
      return;
    }
    for(var i=0; i<len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  flattenChunks: function(chunks) {
    var i, l, len, pos, chunk, result
    len = 0;
    for (i=0, l=chunks.length; i<l; i++) {
      len += chunks[i].length;
    }
    result = new Uint8Array(len);
    pos = 0;
    for (i=0, l=chunks.length; i<l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }
};

var fnUntyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    for(var i=0; i<len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  flattenChunks: function(chunks) {
    return [].concat.apply([], chunks);
  }
}
exports.setTyped = function (on) {
  if (on) {
    exports.Buf8  = Uint8Array;
    exports.Buf16 = Uint16Array;
    exports.Buf32 = Int32Array;
    exports.assign(exports, fnTyped);
  } else {
    exports.Buf8  = Array;
    exports.Buf16 = Array;
    exports.Buf32 = Array;
    exports.assign(exports, fnUntyped);
  }
};

exports.setTyped(TYPED_OK);
},{}],28:[function(_dereq_,module,exports){
'use strict';


var utils = _dereq_('./common')
var STR_APPLY_OK = true;
var STR_APPLY_UIA_OK = true;

try { String.fromCharCode.apply(null, [0]); } catch(__) { STR_APPLY_OK = false; }
try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch(__) { STR_APPLY_UIA_OK = false; }
var _utf8len = new utils.Buf8(256);
for (var i=0; i<256; i++) {
  _utf8len[i] = (i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1);
}
_utf8len[254]=_utf8len[254]=1
exports.string2buf = function (str) {
  var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
      c2 = str.charCodeAt(m_pos+1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  buf = new utils.Buf8(buf_len)
  for (i=0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
      c2 = str.charCodeAt(m_pos+1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      
      buf[i++] = c;
    } else if (c < 0x800) {
      
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }

  return buf;
}
function buf2binstring(buf, len) {
  if (len < 65537) {
    if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
      return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
    }
  }

  var result = '';
  for(var i=0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
}
exports.buf2binstring = function(buf) {
  return buf2binstring(buf, buf.length);
}
exports.binstring2buf = function(str) {
  var buf = new utils.Buf8(str.length);
  for(var i=0, len=buf.length; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}
exports.buf2string = function (buf, max) {
  var i, out, c, c_len;
  var len = max || buf.length
  var utf16buf = new Array(len*2);

  for (out=0, i=0; i<len;) {
    c = buf[i++]
    if (c < 0x80) { utf16buf[out++] = c; continue; }

    c_len = _utf8len[c]
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }

  return buf2binstring(utf16buf, out);
}
exports.utf8border = function(buf, max) {
  var pos;

  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }
  pos = max-1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }
  if (pos < 0) { return max; }
  if (pos === 0) { return max; }

  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

},{"./common":27}],29:[function(_dereq_,module,exports){
'use strict'

function adler32(adler, buf, len, pos) {
  var s1 = (adler & 0xffff) |0
    , s2 = ((adler >>> 16) & 0xffff) |0
    , n = 0;

  while (len !== 0) {
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
}


module.exports = adler32;
},{}],30:[function(_dereq_,module,exports){
module.exports = {

  
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  Z_BUF_ERROR:       -5,

  
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  Z_UNKNOWN:                2,

  
  Z_DEFLATED:               8
};
},{}],31:[function(_dereq_,module,exports){
'use strict'
function makeTable() {
  var c, table = [];

  for(var n =0; n < 256; n++){
    c = n;
    for(var k =0; k < 8; k++){
      c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
}
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
  var t = crcTable
    , end = pos + len;

  crc = crc ^ (-1);

  for (var i = pos; i < end; i++ ) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1))
}


module.exports = crc32;
},{}],32:[function(_dereq_,module,exports){
'use strict';

var utils   = _dereq_('../utils/common');
var trees   = _dereq_('./trees');
var adler32 = _dereq_('./adler32');
var crc32   = _dereq_('./crc32');
var msg   = _dereq_('./messages');






var Z_NO_FLUSH      = 0;
var Z_PARTIAL_FLUSH = 1
var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5



var Z_OK            = 0;
var Z_STREAM_END    = 1
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3
var Z_BUF_ERROR     = -5



var Z_DEFAULT_COMPRESSION = -1;


var Z_FILTERED            = 1;
var Z_HUFFMAN_ONLY        = 2;
var Z_RLE                 = 3;
var Z_FIXED               = 4;
var Z_DEFAULT_STRATEGY    = 0;


var Z_UNKNOWN             = 2;



var Z_DEFLATED  = 8;




var MAX_MEM_LEVEL = 9;

var MAX_WBITS = 15;

var DEF_MEM_LEVEL = 8;


var LENGTH_CODES  = 29;

var LITERALS      = 256;

var L_CODES       = LITERALS + 1 + LENGTH_CODES;

var D_CODES       = 30;

var BL_CODES      = 19;

var HEAP_SIZE     = 2*L_CODES + 1;

var MAX_BITS  = 15;


var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

var PRESET_DICT = 0x20;

var INIT_STATE = 42;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;

var BS_NEED_MORE      = 1; 
var BS_BLOCK_DONE     = 2; 
var BS_FINISH_STARTED = 3; 
var BS_FINISH_DONE    = 4; 

var OS_CODE = 0x03

function err(strm, errorCode) {
  strm.msg = msg[errorCode];
  return errorCode;
}

function rank(f) {
  return ((f) << 1) - ((f) > 4 ? 9 : 0);
}

function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }



function flush_pending(strm) {
  var s = strm.state
  var len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }

  utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
}


function flush_block_only (s, last) {
  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
}


function put_byte(s, b) {
  s.pending_buf[s.pending++] = b;
}



function putShortMSB(s, b) {
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
}



function read_buf(strm, buf, start, size) {
  var len = strm.avail_in;

  if (len > size) { len = size; }
  if (len === 0) { return 0; }

  strm.avail_in -= len;

  utils.arraySet(buf, strm.input, strm.next_in, len, start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32(strm.adler, buf, len, start);
  }

  else if (strm.state.wrap === 2) {
    strm.adler = crc32(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;

  return len;
}



function longest_match(s, cur_match) {
  var chain_length = s.max_chain_length;      
  var scan = s.strstart; 
  var match;                       
  var len;                           
  var best_len = s.prev_length;              
  var nice_match = s.nice_match;             
  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;

  var _win = s.window

  var wmask = s.w_mask;
  var prev  = s.prev;

  

  var strend = s.strstart + MAX_MATCH;
  var scan_end1  = _win[scan + best_len - 1];
  var scan_end   = _win[scan + best_len];

  

  
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

  do {
    match = cur_match;

    

    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }

    
    scan += 2;
    match++

    
    do {
      
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend)

    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
}



function fill_window(s) {
  var _w_size = s.w_size;
  var p, n, m, more, str

  do {
    more = s.window_size - s.lookahead - s.strstart
    


    
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

      utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      
      s.block_start -= _w_size;

      

      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = (m >= _w_size ? m - _w_size : 0);
      } while (--n);

      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
        
      } while (--n);

      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }

    
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;

    
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];

      
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask
      while (s.insert) {
        
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH-1]) & s.hash_mask;

        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

  
}


function deflate_stored(s, flush) {
  
  var max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }

  
  for (;;) {
    
    if (s.lookahead <= 1) {

      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      
    }

    s.strstart += s.lookahead;
    s.lookahead = 0;

    
    var max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      


    }
    
    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
      
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      
    }
  }

  s.insert = 0;

  if (flush === Z_FINISH) {
    
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    
    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    
  }

  return BS_NEED_MORE;
}


function deflate_fast(s, flush) {
  var hash_head;        
  var bflush;           

  for (;;) {
    
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break; 
      }
    }

    
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      
    }

    
    if (hash_head !== 0 && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      
      s.match_length = longest_match(s, hash_head);
      
    }
    if (s.match_length >= MIN_MATCH) {

      
      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;

      
      if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
        s.match_length--; 
        do {
          s.strstart++;
          
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          
          
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask
        
      }
    } else {
      
      
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH-1)) ? s.strstart : MIN_MATCH-1);
  if (flush === Z_FINISH) {
    
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    
  }
  return BS_BLOCK_DONE;
}


function deflate_slow(s, flush) {
  var hash_head;          
  var bflush;              

  var max_insert;

  
  for (;;) {
    
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } 
    }

    
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      
    }

    
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH-1;

    if (hash_head !== 0 && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size-MIN_LOOKAHEAD)) {
      
      s.match_length = longest_match(s, hash_head);
      

      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096))) {

        
        s.match_length = MIN_MATCH-1;
      }
    }
    
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      

      
      bflush = trees._tr_tally(s, s.strstart - 1- s.prev_match, s.prev_length - MIN_MATCH);
      
      s.lookahead -= s.prev_length-1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH-1;
      s.strstart++;

      if (bflush) {
        
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        
      }

    } else if (s.match_available) {
      
      
      bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

      if (bflush) {
        
        flush_block_only(s, false);
        
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  if (s.match_available) {
    
    bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH-1 ? s.strstart : MIN_MATCH-1;
  if (flush === Z_FINISH) {
    
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    
  }

  return BS_BLOCK_DONE;
}



function deflate_rle(s, flush) {
  var bflush;            
  var prev;              
  var scan, strend;      

  var _win = s.window;

  for (;;) {
    
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } 
    }

    
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
          
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
    }

    
    if (s.match_length >= MIN_MATCH) {

      
      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      
      
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    
  }
  return BS_BLOCK_DONE;
}


function deflate_huff(s, flush) {
  var bflush;             

  for (;;) {
    
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        break;      
      }
    }

    
    s.match_length = 0
    
    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    
  }
  return BS_BLOCK_DONE;
}


var Config = function (good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
};

var configuration_table;

configuration_table = [
  
  new Config(0, 0, 0, 0, deflate_stored),          
  new Config(4, 4, 8, 4, deflate_fast),            
  new Config(4, 5, 16, 8, deflate_fast),           
  new Config(4, 6, 32, 32, deflate_fast),          

  new Config(4, 4, 16, 16, deflate_slow),          
  new Config(8, 16, 32, 32, deflate_slow),         
  new Config(8, 16, 128, 128, deflate_slow),       
  new Config(8, 32, 128, 256, deflate_slow),       
  new Config(32, 128, 258, 1024, deflate_slow),    
  new Config(32, 258, 258, 4096, deflate_slow)     
];



function lm_init(s) {
  s.window_size = 2 * s.w_size;

  
  zero(s.head)

  
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;

  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
}


function DeflateState() {
  this.strm = null;            
  this.status = 0;            
  this.pending_buf = null;      
  this.pending_buf_size = 0;  
  this.pending_out = 0;       
  this.pending = 0;           
  this.wrap = 0;              
  this.gzhead = null;         
  this.gzindex = 0;           
  this.method = Z_DEFLATED; 
  this.last_flush = -1;   

  this.w_size = 0;  
  this.w_bits = 0;  
  this.w_mask = 0;  

  this.window = null;
  

  this.window_size = 0;
  

  this.prev = null;
  

  this.head = null;   

  this.ins_h = 0;       
  this.hash_size = 0;   
  this.hash_bits = 0;   
  this.hash_mask = 0;   

  this.hash_shift = 0;
  

  this.block_start = 0;
  

  this.match_length = 0;      
  this.prev_match = 0;        
  this.match_available = 0;   
  this.strstart = 0;          
  this.match_start = 0;       
  this.lookahead = 0;         

  this.prev_length = 0;
  

  this.max_chain_length = 0;
  

  this.max_lazy_match = 0;
  
  

  this.level = 0;     
  this.strategy = 0;  

  this.good_match = 0;
  

  this.nice_match = 0; 

              

  
  this.dyn_ltree  = new utils.Buf16(HEAP_SIZE * 2);
  this.dyn_dtree  = new utils.Buf16((2*D_CODES+1) * 2);
  this.bl_tree    = new utils.Buf16((2*BL_CODES+1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);

  this.l_desc   = null;         
  this.d_desc   = null;         
  this.bl_desc  = null;         
  this.bl_count = new utils.Buf16(MAX_BITS+1);
  
  this.heap = new utils.Buf16(2*L_CODES+1);  
  zero(this.heap);

  this.heap_len = 0;               
  this.heap_max = 0;               
  

  this.depth = new utils.Buf16(2*L_CODES+1)
  zero(this.depth);
  

  this.l_buf = 0;          

  this.lit_bufsize = 0;
  

  this.last_lit = 0;      

  this.d_buf = 0;
  

  this.opt_len = 0;       
  this.static_len = 0;    
  this.matches = 0;       
  this.insert = 0;        


  this.bi_buf = 0;
  
  this.bi_valid = 0;
  
  
}


function deflateResetKeep(strm) {
  var s;

  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;

  s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    
  }
  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
  strm.adler = (s.wrap === 2) ?
    0
  :
    1
  s.last_flush = Z_NO_FLUSH;
  trees._tr_init(s);
  return Z_OK;
}


function deflateReset(strm) {
  var ret = deflateResetKeep(strm);
  if (ret === Z_OK) {
    lm_init(strm.state);
  }
  return ret;
}


function deflateSetHeader(strm, head) {
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
  strm.state.gzhead = head;
  return Z_OK;
}


function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
  if (!strm) {
    return Z_STREAM_ERROR;
  }
  var wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION) {
    level = 6;
  }

  if (windowBits < 0) { 
    wrap = 0;
    windowBits = -windowBits;
  }

  else if (windowBits > 15) {
    wrap = 2;           
    windowBits -= 16;
  }


  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR);
  }


  if (windowBits === 8) {
    windowBits = 9;
  }
  

  var s = new DeflateState();

  strm.state = s;
  s.strm = strm;

  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;

  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

  s.window = new utils.Buf8(s.w_size * 2);
  s.head = new utils.Buf16(s.hash_size);
  s.prev = new utils.Buf16(s.w_size)

  s.lit_bufsize = 1 << (memLevel + 6); 

  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new utils.Buf8(s.pending_buf_size);

  s.d_buf = s.lit_bufsize >> 1;
  s.l_buf = (1 + 2) * s.lit_bufsize;

  s.level = level;
  s.strategy = strategy;
  s.method = method;

  return deflateReset(strm);
}

function deflateInit(strm, level) {
  return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
}


function deflate(strm, flush) {
  var old_flush, s;
  var beg, val

  if (!strm || !strm.state ||
    flush > Z_BLOCK || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
  }

  s = strm.state;

  if (!strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH)) {
    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
  }

  s.strm = strm; 
  old_flush = s.last_flush;
  s.last_flush = flush;

  
  if (s.status === INIT_STATE) {

    if (s.wrap === 2) {
      strm.adler = 0
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) {
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      }
      else {
        put_byte(s, (s.gzhead.text ? 1 : 0) +
                    (s.gzhead.hcrc ? 2 : 0) +
                    (!s.gzhead.extra ? 0 : 4) +
                    (!s.gzhead.name ? 0 : 8) +
                    (!s.gzhead.comment ? 0 : 16)
                );
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, (s.gzhead.time >> 8) & 0xff);
        put_byte(s, (s.gzhead.time >> 16) & 0xff);
        put_byte(s, (s.gzhead.time >> 24) & 0xff);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, s.gzhead.os & 0xff);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    else
    {
      var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
      var level_flags = -1;

      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= (level_flags << 6);
      if (s.strstart !== 0) { header |= PRESET_DICT; }
      header += 31 - (header % 31);

      s.status = BUSY_STATE;
      putShortMSB(s, header);

      
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }
      strm.adler = 1
    }
  }
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra) {
      beg = s.pending;  

      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    }
    else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name) {
      beg = s.pending;  

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg){
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    }
    else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment) {
      beg = s.pending;  

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    }
    else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        strm.adler = 0
        s.status = BUSY_STATE;
      }
    }
    else {
      s.status = BUSY_STATE;
    }
  }

  
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      
      s.last_flush = -1;
      return Z_OK;
    }

    
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH) {
    return err(strm, Z_BUF_ERROR);
  }

  
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR);
  }

  
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
        configuration_table[s.level].func(s, flush));

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        
      }
      return Z_OK;
      
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        trees._tr_align(s);
      }
      else if (flush !== Z_BLOCK) { 

        trees._tr_stored_block(s, 0, 0, false);
        
        if (flush === Z_FULL_FLUSH) {
                       
          zero(s.head)

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1; 
        return Z_OK;
      }
    }
  }

  if (flush !== Z_FINISH) { return Z_OK; }
  if (s.wrap <= 0) { return Z_STREAM_END; }

  
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  
  return s.pending !== 0 ? Z_OK : Z_STREAM_END;
}

function deflateEnd(strm) {
  var status;

  if (!strm || !strm.state) {
    return Z_STREAM_ERROR;
  }

  status = strm.state.status;
  if (status !== INIT_STATE &&
    status !== EXTRA_STATE &&
    status !== NAME_STATE &&
    status !== COMMENT_STATE &&
    status !== HCRC_STATE &&
    status !== BUSY_STATE &&
    status !== FINISH_STATE
  ) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.state = null;

  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
}



exports.deflateInit = deflateInit;
exports.deflateInit2 = deflateInit2;
exports.deflateReset = deflateReset;
exports.deflateResetKeep = deflateResetKeep;
exports.deflateSetHeader = deflateSetHeader;
exports.deflate = deflate;
exports.deflateEnd = deflateEnd;
exports.deflateInfo = 'pako deflate (from Nodeca project)';


},{"../utils/common":27,"./adler32":29,"./crc32":31,"./messages":37,"./trees":38}],33:[function(_dereq_,module,exports){
'use strict';


function GZheader() {
  
  this.text       = 0;
  
  this.time       = 0;
  
  this.xflags     = 0;
  
  this.os         = 0;
  
  this.extra      = null;
  
  this.extra_len  = 0

  
  
  this.name       = '';
  
  
  this.comment    = '';
  
  
  this.hcrc       = 0;
  
  this.done       = false;
}

module.exports = GZheader;
},{}],34:[function(_dereq_,module,exports){
'use strict'
var BAD = 30;       
var TYPE = 12;      


module.exports = function inflate_fast(strm, start) {
  var state;
  var _in;                    
  var last;                   
  var _out;                   
  var beg;                    
  var end;                    
  var dmax;                   
  var wsize;                  
  var whave;                  
  var wnext;                  
  var window;                 
  var hold;                   
  var bits;                   
  var lcode;                  
  var dcode;                  
  var lmask;                  
  var dmask;                  
  var here;                   
  var op;                     
                              
  var len;                    
  var dist;                   
  var from;                   
  var from_source;


  var input, output

  
  state = strm.state
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257)
  dmax = state.dmax
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) {
      op = here >>> 24;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff;
      if (op === 0) {                          
        output[_out++] = here & 0xffff;
      }
      else if (op & 16) {                     
        len = here & 0xffff;
        op &= 15;                           
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff;

          if (op & 16) {                      
            dist = here & 0xffff;
            op &= 15;                       
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1)
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break top;
            }
            hold >>>= op;
            bits -= op
            op = _out - beg;                
            if (dist > op) {                
              op = dist - op;               
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }
              }
              from = 0
              from_source = window;
              if (wnext === 0) {           
                from += wsize - op;
                if (op < len) {         
                  len -= op;
                  do {
                    output[_out++] = window[from++];
                  } while (--op);
                  from = _out - dist;  
                  from_source = output;
                }
              }
              else if (wnext < op) {      
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         
                  len -= op;
                  do {
                    output[_out++] = window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = window[from++];
                    } while (--op);
                    from = _out - dist;      
                    from_source = output;
                  }
                }
              }
              else {                      
                from += wnext - op;
                if (op < len) {         
                  len -= op;
                  do {
                    output[_out++] = window[from++];
                  } while (--op);
                  from = _out - dist;  
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          
              do {                        
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          
            here = dcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD;
            break top;
          }

          break
        }
      }
      else if ((op & 64) === 0) {              
        here = lcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     
        state.mode = TYPE;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break top;
      }

      break
    }
  } while (_in < last && _out < end);

  
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

},{}],35:[function(_dereq_,module,exports){
'use strict';


var utils = _dereq_('../utils/common');
var adler32 = _dereq_('./adler32');
var crc32   = _dereq_('./crc32');
var inflate_fast = _dereq_('./inffast');
var inflate_table = _dereq_('./inftrees');

var CODES = 0;
var LENS = 1;
var DISTS = 2;






var Z_FINISH        = 4;
var Z_BLOCK         = 5;
var Z_TREES         = 6;



var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_NEED_DICT     = 2
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5


var Z_DEFLATED  = 8;






var    HEAD = 1;       
var    FLAGS = 2;      
var    TIME = 3;       
var    OS = 4;         
var    EXLEN = 5;      
var    EXTRA = 6;      
var    NAME = 7;       
var    COMMENT = 8;    
var    HCRC = 9;       
var    DICTID = 10;    
var    DICT = 11;      
var        TYPE = 12;      
var        TYPEDO = 13;    
var        STORED = 14;    
var        COPY_ = 15;     
var        COPY = 16;      
var        TABLE = 17;     
var        LENLENS = 18;   
var        CODELENS = 19;  
var            LEN_ = 20;      
var            LEN = 21;       
var            LENEXT = 22;    
var            DIST = 23;      
var            DISTEXT = 24;   
var            MATCH = 25;     
var            LIT = 26;       
var    CHECK = 27;     
var    LENGTH = 28;    
var    DONE = 29;      
var    BAD = 30;       
var    MEM = 31;       
var    SYNC = 32;      





var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592

var MAX_WBITS = 15;

var DEF_WBITS = MAX_WBITS;


function ZSWAP32(q) {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
}


function InflateState() {
  this.mode = 0;             
  this.last = false;          
  this.wrap = 0;              
  this.havedict = false;      
  this.flags = 0;             
  this.dmax = 0;              
  this.check = 0;             
  this.total = 0;             
  this.head = null;           

  
  this.wbits = 0;             
  this.wsize = 0;             
  this.whave = 0;             
  this.wnext = 0;             
  this.window = null;         

  
  this.hold = 0;              
  this.bits = 0;              

  
  this.length = 0;            
  this.offset = 0;            

  
  this.extra = 0;             

  
  this.lencode = null;          
  this.distcode = null;         
  this.lenbits = 0;           
  this.distbits = 0;          

  
  this.ncode = 0;             
  this.nlen = 0;              
  this.ndist = 0;             
  this.have = 0;              
  this.next = null;              

  this.lens = new utils.Buf16(320); 
  this.work = new utils.Buf16(288); 

  
  this.lendyn = null;              
  this.distdyn = null;             
  this.sane = 0;                   
  this.back = 0;                   
  this.was = 0;                    
}

function inflateResetKeep(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; 
  if (state.wrap) {       
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0
  state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
  state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1
  return Z_OK;
}

function inflateReset(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

}

function inflateReset2(strm, windowBits) {
  var wrap;
  var state;

  
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;

  
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
}

function inflateInit2(strm, windowBits) {
  var ret;
  var state;

  if (!strm) { return Z_STREAM_ERROR; }

  state = new InflateState()
  strm.state = state;
  state.window = null;
  ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK) {
    strm.state = null;
  }
  return ret;
}

function inflateInit(strm) {
  return inflateInit2(strm, DEF_WBITS);
}



var virgin = true;

var lenfix, distfix

function fixedtables(state) {
  
  if (virgin) {
    var sym;

    lenfix = new utils.Buf32(512);
    distfix = new utils.Buf32(32);

    
    sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, {bits: 9});

    
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, {bits: 5});

    
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
}



function updatewindow(strm, src, end, copy) {
  var dist;
  var state = strm.state;

  
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new utils.Buf8(state.wsize);
  }

  
  if (copy >= state.wsize) {
    utils.arraySet(state.window,src, end - state.wsize, state.wsize, 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    utils.arraySet(state.window,src, end - copy, dist, state.wnext);
    copy -= dist;
    if (copy) {
      utils.arraySet(state.window,src, end - copy, copy, 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
}

function inflate(strm, flush) {
  var state;
  var input, output
  var next;                   
  var put;                    
  var have, left;             
  var hold;                   
  var bits;                   
  var _in, _out;              
  var copy;                   
  var from;                   
  var from_source;
  var here = 0;               
  var here_bits, here_op, here_val
  var last_bits, last_op, last_val
  var len;                    
  var ret;                    
  var hbuf = new utils.Buf8(4);    
  var opts;

  var n

  var order = 
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits

  _in = have;
  _out = left;
  ret = Z_OK;

  inf_leave:
  for (;;) {
    switch (state.mode) {
    case HEAD:
      if (state.wrap === 0) {
        state.mode = TYPEDO;
        break;
      }
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if ((state.wrap & 2) && hold === 0x8b1f) {  
        state.check = 0
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0)
        hold = 0;
        bits = 0
        state.mode = FLAGS;
        break;
      }
      state.flags = 0;           
      if (state.head) {
        state.head.done = false;
      }
      if (!(state.wrap & 1) ||   
        (((hold & 0xff) << 8) + (hold >> 8)) % 31) {
        strm.msg = 'incorrect header check';
        state.mode = BAD;
        break;
      }
      if ((hold & 0x0f) !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      hold >>>= 4;
      bits -= 4
      len = (hold & 0x0f) + 8;
      if (state.wbits === 0) {
        state.wbits = len;
      }
      else if (len > state.wbits) {
        strm.msg = 'invalid window size';
        state.mode = BAD;
        break;
      }
      state.dmax = 1 << len
      strm.adler = state.check = 1;
      state.mode = hold & 0x200 ? DICTID : TYPE
      hold = 0;
      bits = 0
      break;
    case FLAGS:
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      state.flags = hold;
      if ((state.flags & 0xff) !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      if (state.flags & 0xe000) {
        strm.msg = 'unknown header flags set';
        state.mode = BAD;
        break;
      }
      if (state.head) {
        state.head.text = ((hold >> 8) & 1);
      }
      if (state.flags & 0x0200) {
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0)
      }
      hold = 0;
      bits = 0
      state.mode = TIME;
      
    case TIME:
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if (state.head) {
        state.head.time = hold;
      }
      if (state.flags & 0x0200) {
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        hbuf[2] = (hold >>> 16) & 0xff;
        hbuf[3] = (hold >>> 24) & 0xff;
        state.check = crc32(state.check, hbuf, 4, 0)
      }
      hold = 0;
      bits = 0
      state.mode = OS;
      
    case OS:
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if (state.head) {
        state.head.xflags = (hold & 0xff);
        state.head.os = (hold >> 8);
      }
      if (state.flags & 0x0200) {
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0)
      }
      hold = 0;
      bits = 0
      state.mode = EXLEN;
      
    case EXLEN:
      if (state.flags & 0x0400) {
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.length = hold;
        if (state.head) {
          state.head.extra_len = hold;
        }
        if (state.flags & 0x0200) {
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0)
        }
        hold = 0;
        bits = 0
      }
      else if (state.head) {
        state.head.extra = null;
      }
      state.mode = EXTRA;
      
    case EXTRA:
      if (state.flags & 0x0400) {
        copy = state.length;
        if (copy > have) { copy = have; }
        if (copy) {
          if (state.head) {
            len = state.head.extra_len - state.length;
            if (!state.head.extra) {
              state.head.extra = new Array(state.head.extra_len);
            }
            utils.arraySet(
              state.head.extra,
              input,
              next,
              copy,
              
              len
            )
          }
          if (state.flags & 0x0200) {
            state.check = crc32(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          state.length -= copy;
        }
        if (state.length) { break inf_leave; }
      }
      state.length = 0;
      state.mode = NAME;
      
    case NAME:
      if (state.flags & 0x0800) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          len = input[next + copy++];
          
          if (state.head && len &&
              (state.length < 65536 )) {
            state.head.name += String.fromCharCode(len);
          }
        } while (len && copy < have);

        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.name = null;
      }
      state.length = 0;
      state.mode = COMMENT;
      
    case COMMENT:
      if (state.flags & 0x1000) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          len = input[next + copy++];
          
          if (state.head && len &&
              (state.length < 65536 )) {
            state.head.comment += String.fromCharCode(len);
          }
        } while (len && copy < have);
        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.comment = null;
      }
      state.mode = HCRC;
      
    case HCRC:
      if (state.flags & 0x0200) {
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (hold !== (state.check & 0xffff)) {
          strm.msg = 'header crc mismatch';
          state.mode = BAD;
          break;
        }
        hold = 0;
        bits = 0
      }
      if (state.head) {
        state.head.hcrc = ((state.flags >> 9) & 1);
        state.head.done = true;
      }
      strm.adler = state.check = 0 ;
      state.mode = TYPE;
      break;
    case DICTID:
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      strm.adler = state.check = ZSWAP32(hold)
      hold = 0;
      bits = 0
      state.mode = DICT;
      
    case DICT:
      if (state.havedict === 0) {
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits
        return Z_NEED_DICT;
      }
      strm.adler = state.check = 1;
      state.mode = TYPE;
      
    case TYPE:
      if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
      
    case TYPEDO:
      if (state.last) {
        hold >>>= bits & 7;
        bits -= bits & 7
        state.mode = CHECK;
        break;
      }
      while (bits < 3) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      state.last = (hold & 0x01)
      hold >>>= 1;
      bits -= 1

      switch ((hold & 0x03)) {
      case 0:                             
        state.mode = STORED;
        break;
      case 1:                             
        fixedtables(state)
        state.mode = LEN_;             
        if (flush === Z_TREES) {
          hold >>>= 2;
          bits -= 2
          break inf_leave;
        }
        break;
      case 2:                             
        state.mode = TABLE;
        break;
      case 3:
        strm.msg = 'invalid block type';
        state.mode = BAD;
      }
      hold >>>= 2;
      bits -= 2
      break;
    case STORED:
      hold >>>= bits & 7;
      bits -= bits & 7
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
        strm.msg = 'invalid stored block lengths';
        state.mode = BAD;
        break;
      }
      state.length = hold & 0xffff
      hold = 0;
      bits = 0
      state.mode = COPY_;
      if (flush === Z_TREES) { break inf_leave; }
      
    case COPY_:
      state.mode = COPY;
      
    case COPY:
      copy = state.length;
      if (copy) {
        if (copy > have) { copy = have; }
        if (copy > left) { copy = left; }
        if (copy === 0) { break inf_leave; }
        utils.arraySet(output, input, next, copy, put)
        have -= copy;
        next += copy;
        left -= copy;
        put += copy;
        state.length -= copy;
        break;
      }
      state.mode = TYPE;
      break;
    case TABLE:
      while (bits < 14) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      state.nlen = (hold & 0x1f) + 257
      hold >>>= 5;
      bits -= 5
      state.ndist = (hold & 0x1f) + 1
      hold >>>= 5;
      bits -= 5
      state.ncode = (hold & 0x0f) + 4
      hold >>>= 4;
      bits -= 4
      if (state.nlen > 286 || state.ndist > 30) {
        strm.msg = 'too many length or distance symbols';
        state.mode = BAD;
        break;
      }
      state.have = 0;
      state.mode = LENLENS;
      
    case LENLENS:
      while (state.have < state.ncode) {
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.lens[order[state.have++]] = (hold & 0x07)
        hold >>>= 3;
        bits -= 3
      }
      while (state.have < 19) {
        state.lens[order[state.have++]] = 0;
      }
      state.lencode = state.lendyn;
      state.lenbits = 7;

      opts = {bits: state.lenbits};
      ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;

      if (ret) {
        strm.msg = 'invalid code lengths set';
        state.mode = BAD;
        break;
      }
      state.have = 0;
      state.mode = CODELENS;
      
    case CODELENS:
      while (state.have < state.nlen + state.ndist) {
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8
        }
        if (here_val < 16) {
          hold >>>= here_bits;
          bits -= here_bits
          state.lens[state.have++] = here_val;
        }
        else {
          if (here_val === 16) {
            n = here_bits + 2;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= here_bits;
            bits -= here_bits
            if (state.have === 0) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            len = state.lens[state.have - 1];
            copy = 3 + (hold & 0x03)
            hold >>>= 2;
            bits -= 2
          }
          else if (here_val === 17) {
            n = here_bits + 3;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= here_bits;
            bits -= here_bits
            len = 0;
            copy = 3 + (hold & 0x07)
            hold >>>= 3;
            bits -= 3
          }
          else {
            n = here_bits + 7;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= here_bits;
            bits -= here_bits
            len = 0;
            copy = 11 + (hold & 0x7f)
            hold >>>= 7;
            bits -= 7
          }
          if (state.have + copy > state.nlen + state.ndist) {
            strm.msg = 'invalid bit length repeat';
            state.mode = BAD;
            break;
          }
          while (copy--) {
            state.lens[state.have++] = len;
          }
        }
      }

      
      if (state.mode === BAD) { break; }

      
      if (state.lens[256] === 0) {
        strm.msg = 'invalid code -- missing end-of-block';
        state.mode = BAD;
        break;
      }

      
      state.lenbits = 9;

      opts = {bits: state.lenbits};
      ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts)
      state.lenbits = opts.bits

      if (ret) {
        strm.msg = 'invalid literal/lengths set';
        state.mode = BAD;
        break;
      }

      state.distbits = 6
      state.distcode = state.distdyn;
      opts = {bits: state.distbits};
      ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts)
      state.distbits = opts.bits

      if (ret) {
        strm.msg = 'invalid distances set';
        state.mode = BAD;
        break;
      }
      state.mode = LEN_;
      if (flush === Z_TREES) { break inf_leave; }
      
    case LEN_:
      state.mode = LEN;
      
    case LEN:
      if (have >= 6 && left >= 258) {
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits
        inflate_fast(strm, _out)
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits

        if (state.mode === TYPE) {
          state.back = -1;
        }
        break;
      }
      state.back = 0;
      for (;;) {
        here = state.lencode[hold & ((1 << state.lenbits) -1)];  
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if (here_bits <= bits) { break; }
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8
      }
      if (here_op && (here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.lencode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) -1)) >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8
        }
        hold >>>= last_bits;
        bits -= last_bits
        state.back += last_bits;
      }
      hold >>>= here_bits;
      bits -= here_bits
      state.back += here_bits;
      state.length = here_val;
      if (here_op === 0) {
        state.mode = LIT;
        break;
      }
      if (here_op & 32) {
        state.back = -1;
        state.mode = TYPE;
        break;
      }
      if (here_op & 64) {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break;
      }
      state.extra = here_op & 15;
      state.mode = LENEXT;
      
    case LENEXT:
      if (state.extra) {
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.length += hold & ((1 << state.extra) -1)
        hold >>>= state.extra;
        bits -= state.extra
        state.back += state.extra;
      }
      state.was = state.length;
      state.mode = DIST;
      
    case DIST:
      for (;;) {
        here = state.distcode[hold & ((1 << state.distbits) -1)];
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if ((here_bits) <= bits) { break; }
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8
      }
      if ((here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.distcode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) -1)) >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8
        }
        hold >>>= last_bits;
        bits -= last_bits
        state.back += last_bits;
      }
      hold >>>= here_bits;
      bits -= here_bits
      state.back += here_bits;
      if (here_op & 64) {
        strm.msg = 'invalid distance code';
        state.mode = BAD;
        break;
      }
      state.offset = here_val;
      state.extra = (here_op) & 15;
      state.mode = DISTEXT;
      
    case DISTEXT:
      if (state.extra) {
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        state.offset += hold & ((1 << state.extra) -1)
        hold >>>= state.extra;
        bits -= state.extra
        state.back += state.extra;
      }
      if (state.offset > state.dmax) {
        strm.msg = 'invalid distance too far back';
        state.mode = BAD;
        break;
      }
      state.mode = MATCH;
      
    case MATCH:
      if (left === 0) { break inf_leave; }
      copy = _out - left;
      if (state.offset > copy) {         
        copy = state.offset - copy;
        if (copy > state.whave) {
          if (state.sane) {
            strm.msg = 'invalid distance too far back';
            state.mode = BAD;
            break;
          }
        }
        if (copy > state.wnext) {
          copy -= state.wnext;
          from = state.wsize - copy;
        }
        else {
          from = state.wnext - copy;
        }
        if (copy > state.length) { copy = state.length; }
        from_source = state.window;
      }
      else {                              
        from_source = output;
        from = put - state.offset;
        copy = state.length;
      }
      if (copy > left) { copy = left; }
      left -= copy;
      state.length -= copy;
      do {
        output[put++] = from_source[from++];
      } while (--copy);
      if (state.length === 0) { state.mode = LEN; }
      break;
    case LIT:
      if (left === 0) { break inf_leave; }
      output[put++] = state.length;
      left--;
      state.mode = LEN;
      break;
    case CHECK:
      if (state.wrap) {
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--
          hold |= input[next++] << bits;
          bits += 8;
        }
        _out -= left;
        strm.total_out += _out;
        state.total += _out;
        if (_out) {
          strm.adler = state.check =
              
              (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

        }
        _out = left
        if ((state.flags ? hold : ZSWAP32(hold)) !== state.check) {
          strm.msg = 'incorrect data check';
          state.mode = BAD;
          break;
        }
        hold = 0;
        bits = 0
      }
      state.mode = LENGTH;
      
    case LENGTH:
      if (state.wrap && state.flags) {
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        if (hold !== (state.total & 0xffffffff)) {
          strm.msg = 'incorrect length check';
          state.mode = BAD;
          break;
        }
        hold = 0;
        bits = 0
      }
      state.mode = DONE;
      
    case DONE:
      ret = Z_STREAM_END;
      break inf_leave;
    case BAD:
      ret = Z_DATA_ERROR;
      break inf_leave;
    case MEM:
      return Z_MEM_ERROR;
    case SYNC:
      
    default:
      return Z_STREAM_ERROR;
    }
  }

  
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = 
      (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
    ret = Z_BUF_ERROR;
  }
  return ret;
}

function inflateEnd(strm) {

  if (!strm || !strm.state ) {
    return Z_STREAM_ERROR;
  }

  var state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK;
}

function inflateGetHeader(strm, head) {
  var state;

  
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

  
  state.head = head;
  head.done = false;
  return Z_OK;
}


exports.inflateReset = inflateReset;
exports.inflateReset2 = inflateReset2;
exports.inflateResetKeep = inflateResetKeep;
exports.inflateInit = inflateInit;
exports.inflateInit2 = inflateInit2;
exports.inflate = inflate;
exports.inflateEnd = inflateEnd;
exports.inflateGetHeader = inflateGetHeader;
exports.inflateInfo = 'pako inflate (from Nodeca project)';


},{"../utils/common":27,"./adler32":29,"./crc32":31,"./inffast":34,"./inftrees":36}],36:[function(_dereq_,module,exports){
'use strict';


var utils = _dereq_('../utils/common');

var MAXBITS = 15;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592

var CODES = 0;
var LENS = 1;
var DISTS = 2;

var lbase = [ 
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
];

var lext = [ 
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
];

var dbase = [ 
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
];

var dext = [ 
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
];

module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
{
  var bits = opts.bits

  var len = 0;               
  var sym = 0;               
  var min = 0, max = 0;          
  var root = 0;              
  var curr = 0;              
  var drop = 0;              
  var left = 0;                   
  var used = 0;              
  var huff = 0;              
  var incr;              
  var fill;              
  var low;               
  var mask;              
  var next;             
  var base = null;     
  var base_index = 0
  var end;                    
  var count = new utils.Buf16(MAXBITS+1)
  var offs = new utils.Buf16(MAXBITS+1)
  var extra = null;
  var extra_index = 0;

  var here_bits, here_op, here_val;

  

  
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     
    table[table_index++] = (1 << 24) | (64 << 16) | 0
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        
  }
  if (left > 0 && (type === CODES || max !== 1)) {
    return -1;                      
  }

  
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  

  
  if (type === CODES) {
      base = extra = work;    
      end = 19;
  } else if (type === LENS) {
      base = lbase;
      base_index -= 257;
      extra = lext;
      extra_index -= 257;
      end = 256;
  } else {                    
      base = dbase;
      extra = dext;
      end = -1;
  }

  
  huff = 0;                   
  sym = 0;                    
  len = min;                  
  next = table_index;              
  curr = root;                
  drop = 0;                   
  low = -1;                   
  used = 1 << root;          
  mask = used - 1;            

  
  if ((type === LENS && used > ENOUGH_LENS) ||
    (type === DISTS && used > ENOUGH_DISTS)) {
    return 1;
  }

  var i=0;
  
  for (;;) {
    i++;
    
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         
      here_val = 0;
    }

    
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    
    if (len > root && (huff & mask) !== low) {
      
      if (drop === 0) {
        drop = root;
      }

      
      next += min;            

      
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      
      used += 1 << curr;
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      
      low = huff & mask;
      
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  
  if (huff !== 0) {
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  
  opts.bits = root;
  return 0;
};

},{"../utils/common":27}],37:[function(_dereq_,module,exports){
'use strict';

module.exports = {
  '2':    'need dictionary',     
  '1':    'stream end',          
  '0':    '',                    
  '-1':   'file error',          
  '-2':   'stream error',        
  '-3':   'data error',          
  '-4':   'insufficient memory', 
  '-5':   'buffer error',        
  '-6':   'incompatible version' 
};
},{}],38:[function(_dereq_,module,exports){
'use strict';


var utils = _dereq_('../utils/common');



var Z_FIXED               = 4


var Z_BINARY              = 0;
var Z_TEXT                = 1
var Z_UNKNOWN             = 2;




function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES    = 2;


var MIN_MATCH    = 3;
var MAX_MATCH    = 258;



var LENGTH_CODES  = 29;


var LITERALS      = 256;


var L_CODES       = LITERALS + 1 + LENGTH_CODES;


var D_CODES       = 30;


var BL_CODES      = 19;


var HEAP_SIZE     = 2*L_CODES + 1;


var MAX_BITS      = 15;


var Buf_size      = 16;





var MAX_BL_BITS = 7;


var END_BLOCK   = 256;


var REP_3_6     = 16;


var REPZ_3_10   = 17;


var REPZ_11_138 = 18;


var extra_lbits =   
  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

var extra_dbits =   
  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

var extra_blbits =  
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

var bl_order =
  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];




var DIST_CODE_LEN = 512; 
var static_ltree  = new Array((L_CODES+2) * 2);
zero(static_ltree);


var static_dtree  = new Array(D_CODES * 2);
zero(static_dtree);


var _dist_code    = new Array(DIST_CODE_LEN);
zero(_dist_code);


var _length_code  = new Array(MAX_MATCH-MIN_MATCH+1);
zero(_length_code);


var base_length   = new Array(LENGTH_CODES);
zero(base_length);


var base_dist     = new Array(D_CODES);
zero(base_dist);



var StaticTreeDesc = function (static_tree, extra_bits, extra_base, elems, max_length) {

  this.static_tree  = static_tree;  
  this.extra_bits   = extra_bits;   
  this.extra_base   = extra_base;   
  this.elems        = elems;        
  this.max_length   = max_length;   
  this.has_stree    = static_tree && static_tree.length;
};


var static_l_desc;
var static_d_desc;
var static_bl_desc;


var TreeDesc = function(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;     
  this.max_code = 0;            
  this.stat_desc = stat_desc;   
};



function d_code(dist) {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
}



function put_short (s, w) {
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
}



function send_bits(s, value, length) {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
}


function send_code(s, c, tree) {
  send_bits(s, tree[c*2], tree[c*2 + 1]);
}



function bi_reverse(code, len) {
  var res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
}



function bi_flush(s) {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;

  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
}



function gen_bitlen(s, desc)
{
  var tree            = desc.dyn_tree;
  var max_code        = desc.max_code;
  var stree           = desc.stat_desc.static_tree;
  var has_stree       = desc.stat_desc.has_stree;
  var extra           = desc.stat_desc.extra_bits;
  var base            = desc.stat_desc.extra_base;
  var max_length      = desc.stat_desc.max_length;
  var h;              
  var n, m;           
  var bits;           
  var xbits;          
  var f;              
  var overflow = 0;   

  for (bits = 0; bits <= MAX_BITS; bits++) {
    s.bl_count[bits] = 0;
  }

  
  tree[s.heap[s.heap_max]*2 + 1] = 0; 

  for (h = s.heap_max+1; h < HEAP_SIZE; h++) {
    n = s.heap[h];
    bits = tree[tree[n*2 +1] * 2 + 1] + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n*2 + 1] = bits;
    

    if (n > max_code) { continue; } 

    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n-base];
    }
    f = tree[n * 2];
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n*2 + 1] + xbits);
    }
  }
  if (overflow === 0) { return; }
  

  
  do {
    bits = max_length-1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;      
    s.bl_count[bits+1] += 2; 
    s.bl_count[max_length]--;
    
    overflow -= 2;
  } while (overflow > 0);

  
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m*2 + 1] !== bits) {
        s.opt_len += (bits - tree[m*2 + 1])*tree[m*2];
        tree[m*2 + 1] = bits;
      }
      n--;
    }
  }
}



function gen_codes(tree, max_code, bl_count)
{
  var next_code = new Array(MAX_BITS+1); 
  var code = 0;              
  var bits;                  
  var n;                     

  
  for (bits = 1; bits <= MAX_BITS; bits++) {
    next_code[bits] = code = (code + bl_count[bits-1]) << 1;
  }
  

  for (n = 0;  n <= max_code; n++) {
    var len = tree[n*2 + 1];
    if (len === 0) { continue; }
    
    tree[n*2] = bi_reverse(next_code[len]++, len)
  }
}



function tr_static_init() {
  var n;        
  var bits;     
  var length;   
  var code;     
  var dist;     
  var bl_count = new Array(MAX_BITS+1);
  

  


  
  length = 0;
  for (code = 0; code < LENGTH_CODES-1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1<<extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  
  _length_code[length-1] = code;

  
  dist = 0;
  for (code = 0 ; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1<<extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  dist >>= 7; 
  for ( ; code < D_CODES; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1<<(extra_dbits[code]-7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }

  
  for (bits = 0; bits <= MAX_BITS; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;
  while (n <= 143) {
    static_ltree[n*2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n*2 + 1] = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n*2 + 1] = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n*2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  
  gen_codes(static_ltree, L_CODES+1, bl_count);

  
  for (n = 0; n < D_CODES; n++) {
    static_dtree[n*2 + 1] = 5;
    static_dtree[n*2] = bi_reverse(n, 5);
  }
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS+1, L_CODES, MAX_BITS);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
  static_bl_desc =new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS)
}



function init_block(s) {
  var n; 

  
  for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n*2] = 0; }
  for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n*2] = 0; }
  for (n = 0; n < BL_CODES; n++) { s.bl_tree[n*2] = 0; }

  s.dyn_ltree[END_BLOCK*2] = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
}



function bi_windup(s)
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
}


function copy_block(s, buf, len, header)
{
  bi_windup(s);        

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
  utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
  s.pending += len;
}


function smaller(tree, n, m, depth) {
  var _n2 = n*2;
  var _m2 = m*2;
  return (tree[_n2] < tree[_m2] ||
         (tree[_n2] === tree[_m2] && depth[n] <= depth[m]));
}


function pqdownheap(s, tree, k)
{
  var v = s.heap[k];
  var j = k << 1;  
  while (j <= s.heap_len) {
    
    if (j < s.heap_len &&
      smaller(tree, s.heap[j+1], s.heap[j], s.depth)) {
      j++;
    }
    
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

    
    s.heap[k] = s.heap[j];
    k = j;

    
    j <<= 1;
  }
  s.heap[k] = v;
}


function compress_block(s, ltree, dtree)
{
  var dist;           
  var lc;             
  var lx = 0;         
  var code;           
  var extra;          

  if (s.last_lit !== 0) {
    do {
      dist = (s.pending_buf[s.d_buf + lx*2] << 8) | (s.pending_buf[s.d_buf + lx*2 + 1]);
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree); 
      } else {
        
        code = _length_code[lc];
        send_code(s, code+LITERALS+1, ltree); 
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);       
        }
        dist--; 
        code = d_code(dist)

        send_code(s, code, dtree);       
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);   
        }
      } 

      

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
}



function build_tree(s, desc)
{
  var tree     = desc.dyn_tree;
  var stree    = desc.stat_desc.static_tree;
  var has_stree = desc.stat_desc.has_stree;
  var elems    = desc.stat_desc.elems;
  var n, m;          
  var max_code = -1; 
  var node;          

  
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2] !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;

    } else {
      tree[n*2 + 1] = 0;
    }
  }

  
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2] = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node*2 + 1];
    }
    
  }
  desc.max_code = max_code;

  
  for (n = (s.heap_len >> 1); n >= 1; n--) { pqdownheap(s, tree, n); }

  
  node = elems;              
  do {
    
    n = s.heap[1];
    s.heap[1] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1);
    

    m = s.heap[1]; 

    s.heap[--s.heap_max] = n; 
    s.heap[--s.heap_max] = m;

    
    tree[node * 2] = tree[n * 2] + tree[m * 2];
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n*2 + 1] = tree[m*2 + 1] = node;

    
    s.heap[1] = node++;
    pqdownheap(s, tree, 1);

  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1];

  
  gen_bitlen(s, desc);

  
  gen_codes(tree, max_code, s.bl_count);
}



function scan_tree(s, tree, max_code)
{
  var n;                     
  var prevlen = -1;          
  var curlen;                

  var nextlen = tree[0*2 + 1]; 

  var count = 0;             
  var max_count = 7;         
  var min_count = 4;         

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code+1)*2 + 1] = 0xffff; 

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n+1)*2 + 1];

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      s.bl_tree[curlen * 2] += count;

    } else if (curlen !== 0) {

      if (curlen !== prevlen) { s.bl_tree[curlen * 2]++; }
      s.bl_tree[REP_3_6*2]++;

    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10*2]++;

    } else {
      s.bl_tree[REPZ_11_138*2]++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}



function send_tree(s, tree, max_code)
{
  var n;                     
  var prevlen = -1;          
  var curlen;                

  var nextlen = tree[0*2 + 1]; 

  var count = 0;             
  var max_count = 7;         
  var min_count = 4;         

    
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n+1)*2 + 1];

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count-3, 2);

    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count-3, 3);

    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count-11, 7);
    }

    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}



function build_bl_tree(s) {
  var max_blindex;  

  
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

  
  build_tree(s, s.bl_desc);
  

  
  for (max_blindex = BL_CODES-1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex]*2 + 1] !== 0) {
      break;
    }
  }
  
  s.opt_len += 3*(max_blindex+1) + 5+5+4

  return max_blindex;
}



function send_all_trees(s, lcodes, dcodes, blcodes)
{
  var rank;                    
  send_bits(s, lcodes-257, 5); 
  send_bits(s, dcodes-1,   5);
  send_bits(s, blcodes-4,  4); 
  for (rank = 0; rank < blcodes; rank++) {
    send_bits(s, s.bl_tree[bl_order[rank]*2 + 1], 3);
  }

  send_tree(s, s.dyn_ltree, lcodes-1); 

  send_tree(s, s.dyn_dtree, dcodes-1); 
}



function detect_data_type(s) {
  
  var black_mask = 0xf3ffc07f;
  var n;

  
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if ((black_mask & 1) && (s.dyn_ltree[n*2] !== 0)) {
      return Z_BINARY;
    }
  }

  
  if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 ||
      s.dyn_ltree[13 * 2] !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS; n++) {
    if (s.dyn_ltree[n * 2] !== 0) {
      return Z_TEXT;
    }
  }

  
  return Z_BINARY;
}


var static_init_done = false;


function _tr_init(s)
{

  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

  s.bi_buf = 0;
  s.bi_valid = 0;

  
  init_block(s);
}



function _tr_stored_block(s, buf, stored_len, last)
{
  send_bits(s, (STORED_BLOCK<<1)+(last ? 1 : 0), 3);    
  copy_block(s, buf, stored_len, true); 
}



function _tr_align(s) {
  send_bits(s, STATIC_TREES<<1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
}



function _tr_flush_block(s, buf, stored_len, last)
{
  var opt_lenb, static_lenb;  
  var max_blindex = 0;        

  
  if (s.level > 0) {

    
    if (s.strm.data_type === Z_UNKNOWN) {
      s.strm.data_type = detect_data_type(s);
    }

    
    build_tree(s, s.l_desc)

    build_tree(s, s.d_desc)
    

    
    max_blindex = build_bl_tree(s);

    
    opt_lenb = (s.opt_len+3+7) >>> 3;
    static_lenb = (s.static_len+3+7) >>> 3

    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

  } else {
    opt_lenb = static_lenb = stored_len + 5; 
  }

  if ((stored_len+4 <= opt_lenb) && (buf !== -1)) {
    

    
    _tr_stored_block(s, buf, stored_len, last);

  } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

    send_bits(s, (STATIC_TREES<<1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);

  } else {
    send_bits(s, (DYN_TREES<<1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code+1, s.d_desc.max_code+1, max_blindex+1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  
  init_block(s);

  if (last) {
    bi_windup(s);
  }
}


function _tr_tally(s, dist, lc)
{

  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    
    s.dyn_ltree[lc*2]++;
  } else {
    s.matches++;
    
    dist--;             

    s.dyn_ltree[(_length_code[lc]+LITERALS+1) * 2]++;
    s.dyn_dtree[d_code(dist) * 2]++;
  }

  return (s.last_lit === s.lit_bufsize-1);
  
}

exports._tr_init  = _tr_init;
exports._tr_stored_block = _tr_stored_block;
exports._tr_flush_block  = _tr_flush_block;
exports._tr_tally = _tr_tally;
exports._tr_align = _tr_align;
},{"../utils/common":27}],39:[function(_dereq_,module,exports){
'use strict';


function ZStream() {
  
  this.input = null
  this.next_in = 0;
  
  this.avail_in = 0;
  
  this.total_in = 0;
  
  this.output = null
  this.next_out = 0;
  
  this.avail_out = 0;
  
  this.total_out = 0;
  
  this.msg = '';
  
  this.state = null;
  
  this.data_type = 2;
  
  this.adler = 0;
}

module.exports = ZStream;
},{}]},{},[9])
(9)
});


(function (root, factory) {
    'use strict'

    
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        FnExprTokens,
        Syntax,
        PlaceHolders,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        lookahead,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8,
        RegularExpression: 9
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';
    TokenName[Token.RegularExpression] = 'RegularExpression'
    FnExprTokens = ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new',
                    'return', 'case', 'delete', 'throw', 'void',
                    '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=',
                    '&=', '|=', '^=', ',',
                    '+', '-', '*', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
                    '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
                    '<=', '<', '>', '!=', '!=='];

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PlaceHolders = {
        ArrowParameterPlaceHolder: {
            type: 'ArrowParameterPlaceHolder'
        }
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    }
    Messages = {
        UnexpectedToken: 'Unexpected token %0',
        UnexpectedNumber: 'Unexpected number',
        UnexpectedString: 'Unexpected string',
        UnexpectedIdentifier: 'Unexpected identifier',
        UnexpectedReserved: 'Unexpected reserved word',
        UnexpectedEOS: 'Unexpected end of input',
        NewlineAfterThrow: 'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp: 'Invalid regular expression: missing /',
        InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
        InvalidLHSInForIn: 'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally: 'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith: 'Strict mode code may not include a with statement',
        StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
        StrictVarName: 'Variable name may not be eval or arguments in strict mode',
        StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
        StrictDelete: 'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty: 'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty: 'Object literal may not have data and accessor property with the same name',
        AccessorGetSet: 'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord: 'Use of future reserved word in strict mode'
    }
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
    }

    function assert(condition, message) {
        
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function isDecimalDigit(ch) {
        return (ch >= 0x30 && ch <= 0x39)
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }

    function isWhiteSpace(ch) {
        return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
            (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
    }

    function isLineTerminator(ch) {
        return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
    }

    function isIdentifierStart(ch) {
        return (ch === 0x24) || (ch === 0x5F) ||
            (ch >= 0x41 && ch <= 0x5A) ||
            (ch >= 0x61 && ch <= 0x7A) ||
            (ch === 0x5C) ||
            ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
    }

    function isIdentifierPart(ch) {
        return (ch === 0x24) || (ch === 0x5F) ||
            (ch >= 0x41 && ch <= 0x5A) ||
            (ch >= 0x61 && ch <= 0x7A) ||
            (ch >= 0x30 && ch <= 0x39) ||
            (ch === 0x5C) ||
            ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
    }

    function isFutureReservedWord(id) {
        switch (id) {
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        default:
            return false;
        }
    }

    function isStrictModeReservedWord(id) {
        switch (id) {
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        default:
            return false;
        }
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    function isKeyword(id) {
        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        switch (id.length) {
        case 2:
            return (id === 'if') || (id === 'in') || (id === 'do');
        case 3:
            return (id === 'var') || (id === 'for') || (id === 'new') ||
                (id === 'try') || (id === 'let');
        case 4:
            return (id === 'this') || (id === 'else') || (id === 'case') ||
                (id === 'void') || (id === 'with') || (id === 'enum');
        case 5:
            return (id === 'while') || (id === 'break') || (id === 'catch') ||
                (id === 'throw') || (id === 'const') || (id === 'yield') ||
                (id === 'class') || (id === 'super');
        case 6:
            return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
                (id === 'switch') || (id === 'export') || (id === 'import');
        case 7:
            return (id === 'default') || (id === 'finally') || (id === 'extends');
        case 8:
            return (id === 'function') || (id === 'continue') || (id === 'debugger');
        case 10:
            return (id === 'instanceof');
        default:
            return false;
        }
    }

    function addComment(type, value, start, end, loc) {
        var comment;

        assert(typeof start === 'number', 'Comment must have valid position')
        if (state.lastCommentStart >= start) {
            return;
        }
        state.lastCommentStart = start;

        comment = {
            type: type,
            value: value
        };
        if (extra.range) {
            comment.range = [start, end];
        }
        if (extra.loc) {
            comment.loc = loc;
        }
        extra.comments.push(comment);
        if (extra.attachComment) {
            extra.leadingComments.push(comment);
            extra.trailingComments.push(comment);
        }
    }

    function skipSingleLineComment(offset) {
        var start, loc, ch, comment;

        start = index - offset;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart - offset
            }
        };

        while (index < length) {
            ch = source.charCodeAt(index);
            ++index;
            if (isLineTerminator(ch)) {
                if (extra.comments) {
                    comment = source.slice(start + offset, index - 1);
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    addComment('Line', comment, start, index - 1, loc);
                }
                if (ch === 13 && source.charCodeAt(index) === 10) {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
                return;
            }
        }

        if (extra.comments) {
            comment = source.slice(start + offset, index);
            loc.end = {
                line: lineNumber,
                column: index - lineStart
            };
            addComment('Line', comment, start, index, loc);
        }
    }

    function skipMultiLineComment() {
        var start, loc, ch, comment;

        if (extra.comments) {
            start = index - 2;
            loc = {
                start: {
                    line: lineNumber,
                    column: index - lineStart - 2
                }
            };
        }

        while (index < length) {
            ch = source.charCodeAt(index);
            if (isLineTerminator(ch)) {
                if (ch === 0x0D && source.charCodeAt(index + 1) === 0x0A) {
                    ++index;
                }
                ++lineNumber;
                ++index;
                lineStart = index;
                if (index >= length) {
                    throwUnexpectedToken();
                }
            } else if (ch === 0x2A) {
                if (source.charCodeAt(index + 1) === 0x2F) {
                    ++index;
                    ++index;
                    if (extra.comments) {
                        comment = source.slice(start + 2, index - 2);
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        addComment('Block', comment, start, index, loc);
                    }
                    return;
                }
                ++index;
            } else {
                ++index;
            }
        }

        throwUnexpectedToken();
    }

    function skipComment() {
        var ch, start;

        start = (index === 0);
        while (index < length) {
            ch = source.charCodeAt(index);

            if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
                start = true;
            } else if (ch === 0x2F) {
                ch = source.charCodeAt(index + 1);
                if (ch === 0x2F) {
                    ++index;
                    ++index;
                    skipSingleLineComment(2);
                    start = true;
                } else if (ch === 0x2A) {
                    ++index;
                    ++index;
                    skipMultiLineComment();
                } else {
                    break;
                }
            } else if (start && ch === 0x2D) {
                if ((source.charCodeAt(index + 1) === 0x2D) && (source.charCodeAt(index + 2) === 0x3E)) {
                    index += 3;
                    skipSingleLineComment(3);
                } else {
                    break;
                }
            } else if (ch === 0x3C) {
                if (source.slice(index + 1, index + 4) === '!--') {
                    ++index
                    ++index
                    ++index
                    ++index
                    skipSingleLineComment(4);
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanUnicodeCodePointEscape() {
        var ch, code, cu1, cu2;

        ch = source[index];
        code = 0
        if (ch === '}') {
            throwUnexpectedToken();
        }

        while (index < length) {
            ch = source[index++];
            if (!isHexDigit(ch)) {
                break;
            }
            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
        }

        if (code > 0x10FFFF || ch !== '}') {
            throwUnexpectedToken();
        }
        if (code <= 0xFFFF) {
            return String.fromCharCode(code);
        }
        cu1 = ((code - 0x10000) >> 10) + 0xD800;
        cu2 = ((code - 0x10000) & 1023) + 0xDC00;
        return String.fromCharCode(cu1, cu2);
    }

    function getEscapedIdentifier() {
        var ch, id;

        ch = source.charCodeAt(index++);
        id = String.fromCharCode(ch)
        if (ch === 0x5C) {
            if (source.charCodeAt(index) !== 0x75) {
                throwUnexpectedToken();
            }
            ++index;
            ch = scanHexEscape('u');
            if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
                throwUnexpectedToken();
            }
            id = ch;
        }

        while (index < length) {
            ch = source.charCodeAt(index);
            if (!isIdentifierPart(ch)) {
                break;
            }
            ++index;
            id += String.fromCharCode(ch)
            if (ch === 0x5C) {
                id = id.substr(0, id.length - 1);
                if (source.charCodeAt(index) !== 0x75) {
                    throwUnexpectedToken();
                }
                ++index;
                ch = scanHexEscape('u');
                if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
                    throwUnexpectedToken();
                }
                id += ch;
            }
        }

        return id;
    }

    function getIdentifier() {
        var start, ch;

        start = index++;
        while (index < length) {
            ch = source.charCodeAt(index);
            if (ch === 0x5C) {
                index = start;
                return getEscapedIdentifier();
            }
            if (isIdentifierPart(ch)) {
                ++index;
            } else {
                break;
            }
        }

        return source.slice(start, index);
    }

    function scanIdentifier() {
        var start, id, type;

        start = index
        id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier()
        if (id.length === 1) {
            type = Token.Identifier;
        } else if (isKeyword(id)) {
            type = Token.Keyword;
        } else if (id === 'null') {
            type = Token.NullLiteral;
        } else if (id === 'true' || id === 'false') {
            type = Token.BooleanLiteral;
        } else {
            type = Token.Identifier;
        }

        return {
            type: type,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function scanPunctuator() {
        var start = index,
            code = source.charCodeAt(index),
            code2,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        switch (code) {
        case 0x2E:
        case 0x28:
        case 0x29:
        case 0x3B:
        case 0x2C:
        case 0x7B:
        case 0x7D:
        case 0x5B:
        case 0x5D:
        case 0x3A:
        case 0x3F:
        case 0x7E:
            ++index;
            if (extra.tokenize) {
                if (code === 0x28) {
                    extra.openParenToken = extra.tokens.length;
                } else if (code === 0x7B) {
                    extra.openCurlyToken = extra.tokens.length;
                }
            }
            return {
                type: Token.Punctuator,
                value: String.fromCharCode(code),
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };

        default:
            code2 = source.charCodeAt(index + 1)
            if (code2 === 0x3D) {
                switch (code) {
                case 0x2B:
                case 0x2D:
                case 0x2F:
                case 0x3C:
                case 0x3E:
                case 0x5E:
                case 0x7C:
                case 0x25:
                case 0x26:
                case 0x2A:
                    index += 2;
                    return {
                        type: Token.Punctuator,
                        value: String.fromCharCode(code) + String.fromCharCode(code2),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        start: start,
                        end: index
                    };

                case 0x21:
                case 0x3D:
                    index += 2
                    if (source.charCodeAt(index) === 0x3D) {
                        ++index;
                    }
                    return {
                        type: Token.Punctuator,
                        value: source.slice(start, index),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        start: start,
                        end: index
                    };
                }
            }
        }

        ch4 = source.substr(index, 4);

        if (ch4 === '>>>=') {
            index += 4;
            return {
                type: Token.Punctuator,
                value: ch4,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        ch3 = ch4.substr(0, 3);

        if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: ch3,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }
        ch2 = ch3.substr(0, 2);

        if ((ch1 === ch2[1] && ('+-<>&|'.indexOf(ch1) >= 0)) || ch2 === '=>') {
            index += 2;
            return {
                type: Token.Punctuator,
                value: ch2,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        throwUnexpectedToken();
    }

    function scanHexLiteral(start) {
        var number = '';

        while (index < length) {
            if (!isHexDigit(source[index])) {
                break;
            }
            number += source[index++];
        }

        if (number.length === 0) {
            throwUnexpectedToken();
        }

        if (isIdentifierStart(source.charCodeAt(index))) {
            throwUnexpectedToken();
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt('0x' + number, 16),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function scanBinaryLiteral(start) {
        var ch, number;

        number = '';

        while (index < length) {
            ch = source[index];
            if (ch !== '0' && ch !== '1') {
                break;
            }
            number += source[index++];
        }

        if (number.length === 0) {
            throwUnexpectedToken();
        }

        if (index < length) {
            ch = source.charCodeAt(index);
            
            if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                throwUnexpectedToken();
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt(number, 2),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function scanOctalLiteral(prefix, start) {
        var number, octal;

        if (isOctalDigit(prefix)) {
            octal = true;
            number = '0' + source[index++];
        } else {
            octal = false;
            ++index;
            number = '';
        }

        while (index < length) {
            if (!isOctalDigit(source[index])) {
                break;
            }
            number += source[index++];
        }

        if (!octal && number.length === 0) {
            throwUnexpectedToken();
        }

        if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
            throwUnexpectedToken();
        }

        return {
            type: Token.NumericLiteral,
            value: parseInt(number, 8),
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function isImplicitOctalLiteral() {
        var i, ch
        for (i = index + 1; i < length; ++i) {
            ch = source[i];
            if (ch === '8' || ch === '9') {
                return false;
            }
            if (!isOctalDigit(ch)) {
                return true;
            }
        }

        return true;
    }

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index]
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    ++index;
                    return scanHexLiteral(start);
                }
                if (ch === 'b' || ch === 'B') {
                    ++index;
                    return scanBinaryLiteral(start);
                }
                if (ch === 'o' || ch === 'O') {
                    return scanOctalLiteral(ch, start);
                }

                if (isOctalDigit(ch)) {
                    if (isImplicitOctalLiteral()) {
                        return scanOctalLiteral(ch, start);
                    }
                }
            }

            while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
            ch = source[index];
        }

        if (ch === '.') {
            number += source[index++];
            while (isDecimalDigit(source.charCodeAt(index))) {
                number += source[index++];
            }
            ch = source[index];
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }
            if (isDecimalDigit(source.charCodeAt(index))) {
                while (isDecimalDigit(source.charCodeAt(index))) {
                    number += source[index++];
                }
            } else {
                throwUnexpectedToken();
            }
        }

        if (isIdentifierStart(source.charCodeAt(index))) {
            throwUnexpectedToken();
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false, startLineNumber, startLineStart;
        startLineNumber = lineNumber;
        startLineStart = lineStart;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                    switch (ch) {
                    case 'u':
                    case 'x':
                        if (source[index] === '{') {
                            ++index;
                            str += scanUnicodeCodePointEscape();
                        } else {
                            restore = index;
                            unescaped = scanHexEscape(ch);
                            if (unescaped) {
                                str += unescaped;
                            } else {
                                index = restore;
                                str += ch;
                            }
                        }
                        break;
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch)
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++])
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    lineStart = index;
                }
            } else if (isLineTerminator(ch.charCodeAt(0))) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwUnexpectedToken();
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            startLineNumber: startLineNumber,
            startLineStart: startLineStart,
            lineNumber: lineNumber,
            lineStart: lineStart,
            start: start,
            end: index
        };
    }

    function testRegExp(pattern, flags) {
        var tmp = pattern,
            value;

        if (flags.indexOf('u') >= 0) {
            tmp = tmp
                .replace(/\\u\{([0-9a-fA-F]+)\}/g, function ($0, $1) {
                    if (parseInt($1, 16) <= 0x10FFFF) {
                        return 'x';
                    }
                    throwError(Messages.InvalidRegExp);
                })
                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x');
        }
        try {
            value = new RegExp(tmp);
        } catch (e) {
            throwError(Messages.InvalidRegExp);
        }
        try {
            return new RegExp(pattern, flags);
        } catch (exception) {
            return null;
        }
    }

    function scanRegExpBody() {
        var ch, str, classMarker, terminated, body;

        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        classMarker = false;
        terminated = false;
        while (index < length) {
            ch = source[index++];
            str += ch;
            if (ch === '\\') {
                ch = source[index++]
                if (isLineTerminator(ch.charCodeAt(0))) {
                    throwError(Messages.UnterminatedRegExp);
                }
                str += ch;
            } else if (isLineTerminator(ch.charCodeAt(0))) {
                throwError(Messages.UnterminatedRegExp);
            } else if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                }
            }
        }

        if (!terminated) {
            throwError(Messages.UnterminatedRegExp);
        }
        body = str.substr(1, str.length - 2);
        return {
            value: body,
            literal: str
        };
    }

    function scanRegExpFlags() {
        var ch, str, flags, restore;

        str = '';
        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch.charCodeAt(0))) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        for (str += '\\u'; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                    tolerateUnexpectedToken();
                } else {
                    str += '\\';
                    tolerateUnexpectedToken();
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        return {
            value: flags,
            literal: str
        };
    }

    function scanRegExp() {
        var start, body, flags, value;

        lookahead = null;
        skipComment();
        start = index;

        body = scanRegExpBody();
        flags = scanRegExpFlags();
        value = testRegExp(body.value, flags.value);

        if (extra.tokenize) {
            return {
                type: Token.RegularExpression,
                value: value,
                regex: {
                    pattern: body.value,
                    flags: flags.value
                },
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: start,
                end: index
            };
        }

        return {
            literal: body.literal + flags.literal,
            value: value,
            regex: {
                pattern: body.value,
                flags: flags.value
            },
            start: start,
            end: index
        };
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = scanRegExp();

        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        
        if (!extra.tokenize) {
            if (extra.tokens.length > 0) {
                token = extra.tokens[extra.tokens.length - 1];
                if (token.range[0] === pos && token.type === 'Punctuator') {
                    if (token.value === '/' || token.value === '/=') {
                        extra.tokens.pop();
                    }
                }
            }

            extra.tokens.push({
                type: 'RegularExpression',
                value: regex.literal,
                regex: regex.regex,
                range: [pos, index],
                loc: loc
            });
        }

        return regex;
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advanceSlash() {
        var prevToken,
            checkToken
        prevToken = extra.tokens[extra.tokens.length - 1];
        if (!prevToken) {
            return collectRegex();
        }
        if (prevToken.type === 'Punctuator') {
            if (prevToken.value === ']') {
                return scanPunctuator();
            }
            if (prevToken.value === ')') {
                checkToken = extra.tokens[extra.openParenToken - 1];
                if (checkToken &&
                        checkToken.type === 'Keyword' &&
                        (checkToken.value === 'if' ||
                         checkToken.value === 'while' ||
                         checkToken.value === 'for' ||
                         checkToken.value === 'with')) {
                    return collectRegex();
                }
                return scanPunctuator();
            }
            if (prevToken.value === '}') {
                if (extra.tokens[extra.openCurlyToken - 3] &&
                        extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
                    checkToken = extra.tokens[extra.openCurlyToken - 4];
                    if (!checkToken) {
                        return scanPunctuator();
                    }
                } else if (extra.tokens[extra.openCurlyToken - 4] &&
                        extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
                    checkToken = extra.tokens[extra.openCurlyToken - 5];
                    if (!checkToken) {
                        return collectRegex();
                    }
                } else {
                    return scanPunctuator();
                }
                if (FnExprTokens.indexOf(checkToken.value) >= 0) {
                    return scanPunctuator();
                }
                return collectRegex();
            }
            return collectRegex();
        }
        if (prevToken.type === 'Keyword' && prevToken.value !== 'this') {
            return collectRegex();
        }
        return scanPunctuator();
    }

    function advance() {
        var ch;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                start: index,
                end: index
            };
        }

        ch = source.charCodeAt(index);

        if (isIdentifierStart(ch)) {
            return scanIdentifier();
        }
        if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
            return scanPunctuator();
        }
        if (ch === 0x27 || ch === 0x22) {
            return scanStringLiteral();
        }
        if (ch === 0x2E) {
            if (isDecimalDigit(source.charCodeAt(index + 1))) {
                return scanNumericLiteral();
            }
            return scanPunctuator();
        }

        if (isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }
        if (extra.tokenize && ch === 0x2F) {
            return advanceSlash();
        }

        return scanPunctuator();
    }

    function collectToken() {
        var loc, token, value, entry;

        skipComment();
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            value = source.slice(token.start, token.end);
            entry = {
                type: TokenName[token.type],
                value: value,
                range: [token.start, token.end],
                loc: loc
            };
            if (token.regex) {
                entry.regex = {
                    pattern: token.regex.pattern,
                    flags: token.regex.flags
                };
            }
            extra.tokens.push(entry);
        }

        return token;
    }

    function lex() {
        var token;

        token = lookahead;
        index = token.end;
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;

        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();

        index = token.end;
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;

        return token;
    }

    function peek() {
        var pos, line, start;

        pos = index;
        line = lineNumber;
        start = lineStart;
        lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
        index = pos;
        lineNumber = line;
        lineStart = start;
    }

    function Position() {
        this.line = lineNumber;
        this.column = index - lineStart;
    }

    function SourceLocation() {
        this.start = new Position();
        this.end = null;
    }

    function WrappingSourceLocation(startToken) {
        if (startToken.type === Token.StringLiteral) {
            this.start = {
                line: startToken.startLineNumber,
                column: startToken.start - startToken.startLineStart
            };
        } else {
            this.start = {
                line: startToken.lineNumber,
                column: startToken.start - startToken.lineStart
            };
        }
        this.end = null;
    }

    function Node() {
        index = lookahead.start;
        if (lookahead.type === Token.StringLiteral) {
            lineNumber = lookahead.startLineNumber;
            lineStart = lookahead.startLineStart;
        } else {
            lineNumber = lookahead.lineNumber;
            lineStart = lookahead.lineStart;
        }
        if (extra.range) {
            this.range = [index, 0];
        }
        if (extra.loc) {
            this.loc = new SourceLocation();
        }
    }

    function WrappingNode(startToken) {
        if (extra.range) {
            this.range = [startToken.start, 0];
        }
        if (extra.loc) {
            this.loc = new WrappingSourceLocation(startToken);
        }
    }

    WrappingNode.prototype = Node.prototype = {

        processComment: function () {
            var lastChild,
                leadingComments,
                trailingComments,
                bottomRight = extra.bottomRightStack,
                i,
                comment,
                last = bottomRight[bottomRight.length - 1];

            if (this.type === Syntax.Program) {
                if (this.body.length > 0) {
                    return;
                }
            }

            if (extra.trailingComments.length > 0) {
                trailingComments = [];
                for (i = extra.trailingComments.length - 1; i >= 0; --i) {
                    comment = extra.trailingComments[i];
                    if (comment.range[0] >= this.range[1]) {
                        trailingComments.unshift(comment);
                        extra.trailingComments.splice(i, 1);
                    }
                }
                extra.trailingComments = [];
            } else {
                if (last && last.trailingComments && last.trailingComments[0].range[0] >= this.range[1]) {
                    trailingComments = last.trailingComments;
                    delete last.trailingComments;
                }
            }
            if (last) {
                while (last && last.range[0] >= this.range[0]) {
                    lastChild = last;
                    last = bottomRight.pop();
                }
            }

            if (lastChild) {
                if (lastChild.leadingComments && lastChild.leadingComments[lastChild.leadingComments.length - 1].range[1] <= this.range[0]) {
                    this.leadingComments = lastChild.leadingComments;
                    lastChild.leadingComments = undefined;
                }
            } else if (extra.leadingComments.length > 0) {
                leadingComments = [];
                for (i = extra.leadingComments.length - 1; i >= 0; --i) {
                    comment = extra.leadingComments[i];
                    if (comment.range[1] <= this.range[0]) {
                        leadingComments.unshift(comment);
                        extra.leadingComments.splice(i, 1);
                    }
                }
            }


            if (leadingComments && leadingComments.length > 0) {
                this.leadingComments = leadingComments;
            }
            if (trailingComments && trailingComments.length > 0) {
                this.trailingComments = trailingComments;
            }

            bottomRight.push(this);
        },

        finish: function () {
            if (extra.range) {
                this.range[1] = index;
            }
            if (extra.loc) {
                this.loc.end = new Position();
                if (extra.source) {
                    this.loc.source = extra.source;
                }
            }

            if (extra.attachComment) {
                this.processComment();
            }
        },

        finishArrayExpression: function (elements) {
            this.type = Syntax.ArrayExpression;
            this.elements = elements;
            this.finish();
            return this;
        },

        finishArrowFunctionExpression: function (params, defaults, body, expression) {
            this.type = Syntax.ArrowFunctionExpression;
            this.id = null;
            this.params = params;
            this.defaults = defaults;
            this.body = body;
            this.rest = null;
            this.generator = false;
            this.expression = expression;
            this.finish();
            return this;
        },

        finishAssignmentExpression: function (operator, left, right) {
            this.type = Syntax.AssignmentExpression;
            this.operator = operator;
            this.left = left;
            this.right = right;
            this.finish();
            return this;
        },

        finishBinaryExpression: function (operator, left, right) {
            this.type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression : Syntax.BinaryExpression;
            this.operator = operator;
            this.left = left;
            this.right = right;
            this.finish();
            return this;
        },

        finishBlockStatement: function (body) {
            this.type = Syntax.BlockStatement;
            this.body = body;
            this.finish();
            return this;
        },

        finishBreakStatement: function (label) {
            this.type = Syntax.BreakStatement;
            this.label = label;
            this.finish();
            return this;
        },

        finishCallExpression: function (callee, args) {
            this.type = Syntax.CallExpression;
            this.callee = callee;
            this.arguments = args;
            this.finish();
            return this;
        },

        finishCatchClause: function (param, body) {
            this.type = Syntax.CatchClause;
            this.param = param;
            this.body = body;
            this.finish();
            return this;
        },

        finishConditionalExpression: function (test, consequent, alternate) {
            this.type = Syntax.ConditionalExpression;
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
            this.finish();
            return this;
        },

        finishContinueStatement: function (label) {
            this.type = Syntax.ContinueStatement;
            this.label = label;
            this.finish();
            return this;
        },

        finishDebuggerStatement: function () {
            this.type = Syntax.DebuggerStatement;
            this.finish();
            return this;
        },

        finishDoWhileStatement: function (body, test) {
            this.type = Syntax.DoWhileStatement;
            this.body = body;
            this.test = test;
            this.finish();
            return this;
        },

        finishEmptyStatement: function () {
            this.type = Syntax.EmptyStatement;
            this.finish();
            return this;
        },

        finishExpressionStatement: function (expression) {
            this.type = Syntax.ExpressionStatement;
            this.expression = expression;
            this.finish();
            return this;
        },

        finishForStatement: function (init, test, update, body) {
            this.type = Syntax.ForStatement;
            this.init = init;
            this.test = test;
            this.update = update;
            this.body = body;
            this.finish();
            return this;
        },

        finishForInStatement: function (left, right, body) {
            this.type = Syntax.ForInStatement;
            this.left = left;
            this.right = right;
            this.body = body;
            this.each = false;
            this.finish();
            return this;
        },

        finishFunctionDeclaration: function (id, params, defaults, body) {
            this.type = Syntax.FunctionDeclaration;
            this.id = id;
            this.params = params;
            this.defaults = defaults;
            this.body = body;
            this.rest = null;
            this.generator = false;
            this.expression = false;
            this.finish();
            return this;
        },

        finishFunctionExpression: function (id, params, defaults, body) {
            this.type = Syntax.FunctionExpression;
            this.id = id;
            this.params = params;
            this.defaults = defaults;
            this.body = body;
            this.rest = null;
            this.generator = false;
            this.expression = false;
            this.finish();
            return this;
        },

        finishIdentifier: function (name) {
            this.type = Syntax.Identifier;
            this.name = name;
            this.finish();
            return this;
        },

        finishIfStatement: function (test, consequent, alternate) {
            this.type = Syntax.IfStatement;
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
            this.finish();
            return this;
        },

        finishLabeledStatement: function (label, body) {
            this.type = Syntax.LabeledStatement;
            this.label = label;
            this.body = body;
            this.finish();
            return this;
        },

        finishLiteral: function (token) {
            this.type = Syntax.Literal;
            this.value = token.value;
            this.raw = source.slice(token.start, token.end);
            if (token.regex) {
                this.regex = token.regex;
            }
            this.finish();
            return this;
        },

        finishMemberExpression: function (accessor, object, property) {
            this.type = Syntax.MemberExpression;
            this.computed = accessor === '[';
            this.object = object;
            this.property = property;
            this.finish();
            return this;
        },

        finishNewExpression: function (callee, args) {
            this.type = Syntax.NewExpression;
            this.callee = callee;
            this.arguments = args;
            this.finish();
            return this;
        },

        finishObjectExpression: function (properties) {
            this.type = Syntax.ObjectExpression;
            this.properties = properties;
            this.finish();
            return this;
        },

        finishPostfixExpression: function (operator, argument) {
            this.type = Syntax.UpdateExpression;
            this.operator = operator;
            this.argument = argument;
            this.prefix = false;
            this.finish();
            return this;
        },

        finishProgram: function (body) {
            this.type = Syntax.Program;
            this.body = body;
            this.finish();
            return this;
        },

        finishProperty: function (kind, key, value, method, shorthand) {
            this.type = Syntax.Property;
            this.key = key;
            this.value = value;
            this.kind = kind;
            this.method = method;
            this.shorthand = shorthand;
            this.finish();
            return this;
        },

        finishReturnStatement: function (argument) {
            this.type = Syntax.ReturnStatement;
            this.argument = argument;
            this.finish();
            return this;
        },

        finishSequenceExpression: function (expressions) {
            this.type = Syntax.SequenceExpression;
            this.expressions = expressions;
            this.finish();
            return this;
        },

        finishSwitchCase: function (test, consequent) {
            this.type = Syntax.SwitchCase;
            this.test = test;
            this.consequent = consequent;
            this.finish();
            return this;
        },

        finishSwitchStatement: function (discriminant, cases) {
            this.type = Syntax.SwitchStatement;
            this.discriminant = discriminant;
            this.cases = cases;
            this.finish();
            return this;
        },

        finishThisExpression: function () {
            this.type = Syntax.ThisExpression;
            this.finish();
            return this;
        },

        finishThrowStatement: function (argument) {
            this.type = Syntax.ThrowStatement;
            this.argument = argument;
            this.finish();
            return this;
        },

        finishTryStatement: function (block, guardedHandlers, handlers, finalizer) {
            this.type = Syntax.TryStatement;
            this.block = block;
            this.guardedHandlers = guardedHandlers;
            this.handlers = handlers;
            this.finalizer = finalizer;
            this.finish();
            return this;
        },

        finishUnaryExpression: function (operator, argument) {
            this.type = (operator === '++' || operator === '--') ? Syntax.UpdateExpression : Syntax.UnaryExpression;
            this.operator = operator;
            this.argument = argument;
            this.prefix = true;
            this.finish();
            return this;
        },

        finishVariableDeclaration: function (declarations, kind) {
            this.type = Syntax.VariableDeclaration;
            this.declarations = declarations;
            this.kind = kind;
            this.finish();
            return this;
        },

        finishVariableDeclarator: function (id, init) {
            this.type = Syntax.VariableDeclarator;
            this.id = id;
            this.init = init;
            this.finish();
            return this;
        },

        finishWhileStatement: function (test, body) {
            this.type = Syntax.WhileStatement;
            this.test = test;
            this.body = body;
            this.finish();
            return this;
        },

        finishWithStatement: function (object, body) {
            this.type = Syntax.WithStatement;
            this.object = object;
            this.body = body;
            this.finish();
            return this;
        }
    }

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    function createError(line, pos, description) {
        var error = new Error('Line ' + line + ': ' + description);
        error.index = pos;
        error.lineNumber = line;
        error.column = pos - lineStart + 1;
        error.description = description;
        return error;
    }

    function throwError(messageFormat) {
        var args, msg;

        args = Array.prototype.slice.call(arguments, 1);
        msg = messageFormat.replace(/%(\d)/g,
            function (whole, idx) {
                assert(idx < args.length, 'Message reference must be in range');
                return args[idx];
            }
        );

        throw createError(lineNumber, index, msg);
    }

    function tolerateError(messageFormat) {
        var args, msg, error;

        args = Array.prototype.slice.call(arguments, 1);
        
        msg = messageFormat.replace(/%(\d)/g,
            function (whole, idx) {
                assert(idx < args.length, 'Message reference must be in range');
                return args[idx];
            }
        );

        error = createError(lineNumber, index, msg);
        if (extra.errors) {
            extra.errors.push(error);
        } else {
            throw error;
        }
    }

    function unexpectedTokenError(token, message) {
        var msg = Messages.UnexpectedToken;

        if (token) {
            msg = message ? message :
                (token.type === Token.EOF) ? Messages.UnexpectedEOS :
                (token.type === Token.Identifier) ? Messages.UnexpectedIdentifier :
                (token.type === Token.NumericLiteral) ? Messages.UnexpectedNumber :
                (token.type === Token.StringLiteral) ? Messages.UnexpectedString :
                Messages.UnexpectedToken;

            if (token.type === Token.Keyword) {
                if (isFutureReservedWord(token.value)) {
                    msg = Messages.UnexpectedReserved;
                } else if (strict && isStrictModeReservedWord(token.value)) {
                    msg = Messages.StrictReservedWord;
                }
            }
        }

        msg = msg.replace('%0', token ? token.value : 'ILLEGAL');

        return (token && typeof token.lineNumber === 'number') ?
            createError(token.lineNumber, token.start, msg) :
            createError(lineNumber, index, msg);
    }

    function throwUnexpectedToken(token, message) {
        throw unexpectedTokenError(token, message);
    }

    function tolerateUnexpectedToken(token, message) {
        var error = unexpectedTokenError(token, message);
        if (extra.errors) {
            extra.errors.push(error);
        } else {
            throw error;
        }
    }

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpectedToken(token);
        }
    }

    
    function expectCommaSeparator() {
        var token;

        if (extra.errors) {
            token = lookahead;
            if (token.type === Token.Punctuator && token.value === ',') {
                lex();
            } else if (token.type === Token.Punctuator && token.value === ';') {
                lex();
                tolerateUnexpectedToken(token);
            } else {
                tolerateUnexpectedToken(token, Messages.UnexpectedToken);
            }
        } else {
            expect(',');
        }
    }

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpectedToken(token);
        }
    }

    function match(value) {
        return lookahead.type === Token.Punctuator && lookahead.value === value;
    }

    function matchKeyword(keyword) {
        return lookahead.type === Token.Keyword && lookahead.value === keyword;
    }

    function matchAssign() {
        var op;

        if (lookahead.type !== Token.Punctuator) {
            return false;
        }
        op = lookahead.value;
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var line, oldIndex = index, oldLineNumber = lineNumber,
            oldLineStart = lineStart, oldLookahead = lookahead
        if (source.charCodeAt(index) === 0x3B || match(';')) {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            index = oldIndex;
            lineNumber = oldLineNumber;
            lineStart = oldLineStart;
            lookahead = oldLookahead;
            return;
        }

        if (lookahead.type !== Token.EOF && !match('}')) {
            throwUnexpectedToken(lookahead);
        }
    }

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    function parseArrayInitialiser() {
        var elements = [], node = new Node();

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        lex();

        return node.finishArrayExpression(elements);
    }

    function parsePropertyFunction(param, first) {
        var previousStrict, body, node = new Node();

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            tolerateUnexpectedToken(first, Messages.StrictParamName);
        }
        strict = previousStrict;
        return node.finishFunctionExpression(null, param, [], body);
    }

    function parsePropertyMethodFunction() {
        var previousStrict, param, method;

        previousStrict = strict;
        strict = true;
        param = parseParams();
        method = parsePropertyFunction(param.params);
        strict = previousStrict;

        return method;
    }

    function parseObjectPropertyKey() {
        var token, node = new Node();

        token = lex()

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                tolerateUnexpectedToken(token, Messages.StrictOctalLiteral);
            }
            return node.finishLiteral(token);
        }

        return node.finishIdentifier(token.value);
    }

    function parseObjectProperty() {
        var token, key, id, value, param, node = new Node();

        token = lookahead;

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey()

            if (token.value === 'get' && !(match(':') || match('('))) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                value = parsePropertyFunction([]);
                return node.finishProperty('get', key, value, false, false);
            }
            if (token.value === 'set' && !(match(':') || match('('))) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead;
                if (token.type !== Token.Identifier) {
                    expect(')');
                    tolerateUnexpectedToken(token);
                    value = parsePropertyFunction([]);
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    value = parsePropertyFunction(param, token);
                }
                return node.finishProperty('set', key, value, false, false);
            }
            if (match(':')) {
                lex();
                value = parseAssignmentExpression();
                return node.finishProperty('init', id, value, false, false);
            }
            if (match('(')) {
                value = parsePropertyMethodFunction();
                return node.finishProperty('init', id, value, true, false);
            }

            value = id;
            return node.finishProperty('init', id, value, false, true);
        }
        if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpectedToken(token);
        } else {
            key = parseObjectPropertyKey();
            if (match(':')) {
                lex();
                value = parseAssignmentExpression();
                return node.finishProperty('init', key, value, false, false);
            }
            if (match('(')) {
                value = parsePropertyMethodFunction();
                return node.finishProperty('init', key, value, true, false);
            }
            throwUnexpectedToken(lex());
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, key, kind, map = {}, toString = String, node = new Node();

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;

            key = '$' + name;
            if (Object.prototype.hasOwnProperty.call(map, key)) {
                if (map[key] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        tolerateError(Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        tolerateError(Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        tolerateError(Messages.AccessorDataProperty);
                    } else if (map[key] & kind) {
                        tolerateError(Messages.AccessorGetSet);
                    }
                }
                map[key] |= kind;
            } else {
                map[key] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expectCommaSeparator();
            }
        }

        expect('}');

        return node.finishObjectExpression(properties);
    }

    function parseGroupExpression() {
        var expr;

        expect('(');

        if (match(')')) {
            lex();
            return PlaceHolders.ArrowParameterPlaceHolder;
        }

        ++state.parenthesisCount;

        expr = parseExpression();

        expect(')');

        return expr;
    }

    function parsePrimaryExpression() {
        var type, token, expr, node;

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        type = lookahead.type;
        node = new Node();

        if (type === Token.Identifier) {
            expr = node.finishIdentifier(lex().value);
        } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && lookahead.octal) {
                tolerateUnexpectedToken(lookahead, Messages.StrictOctalLiteral);
            }
            expr = node.finishLiteral(lex());
        } else if (type === Token.Keyword) {
            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
            if (matchKeyword('this')) {
                lex();
                expr = node.finishThisExpression();
            } else {
                throwUnexpectedToken(lex());
            }
        } else if (type === Token.BooleanLiteral) {
            token = lex();
            token.value = (token.value === 'true');
            expr = node.finishLiteral(token);
        } else if (type === Token.NullLiteral) {
            token = lex();
            token.value = null;
            expr = node.finishLiteral(token);
        } else if (match('/') || match('/=')) {
            if (typeof extra.tokens !== 'undefined') {
                expr = node.finishLiteral(collectRegex());
            } else {
                expr = node.finishLiteral(scanRegExp());
            }
            peek();
        } else {
            throwUnexpectedToken(lex());
        }

        return expr;
    }

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expectCommaSeparator();
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token, node = new Node();

        token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpectedToken(token);
        }

        return node.finishIdentifier(token.value);
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var callee, args, node = new Node();

        expectKeyword('new');
        callee = parseLeftHandSideExpression();
        args = match('(') ? parseArguments() : [];

        return node.finishNewExpression(callee, args);
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr, args, property, startToken, previousAllowIn = state.allowIn;

        startToken = lookahead;
        state.allowIn = true;
        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        for (;;) {
            if (match('.')) {
                property = parseNonComputedMember();
                expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
            } else if (match('(')) {
                args = parseArguments();
                expr = new WrappingNode(startToken).finishCallExpression(expr, args);
            } else if (match('[')) {
                property = parseComputedMember();
                expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
            } else {
                break;
            }
        }
        state.allowIn = previousAllowIn;

        return expr;
    }

    function parseLeftHandSideExpression() {
        var expr, property, startToken;
        assert(state.allowIn, 'callee of new expression always allow in keyword.');

        startToken = lookahead;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        for (;;) {
            if (match('[')) {
                property = parseComputedMember();
                expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
            } else if (match('.')) {
                property = parseNonComputedMember();
                expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
            } else {
                break;
            }
        }
        return expr;
    }

    function parsePostfixExpression() {
        var expr, token, startToken = lookahead;

        expr = parseLeftHandSideExpressionAllowCall();

        if (lookahead.type === Token.Punctuator) {
            if ((match('++') || match('--')) && !peekLineTerminator()) {
                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                    tolerateError(Messages.StrictLHSPostfix);
                }

                if (!isLeftHandSide(expr)) {
                    tolerateError(Messages.InvalidLHSInAssignment);
                }

                token = lex();
                expr = new WrappingNode(startToken).finishPostfixExpression(token.value, expr);
            }
        }

        return expr;
    }

    function parseUnaryExpression() {
        var token, expr, startToken;

        if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
            expr = parsePostfixExpression();
        } else if (match('++') || match('--')) {
            startToken = lookahead;
            token = lex();
            expr = parseUnaryExpression()
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                tolerateError(Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                tolerateError(Messages.InvalidLHSInAssignment);
            }

            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
        } else if (match('+') || match('-') || match('~') || match('!')) {
            startToken = lookahead;
            token = lex();
            expr = parseUnaryExpression();
            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
        } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            startToken = lookahead;
            token = lex();
            expr = parseUnaryExpression();
            expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                tolerateError(Messages.StrictDelete);
            }
        } else {
            expr = parsePostfixExpression();
        }

        return expr;
    }

    function binaryPrecedence(token, allowIn) {
        var prec = 0;

        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return 0;
        }

        switch (token.value) {
        case '||':
            prec = 1;
            break;

        case '&&':
            prec = 2;
            break;

        case '|':
            prec = 3;
            break;

        case '^':
            prec = 4;
            break;

        case '&':
            prec = 5;
            break;

        case '==':
        case '!=':
        case '===':
        case '!==':
            prec = 6;
            break;

        case '<':
        case '>':
        case '<=':
        case '>=':
        case 'instanceof':
            prec = 7;
            break;

        case 'in':
            prec = allowIn ? 7 : 0;
            break;

        case '<<':
        case '>>':
        case '>>>':
            prec = 8;
            break;

        case '+':
        case '-':
            prec = 9;
            break;

        case '*':
        case '/':
        case '%':
            prec = 11;
            break;

        default:
            break;
        }

        return prec;
    }

    function parseBinaryExpression() {
        var marker, markers, expr, token, prec, stack, right, operator, left, i;

        marker = lookahead;
        left = parseUnaryExpression();
        if (left === PlaceHolders.ArrowParameterPlaceHolder) {
            return left;
        }

        token = lookahead;
        prec = binaryPrecedence(token, state.allowIn);
        if (prec === 0) {
            return left;
        }
        token.prec = prec;
        lex();

        markers = [marker, lookahead];
        right = parseUnaryExpression();

        stack = [left, token, right];

        while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {
            while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
                right = stack.pop();
                operator = stack.pop().value;
                left = stack.pop();
                markers.pop();
                expr = new WrappingNode(markers[markers.length - 1]).finishBinaryExpression(operator, left, right);
                stack.push(expr);
            }
            token = lex();
            token.prec = prec;
            stack.push(token);
            markers.push(lookahead);
            expr = parseUnaryExpression();
            stack.push(expr);
        }
        i = stack.length - 1;
        expr = stack[i];
        markers.pop();
        while (i > 1) {
            expr = new WrappingNode(markers.pop()).finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
            i -= 2;
        }

        return expr;
    }

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent, alternate, startToken;

        startToken = lookahead;

        expr = parseBinaryExpression();
        if (expr === PlaceHolders.ArrowParameterPlaceHolder) {
            return expr;
        }
        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');
            alternate = parseAssignmentExpression();

            expr = new WrappingNode(startToken).finishConditionalExpression(expr, consequent, alternate);
        }

        return expr;
    }

    function parseConciseBody() {
        if (match('{')) {
            return parseFunctionSourceElements();
        }
        return parseAssignmentExpression();
    }

    function reinterpretAsCoverFormalsList(expressions) {
        var i, len, param, params, defaults, defaultCount, options, rest, token;

        params = [];
        defaults = [];
        defaultCount = 0;
        rest = null;
        options = {
            paramSet: {}
        };

        for (i = 0, len = expressions.length; i < len; i += 1) {
            param = expressions[i];
            if (param.type === Syntax.Identifier) {
                params.push(param);
                defaults.push(null);
                validateParam(options, param, param.name);
            } else if (param.type === Syntax.AssignmentExpression) {
                params.push(param.left);
                defaults.push(param.right);
                ++defaultCount;
                validateParam(options, param.left, param.left.name);
            } else {
                return null;
            }
        }

        if (options.message === Messages.StrictParamDupe) {
            token = strict ? options.stricted : options.firstRestricted;
            throwUnexpectedToken(token, options.message);
        }

        if (defaultCount === 0) {
            defaults = [];
        }

        return {
            params: params,
            defaults: defaults,
            rest: rest,
            stricted: options.stricted,
            firstRestricted: options.firstRestricted,
            message: options.message
        };
    }

    function parseArrowFunctionExpression(options, node) {
        var previousStrict, body;

        expect('=>');
        previousStrict = strict;

        body = parseConciseBody();

        if (strict && options.firstRestricted) {
            throwUnexpectedToken(options.firstRestricted, options.message);
        }
        if (strict && options.stricted) {
            tolerateUnexpectedToken(options.stricted, options.message);
        }

        strict = previousStrict;

        return node.finishArrowFunctionExpression(options.params, options.defaults, body, body.type !== Syntax.BlockStatement);
    }

    function parseAssignmentExpression() {
        var oldParenthesisCount, token, expr, right, list, startToken;

        oldParenthesisCount = state.parenthesisCount;

        startToken = lookahead;
        token = lookahead;

        expr = parseConditionalExpression();

        if (expr === PlaceHolders.ArrowParameterPlaceHolder || match('=>')) {
            if (state.parenthesisCount === oldParenthesisCount ||
                    state.parenthesisCount === (oldParenthesisCount + 1)) {
                if (expr.type === Syntax.Identifier) {
                    list = reinterpretAsCoverFormalsList([ expr ]);
                } else if (expr.type === Syntax.AssignmentExpression) {
                    list = reinterpretAsCoverFormalsList([ expr ]);
                } else if (expr.type === Syntax.SequenceExpression) {
                    list = reinterpretAsCoverFormalsList(expr.expressions);
                } else if (expr === PlaceHolders.ArrowParameterPlaceHolder) {
                    list = reinterpretAsCoverFormalsList([]);
                }
                if (list) {
                    return parseArrowFunctionExpression(list, new WrappingNode(startToken));
                }
            }
        }

        if (matchAssign()) {
            if (!isLeftHandSide(expr)) {
                tolerateError(Messages.InvalidLHSInAssignment);
            }
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                tolerateUnexpectedToken(token, Messages.StrictLHSAssignment);
            }

            token = lex();
            right = parseAssignmentExpression();
            expr = new WrappingNode(startToken).finishAssignmentExpression(token.value, expr, right);
        }

        return expr;
    }

    function parseExpression() {
        var expr, startToken = lookahead, expressions;

        expr = parseAssignmentExpression();

        if (match(',')) {
            expressions = [expr];

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expressions.push(parseAssignmentExpression());
            }

            expr = new WrappingNode(startToken).finishSequenceExpression(expressions);
        }

        return expr;
    }

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block, node = new Node();

        expect('{');

        block = parseStatementList();

        expect('}');

        return node.finishBlockStatement(block);
    }

    function parseVariableIdentifier() {
        var token, node = new Node();

        token = lex();

        if (token.type !== Token.Identifier) {
            if (strict && token.type === Token.Keyword && isStrictModeReservedWord(token.value)) {
                tolerateUnexpectedToken(token, Messages.StrictReservedWord);
            } else {
                throwUnexpectedToken(token);
            }
        }

        return node.finishIdentifier(token.value);
    }

    function parseVariableDeclaration(kind) {
        var init = null, id, node = new Node();

        id = parseVariableIdentifier()
        if (strict && isRestrictedWord(id.name)) {
            tolerateError(Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return node.finishVariableDeclarator(id, init);
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement(node) {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return node.finishVariableDeclaration(declarations, 'var');
    }
    function parseConstLetDeclaration(kind) {
        var declarations, node = new Node();

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return node.finishVariableDeclaration(declarations, kind);
    }

    function parseEmptyStatement() {
        var node = new Node();
        expect(';');
        return node.finishEmptyStatement();
    }

    function parseExpressionStatement(node) {
        var expr = parseExpression();
        consumeSemicolon();
        return node.finishExpressionStatement(expr);
    }

    function parseIfStatement(node) {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return node.finishIfStatement(test, consequent, alternate);
    }

    function parseDoWhileStatement(node) {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return node.finishDoWhileStatement(body, test);
    }

    function parseWhileStatement(node) {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return node.finishWhileStatement(test, body);
    }

    function parseForVariableDeclaration() {
        var token, declarations, node = new Node();

        token = lex();
        declarations = parseVariableDeclarationList();

        return node.finishVariableDeclaration(declarations, token.value);
    }

    function parseForStatement(node) {
        var init, test, update, left, right, body, oldInIteration, previousAllowIn = state.allowIn;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = previousAllowIn;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = previousAllowIn;

                if (matchKeyword('in')) {
                    if (!isLeftHandSide(init)) {
                        tolerateError(Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return (typeof left === 'undefined') ?
                node.finishForStatement(init, test, update, body) :
                node.finishForInStatement(left, right, body);
    }

    function parseContinueStatement(node) {
        var label = null, key;

        expectKeyword('continue')
        if (source.charCodeAt(index) === 0x3B) {
            lex();

            if (!state.inIteration) {
                throwError(Messages.IllegalContinue);
            }

            return node.finishContinueStatement(null);
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError(Messages.IllegalContinue);
            }

            return node.finishContinueStatement(null);
        }

        if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();

            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError(Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError(Messages.IllegalContinue);
        }

        return node.finishContinueStatement(label);
    }

    function parseBreakStatement(node) {
        var label = null, key;

        expectKeyword('break')
        if (source.charCodeAt(index) === 0x3B) {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError(Messages.IllegalBreak);
            }

            return node.finishBreakStatement(null);
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError(Messages.IllegalBreak);
            }

            return node.finishBreakStatement(null);
        }

        if (lookahead.type === Token.Identifier) {
            label = parseVariableIdentifier();

            key = '$' + label.name;
            if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError(Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError(Messages.IllegalBreak);
        }

        return node.finishBreakStatement(label);
    }

    function parseReturnStatement(node) {
        var argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            tolerateError(Messages.IllegalReturn);
        }
        if (source.charCodeAt(index) === 0x20) {
            if (isIdentifierStart(source.charCodeAt(index + 1))) {
                argument = parseExpression();
                consumeSemicolon();
                return node.finishReturnStatement(argument);
            }
        }

        if (peekLineTerminator()) {
            return node.finishReturnStatement(null);
        }

        if (!match(';')) {
            if (!match('}') && lookahead.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return node.finishReturnStatement(argument);
    }

    function parseWithStatement(node) {
        var object, body;

        if (strict) {
            skipComment();
            tolerateError(Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return node.finishWithStatement(object, body);
    }

    function parseSwitchCase() {
        var test, consequent = [], statement, node = new Node();

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            consequent.push(statement);
        }

        return node.finishSwitchCase(test, consequent);
    }

    function parseSwitchStatement(node) {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        cases = [];

        if (match('}')) {
            lex();
            return node.finishSwitchStatement(discriminant, cases);
        }

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError(Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return node.finishSwitchStatement(discriminant, cases);
    }

    function parseThrowStatement(node) {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError(Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return node.finishThrowStatement(argument);
    }

    function parseCatchClause() {
        var param, body, node = new Node();

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpectedToken(lookahead);
        }

        param = parseVariableIdentifier()
        if (strict && isRestrictedWord(param.name)) {
            tolerateError(Messages.StrictCatchVariable);
        }

        expect(')');
        body = parseBlock();
        return node.finishCatchClause(param, body);
    }

    function parseTryStatement(node) {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError(Messages.NoCatchOrFinally);
        }

        return node.finishTryStatement(block, [], handlers, finalizer);
    }

    function parseDebuggerStatement(node) {
        expectKeyword('debugger');

        consumeSemicolon();

        return node.finishDebuggerStatement();
    }

    function parseStatement() {
        var type = lookahead.type,
            expr,
            labeledBody,
            key,
            node;

        if (type === Token.EOF) {
            throwUnexpectedToken(lookahead);
        }

        if (type === Token.Punctuator && lookahead.value === '{') {
            return parseBlock();
        }

        node = new Node();

        if (type === Token.Punctuator) {
            switch (lookahead.value) {
            case ';':
                return parseEmptyStatement(node);
            case '(':
                return parseExpressionStatement(node);
            default:
                break;
            }
        } else if (type === Token.Keyword) {
            switch (lookahead.value) {
            case 'break':
                return parseBreakStatement(node);
            case 'continue':
                return parseContinueStatement(node);
            case 'debugger':
                return parseDebuggerStatement(node);
            case 'do':
                return parseDoWhileStatement(node);
            case 'for':
                return parseForStatement(node);
            case 'function':
                return parseFunctionDeclaration(node);
            case 'if':
                return parseIfStatement(node);
            case 'return':
                return parseReturnStatement(node);
            case 'switch':
                return parseSwitchStatement(node);
            case 'throw':
                return parseThrowStatement(node);
            case 'try':
                return parseTryStatement(node);
            case 'var':
                return parseVariableStatement(node);
            case 'while':
                return parseWhileStatement(node);
            case 'with':
                return parseWithStatement(node);
            default:
                break;
            }
        }

        expr = parseExpression()
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            key = '$' + expr.name;
            if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
                throwError(Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[key] = true;
            labeledBody = parseStatement();
            delete state.labelSet[key];
            return node.finishLabeledStatement(expr, labeledBody);
        }

        consumeSemicolon();

        return node.finishExpressionStatement(expr);
    }

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, oldParenthesisCount,
            node = new Node();

        expect('{');

        while (index < length) {
            if (lookahead.type !== Token.StringLiteral) {
                break;
            }
            token = lookahead;

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                break;
            }
            directive = source.slice(token.start + 1, token.end - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;
        oldParenthesisCount = state.parenthesizedCount;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;
        state.parenthesizedCount = 0;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;
        state.parenthesizedCount = oldParenthesisCount;

        return node.finishBlockStatement(sourceElements);
    }

    function validateParam(options, param, name) {
        var key = '$' + name;
        if (strict) {
            if (isRestrictedWord(name)) {
                options.stricted = param;
                options.message = Messages.StrictParamName;
            }
            if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
                options.stricted = param;
                options.message = Messages.StrictParamDupe;
            }
        } else if (!options.firstRestricted) {
            if (isRestrictedWord(name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictParamName;
            } else if (isStrictModeReservedWord(name)) {
                options.firstRestricted = param;
                options.message = Messages.StrictReservedWord;
            } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
                options.firstRestricted = param;
                options.message = Messages.StrictParamDupe;
            }
        }
        options.paramSet[key] = true;
    }

    function parseParam(options) {
        var token, param, def;

        token = lookahead;
        param = parseVariableIdentifier();
        validateParam(options, token, token.value);
        if (match('=')) {
            lex();
            def = parseAssignmentExpression();
            ++options.defaultCount;
        }

        options.params.push(param);
        options.defaults.push(def);

        return !match(')');
    }

    function parseParams(firstRestricted) {
        var options;

        options = {
            params: [],
            defaultCount: 0,
            defaults: [],
            firstRestricted: firstRestricted
        };

        expect('(');

        if (!match(')')) {
            options.paramSet = {};
            while (index < length) {
                if (!parseParam(options)) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        if (options.defaultCount === 0) {
            options.defaults = [];
        }

        return {
            params: options.params,
            defaults: options.defaults,
            stricted: options.stricted,
            firstRestricted: options.firstRestricted,
            message: options.message
        };
    }

    function parseFunctionDeclaration() {
        var id, params = [], defaults = [], body, token, stricted, tmp, firstRestricted, message, previousStrict, node = new Node();

        expectKeyword('function');
        token = lookahead;
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                tolerateUnexpectedToken(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        tmp = parseParams(firstRestricted);
        params = tmp.params;
        defaults = tmp.defaults;
        stricted = tmp.stricted;
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwUnexpectedToken(firstRestricted, message);
        }
        if (strict && stricted) {
            tolerateUnexpectedToken(stricted, message);
        }
        strict = previousStrict;

        return node.finishFunctionDeclaration(id, params, defaults, body);
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, tmp,
            params = [], defaults = [], body, previousStrict, node = new Node();

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead;
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    tolerateUnexpectedToken(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        tmp = parseParams(firstRestricted);
        params = tmp.params;
        defaults = tmp.defaults;
        stricted = tmp.stricted;
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
            message = tmp.message;
        }

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwUnexpectedToken(firstRestricted, message);
        }
        if (strict && stricted) {
            tolerateUnexpectedToken(stricted, message);
        }
        strict = previousStrict;

        return node.finishFunctionExpression(id, params, defaults, body);
    }

    function parseSourceElement() {
        if (lookahead.type === Token.Keyword) {
            switch (lookahead.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(lookahead.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (lookahead.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead;
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                break;
            }
            directive = source.slice(token.start + 1, token.end - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    tolerateUnexpectedToken(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var body, node;

        skipComment();
        peek();
        node = new Node();
        strict = false;

        body = parseSourceElements();
        return node.finishProgram(body);
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (entry.regex) {
                token.regex = {
                    pattern: entry.regex.pattern,
                    flags: entry.regex.flags
                };
            }
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function tokenize(code, options) {
        var toString,
            tokens;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            lastCommentStart: -1
        };

        extra = {}
        options = options || {}
        options.tokens = true;
        extra.tokens = [];
        extra.tokenize = true
        extra.openParenToken = -1;
        extra.openCurlyToken = -1;

        extra.range = (typeof options.range === 'boolean') && options.range;
        extra.loc = (typeof options.loc === 'boolean') && options.loc;

        if (typeof options.comment === 'boolean' && options.comment) {
            extra.comments = [];
        }
        if (typeof options.tolerant === 'boolean' && options.tolerant) {
            extra.errors = [];
        }

        try {
            peek();
            if (lookahead.type === Token.EOF) {
                return extra.tokens;
            }

            lex();
            while (lookahead.type !== Token.EOF) {
                try {
                    lex();
                } catch (lexError) {
                    if (extra.errors) {
                        extra.errors.push(lexError)
                        break;
                    } else {
                        throw lexError;
                    }
                }
            }

            filterTokenLocation();
            tokens = extra.tokens;
            if (typeof extra.comments !== 'undefined') {
                tokens.comments = extra.comments;
            }
            if (typeof extra.errors !== 'undefined') {
                tokens.errors = extra.errors;
            }
        } catch (e) {
            throw e;
        } finally {
            extra = {};
        }
        return tokens;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
            allowIn: true,
            labelSet: {},
            parenthesisCount: 0,
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false,
            lastCommentStart: -1
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.attachComment = (typeof options.attachComment === 'boolean') && options.attachComment;

            if (extra.loc && options.source !== null && options.source !== undefined) {
                extra.source = toString(options.source);
            }

            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
            if (extra.attachComment) {
                extra.range = true;
                extra.comments = [];
                extra.bottomRightStack = [];
                extra.trailingComments = [];
                extra.leadingComments = [];
            }
        }

        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
        } catch (e) {
            throw e;
        } finally {
            extra = {};
        }

        return program;
    }
    exports.version = '2.0.0';

    exports.tokenize = tokenize;

    exports.parse = parse
   
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));

}).call(window);
*/}
(function() {
var source = componentsSource.toString();
source = source.substr(31, source.length - 34);
window.localStorage.setItem('__CUSTOMIZER__componentsSource', source);
})();
console.log('Injected components-concat.js');