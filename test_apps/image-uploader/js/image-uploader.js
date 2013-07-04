/* vim: set ts=2 sw=2 et: */

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
  var res = {'provider': this.auth};
  var ar = string.split('&');
  for (var id in ar) {
    var param = ar[id].split('=');
    res[param[0]] = param[1];
  }
  return res;
};

HostingProvider.prototype.performLogin = function() {
  if (this.auth == false) {
    return true;
  }

  if (this.auth == 'oauth1') {
    return this.performOAuth1Login();
  }

  return false;
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
  return OAuth.addToURL(url, message.parameters);
};

HostingProvider.prototype.buildOAuth1Form = function(url, method, parameters) {
  var keys = this.keys;
  if (this.creds.length > 0) {
    this.keys.token = this.creds[0].oauth_token;
    this.keys.tokenSecret = this.creds[0].oauth_token_secret;
  }

  var message = {
    action: url,
    method: method,
    parameters: parameters
  };

  OAuth.completeRequest(message, keys);
  OAuth.SignatureMethod.sign(message, keys);
  return message.parameters;
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

HostingProvider.prototype.OAuth1BuildDialogNotif = function(url) {
  ImageUploader.hideBannerStatus();
  var section = document.createElement('section');
  section.setAttribute('role', 'dialog');
  section.id = 'confirm-auth';

  var div = document.createElement('div');
  var h3 = document.createElement('h3');
  h3.innerHTML = 'Confirmation';
  var div2 = document.createElement('div');
  div2.className = 'content';
  var img = document.createElement('img');
  img.src = this.urls['confirm-img'];
  var strong = document.createElement('strong');
  strong.innerHTML = this.name;
  var small = document.createElement('small');
  small.innerHTML = 'Authorization';
  div2.appendChild(img);
  div2.appendChild(strong);
  div2.appendChild(small);

  var p = document.createElement('p');
  p.innerHTML = 'We now need that you authorize our application. A browser' +
    'window will get you to ' + this.name + ' website, where you will be able' +
    'to authenticate yourself and to authorize us. It will give you a PIN' +
    'code. Please keep it, get back here and fill it in the prompt.';
  div.appendChild(h3);
  div.appendChild(div2);
  div.appendChild(p);

  var menu = document.createElement('menu');
  menu.dataset.items = 2;
  var bcancel = document.createElement('button');
  bcancel.id = 'auth-cancel';
  bcancel.innerHTML = 'Cancel';
  var bcontinue = document.createElement('button');
  bcontinue.id = 'auth-continue';
  bcontinue.innerHTML = 'Continue';
  bcontinue.className = 'affirmative';
  menu.appendChild(bcancel);
  menu.appendChild(bcontinue);

  var self = this;
  bcancel.addEventListener('click', function(evt) {
    document.body.removeChild(document.getElementById('confirm-auth'));
    ImageUploader.setStatus(self.name + ' authentication canceled');
  }, false);
  bcontinue.addEventListener('click', function(evt) {
    document.body.removeChild(document.getElementById('confirm-auth'));
    try {
    new MozActivity(
      {
        name: 'view',
        data: {type: 'url', url: url}
      }
    );
    } catch (e) {
      alert(url);
    }
    self.OAuth1BuildDialogPIN();
  }, false);

  section.appendChild(div);
  section.appendChild(menu);

  document.body.appendChild(section);
};

HostingProvider.prototype.OAuth1BuildDialogPIN = function(url) {
  ImageUploader.hideBannerStatus();
  var section = document.createElement('section');
  section.setAttribute('role', 'dialog');
  section.id = 'confirm-pin';

  var div = document.createElement('div');
  var h3 = document.createElement('h3');
  h3.innerHTML = 'Confirmation';
  var div2 = document.createElement('div');
  div2.className = 'content';
  var img = document.createElement('img');
  var strong = document.createElement('strong');
  strong.innerHTML = this.name;
  var small = document.createElement('small');
  small.innerHTML = 'Authorization';
  div2.appendChild(img);
  div2.appendChild(strong);
  div2.appendChild(small);

  var p = document.createElement('p');
  p.innerHTML = 'Please enter PIN code given by ' + this.name;
  var input = document.createElement('input');
  input.type = 'text';
  input.id = 'pincode';
  input.placeholder = 'PIN Code';
  div.appendChild(h3);
  div.appendChild(div2);
  div.appendChild(p);
  div.appendChild(input);

  var menu = document.createElement('menu');
  menu.dataset.items = 1;
  var bcontinue = document.createElement('button');
  bcontinue.id = 'pin-continue';
  bcontinue.innerHTML = 'Continue';
  bcontinue.className = 'affirmative';
  menu.appendChild(bcontinue);

  var self = this;
  bcontinue.addEventListener('click', function(evt) {
    var pin = document.getElementById('pincode').value;
    document.body.removeChild(document.getElementById('confirm-pin'));
    ImageUploader.setStatus('Confirming ' + self.name + ' PIN code');
    self.processOAuth1XHR(
      self.urls['oauth_access_token'],
      'POST',
      {oauth_verifier: pin, oauth_token: self.request_token_only},
      function(xhr) {
        if (xhr.status != 200) {
          alert(
            'Request refused:' +
            xhr.status + '::' +
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
      })
  }, false);

  section.appendChild(div);
  section.appendChild(menu);

  document.body.appendChild(section);
};

HostingProvider.prototype.OAuth1BuildDialogRevoke = function(callback) {
  ImageUploader.hideBannerStatus();
  var section = document.createElement('section');
  section.setAttribute('role', 'dialog');
  section.id = 'confirm-revoke';

  var div = document.createElement('div');
  var h3 = document.createElement('h3');
  h3.innerHTML = 'Confirmation';

  var p = document.createElement('p');
  p.innerHTML = 'Are you sure you want to revoke this ' + this.name + ' account?';
  div.appendChild(h3);
  div.appendChild(p);

  var menu = document.createElement('menu');
  menu.dataset.items = 2;
  var bcancel = document.createElement('button');
  bcancel.id = 'revoke-cancel';
  bcancel.innerHTML = 'Cancel';
  var bcontinue = document.createElement('button');
  bcontinue.id = 'revoke-continue';
  bcontinue.innerHTML = 'Revoke';
  bcontinue.className = 'negative';
  menu.appendChild(bcancel);
  menu.appendChild(bcontinue);

  bcancel.addEventListener('click', function(evt) {
    document.body.removeChild(document.getElementById('confirm-revoke'));
  }, false);
  bcontinue.addEventListener('click', function(evt) {
    document.body.removeChild(document.getElementById('confirm-revoke'));
    callback();
  }, false);

  section.appendChild(div);
  section.appendChild(menu);

  document.body.appendChild(section);
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
        alert('Request refused:' + xhr.status + '::' + xhr.responseText);
        return;
      }
      if (xhr.responseText.match('oauth_token=')) {
        ImageUploader.setStatus('Extracting ' + self.name + ' temporary token');
        var request_token_regex =
          new RegExp('oauth_token=(.*)&oauth_token_secret=(.*)');
        var request_token_ar = request_token_regex.exec(xhr.responseText);
        var request_token_full = request_token_ar[0];
        self.request_token_only = request_token_ar[1];
        self.keys.token = request_token_ar[1];
        self.keys.tokenSecret = request_token_ar[2];
        var authorize =
          self.urls['oauth_authorize'] + '?' + request_token_full;
        self.OAuth1BuildDialogNotif(authorize);
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
    self.creds = res;
    if (self.creds.length == 0) {
      // no credential, let user login on twitter
      var loginButton = document.createElement('button');
      loginButton.id = 'login-twitter';
      loginButton.innerHTML = 'Login on ' + self.name;
      loginButton.onclick = self.performLogin.bind(self);
      container.appendChild(loginButton);
    } else {
      // found some credentials, let's use them!
      var revokeButton = document.createElement('button');
      revokeButton.className = 'negative';
      revokeButton.id = 'revoke-twitter';
      revokeButton.innerHTML =
        'Revoke \'' + self.creds[0][self.urls['login']] + '\' credentials';
      revokeButton.onclick = self.revokeCredentials.bind(self);
      container.appendChild(revokeButton);
    }
  });
};

HostingProvider.prototype.revokeCredentials = function() {
  var self = this;
  this.OAuth1BuildDialogRevoke(function () {
    self.credsdb.delcreds(self.creds[0]['provider'], function(res) {
      if (res == null) {
        ImageUploader.setStatus('Your ' + self.name + ' account is now revoked!');
        self.creds = undefined;
        self.updateCredentials();
      } else {
        alert('An error occured:', JSON.stringify(res));
      }
    });
  });
};

var ImageUploader = {
  services: [],
  files: {},
  blobs: [],

  init: function() {
    var HostingCanardPC = new HostingProvider(
      'cpc', 'CanardPC', false, {}, {
        'upload': 'http://tof.canardpc.com/',
        'confirm-img': 'style/images/canardpc.jpg'}
      );
    HostingCanardPC.upload = function (source, callback) {
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
        'confirm-img': 'style/images/twitter-bird-light-bgs.png',
        'login': 'screen_name',
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

    var HostingImgur = new HostingProvider('imgur', 'Imgur', false,
      {'apiKey': '4fa922afa12ef6b38c0b5b5e6e548a4f'},
      {
        'upload': 'http://api.imgur.com/2/upload.json',
        'confirm-img': 'style/images/imgur-iphone.png'
      });
    HostingImgur.upload = function(source, callback) {
      var picture = new FormData();
      picture.append('key', this.keys['apiKey']);
      picture.append('image', source);

      this.XHRUpload(this.urls['upload'], picture, function(xhr) {
        var json = JSON.parse(xhr.responseText);
        if (json && json.upload) {
          var link = json.upload.links.imgur_page;
          var img = json.upload.image.hash;
          if (link == undefined) {
            ImageUploader.setStatus('Error while uploading!');
          } else {
            ImageUploader.setStatus('Uploaded successfully: ' + img);
            callback(link);
          }
        } else {
          alert("Imgur replied: " + xhr.responseText);
        }
      });
    };

    var HostingFlickr = new HostingProvider('flickr', 'Flickr', 'oauth1',
      {
        token: null,
        tokenSecret: null,
        consumerKey: '41b81b24b51f6c8041c33f80c73d4b78',
        consumerSecret: '892b7fd68851f509'
      },
      {
        'confirm-img': '',
        'login': 'username',
        'upload': 'https://secure.flickr.com/services/upload/',
        'picture_base': 'http://www.flickr.com/photos/',
        'oauth_request_token': 'https://secure.flickr.com/services/oauth/request_token',
        'oauth_authorize': 'https://secure.flickr.com/services/oauth/authorize',
        'oauth_access_token': 'https://secure.flickr.com/services/oauth/access_token'
      });
    HostingFlickr.addContent = function() {
      var container = document.getElementById('service-content');
      if (container == undefined) {
        return;
      }

      var title = document.createElement('input');
      title.id = 'flickr-title';
      title.type = 'text';
      title.placeholder = 'Title';

      var textarea = document.createElement('input');
      textarea.id = 'flickr-description';
      textarea.placeholder = 'Description (can contain some HTML)';

      var tags = document.createElement('input');
      tags.id = 'flickr-tags';
      tags.type = 'text';
      tags.placeholder = 'Tags (space separated)';

      container.appendChild(title);
      container.appendChild(textarea);
      container.appendChild(tags);

      var visibility = document.createElement('ul');
      visibility.dataset.state = 'edit';
      var visibles = [
        {name: 'Public', id: 'public', desc: 'Will be marked as public', default: true},
        {name: 'Friend', id: 'friend', desc: 'Will be marked as friend', default: false},
        {name: 'Family', id: 'family', desc: 'Will be marked as family', default: false},
      ];

      for (var id in visibles) {
        var e = visibles[id];
        var li = document.createElement('li');
        var img = document.createElement('img');
        var label = document.createElement('label');
        label.className = 'check';
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = e.default ? 'checked' : '';
        input.id = 'flickr-' + e.id;
        var span = document.createElement('span');

        label.classList.add('pack-checkbox');
        label.appendChild(input);
        label.appendChild(span);

        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = e.name;
        var dd = document.createElement('dd');
        var span2 = document.createElement('span');
        span2.innerHTML = e.desc;
        dd.appendChild(span2);

        dl.appendChild(dt);
        dl.appendChild(dd);

        li.appendChild(img);
        li.appendChild(label);
        li.appendChild(dl);
        visibility.appendChild(li);
      }

      container.appendChild(visibility);
      container.appendChild(document.createElement('br'));

      var lblSafety = document.createElement('label');
      lblSafety.for = 'flickr-safety';
      lblSafety.innerHTML = 'Safety level:';
      var safety = document.createElement('select');
      safety.id = 'flickr-safety';
      var safety_default = document.createElement('option');
      safety_default.innerHTML = 'Default';
      safety_default.value = '0';
      var secure = document.createElement('option');
      secure.innerHTML = 'Secure';
      secure.value = '1';
      var moderated = document.createElement('option');
      moderated.innerHTML = 'Moderated';
      moderated.value = '2';
      var restricted = document.createElement('option');
      restricted.innerHTML = 'Restricted';
      restricted.value = '3';

      safety.appendChild(safety_default);
      safety.appendChild(secure);
      safety.appendChild(moderated);
      safety.appendChild(restricted);

      container.appendChild(lblSafety);
      container.appendChild(safety);
      container.appendChild(document.createElement('br'));

      var lblType = document.createElement('label');
      lblType.for = 'flickr-type';
      lblType.innerHTML = 'Type:';
      var type = document.createElement('select');
      type.id = 'flickr-type';
      var type_default = document.createElement('option');
      type_default.innerHTML = 'Default';
      type_default.value = '0';
      var photo = document.createElement('option');
      photo.innerHTML = 'Classify as photo';
      photo.value = '1';
      var screen = document.createElement('option');
      screen.innerHTML = 'Classify as screenshot';
      screen.value = '2';
      var other = document.createElement('option');
      other.innerHTML = 'Classify as other';
      other.value = '3';

      type.appendChild(type_default);
      type.appendChild(photo);
      type.appendChild(screen);
      type.appendChild(other);

      container.appendChild(lblType);
      container.appendChild(type);
      container.appendChild(document.createElement('br'));

      var lblHide = document.createElement('label');
      lblHide.for = 'flickr-hide';
      lblHide.innerHTML = 'Hide:';
      var hide = document.createElement('select');
      hide.id = 'flickr-hide';
      var hide_default = document.createElement('option');
      hide_default.innerHTML = 'Default';
      hide_default.value = '0';
      var general = document.createElement('option');
      general.innerHTML = 'Hide from general searches';
      general.value = '1';
      var public = document.createElement('option');
      public.innerHTML = 'Hide from public searches';
      public.value = '2';

      hide.appendChild(hide_default);
      hide.appendChild(general);
      hide.appendChild(public);

      container.appendChild(lblHide);
      container.appendChild(hide);

      var p = document.createElement('p');
      p.id = 'credentials-status';

      container.appendChild(p);
      this.updateCredentials();
    };
    HostingFlickr.upload = function(source, callback) {
      var extraParams = {
        title: document.getElementById('flickr-title').value,
        description: document.getElementById('flickr-description').value,
        tags: document.getElementById('flickr-tags').value,
        is_public: document.getElementById('flickr-public').checked ? '1' : '0',
        is_friend: document.getElementById('flickr-friend').checked ? '1' : '0',
        is_family: document.getElementById('flickr-family').checked ? '1' : '0',
        safety_level: document.getElementById('flickr-safety').value,
        content_type: document.getElementById('flickr-type').value,
        hidden: document.getElementById('flickr-hide').value
      };

      var payload = this.buildOAuth1Form(
        this.urls['upload'],
        'POST',
        extraParams
      );

      var picture = new FormData();
      for (var param in payload) {
        picture.append(param, payload[param]);
      }
      picture.append('photo', source);

      var self = this;
      this.XHRUpload(this.urls['upload'], picture, function(xhr) {
        var id_regex =
          new RegExp('<photoid>(.*)<\/photoid>');
        var id_ar = id_regex.exec(xhr.responseText);
        if (id_ar.length > 1) {
          var id = id_ar[1];
          var ex_url = self.urls['picture_base'] + self.creds[0]['user_nsid'] + '/' + id + '/';
          ImageUploader.setStatus('Uploaded successfully: ');
          callback(ex_url);
        } else {
          alert('Error while uploading: ' + xhr.responseText);
        }
      });
    };

    // this.services.push(HostingCanardPC);
    this.services.push(HostingTwitter);
    this.services.push(HostingImgur);
    this.services.push(HostingFlickr);

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
    img.src = service.urls['confirm-img'];
    var label = document.createElement('label');
    label.className = 'pack-checkbox check';
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

  addImages: function(blobs) {
    this.blobs = blobs; // Save them for use by share
    blobs.forEach(function(blob, index) {
      var holder = document.getElementById('previews');
      var img = document.createElement('img');
      img.style.width = '85%';
      img.src = URL.createObjectURL(blob);
      img.onload = function() { URL.revokeObjectURL(img.src); };
      img.dataset.index = index;
      holder.appendChild(img);
    });
  },

  share: function() {
    this.setStatus('Starting to share');
    var services = this.getSelectedServices();
    if (!services ||!services.length) {
      return;
    }

    for (var sn in services) {
      this.lock();
      var serv = services[sn];
      var previews = document.getElementById('previews');
      var imgs = previews.getElementsByTagName('img');
      for (var i in imgs) {
        var index = parseInt(imgs[i].dataset.index);
        var blob = this.blobs[index];
        if (blob != undefined) {
          ImageUploader.setStatus('Preparing upload');
          for (var sid in ImageUploader.services) {
            var sup = ImageUploader.services[sid];
            if (serv == ('upload-' + sup.id)) {
              this.setStatus('Processing with upload');
              sup.upload(blob, this.finalize.bind(this));
            }
          }
        }
      }
    }
  },

  enableOnly: function(evt) {
    this.hideBannerStatus();
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

  finalize: function(url) {
    this.clean();
    new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
  },

  setup: function() {
    document.getElementById('share')
      .addEventListener('click', this.share.bind(this), false);
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
    this.files = {};
    this.hideBannerStatus();
    this.setProgress(0.0, 0.0);
    this.purge('previews');
    this.purge('link');
    this.unlock();
  },

  getSelectedServices: function() {
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
      if (activityRequest.source.name === 'share') {
        ImageUploader.addImages(activityRequest.source.data.blobs);
      }
    });
  }
};
