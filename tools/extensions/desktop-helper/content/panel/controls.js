!function() {

function HardwareButtons() {

}

HardwareButtons.prototype = {
    home: function() {
        var event = tab.CustomEvent('home');
        tab.dispatchEvent(event);
    },
    holdHome: function() {
        var event = tab.CustomEvent('holdhome');
        tab.dispatchEvent(event);
    },
    volumeUp: function() {
        var event = tab.CustomEvent('volumeup');
        tab.dispatchEvent(event);
    },
    volumeDown: function() {
        var event = tab.CustomEvent('volumedown');
        tab.dispatchEvent(event);
    },
    sleep: function() {
        var event = tab.CustomEvent('sleep');
        tab.dispatchEvent(event);
    },
    wake: function() {
        var event = tab.CustomEvent('wake');
        tab.dispatchEvent(event);
    },
    holdSleep: function() {
        var event = tab.CustomEvent('holdsleep');
        tab.dispatchEvent(event);
    }
};
window.hardware = new HardwareButtons();

function Emulation() {

}

Emulation.prototype = {
  nid: 0,
  notification: function() {
    var id = ++this.nid;
    var n = tab.wrappedJSObject.navigator.mozNotification.createNotification(
      'Some Notification',
      'I love notifications. #' + id);

    n.onclick = function() {
      document.querySelector('#log').textContent =
        'You clicked notification #' + id + '!';
    };

    n.onclose = function() {
      document.querySelector('#log').textContent =
        'You closed notification #' + id + '!';
    };

    n.show();
  }
};
window.emulation = new Emulation();
}();
