from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
# Motor (async MongoDB client) is optional for the assignment — if it's not
# installed we fall back to an in-memory DB implemented below. Wrap the import
# so running the backend without motor is possible for reviewers.
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except Exception:
    AsyncIOMotorClient = None
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
mongo_url = os.environ.get('MONGO_URL')
# Only attempt to create a Motor client if motor was imported successfully
if mongo_url and AsyncIOMotorClient is not None:
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'vibe_db')]
else:
    # No Motor client available or MONGO_URL unset — use an in-memory DB
    client = None

    # Lightweight in-memory async-backed collections to allow running without MongoDB
    class InMemoryCollection:
        def __init__(self):
            self.items = []

        async def count_documents(self, _filter=None):
            if not _filter:
                return len(self.items)
            # simple equality filter on top-level keys
            def match(d):
                for k, v in (_filter or {}).items():
                    if d.get(k) != v:
                        return False
                return True
            return sum(1 for d in self.items if match(d))

        async def insert_many(self, docs):
            self.items.extend(docs)

        async def insert_one(self, doc):
            self.items.append(doc)

        async def find_one(self, _filter, projection=None):
            for d in self.items:
                ok = True
                for k, v in (_filter or {}).items():
                    if d.get(k) != v:
                        ok = False
                        break
                if ok:
                    return {k: v for k, v in d.items() if k != '_id'}
            return None

        def find(self, _filter=None, projection=None):
            class Cursor:
                def __init__(self, items):
                    self._items = items

                async def to_list(self, _):
                    return [ {k: v for k, v in d.items() if k != '_id'} for d in self._items ]
            if not _filter:
                return Cursor(list(self.items))
            def match(d):
                for k, v in (_filter or {}).items():
                    if d.get(k) != v:
                        return False
                return True
            return Cursor([d for d in self.items if match(d)])

        async def update_one(self, _filter, update):
            for d in self.items:
                ok = True
                for k, v in (_filter or {}).items():
                    if d.get(k) != v:
                        ok = False
                        break
                if ok:
                    if '$set' in update:
                        d.update(update['$set'])
                    return

        async def delete_one(self, _filter):
            for i, d in enumerate(self.items):
                ok = True
                for k, v in (_filter or {}).items():
                    if d.get(k) != v:
                        ok = False
                        break
                if ok:
                    self.items.pop(i)
                    return

        async def delete_many(self, _filter):
            new_items = []
            for d in self.items:
                remove = True
                for k, v in (_filter or {}).items():
                    if d.get(k) != v:
                        remove = False
                        break
                if not remove:
                    new_items.append(d)
            self.items = new_items

    class InMemoryDB:
        def __init__(self):
            self.products = InMemoryCollection()
            self.users = InMemoryCollection()
            self.cart_items = InMemoryCollection()
            self.orders = InMemoryCollection()

    db = InMemoryDB()
    

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Make the auth optional so the frontend can call APIs without a token during the assignment
security = HTTPBearer(auto_error=False)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============ MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image: str

class CartItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    quantity: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItemWithProduct(BaseModel):
    id: str
    product_id: str
    quantity: int
    product: Product

class CartResponse(BaseModel):
    items: List[CartItemWithProduct]
    total: float

class AddToCartRequest(BaseModel):
    product_id: str
    quantity: int = 1

class UpdateCartRequest(BaseModel):
    quantity: int

class CheckoutRequest(BaseModel):
    name: str
    email: EmailStr

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[OrderItem]
    total: float
    customer_name: str
    customer_email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CheckoutResponse(BaseModel):
    order_id: str
    total: float
    items: List[OrderItem]
    timestamp: str
    customer_name: str
    customer_email: str


# ============ HELPER FUNCTIONS ============

def hash_password(password: str) -> str:
    import hashlib
    try:
        return pwd_context.hash(password)
    except Exception:
        # Fallback: return a simple sha256-based prefix so verification can still work
        return "sha256$" + hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    import hashlib
    try:
        if isinstance(hashed_password, str) and hashed_password.startswith("sha256$"):
            return hashlib.sha256(plain_password.encode('utf-8')).hexdigest() == hashed_password.split('$', 1)[1]
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Return the authenticated user if a valid token is provided.

    If no token is provided, return (or create) a lightweight mock user so the
    frontend can use the cart/checkout flows without implementing auth during
    the assignment.
    """
    # If no credentials provided, return or create a mock user
    if not credentials:
        mock_email = os.environ.get('MOCK_USER_EMAIL', 'demo@example.com')
        mock_name = os.environ.get('MOCK_USER_NAME', 'Demo User')
        # Try to find mock user
        user = await db.users.find_one({"email": mock_email}, {"_id": 0})
        if user:
            return user

        # Create mock user (no real password needed)
        mock_user = User(
            email=mock_email,
            name=mock_name,
            hashed_password=hash_password(os.environ.get('MOCK_USER_PASS', 'demo-pass'))
        )
        doc = mock_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        return doc

    # If credentials present, validate token as before
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ============ INITIALIZATION ============

@app.on_event("startup")
async def startup_event():
    # Initialize products if collection is empty
    count = await db.products.count_documents({})
    if count == 0:
        products = [
            {
                "id": str(uuid.uuid4()),
                "name": "Wireless Headphones",
                "description": "Premium wireless headphones with noise cancellation",
                "price": 79.99,
                "category": "Electronics",
                "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Smart Watch",
                "description": "Fitness tracker with heart rate monitor",
                "price": 199.99,
                "category": "Electronics",
                "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Coffee Maker",
                "description": "Automatic drip coffee maker with timer",
                "price": 89.99,
                "category": "Home",
                "image": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Yoga Mat",
                "description": "Non-slip exercise mat for yoga and fitness",
                "price": 29.99,
                "category": "Sports",
                "image": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Bluetooth Speaker",
                "description": "Portable waterproof speaker with 12hr battery",
                "price": 49.99,
                "category": "Electronics",
                "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Running Shoes",
                "description": "Lightweight running shoes with cushioned sole",
                "price": 119.99,
                "category": "Sports",
                "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Laptop Stand",
                "description": "Ergonomic adjustable aluminum laptop stand",
                "price": 39.99,
                "category": "Electronics",
                "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80"
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Water Bottle",
                "description": "Insulated stainless steel water bottle 32oz",
                "price": 24.99,
                "category": "Sports",
                "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&q=80"
            }
        ]
        await db.products.insert_many(products)
        logger.info("Initialized products collection")


# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    # Create new user
    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user.id, email=user.email, name=user.name)
    )

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"]
    )


# ============ PRODUCT ROUTES ============

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


# ============ CART ROUTES ============

@api_router.post("/cart")
async def add_to_cart(request: AddToCartRequest, current_user: dict = Depends(get_current_user)):
    # Verify product exists
    product = await db.products.find_one({"id": request.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    # Check if item already in cart
    existing_item = await db.cart_items.find_one(
        {"user_id": current_user["id"], "product_id": request.product_id},
        {"_id": 0}
    )
    
    if existing_item:
        # Update quantity
        new_quantity = existing_item["quantity"] + request.quantity
        await db.cart_items.update_one(
            {"id": existing_item["id"]},
            {"$set": {"quantity": new_quantity}}
        )
        return {"message": "Cart updated", "cart_item_id": existing_item["id"]}
    else:
        # Create new cart item
        cart_item = CartItem(
            user_id=current_user["id"],
            product_id=request.product_id,
            quantity=request.quantity
        )
        doc = cart_item.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.cart_items.insert_one(doc)
        return {"message": "Added to cart", "cart_item_id": cart_item.id}

@api_router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    # Get all cart items for user
    cart_items = await db.cart_items.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    # Enrich with product details
    items_with_products = []
    total = 0.0
    
    for item in cart_items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            items_with_products.append(CartItemWithProduct(
                id=item["id"],
                product_id=item["product_id"],
                quantity=item["quantity"],
                product=Product(**product)
            ))
            total += product["price"] * item["quantity"]
    
    return CartResponse(items=items_with_products, total=round(total, 2))

@api_router.patch("/cart/{cart_item_id}")
async def update_cart_item(cart_item_id: str, request: UpdateCartRequest, current_user: dict = Depends(get_current_user)):
    # Verify cart item belongs to user
    cart_item = await db.cart_items.find_one({"id": cart_item_id, "user_id": current_user["id"]}, {"_id": 0})
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    
    if request.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than 0")
    
    await db.cart_items.update_one(
        {"id": cart_item_id},
        {"$set": {"quantity": request.quantity}}
    )
    
    return {"message": "Cart item updated"}

@api_router.delete("/cart/{cart_item_id}")
async def remove_from_cart(cart_item_id: str, current_user: dict = Depends(get_current_user)):
    # Verify cart item belongs to user
    cart_item = await db.cart_items.find_one({"id": cart_item_id, "user_id": current_user["id"]}, {"_id": 0})
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    
    await db.cart_items.delete_one({"id": cart_item_id})
    return {"message": "Item removed from cart"}


# ============ CHECKOUT ROUTE ============

@api_router.post("/checkout", response_model=CheckoutResponse)
async def checkout(request: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    # Get cart items
    cart_items = await db.cart_items.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")
    
    # Build order items and calculate total
    order_items = []
    total = 0.0
    
    for item in cart_items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            order_item = OrderItem(
                product_id=product["id"],
                product_name=product["name"],
                quantity=item["quantity"],
                price=product["price"]
            )
            order_items.append(order_item)
            total += product["price"] * item["quantity"]
    
    # Create order
    order = Order(
        user_id=current_user["id"],
        items=[item.model_dump() for item in order_items],
        total=round(total, 2),
        customer_name=request.name,
        customer_email=request.email
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.orders.insert_one(doc)
    
    # Clear cart
    await db.cart_items.delete_many({"user_id": current_user["id"]})
    
    # Return receipt
    return CheckoutResponse(
        order_id=order.id,
        total=order.total,
        items=order_items,
        timestamp=order.created_at.isoformat(),
        customer_name=order.customer_name,
        customer_email=order.customer_email
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Close motor client if it exists
    if 'client' in globals() and client is not None:
        client.close()
