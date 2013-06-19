# After building a dictionary here, move the resulting .dict file to
# apps/keyboard/js/imes/latin/dictionaries/ and check it in.

XMLS = $(shell ls *_wordlist.xml.gz)
DICTS = $(patsubst %_wordlist.xml.gz,%.dict,$(XMLS))

%.dict: %_wordlist.xml.gz xml2dict.py
	gzcat $< | python xml2dict.py -o $@ /dev/stdin

all: $(DICTS)

