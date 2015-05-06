'use strict';
define(function(require) {
  var mozL10n = require('l10n!'),
      Emitter = require('evt').Emitter;

  // Set up the global time updates for all nodes.
  (function() {
    var formatter = new mozL10n.DateTimeFormat();
    var updatePrettyDate = function updatePrettyDate() {
      var labels = document.querySelectorAll('[data-time]');
      var i = labels.length;
      while (i--) {
        labels[i].textContent = formatter.fromNow(
          labels[i].dataset.time,
          // the presence of the attribute is our indicator; not its value
          'compactFormat' in labels[i].dataset);
      }
    };
    var timer = setInterval(updatePrettyDate, 60 * 1000);

    function updatePrettyDateOnEvent() {
      clearTimeout(timer);
      updatePrettyDate();
      timer = setInterval(updatePrettyDate, 60 * 1000);
    }
    // When user changes the language, update timestamps.
    mozL10n.ready(updatePrettyDateOnEvent);

    // On visibility change to not hidden, update timestamps
    document.addEventListener('visibilitychange', function() {
      if (document && !document.hidden) {
        updatePrettyDateOnEvent();
      }
    });

  })();


  /**
   * Returns an array of objects that can be fed to the 'element' module to
   * create a prototype for a custom element. It takes an optional
   * `templateMixins` object that is the first object to be mixed in by the
   * "mixins insted of prototypes" construction that 'element' favors. This
   * templateMixins should come first, as it sets up the inner DOM structure
   * for an instance of the element, and needs to have been inserted before the
   * other mixins in this base are applied. The templateMixins are normally
   * passed to this function via a `require('template!...')` dependency. The
   * 'template' loader plugin knows how to set up an object for use in this type
   * of 'element' target. See the README.md in this file's directory for more
   * information on the custom element approach.
   * @param {Object|Array} [templateMixins] Handles the templating duties
   * for the inner HTML structure of the element.
   * @returns {Array} Array of objects for use in a mixin construction.
   */
  return function cardBase(templateMixins) {
    // Set up the base mixin
    return [
      // Mix in the template first, so that its createdCallback is
      // called before the other createdCallbacks, so that the
      // template is there for things like l10n mixing and node
      // binding inside the template.
      templateMixins ? templateMixins : {},

      // Wire up support for auto-node binding
      require('./mixins/data-prop'),
      require('./mixins/data-event'),

      // Every custom element is an evt Emitter!
      Emitter.prototype,

      {
        createdCallback: function() {
          Emitter.call(this);

          // Set up extra classes and other node information that distinguishes
          // as a card. Doing this here so that by the time the createdCallback
          // provided by the card so that the DOM at that point can be used for
          // HTML caching purposes.
          if (this.extraClasses) {
            this.classList.add.apply(this.classList,
                                        this.extraClasses);
          }

          this.classList.add('card');
        },

        batchAddClass: function(searchClass, classToAdd) {
          var nodes = this.getElementsByClassName(searchClass);
          for (var i = 0; i < nodes.length; i++) {
            nodes[i].classList.add(classToAdd);
          }
        },

        /**
         * Add an event listener on a container that, when an event is encounted
         * on a descendant, walks up the tree to find the immediate child of the
         * container and tells us what the click was on.
         */
        bindContainerHandler: function(containerNode, eventName, func) {
          containerNode.addEventListener(eventName, function(event) {
            var node = event.target;
            // bail if they clicked on the container and not a child...
            if (node === containerNode) {
              return;
            }
            while (node && node.parentNode !== containerNode) {
              node = node.parentNode;
            }
            func(node, event);
          }, false);
        }
      }
    ];
  };
});
