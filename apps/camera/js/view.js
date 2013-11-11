define(function(require) {
  'use strict';

  var evt = require('evt');

  var View = function(el, properties) {
    this.el = (typeof el === 'string' ? document.querySelector(el) : el) || document.body;

    this.mixin(properties || {});

    this.render();
  };

  View.prototype = evt.mix({
    el: null,

    model: null,

    watch: function(model) {
      var self = this;

      this.model = model;
      this.render();

      model.on('change', function(evt) {
        self.render();
      });
    },

    setBooleanAttribute: function(el, attribute, value) {
      if (value) {
        el.setAttribute(attribute, attribute);
      }

      else {
        el.removeAttribute(attribute);
      }
    },

    setBooleanClass: function(el, className, value) {
      if (value) {
        el.classList.add(className);
      }

      else {
        el.classList.remove(className);
      }
    },

    mixin: function(properties) {
      for (var property in properties) {
        this[property] = properties[property];
      }
    },

    attach: function(events) {
      var el = this.el;

      var eventHandler,
          eventExpression,
          eventName,
          eventSelector;

      for (var evt in events) {
        eventHandler = typeof events[evt] === 'string' ? this[events[evt]] : events[evt].bind(this);
        eventExpression = evt.split(' ');
        eventName = eventExpression.shift();

        // Add event listener directly to View element
        if (eventExpression.length === 0) {
          el.addEventListener(eventName, eventHandler.bind(this));
        }

        // Add event listener to window
        else if (eventExpression.length === 1 && eventExpression[0] === 'window') {
          window.addEventListener(eventName, eventHandler.bind(this));
        }

        // Add event listener to document
        else if (eventExpression.length === 1 && eventExpression[0] === 'document') {
          document.addEventListener(eventName, eventHandler.bind(this));
        }

        // Add event listener to a View child element
        else {
          eventSelector = eventExpression.join(' ');
          el.querySelector(eventSelector).addEventListener(eventName, eventHandler.bind(this));
        }
      }
    },

    render: function() {} // NOOP
  });

  return View;
});
