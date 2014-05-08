/**
 * A template function for generating an UI element for a layout object.
 */
define(function(require) {
  'use strict';

  var layoutTemplate = function layoutTemplate(layout, recycled) {
    var container = null;
    var span;
    if (recycled) {
      container = recycled;
      span = container.querySelector('span');
    } else {
      container = document.createElement('li');
      span = document.createElement('span');
      container.appendChild(span);
    }
    var refreshName = function() {
      span.textContent = layout.appName + ': ' + layout.name;
    };
    refreshName();
    layout.observe('appName', refreshName);
    layout.observe('name', refreshName);
    return container;
  };

  return layoutTemplate;
});
