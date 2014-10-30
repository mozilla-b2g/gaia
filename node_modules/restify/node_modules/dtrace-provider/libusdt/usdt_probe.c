/*
 * Copyright (c) 2012, Chris Andrews. All rights reserved.
 */

#include "usdt_internal.h"

#ifdef __APPLE__

uint32_t
usdt_probe_offset(usdt_probe_t *probe, char *dof, uint8_t argc)
{
        uint32_t offset;
#ifdef __x86_64__
        offset = ((uint64_t) probe->probe_addr - (uint64_t) dof + 2);
#elif __i386__
        offset = ((uint32_t) probe->probe_addr - (uint32_t) dof + 2);
#else
#error "only x86_64 and i386 supported"
#endif
        return (offset);
}

uint32_t
usdt_is_enabled_offset(usdt_probe_t *probe, char *dof) 
{
        uint32_t offset;
#ifdef __x86_64__
        offset = ((uint64_t) probe->isenabled_addr - (uint64_t) dof + 6);
#elif __i386__
        offset = ((uint32_t) probe->isenabled_addr - (uint32_t) dof + 6);
#else
#error "only x86_64 and i386 supported"
#endif
        return (offset);
}

#else /* solaris and freebsd */

uint32_t
usdt_probe_offset(usdt_probe_t *probe, char *dof, uint8_t argc)
{
        return (16);
}

uint32_t
usdt_is_enabled_offset(usdt_probe_t *probe, char *dof)
{
        return (8);
}

#endif

int
usdt_create_tracepoints(usdt_probe_t *probe)
{
        size_t size;

        /* ensure that the tracepoints will fit the heap we're allocating */
        size = ((char *)usdt_tracepoint_end - (char *)usdt_tracepoint_isenabled);
        assert(size < FUNC_SIZE);

        if ((probe->isenabled_addr = (int (*)())valloc(FUNC_SIZE)) == NULL)
                return (-1);

        size = ((char *)usdt_tracepoint_probe - (char *)usdt_tracepoint_isenabled);
        probe->probe_addr = (char *)probe->isenabled_addr + size;

        memcpy((void *)probe->isenabled_addr,
               (const void *)usdt_tracepoint_isenabled, FUNC_SIZE);
        mprotect((void *)probe->isenabled_addr, FUNC_SIZE,
                 PROT_READ | PROT_WRITE | PROT_EXEC);

        return (0);
}
