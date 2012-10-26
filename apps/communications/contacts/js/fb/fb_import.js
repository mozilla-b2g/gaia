'use strict';

var fb = window.fb || {};

if (typeof fb.importer === 'undefined') {
  (function(document) {

    var Importer = fb.importer = {};
    var UI = Importer.ui = {};

    var access_token;

    // Friends selected to be sync to the address book
    var selectedContacts = {};

    // Friends that are suitable to be selected
    var selectableFriends = {};

    // The whole list of friends as an array
    var myFriends, myFriendsByUid;

    // Existing FB contacts
    var existingFbContacts = [];

    var contactsLoaded = false, friendsLoaded = false;

    var currentRequest;

    var _ = navigator.mozL10n.get;

    var syncOngoing = false;
    var nextUpdateTime;
    var friendsImported;

    // Query that retrieves the information about friends
    var FRIENDS_QUERY = [
      'SELECT uid, name, first_name, last_name, pic_big, ' ,
      'middle_name, birthday_date, email, profile_update_time, ' ,
      ' work, education, cell, other_phone, hometown_location' ,
      ' FROM user' ,
      ' WHERE uid ',
      'IN (SELECT uid1 FROM friend WHERE uid2=me())' ,
      ' ORDER BY last_name'
    ];

    var UID_FILTER_IDX = 5;

    var friendsQueryStr = FRIENDS_QUERY.join('');

    var selButton = document.querySelector('#select-all');
    var contactList = document.querySelector('#groups-list');

    var headerElement = document.querySelector('header');
    var friendsMsgElement = document.querySelector('p#friends-msg');
    var scrollableElement = document.querySelector('#mainContent');

    var BLOCK_SIZE = 5;

    UI.init = function() {
      var overlay, overlayContent;

      overlay = overlayContent = document.querySelector('#shortcuts #current');
      var jumper = document.querySelector('#shortcuts ol');

      var params = {
        overlay: overlay,
        overlayContent: overlayContent,
        jumper: jumper,
        groupSelector: '#group-',
        scrollToCb: scrollToCb
      };

      utils.alphaScroll.init(params);
      contacts.Search.init(document.getElementById('content'));
    }

    UI.end = function(event) {
      var msg = {
        type: 'window_close',
        from: 'import',
        data: ''
      };

      parent.postMessage(msg, fb.CONTACTS_APP_ORIGIN);
      // uncomment this to make it work on B2G-Desktop
      // parent.postMessage(msg, '*');
    }

    function scrollToCb(groupContainer) {
      scrollableElement.scrollTop = groupContainer.offsetTop;
    }

    UI.getFriends = function() {
      clearList();

      fb.oauth.getAccessToken(tokenReady, 'friends');
    }

    /**
     *  This function is invoked when a token is ready to be used
     *
     */
    function tokenReady(at) {
      access_token = at;
      Importer.getFriends(at);
    }

    /**
     *  Invoked when the existing FB contacts on the Address Book are ready
     *
     */
    function contactsReady(e) {
      existingFbContacts = e.target.result;
      contactsLoaded = true;

      if (friendsLoaded) {
        // A synchronization will start asynchronously
        window.setTimeout(startSync, 0);

        disableExisting(existingFbContacts);
      }
    }

    // Callback executed when a synchronization has finished successfully
    function syncSuccess() {
      window.console.log('Synchronization ended!!!');
      syncOngoing = false;
      fb.sync.scheduleNextSync();
    }

    function startSync() {
      if (existingFbContacts.length > 0 && !syncOngoing) {
        syncOngoing = true;

        var callbacks = {
          success: syncSuccess
        };
        fb.sync.startWithData(existingFbContacts, myFriendsByUid, callbacks);
      }
    }

    /**
     *  Invoked when friends are ready
     *
     */
    function friendsAvailable() {
      friendsLoaded = true;

      if (contactsLoaded) {
        window.setTimeout(startSync, 0);

        disableExisting(existingFbContacts);
      }
    }

    /**
     *  Existing contacts are disabled
     *
     */
    function disableExisting(friends) {
      var newValue = myFriends.length - friends.length;

      var eleNumImport = document.querySelector('#num-friends');
      if (eleNumImport.value && eleNumImport.value.length > 0) {
        var newValue = parseInt(eleNumImport.value) - friends.length;
      }

      eleNumImport.value = newValue;

      var msgElement = document.querySelector('#friends-msg');
      msgElement.textContent = _('friendsFound', {
        numFriends: newValue
      });

      friends.forEach(function(fbContact) {
        var uid = new fb.Contact(fbContact).uid;

        delete selectableFriends[uid];

        var ele = document.querySelector('[data-uuid="' + uid + '"]');
        // This check is needed as there might be existing FB Contacts that
        // are no longer friends
        if (ele) {
          var input = ele.querySelector('input');
          input.checked = true;

          ele.setAttribute('aria-disabled', 'true');
        }
      });
    }

    // Only needed for testing purposes
    Importer.setSelected = function(friends) {
      selectedContacts = friends;
    }

    /**
     *  Gets the Facebook friends by invoking Graph API using JSONP mechanism
     *
     */
    Importer.getFriends = function(access_token) {
      document.body.dataset.state = 'waiting';

      fb.utils.runQuery(friendsQueryStr, {
          success: fb.importer.friendsReady,
          error: fb.importer.errorHandler,
          timeout: fb.importer.timeoutHandler
      },access_token);

      // In the meantime we obtain the FB friends already on the Address Book
      if (!navigator.mozContacts) {
        return;
      }

      var req = fb.utils.getAllFbContacts();

      req.onsuccess = contactsReady;

      req.onerror = function(e) {
        window.console.error('Error while retrieving FB Contacts' ,
                                  e.target.error.name); }
    }

    Importer.importFriend = function(uid, acc_token) {
      access_token = acc_token;

      currentRequest = new fb.utils.Request();

      window.setTimeout(function do_importFriend() {
        var oneFriendQuery = buildFriendQuery(uid);

        fb.utils.runQuery(oneFriendQuery, {
                            success: fb.importer.importDataReady,
                            error: fb.importer.errorHandler,
                            timeout: fb.importer.timeoutHandler
        }, access_token);
      },0);

      return currentRequest;
    }

    Importer.importDataReady = function(response) {
      if (typeof response.error === 'undefined') {
        // Just in case this is the first contact imported
        nextUpdateTime = Date.now();

        var friend = response.data[0];
        if (friend) {
          fillData(friend);

          var cimp = new ContactsImporter([friend]);
          cimp.start();
          cimp.onsuccess = function() {
            currentRequest.done({
              uid: friend.uid,
              url: friend.pic_big
            });

            // If there is no an alarm set it has to be set
            window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
              if (!data) {
                fb.utils.setLastUpdate(nextUpdateTime, function() {
                  fb.sync.scheduleNextSync();
                });
              }
            });
          } // onsuccess
        } // if friend
        else {
          window.console.error('FB: No Friend data found');
          currentRequest.failed('No friend data found');
        }
      }
      else {
        currentRequest.failed(response.error);
      }
    }

    function buildFriendQuery(uid) {
      var aquery1 = [].concat(FRIENDS_QUERY);
      aquery1[UID_FILTER_IDX] = '= ' + uid;

      var query1 = aquery1.join('');

      return query1;
    }

    function setInfraForSync(callback) {
      // Check wether we need to set the update alarm
      window.asyncStorage.getItem(fb.utils.ALARM_ID_KEY, function(data) {
        if (!data || (existingFbContacts && existingFbContacts.length === 0) &&
            !friendsImported) {
          // This is the first contact imported
          fb.utils.setLastUpdate(nextUpdateTime, function() {
            var req = fb.sync.scheduleNextSync();
            if (typeof callback === 'function') {
              req.onsuccess = callback;
            }
          });
        }
      });
    }


    /**
     *  Callback invoked when friends are ready to be used
     *
     *
     */
    Importer.friendsReady = function(response) {
      if (typeof response.error === 'undefined') {
        // This is the timestamp for later syncing as it set at the time
        // when data was ready
        nextUpdateTime = Date.now();

        var lmyFriends = response.data;

        // Now caching the number
        fb.utils.setCachedNumFriends(lmyFriends.length);

        myFriendsByUid = {};
        myFriends = [];

        lmyFriends.forEach(function(f) {
          fillData(f);

          myFriendsByUid[f.uid] = f;
          selectableFriends[f.uid] = f;
          myFriends.push(f);
        });

        fbFriends.List.load(myFriends, friendsAvailable);

        document.body.dataset.state = '';
      }
      else {
        window.console.error('FB: Error, while retrieving friends',
                                                    response.error.message);
        if (response.error.code === 190) {
          startOAuth();
        }
      }
    }

    Importer.timeoutHandler = function() {
      // TODO: figure out with UX what to do in that case
      window.alert('Timeout!!');
      document.body.dataset.state = '';
    }

    Importer.errorHandler = function() {
      // TODO: figure out with UX what to do in that case
      window.alert('Error!');
      document.body.dataset.state = '';
    }

    function fillData(f) {
      fb.friend2mozContact(f);
    }

    /**
     *  This function is invoked when the user starts the process of importing
     *
     */
    UI.importAll = function(e) {
      if (Object.keys(selectedContacts).length > 0) {

        Importer.importAll(function on_all_imported() {

          // Check whether we need to set the last update and schedule next sync
          // Only in that case otherwise that will be done by the sync process
          setInfraForSync(function() {
            friendsImported = true;
          });

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
      this.pending = mcontacts.length;

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

        fb.utils.getFriendPicture(cfdata.uid, function save_friend_info(photo) {
          // When photo is ready this code will be executed

          var worksAt = fb.getWorksAt(cfdata);
          var address = fb.getAddress(cfdata);

          var birthDate = null;
          if (cfdata.birthday_date && cfdata.birthday_date.length > 0) {
            birthDate = fb.getBirthDate(cfdata.birthday_date);
          }

          var fbInfo = {
                          bday: birthDate,
                          org: [worksAt]
          };

          if (address) {
            fbInfo.adr = [address];
          }

          // Check whether we were able to get the photo or not
          fbInfo.url = [];

          if (photo) {
            fbInfo.photo = [photo];
            if (cfdata.pic_big) {
              // The URL is stored for synchronization purposes
              fb.setFriendPictureUrl(fbInfo, cfdata.pic_big);
            }
          }

          // Facebook info is set and then contact is saved
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
        }, access_token);  // getContactPhoto
      }); //forEach
    } // persistContactGroup
  } //contactsImporter


    /**
     *  Imports all the selected contacts on the address book
     *
     */
    Importer.importAll = function(importedCB) {
      document.body.dataset.state = 'waiting';

      var cImporter = new ContactsImporter(selectedContacts);
      cImporter.onsuccess = function() {
        if (cImporter.pending > 0) {
          window.setTimeout(function() {
            cImporter.continue();
          },0);
        }
        else {
          importedCB();
        }
      };

      cImporter.start();
    }

  }
  )(document);
}
