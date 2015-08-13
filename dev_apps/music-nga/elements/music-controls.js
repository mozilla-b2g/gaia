(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var template =
`<style scoped>
  #container {
    background-color: #000;
    border-top: 0.1rem solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-flow: row nowrap;
    position: relative;
    width: 100%;
    height: 4.8rem;
    -moz-user-select: none;
  }
  #container > button {
    background: transparent;
    border: none;
    border-radius: 0;
    color: #fff;
    flex: 1 0 auto;
    position: relative;
    padding: 0;
    height: 100%;
    transition: background 0.2s ease;
  }
  #container > button:hover {
    background: transparent;
  }
  #container > button:active {
    background: #00caf2;
    transition-duration: 0s;
  }
  #container > button:disabled {
    opacity: 0.3;
  }
  #container > button:disabled:active {
    background: transparent;
  }
</style>
<div id="container">
  <button type="button" id="previous" data-icon="skip-back"></button>
  <button type="button" id="toggle" data-icon="play"></button>
  <button type="button" id="next" data-icon="skip-forward"></button>
</div>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  getIcons().then(icons => shadowRoot.querySelector('style').innerHTML += icons);

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container: $id('container'),
    previous:  $id('previous'),
    toggle:    $id('toggle'),
    next:      $id('next')
  };

  this.els.container.addEventListener('click', (evt) => {
    var button = evt.target.closest('button');
    switch (button.id) {
      case 'previous':
      case 'next':
        this.dispatchEvent(new CustomEvent(button.id));
        break;
      case 'toggle':
        this.paused = !this.paused;
        this.dispatchEvent(new CustomEvent(this.paused ? 'pause' : 'play'));
        break;
    }
  });
};

Object.defineProperty(proto, 'paused', {
  get: function() {
    return this.els.toggle.dataset.icon !== 'pause';
  },

  set: function(value) {
    var paused = !!value;
    if (paused === this.paused) {
      return;
    }

    this.els.toggle.dataset.icon = paused ? 'play' : 'pause';
  }
});

function getIcons() {
  return new Promise((resolve, reject) => {
    var iconsLink = document.querySelector('link[href$="gaia-icons-embedded.css"]');
    var iconsHref = iconsLink && iconsLink.href;
    if (!iconsHref) {
      reject();
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', iconsHref, true);
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject();
    xhr.send();
  });
}

try {
  window.MusicControls = document.registerElement('music-controls', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
