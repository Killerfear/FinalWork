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
#include <fstream>
#include <iostream>
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
using namespace std;

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

const int igBlankLine = 1 << 0;
const int igTraillingSpace = 1 << 1;
const int igHeadingSpace = 1 << 2;
const int igSpaceAmount = 1 << 3;


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


int call_counter[512];

void initSyscallsLimits()
{
	memset(call_counter, 0, sizeof(call_counter));
	#define setCallCount(sys, num) call_counter[sys] = num
	#ifdef SYS_arch_prctl
		setCallCount(SYS_arch_prctl, -1);
	#endif
	#ifdef SYS_readlink
		setCallCount(SYS_readlink, -1);
	#endif
	#ifdef SYS_execve
		setCallCount(SYS_execve, 1);
	#endif
	#ifdef SYS_uname
		setCallCount(SYS_uname, -1);
	#endif
	#ifdef SYS_brk
		setCallCount(SYS_brk, -1);
	#endif
	#ifdef SYS_access
		setCallCount(SYS_access, -1);
	#endif
	#ifdef SYS_fstat
		setCallCount(SYS_fstat, -1);
	#endif
	#ifdef SYS_mmap
		setCallCount(SYS_mmap, -1);
	#endif
	#ifdef SYS_write
		setCallCount(SYS_write, -1);
	#endif
	#ifdef SYS_exit_group
		setCallCount(SYS_exit_group, 1);
	#endif
}

//getParameters(args, workDir, fullPath, memLimit, timeLimit, judgeType);
void getParameters(const FunctionCallbackInfo<Value>& args, string & workDir, string & fullPath,
						  int & memLimit, int & timeLimit, int & judgeType)
{
	Isolate* isolate = args.GetIsolate();
	//solutionId, [files], problem_id
	if (args.Length() != 5) {
		isolate->ThrowException(Exception::TypeError(
					String::NewFromUtf8(isolate, "Wrong number of arguments")));
		return;
	}

	memLimit = args[2]->NumberValue();
	timeLimit = args[3]->NumberValue();
	judgeType = args[4]->NumberValue();

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
	// run me
	assert(chroot(workDir.c_str()) == 0);

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

	// trace me
	ptrace(PTRACE_TRACEME, 0, NULL, NULL);

	//printf("Running...");
	execl("./Main", "./Main", (char *)NULL);
	//printf("Running finish");
	exit(0);
}


void watchSolution(pid_t pidApp, const string & infile, int & ACflg, int judgeType,
		const string & userfile, const string & outfile, int & topmemory, int memLimit,
		int & usedtime, int timeLimit, int & PEflg, const string & workDir)
{
	// parent
	//printf("Watch pid[%d]\n", pidApp);
	int tempmemory;

	int status, sig, exitcode;
	struct user_regs_struct reg;
	struct rusage ruse;
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

			kill(pidApp, SIGKILL);
			break;
		}
		//sig = status >> 8;/*status >> 8 Ã¥Â·Â®Ã¤Â¸ÂÃ¥Â¤Å¡Ã¦ËÂ¯EXITCODE*/

		if (WIFEXITED(status))
			break;
		if (getFileSize("error.out"))
		{
			ACflg = OJ_RE;
			//addreinfo(solution_id);
			kill(pidApp, SIGKILL);
			break;
		}

		if (!judgeType && getFileSize(userfile.c_str()) > getFileSize(outfile.c_str()) * 2+1024)
		{
			ACflg = OJ_OL;
			kill(pidApp, SIGKILL);
			break;
		}

		exitcode = WEXITSTATUS(status);
		/*exitcode == 5 waiting for next CPU allocation */
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

			kill(pidApp, SIGKILL);

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
		/*
		WIFSTOPPED: return true if the process is paused or stopped while ptrace is watching on it
		WSTOPSIG: get the signal if it was stopped by signal
		*/

		// check the system calls
		ptrace(PTRACE_GETREGS, pidApp, NULL, &reg);

		if (reg.REG_SYSCALL>0&&call_counter[reg.REG_SYSCALL] == 0)
		{
			ACflg = OJ_RE;

			char error[BUFFER_SIZE];
			sprintf(error,"[ERROR] A Not allowed system call: runid:%s callid:%d\n",
						outfile.c_str(), reg.REG_SYSCALL);
			printf("%s\n",error);
			printRuntimeError(error);
			kill(pidApp, SIGKILL);
			break;
		}
		else
		{
			if (call_counter[reg.REG_SYSCALL] > 0)
				call_counter[reg.REG_SYSCALL]--;

		}

		ptrace(PTRACE_SYSCALL, pidApp, NULL, NULL);
	}

	//wait for defunct process
	wait4(-1, NULL, 0, NULL);

	usedtime += (ruse.ru_utime.tv_sec * 1000 + ruse.ru_utime.tv_usec / 1000);
	usedtime += (ruse.ru_stime.tv_sec * 1000 + ruse.ru_stime.tv_usec / 1000);
}


bool isBlankLine(const string & s)
{
	for (int i = 0; i < (int)s.length(); ++i) {
		if (!isspace(s[i])) return false;
	}
	return true;
}

std::istream& safeGetline(std::istream& is, std::string& t)
{
    t.clear();

    // The characters in the stream are read one-by-one using a std::streambuf.
    // That is faster than reading them one-by-one using the std::istream.
    // Code that uses streambuf this way must be guarded by a sentry object.
    // The sentry object performs various tasks,
    // such as thread synchronization and updating the stream state.

    std::istream::sentry se(is, true);
    std::streambuf* sb = is.rdbuf();

    for(;;) {
        int c = sb->sbumpc();
        switch (c) {
        case '\n':
            return is;
        case '\r':
            if(sb->sgetc() == '\n')
                sb->sbumpc();
            return is;
        case EOF:
            // Also handle the case when the last line has no line ending
            if(t.empty())
                is.setstate(std::ios::eofbit);
            return is;
        default:
            t += (char)c;
        }
    }
}

bool getNextLine(ifstream & fin, string & s, bool withoutBlank)
{
	bool has = false;
	while (fin.peek() != EOF) {
		getline(fin, s);

		if (!withoutBlank || !isBlankLine(s)) {
			has = true;
			break;
		}
	}

	return has;
}

void transForm(string & s, int mode)
{
	int l = 0, r = s.length() - 1;
	while (r >= 0 && (s[r] == '\n' || s[r] == '\r')) --r;

	if (mode & igTraillingSpace) {
		while (r >= 0 && isspace(s[r])) --r;
	}


	if (mode & igHeadingSpace) {
		while (l <= r && isspace(s[l])) ++l;
	}

	if (l != 0 || r != (int)s.length() - 1) {
		s = s.substr(l, r - l + 1);
	}

	if (mode & igSpaceAmount) {
		int c = 0;
		for (int i = 0; i < (int)s.length(); ++i) {
			s[c++] = s[i];
			if (isspace(s[i])) {
				while (i < (int)s.length() && isspace(s[i])) ++i;
				--i;
			}
		}
		s.erase(c);
	}
}


int compareWithMode(const char * file1, const char * file2, int mode)
{
	ios::sync_with_stdio(false);
	//printf("file: %s %s\n", file1, file2);
	ifstream f1(file1, ifstream::binary | ifstream::in);

	if (!f1.is_open()) {
		return OJ_AC;
	}

	ifstream f2(file2, ifstream::binary | ifstream::in);

	if (!f2.is_open()) {
		f1.close();
		return OJ_RE;
	}

	string s1, s2;

	for(;;) {
		bool has1 = getNextLine(f1, s1, mode & igBlankLine);
		bool has2 = getNextLine(f2, s2, mode & igBlankLine);
		if (!has1) f1.close();
		if (!has2) f2.close();
		//printf("%s %u\n%s %u\n\n", s1.c_str(), s1.length(), s2.c_str(), s2.length());
		//printf("%d %d\n", has1, has2);
		if (!has1 && !has2) return OJ_AC;
		if (!has1 || !has2) return OJ_WA;

		transForm(s1, mode);
		transForm(s2, mode);

		if (s1 != s2) return OJ_WA;
	}
}

int compare(const char *file1, const char *file2, int judgeType)
{
	int PEflg = compareWithMode(file1, file2, ~0);
	if (PEflg == OJ_WA) {
		return PEflg;
	}

	PEflg = compareWithMode(file1, file2, judgeType);
	if (PEflg == OJ_WA) {
		PEflg = OJ_PE;
	}

	return PEflg;
}

void judgeSolution(int & ACflg, int & usedtime, int timeLimit, int judgeType,
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
		comp_res = compare(outfile.c_str(), userfile.c_str(), judgeType);
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
	int memLimit, timeLimit, judgeType;

	//init
	getParameters(args, workDir, fullPath, memLimit, timeLimit, judgeType);

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
			watchSolution(pidApp, infile, ACflg, judgeType, userfile, outfile,
					topmemory, memLimit, usedtime, timeLimit, PEflg, workDir);


			judgeSolution(ACflg, usedtime, timeLimit, judgeType, infile, outfile,
					userfile, PEflg, workDir, topmemory, memLimit);

			if(use_max_time)
			{
				max_case_time=usedtime>max_case_time?usedtime:max_case_time;
				usedtime=0;
			}
		}
	}

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

	//printf("%d\n", ACflg);


	//usedtime(ms), topmemory(b), Acflg,

	Local<Object> judgeResult = Object::New(isolate);
	judgeResult->Set(String::NewFromUtf8(isolate, "time"), Number::New(isolate, usedtime));
	judgeResult->Set(String::NewFromUtf8(isolate, "memory"), Number::New(isolate, topmemory));
	judgeResult->Set(String::NewFromUtf8(isolate, "result"), Number::New(isolate, ACflg));

	args.GetReturnValue().Set(judgeResult);
	return;
}



void init(Local<Object> exports) {
	NODE_SET_METHOD(exports, "judge", judge);
}


NODE_MODULE(judgeClient, init);
