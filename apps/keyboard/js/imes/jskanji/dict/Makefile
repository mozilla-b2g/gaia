.PHONY: json clean

json: dict.utf8
	python conv.py

dict:
	find ipadic -name "*.dic" -exec cat {} >> $@ \;

dict.utf8: dict
	iconv -f euc-jp -t utf-8 dict > $@

clean:
	rm dict
	rm dict.utf8
	rm *.pyc
