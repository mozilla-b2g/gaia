/**
 * A template function for generating an UI element for a layout object.
 */
define(function(require) {
  'use strict';

  var layoutTemplate = function layoutTemplate(layout, recycled) {
    var container = null;
    var nameBdi;
    var small;
    if (recycled) {
      container = recycled;
      nameBdi = container.querySelector('bdi');
      small = container.querySelector('small');
    } else {
      container = document.createElement('li');
      nameBdi = document.createElement('bdi');
      small = document.createElement('small');
      container.appendChild(document.createElement('span'));
      container.lastChild.appendChild(nameBdi);
      container.appendChild(small);
    }
    var refreshName = function() {
      nameBdi.textContent = layout.name;
      small.textContent = layout.appName;
    };
    refreshName();
    layout.observe('appName', refreshName);
    layout.observe('name', refreshName);
    return container;
  };

  return layoutTemplate;
});
