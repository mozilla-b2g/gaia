var activityRequest;
document.getElementById('go').onclick = function _go() {
  var a = new MozActivity(
    {
      name: 'test',
      data: {
        type: 'inline'
      }
    }
  );

  a.onsuccess = function () {
    document.getElementById('result').textContent = this.result.text;
  };

  a.onerror = function() {
    document.getElementById('result').textContent = '(canceled)';
  };
};


var webActivityHandler = function (request) {
  activityRequest = request;

  document.getElementById('button').disabled = '';
  document.getElementById('cancelButton').disabled = '';
  document.getElementById('number').focus();

};

window.onload = function () {
  document.getElementById('button').onclick = go;
  document.getElementById('cancelButton').onclick = cancel;
  document.getElementById('promptButton').onclick = promptButton;

  // If the app is being loaded because a inline disposition web activity,
  // it will came with a pending system message.
  if (!navigator.mozHasPendingMessage('activity')) {
    console.warn('This application is not intend to launch directly.');
  } else {
    // Register for activity system message handling.
    // Do NOT register for message handling on the main app frame.
    
  }
  navigator.mozSetMessageHandler('activity', webActivityHandler);
};

var go = function go() {
  if (!activityRequest) {
    alert('There are no any pending activity request.');
    return;
  }

  // Return the request
  activityRequest.postResult({
    type: 'inline',
    text: 'Hello back!'
  });
  activityRequest = null;

  // close app, currently useless,
  // see https://bugzilla.mozilla.org/show_bug.cgi?id=789392
  window.close();
};

var cancel = function cancel() {
  if (!activityRequest) {
    alert('There are no any pending activity request.');
    return;
  }

  activityRequest.postError('canceled');
  activityRequest = null;

  // close app, currently useless,
  // see https://bugzilla.mozilla.org/show_bug.cgi?id=789392
  window.close();
};

var promptButton = function promptButton() {
  var a = prompt('inline-activty prompt!');
  document.getElementById('result').textContent = a;
};

// When the app is being closed or killed, we will cancel the pending
// request.
document.addEventListener('visibilitychange', function visibility(e) {
  if (!document.hidden || !activityRequest)
    return;

  activityRequest.postError('canceled');
  activityRequest = null;
});
