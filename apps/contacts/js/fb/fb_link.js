var fb = window.fb || {};

if(!fb.link) {
  (function(document) {
    var link = fb.link = {};
    var UI = link.ui = {};

    var contactid;

    // fills the data to obtain a proposal (FB Private API)
    function getEntry(contact) {
      var data = {};
      data.name = contact.name[0];

      if(contact.tel && contact.tel.length > 0) {
        data.phones = [];
        contact.tel.forEach(function(tel) {
          data.phones.push(tel.number);
        });
      }

      if(contact.email && contact.email.length > 0) {
        data.emails = [];
        contact.email.forEach(function(email) {
          data.emails.push(email.address);
        });
      }

      return data;
    }

    // entry point for obtaining a remote proposal
    link.getRemoteProposal = function (access_token,cid) {
      var req = fb.utils.getContactData(cid);

      req.onsuccess = function() {
        window.console.log('OWDError: onsuccess called')
        if(req.result) {
          var contactData = req.result;
          window.console.log('OWDError: Contact data',contactData.id);
          doGetRemoteProposal(access_token, contactData);
        }
        else {
          throw('FB: Contact to be linked not found' + contactId);
        }
      }
      req.onerror = function() {
        throw('FB: Error while retrieving contact data');
      }
    }

    // Performs all the work to obtain the remote proposal
    function doGetRemoteProposal(access_token,contactData) {
      document.body.dataset.state = 'waiting';

      var searchService = 'https://api.facebook.com/method/phonebook.lookup' +
                                                      '?include_non_fb=false';
      var entries = [];
      entries.push(getEntry(contactData));
      var sentries = JSON.stringify(entries);

      window.console.log('OWDError: Entries',sentries);

      var params = [fb.ACC_T + '=' + access_token,'entries=' +
                    encodeURIComponent(sentries),
                    'format=json','callback=fb.link.proposalReady'];

      var queryParams = params.join('&');

      var jsonp = document.createElement('script');
      jsonp.src = searchService + '&' + queryParams;
      window.console.log('OWDError:',jsonp.src);

      // document.body.appendChild(jsonp);
      link.proposalReady([ { name: 'Pablo Cabezas', uid: '1178033192'} ]);
    }

    // Obtains a proposal from the already imported contact list
    function getLocalProposal(contact) {
      var fields = ['givenName','familyName','email','tel'];

      var filterCandidates = {
        filterBy: ['category'],
        filterValue: [fb.NOT_LINKED],
        filterOp: 'contains'
      };

      // fields.forEach()
    }

    // When the access_token is available it is executed
    function tokenReady(at) {
      link.getRemoteProposal(at,contactid);
    }

    // Obtains a linking proposal to be shown to the user
    link.getProposal = function (cid) {
      contactid = cid;
      window.console.log('OWDError: Get Proposal called!!');
      fb.oauth.getAccessToken(tokenReady,'proposal');
    }

    // Executed when the jsonp response is available
    link.proposalReady = function (data) {
      data.forEach(function(item) {
        if(typeof item.email === 'undefined') {
          item.email = '';
        }
      });

      utils.templates.append('#friends-list',data);

      document.body.dataset.state = 'selection';
    }

    UI.selected = function(event) {
      var element = event.target;
      window.console.log('OWDError: ',element.dataset.uuid);
      var msg = {};
      msg.type = 'item_selected';
      msg.data = element.dataset.uuid;

      parent.postMessage(msg,'*');
    }

  })(document);
}
