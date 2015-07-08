;(function(define){'use strict';define((require,exports,module) => {

/**
 * Dependencies
 */
var component = require('gaia-component');

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : () => {};

/**
 * Use the dom-scheduler if it's around,
 * else fallback to fake shim.
 *
 * @type {Object}
 */
var schedule = window.scheduler || {
  mutation: block => Promise.resolve(block()),
  transition(block, el, event, timeout) {
    block();
    return after(el, event, timeout || 500);
  }
};

/**
 * Exports
 */

module.exports = component.register('gaia-dialog', {
  created() {
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.dialog-inner'),
      background: this.shadowRoot.querySelector('.background'),
      window: this.shadowRoot.querySelector('.window')
    };

    this.shadowRoot.addEventListener('click', e => this.onClick(e));
  },

  onClick(e) {
    var el = e.target.closest('[on-click]');
    if (!el) { return; }
    debug('onClick');
    var method = el.getAttribute('on-click');
    if (typeof this[method] == 'function') { this[method](); }
  },

  open(options) {
    if (this.isOpen) { return; }
    debug('open dialog');
    this.isOpen = true;

    this.show()
      .then(() => this.animateBackgroundIn(options))
      .then(() => this.animateWindowIn());
  },

  close(options) {
    if (!this.isOpen) { return; }
    debug('close dialog');
    this.isOpen = false;

    this.animateWindowOut()
      .then(() => this.animateBackgroundOut())
      .then(() => this.hide());
  },

  animateBackgroundIn(options) {
    if (options) { return this.animateBackgroundInFrom(options); }

    var el = this.els.background;
    return schedule.transition(() => {
      debug('animate background in');
      el.classList.remove('animate-out');
      el.classList.add('animate-in');
    }, el, 'animationend');
  },

  animateBackgroundOut() {
    var el = this.els.background;
    return schedule.transition(() => {
      debug('animate background out');
      el.classList.add('animate-out');
      el.classList.remove('animate-in');
    }, el, 'animationend')
      .then(() => el.style = '');
  },

  animateBackgroundInFrom(pos) {
    var el = this.els.background;
    var scale = Math.sqrt(window.innerWidth * window.innerHeight) / 15;
    var duration = scale * 9;

    return schedule.mutation(() => {
        el.classList.add('circular');
        el.classList.remove('animate-out');
        el.style.transform = `translate(${pos.clientX}px, ${pos.clientY}px)`;
        el.style.transitionDuration = duration + 'ms';
        el.offsetTop; // Hack, any ideas?
      })

      .then(() => {
        return schedule.transition(() => {
          debug('animate background in from', pos);
          el.style.transform += ` scale(${scale})`;
          el.style.opacity = 1;
        }, el, 'transitionend', duration * 1.5);
      });
  },

  show() {
    return schedule.mutation(() => {
      debug('show');
      this.style.display = 'block';
    });
  },

  hide() {
    return schedule.mutation(() => {
      debug('hide');
      this.style.display = 'none';
    });
  },

  animateWindowIn() {
    var el = this.els.window;
    return schedule.transition(() => {
      debug('animate window in');
      el.classList.add('animate-in');
    }, el, 'animationend');
  },

  animateWindowOut() {
    var el = this.els.window;

    return schedule.transition(() => {
      debug('animate window out');
      el.classList.remove('animate-out', 'animate-in');
    }, el, 'animationend');
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

    /** Inner
     ---------------------------------------------------------*/

    .dialog-inner {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
    }

    /** Background
     ---------------------------------------------------------*/

    .background {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      background: rgba(199,199,199,0.85);
    }

    /**
     * .circular
     */

    .background.circular {
      width: 40px;
      height: 40px;
      margin: -20px;
      border-radius: 50%;
      will-change: transform, opacity;
      transition-property: opacity, transform;
      transition-timing-function: linear;
    }

    /**
     * .animate-in
     */

    .background.animate-in {
      animation-name: gaia-dialog-fade-in;
      animation-duration: 260ms;
      animation-fill-mode: forwards;
    }

    /**
     * .animate-out
     */

    .background.animate-out {
      animation-name: gaia-dialog-fade-out;
      animation-duration: 260ms;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    /** Window
     ---------------------------------------------------------*/

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
      animation-name: gaia-dialog-entrance;
      animation-duration: 300ms;
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.320, 1.275);
      animation-fill-mode: forwards;
      opacity: 1;
    }

    .window.animate-out {
      animation-name: gaia-dialog-fade-out;
      animation-duration: 150ms;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
      opacity: 1;
    }

    /** Title
     ---------------------------------------------------------*/

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

    /** Section
     ---------------------------------------------------------*/

    ::content section {
      padding: 33px 18px;
      color: #858585;
    }

    ::content section > *:not(:last-child) {
      margin-bottom: 13px;
    }

    /** Paragraphs
     ---------------------------------------------------------*/

    ::content p {
      text-align: -moz-start;
    }

    /** Buttons
     ---------------------------------------------------------*/

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

    /**
     * .primary
     */

    ::content button.primary {
      color: var(--highlight-color);
    }

    /**
     * .danger
     */

    ::content button.danger {
      color: var(--color-destructive);
    }

    /**
     * Disabled buttons
     */

    ::content button[disabled] {
      color: var(--color-zeta);
    }

    /** Button Divider Line
     ---------------------------------------------------------*/

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

    /** Fieldset (button group)
     ---------------------------------------------------------*/

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
    @keyframes gaia-dialog-entrance {
      0% { transform: translateY(100px); }
      100% { transform: translateY(0px); }
    }

    @keyframes gaia-dialog-fade-in {
      0% { opacity: 0 }
      100% { opacity: 1 }
    }

    @keyframes gaia-dialog-fade-out {
      0% { opacity: 1 }
      100% { opacity: 0 }
    }`
});

/**
 * Utils
 */

function after(target, event, timeout) {
  return new Promise(resolve => {
    var timer = timeout && setTimeout(cb, timeout);
    target.addEventListener(event, cb);
    function cb() {
      target.removeEventListener(event, cb);
      clearTimeout(timer);
      resolve();
    }
  });
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-dialog',this));
