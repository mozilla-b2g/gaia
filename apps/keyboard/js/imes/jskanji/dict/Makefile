.PHONY: deploydata clean
	
deploydata: gcanna.txt cook.js
	cat gcanna.txt | js -U cook.js > ../dict.json

gcanna.txt: gcanna.ctd
	iconv -f euc-jp -t utf-8 gcanna.ctd -o $@

clean:
	rm -f gcanna.txt