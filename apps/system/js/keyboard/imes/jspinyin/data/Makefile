.PHONY: deploydata clean

deploydata: data.txt
	./cook.sh data.txt
        
rawdict.txt: rawdict_utf16_65105_freq.txt
	iconv -f UTF-16 -t UTF-8 rawdict_utf16_65105_freq.txt  -o $@

data.txt: rawdict.txt 
	awk '$$3="0"{print $$0}' rawdict.txt > $@
clean:
	rm -f data.txt
	rm -f rawdict.txt
