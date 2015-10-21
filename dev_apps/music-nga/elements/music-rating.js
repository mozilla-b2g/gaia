(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var template =
`<style scoped>
  #container {
    display: flex;
    flex-flow: row nowrap;
    width: 100%;
    height: 100%;
  }
  #container > button {
    background-color: transparent;
    background-image: url(/img/ui/music-rating-off.png);
    background-position: center center;
    background-repeat: no-repeat;
    background-size: 2.2rem auto;
    border: none;
    flex: 1 0 auto;
    width: 2.2rem;
    height: 100%;
  }
  #container[data-value="1"] > :-moz-any([value="1"]),
  #container[data-value="2"] > :-moz-any([value="1"],[value="2"]),
  #container[data-value="3"] > :-moz-any([value="1"],[value="2"],[value="3"]),
  #container[data-value="4"] > :-moz-any([value="1"],[value="2"],[value="3"],[value="4"]),
  #container[data-value="5"] > * {
    background-image: url(/img/ui/music-rating-on.png);
  }
</style>
<div id="container">
  <button type="button" value="1"></button>
  <button type="button" value="2"></button>
  <button type="button" value="3"></button>
  <button type="button" value="4"></button>
  <button type="button" value="5"></button>
</div>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container: $id('container')
  };

  this.els.container.addEventListener('click', (evt) => {
    var button = evt.target.closest('button');
    if (!button) {
      return;
    }

    var value = parseInt(button.value, 10) || 0;
    if (value === this.value) {
      value--;
    }

    this.value = value;
    this.dispatchEvent(new CustomEvent('change'));
  });
};

proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'value':
      this.els.container.dataset.value = newVal;
      break;
  }
};

Object.defineProperty(proto, 'value', {
  get: function() {
    return parseInt(this.getAttribute('value'), 10) || 0;
  },

  set: function(value) {
    this.setAttribute('value', clamp(0, 5, parseInt(value, 10) || 0));
  }
});

function clamp(min, max, value) {
  return Math.min(Math.max(min, value), max);
}

try {
  window.MusicRating = document.registerElement('music-rating', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
