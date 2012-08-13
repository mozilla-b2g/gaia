/*
 *  Module: Facebook integration
 *
 *
 *  @author José M. Cantera (jmcf@tid.es)
 *
 *  The module allows to work with Facebook providing a deep integration
 *  between the Open Web Device and Facebook
 *
 *
 */
if (typeof window.owdFbInt === 'undefined') {
  (function(document) {
    'use strict';

    var owdFbInt = window.owdFbInt = {};
    var UI = owdFbInt.ui = {};

    // Access Token parameter
    var ACC_T = 'access_token';

    // Friends selected to be sync to the address book
    var selectedContacts = {};

    // Friends that are suitable to be selected
    var selectableFriends = {};

    // The whole list of friends as an array
    var myFriends, myFriendsByUid;

    // Partners
    var friendsPartners;

    // Existing FB contacts
    var existingFbContacts = [];

    var contactsLoaded = false, friendsLoaded = false;

    // Query that retrieves the information about friends
    var FRIENDS_QUERY = [
      'SELECT uid, name, first_name, last_name,' ,
      'middle_name, birthday_date, email,' ,
      'relationship_status, significant_other_id, work,' ,
      'education, cell, other_phone, current_location' ,
      ' FROM user' ,
      ' WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me())' ,
      ' ORDER BY last_name'
    ].join('');

    // Query that retrieves information about the person in relationship with
    var RELATIONSHIP_QUERY = [
      'SELECT uid,name from user WHERE uid IN' ,
      '(select significant_other_id FROM user  WHERE uid in' ,
      '(SELECT uid1 FROM friend WHERE uid2=me()) ' ,
      'AND significant_other_id <> "")'
    ].join('');

      // Multiquery that makes things easier to manage
    var REL_MULTIQ = [
      'SELECT uid, name from user WHERE uid IN' ,
      '(SELECT significant_other_id FROM #query1' ,
      ' WHERE significant_other_id <> "")'
    ].join('');

      // Multiquery Object
      var multiqObj = {query1: FRIENDS_QUERY, query2: REL_MULTIQ};

      // Multiquery String
      var multiQStr = JSON.stringify(multiqObj);

      var selButton = document.querySelector('#selunsel');
      var contactList = document.querySelector('#groups-list');

      var BLOCK_SIZE = 5;
      var nextBlock = BLOCK_SIZE + 3;

      var totalPhotoBytes = 0;


    /**
     *  Initialization function it tries to find an access token
     *
     */
    owdFbInt.afterRedirect = function(state) {
      var queryString = state;

      // check if we come from a redirection
      if ((queryString.indexOf('friends') !== -1 ||
           queryString.indexOf('messages') !== -1) ||
          queryString.indexOf('logout') !== -1) {

        if (queryString.indexOf('friends') !== -1) {
          getAccessToken(function(token) { owdFbInt.getFriends(token); });
        }
        else if (queryString.indexOf('messages') !== -1) {
          UI.sendWallMsg();
        }
        else if (queryString.indexOf('logout') !== -1) {
          clearStorage();
          document.querySelector('#msg').textContent = 'Logged Out!';
          document.querySelector('#msg').style.display = 'block';
          window.setTimeout(
                        function() { window.location = getLocation(); },2000);
        }
      }
    }


    /**
     *  Adds more friends to the list
     *
     */
    function loadMoreFriends(done) {
      var ret = false;
      var nextElements;
      if (nextBlock + BLOCK_SIZE < myFriends.length) {
        nextElements = myFriends.slice(nextBlock, nextBlock + BLOCK_SIZE);
        nextBlock += BLOCK_SIZE;
      }
      else {
        nextElements = myFriends.slice(nextBlock);
        ret = true;
      }
      owd.templates.append(contactList, nextElements);
      done(ret);
    }

   UI.getFriends = function() {
      clearList();

      getAccessToken(tokenReady, 'friends');
    }

    /**
     *  This function is invoked when a token is ready to be used
     *
     */
    function tokenReady(at) {
      owdFbInt.getFriends(at);
    }

    function getLocation() {
      return (window.location.protocol + '//' + window.location.host +
              window.location.port + window.location.pathname);
    }

    /**
     *  Invoked when the existing FB contacts on the Adress Book are ready
     *
     */
    function contactsReady(e) {
      existingFbContacts = e.target.result;
      contactsLoaded = true;

      if (friendsLoaded) {
        disableExisting(existingFbContacts);
      }
    }

    /**
     *  Invoked when friends are ready
     *
     */
    function friendsAvailable() {
      friendsLoaded = true;

      if (contactsLoaded) {
        disableExisting(existingFbContacts);
      }
    }

    /**
     *  Existing contacts are disabled
     *
     */
    function disableExisting(friends) {
      var newValue = myFriends.length - friends.length;

      var eleNumImport = document.querySelector('#nfriends');
      if (eleNumImport.value && eleNumImport.value.length > 0) {
        var newValue = parseInt(eleNumImport.value) - friends.length;
      }

      eleNumImport.value = newValue;

      friends.forEach(function(fbContact) {
        var uid = new fb.Contact(fbContact).uid;

        delete selectableFriends[uid];

        var ele = document.querySelector('[data-uuid="' + uid + '"]');

        var input = ele.querySelector('input');
        input.checked = true;

        ele.setAttribute('aria-disabled', 'true');
      });
    }

    /**
     *  Gets the Facebook friends by invoking Graph API using JSONP mechanism
     *
     */
    owdFbInt.getFriends = function(accessToken) {
      var friendsService = 'https://graph.facebook.com/fql?';
  // var friendsService = 'https://api.facebook.com/method/facebook.fql.query?'

      var params = [ACC_T + '=' + accessToken,
                    'q' + '=' + encodeURIComponent(multiQStr),
                        'callback=owdFbInt.friendsReady'];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = friendsService + q;
      document.body.appendChild(jsonp);

      document.body.dataset.state = 'waiting';

      // In the meantime we obtain the FB friends already on the Address Book
      if (navigator.mozContacts) {
        var filter = { filterValue: 'facebook', filterOp: 'equals',
                          filterBy: ['category']};
        var req = navigator.mozContacts.find(filter);

        req.onsuccess = contactsReady;

        req.onerror = function(e) {
          window.console.error('Error while retrieving FB Contacts' ,
                                    e.target.error.name); }
      }
    }

    /**
     *  Creates the friends partners array for fast access to information
     *
     */
    function parseFriendsPartners(data) {
      var ret = {};
      data.forEach(function(d) {
        ret[d.uid.toString()] = d.name;
      });

      return ret;
    }

    /**
     *  Callback invoked when friends are ready to be used
     *
     *
     */
    owdFbInt.friendsReady = function(response) {
      if (typeof response.error === 'undefined') {
        var lmyFriends = response.data[0].fql_result_set;

        myFriendsByUid = {};
        myFriends = [];

        lmyFriends.forEach(function(f) {
            // givenName is put as name but it should be f.first_name
          f.familyName = [f.last_name];
          f.additionalName = [f.middle_name];
          f.givenName = [f.first_name + ' ' + f.middle_name];


          if (f.email) {
            f.email1 = f.email;
            f.email = [{type: ['facebook'], address: f.email}];
          }
          else { f.email1 = ''; }

          var nextidx = 0;
          if (f.cell) {
            f.cell1 = f.cell;
            f.tel = [{type: ['facebook'], number: f.cell}];
            nextidx = 1;
          }
          else { f.cell1 = ''; }

          if (f.other_phone) {
            f.tel[nextidx] = {type: ['facebook'], number: f.other_phone};
          }

          f.uid = f.uid.toString();

          myFriendsByUid[f.uid] = f;
          selectableFriends[f.uid] = f;
          myFriends.push(f);
        });

        // My friends partners
        friendsPartners = parseFriendsPartners(response.data[1].fql_result_set);

        contacts.List.load(myFriends, friendsAvailable);

        // contacts.List.handleClick(this.ui.selection);

        document.body.dataset.state = '';
      }
      else {
        window.console.error('There has been an error, while retrieving friends',
                                                    response.error.message);
        if (response.error.code === 190) {
          startOAuth();
        }
      }
    }

    UI.logout = function() {
      getAccessToken(function(token) { owdFbAuth.logout(token); },'');
    };

    UI.sendWallMsg = function(e) {
      getAccessToken(function(token) {
        // var to = '1732873859';
        var to = '100001127136581';
        var message = 'Hi from Open Web Device!';
        owdFbInt.sendWallMsg(to, message, token);
     },'messages');
    }

    UI.sendMsg = function(e) {
      getAccessToken(function(token) {
        var to = '100001127136581';
        var message = 'Hi from Open Web Device!';
        owdFbInt.sendMsg(to, message, token);
     },'messages');
    }


    /**
     *  Sends a message to a friend
     *
     *  We need to get access to the private APIs to do this
     *
     */
    owdFbInt.sendMsg = function(uid, msg, token) {
      var msgService = 'https://graph.facebook.com/#/threads?method=POST';

      msgService = msgService.replace(/#/, uid);

      var params = [ACC_T + '=' + token,
                    'message=' + msg, 'callback=owdFbInt.wallMessageSent'];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = msgService + '&' + q;

      document.body.appendChild(jsonp);
    };


    /**
     *  Posts a message to a friend's wall
     *
     */
    owdFbInt.sendWallMsg = function(uid, msg, token) {
      var msgWallService = 'https://graph.facebook.com/#/feed?method=POST';

      msgWallService = msgWallService.replace(/#/, uid);

      var params = [ACC_T + '=' + token,
                    'message=' + msg, 'callback=owdFbInt.wallMessageSent'];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = msgWallService + '&' + q;

      document.body.appendChild(jsonp);
    };


    /**
     *   Post a photo to the user
     *
     */
    owdFbInt.postPhoto = function(photoBlob) {
      var photoService = '';
    };


    /**
     *  When a wall message is sent this function is executed
     *
     */
    owdFbInt.wallMessageSent = function(data) {
      if (data.error) {
        window.console.error('There has been an error', data.error.message);
      }
      else {
          alert('Message was sent!');
      }
    }


    /**
     *  This function is invoked when the user starts the process of importing
     *
     */
    UI.importAll = function(e) {
      if (Object.keys(selectedContacts).length > 0) {
        owdFbInt.importAll(function() {

          document.body.dataset.state = '';
          var list = [];
          // Once all contacts have been imported, they are unselected
          Object.keys(selectedContacts).forEach(function(c) {
            list.push(selectedContacts[c]);
          });

          disableExisting(list);
          selectedContacts = {};
        });
      }
      else {
        window.console.error('No friends selected. Doing nothing');
      }
    }

    /**
     *  Invoked when the user selects all his friends
     *
     *
     */
    UI.selectAll = function(e) {
      bulkSelection(true);

      selectedContacts = selectableFriends;

      selButton.textContent = 'Unselect All';
      selButton.onclick = UI.unSelectAll;
    }

    UI.back = function(e) {
      document.body.dataset.state = 'welcome';
    }

    /**
     *  Invoked when the user unselects all her contacts
     *
     */
    UI.unSelectAll = function(e)  {
      bulkSelection(false);

      selButton.textContent = 'Select All';
      selButton.onclick = UI.selectAll;

      selectedContacts = {};
    }

    /**
     *   Clears the list of contacts
     *
     */
    function clearList() {
      var template = contactList.querySelector('[data-template]');

      contactList.innerHTML = '';
      contactList.appendChild(template);
    }

    /**
     *  Makes a bulk selection of the contacts
     *
     *
     */
    function bulkSelection(value) {
      var list = contactList.querySelectorAll(
                                        'li[data-uuid][aria-disabled="false"]');

      var total = list.length;

      for (var c = 0; c < total; c++) {
        list[c].querySelector('input[type="checkbox"]').checked = value;
      }
    }

    /**
     *  Clears credential data stored locally
     *
     */
    function clearStorage() {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('expires');
      window.localStorage.removeItem('token_ts');
    }

    /**
     *   Invoked when an element in the friend list is selected
     *
     */
    UI.selection = function(e) {
      var uid, ele, checked;

      checked = false;

      if (e.target.dataset.uuid) {
        uid = e.target.dataset.uuid;
      }
      else if (e.target.tagName === 'INPUT') {
         ele = e.target;
         checked = true;
      }

      if (typeof ele === 'undefined') {
        ele = contactList.querySelector('input[name=' + '"' + uid + '"' + ']');
      }

      if ((ele.checked !== true && checked !== true) ||
                                    (checked && ele.checked === true)) {

        if (!checked) {
          ele.checked = true;
        }
        selectedContacts[ele.name] = myFriendsByUid[ele.name];
      }
      else {
          if (!checked) {
            ele.checked = false;
          }
          delete selectedContacts[ele.name];
      }
    }


    /**
     *  Obtains a img DOM Element with the Contact's img
     *
     */
    function getContactImg(uid, cb) {
      var PHOTO_TIMEOUT = 6000;

      var imgSrc = 'http://graph.facebook.com/' + uid + '/picture?type=large';

      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', imgSrc, true);
      xhr.responseType = 'blob';

      xhr.timeout = PHOTO_TIMEOUT;

      xhr.onload = function(e) {
        if (xhr.status === 200 || xhr.status === 0) {
          var mblob = e.target.response;
          var reader = new FileReader();
          reader.onload = function(e) {
            cb(e.target.result);

            totalPhotoBytes += e.target.result.length;
          }

          reader.onerror = function(e) {
            window.console.error('FB: File Reader Error', e.target.error.name);
            cb('');
          }

          reader.readAsDataURL(mblob);
        }
      }

      xhr.ontimeout = function(e) {
        window.console.error('FB: Timeout!!! while retrieving img for uid', uid);
        cb('');
      }

      xhr.onerror = function(e) {
        window.console.error('FB: Error while retrieving the img', e);
        cb('');
      }

      xhr.send();
    }

    /**
     *   Implements a Contacts Importer which imports Contacts in chunk sizes
     *
     *
     */
    var ContactsImporter = function(pcontacts) {
      // The selected contacts
      var mcontacts = pcontacts;
      // The uids of the selected contacts
      var kcontacts = Object.keys(mcontacts);

      var chunkSize = 10;
      var pointer = 0;
      this.pending = contacts.length;

      /**
       *  Imports a slice
       *
       */
      function importSlice() {
        var cgroup = kcontacts.slice(pointer, pointer + chunkSize);
          persistContactGroup(cgroup, function() {
            pointer += chunkSize; this.pending -= chunkSize;
            this.onsuccess();
          }.bind(this));
      } // importSlice

      /**
       *  This method allows to continue the process
       *
       */
      this.continue = function() {
        if (this.pending > 0) {
          if (this.pending < chunkSize) {
            var cgroup = kcontacts.slice(pointer, pointer + this.pending);
            persistContactGroup(cgroup, function() {
                  this.pending = 0;
                  this.onsuccess(); }.bind(this));
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
        this.pending = kcontacts.length;
        (importSlice.bind(this))();
      }

      /**
       * Auxiliary function to know where a contact works
       *
       */
      function getWorksAt(fbdata) {
        var ret = '';
        if (fbdata.work && fbdata.work.length > 0) {
          // It is assumed that first is the latest
          ret = fbdata.work[0].employer.name;
        }

        return ret;
      }


      /**
       *  Auxiliary function to know where a contact studied
       *
       */
      function getStudiedAt(fbdata) {
        var ret = '';

        if (fbdata.education && fbdata.education.length > 0) {
          var university = fbdata.education.filter(function(d) {
            var e = false;
            if (d.school.type === 'College') {
              e = true;
            }
            return e;
          });

          if (university.length > 0) {
            ret = university[0].school.name;
          }
          else {
            ret = fbdata.education[0].school.name;
          }
        }

        return ret;
      }

      /**
       *  Calculates a friend's partner
       *
       */
      function getMarriedTo(fbdata) {
        var ret = '';

        if (fbdata.significant_other_id) {
          ret = friendsPartners[fbdata.significant_other_id];
        }

        return ret;
      }

      /**
       *  Facebook dates are MM/DD/YYYY
       *
       *  Returns the birth date
       *
       */
      function getBirthDate(sbday) {
        var ret = new Date();

        var imonth = sbday.indexOf('/');
        var smonth = sbday.substring(0, imonth);

        var iyear = sbday.lastIndexOf('/');
        if (iyear === imonth) {
          iyear = sbday.length;
        }
        var sday = sbday.substring(imonth + 1, iyear);

        var syear = sbday.substring(iyear + 1, sbday.length);

        ret.setDate(parseInt(sday));
        ret.setMonth(parseInt(smonth), parseInt(sday));

        if (syear && syear.length > 0) {
          ret.setYear(parseInt(syear));
        }

        return ret;
      }

    /**
     *  Persists a group of contacts
     *
     */
    function persistContactGroup(cgroup, doneCB) {
      var numResponses = 0;
      var totalContacts = cgroup.length;

      cgroup.forEach(function(f) {
        var contact;
        if (navigator.mozContacts) {
          contact = new mozContact();
        }

        var cfdata = mcontacts[f];

        getContactImg(cfdata.uid, function(photo) {
          // When photo is ready this code will be executed

          var worksAt = getWorksAt(cfdata);
          var studiedAt = getStudiedAt(cfdata);
          var marriedTo = getMarriedTo(cfdata);
          var birthDate = null;
          if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
            birthDate = getBirthDate(cfdata.birthday_date);
          }

          if (navigator.mozContacts) {
            var fbInfo = {
                            marriedTo: marriedTo,
                            studiedAt: studiedAt,
                            bday: birthDate,
                            org: [worksAt],
                            photo: [photo]
            };

            cfdata.fbInfo = fbInfo;

            var fbContact = new fb.Contact();
            fbContact.setData(cfdata);
            var request = fbContact.save();

            request.onsuccess = function() {
              numResponses++;

              if (numResponses === totalContacts) {
                if (typeof doneCB === 'function') {
                  doneCB();
                }
              }
            }; /// onsuccess

            request.onerror = function() {
              numResponses++;
              window.console.error('FB: Contact Add error: ', request.error,
                                                              cfdata.uid);

              if (numResponses === totalContacts) {
                if (typeof doneCB === 'function') {
                  doneCB();
                }
              }
            };
          }
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
        if (cImporter.pending > 0) {
          window.setTimeout(function() { cImporter.continue(); },0);
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
    function getAccessToken(ready, state) {
      var ret;

      if (!window.localStorage.access_token) {
          startOAuth(state);
      }
      else {
        var timeEllapsed = Date.now() - window.localStorage.token_ts;
        var expires = Number(window.localStorage.expires);

        if (timeEllapsed < expires || expires === 0) {
           ret = window.localStorage.access_token;
        }
        else {
          startOAuth(state);
        }
      }

      if (typeof ready === 'function' && typeof ret !== 'undefined') {
        ready(ret);
      }
    }

    function tokenDataReady(e) {
      var tokenData = e.data;

      // The content of window.postMessage is parsed
      var parameters = JSON.parse(tokenData);

      if (parameters.access_token) {
        var end = parameters.expires_in;
        var ret = parameters.access_token;

        window.localStorage.access_token = ret;
        window.localStorage.expires = end * 1000;
        window.localStorage.token_ts = Date.now();
      }

      owdFbInt.afterRedirect(parameters.state);
    }

    /**
     *  Starts a OAuth 2.0 flow to obtain the user information
     *
     */
    function startOAuth(state) {
      clearStorage();

      // This page will be in charge of handling authorization
      owdFbAuth.start(state);
    }

    window.addEventListener('message', tokenDataReady, false);

  }
  )(document);
}
