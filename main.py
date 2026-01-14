from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Tuple
from enum import Enum
from datetime import datetime, timezone
import uuid


app = FastAPI(title="S2O • Guest QR Menu + Order Tracking + Bill")
app.add_middleware(SessionMiddleware, secret_key="s2o-dev-secret")
templates = Jinja2Templates(directory="templates")

# True: demo auto progress trạng thái đơn theo thời gian (để thấy tracking chạy)
DEMO_AUTO_PROGRESS = True

# Mốc giây kể từ lúc tạo đơn để nhảy trạng thái (demo)
DEMO_THRESHOLDS = [
    (10, "CONFIRMED"),
    (25, "COOKING"),
    (45, "READY"),
    (70, "SERVED"),
]

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

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
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

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
        MenuItem(
            id="m6",
            name="Phở thêm",
            category="Món thêm",
            price=5000,
            image_url="https://cdn.tgdd.vn/2021/10/CookDish/cach-bao-quan-pho-tuoi-banh-pho-va-pho-kho-dung-duoc-lau-va-avt-1200x676-2.jpg",
            description="Thêm phở (tô).",
            available=True,
        ),
    ]
}

# STORAGE (in-memory)
# key = (restaurant_id, branch_id, table_id)
CARTS: Dict[Tuple[str, str, str], List[CartItem]] = {}
ORDERS: Dict[Tuple[str, str, str], List[Order]] = {}
TABLE_STATE: Dict[Tuple[str, str, str], dict] = {}

def ensure_session_id(request: Request) -> str:
    sid = request.session.get("sid")
    if not sid:
        sid = str(uuid.uuid4())
        request.session["sid"] = sid
    return sid


def table_key(restaurant_id: str, branch_id: str, table_id: str) -> Tuple[str, str, str]:
    return (restaurant_id, branch_id, table_id)


def get_table_state(k: Tuple[str, str, str]) -> dict:
    st = TABLE_STATE.get(k)
    if not st:
        st = {
            "bill_requested": False,
            "bill_requested_at": None,
            "paid": False,
            "paid_at": None,
        }
        TABLE_STATE[k] = st
    return st


def reset_table_state(k: Tuple[str, str, str]):
    TABLE_STATE[k] = {
        "bill_requested": False,
        "bill_requested_at": None,
        "paid": False,
        "paid_at": None,
    }


def get_menu(restaurant_id: str) -> List[MenuItem]:
    return MENU.get(restaurant_id, [])


def get_categories(restaurant_id: str) -> List[str]:
    return sorted({m.category for m in get_menu(restaurant_id)})


def filter_menu(items: List[MenuItem], q: str = "", category: str = "all") -> List[MenuItem]:
    q = (q or "").strip().lower()
    out: List[MenuItem] = []
    for it in items:
        if category != "all" and it.category != category:
            continue
        if q:
            hay = (it.name + " " + (it.description or "")).lower()
            if q not in hay:
                continue
        out.append(it)
    return out


def get_cart(k: Tuple[str, str, str]) -> List[CartItem]:
    return CARTS.setdefault(k, [])


def get_orders(k: Tuple[str, str, str]) -> List[Order]:
    return ORDERS.setdefault(k, [])


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


def compute_bill_from_orders(orders: List[Order]) -> Tuple[int, int, List[dict]]:
    """
    Bill = tổng tất cả món đã đặt (từ Orders), KHÔNG phụ thuộc SERVED hay chưa.
    Chỉ loại CANCELLED.
    Group theo (item_id, note).
    """
    agg: Dict[Tuple[str, str], dict] = {}
    qty_total = 0
    total = 0

    for o in orders:
        if o.status == OrderStatus.CANCELLED:
            continue
        for ln in o.lines:
            note = ln.note or ""
            key = (ln.item.id, note)
            if key not in agg:
                agg[key] = {
                    "id": ln.item.id,
                    "name": ln.item.name,
                    "note": ln.note,
                    "qty": 0,
                    "unit_price": ln.item.price,
                    "subtotal": 0,
                }
            agg[key]["qty"] += ln.qty
            agg[key]["subtotal"] += ln.item.price * ln.qty

            qty_total += ln.qty
            total += ln.item.price * ln.qty

    lines = sorted(agg.values(), key=lambda x: (x["name"], x["note"] or ""))
    return qty_total, total, lines


def table_ui_status(k: Tuple[str, str, str]) -> str:
    """
    'billing' | 'occupied' | 'empty'
    - billing: đã gọi thanh toán và chưa paid
    - occupied: có cart hoặc có bill_total > 0 (có order, kể cả SERVED)
    - empty: không có gì
    """
    st = get_table_state(k)
    orders = get_orders(k)
    bill_qty, bill_total, _ = compute_bill_from_orders(orders)

    if st.get("paid") and bill_total == 0 and not get_cart(k):
        return "empty"

    if st.get("bill_requested") and bill_total > 0 and not st.get("paid"):
        return "billing"

    if bill_total > 0 or len(get_cart(k)) > 0:
        return "occupied"

    return "empty"


def request_bill_for_table(k: Tuple[str, str, str], bill_total: int) -> str:
    st = get_table_state(k)
    if bill_total <= 0:
        return "Chưa có món nào để thanh toán."
    if st.get("paid"):
        return "Bàn này đã thanh toán rồi."
    if st.get("bill_requested"):
        return "Bạn đã gọi thanh toán rồi, vui lòng chờ thu ngân."
    st["bill_requested"] = True
    st["bill_requested_at"] = utcnow()
    return f"Đã gửi yêu cầu thanh toán. Tổng tạm tính: {bill_total:,}₫"


def place_order(restaurant_id: str, k: Tuple[str, str, str], table_id: str) -> Optional[Order]:
    cart = get_cart(k)
    if not cart:
        return None

    # nếu bàn đã paid trước đó (demo), reset state để mở phiên mới
    st = get_table_state(k)
    if st.get("paid"):
        reset_table_state(k)

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

    now = utcnow()
    order = Order(
        id=str(uuid.uuid4())[:8],
        table_id=table_id,
        lines=lines,
        total=total,
        status=OrderStatus.NEW,
        created_at=now,
        updated_at=now,
    )

    # Nếu đã gọi thanh toán mà lại đặt thêm => reset bill_requested để gọi lại
    st["bill_requested"] = False
    st["bill_requested_at"] = None
    st["paid"] = False
    st["paid_at"] = None

    ORDERS.setdefault(k, []).insert(0, order)
    CARTS[k] = []
    return order


def set_order_status(o: Order, status: OrderStatus):
    o.status = status
    o.updated_at = utcnow()


def maybe_demo_progress(o: Order):
    if o.status in (OrderStatus.CANCELLED, OrderStatus.SERVED):
        return
    age = (utcnow() - o.created_at).total_seconds()
    target = None
    for sec, st in DEMO_THRESHOLDS:
        if age >= sec:
            target = st
    if not target:
        return
    try:
        new_status = OrderStatus(target)
    except Exception:
        return
    if o.status != new_status:
        o.status = new_status
        o.updated_at = utcnow()


def redirect_back(request: Request, fallback: str) -> RedirectResponse:
    ref = request.headers.get("referer")
    return RedirectResponse(url=ref or fallback, status_code=303)

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

    # bill summary (tổng các order)
    bill_qty, bill_total, bill_lines = compute_bill_from_orders(orders)
    st = get_table_state(k)

    # danh sách bàn + trạng thái bàn
    tables = [f"T{str(i).zfill(2)}" for i in range(1, 21)]
    table_status: Dict[str, str] = {}
    for t in tables:
        tk = table_key(restaurant_id, branch_id, t)
        table_status[t] = table_ui_status(tk)

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
            # bill for UI
            "bill_qty": bill_qty,
            "bill_total": bill_total,
            "bill_lines": bill_lines,
            "bill_requested": bool(st.get("bill_requested")),
            "bill_requested_at": st.get("bill_requested_at"),
            "bill_paid": bool(st.get("paid")),
            "bill_paid_at": st.get("paid_at"),
        },
    )


# API: orders + bill (polling cho UI) 
@app.get("/g/{restaurant_id}/{branch_id}/tables/{table_id}/orders/json")
def orders_json(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    orders = get_orders(k)

    if DEMO_AUTO_PROGRESS:
        for o in orders:
            maybe_demo_progress(o)

    bill_qty, bill_total, bill_lines = compute_bill_from_orders(orders)
    st = get_table_state(k)

    payload = {
        "server_time": utcnow(),
        "orders": [
            {
                "id": o.id,
                "table_id": o.table_id,
                "status": o.status,
                "total": o.total,
                "created_at": o.created_at,
                "updated_at": o.updated_at,
                "lines": [{"name": ln.item.name, "qty": ln.qty, "note": ln.note} for ln in o.lines],
            }
            for o in orders
        ],
        "bill": {
            "qty": bill_qty,
            "total": bill_total,
            "lines": bill_lines,
            "requested": bool(st.get("bill_requested")),
            "requested_at": st.get("bill_requested_at"),
            "paid": bool(st.get("paid")),
            "paid_at": st.get("paid_at"),
        },
    }
    return JSONResponse(content=jsonable_encoder(payload))


#  API: table status (để dropdown đổi màu realtime)
@app.get("/g/{restaurant_id}/{branch_id}/tables/status/json")
def tables_status_json(request: Request, restaurant_id: str, branch_id: str):
    ensure_session_id(request)
    tables = [f"T{str(i).zfill(2)}" for i in range(1, 21)]
    mp: Dict[str, str] = {}
    for t in tables:
        k = table_key(restaurant_id, branch_id, t)
        mp[t] = table_ui_status(k)
    return JSONResponse(content=jsonable_encoder({"server_time": utcnow(), "tables": mp}))


# CART
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/cart/add", response_class=HTMLResponse)
def cart_add(request: Request, restaurant_id: str, branch_id: str, table_id: str, item_id: str = Form(...)):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    upsert_cart_item(k, item_id, +1)
    return redirect_back(request, f"/g/{restaurant_id}/{branch_id}/tables/{table_id}")


@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/cart/sub", response_class=HTMLResponse)
def cart_sub(request: Request, restaurant_id: str, branch_id: str, table_id: str, item_id: str = Form(...)):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    upsert_cart_item(k, item_id, -1)
    return redirect_back(request, f"/g/{restaurant_id}/{branch_id}/tables/{table_id}")


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
    return redirect_back(request, f"/g/{restaurant_id}/{branch_id}/tables/{table_id}")


# ORDER PLACE
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/order/place", response_class=HTMLResponse)
def order_place(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    o = place_order(restaurant_id, k, table_id)
    request.session["flash"] = "Đặt món thành công." if o else "Giỏ trống hoặc món không khả dụng."
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}#orders-section", status_code=303)


#  BILL REQUEST
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/bill/request", response_class=HTMLResponse)
def bill_request(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    orders = get_orders(k)
    _, bill_total, _ = compute_bill_from_orders(orders)
    request.session["flash"] = request_bill_for_table(k, bill_total)
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}#bill-section", status_code=303)


@app.post("/staff/{restaurant_id}/{branch_id}/tables/{table_id}/orders/{order_id}/status")
def staff_set_status(
    request: Request,
    restaurant_id: str,
    branch_id: str,
    table_id: str,
    order_id: str,
    status: OrderStatus = Form(...),
):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    orders = get_orders(k)

    for o in orders:
        if o.id == order_id:
            set_order_status(o, status)
            return {"ok": True, "order": jsonable_encoder(o)}

    return JSONResponse(status_code=404, content={"ok": False, "error": "Order not found"})


@app.post("/staff/{restaurant_id}/{branch_id}/tables/{table_id}/bill/paid")
def staff_bill_paid(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    """
    Demo: đánh dấu bàn đã thanh toán -> clear orders + cart -> bàn về trạng thái trống.
    """
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    st = get_table_state(k)

    st["paid"] = True
    st["paid_at"] = utcnow()
    st["bill_requested"] = False
    st["bill_requested_at"] = None

    ORDERS[k] = []
    CARTS[k] = []
    return {"ok": True, "table_id": table_id}


@app.middleware("http")
async def flash_middleware(request: Request, call_next):
    response = await call_next(request)
    return response
### 1 23
