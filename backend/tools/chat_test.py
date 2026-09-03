import urllib.request
import json

def main():
    login_url = 'http://localhost:8000/auth/login'
    login_data = json.dumps({'email':'cli_test@example.com','password':'password'}).encode()
    req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type':'application/json'})
    resp = json.load(urllib.request.urlopen(req))
    access = resp.get('access_token')
    if not access:
        print('No access token')
        return

    chat_url = 'http://localhost:8000/chat'
    chat_data = json.dumps({'repository_id':2,'question':'What is this repository about?'}).encode()
    req = urllib.request.Request(chat_url, data=chat_data, headers={'Content-Type':'application/json','Authorization':f'Bearer {access}'})
    try:
        r = json.load(urllib.request.urlopen(req))
        print('CHAT:', r)
    except Exception as e:
        print('CHAT ERROR:', e)

if __name__ == '__main__':
    main()
