define(function(require) {
'use strict';

var AccessibilityHelper = require('shared/js/accessibility_helper');

/**
 * Abstraction for handling the Tabs links at the bottom of the UI.
 * @param {HTMLElement} element The containing element for the Tabs UI.
 */
function Tabs(element) {
  this.element = element;
  this.links = element.querySelectorAll('a');
  this.element.addEventListener('click', this);
}

/**
 * Update selected attributes for the selected tab.
 * Also emit a 'selected' event with the relevant data.
 */
Tabs.prototype.handleEvent = function tabsHandleEvent(event) {
  AccessibilityHelper.setAriaSelected(event.target, this.links);
};


return Tabs;

});
