function HostingProvider(id, name, auth, keys, urls) {
  this.id      = id;
  this.name    = name;
  this.auth    = auth;
  this.keys    = keys;
  this.urls    = urls;
  this.creds   = undefined;
  if (this.auth != false) {
    this.credsdb = new CredentialsDB(this.id);
    this.credsdb.onready = this.readyCreds.bind(this);
  }
}

HostingProvider.prototype.readyCreds = function() {
  var self = this;
  this.credsdb.getcreds(function(res) {
    self.creds = res;
  });
};

HostingProvider.prototype.extractOAuth1AccessTokens = function(string) {
  var res = {};
  var ar = string.split('&');
  for (var id in ar) {
    var param = ar[id].split('=');
    res[param[0]] = param[1];
  }
  return res;
};

HostingProvider.prototype.buildOAuth1URL = function(url, method, parameters) {
  if (this.creds.length > 0) {
    this.keys.token = this.creds[0].oauth_token;
    this.keys.tokenSecret = this.creds[0].oauth_token_secret;
  }

  var message = {
    action: url,
    method: method,
    parameters: parameters
  };

  OAuth.completeRequest(message, this.keys);
  OAuth.SignatureMethod.sign(message, this.keys);
  return url + '?' + OAuth.formEncode(message.parameters);
};

HostingProvider.prototype.processOAuth1XHR = function(url, method, params, callback) {
  var target_url = this.buildOAuth1URL(url, method, params);
  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open(method, target_url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      callback(xhr);
    }
  };
  xhr.send();
};

HostingProvider.prototype.performOAuth1Login = function() {
  ImageUploader.setStatus('Starting ' + this.name + ' authentication');
  var self = this;
  this.processOAuth1XHR(
    this.urls['oauth_request_token'],
    'POST',
    {oauth_callback: 'oob'},
    function(xhr) {
      if (xhr.status != 200) {
        alert('Request refused:' + xhr.status);
        return;
      }
      if (xhr.responseText.match('oauth_token=')) {
        ImageUploader.setStatus('Extracting ' + self.name + ' temporary token');
        var request_token_regex =
          new RegExp('oauth_token=(.*)&oauth_token_secret=.*');
        var request_token_ar = request_token_regex.exec(xhr.responseText);
        var request_token_full = request_token_ar[0];
        var request_token_only = request_token_ar[1];
        var authorize =
          self.urls['oauth_authorize'] + '?' + request_token_full;
        var twauth = document.getElementById('confirm-twitter-auth');
        twauth.style.display = 'block';
        var cancel = document.getElementById('twitter-auth-cancel');
        cancel.addEventListener(
          'click',
          function(evt) {
            ImageUploader.setStatus(self.name + ' authentication canceled');
            twauth.style.display = 'none';
          },
          false);
        var cont = document.getElementById('twitter-auth-continue');
        cont.addEventListener(
          'click',
          function(evt) {
            twauth.style.display = 'none';
            new MozActivity(
              {
                name: 'view',
                data: {type: 'url', url: authorize}
              }
            );
            var twpin = document.getElementById('twitter-pin');
            twpin.style.display = 'block';
            document.getElementById('twitter-pin-continue').addEventListener(
              'click',
              function(evt) {
                var pin = document.getElementById('twitter-pincode').value;
                twpin.style.display = 'none';
                ImageUploader.setStatus('Confirming ' + self.name + ' PIN code');
                self.processOAuth1XHR(
                  self.urls['oauth_access_token'],
                  'POST',
                  {oauth_verifier: pin, oauth_token: request_token_only},
                  function(xhr) {
                    if (xhr.status != 200) {
                      alert(
                        'Request refused:',
                        xhr.status, '::',
                        xhr.responseText);
                      return;
                    }
                    var twitter_account =
                      self.extractOAuth1AccessTokens(xhr.responseText);
                    self.credsdb.setcreds(twitter_account, function(res) {
                      if (res == null) {
                        ImageUploader.setStatus(self.name + ' account configured.');
                        self.updateCredentials();
                      } else {
                        alert('An error occured:', JSON.stringify(res));
                      }
                    });
                  });
              },
              false);
          },
          false);
      } else {
        alert('Cannot request token.');
      }
  });
};

HostingProvider.prototype.XHRUpload = function(url, data, callback) {
  ImageUploader.setStatus('Ready to upload');
  var xhr = new XMLHttpRequest({mozSystem: true});
  xhr.open('POST', url, true);
  xhr.upload.addEventListener('progress', function(e) {
    if (e.lengthComputable) {
      ImageUploader.setProgress(e.loaded, e.total);
    }
  }, false);
  xhr.upload.addEventListener('load', function(e) {
      ImageUploader.setProgress(e.loaded, e.total);
  }, false);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      ImageUploader.unlock();
      ImageUploader.setStatus('Uploaded, treating response.');
      callback(xhr);
    }
  };
  xhr.send(data);
  ImageUploader.setStatus('Uploading ...');
};

HostingProvider.prototype.updateCredentials = function() {
  ImageUploader.purge('credentials-status');
  var self = this;
  var container = document.getElementById('credentials-status');
  this.credsdb.getcreds(function(res) {
    var creds = res;
    if (creds.length == 0) {
      // no credential, let user login on twitter
      var loginButton = document.createElement('button');
      loginButton.id = 'login-twitter';
      loginButton.innerHTML = 'Login on ' + self.name;
      loginButton.onclick = self.performOAuth1Login.bind(self);
      container.appendChild(loginButton);
    } else {
      // found some credentials, let's use them!
      var revokeButton = document.createElement('button');
      revokeButton.className = 'negative';
      revokeButton.id = 'revoke-twitter';
      revokeButton.innerHTML =
        'Revoke \'' + creds[0].screen_name + '\' credentials';
      revokeButton.onclick = self.revokeCredentials.bind(self);
      container.appendChild(revokeButton);
    }
  });
};

HostingProvider.prototype.revokeCredentials = function() {
  var self = this;
  var conf = document.getElementById('confirm-twitter-revoke');
  conf.style.display = 'block';
  document.getElementById('twitter-revoke-cancel').addEventListener(
    'click',
    function(evt) {
      conf.style.display = 'none';
    },
    false
  );
  document.getElementById('twitter-revoke-revoke').addEventListener(
    'click',
    function(evt) {
      self.credsdb.delcreds(self.creds[0].screen_name, function(res) {
        conf.style.display = 'none';
        if (res == null) {
          ImageUploader.setStatus('Your ' + self.name + ' account is now revoked!');
          self.updateCredentials();
        } else {
          alert('An error occured:', JSON.stringify(res));
        }
      });
    },
    false
  );
};



var files = undefined;

var ImageUploader = {
  services: [],

  init: function() {
    var HostingCanardPC = new HostingProvider('cpc', 'CanardPC', false, {}, {'upload': 'http://tof.canardpc.com/'});
    HostingCanardPC.upload = function () {
      var picture = new FormData();
      picture.append('email', '');
      picture.append('envoyer', 'envoyer');
      picture.append('fichier', source);

      var self = this;
      this.XHRUpload(self.urls['upload'], picture, function(xhr) {
        if (xhr.responseText.match(self.urls['upload'] + 'show/')) {
          var re = new RegExp(self.urls['upload'] + 'show/(.*).html');
          var ar = re.exec(xhr.responseText);
          var pid = ar[1];
          var up = ar[0];
          ImageUploader.setStatus('Uploaded successfully: ' + pid);
          callback(up);
        } else {
          ImageUploader.setStatus('Error while uploading!');
        }
      });
    };

    var HostingTwitter = new HostingProvider(
      'twitter', 'Twitter', 'oauth1',
      {
        token: null,
        tokenSecret: null,
        consumerKey: 'wNJ9YztlCeboNx8cyfHliA',
        consumerSecret: 'LH9tN8IbhRINsCRJlAQqNM479fGp6SDtNfxoKZKLBFA'
      },
      {
        'upload': 'https://upload.twitter.com/1/statuses/update_with_media.json',
        'oauth_request_token': 'https://api.twitter.com/oauth/request_token',
        'oauth_authorize': 'https://api.twitter.com/oauth/authorize',
        'oauth_access_token': 'https://api.twitter.com/oauth/access_token'
      }
    );
    HostingTwitter.addContent = function() {
      var container = document.getElementById('service-content');
      if (container == undefined) {
        return;
      }

      var label = document.createElement('label');
        label.id  = 'label-twitter-message';
        label.for = 'twitter-message';
        label.innerHTML = 'Your Tweet:';
      var textarea = document.createElement('textarea');
        textarea.id = 'twitter-message';
        textarea.className = 'message';
        textarea.rows = 3;
        textarea.cols = 50;
        textarea.maxlength = 140;
        textarea.addEventListener('focus', ImageUploader.hideBannerStatus, false);
      var p = document.createElement('p');
        p.id = 'credentials-status';

      container.appendChild(label);
      container.appendChild(textarea);
      container.appendChild(p);

      this.updateCredentials();
    };
    HostingTwitter.upload = function(source, callback) {
      var twmsg = document.getElementById('twitter-message');

      if (twmsg == undefined) {
        alert('No Twitter message');
        ImageUploader.unlock();
        return;
      }

      var twstatus = twmsg.value;
      if (twstatus == undefined || twstatus == '') {
        alert('No status, cannot send tweet.');
        ImageUploader.unlock();
        return;
      }

      if (twstatus.length > 140) {
        alert('Tweet is too long (' + twstatus.length + '), maximum is 140.');
        ImageUploader.unlock();
        return;
      }

      var url = this.buildOAuth1URL(
        this.urls['upload'],
        'POST',
        {include_entities: true, status: twstatus}
      );

      var picture = new FormData();
      picture.append('media', source);

      this.XHRUpload(url, picture, function(xhr) {
        var json = JSON.parse(xhr.responseText);
        var id_str = json.entities.media[0].id_str;
        var ex_url = json.entities.media[0].expanded_url;
        ImageUploader.setStatus('Uploaded successfully: ' + id_str);
        callback(ex_url);
      });
    };

    var HostingImgur = new HostingProvider('imgur', 'Imgur', false, {'apiKey': '4fa922afa12ef6b38c0b5b5e6e548a4f'}, {'upload': 'http://api.imgur.com/2/upload.json'});
    HostingImgur.upload = function(source, callback) {
      var picture = new FormData();
      picture.append('key', this.keys['apiKey']);
      picture.append('image', source);

      this.XHRUpload(this.urls['upload'], picture, function(xhr) {
        var json = JSON.parse(xhr.responseText);
        var link = json.upload.links.imgur_page;
        var img = json.upload.image.hash;
        if (link == undefined) {
          ImageUploader.setStatus('Error while uploading!');
        } else {
          ImageUploader.setStatus('Uploaded successfully: ' + img);
          callback(link);
        }
      });
    };

    this.services.push(HostingCanardPC);
    this.services.push(HostingTwitter);
    this.services.push(HostingImgur);

    this.createServicesList();

    this.setup();
  },

  createServiceListEntry: function(service) {
    var container = document.getElementById('services-list');
    if (container == undefined) {
      return;
    }

    var li = document.createElement('li')

    var img = document.createElement('img');
    // img.src = 'dummy';
    var label = document.createElement('label');
    label.className = 'check';
      var input = document.createElement('input');
      input.type = 'checkbox'
      input.name = service.id;
      input.id = 'upload-' + service.id;
      input.addEventListener('click', this.enableOnly.bind(this), false);
      var span = document.createElement('span');

      label.appendChild(input)
      label.appendChild(span);

    var dl = document.createElement('dl');
      var dt = document.createElement('dt');
      dt.innerHTML = service.name;
      var dd = document.createElement('dd');
        var span2 = document.createElement('span');
        span2.innerHTML = service.auth == false ? 'anonymous' : service.auth;

        dd.appendChild(span2);

      dl.appendChild(dt);
      dl.appendChild(dd);

    li.appendChild(img);
    li.appendChild(label);
    li.appendChild(dl);

    container.appendChild(li);
  },

  createServicesList: function() {
    for (var s in this.services) {
      this.createServiceListEntry(this.services[s]);
    }
  },

  enableOnly: function(evt) {
    var toKeep = evt.target.id;
    this.purge('service-content');
    for (var service in this.services) {
      var s = this.services[service];
      var c = document.getElementById('upload-' + s.id);
      if (('upload-' + s.id) != toKeep) {
        c.checked = false;
      } else {
        if (s.addContent) {
          s.addContent();
        }
      }
    }
  },

  setup: function() {
    document.getElementById('share')
      .addEventListener('click', share, false);
  },

  purge: function(id) {
    var prevs = document.getElementById(id);
    if (prevs) {
      while (prevs.hasChildNodes()) {
        prevs.removeChild(prevs.lastChild);
      }
    }
  },

  clean: function() {
    files = {};
    this.hideBannerStatus();
    ImageUploader.setProgress(0.0, 0.0);
    this.purge('previews');
    this.purge('link');
    ImageUploader.unlock();
  },

  setBannerStatus: function(visible) {
    var bs = document.getElementById('banner-status');
    if (visible) {
      bs.style.display = 'block';
    } else {
      bs.style.display = 'none';
    }
  },

  showBannerStatus: function() {
    ImageUploader.setBannerStatus(true);
  },

  hideBannerStatus: function() {
    ImageUploader.setBannerStatus(false);
  },

  lock: function() {
    document.getElementById('share').disabled = true;
  },

  unlock: function() {
    document.getElementById('share').disabled = false;
  },

  setStatus: function(msg) {
    ImageUploader.showBannerStatus();
    document.getElementById('uploaded').innerHTML = msg;
  },

  setProgress: function(level, max) {
    var prcent = 0.0;
    if (max > 0.0) {
      prcent = ((level * 1.0) / (max)) * 100;
    }
    document.getElementById('upload-progress').value = prcent;
  }
};

window.onload = function() {
  ImageUploader.init();
  ImageUploader.clean();
  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler('activity', function(activityRequest) {
      if (activityRequest.source.name === 'share-filenames') {
        addImages(activityRequest.source.data.filenames);
      }
    });
  }
};

function finalize(url) {
  ImageUploader.clean();
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
  var services =
    document
    .getElementById('services')
    .getElementsByTagName('input');
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
  ImageUploader.setStatus('Starting to share');
  var services = getSelectedServices();
  if (services.length > 0) {
    for (var sn in services) {
      ImageUploader.lock();
      var serv = services[sn];
      var previews = document.getElementById('previews');
      var imgs = previews.getElementsByTagName('img');
      for (var i in imgs) {
        var img_url = imgs[i].src;
        if (img_url != undefined) {
          var img = files[img_url];
          ImageUploader.setStatus('Preparing upload');
	  for (var sid in ImageUploader.services) {
            var sup = ImageUploader.services[sid];
	    if (serv == ('upload-' + sup.id)) {
              sup.upload(img, finalize);
	    }
	  }
        }
      }
    }
  }
}

