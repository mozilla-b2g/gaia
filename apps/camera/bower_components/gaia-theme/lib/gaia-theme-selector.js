(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Extend from the `HTMLElement` prototype
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function() {
  this.createShadowRoot().innerHTML = template;

  this.els = {
    themes: this.shadowRoot.querySelector('.themes'),
    rtl: this.shadowRoot.querySelector('.toggle-rtl')
  };

  this.els.rtl.addEventListener('click', this.onRtlClick.bind(this));
  this.els.themes.addEventListener('click', this.onThemeClick.bind(this));
  this.styleHack();
  this.set(localStorage.theme || 'settings');
};

proto.styleHack = function() {
  var style = this.shadowRoot.querySelector('style');
  style.setAttribute('scoped', '');
  this.appendChild(style.cloneNode(true));
};

proto.onThemeClick = function(e) {
  var theme = e.target.value;
  if (theme) { this.set(theme); }
};

proto.onRtlClick = function() {
  document.dir = this.els.rtl.checked ? 'rtl' : 'ltr';
};

proto.set = function(theme) {
  var radio = this.shadowRoot.querySelector('[value="' + theme + '"]');
  document.body.classList.remove('theme-' + this.theme);
  document.body.classList.add('theme-' + theme);
  radio.checked = true;
  this.theme = theme;
  localStorage.theme = theme;
};

var template = `
<style>

* { margin: 0; padding: 0; }

gaia-theme-selector {
  position: fixed;
  top: 0; left: 0;
  z-index: 101;
  width: 100%;
  height: 30px;
  background: rgba(255,255,255,0.8);
  color: #000;
  font-size: 9px;
  text-align: center;
  box-shadow: 0 1px 1px rgba(0,0,0,0.1);
  direction: ltr;
}

form {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}

form label {
  -moz-margin-start: 9px;
}

form input {
  -moz-margin-end: 6px;
  vertical-align: middle;
}

.rtl {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;

  display: flex;
  align-items: center;
}

</style>

<form>
  <label class="rtl"><input type="checkbox" class="toggle-rtl" />RTL</label>
  <span class="themes">
    <label><input type="radio" name="theme" value="productivity"/>Prod</label>
    <label><input type="radio" name="theme" value="communications"/>Comms</label>
    <label><input type="radio" name="theme" value="media"/>Media</label>
    <label><input type="radio" name="theme" value="settings"/>Settings</label>
  </span>
</form>`;

document.registerElement('gaia-theme-selector', { prototype: proto });

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('gaia-theme-selector',this));