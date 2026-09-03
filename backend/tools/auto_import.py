import urllib.request
import urllib.error
import json
import sys


def login(email: str, password: str) -> dict:
    url = "http://localhost:8000/auth/login"
    data = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print("Login HTTPError:", e.code, e.read().decode())
        sys.exit(1)
    except Exception as e:
        print("Login error:", e)
        sys.exit(1)


def import_repository(token: str, repo_url: str):
    url = "http://localhost:8000/repository/import"
    data = json.dumps({"url": repo_url}).encode()
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            print("Import response:")
            print(resp.read().decode())
    except urllib.error.HTTPError as e:
        print("Import HTTPError:", e.code, e.read().decode())
        sys.exit(1)
    except Exception as e:
        print("Import error:", e)
        sys.exit(1)


if __name__ == "__main__":
    cred_email = "cli_test@example.com"
    cred_pass = "password"
    print("Logging in as", cred_email)
    tokens = login(cred_email, cred_pass)
    access = tokens.get("access_token")
    if not access:
        print("No access token received")
        sys.exit(1)
    print("Got access token (len)", len(access))
    # Try importing a small public repo
    repo_to_import = "https://github.com/octocat/Hello-World.git"
    print("Importing", repo_to_import)
    import_repository(access, repo_to_import)
