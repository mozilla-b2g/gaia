(function(window) {
  /**
   * Very simple base class for views.
   * Provides functionality for active/inactive.
   *
   * The first time the view is activated
   * the onactive function/event will fire.
   *
   * The .seen property is added to each object
   * with view in its prototype. .seen can be used
   * to detect if the view has ever been activated.
   *
   * @param {String|Object} options options or a selector for element.
   */
  function View(options) {
    if (typeof(options) === 'undefined') {
      options = {};
    }

    if (typeof(options) === 'string') {
      this.selectors = { element: options };
    } else {
      var key;

      if (typeof(options) === 'undefined') {
        options = {};
      }

      for (key in options) {
        if (options.hasOwnProperty(key)) {
          this[key] = options[key];
        }
      }
    }
  }

  const INVALID_CSS = /([^a-zA-Z\-\_0-9])/g;

  View.ACTIVE = 'active';

  View.prototype = {
    seen: false,
    activeClass: View.ACTIVE,

    get element() {
      return this._findElement('element');
    },

    calendarId: function(input) {
      if (typeof(input) !== 'string') {
        input = input.calendarId;
      }

      input = this.cssClean(input);
      return 'calendar-id-' + input;
    },

    /**
     * Delegate pattern event listener.
     *
     * @param {HTMLElement} element parent element.
     * @param {String} type type of dom event.
     * @param {String} selector css selector element should match
     *                          _note_ there is no magic here this
     *                          is determined from the root of the document.
     * @param {Function|Object} handler event handler.
     *                                  first argument is the raw
     *                                  event second is the element
     *                                  matching the pattern.
     */
    delegate: function(element, type, selector, handler) {
      if (typeof(handler) === 'object') {
        var context = handler;
        handler = function() {
          context.handleEvent.apply(context, arguments);
        }
      }

      element.addEventListener(type, function(e) {
        var target = e.target;
        while (target !== element) {
          if ('mozMatchesSelector' in target &&
              target.mozMatchesSelector(selector)) {
            return handler(e, target);
          }
          target = target.parentNode;
        }
      });
    },

    /**
     * Clean a string for use with css.
     * Converts illegal chars to legal ones.
     */
    cssClean: function(string) {
      if (typeof(string) !== 'string')
        return string;

      //TODO: I am worried about the performance
      //of using this all over the place =/
      //consider sanitizing all keys to ensure
      //they don't blow up when used as a selector?
      return string.replace(INVALID_CSS, '-');
    },

    /**
     * Finds a caches a element defined
     * by selectors
     *
     * @param {String} selector name as defined in selectors.
     * @param {Boolean} all true when to find all elements. (default false).
     */
    _findElement: function(name, all) {
      var cacheName;
      var selector;

      if (typeof(all) === 'undefined') {
        all = false;
      }

      if (name in this.selectors) {
        cacheName = '_' + name + 'Element';
        selector = this.selectors[name];

        if (!this[cacheName]) {
          if (all) {
            this[cacheName] = document.querySelectorAll(selector);
          } else {
            this[cacheName] = document.querySelector(selector);
          }
        }

        return this[cacheName];
      }

      return null;
    },

    onactive: function() {
      //seen can be set to anything other
      //then false to override this behaviour
      if (this.seen === false) {
        this.onfirstseen();
      }

      // intentionally using 'in'
      if ('dispatch' in this) {
        this.dispatch.apply(this, arguments);
      }

      this.seen = true;
      if (this.element) {
        this.element.classList.add(this.activeClass);
      }
    },

    oninactive: function() {
      if (this.element) {
        this.element.classList.remove(this.activeClass);
      }
    },

    onfirstseen: function() {}
  };

  Calendar.View = View;

}(this));
