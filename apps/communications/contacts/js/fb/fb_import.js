'use strict';

var fb = window.fb || {};

if (typeof fb.importer === 'undefined') {
  (function(document) {

    var Importer = fb.importer = {};
    var UI = Importer.ui = {};

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

    var currentRequest;

    var _ = navigator.mozL10n.get;

    // Query that retrieves the information about friends
    var FRIENDS_QUERY = [
      'SELECT uid, name, first_name, last_name,' ,
      'middle_name, birthday_date, email,' ,
      'relationship_status, significant_other_id, work,' ,
      'education, cell, other_phone, current_location' ,
      ' FROM user' ,
      ' WHERE uid ',
      'IN (SELECT uid1 FROM friend WHERE uid2=me())' ,
      ' ORDER BY last_name'
    ];

    var UID_FILTER_IDX = 6;

    // Query that retrieves information about the person in relationship with
    var RELATIONSHIP_QUERY = [
      'SELECT uid, name from user WHERE uid IN' ,
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
    var multiqObj = {
      query1: FRIENDS_QUERY.join(''),
      query2: REL_MULTIQ
    };

    // Multiquery String
    var multiQStr = JSON.stringify(multiqObj);

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
      Importer.getFriends(at);
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

        var input = ele.querySelector('input');
        input.checked = true;

        ele.setAttribute('aria-disabled', 'true');
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

      fb.utils.runQuery(multiQStr, {
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

    Importer.importFriend = function(uid, access_token) {
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
        var friend = response.data[0].fql_result_set[0];
        if (friend) {
          fillData(friend);

          friendsPartners =
                      parseFriendsPartners(response.data[1].fql_result_set);

          var cimp = new ContactsImporter([friend]);
          cimp.start();
          cimp.onsuccess = function() {
            currentRequest.done();
          }
        }
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

      var queries = {query1: query1, query2: REL_MULTIQ};

      return JSON.stringify(queries);
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
    Importer.friendsReady = function(response) {
      if (typeof response.error === 'undefined') {
        var lmyFriends = response.data[0].fql_result_set;

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

        // My friends partners
        friendsPartners = parseFriendsPartners(response.data[1].fql_result_set);

        contacts.List.load(myFriends, friendsAvailable);

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
      // givenName is put as name but it should be f.first_name
      f.familyName = [f.last_name];
      f.additionalName = [f.middle_name];
      f.givenName = [f.first_name + ' ' + f.middle_name];

      var privateType = 'personal';

      if (f.email) {
        f.email1 = f.email;
        f.email = [{type: [privateType], value: f.email}];
      }
      else { f.email1 = ''; }

      var nextidx = 0;
      if (f.cell) {
        f.tel = [{type: [privateType], value: f.cell}];
        nextidx = 1;
      }

      if (f.other_phone) {
        if (!f.tel) {
          f.tel = [];
        }
        f.tel[nextidx] = {type: [privateType], value: f.other_phone};
      }

      f.uid = f.uid.toString();
    }


    /**
     *  This function is invoked when the user starts the process of importing
     *
     */
    UI.importAll = function(e) {
      if (Object.keys(selectedContacts).length > 0) {

        Importer.importAll(function() {

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
     *  Obtains a img DOM Element with the Contact's img
     *
     */
    function getContactImg(uid, cb) {
      var imgSrc = 'http://graph.facebook.com/' + uid + '/picture?type=large';

      var xhr = new XMLHttpRequest({
        mozSystem: true
      });
      xhr.open('GET', imgSrc, true);
      xhr.responseType = 'blob';

      xhr.timeout = fb.operationsTimeout;

      xhr.onload = function(e) {
        if (xhr.status === 200 || xhr.status === 0) {
          var mblob = e.target.response;
          cb(mblob);
        }
      }

      xhr.ontimeout = function(e) {
        window.console.error('FB: Timeout!!! while retrieving img for uid',
                                                                          uid);

        // This callback has been added mainly for unit testing purposes
        if (typeof Importer.imgTimeoutHandler === 'function') {
          Importer.imgTimeoutHandler();
        }

        cb(null);
      }

      xhr.onerror = function(e) {
        window.console.error('FB: Error while retrieving the img', e);
        cb(null);
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
        ret.setMonth(parseInt(smonth) - 1, parseInt(sday));

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

          var fbInfo = {
                          marriedTo: marriedTo,
                          studiedAt: studiedAt,
                          bday: birthDate,
                          org: [worksAt]
          };

          // Check whether we were able to get the photo or not
          if (photo) {
            fbInfo.photo = [photo];
          }

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
        });  // getContactPhoto
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
