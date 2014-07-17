/**
 * A template function for generating an UI element for a layout object.
 */
define(function(require) {
  'use strict';

  var layoutTemplate = function layoutTemplate(layout, recycled) {
    var container = null;
    var span;
    var small;
    if (recycled) {
      container = recycled;
      span = container.querySelector('span');
      small = container.querySelector('small');
    } else {
      container = document.createElement('li');
      span = document.createElement('span');
      small = document.createElement('small');
      container.appendChild(small);
      container.appendChild(span);
    }
    var refreshName = function() {
      span.textContent = layout.name;
      small.textContent = layout.appName;
    };
    refreshName();
    layout.observe('appName', refreshName);
    layout.observe('name', refreshName);
    return container;
  };

  return layoutTemplate;
});
