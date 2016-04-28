#include <iostream>
#include <unistd.h>
#include <assert.h>
#include <cstdio>
#include <errno.h>
#include<stdio.h>
#include<string.h>
#include<errno.h>
#include<stdlib.h>

int main()
{
	assert(chdir("/home/killerfear/node_project/OJSystem") == 0);
	if (chroot("/home/killerfear/node_project/OJSystem") != 0) {
		printf("%d %s\n", errno, strerror(errno));
		return -1;
	}
	printf("OK");
	for (;;);
}
