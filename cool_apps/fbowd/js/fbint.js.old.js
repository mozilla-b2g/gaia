/*
 *  Module: Facebook integration
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module allows to work with Facebook providing a deep integration
 *  between the Open Web Device and Facebook
 *
 *
 */
if(typeof window.owdFbInt === 'undefined') {
  (function(document) {
    'use strict';

    var owdFbInt = window.owdFbInt = {};

      // The access token
      var accessToken;
      // Application Id
      var appID = '323630664378726';
      // hash to get the token
      var hash = window.location.hash;
      // Access Token parameter
      var ACC_T = 'access_token';

      // Oauth dialog URI
      var oauthDialogUri = 'https://m.facebook.com/dialog/oauth?';

      // Contacts selected to be sync to the address book
      var selectedContacts = [];

      // The whole list of friends as an array
      var myFriends;

      // Query that retrieves the information about friends
      var FRIENDS_QUERY = 'SELECT uid,name,birthday_date,email, \
                          relationship_status, significant_other_id,
      FROM user\
                WHERE uid in (SELECT uid1 FROM friend WHERE uid2=me()) \
                ORDER BY name';

      var selButton = document.querySelector('#selunsel');
      var contactList = document.querySelector('#myFbContacts');

      // Canvas used to obtain the idata url images
      var canvas = document.createElement('canvas');
      canvas.hidden = true;

      var BLOCK_SIZE = 5;
      var nextBlock = BLOCK_SIZE + 3;

    /**
     *  Initialization function it tries to find an access token
     *
     */
    owdFbInt.init = function() {
      window.console.log("The hash is: ", hash);
      window.console.log('document.location.search: ',document.location.search);

      if(document.location.search.indexOf('redirect') !== -1
                    && document.location.toString().indexOf('logout') === -1) {

        window.console.log('Coming from a redirection!!!');
        owdFbInt.start();
      }
    }

    /**
     *  Prepares the UI for infinite scrolling
     *
     *
     */
    function prepareInfiniteScroll() {
      InfiniteScroll.create ({
        element: '#main',
        callback: loadMoreFriends
      });

      window.console.log('Infinite scroll done!');
    }

    /**
     *  Adds more friends to the list
     *
     */
    function loadMoreFriends(done) {
      window.console.log('Infinite scroll callback invoked');
      var ret = false;
      var nextElements;
      if(nextBlock + BLOCK_SIZE < myFriends.length) {
        nextElements = myFriends.slice(nextBlock,nextBlock + BLOCK_SIZE);
        nextBlock += BLOCK_SIZE;
      }
      else {
        nextElements = myFriends.slice(nextBlock);
        ret = true;
      }
      owd.templates.append(contactList,nextElements);
      done(ret);
    }

    owdFbInt.start = function() {
      getAccessToken(tokenReady);
    }

    /**
     *  This function is invoked when a token is ready to be used
     *
     */
    function tokenReady(at) {
      accessToken = at;

      prepareInfiniteScroll();
      owdFbInt.getFriends();
    }

    function getLocation() {
      return (window.location.protocol + "//" + window.location.host + window.location.port +
      window.location.pathname);
    }

    /**
     *  Gets the Facebook friends by invoking Graph API using JSONP mechanism
     *
     */
    owdFbInt.getFriends = function() {
      var friendsService = 'https://graph.facebook.com/fql?';

      var params = [ACC_T + '=' + accessToken,
                    'q' + '=' + FRIENDS_QUERY,
                        'callback=owdFbInt.friendsReady'];
      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = friendsService + q;
      document.body.appendChild(jsonp);

      document.body.dataset.state = 'waiting';
    }

    /**
     *  Callback invoked when friends are ready to be used
     *
     *  TODO: Check when there is an error and the access token has to be renewed
     *
     */
    owdFbInt.friendsReady = function(response) {
      if(typeof response.error === 'undefined') {
        window.console.log('Friends:',response);

        myFriends = response.data;

        // Only append the first 10 friends to avoid collapsing the browser
        var pagedData = myFriends.slice(0,nextBlock);

        owd.templates.append('#myFbContacts',pagedData);

        document.body.dataset.state = '';
      }
      else {
        window.console.log('There has been an error, while retrieving friends'
                                                    ,response.error.message);
        if(response.error.code === 190) {
          window.console.log('Restarting the OAuth flow');
          startOAuth();
        }
      }
    }

    var UI = owdFbInt.ui = {};

    owdFbInt.ui.logout = function() {
      logout();
    };

    /**
     *  This function is invoked when the user starts the process of importing
     *
     */
    owdFbInt.ui.importAll = function(e) {
      window.console.log('Importing all the contacts',selectedContacts.length);

      if(selectedContacts.length > 0) {
        owdFbInt.importAll(function() {
          window.console.log('All contacts have been imported');
          document.body.dataset.state = '';
          var req = navigator.mozContacts.find({});
          req.onsuccess = function(e) {
            window.console.log('Number of contacts:' , e.target.result.length);
          }
        });
      }
      else {
        window.console.log('No friends selected. Doing nothing');
      }
    }

    /**
     *  Invoked when the user selects all his friends
     *
     *
     */
    owdFbInt.ui.selectAll = function(e) {
      window.console.log('Selecting all Contacts');

      bulkSelection(true);

      selectedContacts = myFriends.slice(0);

      selButton.textContent = 'Unselect All';
      selButton.onclick = UI.unSelectAll;
    }

    /**
     *
     *  Invoked when the user unselects all her contacts
     *
     */
    owdFbInt.ui.unSelectAll = function(e)  {
      window.console.log('Unselecting all the contacts');

      bulkSelection(false);

      selButton.textContent = 'Select All';
      selButton.onclick = UI.selectAll;

      selectedContacts = [];
    }

    /**
     *  Makes a bulk selection of the contacts
     *
     *
     */
    function bulkSelection(value) {
      window.console.log('Bulk Selection');

      var list = document.querySelector('#myFbContacts').
                              querySelectorAll('input[type="checkbox"]');

      var total = list.length;

      window.console.log('Total input: ',total);

      for(var c = 0; c < total; c++) {
        list[c].checked = value;
      }
    }

    /**
     *  Performs Facebook logout
     *
     *
     */
    function logout() {
      window.console.log('Logout');
      clearStorage();

      document.location =
              'https://m.facebook.com/logout.php?next=' +
                  encodeURIComponent(getLocation() + "?logout=1")
                  + '&access_token=' + accessToken;
    }

    /**
     *  Clears credential data stored locally
     *
     */
    function clearStorage() {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('expires');
      window.localStorage.removeItem('ts_expires');
    }

    /**
     *   Invoked when an element in the friend list is selected
     *
     */
    owdFbInt.ui.selection = function(e) {
      var ele = e.target;
      window.console.log('Clicked!!!',ele.tagName);

      if(ele.tagName === 'INPUT') {
        if(ele.checked === true) {
          window.console.log('Contact has been selected',ele.name);
          selectedContacts.push(myFriends[ele.name]);
        }
        else {
            window.console.log('Contact has been unselected',ele.name);
            selectedContacts = selectedContacts.filter(function(e) {
              return e.uid !== myFriends[ele.name].uid;
            });
        }
      }
    }

    /**
     *   Obtains the photo of the contact as a data URL
     *
     */
    function getContactPhoto(uid,cb) {
      var contactImg = getContactImg(uid,function(contactImg) {
        // Checking whether the image was actually loaded or not
        if(contactImg !== null) {
          canvas.width = contactImg.width;
          canvas.height = contactImg.height;

          canvas.getContext('2d').drawImage(contactImg,0,0);

          cb(canvas.toDataURL());
        }
        else {
          cb('');
        }
      });
    }

    /**
     *  Obtains a img DOM Element with the Contact's img
     *
     */
    function getContactImg(uid,cb) {
      window.console.log('Uid to retrieve img for: ',uid);
      var img = contactList.querySelector('#c' + uid + ' img');

      // The contact was not previously loaded on the DOM
      if(img === null) {
        img = document.createElement('img');
        img.src = 'https://graph.facebook.com/' + uid + '/picture?type=square';
        // A timeout is setup just in case the photo is not loaded
        var timeoutId = window.setTimeout(function() {
                          img.onload = null; cb(null); img.src = ''; },5000);

        img.onload = function() {
          window.cancelTimeout(timeoutId);
          cb(img);
        }
      }
      else {
        cb(img);
      }
    }

    /**
     *   Implements a Contacts Importer which imports Contacts in chunk sizes
     *
     *
     */
    var ContactsImporter = function(contacts) {
      this.contacts = contacts;

      var chunkSize = 10;
      var pointer = 0;
      this.pending = contacts.length;

      /**
       *  Imports a slice
       *
       */
      function importSlice() {
        var cgroup = contacts.slice(pointer,pointer + chunkSize);
          persistContactGroup(cgroup,function() {
            pointer += chunkSize; this.pending -= chunkSize;
            this.onsuccess(); }.bind(this) );
      } // importSlice

      /**
       *  This method allows to continue the process
       *
       */
      this.continue = function() {
        if(this.pending > 0) {
          if(this.pending < chunkSize) {
            var cgroup = contacts.slice(pointer,pointer + this.pending);
            persistContactGroup(cgroup,function() { this.pending = 0;
                                                        this.onsuccess(); }.bind(this) );
          }
          else {
            (importSlice.bind(this))();
          }
        }
      }

      /**
       *  Starts a new import process
       *
       */
      this.start = function() {
        pointer = 0;
        this.pending = contacts.length;
        (importSlice.bind(this))();
      }

    /**
     *  Persists a group of contacts
     *
     */
    function persistContactGroup(cgroup,doneCB) {
      var numResponses = 0;
      var totalContacts = cgroup.length;

      window.console.log('Contacts to add: ',totalContacts);

      cgroup.forEach(function(f) {
        var contact = new mozContact();

        var photo = getContactPhoto(f.uid,function(photo) {
          // When photo is ready this code will be executed
          contact.init({ name: [f.name], bday:null, fbContact:true, sex:f.uid,
          photo: [photo] });
          var request = navigator.mozContacts.save(contact);
          request.onsuccess = function() {
            numResponses++;
            window.console.log('Contact added!!!',numResponses);

            if(numResponses === totalContacts) {
              if(typeof doneCB === 'function') {
                doneCB();
              }
            }
          };

          request.onerror = function(e) {
            numResponses++;
            window.console.log('Contact Add error: ',numResponses);

            if(numResponses === totalContacts) {
              if(typeof doneCB === 'function') {
                doneCB();
              }
            }
          };

        });  // getContactPhoto
      }); //forEach
    } // persistContactGroup
  } //contactsImporter


    /**
     *  Imports all the selected contacts on the address book
     *
     */
    owdFbInt.importAll = function(importedCB) {
      document.body.dataset.state = 'waiting';

      var cImporter = new ContactsImporter(selectedContacts);
      cImporter.onsuccess = function() {
        window.console.log('On success invoked!!!');

        if(cImporter.pending > 0) {
          cImporter.continue();
        }
        else {
          importedCB();
        }
      };

      cImporter.start();
    }

    /**
     *  Obtains the access token. The access token is retrieved from the local
     *  storage and if not present a OAuth 2.0 flow is started
     *
     *
     */
    function getAccessToken(ready) {
      var ret;

      if(typeof window.localStorage.access_token === 'undefined') {

        window.console.log('No access token stored!!!');

        var hash = window.location.hash;

        if(hash.length > 0) {
          if(hash.indexOf(ACC_T) === 1) {
            var end = hash.length;
            var expires = hash.indexOf('&');
            if(expires !== -1) {
                end = expires;
            }

            ret = hash.substring(ACC_T.length + 2,end);

            window.localStorage.access_token = ret;
            window.localStorage.expires = end * 1000;
            window.localStorage.token_ts = Date.now();

            window.console.log('Access Token %s. Expires: %s',ret,end);
          }
        } else {
          startOAuth();
        }
      }
      else {
        var timeEllapsed = Date.now() - window.localStorage.token_ts;

        if(timeEllapsed < window.localStorage.expires) {
           ret = window.localStorage.access_token;
           window.console.log('Reusing existing access token:',ret);
        }
        else {
          window.console.log('Access Token has expired');
          startOAuth();
        }
      }

      if(typeof ready === 'function' && typeof ret !== 'undefined') {
        ready(ret);
      }
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth() {
      clearStorage();

      var queryParams = ['client_id=' + appID,
                                'redirect_uri='
                                    + encodeURIComponent(getLocation() + "?state=redirect"),
                                'response_type=token',
                                'scope=' + encodeURIComponent('friends_about_me,\
                                          friends_birthday,email,friends_education_history,\
                                          friends_work_history,friends_status')];
      var query = queryParams.join('&');
      var url = oauthDialogUri + query;

      window.console.log('URL: ', url);

      document.location = url;
    }

    window.console.log('OWD FB!!!!');

    // Everything is initialized
    owdFbInt.init();
  }
  )(document);
}
