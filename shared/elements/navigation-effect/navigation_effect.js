'use strict';

/* global DomScheduler, LazyLoader, innerWidth, innerHeight */

(function(exports) {
  // Extend from the HTMLElement prototype
  var proto = Object.create(HTMLElement.prototype);

  // Shared instance
  var _scheduler = null;

  Object.defineProperty(proto, 'scheduler', {
    get: function() { return _scheduler; },
    set: function(scheduler) {
      _scheduler = scheduler;
    }
  });

  proto.createComponent = function() {
    this.createShadowRoot().innerHTML = template;
    this.overlay = this.shadowRoot.querySelector('.overlay');
    this.setUpListeners();
  };

  proto.attachBehavior = function(scheduler) {
    if (!scheduler) {
      scheduler = new DomScheduler();
    }

    this.scheduler = scheduler;

    this.scheduler.mutation(this.createComponent.bind(this)).then(() => {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta && meta.getAttribute('content')) {
        this.overlay.style.backgroundColor = meta.getAttribute('content');
      }

      this.dispatchEvent('overlayloaded');
    });
  };

  proto.createdCallback = function() {
  };

  proto.setUpListeners = function() {
    document.addEventListener('click', evt => {
      if (evt.target.nodeName === 'A' &&
        evt.target.classList.contains('circular-effect')) {
        evt.preventDefault();

        var path =  evt.target.getAttribute('href');
        this.saveTarget(evt);
        this.prerender(path).then(() => {
          this.animateInFromTarget().then(() => {
            //Navigate to path
            console.info(path);
            window.location.href = path;
          });
        });
      }
    });
  };

  proto.dispatchEvent = function(name) {
    window.dispatchEvent(new CustomEvent(name));
  };

  proto.prerender = function(path) {
    return new Promise(function(resolve) {
      var link = document.head.querySelector('link[href="' + path + '"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'next');
        link.setAttribute('href', path);
        document.head.appendChild(link);
      }

      resolve();
    });
  };

  proto.saveTarget = function(e) {
    if (e && ('clientX' in e || e.touches)) {
        this.target = e;
    } else {
        this.target = null;
    }
  };

  proto.animateInFromTarget = function() {
    return new Promise(resolve => {
      if (!this.target) {
        resolve();
        return;
      }

      var pos = this.target.touches && this.target.touches[0] || this.target;
      var scale = Math.sqrt(innerWidth * innerHeight) / 10;
      var overlay = this.overlay;
      var duration = scale * 7;
      var end = 'transitionend';

      var translate = 'translate(' + pos.clientX + 'px, ' +
        pos.clientY + 'px)';

      this.scheduler.transition(() =>  {
         overlay.style.transform = 'translate(' + pos.clientX + 'px, ' +
          pos.clientY + 'px)';
        overlay.classList.add('circular');
        this.dispatchEvent('animationstart');

        // Reflow
        overlay.offsetTop;

        overlay.style.transitionDuration = duration + 'ms';
        overlay.style.transform += ' scale(' + scale + ')';
        overlay.classList.add('fade-in');
      }, overlay, end).then(() => {
        this.dispatchEvent('animationend');
        this.setOnPageShowListener(translate);
        resolve();
      });
    });
  };

  proto.clearStyles = function() {
    this.overlay.style.transform = '';
    this.overlay.style.transitionDuration = '';
    this.overlay.classList.remove('fade-in');
  };

  proto.setOnPageShowListener = function(translate) {
    var self = this;
    window.addEventListener('pageshow', function fn() {
      window.removeEventListener('pageshow', fn);
      self.scheduler.transition(() => {
        self.overlay.style.transform = translate + ' scale(0)';
      }, self.overlay, 'transitionend').then(() => {
        self.clearStyles();
      });
    });
  };

  var template = `
    <style>
      .overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        background: rgba(199,199,199,0.85);
        transform: scale(0);
        z-index: 1;
      }

      .open {
        opacity: 1;
        transform: scale(1);
      }

      /**
       * .circular
       */
      .overlay.circular {
        width: 40px;
        height: 40px;
        margin: -20px;
        display: block;
        border-radius: 50%;
        will-change: transform, opacity;
        transition-property: opacity, transform;
        transition-timing-function: linear;
      }

      .fade-in {
        animation: fade-in 0.2s forwards;
      }

      @keyframes fade-in {
        0%   { opacity: 0; }
        100% { opacity: 1; }
      }
    </style>

    <div class="overlay"></div>`;


  exports.NavigationEffect = document.registerElement('gaia-navigation-effect',
                                                      { prototype: proto });
})(window);

window.addEventListener('load', function fn() {
  window.removeEventListener('load', fn);
  const DEPENDENCIES = [
    '/shared/elements/navigation-effect/lib/dom-scheduler.js'
  ];

  LazyLoader.load(DEPENDENCIES, function() {
    var gaiaNavigationEffect = document.querySelector('gaia-navigation-effect');
    gaiaNavigationEffect.attachBehavior(window.scheduler);
  });
});