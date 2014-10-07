SOURCES=$(wildcard doc/*.md)
TARGETS=$(addprefix target/, $(SOURCES:.md=.1))

MANPATH?=/usr/local/man/man1/
BINPATH?=/usr/local/bin/

target: target/doc $(TARGETS)

target/doc:
	mkdir -p $@

$(TARGETS): $(SOURCES)
	pandoc -s -t man -o $@ $^

# For local installation of files...
install: target
	install $(wildcard target/doc/*) $(MANPATH)
	install $(wildcard git-ci-*) $(BINPATH)

check:
	cd tests && ./all

clean:
	rm -Rf target tests/staging
