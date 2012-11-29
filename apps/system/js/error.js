
function closeWindow() {
  window.close();
}

function reloadWindow(url) {
  document.location.replace(url);
}

var extractParams = function extractParams(url) {
  if (!url)
    return null;

  var rv = {};
  var params = url.split('&');
  for (var i = 0; i < params.length; i++) {
    var param = params[i].split('=');
    rv[param[0]] = param[1];
  }
  return rv;
}

window.addEventListener('localized', function onload(e) {
  var title = document.getElementById('title');
  var message = document.getElementById('message');
  var _ = navigator.mozL10n.get;

  var params = extractParams(document.location.search.slice(1));
  var type = params['type'];
  var name = decodeURIComponent(params['name']);
  switch (type) {
    case 'airplane':
      title.textContent = _('airplane-is-on');
      message.textContent = _('airplane-is-turned-on', {name: name});
      break;

    case 'offline':
      title.textContent = _('network-connection-unavailable');
      message.textContent = _('network-error', {name: name});
      break;

    case 'other':
      title.textContent = _('error-title', {name: name});
      message.textContent = _('error-message', {name: name});
      break;
  }

  document.getElementById('close').onclick = closeWindow;
  document.getElementById('reload').onclick = function() {
    reloadWindow(params['origin'])
  };
});
