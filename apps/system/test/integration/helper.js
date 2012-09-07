if (typeof(testSupport) === 'undefined') {
  var testSupport = {};
}

testSupport.system = {
  chromeEvent: function(device, details) {
    var args = [];

    if (typeof(name) === 'string') {
      details = { type: details };
    }

    args.push(details);

    // remember this is toString'ed
    // and sent over the wire at some point
    // to the device so we can't use
    // static scope magic to help us here.
    device.executeScript(function(details) {
      var browser = Services.wm.getMostRecentWindow('navigator:browser');
      var content = browser.getContentWindow();
      var events = [];

      if (!content) {
        return;
      }

      if (!Array.isArray(details)) {
        details = [details];
      }

      var i = 0;
      var len = details.length;

      for (; i < len; i++) {
        let event = content.document.createEvent('CustomEvent');
        event.initCustomEvent(
          'mozChromeEvent', true, true, ObjectWrapper.wrap(details[i], content)
        );

        content.dispatchEvent(event);
      }

    }, args, MochaTask.nextNodeStyle);
  }
};
