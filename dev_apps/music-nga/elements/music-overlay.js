(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var template =
`<style>
  #heading:empty,
  #message:empty,
  #menu:empty,
  [hidden] {
    display: none;
  }
  #container {
    background-color: #2d2d2d;
    display: flex;
    flex-flow: column nowrap;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    overflow: hidden;
    -moz-user-select: none;
  }
  #content {
    box-sizing: border-box;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    flex: 1 0 auto;
    padding: 1rem 1.5rem;
    width: 100%;
    max-height: 100%;
    overflow-y: auto;
    vertical-align: middle;
    word-wrap: break-word;
  }
  #heading {
    color: #fff;
    font-size: 1.6rem;
    line-height: 1.6rem;
    margin: 0;
    padding: 0;
  }
  #message {
    border-top: 0.1rem solid #686868;
    color: #fafafa;
    font-size: 2.2rem;
    font-weight: 300;
    line-height: 3rem;
    margin: 1rem 0 0;
    padding: 1rem 0 0;
  }
  #heading:empty + #message {
    border: none;
    padding: 0;
  }
  #menu {
    box-sizing: border-box;
    display: flex;
    flex-flow: row nowrap;
    flex: 0 0 auto;
    margin: 0;
    padding: 1.5rem;
    width: 100%;
  }
  #menu > button {
    background-color: #d8d8d8;
    border: none;
    border-radius: 2rem;
    color: #333;
    outline: none;
    font-family: sans-serif;
    font-size: 1.6rem;
    font-style: italic;
    line-height: 4rem;
    box-sizing: border-box;
    flex: 1 1 auto;
    padding: 0 0.2rem;
    height: 4rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: background-color 200ms 280ms, color 200ms 280ms;
  }
  #menu > button:active {
    background-color: #00aacc;
    color: #fff;
    transition: none;
  }
  #menu > button.primary {
    background-color: #00caf2;
    color: #fff;
  }
  #menu > button.danger {
    background-color: #e51e1e;
    color: #fff;
  }
  #menu > button.primary:active {
    background-color: #006579;
    color: #c8c8c8;
  }
  #menu > button.danger:active {
    background-color: #730f0f;
    color: #c8c8c8;
  }
  #menu > button[disabled] {
    background-color: #565656;
    color: rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
  #menu > button.primary[disabled] {
    background-color: #006579;
  }
  #menu > button.danger[disabled] {
    background-color: #730f0f;
  }
  #menu > button + button {
    margin-left: 1rem;
  }
</style>
<form id="container" role="dialog">
  <section id="content">
    <h1 id="heading"></h1>
    <p id="message"></p>
  </section>
  <menu id="menu"></menu>
</form>`;

proto.createdCallback = function() {
  var buttons = document.createDocumentFragment();
  [].forEach.call(this.querySelectorAll('button'), button => buttons.appendChild(button));

  var shadowRoot = this.createShadowRoot();
  shadowRoot.innerHTML = template;

  var $id = shadowRoot.getElementById.bind(shadowRoot);

  this.els = {
    container: $id('container'),
    content:   $id('content'),
    heading:   $id('heading'),
    message:   $id('message'),
    menu:      $id('menu')
  };

  this.els.menu.appendChild(buttons);

  this.els.menu.addEventListener('click', (evt) => {
    var button = evt.target.closest('button[data-action]');
    if (button) {
      this.dispatchEvent(new CustomEvent('action', { detail: button.dataset.action }));
    }
  });

  this.els.heading.textContent = this.getAttribute('heading');
  this.els.message.textContent = this.getAttribute('message');
};

proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'heading':
      this.els.heading.textContent = newVal;
      break;
    case 'message':
      this.els.message.textContent = newVal;
      break;
  }
};

proto.addActionButton = function(title, action, className = '') {
  var button = document.createElement('button');
  button.type = 'button';
  button.textContent = title;
  button.dataset.action = action;
  button.className = className;

  this.els.menu.appendChild(button);
};

proto.removeActionButton = function(action) {
  var buttons = this.els.menu.querySelectorAll('button[data-action="' + action + '"]');

  [].forEach.call(buttons, button => this.els.menu.removeChild(button));
};

['heading', 'message'].forEach(function(prop) {
  Object.defineProperty(proto, prop, {
    get: function() {
      return this.getAttribute(prop);
    },

    set: function(value) {
      this.setAttribute(prop, value || '');
    }
  });
});

try {
  window.MusicOverlay = document.registerElement('music-overlay', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
