;(function(define){define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');

/**
 * Simple debug logger
 *
 * @return {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};

var forEach = [].forEach;

/**
 * Exports
 */

module.exports = component.register('gaia-pages', {
  created: function() {
    this.reset();
    this.setupRoutes();
    this.noTransitions = this.hasAttribute('no-transitions');
    this.addEventListener('animationend', e => this.transitionEnded(e));
    debug('created');
  },

  setupRoutes: function() {
    this.selector = this.getAttribute('selector') || '[data-route]';
    this.pages = [].slice.call(this.querySelectorAll(this.selector));
    this.routes = this.pages.map(page => this.createRoute(page));
    this.routes.sort((a, b) =>  b.specificity - a.specificity);
    debug('routes setup', this.routes);
  },

  createRoute: function(page, index) {
    debug('create route', page, index);
    var pattern = page.dataset.route;
    var media = page.getAttribute('route-media');
    var route = new Route(pattern);

    // Bolt on some additional bits
    route.matchMedia = media ? window.matchMedia(media) : { matches: true };
    route.fallback = page.getAttribute('route-fallback');
    route.page = page;

    page.route = route;
    page.order = index;

    return route;
  },

  pushState: function(path) {

    // Chop off any trailing history
    // and start a new branch
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(path);

    // Reset the history index
    // to the last pushed state
    this.historyIndex = this.history.length - 1;
  },

  getState: function() {
    return this.history[this.historyIndex];
  },

  back: function(options) {
    if (!this.historyIndex) { return; }
    options = options || {};
    options.pushState = false;
    this.historyIndex--;
    this.navigate(this.getState(), options);
  },

  forward: function() {
    var last = this.historyIndex === this.history.length - 1;
    if (last) { return; }
    this.historyIndex++;
    this.navigate(this.getState(), { pushState: false });
  },

  navigate: function(path, options) {
    debug('navigate', path);
    path = this.resolvePath(path);

    // Exit if the patch didn't change
    if (path === this.path) { return; }

    var pushState = !options || options.pushState !== false;
    var dir = options && options.dir;
    var result;
    var route;

    for (var i = 0, l = this.routes.length; i < l; i++) {
      route = this.routes[i];
      result = route.match(path);
      debug('checked route', route.pattern, result);

      // If the route matches and it's not the
      // current route, exit. Else keep on
      // searching for new matches.
      if (result && route.page !== this.current) {
        break;
      }
    }

    // Check that the current match
    // media state is valid
    if (!route.matchMedia.matches) {
      this.navigate(route.fallback);
      return;
    }

    // Update url information
    this.params = result;
    this.path = path;

    if (result) this.showPage(route.page, dir);
    if (pushState) { this.pushState(path); }

    this.deselectLinks();
    this.selectLinks();

    this.dispatchEvent(new Event('changed'));
  },

  reset: function() {
    this.history = [];
    this.path = null;
    this.params = null;
  },

  resolvePath: function(path) {
    if (path[0] === '/') return path;
    return (this.getState() + '/' + path).replace(/\/\/+/g, '/');
  },

  showPage: function(next, direction) {
    debug('on matched', next);
    var prev = this.current;
    var transitions = !this.noTransitions;
    var dir = {};

    // Work out animation directions
    dir.next = direction || this.getDirection(next, prev);
    dir.prev = dir.next === 'forward' ? 'back' : 'forward';

    // Update current page reference
    this.current = next;

    // No animations on the first navigation
    if (!this.history.length) {
      this.animationsOff();
      setTimeout(() => this.animationsOn());
    }

    // Unmatch prev page
    if (prev) {
      if (transitions) { prev.classList.add('leave-' + dir.prev); }
      prev.classList.remove('matched');
      prev.setAttribute('aria-hidden', 'true');
      prev.dispatchEvent(new Event('unmatched'));
    }

    // Match next page
    if (transitions) { next.classList.add('enter-' + dir.next); }
    next.classList.add('matched');
    next.removeAttribute('aria-hidden');
    next.dispatchEvent(new Event('matched'));
  },

  transitionEnded: function(e) {
    debug('transition ended');
    e.target.classList.remove(
       'enter-forward',
       'enter-back',
       'leave-forward',
       'leave-back');
  },

  getDirection: function(nextPage, prevPage) {
    var nextOrder = Number(nextPage.dataset.order || this.pages.indexOf(nextPage));
    var prevOrder = prevPage
      ? Number(prevPage.dataset.order || this.pages.indexOf(prevPage))
      : -1;

    return nextOrder > prevOrder ? 'forward' : 'back';
  },

  animationsOn: function() {
    this.classList.remove('no-animations');
  },

  animationsOff: function() {
    this.classList.add('no-animations');
  },

  deselectLinks: function() {
    forEach.call(this.links || [], el => el.classList.remove('selected'));
    this.links = null;
  },

  selectLinks: function() {
    var url = this.getState();
    this.links = document.querySelectorAll('a[href="#' + url + '"]');
    forEach.call(this.links, el => el.classList.add('selected'));
  },

  template: `
    <content></content>

    <style>

      :host {
        position: relative;
        width: 100%;
        height: 100%;

        display: block;
        overflow: hidden;
      }

      ::content [data-route] {
        position: absolute;
        left: 0;
        top: 0;

        display: block;
        width: 100%;
        height: 100%;
        overflow: auto;

        animation-duration: 400ms;
        animation-fill-mode: forwards;
        animation-timing-function: ease-out;
        pointer-events: none;
        opacity: 0;
      }

      :host(.no-animations) [data-route] {
        animation-duration: 0s !important;
      }

      ::content [data-route].matched,
      ::content .enter-forward,
      ::content .leave-forward,
      ::content .enter-back,
      ::content .leave-back {
        opacity: 1;
      }

      ::content [data-route].matched {
        pointer-events: auto;
      }

      ::content .enter-back {
        animation-name: page-enter-left;
      }

      ::content .leave-forward {
        animation-name: page-enter-right;
        animation-timing-function: ease-in;
        animation-direction: reverse;
      }

      ::content .leave-back {
        animation-name: page-enter-left;
        animation-timing-function: ease-in;
        animation-direction: reverse;
      }

      /**
       * .enter-forward
       */

      ::content .enter-forward {
        animation-name: page-enter-right;
      }

      /**
       * [dir=rtl] .enter-forward
       */

      :host-context([dir=rtl]) ::content .enter-forward {
        animation-name: page-enter-left !important;
      }

      :host-context([dir=rtl]) ::content .enter-back {
        animation-name: page-enter-right !important;
      }

      :host-context([dir=rtl]) ::content .leave-forward {
        animation-name: page-enter-left !important;
        animation-timing-function: ease-in;
        animation-direction: reverse;
      }

      :host-context([dir=rtl]) ::content .leave-back {
        animation-name: page-enter-right !important;
        animation-timing-function: ease-in;
        animation-direction: reverse;
      }
    </style>
  `,

  globalCss: `
    @keyframes page-enter-right {
      0% { transform: translateX(100%); }
      100% { transform: translateX(0%); }
    }

    @keyframes page-enter-left {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(0%); }
    }
  `
});

/**
 * Initialize a `Route` from a
 * route pattern string
 *
 * @param {String} pattern
 */
function Route(pattern) {
  debug('create route', pattern);
  var self = this;
  this.keys = [];
  this.pattern = pattern;
  this.specificity = (pattern.match(/(?:\/)[\:\w]+/g) || []).length;
  this.regex = new RegExp(pattern.replace(this.paramRegex, (match) => {
    self.keys.push(match.substr(1));
    return '([^\/\\s]+)';
  }));
}

/**
 * Picks our dynamic params from
 * route pattern string.
 *
 * Example
 *
 *   'some/routes/have/:dynamic/parts'
 *
 * @type {RegExp}
 */
Route.prototype.paramRegex = /(\:[^\/\s]+)/g;

/**
 * Match this route pattern
 * regex against a given url.
 *
 * @param  {String} url
 * @return {Object|null}
 */
Route.prototype.match = function(url) {
  var match = this.regex.exec(url);
  var result = {};
  if (!match) return null;
  match.slice(1).forEach((value, i) => result[this.keys[i]] = value);
  return result;
};

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-pages',this));