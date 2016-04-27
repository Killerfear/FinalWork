#include <node.h>
#include <v8.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <unistd.h>
#include <assert.h>
#include <time.h>
#include <stdarg.h>
#include <ctype.h>
#include <sys/wait.h>
#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/user.h>
#include <sys/syscall.h>
#include <sys/time.h>
#include <sys/resource.h>
#include <sys/signal.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <errno.h>
#include <vector>
#include <string>

using namespace v8;
using std::vector;
using std::string;

const int STD_MB = 1048576;
const int STD_T_LIM = 2;
const int STD_F_LIM = STD_MB<<5;
const int STD_M_LIM = STD_MB<<7;
const int BUFFER_SIZE = 512;

const int OJ_PENDING = 0;
const int OJ_COMPILE = 1;
const int OJ_RUNNING = 2;
const int OJ_CE = 3;
const int OJ_RE = 4;
const int OJ_MLE = 5;
const int OJ_TLE = 6;
const int OJ_OL = 7;
const int OJ_AC = 8;
const int OJ_WA = 9;
const int OJ_PE = 10;

const int use_max_time = 0;


#ifdef __i386
#define REG_SYSCALL orig_eax
#define REG_RET eax
#define REG_ARG0 ebx
#define REG_ARG1 ecx
#else
#define REG_SYSCALL orig_rax
#define REG_RET rax
#define REG_ARG0 rdi
#define REG_ARG1 rsi

#endif


int LANG_CV[256]=
#if __WORDSIZE == 64
	{SYS_time,SYS_read, SYS_uname, SYS_write, SYS_open, SYS_close, SYS_execve, SYS_access, SYS_brk, SYS_munmap, SYS_mprotect, SYS_mmap, SYS_fstat, SYS_set_thread_area, 252,0};
#else
	{SYS_time,SYS_read, SYS_uname, SYS_write, SYS_open, SYS_close, SYS_execve, SYS_access, SYS_brk, SYS_munmap, SYS_mprotect, SYS_mmap2, SYS_fstat64, SYS_set_thread_area, 252,0};
#endif

int LANG_CC[256]={1,-1,-1,-1,-1,-1,1,-1,-1,1,-1,-1,-1,-1,2,0};

int call_counter[512];

void initSyscallsLimits()
{
	int i;
	memset(call_counter, 0, sizeof(call_counter));
	for (i = 0; LANG_CC[i]; i++)
	{
		call_counter[LANG_CV[i]] = LANG_CC[i];
	}

}

//getParameters(args, workDir, fullPath, memLimit, timeLimit, isspj);
void getParameters(const FunctionCallbackInfo<Value>& args, string & workDir, string & fullPath,
						  int & memLimit, int & timeLimit, int & isspj)
{
	Isolate* isolate = args.GetIsolate();
	//solutionId, [files], problem_id
	if (args.Length() != 5) {
		isolate->ThrowException(Exception::TypeError(
					String::NewFromUtf8(isolate, "Wrong number of arguments")));
		return;
	}

	/*if (!args[0]->IsString() || !args[1]->IsString() || !args[2]->IsNumber()
			|| !args[3]->IsNumber() || !args[4]->IsNumber()) {
		isolate->ThrowException(Exception::TypeError(
		        String::NewFromUtf8(isolate, "Wrong arguments")));
	}*/

	memLimit = args[2]->NumberValue();
	timeLimit = args[3]->NumberValue();
	isspj = args[4]->NumberValue();

	workDir = *String::Utf8Value((args[0]->ToString()));
	fullPath = *String::Utf8Value((args[1]->ToString()));
}


int executeCmd(const char * fmt, ...)
{
	static char cmd[BUFFER_SIZE];

	int ret = 0;
	va_list ap;

	va_start(ap, fmt);
	vsprintf(cmd, fmt, ap);
	ret = system(cmd);
	va_end(ap);
	return ret;
}

int getProcStatus(int pid, const char * mark)
{
	FILE * pf;
	char fn[BUFFER_SIZE], buf[BUFFER_SIZE];
	int ret = 0;
	sprintf(fn, "/proc/%d/status", pid);
	pf = fopen(fn, "r");
	int m = strlen(mark);
	while (pf && fgets(buf, BUFFER_SIZE - 1, pf))
	{

		buf[strlen(buf) - 1] = 0;
		if (strncmp(buf, mark, m) == 0)
		{
			sscanf(buf + m + 1, "%d", &ret);
		}
	}
	if (pf)
		fclose(pf);
	return ret;
}

void printRuntimeError(char * err)
{
	FILE *ferr=fopen("error.out","a+");
	fprintf(ferr,"Runtime Error:%s\n",err);
	fclose(ferr);
}

int getFileSize(const char * filename)
{
	struct stat f_stat;

	if (stat(filename, &f_stat) == -1)
	{
		return 0;
	}

	return f_stat.st_size;
}

int isInFile(const char fname[])
{
	int l = strlen(fname);
	if (l <= 3 || strcmp(fname + l - 3, ".in") != 0)
		return 0;
	else
		return l - 3;
}

void prepareFiles(const char * filename, int namelen, const string & fullPath, const string &  workDir,
						string & infile, string & outfile, string & userfile)
{
	//              printf("ACflg=%d %d check a file!\n",ACflg,solutionId);
	static char fname[255 + 5];
	strncpy(fname, filename, namelen);
	fname[namelen] = 0;
	infile = workDir + "/data.in";
	executeCmd("/bin/cp %s/%s.in %s/data.in", fullPath.c_str(), fname, workDir.c_str());

	outfile = fullPath + "/" + string(fname) + ".out";
	userfile = workDir + "/user.out";
}

void runSolution(const string & workDir, int & timeLimit, int & usedtime, int & memLimit)
{
	assert(nice(19) != -1);
	// now the user is "judger"
	assert(chdir(workDir.c_str()) == 0);
	// open the files
	assert(freopen("data.in", "r", stdin) != NULL);
	assert(freopen("user.out", "w", stdout) != NULL);
	assert(freopen("error.out", "a+", stderr) != NULL);
	// trace me
	puts("ptrace...");
	ptrace(PTRACE_TRACEME, 0, NULL, NULL);
	// run me
	assert(chroot(workDir.c_str()) == 0);
	puts("chroot...");

	while(setgid(65534)!=0) sleep(1);
	while(setuid(65534)!=0) sleep(1);
	while(setresuid(65534, 65534, 65534)!=0) sleep(1);

	// child
	// set the limit
	struct rlimit LIM; // time limit, file limit& memory limit
	// time limit
	LIM.rlim_cur = (timeLimit - usedtime / 1000) + 1;
	LIM.rlim_max = LIM.rlim_cur;

	setrlimit(RLIMIT_CPU, &LIM);
	alarm(0);
	alarm(timeLimit*10);

	// file limit
	LIM.rlim_max = STD_F_LIM + STD_MB;
	LIM.rlim_cur = STD_F_LIM;
	setrlimit(RLIMIT_FSIZE, &LIM);
	// proc limit
	LIM.rlim_cur=LIM.rlim_max=1;
	setrlimit(RLIMIT_NPROC, &LIM);

	// set the stack
	LIM.rlim_cur = STD_MB << 6;
	LIM.rlim_max = STD_MB << 6;
	setrlimit(RLIMIT_STACK, &LIM);
	// set the memory
	LIM.rlim_cur = STD_MB *memLimit/2*3;
	LIM.rlim_max = STD_MB *memLimit*2;
	setrlimit(RLIMIT_AS, &LIM);


	printf("Running...");
	execl("./Main", "./Main", (char *)NULL);
	printf("Running finish");
	exit(0);
}


void watchSolution(pid_t pidApp, const string & infile, int & ACflg, int isspj,
		const string & userfile, const string & outfile, int & topmemory, int memLimit,
		int & usedtime, int timeLimit, int & PEflg, const string & workDir)
{
	// parent
	printf("Watch pid[%d]\n", pidApp);
	int tempmemory;
	int sub_level=0;

	int status, sig, exitcode;
	struct user_regs_struct reg;
	struct rusage ruse;
	int sub = 0;
	pid_t subwatcher=0;
	while (1)
	{
		// check the usage

		wait4(-1, &status, 0, &ruse);

		tempmemory = getProcStatus(pidApp, "VmPeak:") << 10;

		if (tempmemory > topmemory)
			topmemory = tempmemory;
		if (topmemory > memLimit * STD_MB)
		{
			printf("MLE: %d\n", __LINE__);
			if (ACflg == OJ_AC)
				ACflg = OJ_MLE;
			ptrace(PTRACE_KILL, pidApp, NULL, NULL);
			break;
		}
		//sig = status >> 8;/*status >> 8 Ã¥Â·Â®Ã¤Â¸ÂÃ¥Â¤Å¡Ã¦ËÂ¯EXITCODE*/

		if (WIFEXITED(status))
			break;
		if (getFileSize("error.out"))
		{
			ACflg = OJ_RE;
			//addreinfo(solution_id);
			ptrace(PTRACE_KILL, pidApp, NULL, NULL);
			break;
		}

		if (!isspj && getFileSize(userfile.c_str()) > getFileSize(outfile.c_str()) * 2+1024)
		{
			ACflg = OJ_OL;
			ptrace(PTRACE_KILL, pidApp, NULL, NULL);
			break;
		}

		exitcode = WEXITSTATUS(status);
		/*exitcode == 5 waiting for next CPU allocation          * ruby using system to run,exit 17 ok
		 *  */
		if (exitcode == 0x05 || exitcode == 0)
			//go on and on
			;
		else
		{

			//psignal(exitcode, NULL);

			if (ACflg == OJ_AC)
			{
				switch (exitcode)
				{
					case SIGCHLD:
					case SIGALRM:
						alarm(0);
					case SIGKILL:
					case SIGXCPU:
						ACflg = OJ_TLE;
						break;
					case SIGXFSZ:
						ACflg = OJ_OL;
						break;
					default:
						ACflg = OJ_RE;
				}
				printRuntimeError(strsignal(exitcode));
			}
			ptrace(PTRACE_KILL, pidApp, NULL, NULL);

			break;
		}

		if (WIFSIGNALED(status))
		{
			/*  WIFSIGNALED: if the process is terminated by signal
			 *
			 *  psignal(int sig, char *s)，like perror(char *s)，print out s, with error msg from system of sig
			 * sig = 5 means Trace/breakpoint trap
			 * sig = 11 means Segmentation fault
			 * sig = 25 means File size limit exceeded
			 */
			sig = WTERMSIG(status);

			if (ACflg == OJ_AC)
			{
				switch (sig)
				{
					case SIGCHLD:
					case SIGALRM:
						alarm(0);
					case SIGKILL:
					case SIGXCPU:
						ACflg = OJ_TLE;
						break;
					case SIGXFSZ:
						ACflg = OJ_OL;
						break;

					default:
						ACflg = OJ_RE;
				}
				printRuntimeError(strsignal(sig));
			}
			break;
		}
		/*     comment from http://www.felix021.com/blog/read.php?1662
WIFSTOPPED: return true if the process is paused or stopped while ptrace is watching on it
WSTOPSIG: get the signal if it was stopped by signal
		 */

		// check the system calls
		ptrace(PTRACE_GETREGS, pidApp, NULL, &reg);

		if (false&&reg.REG_SYSCALL>0&&call_counter[reg.REG_SYSCALL] == 0)   //do not limit JVM syscall for using different JVM
		{
			ACflg = OJ_RE;

			char error[BUFFER_SIZE];
			sprintf(error,"[ERROR] A Not allowed system call: runid:%s callid:%llu\n",
						outfile.c_str(), reg.REG_SYSCALL);
			printf("%s\n",error);
			printRuntimeError(error);
			ptrace(PTRACE_KILL, pidApp, NULL, NULL);
			//   wait4(pidApp,NULL,0,NULL);
		}
		else
		{
			if (sub == 1 && call_counter[reg.REG_SYSCALL] > 0)
				call_counter[reg.REG_SYSCALL]--;


			if(reg.REG_SYSCALL==SYS_fork||reg.REG_SYSCALL==SYS_clone||reg.REG_SYSCALL==SYS_vfork)//
			{
				if(sub_level>3&&sub==1)
				{
					printf("sub are not allowed to fork!\n");
					ptrace(PTRACE_KILL, pidApp, NULL, NULL);

				}
				else
				{
					//printf("syscall:%ld\t",regs.REG_SYSCALL);
					ptrace(PTRACE_SINGLESTEP, pidApp,NULL, NULL);

					ptrace(PTRACE_GETREGS, pidApp,
							NULL, &reg);
					//printf("pid=%lu\n",regs.eax);
					pid_t subpid=reg.REG_RET;
					if(subpid>0&&subpid!=subwatcher)
					{
						//ptrace(PTRACE_ATTACH, subpid,               NULL, NULL);
							//wait(NULL);

						subwatcher=fork();
						if(subwatcher==0)
						{
							//total_sub++;
							sub_level++;
							pidApp=subpid;
							int success=ptrace(PTRACE_ATTACH, pidApp,
									NULL, NULL);
							if(success==0)
							{
								wait(NULL);
								printf("attatched sub %d->%d\n",getpid(),pidApp);

								// ptrace(PTRACE_SYSCALL, traced_process,NULL, NULL);
							}
							else
							{
								//printf("not attatched sub %d\n",traced_process);

								exit (0);
							}
						}



					}
				}
				reg.REG_SYSCALL=0;

			}
		}
		sub = 1 - sub;

		ptrace(PTRACE_SYSCALL, pidApp, NULL, NULL);
	}
	usedtime += (ruse.ru_utime.tv_sec * 1000 + ruse.ru_utime.tv_usec / 1000);
	usedtime += (ruse.ru_stime.tv_sec * 1000 + ruse.ru_stime.tv_usec / 1000);
	if(sub_level) exit(0);
	//clean_session(pidApp);
}


void delnextline(char s[])
{
	int L;
	L = strlen(s);
	while (L > 0 && (s[L - 1] == '\n' || s[L - 1] == '\r'))
		s[--L] = 0;
}

int compare(const char *file1, const char *file2)
{
	//the original compare from the first version of hustoj has file size limit
	//and waste memory
	FILE *f1,*f2;
	char *s1,*s2,*p1,*p2;
	int PEflg;
	s1=new char[STD_F_LIM+512];
	s2=new char[STD_F_LIM+512];
	printf("%s %s\n", file1, file2);
	if (!(f1=fopen(file1,"r")))
		return OJ_AC;
	for (p1=s1; EOF!=fscanf(f1,"%s",p1);)
		while (*p1) p1++;
	fclose(f1);
	if (!(f2=fopen(file2,"r")))
		return OJ_RE;
	for (p2=s2; EOF!=fscanf(f2,"%s",p2);)
		while (*p2) p2++;
	fclose(f2);
	if (strcmp(s1,s2)!=0)
	{
		//              printf("A:%s\nB:%s\n",s1,s2);
		delete[] s1;
		delete[] s2;

		return OJ_WA;
	}
	else
	{
		f1=fopen(file1,"r");
		f2=fopen(file2,"r");
		PEflg=0;
		while (PEflg==0 && fgets(s1,STD_F_LIM,f1) && fgets(s2,STD_F_LIM,f2))
		{
			delnextline(s1);
			delnextline(s2);
			if (strcmp(s1,s2)==0) continue;
			else PEflg=1;
		}
		delete [] s1;
		delete [] s2;
		fclose(f1);
		fclose(f2);
		if (PEflg) return OJ_PE;
		else return OJ_AC;
	}
}

void judgeSolution(int & ACflg, int & usedtime, int timeLimit, int isspj,
		const string & infile, const string & outfile, const string & userfile, int & PEflg,
		const string & workDir, int & topmemory, int memLimit)
{
	//usedtime-=1000;

	int comp_res = -1;
	if (ACflg == OJ_AC && usedtime > timeLimit * 1000 * 2)
		ACflg = OJ_TLE;
	if(topmemory > memLimit * STD_MB) {
		ACflg=OJ_MLE; //issues79
		printf("MLE: %d\n", __LINE__);
	}
	// compare
	if (ACflg == OJ_AC)
	{
		if (isspj)
		{

		}
		else
		{
			puts("Compare Start");
			comp_res = compare(outfile.c_str(), userfile.c_str());
			puts("Compare Done");
		}
		if (comp_res == OJ_WA)
		{
			ACflg = OJ_WA;
			printf("fail test %s\n", infile.c_str());
		}
		else if (comp_res == OJ_PE)
			PEflg = OJ_PE;
		ACflg = comp_res;
	}
}

void judge(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = args.GetIsolate();

	string workDir = "", fullPath = "";
	int memLimit, timeLimit, isspj;

	//init
	getParameters(args, workDir, fullPath, memLimit, timeLimit, isspj);

	assert(chdir(workDir.c_str()) == 0);

	//timeLimit: <=300(s), memLimit: <=1024M
	if (timeLimit < 1 || timeLimit > 300) timeLimit = 300;
	if (memLimit < 1 || memLimit > 1024) memLimit = 1024;

	DIR *dp;
	dirent *dirp;

	if ((dp = opendir(fullPath.c_str())) == NULL)
	{
		printf("No such dir:%s!\n", fullPath.c_str());
		exit(-1);
	}

	int ACflg, PEflg;
	ACflg = PEflg = OJ_AC;
	int namelen;
	int usedtime = 0, topmemory = 0, max_case_time = 0;

	string infile, outfile, userfile;

	while((ACflg == OJ_AC) && (dirp = readdir(dp)) != NULL) {
		namelen = isInFile(dirp->d_name); // check if the file is *.in or not
		if (namelen == 0) continue;

		prepareFiles(dirp->d_name, namelen, fullPath, workDir, infile, outfile, userfile);

		initSyscallsLimits();

		pid_t pidApp = fork();

		if (pidApp == 0)
		{
			//exit(0) in runSolution
			runSolution(workDir, timeLimit, usedtime, memLimit);
		}
		else
		{
			watchSolution(pidApp, infile, ACflg, isspj, userfile, outfile,
					topmemory, memLimit, usedtime, timeLimit, PEflg, workDir);


			judgeSolution(ACflg, usedtime, timeLimit, isspj, infile, outfile,
					userfile, PEflg, workDir, topmemory, memLimit);

			if(use_max_time)
			{
				max_case_time=usedtime>max_case_time?usedtime:max_case_time;
				usedtime=0;
			}
			//clean_session(pidApp);
		}
	}
	puts("Finish");

	if (ACflg == OJ_AC && PEflg == OJ_PE)
		ACflg = OJ_PE;



	if(use_max_time)
	{
		usedtime=max_case_time;
	}

	if(ACflg == OJ_TLE)
	{
		usedtime=timeLimit*1000;
	}

	printf("%d\n", ACflg);


	//usedtime(ms), topmemory(b), Acflg,

	Local<Object> judgeResult = Object::New(isolate);
	judgeResult->Set(String::NewFromUtf8(isolate, "time"), Number::New(isolate, usedtime));
	judgeResult->Set(String::NewFromUtf8(isolate, "memory"), Number::New(isolate, topmemory));
	judgeResult->Set(String::NewFromUtf8(isolate, "result"), Number::New(isolate, ACflg));

	puts("Return");
	args.GetReturnValue().Set(judgeResult);
	puts("Return....");
	return;
}



void init(Local<Object> exports) {
	NODE_SET_METHOD(exports, "judge", judge);
}


NODE_MODULE(judgeClient, init);
