'use strict';
define(function(require) {
  var date = require('date'),
      mozL10n = require('l10n!'),
      base = require('./base');

  // Set up the global time updates for all nodes.
  (function() {
    var updatePrettyDate = function updatePrettyDate() {
      var labels = [...document.querySelectorAll('[data-time]')];
      labels.forEach(label => {
        date.relativeDateElement(label, label.dataset.time);
      });
    };
    var timer = setInterval(updatePrettyDate, 60 * 1000);

    function updatePrettyDateOnEvent() {
      clearInterval(timer);
      updatePrettyDate();
      timer = setInterval(updatePrettyDate, 60 * 1000);
    }
    // When user changes the language, update timestamps.
    mozL10n.ready(updatePrettyDateOnEvent);

    // On visibility change to not hidden, update timestamps
    document.addEventListener('visibilitychange', function() {
      if (document && !document.hidden) {
        updatePrettyDateOnEvent();
      } else {
        // If not visible, clear the interval to be a battery good citizen.
        clearInterval(timer);
      }
    });

  })();

  return function baseCard(templateMixins) {
    // Set up the base mixin
    return [
      base(templateMixins),
      {
        createdCallback: function() {
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
        }
      }
    ];
  };
});
