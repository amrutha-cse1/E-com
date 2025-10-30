import urllib.request
import urllib.error
import json
import time

BASE = 'http://127.0.0.1:8000/api'


def req(method, path, data=None, headers=None):
    url = BASE + path
    data_bytes = None
    headers = headers or {}
    if data is not None:
        data_bytes = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            body = res.read().decode('utf-8')
            print(f"{method} {path} -> {res.status}")
            if body:
                try:
                    print(json.dumps(json.loads(body), indent=2))
                    return json.loads(body)
                except Exception:
                    print(body)
                    return None
            return None
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code} {method} {path} {e.read().decode()}")
    except Exception as e:
        print(f"Error calling {method} {path}: {e}")
    return None


# Wait for server
for i in range(20):
    try:
        r = req('GET', '/products')
        if r is not None:
            break
    except Exception:
        pass
    print('Waiting for server...')
    time.sleep(1)

products = req('GET', '/products')
if not products:
    print('No products, aborting')
    raise SystemExit(1)

first = products[0]
print('First product:', first['id'], first['name'])

print('\nGet cart (should be empty initially)')
cart = req('GET', '/cart')

print('\nAdd to cart')
add = req('POST', '/cart', { 'product_id': first['id'], 'quantity': 2 })

print('\nGet cart after add')
cart = req('GET', '/cart')

print('\nCheckout')
receipt = req('POST', '/checkout', { 'name': 'Smoke Tester', 'email': 'smoketester@example.com' })

print('\nReceipt:')
print(json.dumps(receipt, indent=2))
