/*
 *  Module: Templates
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author Cristian Rodriguez de la Cruz (crdlc@tid.es)
 *
 *  The module ...
 *
 * @example
 *  ...
 *
*/

if (!InfiniteScroll) {

  const InfiniteScroll = (function(doc) {
    'use strict';

    // Options by default
    var defaults = {
      element: document,
      callback: function() {},
      threshold: 5,
      spinner: true
    };

    /*
     * Returns the height of the scroll view of an element
     *
     * @param{object} DOM element
     */
    function getScrollHeight(elem) {
      return elem.scrollHeight;
    }

    /*
     * Returns the inner height of an element
     *
     * @param{object} DOM element
     */
    function getClientHeight(elem) {
      return elem.clientHeight;
    }

    /*
     * Returns the number of pixels scrolled
     *
     * @param{object} DOM element
     */
    function getScrollPosition(elem) {
      return elem.scrollTop;
    }

    /*
     * Implements the infinite scroll algorithm
     *
     * @param{object} Scroll object
     */
    function onMoveEvent(scroller) {
      if (scroller.updating) {
        return;
      }

      var elem = scroller.element;
      var containerHeight = getScrollHeight(elem);
      var contentHeight = getClientHeight(elem);
      var scrollPos = getScrollPosition(elem);

      if (containerHeight - (scrollPos + contentHeight) < scroller.threshold) {
        var style = scroller.loader.style;
        style.display = 'block';
        scroller.updating = true;

        scroller.callback(function(finished) {
          style.display = 'none';
          scroller.updating = false;
          if (finished) {
            scroller.destroy();
          }
        });
      }

      scroller.prevScrollPos = scrollPos;
    }

    /*
     * Shows a spinner while we are loading content
     *
     * @param{object} Scroll object
     *
     * @param{Map} Set of options
     */
    function addSpinner(scroller, opts) {
      var loader = scroller.loader = document.createElement('div');
      loader.className = 'infinite-scroll-loader';
      if (opts.spinner) {
        scroller.element.appendChild(loader);
      }
    }

    /*
     * Scroll constructor
     *
     * @param{Map} Set of options
     */
    var Scroll = function(opts) {
      this.callback = opts.callback;
      this.threshold = opts.threshold;
      this.updating = false;
      var ele = this.element = typeof opts.element === 'object' ?
          opts.element : doc.querySelector(opts.element);
      this.prevScrollPos = getScrollPosition(ele);
      ele.className += ' infinite-scroll';
      addSpinner(this, opts);
      ele.addEventListener('scroll', this);
    }

    Scroll.prototype = {

     /*
      * Handles events
      *
      * @param{object} DOM Event
      */
      handleEvent: function(evt) {
        if (evt.type === 'scroll') {
          onMoveEvent(this);
        }
      },

     /*
      * Auto-destruction in order to release memory
      *
      * @param{object} Scroll object
      */
      destroy: function() {
        this.element.removeEventListener('scroll', this);
        delete this.threshold;
        delete this.updating;
        delete this.callback;
        delete this.element;
        delete this.prevScrollPos;
        delete this.loader;
      }
    };

    return {
     /*
      * Creates a new infinite scroll
      *
      * @param{Map} Set of options
      */
      create: function(opts) {
        // Populate defaults
        for (var key in defaults) {
          if (typeof opts[key] === 'undefined') {
            opts[key] = defaults[key];
          }
        }
        return new Scroll(opts);
      }
    };

  })(document);
}
