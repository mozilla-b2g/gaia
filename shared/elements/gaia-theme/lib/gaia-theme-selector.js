(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Extend from the `HTMLElement` prototype
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

proto.createdCallback = function() {
  var tmpl = template.content.cloneNode(true);
  var shadow = this.createShadowRoot();
  shadow.addEventListener('click', this.onClick.bind(this));
  shadow.appendChild(tmpl);
  this.styleHack();
  this.set('settings');
};

proto.styleHack = function() {
  var style = this.shadowRoot.querySelector('style');
  style.setAttribute('scoped', '');
  this.appendChild(style.cloneNode(true));
};

proto.onClick = function(e) {
  var theme = e.target.value;
  if (theme) { this.set(theme); }
};

proto.set = function(theme) {
  var radio = this.shadowRoot.querySelector('[value="' + theme + '"]');
  document.body.classList.remove('theme-' + this.theme);
  document.body.classList.add('theme-' + theme);
  radio.checked = true;
  this.theme = theme;
};

var template = document.createElement('template');
template.innerHTML = `
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
}

form {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
}

form label {
  margin-left: 9px;
}

form input {
  margin-right: 6px;
  vertical-align: middle;
}

</style>

<form>
   <label><input type="radio" name="theme" value="productivity"/>Prod</label>
  <label><input type="radio" name="theme" value="communications"/>Comms</label>
  <label><input type="radio" name="theme" value="media"/>Media</label>
  <label><input type="radio" name="theme" value="settings"/>Settings</label>
</form>`;

document.registerElement('gaia-theme-selector', { prototype: proto });

});})((function(n,w){'use strict';return typeof define=='function'&&define.amd?
define:typeof module=='object'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}},r=function(n){return w[n];};
w[n]=c(r,m.exports,m)||m.exports;};})('gaia-theme-selector',this));