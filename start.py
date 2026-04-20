"""
Race Board Launcher
Installs dependencies (first run only) then starts the server and client.
Run with:  python start.py
"""

import subprocess
import sys
import os
import time
import threading
import webbrowser

# Force UTF-8 output so emoji print correctly on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE = os.path.dirname(os.path.abspath(__file__))
SERVER_DIR = os.path.join(BASE, "server")
CLIENT_DIR = os.path.join(BASE, "client")

# Common Node.js install locations on Windows
NODE_SEARCH = [
    r"C:\Program Files\nodejs",
    r"C:\Program Files (x86)\nodejs",
    os.path.expandvars(r"%APPDATA%\nvm\current"),
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\nodejs"),
]

def find_npm():
    """Return the path to npm.cmd, or just 'npm' if it's already on PATH."""
    # Try PATH first
    try:
        subprocess.run(["npm", "--version"], capture_output=True, check=True)
        return "npm"
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass

    for folder in NODE_SEARCH:
        candidate = os.path.join(folder, "npm.cmd")
        if os.path.exists(candidate):
            return candidate

    return None

def stream_output(proc, label, color_code):
    """Print lines from a subprocess with a colored label prefix."""
    reset = "\033[0m"
    prefix = f"\033[{color_code}m[{label}]\033[0m "
    for line in iter(proc.stdout.readline, b""):
        sys.stdout.write(prefix + line.decode(errors="replace"))
        sys.stdout.flush()

def make_env(npm):
    """Return an env dict that includes the Node.js bin directory on PATH."""
    env = os.environ.copy()
    node_dir = os.path.dirname(os.path.abspath(npm)) if npm != "npm" else None
    if node_dir and node_dir not in env.get("PATH", ""):
        env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")
    return env

def run(label, cwd, args, color, env=None):
    proc = subprocess.Popen(
        args,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        shell=True,          # needed on Windows for .cmd files
        env=env,
    )
    t = threading.Thread(target=stream_output, args=(proc, label, color), daemon=True)
    t.start()
    return proc

def install_if_needed(npm, directory, label, env=None):
    # Check for .bin dir (not just node_modules) — catches partial/failed installs
    modules = os.path.join(directory, "node_modules", ".bin")
    if not os.path.isdir(modules):
        print(f"  Installing {label} dependencies...")
        result = subprocess.run(
            f'"{npm}" install',
            cwd=directory,
            shell=True,
            capture_output=True,
            env=env,
        )
        if result.returncode != 0:
            print(result.stderr.decode(errors="replace"))
            sys.exit(f"npm install failed in {label}")
        print(f"  {label} dependencies installed.")
    else:
        print(f"  {label} dependencies already installed.")

def kill_port(port):
    """Kill any process already listening on the given port (Windows)."""
    try:
        result = subprocess.run(
            f'netstat -ano | findstr ":{port} "',
            shell=True, capture_output=True, text=True
        )
        for line in result.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 5 and f":{port}" in parts[1] and parts[3] == "LISTENING":
                pid = parts[4]
                subprocess.run(f"taskkill /PID {pid} /F", shell=True, capture_output=True)
    except Exception:
        pass

def main():
    # Enable ANSI colors on Windows
    os.system("")

    print("=" * 50)
    print("  🐎  Race Board Launcher")
    print("=" * 50)

    npm = find_npm()
    if not npm:
        sys.exit(
            "\nERROR: npm not found.\n"
            "Make sure Node.js is installed: https://nodejs.org\n"
            "Then open a NEW terminal and run this script again."
        )
    print(f"\nUsing npm: {npm}\n")

    print("Clearing ports 3001 and 5173...")
    kill_port(3001)
    kill_port(5173)

    env = make_env(npm)

    print("Checking dependencies...")
    install_if_needed(npm, SERVER_DIR, "server", env)
    install_if_needed(npm, CLIENT_DIR, "client", env)

    print("\nStarting server on port 3001...")
    server = run("SERVER", SERVER_DIR, f'"{npm}" run dev', color=36, env=env)

    # Give the server a moment to bind before starting the client
    time.sleep(2)

    print("Starting client on port 5173...")
    client = run("CLIENT", CLIENT_DIR, f'"{npm}" run dev', color=35, env=env)

    # Open browser after client has a moment to start
    def open_browser():
        time.sleep(3)
        print("\n\033[32m[READY]\033[0m Opening http://localhost:5173\n")
        webbrowser.open("http://localhost:5173")

    threading.Thread(target=open_browser, daemon=True).start()

    print("\nPress Ctrl+C to stop both servers.\n")
    print("-" * 50)

    try:
        server.wait()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.terminate()
        client.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
