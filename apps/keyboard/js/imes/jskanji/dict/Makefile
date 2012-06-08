.PHONY: all clean

all: combine encode py

combine:
	find . -name '*.dic' -exec cat {} >> dict \;

encode: dict
	iconv -f euc-jp -t utf-8 dict > dict.tmp
	rm dict

py:
	python conv.py
	rm dict.tmp
