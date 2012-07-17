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
    var UI = owdFbInt.ui = {};

      // Access Token parameter
      var ACC_T = 'access_token';

      // Contacts selected to be sync to the address book
      var selectedContacts = {};

      // The whole list of friends as an array
      var myFriends,myFriendsByUid;

      // Partners
      var friendsPartners;

      // Query that retrieves the information about friends
      var FRIENDS_QUERY = 'SELECT uid, name, first_name, last_name, middle_name, \
                          birthday_date, email, \
                        relationship_status, significant_other_id, work, \
                        education \
                        FROM user \
                        WHERE uid IN (SELECT uid1 FROM friend WHERE uid2=me()) \
                        ORDER BY last_name';

      // Query that retrieves information about the person in relationship with
      var RELATIONSHIP_QUERY = 'SELECT uid,name from user WHERE uid IN\
(select significant_other_id FROM user  WHERE uid in\
 (SELECT uid1 FROM friend WHERE uid2=me()) AND significant_other_id <> "")';

      // Multiquery that makes things easier to manage
      var REL_MULTIQ = 'SELECT uid, name from user WHERE uid IN \
        (SELECT significant_other_id FROM #query1 \
        WHERE significant_other_id <> "")';

      // Multiquery Object
      var multiqObj = {query1: FRIENDS_QUERY, query2: REL_MULTIQ};

      // Multiquery String
      var multiQStr = JSON.stringify(multiqObj);

      var selButton = document.querySelector('#selunsel');
      var contactList = document.querySelector('#view-contacts-list');

      // Canvas used to obtain the idata url images
      var canvas = document.createElement('canvas');
      canvas.hidden = true;

      var BLOCK_SIZE = 5;
      var nextBlock = BLOCK_SIZE + 3;

      var totalPhotoBytes = 0;

    /**
     *  Initialization function it tries to find an access token
     *
     */
    owdFbInt.init = function() {
      var queryString = document.location.hash.substring(1);

      window.console.log('document.location.search: ',queryString);

      // check if we come from a redirection
      if((queryString.indexOf('friends') !== -1 || queryString.indexOf('messages') !== -1)
                    || queryString.indexOf('logout') !== -1) {

        window.console.log('Coming from a redirection!!!');

        if(queryString.indexOf('friends') !== -1) {
          window.console.log('Getting friends!!!');

          getAccessToken(function(token) { owdFbInt.getFriends(token); } );
        }
        else if(queryString.indexOf('messages') !== -1) {
          window.console.log('Sending message!!!');
          UI.sendWallMsg();
        }
        else if(queryString.indexOf('logout') !== -1) {
          window.console.log('Logged out');
          document.querySelector('#msg').textContent = 'Logged Out!';
          document.querySelector('#msg').style.display = 'block';
          window.setTimeout(function() {  window.location = getLocation(); },2000);
        }
      }
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

   UI.getFriends = function() {
      getAccessToken(tokenReady,'friends');
    }

    /**
     *  This function is invoked when a token is ready to be used
     *
     */
    function tokenReady(at) {
      owdFbInt.getFriends(at);
    }

    function getLocation() {
      return (window.location.protocol + "//" + window.location.host + window.location.port +
      window.location.pathname);
    }

    /**
     *  Gets the Facebook friends by invoking Graph API using JSONP mechanism
     *
     */
    owdFbInt.getFriends = function(accessToken) {
      var friendsService = 'https://graph.facebook.com/fql?';

      var params = [ACC_T + '=' + accessToken,
                    'q' + '=' + encodeURIComponent(multiQStr),
                        'callback=owdFbInt.friendsReady'];
      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = friendsService + q;
      document.body.appendChild(jsonp);

      document.body.dataset.state = 'waiting';
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
     *  TODO: Check when there is an error and the access token has to be renewed
     *
     */
    owdFbInt.friendsReady = function(response) {
      if(typeof response.error === 'undefined') {
        window.console.log('Friends:',response);

        var lmyFriends = response.data[0].fql_result_set;

        myFriendsByUid = {};
        myFriends = [];

        lmyFriends.forEach(function(f) {
            // givenName is put as name but it should be f.first_name
          f.familyName = [f.last_name];
          f.additionalName = [f.middle_name];
          f.givenName = [f.first_name + ' ' + f.middle_name];
          f.uid = f.uid.toString();

          myFriendsByUid[f.uid] = f;
          myFriends.push(f);
        });

        // My friends partners
        friendsPartners = parseFriendsPartners(response.data[1].fql_result_set);

        contacts.List.init(document.querySelector('#groups-list'));

        contacts.List.load(myFriends);

        contacts.List.handleClick(this.ui.selection);

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


    UI.logout = function() {
      getAccessToken(function(token) { logout(token); },'');
    };

    UI.sendWallMsg = function(e) {
      getAccessToken(function(token) {
        // var to = '1732873859';
        var to = '100001127136581';
        var message = 'Hi from Open Web Device!';
        owdFbInt.sendWallMsg(to,message,token)
     },'messages');
    }

    UI.sendMsg = function(e) {
      getAccessToken(function(token) {
        var to = '100001127136581';
        var message = 'Hi from Open Web Device!';
        owdFbInt.sendMsg(to,message,token)
     },'messages');
    }


    /**
     *  Sends a message to a friend
     *
     *  We need to get access to the private APIs to do this
     *
     */
    owdFbInt.sendMsg = function(uid,msg,token) {
      var msgService = 'https://graph.facebook.com/#/threads?method=POST';

      msgService = msgService.replace(/#/,uid);

      var params = [ACC_T + '=' + token,
                    'message=' + msg,'callback=owdFbInt.wallMessageSent'];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = msgService + '&' + q;

      window.console.log('Message Service: ',jsonp.src);

      document.body.appendChild(jsonp);
    };


    /**
     *  Posts a message to a friend's wall
     *
     */
    owdFbInt.sendWallMsg = function(uid,msg,token) {
      var msgWallService = 'https://graph.facebook.com/#/feed?method=POST';

      msgWallService = msgWallService.replace(/#/,uid);

      var params = [ACC_T + '=' + token,
                    'message=' + msg,'callback=owdFbInt.wallMessageSent'];

      var q = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = msgWallService + '&' + q;

      window.console.log('Wall Message Service: ',jsonp.src);

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
      window.console.log(data);

      if(data.error) {
        window.console.error('There has been an error',data.error.message);
      }
      else {
          alert('Message was sent!');
      }
    }


    /**
     *  This function is invoked when the user starts the process of importing
     *
     */
    owdFbInt.ui.importAll = function(e) {
      window.console.log('Importing all the contacts',Object.keys(selectedContacts).length);

      if(Object.keys(selectedContacts).length > 0) {
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
    UI.selectAll = function(e) {
      window.console.log('Selecting all Contacts');

      bulkSelection(true);

      selectedContacts = myFriendsByUid;

      selButton.textContent = 'Unselect All';
      selButton.onclick = UI.unSelectAll;
    }

    /**
     *  Invoked when the user unselects all her contacts
     *
     */
    UI.unSelectAll = function(e)  {
      window.console.log('Unselecting all the contacts');

      bulkSelection(false);

      selButton.textContent = 'Select All';
      selButton.onclick = UI.selectAll;

      selectedContacts = {};
    }

    /**
     *  Makes a bulk selection of the contacts
     *
     *
     */
    function bulkSelection(value) {
      window.console.log('Bulk Selection');

      var list = document.querySelector('#view-contacts-list').
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
    function logout(accessToken) {
      window.console.log('Logout');
      clearStorage();

      document.location =
              'https://www.facebook.com/logout.php?next=' +
                  encodeURIComponent(getLocation() + "#state=logout")
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
    owdFbInt.ui.selection = function(uid) {
      var ele = contactList.querySelector('input[name=' + '"' + uid + '"' + ']');

      if(ele.checked !== true) {
        window.console.log('Contact has been selected',ele.name);
        ele.checked = true;
        selectedContacts[ele.name] = myFriendsByUid[ele.name];
      }
      else {
          window.console.log('Contact has been unselected',ele.name);
          ele.checked = false;
          delete selectedContacts[ele.name];
      }
    }


    /**
     *  Obtains a img DOM Element with the Contact's img
     *
     */
    function getContactImg(uid,cb) {
      window.console.log('Uid to retrieve img for: ',uid);

      var PHOTO_TIMEOUT = 6000;

      var imgSrc = 'http://graph.facebook.com/' + uid + '/picture?type=large';

      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('GET', imgSrc, true);
      xhr.responseType = 'blob';

      xhr.timeout = PHOTO_TIMEOUT;

      xhr.onload = function(e) {
        window.console.log('Success CB invoked for img uid',uid);
        if (xhr.status === 200 || xhr.status === 0) {
          window.console.log('200 ok for uid',uid);
          var mblob = e.target.response;
          var reader = new FileReader();
          reader.onload = function(e) {
            cb(e.target.result);

            totalPhotoBytes += e.target.result.length;
          }

          reader.onerror = function(e) {
            window.console.error('File Reader Error',e.target.error.name);
            cb('');
          }

          reader.readAsDataURL(mblob);
        }
      }

      xhr.ontimeout = function(e) {
        window.console.log('Timeout!!! while retrieving img for uid',uid);
        cb('');
      }

      xhr.onerror = function(e) {
        window.console.error('Error while retrieving the img',e);
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
        var cgroup = kcontacts.slice(pointer,pointer + chunkSize);
          persistContactGroup(cgroup,function() {
            pointer += chunkSize; this.pending -= chunkSize;
            this.onsuccess();
          }.bind(this) );
      } // importSlice

      /**
       *  This method allows to continue the process
       *
       */
      this.continue = function() {
        if(this.pending > 0) {
          if(this.pending < chunkSize) {
            var cgroup = kcontacts.slice(pointer,pointer + this.pending);
            persistContactGroup(cgroup,function() {
                  this.pending = 0;
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
        this.pending = kcontacts.length;
        (importSlice.bind(this))();
      }

      /**
       * Auxiliary function to know where a contact works
       *
       */
      function getWorksAt(fbdata) {
        var ret = '';
        if(fbdata.work && fbdata.work.length > 0) {
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

        if(fbdata.education && fbdata.education.length > 0) {
          var university = fbdata.education.filter(function(d) {
            var e = false;
            if(d.school.type === 'College') {
              e = true;
            }
            return e;
          });

          if(university.length > 0) {
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

        window.console.log('Significant other id: ',fbdata.significant_other_id);

        if(fbdata.significant_other_id) {
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
        var smonth = sbday.substring(0,imonth);

        window.console.log('Birthday month:',smonth);

        var iyear = sbday.lastIndexOf('/');
        if(iyear === imonth) {
          iyear = sbday.length;
        }
        var sday = sbday.substring(imonth + 1,iyear);

        window.console.log('Birthday day:',sday);

        var syear = sbday.substring(iyear + 1,sbday.length);
        window.console.log('Birthday year:',syear);

        ret.setDate(parseInt(sday));
        ret.setMonth(parseInt(smonth),parseInt(sday));

        if(syear && syear.length > 0) {
          ret.setYear(parseInt(syear));
        }

        return ret;
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
        var contact;
        if(navigator.mozContacts) {
          contact = new mozContact();
        }

        var cfdata = mcontacts[f];

        window.console.log('Name: ', cfdata.name,cfdata.last_name);

        getContactImg(cfdata.uid,function(photo) {
          // When photo is ready this code will be executed

          window.console.log('Photo: ',photo);

          var worksAt = getWorksAt(cfdata);
          var studiedAt = getStudiedAt(cfdata);
          var marriedTo = getMarriedTo(cfdata);
          var birthDate = null;
          if(cfdata.birthday_date && cfdata.birthday_date.length > 0) {
            birthDate = getBirthDate(cfdata.birthday_date);
          }

          window.console.log(cfdata.uid,worksAt,studiedAt,marriedTo,birthDate);

          if(navigator.mozContacts) {
            var fbInfo = {
                            uid: cfdata.uid,
                            marriedTo: marriedTo,
                            studiedAt: studiedAt
            };

            cfdata.category = ['facebook','fb_not_linked'];
            cfdata.note = [JSON.stringify(fbInfo)];
            cfdata.photo = [photo];
            cfdata.bday = [birthDate];
            cfdata.org = [worksAt];

            contact.init(cfdata);

            var request = navigator.mozContacts.save(contact);
            request.onsuccess = function() {
              numResponses++;
              window.console.log('Contact added!!!',numResponses);

              if(numResponses === totalContacts) {
                if(typeof doneCB === 'function') {
                  doneCB();
                }
              }
            } /// onsuccess

            request.onerror = function(e) {
              numResponses++;
              window.console.log('Contact Add error: ',e.target.name,
                                                              cfdata.uid);

              if(numResponses === totalContacts) {
                if(typeof doneCB === 'function') {
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
        window.console.log('All contacts. On success invoked!!!');

        if(cImporter.pending > 0) {
          cImporter.continue();
        }
        else {
          window.console.log('TOTAL SIZE OF IMPORTED PHOTOS: ',totalPhotoBytes);
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
    function getAccessToken(ready,state) {
      var ret;

      if(typeof window.localStorage.access_token === 'undefined') {

        window.console.log('No access token stored!!!');

        var hash = window.location.hash.substring(1);

        if(hash.length > 0) {
          var atidx = hash.indexOf(ACC_T);
          if(atidx !== -1) {

            var elements = hash.split('&');

            window.console.log(elements);

            var parameters = {};

            elements.forEach(function(p) {
              var values = p.split('=');

              parameters[values[0]] = values[1];
            });

            window.console.log('Hash Parameters',parameters);

            var end = parameters.expires_in;
            ret = parameters.access_token;

            window.localStorage.access_token = ret;
            window.localStorage.expires = end * 1000;
            window.localStorage.token_ts = Date.now();

            window.console.log('Access Token: %s. Expires: %s',ret,end);
          }
        } else {
          startOAuth(state);
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
          startOAuth(state);
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
    function startOAuth(state) {
      clearStorage();

      // This page will be in charge of handling authorization
      document.location = 'fbint-auth.html#state=' + state;
    }

    window.console.log('OWD FB!!!!');

    owdFbInt.init();

    window.addEventListener('keydown', function onkeydown(event) {
      if (event.keyCode === event.DOM_VK_ESCAPE) {
        document.body.dataset.state = 'welcome';
        event.stopPropagation();
      }
    }, true);

    // addEventListener
  }
  )(document);
}
