window.onload = function() {
  urlHistory = [];
  currentURL = -1;
  Browser.init();
}

var Browser = {
  init: function() {
    var go = document.getElementById("browser-go-button");
    go.addEventListener("click", Browser.navigate, false);
    var back = document.getElementById("browser-back-button");
    back.addEventListener("click", Browser.back, false);
    Browser.navigate();
  },

  navigate: function(event) {
    if(event) {event.preventDefault(); }
    var url = document.getElementById("browser-url").value;
    var iframe = document.getElementById("browser-iframe");
    if(url && url !== urlHistory[currentURL]) {
      urlHistory.push(url);
      currentURL++;
    }
    iframe.setAttribute("src", url);
  },

  back: function() {
    if (currentURL == 0) {
      return;
    } else {
      currentURL--;
      document.getElementById("browser-url").value = urlHistory[currentURL];
      Browser.navigate();
    }
  }
  
};
