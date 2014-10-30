.PHONY: test
test:
	./node_modules/mocha/bin/mocha --ui tdd -t 100s test/index

.PHONY: ci
ci:
	nohup Xvfb :99 &
	DISPLAY=:99 make test
