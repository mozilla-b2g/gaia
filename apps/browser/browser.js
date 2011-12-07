var Browser = {

  get backButton() {
    delete this.backButton;
    return this.backButton =
      document.getElementById('browser-back-button');
  },

  get goButton() {
    delete this.goButton;
    return this.goButton =
      document.getElementById('browser-go-button');
  },

  get content() {
    delete this.content;
    return this.content = document.getElementById('browser-iframe');
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
    this.goButton.addEventListener('click', (function goHandler(evt) {
      var url = this.urlBar.value;
      MockHistory.pushState(null, '', url);
      this.navigate(url);
      evt.preventDefault();
    }).bind(this));

    this.iframe.addEventListener('load', (function loadedHandler(evt) {
      this.urlBar.classList.remove('loading');
    }).bind(this));

    this.backButton.addEventListener('click', (function backHandler(evt) {
      MockHistory.back();
    }).bind(this));

    var url = this.urlBar.value;
    MockHistory.pushState(null, '', url);
    this.navigate(url);
  },

  navigate: function(url) {
    this.urlBar.value = url;
    this.content.setAttribute('src', url);
    this.urlBar.classList.add('loading');
    if (MockHistory.backLength()) {
      this.backButton.src = "images/back.png";
    } else {
      this.backButton.src = "images/back-disabled.png";
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
    if(this.backLength() < 1) {
      return;
    }
    Browser.navigate(this.history[--this.historyIndex]);
  },

  historyLength: function() {
    return this.history.length;
  },

  backLength: function() {
   if(this.history.length < 2)
     return 0;
   return this.historyIndex;
  },

  forwardLength: function() {
    return this.history.length - this.historyIndex - 1;
  },
  
  pushState: function(stateObj, title, url) {
    // If history contains forward entries, replace them with the new location
    if (this.forwardLength()) {
      this.history.splice((this.historyIndex + 1), this.forwardLength(), url);
      this.historyIndex++;
    } else {
    // Otherwise just append the new location to the end of the array
      this.historyIndex = this.history.push(url) -1;
    }
  }
}

