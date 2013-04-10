!function() {
  function Notification() {
    this.createNotification = function(title, body, icon) {
      var px = {};
      px.show = function() {
        var text = 'NOTIFICATION!\n\n' + title + '\n\n' + body + '\n' + icon;
        if (confirm(text)) {
          px.onclick && px.onclick();
        }
        else {
          px.onclose && px.onclose();
        }
      };
      return px;
    };
  }

  FFOS_RUNTIME.makeNavigatorShim('mozNotification', new Notification());
}();
