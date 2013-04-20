!function() {

function sendChromeEvent(detail) {
    var contentDetail = Components.utils.createObjectIn(tab);
    for (var i in detail) {
        contentDetail[i] = detail[i];
    }
    Components.utils.makeObjectPropsNormal(contentDetail);
    var customEvt = tab.document.createEvent('CustomEvent');
    customEvt.initCustomEvent('mozChromeEvent', true, true, contentDetail);
    tab.dispatchEvent(customEvt);
}

function HardwareButtons() {

}

HardwareButtons.prototype = {
    home: function() {
        hardware.wake();
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
    notification: function() {
        sendChromeEvent({
            type: 'desktop-notification',
            id: 123,
            title: 'Some Notification',
            text: 'I love notifications.',
            manifestURL: 'http://sytem.gaiamobile.org:8080/manifest.webapp'
         });
    }
};
window.emulation = new Emulation();

function Workflow() {

}

Workflow.prototype = {
  reload: function() {

    var app = tab.wrappedJSObject.WindowManager
      .getRunningApps()[tab.wrappedJSObject.WindowManager.getDisplayedApp()];
    app.reload();
  }
}
window.worflow = new Workflow();
}();
