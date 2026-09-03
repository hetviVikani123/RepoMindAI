import requests, time, sys


def main():
    BASE = 'http://localhost:8000'

    def ok(r):
        print(r.status_code, r.text[:1000])
        return r.ok

    print('GET /health')
    r = requests.get(f'{BASE}/health')
    if not ok(r):
        sys.exit(1)

    email = f'smoke_{int(time.time())}@example.com'
    print('POST /auth/register', email)
    r = requests.post(f'{BASE}/auth/register', json={'email': email, 'password': 'password123', 'role': 'developer'})
    if r.status_code not in (200, 201):
        print('register failed', r.status_code, r.text)

    print('POST /auth/login')
    r = requests.post(f'{BASE}/auth/login', json={'email': email, 'password': 'password123'})
    if not ok(r):
        sys.exit(1)
    js = r.json()
    tok = js.get('access_token')
    if not tok:
        print('no token in login response', js)
        sys.exit(1)
    headers = {'Authorization': f'Bearer {tok}'}

    print('POST /repository/import')
    r = requests.post(f'{BASE}/repository/import', json={'url': 'https://github.com/githubtraining/hellogitworld.git'}, headers=headers)
    if not ok(r):
        print('import failed')
        sys.exit(1)
    repo = r.json()
    repo_id = repo.get('id')
    print('imported', repo_id)

    print('Polling status...')
    for _ in range(20):
        r = requests.get(f'{BASE}/repository/{repo_id}/status', headers=headers)
        if r.ok:
            js = r.json()
            print('status', js)
            if js.get('indexed'):
                break
        time.sleep(2)
    else:
        print('indexing did not complete')

    print('GET /repository/{id}')
    r = requests.get(f'{BASE}/repository/{repo_id}', headers=headers)
    ok(r)

    print('GET /uml')
    r = requests.get(f'{BASE}/uml', params={'repository_id': repo_id}, headers=headers, timeout=30)
    ok(r)

    print('GET /dependencies')
    r = requests.get(f'{BASE}/dependencies', params={'repository_id': repo_id}, headers=headers, timeout=30)
    ok(r)

    print('POST /chat')
    r = requests.post(f'{BASE}/chat', json={'repository_id': repo_id, 'question': 'What is this repo about?'}, headers=headers, timeout=30)
    ok(r)

    print('\nSMOKE TEST COMPLETE')


if __name__ == '__main__':
    main()
