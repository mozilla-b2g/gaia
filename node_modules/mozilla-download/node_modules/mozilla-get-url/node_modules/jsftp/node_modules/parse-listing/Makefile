# use the tools as dev dependencies rather than installing them globaly
# it lets you handle specific versions of the tooling for each of your projects
MOCHA=node_modules/.bin/mocha
_MOCHA="node_modules/.bin/_mocha"
ISTANBUL=node_modules/.bin/istanbul
JSHINT=node_modules/.bin/jshint

# test files must end with ".test.js"
TESTS=$(shell find test/ -name "*.test.js")

clean:
	rm -rf reports

test:
	$(MOCHA) -R spec $(TESTS)

coverage:
	@# check if reports folder exists, if not create it
	@test -d reports || mkdir reports
	$(ISTANBUL) cover --report lcovonly --dir ./reports $(_MOCHA) -- -R spec $(TESTS)

jshint:
	$(JSHINT) src test --show-non-errors

checkstyle:
	@# check if reports folder exists, if not create it
	@test -d reports || mkdir reports
	$(JSHINT) src test --reporter=checkstyle > reports/checkstyle.xml

.PHONY: clean test coverage jshint checkstyle
