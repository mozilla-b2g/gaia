.PHONY: deploydata clean

deploydata: data.txt data-tr.txt
	./cook.sh
	
rawdict.txt: rawdict_utf16_65105_freq.txt
	iconv -f UTF-16 -t UTF-8 rawdict_utf16_65105_freq.txt -o $@

valid.txt: valid_utf16.txt
	iconv -f UTF-16 -t UTF-8 valid_utf16.txt -o $@

data.txt: rawdict.txt 
	awk '$$3="0"{print $$0}' rawdict.txt > $@

data-tr.txt: data.txt
	cconv -f UTF8-CN -t UTF8-HK data.txt -o $@

clean:
	rm -f data.txt
	rm -f data-tr.txt
	rm -f rawdict.txt
