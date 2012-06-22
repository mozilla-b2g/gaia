'use strict';

var utils = window.utils || {};

if (!utils.xmlevents) {
  (function() {
    // Automagically attach the event handlers
    window.addEventListener('DOMContentLoaded', attachHandlers);

    // To store the list of listeners
    var listeners = {};

    // Auxiliary Variable for creating the API
    var xmlEvents = utils.xmlevents = {};

    /**
     *  Attachs the specified listener to the subTree
     *
     *  @param {String} listenerId id of the listener element to be attached.
     *  @param {HTMLDOMElement} subTree on which perform the attachment
     *  (document by default).
     *
     *  subTree can be either a selector or a HTMLDOMElement
     *
     */
    xmlEvents.attach = function(listenerId, subTree) {
      var listener = listeners[listenerId];

      if (listener) {
        addEventListener(listener, subTree);
      }
    };  // xmlevents.attach

    /**
     *  Returns an enriched handler for listening to an event
     *
     *  @param {function} f the original handler.
     *
     *  @param {boolean} prevent indicating
     *  whether preventDefault must be invoked.
     *
     *  @param {boolean} stop indicating whether stopPropagation
     *  must be invoked.
     *
     *
     */
    function getHandler(f, prevent, stop) {
      return function(e) {
        f(e);
        if (prevent === true) {
          e.preventDefault();
        }

        if (stop === true) {
          e.stopPropagation();
        }
      };
    }  // getHandler


    /**
     *  Core function invoked when a DOMContentLoaded happens
     *
     */
    function attachHandlers() {
      var selector = 'script.events[type="text/xml"]';
      var scrBlocks = document.querySelectorAll(selector);

      if (scrBlocks && scrBlocks.length > 0) {
        var totalBlocks = scrBlocks.length;

        for (var c = 0; c < totalBlocks; c++) {
          var content = scrBlocks.item(c).textContent;
          var xmlContent = '<listeners>' + content + '</listeners>';

          var oParser = new DOMParser();
          var doc = oParser.parseFromString(xmlContent, 'text/xml');

          if (doc.documentElement.nodeName === 'parsererror') {
              window.console.log('Error while parsing the listeners');
          }
          else {
            var elements = doc.getElementsByTagName('listener');

            var nlisteners = elements.length;

            for (var counter = 0; counter < nlisteners; counter++) {
              parseListener(elements[counter]);
            }
          } // totalBlocks iteration
        } // if(scrBlock)
      }

      // Event handler is removed
      window.setTimeout(function() {
        window.removeEventListener('DOMContentLoaded', attachHandlers) }, 0);
    } // attachHandlers


    /**
     *  Adds a listener to the specified subTree
     *
     *  @param {listener} listener with all the listener params.
     *  @param {HTMLDomElement} subTree (document by default).
     *
     *
     */
    function addEventListener(listener, subTree) {
      var sel = listener.target;

      if (listener.observer && listener.target) {
        sel = listener.observer + ' ' + listener.target;
      } else if (listener.observer) {
        sel = listener.observer;
      }

      // If we need to add only the listeners on a particular subtree
      var tree = document;

      // Checking whether it is a DOM element or a selector to a DOM element
      if (subTree && !subTree.tagName) {
        tree = document.querySelector(subTree);
      }
      else if (subTree && subTree.tagName) {
        tree = subTree;
      }

      // the affected elements
      var elements = tree.querySelectorAll(sel);

      if (elements.length > 0) {
        for (var i = 0; i < elements.length; i++) {
          elements.item(i).addEventListener(listener.eventx,
                                            listener.theFunction,
                                                listener.useCapture);
        }
      }
    } // addEventListener


    /**
     *  Parses a listener from an XML element
     *
     *
     */
    function parseListener(e) {
      var id = e.getAttribute('id');
      var listener = {};

      listener.target = e.getAttribute('target');
      listener.eventx = e.getAttribute('event');
      listener.observer = e.getAttribute('observer');
      var functionx = e.getAttribute('function');

      // Check whether phase is capture or not
      var phase = e.getAttribute('phase');
      listener.useCapture = false;
      if (phase && phase === 'capture') {
        listener.useCapture = true;
      }

      var propagate = e.getAttribute('propagate');
      var defAction = e.getAttribute('defaultAction');

      var fx = eval(functionx);
      listener.theFunction = fx;
      listener.prevent = false;
      listener.stop = false;

      if (defAction && defAction === 'cancel') {
        listener.prevent = true;
      }

      if (propagate && propagate === 'stop') {
        listener.stop = true;
      }

      if (typeof fx === 'function') {
        if (listener.prevent || listener.stop) {
          var preventMethod = listener.prevent;
          var stopMethod = listener.stop;
          listener.theFunction = getHandler(fx, preventMethod, stopMethod);
        }

        if (id) {
          listeners[id] = listener;
        }

        addEventListener(listener);
      }
    } // parseListener
})();
} // window.xmlevents
