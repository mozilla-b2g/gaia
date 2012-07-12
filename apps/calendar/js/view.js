(function(window) {
  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

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
   */
  function View(selector) {
    this.element = document.querySelector(selector);
  }

  View.prototype = {
    seen: false,
    activeClass: 'active',

    selectors: {},

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
