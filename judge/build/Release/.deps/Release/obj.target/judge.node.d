cmd_Release/obj.target/judge.node := g++ -shared -pthread -rdynamic -m64  -Wl,-soname=judge.node -o Release/obj.target/judge.node -Wl,--start-group Release/obj.target/judge/judge.o -Wl,--end-group 
