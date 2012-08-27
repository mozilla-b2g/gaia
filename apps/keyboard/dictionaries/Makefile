DICTS = $(shell ls *.xml | sed -e 's/_wordlist\.xml/.dict/')

%.dict: %_wordlist.xml xml2dict.py
	python xml2dict.py -o $@ $<

all: $(DICTS)
