from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from pydantic import BaseModel
from typing import Dict, List, Optional, Tuple
from enum import Enum
import uuid

app = FastAPI(title="S2O Guest UI (2 files)")
app.add_middleware(SessionMiddleware, secret_key="s2o-dev-secret")
templates = Jinja2Templates(directory="templates")


class OrderStatus(str, Enum):
    NEW = "NEW"
    CONFIRMED = "CONFIRMED"
    COOKING = "COOKING"
    READY = "READY"
    SERVED = "SERVED"
    CANCELLED = "CANCELLED"


class MenuItem(BaseModel):
    id: str
    name: str
    category: str
    price: int
    image_url: Optional[str] = None
    description: Optional[str] = None
    available: bool = True


class CartItem(BaseModel):
    item_id: str
    qty: int = 1
    note: Optional[str] = None


class OrderLine(BaseModel):
    item: MenuItem
    qty: int
    note: Optional[str] = None


class Order(BaseModel):
    id: str
    table_id: str
    lines: List[OrderLine]
    total: int
    status: OrderStatus = OrderStatus.NEW


MENU: Dict[str, List[MenuItem]] = {
    "res_001": [
        MenuItem(
            id="m1",
            name="Phở Bò",
            category="Món chính",
            price=45000,
            image_url="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS01kZAwhueM7OBR3ZDGh0rrPFwYejUvDdzvg&s",
            description="Phở bò tái nạm, nước dùng trong.",
        ),
        MenuItem(
            id="m2",
            name="Bún Chả",
            category="Món chính",
            price=50000,
            image_url="https://images.prismic.io/nutriinfo/aAoO2PIqRLdaBkWx_hinh-anh-bun-cha.jpg?auto=format,compress",
            description="Bún chả Hà Nội, nước mắm pha.",
        ),
        MenuItem(
            id="m3",
            name="Gỏi Cuốn",
            category="Khai vị",
            price=30000,
            image_url="https://www.cet.edu.vn/wp-content/uploads/2018/11/goi-cuon-tom-thit.jpg",
            description="Tôm thịt, rau sống, chấm tương.",
        ),
        MenuItem(
            id="m4",
            name="Trà Đào",
            category="Đồ uống",
            price=35000,
            image_url="https://horecavn.com/wp-content/uploads/2024/05/huong-dan-cong-thuc-tra-dao-cam-sa-hut-khach-ngon-kho-cuong_20240526180626.jpg",
            description="Trà đào mát lạnh.",
        ),
        MenuItem(
            id="m5",
            name="Nước Suối",
            category="Đồ uống",
            price=15000,
            image_url="https://product.hstatic.net/200000534989/product/dsc08282-enhanced-nr_1_6b28545be8384dff9fa6e786214a2ed1_master.jpg",
            available=True,
        ),
        # NEW: món thêm
        MenuItem(
            id="m6",
            name="Phở thêm",
            category="Món thêm",
            price=5000,
            image_url=None,
            description="Thêm phở (tô).",
            available=True,
        ),
    ]
}

# cart/orders tách theo "bàn"
# key = (restaurant_id, branch_id, table_id)
CARTS: Dict[Tuple[str, str, str], List[CartItem]] = {}
ORDERS: Dict[Tuple[str, str, str], List[Order]] = {}


def ensure_session_id(request: Request) -> str:
    sid = request.session.get("sid")
    if not sid:
        sid = str(uuid.uuid4())
        request.session["sid"] = sid
    return sid


def table_key(restaurant_id: str, branch_id: str, table_id: str) -> Tuple[str, str, str]:
    return (restaurant_id, branch_id, table_id)


def is_table_occupied(k: Tuple[str, str, str]) -> bool:
    # có cart hoặc có order thì coi là bàn đã có khách/đã đặt
    if CARTS.get(k):
        return True
    if ORDERS.get(k):
        return True
    return False


def get_menu(restaurant_id: str) -> List[MenuItem]:
    return MENU.get(restaurant_id, [])


def get_categories(restaurant_id: str) -> List[str]:
    return sorted({m.category for m in get_menu(restaurant_id)})


def filter_menu(items: List[MenuItem], q: str = "", category: str = "all") -> List[MenuItem]:
    q = (q or "").strip().lower()
    out = []
    for it in items:
        if category != "all" and it.category != category:
            continue
        if q and (q not in it.name.lower()) and (not it.description or q not in it.description.lower()):
            continue
        out.append(it)
    return out


def get_cart(k: Tuple[str, str, str]) -> List[CartItem]:
    return CARTS.setdefault(k, [])


def cart_totals(restaurant_id: str, k: Tuple[str, str, str]) -> Tuple[int, int]:
    menu_map = {m.id: m for m in get_menu(restaurant_id)}
    qty = 0
    total = 0
    for ci in get_cart(k):
        it = menu_map.get(ci.item_id)
        if it:
            qty += ci.qty
            total += it.price * ci.qty
    return qty, total


def upsert_cart_item(k: Tuple[str, str, str], item_id: str, delta: int):
    cart = get_cart(k)
    for ci in cart:
        if ci.item_id == item_id:
            ci.qty = max(0, ci.qty + delta)
            if ci.qty == 0:
                cart.remove(ci)
            return
    if delta > 0:
        cart.append(CartItem(item_id=item_id, qty=delta))


def set_note(k: Tuple[str, str, str], item_id: str, note: str):
    cart = get_cart(k)
    for ci in cart:
        if ci.item_id == item_id:
            ci.note = (note or "").strip() or None
            return


def get_orders(k: Tuple[str, str, str]) -> List[Order]:
    return ORDERS.setdefault(k, [])


def place_order(restaurant_id: str, k: Tuple[str, str, str], table_id: str) -> Optional[Order]:
    cart = get_cart(k)
    if not cart:
        return None

    menu_map = {m.id: m for m in get_menu(restaurant_id)}
    lines: List[OrderLine] = []
    total = 0

    for ci in cart:
        it = menu_map.get(ci.item_id)
        if not it or not it.available:
            continue
        lines.append(OrderLine(item=it, qty=ci.qty, note=ci.note))
        total += it.price * ci.qty

    if not lines:
        return None

    order = Order(
        id=str(uuid.uuid4())[:8],
        table_id=table_id,
        lines=lines,
        total=total,
        status=OrderStatus.NEW,
    )

    ORDERS.setdefault(k, []).insert(0, order)
    CARTS[k] = []
    return order


def request_bill() -> str:
    return "Yêu cầu thanh toán đã được gửi tới thu ngân."


@app.get("/", response_class=HTMLResponse)
def root():
    return RedirectResponse(url="/g/res_001/b1/tables/T01")


@app.get("/g/{restaurant_id}/{branch_id}/tables/{table_id}", response_class=HTMLResponse)
def guest_page(
    request: Request,
    restaurant_id: str,
    branch_id: str,
    table_id: str,
    q: str = "",
    category: str = "all",
):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)

    menu = get_menu(restaurant_id)
    items = filter_menu(menu, q=q, category=category)

    cart = get_cart(k)
    cart_qty, cart_total = cart_totals(restaurant_id, k)
    orders = get_orders(k)
    cart_map = {c.item_id: c for c in cart}

    # danh sách bàn + trạng thái bàn
    tables = [f"T{str(i).zfill(2)}" for i in range(1, 21)]
    table_status = {}
    for t in tables:
        tk = table_key(restaurant_id, branch_id, t)
        table_status[t] = is_table_occupied(tk)

    return templates.TemplateResponse(
        "guest_menu.html",
        {
            "request": request,
            "restaurant_id": restaurant_id,
            "branch_id": branch_id,
            "table_id": table_id,
            "tables": tables,
            "table_status": table_status,
            "categories": get_categories(restaurant_id),
            "q": q,
            "category": category,
            "items": items,
            "menu": menu,
            "cart": cart,
            "cart_map": cart_map,
            "cart_qty": cart_qty,
            "cart_total": cart_total,
            "orders": orders,
        },
    )


@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/cart/add", response_class=HTMLResponse)
def cart_add(request: Request, restaurant_id: str, branch_id: str, table_id: str, item_id: str = Form(...)):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    upsert_cart_item(k, item_id, +1)
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}", status_code=303)


@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/cart/sub", response_class=HTMLResponse)
def cart_sub(request: Request, restaurant_id: str, branch_id: str, table_id: str, item_id: str = Form(...)):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    upsert_cart_item(k, item_id, -1)
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}", status_code=303)


@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/cart/note", response_class=HTMLResponse)
def cart_note(
    request: Request,
    restaurant_id: str,
    branch_id: str,
    table_id: str,
    item_id: str = Form(...),
    note: str = Form(""),
):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    set_note(k, item_id, note)
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}", status_code=303)


@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/order/place", response_class=HTMLResponse)
def order_place(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    o = place_order(restaurant_id, k, table_id)
    request.session["flash"] = "Đặt món thành công." if o else "Giỏ trống hoặc món không khả dụng."
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}", status_code=303)


@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/bill/request", response_class=HTMLResponse)
def bill_request(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    ensure_session_id(request)
    request.session["flash"] = request_bill()
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}", status_code=303)


@app.middleware("http")
async def flash_middleware(request: Request, call_next):
    response = await call_next(request)
    return response
