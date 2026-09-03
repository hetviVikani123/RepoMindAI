import requests,sys

s=requests.Session()
login_url='http://localhost:8000/auth/login'
status_url='http://localhost:8000/repository/3/status'
cred={'email':'e2e_user2@example.com','password':'password123'}
try:
    r=s.post(login_url,json=cred,timeout=10)
except Exception as e:
    print('login error',e)
    sys.exit(1)
print('login',r.status_code,r.text)
if r.ok:
    j=r.json()
    tok=j.get('access_token') or j.get('token') or j.get('accessToken')
    if not tok:
        print('no token in response',j)
        sys.exit(0)
    h={'Authorization':f'Bearer {tok}'}
    r2=s.get(status_url,headers=h,timeout=10)
    print('status',r2.status_code,r2.text)
