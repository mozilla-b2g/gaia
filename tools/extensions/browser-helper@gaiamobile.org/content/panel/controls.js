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

function sendEvent(type, details) {
  var event = tab.CustomEvent(type, details);
  tab.dispatchEvent(event);
}

function takeScreenshot() {
  var canvas = document.createElementNS('http://www.w3.org/1999/xhtml',
                                            'canvas');
  var width = tab.innerWidth;
  var height = tab.innerHeight;
  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);

  var context = canvas.getContext('2d');
  var flags =
    context.DRAWWINDOW_DRAW_CARET |
    context.DRAWWINDOW_DRAW_VIEW |
    context.DRAWWINDOW_USE_WIDGET_LAYERS;
  context.drawWindow(tab, 0, 0, width, height,
                     'rgb(255,255,255)', flags);

  sendChromeEvent({
    type: 'take-screenshot-success',
    file: canvas.mozGetAsFile('screenshot', 'image/png')
  });
}


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
    var wm = tab.wrappedJSObject.WindowManager
    var app = wm.getRunningApps()[wm.getDisplayedApp()];
    app.reload();
  },

  screenshot: function() {
    takeScreenshot();
  }
}
window.workflow = new Workflow();

}();
