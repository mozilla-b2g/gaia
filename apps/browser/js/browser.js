/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Browser = {
  get backButton() {
    delete this.backButton;
    return this.backButton =
      document.getElementById('browser-back-button');
  },

  get urlbar() {
    delete this.urlbar;
    return this.urlbar = document.getElementById('browser-url');
  },

  /* Browser content */
  get content() {
    delete this.content;
    return this.content = document.getElementById('browser-content');
  },

  init: function browser_init() {
    this.backButton.addEventListener('click', this);
    window.addEventListener('submit', this);
    window.addEventListener('keypress', this, true);

    var browserEvents = ['loadstart', 'loadend', 'locationchange'];
    browserEvents.forEach((function attachBrowserEvent(type) {
      this.content.addEventListener('mozbrowser' + type, this);
    }).bind(this));

    var url = this.urlbar.value;
    this.navigate(url);
    this.updateHistory(url);
  },

  handleEvent: function browser_handleEvent(evt) {
    var urlbar = this.urlbar;

    switch (evt.type) {
      case 'submit':
        var url = urlbar.value.trim();
        var protocolRegexp = /^([a-z]+:)(\/\/)?/i;
        var protocol = protocolRegexp.exec(url);
        if (!protocol)
          url = 'http://' + url;

        this.navigate(url);
        urlbar.value = url;
        evt.preventDefault();
        break;

      case 'click':
        this.goBack();
        break;

      case 'keypress':
        if (!MockHistory.backLength() || evt.keyCode != evt.DOM_VK_ESCAPE)
          break;

        this.goBack();
        evt.preventDefault();
        break;

      case 'mozbrowserloadstart':
        urlbar.classList.add('loading');
        break;

      case 'mozbrowserloadend':
        urlbar.classList.remove('loading');
        break;

      case 'mozbrowserlocationchange':
        this.locationChange(evt.detail);
        break;
    }
  },

  navigate: function browser_navigate(url) {
    this.content.setAttribute('src', url);
  },

  goBack: function browser_goBack() {
    MockHistory.back();
    this.backButton.disabled = !MockHistory.backLength();
  },

  updateHistory: function browser_updateHistory(url) {
    MockHistory.pushState(null, '', url);
    this.backButton.disabled = !MockHistory.backLength();
  },
 
  locationChange: function(url) {
    this.urlbar.value = url;
    this.updateHistory(url);
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});

var MockHistory = {
  history: [],
  historyIndex: -1,

  back: function() {
    if (this.backLength() < 1)
      return;
    Browser.navigate(this.history[--this.historyIndex]);
  },

  historyLength: function() {
    return this.history.length;
  },

  backLength: function() {
   if (this.history.length < 2)
     return 0;
   return this.historyIndex;
  },

  forwardLength: function() {
    return this.history.length - this.historyIndex - 1;
  },

  pushState: function(stateObj, title, url) {
    var history = this.history;
    var index = this.historyIndex;
    if (url == history[index])
      return;

    // If history contains forward entries, replace them with the new location
    if (this.forwardLength()) {
      history.splice(index + 1, this.forwardLength(), url);
      this.historyIndex++;
    } else {
      // Otherwise just append the new location to the end of the array
      this.historyIndex = history.push(url) - 1;
    }
  }
};

