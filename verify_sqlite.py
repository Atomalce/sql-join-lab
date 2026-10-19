"""Compare JavaScript rows against an independent SQLite database oracle."""
import itertools
import json
import random
import sqlite3
import subprocess
from pathlib import Path

rng = random.Random(20261019)
users = [{'id': i, 'name': name} for i, name in enumerate(['小林','小周','小陈','小吴'], 1)]
datasets = []
for statuses in itertools.product(['paid','unpaid',None], repeat=4):
    orders = [{'id': 101+i, 'userId': uid, 'status': status} for i, (uid, status) in enumerate(zip([1,1,2,4], statuses))]
    datasets.append((users, orders + [{'id':105,'userId':99,'status':'paid'}]))
datasets.extend([(users, []), ([], []), ([{'id':None,'name':'空键'}], [{'id':1,'userId':None,'status':'paid'}])])
for _ in range(30):
    orders = [{'id':i+200,'userId':rng.choice([None,1,2,3,4,99]),'status':rng.choice(['paid','unpaid',None])} for i in range(rng.randrange(10))]
    datasets.append((users, orders))
cases = [{'users':u,'orders':o,'mode':m} for u,o in datasets for m in ['all','on','where','orNull','inner']]
proc = subprocess.run(['node','differential.mjs'], cwd=Path(__file__).parent, input=json.dumps(cases), text=True, encoding='utf-8', capture_output=True, check=True)
results = json.loads(proc.stdout)
for case, result in zip(cases, results, strict=True):
    db = sqlite3.connect(':memory:')
    db.executescript('CREATE TABLE users(id INTEGER,name TEXT);CREATE TABLE orders(id INTEGER NOT NULL,userId INTEGER,status TEXT);')
    db.executemany('INSERT INTO users VALUES(:id,:name)', case['users'])
    db.executemany('INSERT INTO orders VALUES(:id,:userId,:status)', case['orders'])
    expected = db.execute(result['sql']).fetchall()
    actual = [(r['userId'],r['name'],r['orderId'],r['status']) for r in result['rows']]
    assert sorted(expected,key=repr) == sorted(actual,key=repr), (case,result,expected)
    assert all(r['padded'] == (r['orderId'] is None) for r in result['rows'])
    db.close()
print(f'PASS: {len(cases)} JS/SQLite comparisons over {len(datasets)} datasets; SQLite {sqlite3.sqlite_version}')
