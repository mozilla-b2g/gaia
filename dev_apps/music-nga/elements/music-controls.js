(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var isTouch = 'ontouchstart' in window;

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
  <button type="button" id="previous"
      data-icon="skip-back"
      data-l10n-id="playbackPrevious">
  </button>
  <button type="button" id="toggle"
      data-icon="play"
      data-l10n-id="playbackPlay">
  </button>
  <button type="button" id="next"
      data-icon="skip-forward"
      data-l10n-id="playbackNext">
  </button>
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

  var seeking = false;

  this.els.container.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();

    if (seeking) {
      return;
    }

    var button = evt.target.closest('button');
    if (button.id === 'previous' || button.id === 'next') {
      seeking = true;

      this.dispatchEvent(new CustomEvent('startseek', {
        detail: { reverse: button.id === 'previous' }
      }));
    }
  });

  this.els.container.addEventListener(isTouch ? 'touchend' : 'mouseup', (evt) => {
    if (seeking) {
      evt.preventDefault();

      this.dispatchEvent(new CustomEvent('stopseek'));
      seeking = false;
    }
  });

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

  this.onDOMLocalized = () => {
    // XXX: Bug 1205799 - view.formatValue errors when called before first
    // language is resolved
    document.l10n.ready.then(() => {
      document.l10n.translateFragment(shadowRoot);
    });
  };
};

proto.attachedCallback = function() {
  document.addEventListener('DOMLocalized', this.onDOMLocalized);
};

proto.detachedCallback = function() {
  document.removeEventListener('DOMLocalized', this.onDOMLocalized);
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

    this.els.toggle.dataset.icon   = paused ? 'play' : 'pause';
    this.els.toggle.dataset.l10nId = paused ? 'playbackPlay' : 'playbackPause';

    this.onDOMLocalized();
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
