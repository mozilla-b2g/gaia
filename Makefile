INJECTED_GAIA = "$(MOZ_OBJDIR)/_tests/testing/mochitest/tests/gaia"
mochitest:
	test -L $(INJECTED_GAIA) || ln -s $(GAIA) $(INJECTED_GAIA)
	TEST_PATH=gaia/tests/ make -C $(MOZ_OBJDIR) mochitest-plain
