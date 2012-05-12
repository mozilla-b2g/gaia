/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Browser = {

  currentTitle: '',
  currentUrl: '',
  GO: 0,
  REFRESH: 1,
  urlButtonMode: this.GO,

  init: function browser_init() {
    // Load homepage once GlobalHistory is initialised
    GlobalHistory.init(this.go.bind(this));

    // Assign UI elements to variables
    this.toolbarStart = document.getElementById('toolbar-start');
    this.urlBar = document.getElementById('url-bar');
    this.urlInput = document.getElementById('url-input');
    this.urlButton = document.getElementById('url-button');
    this.content = document.getElementById('browser-content');
    this.awesomescreen = document.getElementById('awesomescreen');
    this.history = document.getElementById('history-list');
    this.backButton = document.getElementById('back-button');
    this.forwardButton = document.getElementById('forward-button');

    // Add event listeners
    this.backButton.addEventListener('click', this.goBack.bind(this));
    this.urlButton.addEventListener('click', this.go.bind(this));
    this.forwardButton.addEventListener('click', this.goForward.bind(this));
    this.urlInput.addEventListener('focus', this.urlFocus.bind(this));
    this.urlInput.addEventListener('blur', this.urlBlur.bind(this));
    window.addEventListener('submit', this);
    window.addEventListener('keyup', this, true);
    this.history.addEventListener('click', this.followLink.bind(this));

    var browserEvents = ['loadstart', 'loadend', 'locationchange',
      'titlechange'];
    browserEvents.forEach((function attachBrowserEvent(type) {
      this.content.addEventListener('mozbrowser' + type, this);
    }).bind(this));
  },

  handleEvent: function browser_handleEvent(evt) {
    var urlInput = this.urlInput;

    switch (evt.type) {
      case 'submit':
          this.go(evt);
        break;

      case 'keyup':
        if (!SessionHistory.backLength() || evt.keyCode != evt.DOM_VK_ESCAPE)
          break;

        this.goBack();
        evt.preventDefault();
        break;

      case 'mozbrowserloadstart':
        this.currentTitle = '';
        urlInput.value = this.currentUrl;
        this.toolbarStart.classList.add('loading');
        break;

      case 'mozbrowserloadend':
        this.toolbarStart.classList.remove('loading');
        if (this.currentTitle)
          urlInput.value = this.currentTitle;
        else
          urlInput.value = this.currentUrl;
        this.setUrlButtonMode(this.REFRESH);
        break;

      case 'mozbrowserlocationchange':
        this.locationChange(evt.detail);
        break;

      case 'mozbrowsertitlechange':
        this.currentTitle = evt.detail;
        if (!this.urlBar.querySelector(':focus'))
          urlInput.value = this.currentTitle;
        GlobalHistory.setPageTitle(this.currentUrl, this.currentTitle);
        break;
    }
  },

  navigate: function browser_navigate(url) {
    this.content.setAttribute('src', url);
    this.awesomescreen.classList.add('hidden');
    this.content.classList.remove('hidden');
  },

  go: function browser_go(e) {
    if (e)
      e.preventDefault();

    if (this.urlButtonMode == this.REFRESH) {
      this.navigate(this.currentUrl);
      return;
    }

    var url = this.urlInput.value.trim();
    var protocolRegexp = /^([a-z]+:)(\/\/)?/i;
    var protocol = protocolRegexp.exec(url);
    if (!protocol)
      url = 'http://' + url;
    if (url != this.currentUrl) {
      this.urlInput.value = url;
      this.currentUrl = url;
    }
    this.navigate(url);
    this.urlInput.blur();
  },

  goBack: function browser_goBack() {
    SessionHistory.back();
    this.backButton.disabled = !SessionHistory.backLength();
    this.forwardButton.disabled = !SessionHistory.forwardLength();
  },

  goForward: function browser_goForward() {
    SessionHistory.forward();
    this.backButton.disabled = !SessionHistory.backLength();
    this.forwardButton.disabled = !SessionHistory.forwardLength();
  },

  updateHistory: function browser_updateHistory(url) {
    SessionHistory.pushState(null, '', url);
    GlobalHistory.addVisit(url);
    this.backButton.disabled = !SessionHistory.backLength();
    this.forwardButton.disabled = !SessionHistory.forwardLength();
  },

  locationChange: function browser_locationChange(url) {
    if (url != this.currentUrl) {
      this.currentUrl = url;
      this.updateHistory(url);
    }
  },

  urlFocus: function browser_urlFocus() {
    this.urlInput.value = this.currentUrl;
    this.urlInput.select();
    this.setUrlButtonMode(this.GO);
    this.content.classList.add('hidden');
    this.awesomescreen.classList.remove('hidden');
    GlobalHistory.getHistory(this.showGlobalHistory.bind(this));
  },

  urlBlur: function browser_urlBlur() {
    if (this.currentTitle)
      this.urlInput.value = this.currentTitle;
    this.setUrlButtonMode(this.REFRESH);
  },

  setUrlButtonMode: function browser_setUrlButtonMode(mode) {
    this.urlButtonMode = mode;
    switch (mode) {
      case this.GO:
        this.urlButton.src = 'style/images/go.png';
        break;
      case this.REFRESH:
        this.urlButton.src = 'style/images/refresh.png';
        break;
    }
  },

  showGlobalHistory: function browser_showGlobalHistory(visits) {
    var history = this.history;
    history.innerHTML = '';
    visits.forEach(function browser_populateHistory(visit) {
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + visit.uri + '"><span>' +
        (visit.title ? visit.title : visit.uri) +
        '</span><small>' + visit.uri + '</small></a>';
      history.appendChild(li);
    });
  },

  followLink: function browser_followLink(e) {
    e.preventDefault();
    this.navigate(e.target.parentNode.getAttribute('href'));
  }
};

window.addEventListener('load', function browserOnLoad(evt) {
  window.removeEventListener('load', browserOnLoad);
  Browser.init();
});
