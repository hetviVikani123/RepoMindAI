import requests, sys

login_url = 'http://localhost:8000/auth/login'
chat_url = 'http://localhost:8000/chat'
cred = {'email':'e2e_user2@example.com','password':'password123'}
q = {'repository_id': 3, 'question': 'What is this repository about?'}

s = requests.Session()
try:
    r = s.post(login_url, json=cred, timeout=10)
except Exception as e:
    print('login error', e)
    sys.exit(1)
print('login', r.status_code, r.text)
if not r.ok:
    sys.exit(1)

tok = r.json().get('access_token')
if not tok:
    print('no token in login response')
    sys.exit(1)

h = {'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'}
try:
    r2 = s.post(chat_url, json=q, headers=h, timeout=30)
    print('chat', r2.status_code, r2.text)
except Exception as e:
    print('chat error', e)
    sys.exit(1)
