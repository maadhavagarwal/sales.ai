import os
import signal
import subprocess
import time

def restart_uvicorn():
    # Find process on port 8000 on windows
    out = subprocess.check_output('netstat -ano | findstr :8000', shell=True).decode()
    for line in out.splitlines():
        if 'LISTENING' in line:
            pid = line.strip().split()[-1]
            try:
                os.kill(int(pid), signal.SIGTERM)
            except:
                subprocess.call(['taskkill', '/F', '/PID', pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                pass

    print("Killed old server. Starting new server to file...")
    # Start it redirected
    proc = subprocess.Popen('uvicorn main:app --port 8000', shell=True, stdout=open("server.log", "w"), stderr=subprocess.STDOUT)
    time.sleep(3)
    return proc

proc = restart_uvicorn()
