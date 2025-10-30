from fastapi.testclient import TestClient
from server import app
import json

client = TestClient(app)

print('GET /api/products')
r = client.get('/api/products')
print(r.status_code)
products = r.json()
print(json.dumps(products, indent=2)[:1000])
if not products:
    print('No products found — attempting to run startup initializer then retry')
    import server as _server
    import asyncio
    asyncio.run(_server.startup_event())
    r = client.get('/api/products')
    print('Retry status', r.status_code)
    products = r.json()
    print(json.dumps(products, indent=2)[:1000])
    if not products:
        print('Still no products after initialization — aborting')
        raise SystemExit(1)

first = products[0]
print('\nGET /api/cart')
r = client.get('/api/cart')
print(r.status_code, r.json())

print('\nPOST /api/cart')
r = client.post('/api/cart', json={'product_id': first['id'], 'quantity': 2})
print(r.status_code, r.text)

print('\nGET /api/cart (again)')
r = client.get('/api/cart')
print(r.status_code)
print(json.dumps(r.json(), indent=2))

print('\nPOST /api/checkout')
r = client.post('/api/checkout', json={'name': 'Tester', 'email': 'test@example.com'})
print(r.status_code)
print(r.json())
