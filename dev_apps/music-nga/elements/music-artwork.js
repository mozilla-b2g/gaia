(function(window) {
'use strict';

const HIDE_OVERLAY_TIMEOUT = 5000;

var proto = Object.create(HTMLElement.prototype);

var template =
`<style scoped>
  #container {
    background-color: #000;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    -moz-user-select: none;
  }
  #container > img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s linear, visibility 0s linear 0.2s;
  }
  #container > img.active {
    opacity: 1;
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #container button {
    background: none;
    border: none;
    border-radius: 0;
    color: #fff;
    flex: 0 0 auto;
    margin: 0 1rem;
    width: 6rem;
    transition: background 0.2s ease;
  }
  #container button:hover {
    background: transparent;
  }
  #container button:active {
    background: #00caf2;
    transition-duration: 0s;
  }
  #container button:disabled {
    opacity: 0.3;
  }
  #container button:disabled:active {
    background: transparent;
  }
  #caption,
  #controls {
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-flow: row nowrap;
    position: absolute;
    left: 0;
    width: 100%;
    height: 5rem;
    visibility: hidden;
    transition: transform 0.5s ease-in-out, visibility 0s linear 0.5s;
  }
  #caption {
    top: 0;
    transform: translateY(-5rem);
  }
  #controls {
    bottom: 0;
    transform: translateY(5rem);
  }
  .show-overlay > #caption,
  .show-overlay > #controls {
    transform: translateY(0);
    visibility: visible;
    transition-delay: 0s, 0s;
  }
  #caption-text {
    position: relative;
    flex: 0 0 auto;
    width: calc(100% - 8rem);
  }
  #artist,
  #album {
    color: #fff;
    font-weight: normal;
    text-shadow: 0.1rem 0.1rem #000;
    text-indent: 3rem;
    position: relative;
    margin: 0;
    width: 100%;
    height: 2.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  #artist {
    font-size: 1.9rem;
    line-height: 3rem;
  }
  #album {
    font-size: 1.7rem;
    line-height: 2.5rem;
  }
</style>
<div id="container">
  <img class="active">
  <img>
  <div id="caption">
    <div id="caption-text">
      <h1 id="artist"></h1>
      <h2 id="album"></h2>
    </div>
    <button type="button" data-action="share" data-icon="share"></button>
  </div>
  <div id="controls">
    <button type="button" data-action="repeat" data-icon="repeat"></button>
    <button type="button" data-action="shuffle" data-icon="shuffle"></button>
  </div>
</div>`;

proto.createdCallback = function() {
  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  getIcons().then(icons => shadowRoot.querySelector('style').innerHTML += icons);

  var $ = shadowRoot.querySelector.bind(shadowRoot);

  this.els = {
    container: $('#container'),
    caption:   $('#caption'),
    controls:  $('#controls'),
    artist:    $('#artist'),
    album:     $('#album'),
    share:     $('[data-action="share"]'),
    repeat:    $('[data-action="repeat"]'),
    shuffle:   $('[data-action="shuffle"]')
  };

  this.els.container.addEventListener('click', (evt) => {
    var button = evt.target.closest('button');
    if (!button) {
      this.overlayVisible = !this.overlayVisible;
      return;
    }

    this.overlayVisible = true;
    this.dispatchEvent(new CustomEvent(button.dataset.action));
  });

  this.overlayVisible = true;
};

proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'artist':
      this.els.artist.textContent = newVal;
      break;
    case 'album':
      this.els.album.textContent = newVal;
      break;
    case 'src':
      (() => {
        var newActiveImage = this.els.container.querySelector('img:not(.active)');
        var oldActiveImage = this.els.container.querySelector('img.active');

        newActiveImage.src = newVal;
        newActiveImage.classList.add('active');
        oldActiveImage.classList.remove('active');
      })();
      break;
  }
};

['artist', 'album', 'src'].forEach(function(prop) {
  Object.defineProperty(proto, prop, {
    get: function() {
      return this.getAttribute(prop);
    },

    set: function(value) {
      this.setAttribute(prop, value || '');
    }
  });
});

Object.defineProperty(proto, 'overlayVisible', {
  get: function() {
    return this.els.container.classList.contains('show-overlay');
  },

  set: function(value) {
    var overlayVisible = !!value;

    clearTimeout(this._hideOverlayTimeout);

    if (overlayVisible) {
      this.els.container.classList.add('show-overlay');
      this._hideOverlayTimeout = setTimeout(() => {
        this.overlayVisible = false;
      }, HIDE_OVERLAY_TIMEOUT);
    }

    else {
      this.els.container.classList.remove('show-overlay');
    }
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
  window.MusicControls = document.registerElement('music-artwork', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
