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
