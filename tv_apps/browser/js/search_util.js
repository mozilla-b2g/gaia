'use strict';

var SearchUtil = {
  // country code
  COUNTRY: 'US',

  /* search engine list of the search bar */
  ENGINE_LIST: {
    'CN': [
      {id: 2, name: 'Baidu'},
      {id: 1, name: 'Bing'}
    ],
    // default
    'US': [
      {id: 1, name: 'Bing'},
      {id: 0, name: 'Google'}
    ]
  },
  // search engine
  engineList: null,
  searchId: null,
  searchIdx: null,

  DOMAIN_LIST: {
    'US':'com'    , 'CA':'ca'     , 'DE':'de'     , 'IE':'ie'     , 
    'NL':'nl'     , 'HU':'hu'     , 'PL':'pl'     , 'CZ':'cz'     , 
    'SK':'sk'     , 'IT':'it'     , 'GB':'co.uk'  , 'SI':'si'     , 
    'GR':'gr'     , 'PT':'pt'     , 'DK':'dk'     , 'FI':'fi'     , 
    'HR':'hr'     , 'NO':'no'     , 'RO':'ro'     , 'RU':'ru'     , 
    'BG':'bg'     , 'LT':'lt'     , 'YU':'rs'     , 'SE':'se'     , 
    'LV':'lv'     , 'EE':'ee'     , 'TR':'com.tr' , 'BR':'com.br' , 
    'ID':'co.id'  , 'CN':'com.hk' , 'TW':'com.tw' , 'HK':'com.hk' , 
    'VN':'com.vn' , 'TH':'co.th'  , 'SA':'com.sa' , 'FR':'fr'     , 
    'ES':'es'     , 'SG':'com.sg' , 'AU':'com.au' , 'NZ':'co.nz'  , 
    'IN':'co.in'  , 'MY':'com.my' , 'AE':'ae'     , 'KW':'com.kw' , 
    'MX':'com.mx' , 'AT':'at'     , 'BE':'be'     , 'CH':'ch'     , 
    'MT':'com.mt' , 'AD':':'      , 'LU':'lu'     , 'IS':'is'     , 
    'UA':'com.ua' , 'KZ':'kz'     , 'CIS':'by'    , 'UK':'co.uk'  , 
    'CL':'cl'     , 'PE':'com.pe' , 'CO':'com.co' , 'AR':'com.ar' , 
    'PA':'com.pa' , 'JP':'co.jp'  , 'MK':'mk'     , 'MM':'com.mm'
  },
  // search domain
  domainList: null,

  /* URL of each search engine */
  SEARCH_URL: {
    //Google :
    0 : [
      "http://www.google.DOMAIN/search?ie=UTF-8&oe=UTF-8&q=",
      "http://www.google.DOMAIN/search?ie=UTF-8&oe=UTF-8&tbm=isch&q=",
      "http://www.google.DOMAIN/search?ie=UTF-8&oe=UTF-8&tbm=vid&q=",
      "http://www.google.DOMAIN/search?ie=UTF-8&oe=UTF-8&tbm=nws&q=",
      "http://maps.google.com/maps?q=",
      "http://www.youtube.DOMAIN/results?search_query="
    ],
    //bing :
    1 : [
      "http://www.bing.com/search?FORM=PANSSB&PC=PANS&q=",
      "http://www.bing.com/images/search?FORM=PANSSB&PC=PANS&q=",
      //"http://www.bing.com/videos/search?FORM=PANSSB&PC=PANS&q=",
      "http://www.bing.com/?scope=video&FORM=PANSSB&PC=PANS&q=",
      "http://www.bing.com/news/search?FORM=PANSSB&PC=PANS&q=",
      "http://www.bing.com/maps/?FORM=PANSSB&PC=PANS&q=",
      "http://www.bing.com/videos/search?FORM=PANSSB&PC=PANS&q="
    ],
    //Baidu :
    2 : [
      "http://www.baidu.com/s?word=",
      "http://image.baidu.com/i?word=",
      "http://video.baidu.com/v?word=",
      "http://news.baidu.com/ns?word=",
      "http://map.baidu.com/m?word=",
      "http://video.baidu.com/v?word="
    ]
  },
  searchUrl: null,

  // keyword for auto category selection at voice search
  SEARCH_CAT: {
    //Google :
    0 :
    [
      [ [ "www.google.",  "/search", ""         ] ],
      [ [ "www.google.",  "/search", "tbm=isch" ],
        [ "www.google.",  "/imghp",  ""         ] ],
      [ [ "www.google.",  "/search", "tbm=vid"  ],
        [ "www.google.",  "/videohp",""         ] ],
      [ [ "www.google.",  "/search", "tbm=nws"  ],
        [ "news.google.", "/nwshp",  ""         ] ],
      [ [ "maps.google.", "",        ""         ],
        [ "www.google.",  "/maps",   ""         ] ],
      [ [ "www.youtube.", "",        ""         ] ]
    ],
    //Bing :
    1 :
    [
      [ [ "www.bing.com", "/search", ""             ] ],
      [ [ "www.bing.com", "/images", ""             ],
        [ "www.bing.com", "",        "scope=images" ] ],
      [ [ "www.bing.com", "/videos", ""             ],
        [ "www.bing.com", "",        "scope=video"  ] ],
      [ [ "www.bing.com", "/news",   ""             ],
        [ "www.bing.com", "",        "scope=news"   ] ],
      [ [ "www.bing.com", "/maps",   ""             ] ],
      [ [ "www.bing.com", "/videos", ""             ],
        [ "www.bing.com", "",        "scope=video"  ] ]
    ],
    //Baidu :
    2 :
    [
      [ [ "www.baidu.com",   "", "" ] ],
      [ [ "image.baidu.com", "", "" ] ],
      [ [ "video.baidu.com", "", "" ] ],
      [ [ "news.baidu.com",  "", "" ] ],
      [ [ "map.baidu.com",   "", "" ] ],
      [ [ "video.baidu.com", "", "" ] ]
    ]
  },

  displaySearchEngineName: false,

  /**
   * init SearchUtil
   */
  init: function searchUtil_init(country, cb) {
    // set country code
    this.COUNTRY = country;

    // search engine (default US)
    this.engineList = (country in this.ENGINE_LIST)?
        this.ENGINE_LIST[country]: this.ENGINE_LIST['US'];

    // search domain (default US)
    this.domainList = (country in this.DOMAIN_LIST)?
        this.DOMAIN_LIST[country]: this.DOMAIN_LIST['US'];

    // search URL (default US)
    this.searchUrl = this.SEARCH_URL;
    var index;
    for(index in this.searchUrl[0]){
      this.searchUrl[0][index] =
          this.searchUrl[0][index].replace(/DOMAIN/, this.domainList);
    }

    // get all database
    this.getAllDatabase(cb);
  },

  /**
   * get all database
   */
  getAllDatabase: function searchUtil_getAllDatabase(cb){
    // DB get all
    this.getSearchEngineId((function(){
      this.initDatabase((function(){
        if(cb){
          cb();
        }
      }).bind(this))
    }).bind(this));
  },

  // init database
  initDatabase: function search_initDatabase(cb){
    // default search engine url
    if(this.searchId != null){
      this.convSearchIdToIdx(this.searchId);
    }else{
      this.searchIdx = 0;
      this.displaySearchEngineName = true;
    }
    if(cb){
      cb();
    }
  },

  // get search engine id
  getSearchEngineId: function searchUtil_getSearchEngineId(cb){
    BrowserDB.getSetting('SEARCH_ENGINE', (function(result) {
      Browser.debug("SEARCH_ENGINE = " + result);
      if(result != undefined){
        this.searchId = result;
        this.convSearchIdToIdx(result);
      }
      if(cb){
        cb(result);
      }
    }).bind(this));
  },

  // set search engine id
  setSearchEngineId: function searchUtil_setSearchEngineId(id, cb){
    this.searchId = id;
    this.convSearchIdToIdx(id);
    BrowserDB.updateSetting(id, 'SEARCH_ENGINE', cb);
  },

  // get search engine index
  getSearchEngineIdx: function searchUtil_getSearchEngineIdx(cb){
    if(this.searchId){
      this.convSearchIdToIdx(this.searchId);
      if(cb){
        cb();
      }
    }else{
      BrowserDB.getSetting('SEARCH_ENGINE', (function(result) {
        if(result != undefined){
          this.convSearchIdToIdx(result);
        }
        if(cb){
          cb();
        }
      }).bind(this));
    }
  },

  // Convert the search_id (DB) to search index.
  convSearchIdToIdx: function searchUtil_convSearchIdToIdx(search_id) {
    var index = null;
    for(var i in this.engineList){
      if(search_id == this.engineList[i].id){
        index = i;
        break;
      }
    }
    if(index == null){
      // terminated search service of Web. so select default.
      this.searchIdx = 0;
      this.searchId = this.engineList[0].id;
      BrowserDB.updateSetting(undefined, 'SEARCH_ENGINE');
      this.displaySearchEngineName = false;
    }else{
      this.searchIdx = index;
      this.displaySearchEngineName = true;
    }
  },

  // Get Search Engine List.
  getEngineList: function searchUtil_getEngineList(){
    return this.engineList;
  },
  // Get Current Search Engine List.
  getCurrentEngineList: function searchUtil_getCurrentEngineList(){
    if(this.searchIdx != null && this.searchIdx < this.engineList.length) {
      return this.engineList[this.searchIdx];
    }else{
      return this.engineList[0];
    }
  },
  // Get Current Search Engine Name.
  getCurrentEngineName: function searchUtil_getCurrentEngineName(){
    if(this.searchIdx != null && this.searchIdx < this.engineList.length) {
      return this.engineList[this.searchIdx].name;
    }else{
      return this.engineList[0].name;
    }
  },
  // Get Search Id.
  getSearchId: function searchUtil_getSearchId(){
    return this.searchId;
  },
  // Get Search Index.
  getSearchIdx: function searchUtil_getSearchIdx(){
    return this.searchIdx;
  },
  // Get Search Url.
  getSearchUrl: function searchUtil_getSearchUrl(){
    return this.searchUrl;
  },
  // Get Current Search Url.
  getCurrentSearchUrl: function searchUtil_getCurrentSearchUrl(){
    if(this.searchId != null && (this.searchId in this.searchUrl)){
      return this.searchUrl[this.searchId];
    }else{
      return this.searchUrl[this.engineList[0].id];
    }
  },
  // Get Display Search Engine Name flag.
  getDispFlag: function searchUtil_getDispFlag(){
    return this.displaySearchEngineName;
  },
};

