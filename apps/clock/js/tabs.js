define(function(require) {
'use strict';

var AccessibilityHelper = require('shared/js/accessibility_helper');

/**
 * Abstraction for handling the Tabs links at the bottom of the UI.
 * @param {HTMLElement} element The containing element for the Tabs UI.
 */
function Tabs(element) {
  this.element = element;
  this.lis = element.querySelectorAll('li');
  this.anchors = element.querySelectorAll('a');
  this.element.addEventListener('click', this);
}

/**
 * Update selected attributes for the selected tab.
 * Also emit a 'selected' event with the relevant data.
 */
Tabs.prototype.handleEvent = function tabsHandleEvent(event) {
  // Regrettably, the ideal layout of the DOM for the tabs in building
  // blocks doesn't match the layout of Clock's views. So we'll apply
  // some plaster here and make sure that we end up setting
  // aria-selected on the <li> element in addition to the <a>, so that
  // the proper active-state CSS is applied.
  // TODO: During the clock visual redesign, address this properly.
  var liTarget = event.target;
  while (liTarget && !liTarget.mozMatchesSelector('li')) {
    liTarget = liTarget.parentElement;
  }
  AccessibilityHelper.setAriaSelected(liTarget, this.lis);
  AccessibilityHelper.setAriaSelected(event.target, this.anchors);
};


return Tabs;

});
