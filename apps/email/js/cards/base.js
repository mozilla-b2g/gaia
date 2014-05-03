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

    window.addEventListener('message',
    function visibleAppUpdatePrettyDate(evt) {
      var data = evt.data;
      if (!data || (typeof(data) !== 'object') ||
          !('message' in data) || data.message !== 'visibilitychange') {
        return;
      }
      clearTimeout(timer);
      if (!data.hidden) {
        updatePrettyDate();
        timer = setInterval(updatePrettyDate, 60 * 1000);
      }
    });
  })();


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
          mozL10n.translate(this);
          Emitter.call(this);
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
        },

        /**
         * Display a human-readable file size.  Currently we always display
         * things in kilobytes because we are targeting a mobile device and we
         * want bigger sizes (like megabytes) to be obviously large numbers.
         */
        prettyFileSize: function(sizeInBytes) {
          var kilos = Math.ceil(sizeInBytes / 1024);
          return mozL10n.get('attachment-size-kib', { kilobytes: kilos });
        },

        /**
         * Format the message subject appropriately.  This means ensuring that
         * if the subject is empty, we use a placeholder string instead.
         *
         * @param {DOMElement} subjectNode the DOM node for the message's
         * subject.
         * @param {Object} message the message object.
         */
        displaySubject: function(subjectNode, message) {
          var subject = message.subject && message.subject.trim();
          if (subject) {
            subjectNode.textContent = subject;
            subjectNode.classList.remove('msg-no-subject');
          }
          else {
            subjectNode.textContent = mozL10n.get('message-no-subject');
            subjectNode.classList.add('msg-no-subject');
          }
        }
      }
    ];
  };
});
