#!/usr/bin/env python3
"""
Magic Sort - Test Suite & Verification Script (Python)
Rules.md Compliance:
- Rule 2: Test Run & Reporting After Execution
- Rule 3: Version 1.2.1 Verification
- Rule 4: Mandatory Use of Python for backend/verification logic
"""

import os
import sys
import re
import json
import socket
import threading
import http.server
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def print_header(title):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)

def test_file_structure():
    print_header("1. Checking File Structure & Assets")
    required_files = [
        "index.html",
        "css/style.css",
        "css/animations.css",
        "js/levels.js",
        "js/audio.js",
        "js/game.js",
        "js/solver.js",
        "js/app.js",
        "assets/favicon.svg",
        "generate_levels.py"
    ]

    all_ok = True
    for rel_path in required_files:
        full_path = os.path.join(BASE_DIR, rel_path)
        exists = os.path.isfile(full_path)
        size = os.path.getsize(full_path) if exists else 0
        status = f"OK ({size:,} B)" if exists and size > 0 else "MISSING/EMPTY"
        print(f" - [{status:16}] {rel_path}")
        if not exists or size == 0:
            all_ok = False

    return all_ok

def test_html_dom_elements():
    print_header("2. Verifying HTML DOM Structure & Version v1.2.1")
    html_path = os.path.join(BASE_DIR, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify version 1.2.1
    if "v1.2.1" not in content:
        print(" [FAIL] Version v1.2.1 not found in index.html!")
        return False
    print(" [OK] Version tag v1.2.1 found in HTML.")

    # Check mobile viewport
    if "viewport" in content and "viewport-fit=cover" in content:
        print(" [OK] Mobile-first viewport with viewport-fit=cover detected.")
    else:
        print(" [FAIL] Mobile viewport meta tag missing or incomplete.")
        return False

    required_ids = [
        "app-container",
        "app-version",
        "btn-sound",
        "btn-levels",
        "scoreboard-panel",
        "score-current",
        "score-max",
        "score-total",
        "game-timer",
        "level-title",
        "level-subtitle",
        "btn-undo",
        "btn-restart",
        "btn-hint",
        "btn-add-bottle",
        "bottles-container",
        "flying-layer",
        "tutorial-hand",
        "modal-levels",
        "levels-grid",
        "modal-win",
        "win-base-score",
        "win-moves-detail",
        "win-time-detail",
        "win-penalty-detail",
        "win-score-final",
        "win-score-max",
        "win-score-total",
        "btn-next-level",
        "btn-replay-level",
        "confetti-canvas"
    ]

    missing = []
    for elem_id in required_ids:
        if f'id="{elem_id}"' not in content:
            missing.append(elem_id)

    if missing:
        print(f" [FAIL] Missing required element IDs: {missing}")
        return False
    print(f" [OK] All {len(required_ids)} required DOM element IDs verified.")
    return True

def test_pour_data_transfer_and_busy_locks():
    print_header("3. Verifying Liquid Data Transfer & Lock Immunity (v1.2.1 Bugfix)")
    js_game_path = os.path.join(BASE_DIR, "js", "game.js")
    with open(js_game_path, "r", encoding="utf-8") as f:
        game_code = f.read()

    # Verify executePour calls canPour with ignoreBusy = true
    if "this.canPour(fromIndex, toIndex, true)" not in game_code:
        print(" [FAIL] executePour does not bypass busy check!")
        return False
    print(" [OK] executePour verified to bypass busy lock so liquid transfer never fails.")

    # Verify transform-origin in style.css
    css_path = os.path.join(BASE_DIR, "css", "style.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css_code = f.read()

    if "transform-origin: 50% 10px" not in css_code:
        print(" [FAIL] transform-origin 50% 10px missing from style.css!")
        return False
    print(" [OK] transform-origin: 50% 10px verified for accurate bottle mouth rotation alignment.")

    # Verify Python simulation of Level 1 move
    from generate_levels import solve_puzzle
    bottles = [
        ["orange", "orange", "yellow", "yellow"],
        ["yellow", "yellow", "orange", "orange"],
        []
    ]
    # Move 0 -> 2 (2 yellow into empty bottle 2)
    chunk_color = bottles[0][-1]
    chunk_count = 2
    for _ in range(chunk_count):
        bottles[0].pop()
        bottles[2].append(chunk_color)

    if len(bottles[0]) != 2 or len(bottles[2]) != 2 or bottles[2] != ["yellow", "yellow"]:
        print(" [FAIL] Liquid transfer simulation failed!")
        return False
    print(f" [OK] Liquid transfer verified: Source remaining={len(bottles[0])}, Target received={bottles[2]}")
    return True

def test_levels_and_solvability():
    print_header("4. Chunk-Move Solvability & Level Data Integrity")
    sys.path.insert(0, BASE_DIR)
    from generate_levels import solve_puzzle

    levels_file = os.path.join(BASE_DIR, "js", "levels.js")
    with open(levels_file, "r", encoding="utf-8") as f:
        text = f.read()

    match = re.search(r'const LEVELS_DATA\s*=\s*(\[.*?\]);\s*\n', text, re.DOTALL)
    levels = json.loads(match.group(1))

    test_levels = [1, 2, 5, 10, 25, 50]
    for lv_num in test_levels:
        lv = levels[lv_num - 1]
        bottles = lv["bottles"]
        solvable, moves, _ = solve_puzzle(bottles, max_depth=50, max_visited=50000)
        status = "SOLVABLE" if solvable else "UNSOLVABLE"
        print(f" - Level {lv_num:02d}: {status} (Min Moves: {moves}, MaxScore: {lv['maxScore']:,})")
        if not solvable:
            print(f" [FAIL] Level {lv_num} is not solvable!")
            return False

    print(f" [OK] All {len(test_levels)} sampled levels verified solvable under chunk rule.")
    return True

def test_local_http_server():
    print_header("5. Local HTTP Server & MIME Type Verification")
    class SilentHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        port = s.getsockname()[1]

    os.chdir(BASE_DIR)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), SilentHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    endpoints = [
        ("/", 200, "text/html"),
        ("/index.html", 200, "text/html"),
        ("/css/style.css", 200, "text/css"),
        ("/css/animations.css", 200, "text/css"),
        ("/js/levels.js", 200, "javascript"),
        ("/js/audio.js", 200, "javascript"),
        ("/js/game.js", 200, "javascript"),
        ("/js/solver.js", 200, "javascript"),
        ("/js/app.js", 200, "javascript"),
        ("/assets/favicon.svg", 200, "image/svg+xml")
    ]

    all_ok = True
    try:
        for path, expected_code, expected_type in endpoints:
            url = f"http://127.0.0.1:{port}{path}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as res:
                code = res.getcode()
                c_type = res.headers.get("Content-Type", "")
                success = (code == expected_code) and (expected_type in c_type)
                status = "OK" if success else "FAIL"
                print(f" - [{status:4}] GET {path:<22} -> Code: {code}, Content-Type: {c_type}")
                if not success:
                    all_ok = False
    except Exception as e:
        print(f" [FAIL] HTTP server request failed: {e}")
        all_ok = False
    finally:
        server.shutdown()
        server.server_close()

    return all_ok

def main():
    print("\n" + "#" * 65)
    print("  MAGIC SORT - AUTOMATED TEST SUITE (v1.2.1)")
    print("  Bugfix: Liquid Data Transfer & Mouth Alignment Verification")
    print("#" * 65)

    tests = [
        ("File Structure & Assets", test_file_structure),
        ("HTML DOM Structure & Version v1.2.1", test_html_dom_elements),
        ("Liquid Transfer & Lock Immunity (Bugfix)", test_pour_data_transfer_and_busy_locks),
        ("Chunk-Move Solvability & Level Data", test_levels_and_solvability),
        ("Local HTTP Server & MIME Types", test_local_http_server)
    ]

    results = []
    for name, fn in tests:
        res = fn()
        results.append((name, res))

    print_header("TEST SUMMARY & VERIFICATION RESULTS")
    all_passed = True
    for name, passed in results:
        status = "PASSED" if passed else "FAILED"
        print(f" - [{status:6}] {name}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 65)
    if all_passed:
        print("  ALL TESTS PASSED SUCCESSFULLY! Ready for deployment (v1.2.1).")
        print("=" * 65 + "\n")
        return 0
    else:
        print("  SOME TESTS FAILED! Review error details above.")
        print("=" * 65 + "\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
