import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:8000"

def request(method, path, data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read().decode())

def run_smoke():
    print("=== STARTING SMOKE TEST ===")
    
    # 1. Health check
    status, res = request("GET", "/health")
    print(f"1. /health -> {status}: {res}")
    assert status == 200, "Health check failed"

    # 2. Login as hetvi@gmail.com
    status, res = request("POST", "/auth/login", {"email": "hetvi@gmail.com", "password": "Password123!"})
    print(f"2. /auth/login -> {status}, token length: {len(res.get('access_token', ''))}")
    assert status == 200, f"Login failed: {res}"
    token = res["access_token"]

    # 3. Get repository 42 (FoodDeliveryTimeEstimator)
    status, repo = request("GET", "/repository/42", token=token)
    print(f"3. /repository/42 -> {status}, name: {repo.get('name')}, files: {len(repo.get('files', []))}")
    assert status == 200, f"Failed to get repo 42: {repo}"

    # 4. Check Pipeline status for repo 42
    status, pstatus = request("GET", "/repository/42/pipeline-status", token=token)
    stages = pstatus.get("stages", [])
    completed_stages = [s["stage_name"] for s in stages if s["status"] == "completed"]
    print(f"4. /repository/42/pipeline-status -> {status}, {len(completed_stages)}/{len(stages)} stages completed")
    for s in stages:
        print(f"   [{s['status'].upper()}] {s['stage_name']}: {s.get('message', '')}")
    assert status == 200, f"Pipeline status failed: {pstatus}"

    # 5. Check UML generation
    status, uml = request("GET", "/uml?repository_id=42", token=token)
    res_uml = uml.get("result", {})
    mermaid_len = len(res_uml.get("mermaid", ""))
    classes_count = len(res_uml.get("classes", []))
    print(f"5. /uml -> {status}, Mermaid length: {mermaid_len}, Classes/Modules: {classes_count}")
    assert status == 200, f"UML generation failed: {uml}"
    assert mermaid_len > 10, "Mermaid chart empty"

    # 6. Check Dependencies generation
    status, deps = request("GET", "/dependencies?repository_id=42", token=token)
    res_deps = deps.get("result", {})
    nodes = len([e for e in res_deps.get("cytoscape_elements", []) if not e.get("data", {}).get("source")])
    edges = len([e for e in res_deps.get("cytoscape_elements", []) if e.get("data", {}).get("source")])
    circular = len(res_deps.get("circular_dependencies", []))
    print(f"6. /dependencies -> {status}, Cytoscape nodes: {nodes}, edges: {edges}, circular: {circular}")
    assert status == 200, f"Dependencies failed: {deps}"
    assert nodes > 0, "No Cytoscape nodes returned"

    # 7. Check Architecture generation
    status, arch = request("GET", "/architecture?repository_id=42", token=token)
    res_arch = arch.get("result", {})
    layers = list(res_arch.get("layers", {}).keys())
    print(f"7. /architecture -> {status}, layers detected: {len(layers)}, file_count: {res_arch.get('file_count')}")
    assert status == 200, f"Architecture failed: {arch}"

    # 8. Check Security & Report
    status, sec = request("GET", "/security?repository_id=42", token=token)
    print(f"8. /security -> {status}, severity: {sec.get('result', {}).get('severity')}, findings: {sec.get('result', {}).get('findings_count')}")
    assert status == 200, f"Security failed: {sec}"

    status, rep = request("GET", "/report?repository_id=42", token=token)
    print(f"8b. /report -> {status}, report_type: {rep.get('report_type')}")
    assert status == 200, f"Report failed: {rep}"

    # 9. Check Documentation generation
    status, doc = request("GET", "/documentation?repository_id=42", token=token)
    readme_snippet = doc.get("readme", "")[:80].replace("\n", " ")
    print(f"9. /documentation -> {status}, readme snippet: '{readme_snippet}...'")
    assert status == 200, f"Documentation failed: {doc}"

    # 10. Check Settings endpoints
    status, sets = request("GET", "/settings", token=token)
    print(f"10. /settings -> {status}, provider: {sets.get('llm_provider')}, local_only: {sets.get('local_only')}")
    assert status == 200, f"Settings failed: {sets}"

    # 11. Test AI reasoning in ProviderService
    status, ai_test = request("POST", "/settings/test", {}, token=token)
    print(f"11. /settings/test -> {status}, response: '{ai_test.get('response', '')[:80]}...'")
    assert status == 200, f"AI test failed: {ai_test}"

    # 12. Check AI Chat
    status, chat = request("POST", "/chat", {"repository_id": 42, "question": "What is the primary function of this application?"}, token=token)
    print(f"12. /chat -> {status}, citations: {chat.get('citations')}")
    print(f"    Answer snippet: '{chat.get('answer', '')[:120]}...'")
    assert status == 200, f"Chat failed: {chat}"
    assert len(chat.get("answer", "")) > 10, "Chat answer is empty"

    print("\n=== ALL 12 VERIFICATION CHECKS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_smoke()
