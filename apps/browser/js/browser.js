var Browser = {

  get backButton() {
    delete this.backButton;
    return this.backButton =
      document.getElementById('browser-back-button');
  },

  get content() {
    delete this.content;
    return this.content = document.getElementById('browser-iframe');
  },

  get address() {
    delete this.address;
    return this.address = document.getElementById('browser-address');
  },

  get urlBar() {
    delete this.urlBar;
    return this.urlBar =
      document.getElementById('browser-url');
  },

  get iframe() {
    delete this.iframe;
    return document.getElementById('browser-iframe');
  },

  init: function() {
    this.address.addEventListener('submit', (function submitHandler(evt) {
      var url = this.urlBar.value;
      this.navigate(url);
      evt.preventDefault();
    }).bind(this));

    iframe = this.iframe;

    iframe.addEventListener('mozbrowserloadstart', (function loadStartHandler(evt) {
      this.urlBar.classList.add('loading');
    }).bind(this));

    iframe.addEventListener('mozbrowserloadend', (function loadEndHandler(evt) {
      this.urlBar.classList.remove('loading');
    }).bind(this));

    iframe.addEventListener('mozbrowserlocationchange', (function locationHandler(evt) {
      this.locationChange(evt.detail);
    }).bind(this));

    this.backButton.addEventListener('click', (function backHandler(evt) {
      MockHistory.back();
    }).bind(this));

    window.addEventListener('keypress', function keyPressHandler(evt) {
      if (MockHistory.backLength() && evt.keyCode == evt.DOM_VK_ESCAPE) {
        MockHistory.back();
        evt.preventDefault();
      }
    });

    var url = this.urlBar.value;
    this.navigate(url);
    this.updateHistory(url);
  },

  navigate: function(url) {
    this.content.setAttribute('src', url);
  },

  updateHistory: function(url) {
    MockHistory.pushState(null, '', url);
    if (MockHistory.backLength())
      this.backButton.src = 'style/images/back.png';
    else
      this.backButton.src = 'style/images/back-disabled.png';
  },
 
  locationChange: function(url) {
    this.urlBar.value = url;
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
    if (this.backLength() < 1) {
      return;
    }
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
    if (url == this.history[this.historyIndex])
      return;

    // If history contains forward entries, replace them with the new location
    if (this.forwardLength()) {
      this.history.splice((this.historyIndex + 1), this.forwardLength(), url);
      this.historyIndex++;
    } else {
      // Otherwise just append the new location to the end of the array
      this.historyIndex = this.history.push(url) - 1;
    }
  }
};

