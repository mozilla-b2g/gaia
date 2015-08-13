(function(window) {
'use strict';

var proto = Object.create(HTMLElement.prototype);

var template =
`<style scoped>
  .music-view-stack-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    -moz-user-select: none;
  }
  .music-view-stack-container > iframe {
    border: none;
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .music-view-stack-container > iframe.active,
  .music-view-stack-container > iframe.push,
  .music-view-stack-container > iframe.pop {
    display: block;
  }
  .music-view-stack-container > iframe.push,
  .music-view-stack-container > iframe.pop {
    transition: transform 0.2s linear;
  }
  .music-view-stack-container > iframe.push.in {
    transform: translate(100%, 0);
  }
  .music-view-stack-container > iframe.push.in.transition {
    transform: translate(0, 0);
  }
  .music-view-stack-container > iframe.push.out {
    transform: translate(0, 0);
  }
  .music-view-stack-container > iframe.push.out.transition {
    transform: translate(-100%, 0);
  }
  .music-view-stack-container > iframe.pop.in {
    transform: translate(-100%, 0);
  }
  .music-view-stack-container > iframe.pop.in.transition {
    transform: translate(0, 0);
  }
  .music-view-stack-container > iframe.pop.out {
    transform: translate(0, 0);
  }
  .music-view-stack-container > iframe.pop.out.transition {
    transform: translate(100%, 0);
  }
  .music-view-stack-container > iframe.fade {
    transition: opacity 0.2s linear;
  }
  .music-view-stack-container > iframe.fade.in {
    opacity: 0;
  }
  .music-view-stack-container > iframe.fade.in.transition {
    opacity: 1;
  }
  .music-view-stack-container > iframe.fade.out {
    opacity: 1;
  }
  .music-view-stack-container > iframe.fade.out.transition {
    opacity: 0;
  }
</style>
<div class="music-view-stack-container">
</div>`;

proto.createdCallback = function() {
  this.innerHTML = template;

  this.container = this.querySelector('.music-view-stack-container');
  this.container.addEventListener('transitionend', (evt) => {
    var classList = evt.target.classList;
    if (classList.contains('pop') &&
        classList.contains('out')) {
      evt.target.contentWindow.dispatchEvent(new CustomEvent('viewdestroy'));
      this.container.removeChild(evt.target);
    }

    classList.remove('fade');
    classList.remove('push');
    classList.remove('pop');
    classList.remove('in');
    classList.remove('out');
    classList.remove('transition');
  });

  this.states = [];
  this.activeState = null;
};

proto.setRootView = function(view, params) {
  var state = {
    view: view,
    params: params || {}
  };

  this.states.forEach((state) => {
    state.view.contentWindow.dispatchEvent(new CustomEvent('viewdestroy'));
  });

  if (this.activeState && this.activeState.view) {
    this.activeState.view.classList.remove('active');
    this.activeState.view.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));
  }

  this.states = [state];

  this.activeState = state;

  view.classList.add('active');
  view.classList.add('fade');
  view.classList.add('in');

  this.container.innerHTML = '';
  this.container.appendChild(view);

  window.requestAnimationFrame(() => {
    view.classList.add('transition');
  });

  this.dispatchEvent(new CustomEvent('root', { detail: state }));
  this.dispatchEvent(new CustomEvent('change', { detail: state }));
};

proto.pushView = function(view, params) {
  window.requestAnimationFrame(() => {
    var state = {
      view: view,
      params: params || {}
    };

    this.states.push(state);

    this.container.appendChild(view);

    var oldActiveView = this.activeState && this.activeState.view;
    if (oldActiveView) {
      oldActiveView.classList.remove('active');
      oldActiveView.classList.add('push');
      oldActiveView.classList.add('out');
      oldActiveView.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));
    }

    this.activeState = state;

    view.classList.add('active');
    view.classList.add('push');
    view.classList.add('in');
    view.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));

    window.requestAnimationFrame(() => {
      if (oldActiveView) {
        oldActiveView.classList.add('transition');
      }

      view.classList.add('transition');
    });

    this.dispatchEvent(new CustomEvent('push', { detail: state }));
    this.dispatchEvent(new CustomEvent('change', { detail: state }));
  });
};

proto.popView = function() {
  if (this.states.length < 2) {
    return;
  }

  window.requestAnimationFrame(() => {
    this.states.pop();

    var oldActiveView = this.activeState && this.activeState.view;
    oldActiveView.classList.remove('active');
    oldActiveView.classList.add('pop');
    oldActiveView.classList.add('out');
    oldActiveView.contentWindow.dispatchEvent(new CustomEvent('viewhidden'));

    this.activeState = this.states[this.states.length - 1];

    var activeView = this.activeState && this.activeState.view;
    if (activeView) {
      activeView.classList.add('active');
      activeView.classList.add('pop');
      activeView.classList.add('in');
      activeView.contentWindow.dispatchEvent(new CustomEvent('viewvisible'));
    }

    window.requestAnimationFrame(() => {
      oldActiveView.classList.add('transition');

      if (activeView) {
        activeView.classList.add('transition');
      }
    });

    this.dispatchEvent(new CustomEvent('pop', { detail: this.activeState }));
    this.dispatchEvent(new CustomEvent('change', { detail: this.activeState }));
  });
};

try {
  window.MusicViewStack = document.registerElement('music-view-stack', { prototype: proto });
} catch (e) {
  if (e.name !== 'NotSupportedError') {
    throw e;
  }
}

})(window);
