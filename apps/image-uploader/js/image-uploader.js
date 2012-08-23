var files = undefined;
var creds = undefined;
var creds_twitter = new CredentialsDB('twitter');
creds_twitter.onready = updateTwitterCredentials;

window.onload = function() {
  navigator.mozSetMessageHandler('activity', function(activityRequest) {
    if (activityRequest.source.name === 'share-filenames') {
      clean();
      addImages(activityRequest.source.data.filenames);
    }
  });
};

function uploadCanardPc(source, callback) {
  var url = 'http://tof.canardpc.com/';

  var picture = new FormData();
  picture.append('email', '');
  picture.append('envoyer', 'envoyer');
  picture.append('fichier', source);

  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open('POST', url, true);
  xhr.upload.addEventListener('progress', function(e) {
    if (e.lengthComputable) {
      setProgress(e.loaded, e.total);
    }
  }, false);
  xhr.upload.addEventListener('load', function(e) {
      setProgress(e.loaded, e.total);
  }, false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.responseText.match(url + 'show/')) {
          var re = new RegExp(url + 'show/(.*).html');
          var ar = re.exec(xhr.responseText);
          var pid = ar[1];
          var up = ar[0];
          setStatus('Uploaded successfully: ' + pid);
          callback(up);
        } else {
          setStatus('Error while uploading!');
        }
      unlock();
    }
  };
  xhr.send(picture);
}

function updateTwitterCredentials() {
  // console.log("Updating Twitter credentials");
  purge('credentials-status');
  var container = document.getElementById('credentials-status');
  creds_twitter.getcreds(function(res) {
    creds = res;
    // console.log(
    //  "Twitter credentials (" + creds.length + "):",
    //  JSON.stringify(creds));
    if (creds.length == 0) {
      // no credential, let user login on twitter
      var loginButton = document.createElement('input');
      loginButton.type = 'button';
      loginButton.id = 'login-twitter';
      loginButton.value = 'Login on Twitter';
      loginButton.onclick = loginTwitter;
      container.appendChild(loginButton);
    } else {
      // found some credentials, let's use them!
      var screenName = document.createElement('span');
      screenName.className = 'logged twitter';
      screenName.innerHTML = 'Logged as ' + creds[0].screen_name;
      var revokeButton = document.createElement('input');
      revokeButton.type = 'button';
      revokeButton.id = 'revoke-twitter';
      revokeButton.value = 'Revoke Twitter creds';
      revokeButton.onclick = revokeTwitter;
      container.appendChild(screenName);
      container.appendChild(revokeButton);
    }
  });
}

function buildTwitterURL(url, method, parameters) {
  var accessor = {
    token: null,
    tokenSecret: null,
    consumerKey: 'wNJ9YztlCeboNx8cyfHliA',
    consumerSecret: 'LH9tN8IbhRINsCRJlAQqNM479fGp6SDtNfxoKZKLBFA'
  };

  if (creds.length > 0) {
    accessor.token = creds[0].oauth_token;
    accessor.tokenSecret = creds[0].oauth_token_secret;
  }

  var message = {
    action: url,
    method: method,
    parameters: parameters
  };

  OAuth.completeRequest(message, accessor);
  OAuth.SignatureMethod.sign(message, accessor);
  return url + '?' + OAuth.formEncode(message.parameters);
}

function processTwitterXHR(url, method, params, callback) {
  var target_url = buildTwitterURL(url, method, params);
  var xhr = new XMLHttpRequest({mozSystem: true});
  // console.log("OAuth:", target_url);
  xhr.open(method, target_url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      callback(xhr);
    }
  };
  xhr.send();
}

function extractTwitterAccessToken(string) {
  var res = {};
  var ar = string.split('&');
  for (var id in ar) {
    var param = ar[id].split('=');
    res[param[0]] = param[1];
  }
  return res;
}

function loginTwitter() {
  processTwitterXHR(
    'https://api.twitter.com/oauth/request_token',
    'POST',
    {oauth_callback: 'oob'},
    function(xhr) {
      if (xhr.status != 200) {
        alert('Request refused:', xhr.status);
        return;
      }
      if (xhr.responseText.match('oauth_token=')) {
        var request_token_regex =
          new RegExp('oauth_token=(.*)&oauth_token_secret=.*');
        var request_token_ar = request_token_regex.exec(xhr.responseText);
        var request_token_full = request_token_ar[0];
        var request_token_only = request_token_ar[1];
        var authorize =
          'https://api.twitter.com/oauth/authorize?' + request_token_full;
        alert('We now need that you authorize our application. A browser' +
          ' window will get you to Twitter website, where you will be able to' +
          ' authenticate yourself and to authorize us. It will give you a PIN' +
          ' code. Please keep it, get back here and fill it in the prompt.');
        new MozActivity({name: 'view', data: {type: 'url', url: authorize}});
        var pin = prompt('Please enter PIN code given by Twitter:');
        processTwitterXHR(
          'https://api.twitter.com/oauth/access_token',
          'POST',
          {oauth_verifier: pin, oauth_token: request_token_only},
          function(xhr) {
            if (xhr.status != 200) {
              alert('Request refused:', xhr.status, '::', xhr.responseText);
              return;
            }
            var twitter_account = extractTwitterAccessToken(xhr.responseText);
            // console.log("Extracted twitter_account:",
            //   JSON.stringify(twitter_account));
            creds_twitter.setcreds(twitter_account, function(res) {
              if (res == null) {
                alert('Your Twitter account is now usable!');
                updateTwitterCredentials();
              } else {
                alert('An error occured:', JSON.stringify(res));
              }
            });
          });
      } else {
        alert('Cannot request token.');
      }
  });
}

function revokeTwitter() {
  creds_twitter.delcreds(creds[0].screen_name, function(res) {
    if (res == null) {
      alert('Your Twitter account is now revoked!');
      updateTwitterCredentials();
    } else {
      alert('An error occured:', JSON.stringify(res));
    }
  });
}

function uploadTwitter(source, callback) {
  var twmsg = document.getElementById('twitter-message');

  if (twmsg == undefined) {
    alert('No Twitter message');
    unlock();
    return;
  }

  var twstatus = twmsg.value;
  if (twstatus == undefined || twstatus == '') {
    alert('No status, cannot send tweet.');
    unlock();
    return;
  }

  if (twstatus.length > 140) {
    alert('Tweet is too long (' + twstatus.length + '), maximum is 140.');
    unlock();
    return;
  }

  var url = buildTwitterURL(
    'https://upload.twitter.com/1/statuses/update_with_media.json',
    'POST',
    {include_entities: true, status: twstatus}
  );
  // console.log("Twitter API URL:", url);

  var picture = new FormData();
  picture.append('media', source);

  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open('POST', url, true);
  xhr.upload.addEventListener('progress', function(e) {
    if (e.lengthComputable) {
      setProgress(e.loaded, e.total);
    }
  }, false);
  xhr.upload.addEventListener('load', function(e) {
      setProgress(e.loaded, e.total);
  }, false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      // console.log("Got reply from Twitter");
      var json = JSON.parse(xhr.responseText);
      var id_str = json.entities.media[0].id_str;
      var ex_url = json.entities.media[0].expanded_url;
      setStatus('Uploaded successfully: ' + id_str);
      callback(ex_url);
      unlock();
    }
  };
  xhr.send(picture);
}

function uploadImgur(source, callback) {
  var apikey = '4fa922afa12ef6b38c0b5b5e6e548a4f';
  var url = 'http://api.imgur.com/2/upload.json';

  var picture = new FormData();
  picture.append('key', apikey);
  picture.append('image', source);

  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open('POST', url, true);
  xhr.upload.addEventListener('progress', function(e) {
    if (e.lengthComputable) {
      setProgress(e.loaded, e.total);
    }
  }, false);
  xhr.upload.addEventListener('load', function(e) {
      setProgress(e.loaded, e.total);
  }, false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      var json = JSON.parse(xhr.responseText);
      var link = json.upload.links.imgur_page;
      var img = json.upload.image.hash;
      if (link == undefined) {
        setStatus('Error while uploading!');
      } else {
        setStatus('Uploaded successfully: ' + img);
        callback(link);
      }
      unlock();
    }
  };
  xhr.send(picture);
}

function finalize(url) {
  var zoneResults = document.getElementById('link');
  if (zoneResults) {
    var link = document.createElement('a');
    link.href = url;
    link.textContent = 'Link to uploaded';
    zoneResults.appendChild(link);
  }

  new MozActivity({
    name: 'view',
    data: {
      type: 'url',
      url: url
    }
  });
}

function addImages(filenames) {
  var storage = navigator.getDeviceStorage('pictures');
  filenames.forEach(function(filename) {
    storage.get(filename).onsuccess = function(e) {
      var blob = e.target.result;
      var url = URL.createObjectURL(blob);
      var holder = document.getElementById('previews');
      var img = document.createElement('img');
      img.style.width = '85%';
      img.src = url;
      files[url] = blob;
      img.onload = function() { URL.revokeObjectURL(this.src); };
      holder.appendChild(img);
    };
  });
}

function getSelectedServices() {
  var services = document.getElementsByTagName('input');
  var selectedServices = [];
  for (var service in services) {
    var s = services[service];
    if (s.type === 'checkbox' && s.checked === true) {
      selectedServices.push(s.id);
    }
  }
  return selectedServices;
}

function share() {
  var services = getSelectedServices();
  if (services.length > 0) {
    for (var sn in services) {
      lock();
      var serv = services[sn];
      var previews = document.getElementById('previews');
      var imgs = previews.getElementsByTagName('img');
      for (var i in imgs) {
              var img_url = imgs[i].src;
        if (img_url != undefined) {
          var img = files[img_url];
          switch (serv) {
            case 'upload-canardpc':
              uploadCanardPc(img, finalize);
              break;
            case 'upload-twitter':
              uploadTwitter(img, finalize);
              break;
            case 'upload-imgur':
              uploadImgur(img, finalize);
              break;
          }
        }
      }
    }
  }
}

function purge(id) {
  var prevs = document.getElementById(id);
  if (prevs) {
    while (prevs.hasChildNodes()) {
      prevs.removeChild(prevs.lastChild);
    }
  }
}

function clean() {
  files = {};
  setStatus('');
  setProgress(0.0, 0.0);
  document.getElementById('twitter-message').value = '';
  purge('previews');
  purge('link');
  unlock();
}

function lock() {
  document.getElementById('share').disabled = true;
}

function unlock() {
  document.getElementById('share').disabled = false;
}

function setStatus(msg) {
  document.getElementById('uploaded').value = msg;
}

function setProgress(level, max) {
  document.getElementById('progress').value = level + '/' + max;
}
