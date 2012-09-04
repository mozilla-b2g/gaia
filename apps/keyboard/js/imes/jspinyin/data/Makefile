.PHONY: dictbuilder clean

dictbuilder: rawdict.txt rawdict_tr.txt valid.txt pinyinime_dictbuilder.js
	js -U pinyinime_dictbuilder.js > ../db.json

rawdict.txt: rawdict_utf16_65105_freq.txt
	iconv -f UTF-16 -t UTF-8 rawdict_utf16_65105_freq.txt -o $@

rawdict_tr.txt: rawdict.txt
	cconv -f UTF8-CN -t UTF8-HK rawdict.txt -o $@

valid.txt: valid_utf16.txt
	iconv -f UTF-16 -t UTF-8 valid_utf16.txt -o $@

clean:
	rm -f rawdict.txt
	rm -f rawdict_tr.txt
	rm -f valid.txt
