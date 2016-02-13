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
#include <vector>
#include <string>

using namespace v8;
using namespace std::vector;
using namespace std::string;

const int OJ_PENDING = 0;
const int OJ_COMPILE = 1;
const int OJ_RUNNING = 2;
const int OJ_CE = 2;
const int OJ_RE = 3;
const int OJ_MLE = 4;
const int OJ_TLE = 5;
const int OJ_OUTPUTLIMIT = 6;
const int OJ_AC = 7;
const int OJ_WA = 8;
const int OJ_PE = 9;


int LANG_CV[256]={SYS_time,SYS_read, SYS_uname, SYS_write, SYS_open, SYS_close, SYS_execve, SYS_access, SYS_brk, SYS_munmap, SYS_mprotect, SYS_mmap2, SYS_fstat64, SYS_set_thread_area, 252,0};

int LANG_CC[256]={1,-1,-1,-1,-1,-1,1,-1,-1,1,-1,-1,-1,-1,2,0};

int call_counter[512];

void init_syscalls_limits()
{
	int i;
	memset(call_counter, 0, sizeof(call_counter));
	if (lang <= 1)   // C & C++
	{
		for (i = 0; LANG_CC[i]; i++)
		{
			call_counter[LANG_CV[i]] = LANG_CC[i];
		}
	}

}

void getParameters(const FunctionCallbackInfo<Object>& args, 
							int & solutionId, vector<string> & files, int & problem_id)
{
	Isolate* isolate = args.GetIsolate();
	//solutionId, [files], problem_id
	if (args.Length() != 5) {
		isolate->ThrowException(Exception::TypeError(
					String::NewFromUtf8(isolate, "Wrong number of arguments")));
		return;
	}

	if (!args[0]->IsNumber() || !args[1]->IsArray() || !args[2].IsNumber()) {
		isolate->ThrowException(Exception::TypeError(
		        String::NewFromUtf8(isolate, "Wrong arguments")));
	}

	solutionId = args[0]->NumberValue();
	problem_id = args[2]->NumberValue();

	Local<Object> fileObj = args[1]->ToObject();
	int length = fileObjc->Get(String::NewFromUtf8(isolate, "length"))->NumberValue();

	for (int i = 0; i < length; ++i) {
		String::Utf8Value filename = fileObj->Get(String::NewFromUtf8(isolate, ToString(i)))->ToString();
		files.push_back(*filename);
	}
}

int get_file_size(const char * filename)
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
	execute_cmd("/bin/cp %s/%s.in %s/data.in", fullPath.c_str(), fname, workDir);

	outfile = fullPath + string(fname) + ".out";
	userfile = workDir + "/user.out";
}




void judge(const FunctionCallbackInfo<Object>& args) {
	Isolate* isolate = args.GetIsolate();

	string workDir = "", fullPath = "", input = "", output = "";
	int solutionId = -1, memLimit, timeLimit, judgeType;
	
	//init
	getParameters(args, solution, files, problem_id, mem_limit);

	chdir(workDir.c_str());

	//time_limit: <=300(s), mem_limit: <=1024M
	if (time_limit < 1 || time_limit > 300) time_limit = 300;
	if (mem_limit < 1 || mem_limit > 1024) mem_limit = 1024;

	DIR *dp;
	dirent *dirp;

	if ((dp = opendir(fullpath) == NULL)
	{

		printf("No such dir:%s!\n", fullpath.c_str());
		exit(-1);
	}

	int ACflg, PEflg;
	ACflg = PEflg = OJ_AC;
	int namelen;
	int usedtime = 0, topmemory = 0;
	int finalACflg = ACflg;

	string infile, outfile, userfile;

	while((ACflg == OJ_AC) && (dirp = readdir(dp)) != NULL) {
		namelen = isInFile(dirp->d_name); // check if the file is *.in or not
		if (namelen == 0)
			continue;

		prepare_files(dirp->d_name, namelen, fullPath, workDir, infile, outfile, userfile);

		init_syscalls_limits();

		pid_t pidApp = fork();

		if (pidApp == 0)
		{

			run_solution(workDir, timeLimit, usedtime, memLimit);
		}
		else
		{
			watch_solution(pidApp, infile, ACflg, isspj, userfile, outfile,
					solutionId, lang, topmemory, memLimit, usedtime, timeLimit,
					p_id, PEflg, workDir);


			judge_solution(ACflg, usedtime, timeLimit, isspj, p_id, infile,
					outfile, userfile, PEflg, lang, workDir, topmemory,
					memLimit, solutionId,num_of_test);
			if(use_max_time)
			{
				max_case_time=usedtime>max_case_time?usedtime:max_case_time;
				usedtime=0;
			}
			//clean_session(pidApp);
		}
	}

}








void init(Local<Object> exports) {
	NODE_SET_METHOD(exports, "judge", judge);
}


NODE_MODULE(judgeClient, init);
