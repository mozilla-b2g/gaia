/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Browser = {

  currentTitle: '',

  currentUrl: '',

  goIsRefresh: false,

  init: function browser_init() {
    // Assign UI elements to variables
    this.addressBar = document.getElementById('address-bar');
    this.urlBar = document.getElementById('url-bar');
    this.goButton = document.getElementById('go-button');
    this.content = document.getElementById('browser-content');
    this.backButton = document.getElementById('back-button');
    this.forwardButton = document.getElementById('forward-button');
    // Browser menu coming back soon
    //this.shade = document.getElementById('shade');
    //this.menu = document.getElementById('browser-menu');
    //this.menuButton = document.getElementById('menu-button');

    // Add event listeners
    this.backButton.addEventListener('click', this.goBack.bind(this));
    // Menu button coming back soon
    //this.menuButton.addEventListener('click', this.toggleMenu.bind(this));
    //this.shade.addEventListener('click', this.toggleMenu.bind(this));
    this.goButton.addEventListener('click', this.go.bind(this));
    this.forwardButton.addEventListener('click', this.goForward.bind(this));
    this.urlBar.addEventListener('focus', this.urlFocus.bind(this));
    this.urlBar.addEventListener('blur', this.urlBlur.bind(this));
    window.addEventListener('submit', this);
    window.addEventListener('keyup', this, true);

    var browserEvents = ['loadstart', 'loadend', 'locationchange',
      'titlechange'];
    browserEvents.forEach((function attachBrowserEvent(type) {
      this.content.addEventListener('mozbrowser' + type, this);
    }).bind(this));

    // Load homepage
    var url = this.urlBar.value;
    this.currentUrl = url;
    this.navigate(url);
    this.updateHistory(url);
  },

  handleEvent: function browser_handleEvent(evt) {
    var urlBar = this.urlBar;

    switch (evt.type) {
      case 'submit':
          this.go(evt);
        break;

      case 'keyup':
        if (!MockHistory.backLength() || evt.keyCode != evt.DOM_VK_ESCAPE)
          break;

        this.goBack();
        evt.preventDefault();
        break;

      case 'mozbrowserloadstart':
        this.currentTitle = '';
        this.addressBar.classList.add('loading');
        break;

      case 'mozbrowserloadend':
        this.addressBar.classList.remove('loading');
        if (this.currentTitle)
          urlBar.value = this.currentTitle;
        else
          urlBar.value = this.currentUrl;
        this.goButton.src = 'style/images/refresh.png';
        this.goIsRefresh = true;
        break;

      case 'mozbrowserlocationchange':
        this.locationChange(evt.detail);
        break;

      case 'mozbrowsertitlechange':
        this.currentTitle = evt.detail;
        if (!this.addressBar.querySelector(':focus'))
          urlBar.value = this.currentTitle;
        break;
    }
  },

  navigate: function browser_navigate(url) {
    this.content.setAttribute('src', url);
  },

  go: function browser_go(evt) {
    evt.preventDefault();
    if (this.goIsRefresh) {
      this.navigate(this.currentUrl);
    }
    else {
      var url = this.urlBar.value.trim();
      var protocolRegexp = /^([a-z]+:)(\/\/)?/i;
      var protocol = protocolRegexp.exec(url);
      if (!protocol)
        url = 'http://' + url;
      if (url != this.currentUrl) {
        this.urlBar.value = url;
        this.currentUrl = url;
      }
      this.navigate(url);
      this.urlBar.blur();
    }
  },

  goBack: function browser_goBack() {
    MockHistory.back();
    this.backButton.disabled = !MockHistory.backLength();
    this.forwardButton.disabled = !MockHistory.forwardLength();
  },

  goForward: function browser_goForward() {
    MockHistory.forward();
    this.backButton.disabled = !MockHistory.backLength();
    this.forwardButton.disabled = !MockHistory.forwardLength();
  },

  updateHistory: function browser_updateHistory(url) {
    MockHistory.pushState(null, '', url);
    this.backButton.disabled = !MockHistory.backLength();
    this.forwardButton.disabled = !MockHistory.forwardLength();
  },

  locationChange: function browser_locationChange(url) {
    if (url != this.currentUrl) {
      this.currentUrl = url;
      this.updateHistory(this.currentUrl);
    }
  },

  /* Menu coming back soon
  toggleMenu: function browser_toggleMenu() {
    this.menu.classList.toggle('hidden');
    this.shade.classList.toggle('hidden');
  },*/

  urlFocus: function browser_urlFocus() {
    this.urlBar.value = this.currentUrl;
    this.urlBar.select();
    this.goButton.src = 'style/images/go.png';
    this.goIsRefresh = false;
  },

  urlBlur: function browser_urlBlur() {
    if (this.urlBar.value == this.currentUrl) {
      if (this.currentTitle)
        this.urlBar.value = this.currentTitle;
      this.goButton.src = 'style/images/refresh.png';
      this.goIsRefresh = true;
    }
    else {
      this.currentUrl = this.urlBar.value;
    }
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

  forward: function() {
    if (this.forwardLength() < 1)
      return;
    Browser.navigate(this.history[++this.historyIndex]);
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

