'use strict';

(function(exports) {
  function AppWidget(config) {
    this.manifestURL = config.manifestURL;
    this.widget = config.widget;
    this.launchPath = config.url;
    this.position = config.position;
    this.isExpanded = false;

    var browser = document.createElement('iframe');
    // XXX: Change the following property and dashboard App permission to
    // widget-specific one after widget path bug is fixed. See bug 1167063.
    browser.setAttribute('mozbrowser', 'true');
    browser.setAttribute('remote', 'true');
    browser.setAttribute('mozapp', config.manifestURL);
    browser.src = config.url;

    this.iframe = browser;
    this.container = document.getElementById(this.position + '-panel');
    this.container.appendChild(this.iframe);
  }

  AppWidget.prototype = {
    _setHash: function aw_setHash(hash) {
      // Note: The '#' should always present to prevent reload
      this.iframe.src = this.iframe.src.split('#')[0] + '#' + hash;
    },

    toggleExpand: function aw_setExpand(value) {
      if(typeof value !== 'undefined') {
        this.isExpanded = ! this.isExpanded;
      } else {
        this.isExpanded = value;
      }
      this._setHash(this.isExpanded ? 'expand' : '');
    },

    focus: function aw_focus() {
      this.iframe.focus();
    }
  };
  exports.AppWidget = AppWidget;
}(window));
