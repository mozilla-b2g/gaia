
document.addEventListener("DOMContentLoaded", function() {
  var eventNum = 1;
  function recordEvent(text, cklass) {
    var li = document.createElement('li');
    if (cklass) 
      li.classList.add(cklass)
    var events = document.getElementById('event-stream');
    li.innerHTML = "<span>" + eventNum + "</span> " + text;
    events.appendChild(li);
    eventNum += 1;
  }

  navigator.id.watch({
    loggedInUser: null,

    onlogin: function(assertion) {
      recordEvent("login; assertion: " + assertion, 'login');
    },

    onlogout: function() {
      recordEvent("logout", 'logout');
    },

    onready: function() {
      recordEvent("ready", 'ready');
    }
  });

  document.getElementById("request").onclick = function() {
    navigator.id.request();
  };

  document.getElementById("logout").onclick = function() {
    navigator.id.logout();
  };

recordEvent("Ready to rock"); }, false);

