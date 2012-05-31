# Japanese IME

About Dictionary

This IME uses the dictionary in Anthy (anthy-9100).
Homepage of Anthy is http://en.sourceforge.jp/projects/anthy/

The dictionary data is in $ANTHY/alt-cannadic/gcanna.ctd

First, this file must converted to UTF-8
iconv -f euc-jp -t utf-8 gcannaf.ctd > gcannaf.ctd.new

Then create json file
cat gcannaf.ctd.new | js -U dict/cook.js > dict.json
