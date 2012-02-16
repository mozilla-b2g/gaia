/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
var dictionary = new PhraseDictionary();
var loader = new XMLHttpRequest();
loader.open('GET', './imes/jspinyin/db.json');
loader.responseType = 'json';
loader.onreadystatechange = function(event) {
  if (loader.readyState == 4) {
    dictionary.addPhrases(loader.response);
  }
};
loader.send();
var splitter = new SyllableSplitter();
var engine = new PinyinImEngine(dictionary, splitter);

