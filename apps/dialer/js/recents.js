'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',
  _prettyDatesInterval: null,

  get view() {
    delete this.view;
    return this.view = document.getElementById('contacts-container');
  },

  init: function re_init() {

    this._openreq = mozIndexedDB.open(this.DBNAME);

    var self = this;
    this._openreq.onsuccess = function re_dbOnSuccess() {
      self._recentsDB = self._openreq.result;
    };

    this._openreq.onerror = function re_dbOnError(e) {
      console.log('Can\'t open dialerRecents database', e);
    };

    // DB init
    this._openreq.onupgradeneeded = function() {
      var db = self._openreq.result;
      if (db.objectStoreNames.contains(self.STORENAME))
        db.deleteObjectStore(self.STORENAME);
      db.createObjectStore(self.STORENAME, { keyPath: 'date' });
    };

    this.startUpdatingDates();
  },

  cleanup: function re_cleanup() {
    if (this._recentsDB)
      this._recentsDB.close();

    this.stopUpdatingDates();
  },

  getDatabase: function re_getDatabase(callback) {
    var self = this;
    if (!this._recentsDB) {
      this._openreq.addEventListener('success', function re_DBReady() {
        self._openreq.removeEventListener('success', re_DBReady);
        self.getDatabase(callback);
      });
      return;
    }

    callback(this._recentsDB);
  },


  add: function re_add(recentCall) {
    this.getDatabase((function(database) {
      var txn = database.transaction(this.STORENAME, 'readwrite');
      var store = txn.objectStore(this.STORENAME);

      var setreq = store.put(recentCall);
      
      setreq.onsuccess = (function(){
        console.log("**** *** *** DB INIT ** **** *****");

        this.render();
        console.log("**** *** *** DB FIN ** **** *****");
      }).bind(this);
      // setreq.onsuccess = (function() {

      //   console.log("***** REPINTADA!!!! *******");
      //   Recents.render();

      //   console.log("***** NEW DATABASE ITEM ADDED *******");
        
      //     //TODO Check if we are in other day
      //       // if(Recents.getDayDate(recentCall.date)!=Recents.current_token)
      //       // {
      //       //Repaint
            
      //     // }else{
      //     //   //Append
      //     //   console.log("****** INSERT BEFORE INIT*****");
      //     //   document.getElementById(Recents.current_token).insertBefore(Recents.createEntry(recentCall), document.getElementById(Recents.current_token).firstChild);
      //     //   console.log("****** INSERT BEFORE END *****");
      //     // }
          

      //     // var entry = this.createEntry(recentCall);
      //     // var firstEntry = this.view.firstChild;
      //     // this.view.insertBefore(entry, firstEntry);
       
      // }).bind(this);

      setreq.onerror = function(e) {
        console.log('dialerRecents add failure: ', e.message, setreq.errorCode);
      };
    }).bind(this));
  },

  createEntry: function re_createEntry(recent) {
    var entry = document.createElement('li');
    entry.classList.add('log-item');
   
    
   
    var html_structure = "<section class='icon-container grid center'>";
        //TODO Ponemos un SWITCH para añadir una u otra clase
          html_structure += "<div class='grid-cell grid-v-align'><div class='icon icon-incoming'></div></div>"
        html_structure += "</section>";
        html_structure += "<section class='log-item-info grid'>";
          html_structure +="<div class='grid-cell grid-v-align'>"
          //TODO Añadir la consulta a la BBDD
            html_structure +="<section class='primary-info ellipsis'>"+recent.number+"</section>"
            html_structure +="<section class='secondary-info ellipsis'>"+prettyDate(recent.date)+"</section>"
          html_structure +="</div>"
        html_structure += "</section>";
    
     entry.innerHTML = html_structure;
    
    // if (recent.number) {
    //   Contacts.findByNumber(recent.number, (function(contact) {
    //     this.querySelector('.name').textContent = contact.name;
    //     this.querySelector('.number').textContent = contact.tel[0].number;
    //   }).bind(entry));
    // }

    return entry;
  },
  checkHeaders: function re_checkHeaders(){
    alert("Check Headers");
  },
  render: function re_render() {
    console.log("**** RENDER INIT *****");
    // if (!this.view)
    //   return;
    console.log("**** RENDER INIT BIS *****");
    
    this.view.innerHTML = '';

   
    
    // this.history((function(history) {
      // // MOCKUP
      // var history=[];
      // for (var i = 1; i < 100; i++) {
        
      //     var date=i*100000000;
        
      //   var com_log={
      //     date:date,
      //     type:1,
      //     number:'002020202020'

      //   }
      //   history.push(com_log);
        

      // }

    // this.history.call(this,function(history){
      // alert("START");
      // alert(JSON.stringify(history));
      // this.view.innerHTML=JSON.stringify(history);
    this.history((function(recents){
      console.log("************** Pintar la historia!!!!! **********");
      console.log(JSON.stringify(recents));

      // // MOCKUP
      // var history=[];
      // for (var i = 1; i < 100; i++) {
        
      //     var date=i*100000000;
        
      //   var com_log={
      //     date:date,
      //     type:1,
      //     number:'002020202020'

      //   }
      //   history.push(com_log);
        

      // }


      
      this.view.innerHTML='';
    // }).bind(this));
    // this.history(function(recents){
    //   alert("START");
    //   alert(JSON.stringify(recents));
    //   alert("FIN");
    // }).bind(this);
      //Sort by DATE
      // recents.sort(function(a,b){
      //   return a.date-b.date;
      // });

      Recents.current_token=0;
      
      for (var i = 0; i < recents.length; i++) {
        // alert(i);
        var token_tmp = Recents.getDayDate(recents[i].date);
        // alert(token_tmp);
        if(token_tmp > Recents.current_token){
          
          Recents.current_token = token_tmp;
          //Toca añadir un header
          var html_structure = "<section data-timestamp="+Recents.current_token+">";
          html_structure+="<h2>";
          html_structure+=prettyDate(Recents.current_token);
          html_structure+="</h2>";
          html_structure+="<ol id='"+Recents.current_token+"'  class='log-group'>";
          
          //TODO 
          // html_structure+=this.createEntry(history[i]);

          html_structure+="</ol>";
          html_structure+="</section>";


          this.view.innerHTML+=html_structure;

          document.getElementById(Recents.current_token).appendChild(this.createEntry(recents[i]));
        }else{
          // document.getElementById(current_token).innerHTML+=this.createEntry(history[i]);
          document.getElementById(Recents.current_token).appendChild(this.createEntry(recents[i]));
        }


      

      
     }//FOR END
     console.log("************** FIN la historia!!!!! **********");
     // alert("FIN");
    // }) ; 
  }).bind(this));

    
  },
  getDayDate: function re_getDayDate(timestamp){

    var date = new Date(timestamp);
    var start_date = new Date(date.getFullYear(),date.getMonth(),date.getDate());
    return start_date.getTime();
  },
  history: function re_history(callback) {
    this.getDatabase((function(database) {
      var recents = [];

      var txn = database.transaction(this.STORENAME, 'readonly');
      var store = txn.objectStore(this.STORENAME);

      var cursor = store.openCursor(null, 'prev');
      cursor.onsuccess = function(event) {
        var item = event.target.result;
        if (item) {
          recents.push(item.value);
          item.continue();
        } else {
          callback(recents);
        }
      };

      cursor.onerror = function(event) {
        callback([]);
      };
    }).bind(this));
  },

  showLast: function re_showLast() {
    this.view.scrollTop = 0;
  },

  startUpdatingDates: function re_startUpdatingDates() {
    if (this._prettyDatesInterval || !this.view)
      return;

    var self = this;
    var updatePrettyDates = function re_updateDates() {
      var datesSelector = '.timestamp[data-time]';
      var datesElements = self.view.querySelectorAll(datesSelector);

      for (var i = 0; i < datesElements.length; i++) {
        var element = datesElements[i];
        var time = parseInt(element.dataset.time);
        element.textContent = prettyDate(time);
      }
    };

    this._prettyDatesInterval = setInterval(updatePrettyDates, 1000 * 60 * 5);
    updatePrettyDates();
  },

  stopUpdatingDates: function re_stopUpdatingDates() {
    if (this._prettyDatesInterval) {
      clearInterval(this._prettyDatesInterval);
      this._prettyDatesInterval = null;
    }
  }
};

window.addEventListener('load', function recentsSetup(evt) {
  window.removeEventListener('load', recentsSetup);
  Recents.init();
  Recents.render();
});

window.addEventListener('unload', function recentsCleanup(evt) {
  window.removeEventListener('unload', recentsCleanup);
  Recents.cleanup();
});
