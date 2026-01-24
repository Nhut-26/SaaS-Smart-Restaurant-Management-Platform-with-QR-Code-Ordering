from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from fastapi import Response
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

# Mốc giây kể từ lúc tạo đơn để nhảy trạng thái
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

MENU: Dict[str, List[MenuItem]] = {}

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
    return f"Đã gửi yêu cầu thanh toán. Tổng tạm tính: {bill_total:,}VND"


def place_order(restaurant_id: str, k: Tuple[str, str, str], table_id: str) -> Optional[Order]:
    cart = get_cart(k)
    if not cart:
        return None

    # sau khi đã thanh toán sẽ lập tức reset lại 
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

    # danh sách bàn, trạng thái bàn (lấy từ Supabase nếu có)
    tables = _get_tables_for_ui(restaurant_id)
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

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)
# API: orders, bill
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


#  API: table status
@app.get("/g/{restaurant_id}/{branch_id}/tables/status/json")
def tables_status_json(request: Request, restaurant_id: str, branch_id: str):
    ensure_session_id(request)
    tables = _get_tables_for_ui(restaurant_id)
    mp: Dict[str, str] = {}
    for t in tables:
        k = table_key(restaurant_id, branch_id, t)
        mp[t] = table_ui_status(k)
    return JSONResponse(content=jsonable_encoder({"server_time": utcnow(), "tables": mp}))

# Cart
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


# Order place
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_id}/order/place", response_class=HTMLResponse)
def order_place(request: Request, restaurant_id: str, branch_id: str, table_id: str):
    ensure_session_id(request)
    k = table_key(restaurant_id, branch_id, table_id)
    o = place_order(restaurant_id, k, table_id)
    request.session["flash"] = "Đặt món thành công." if o else "Giỏ trống hoặc món không khả dụng."
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_id}#orders-section", status_code=303)


#  Bill request
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

# Liên kết supabase
def _load_supabase_config() -> Tuple[Optional[str], Optional[str]]:
  
    try:
        from supabase_client import SUPABASE_URL as _URL, SUPABASE_SERVICE_KEY as _KEY  # type: ignore
        return _URL, _KEY
    except Exception:
        pass

    try:
        import re
        from pathlib import Path

        p = Path(__file__).with_name("supabase_client.py")
        txt = p.read_text(encoding="utf-8")

        m_url = re.search(r"\bSUPABASE_URL\s*=\s*['\"]([^'\"]+)['\"]", txt)
        m_key = re.search(r"\bSUPABASE_SERVICE_KEY\s*=\s*['\"]([^'\"]+)['\"]", txt)

        return (
            m_url.group(1) if m_url else None,
            m_key.group(1) if m_key else None,
        )
    except Exception:
        return None, None


_SUPABASE_URL, _SUPABASE_KEY = _load_supabase_config()


def _looks_like_uuid(s: str) -> bool:
    try:
        uuid.UUID(str(s))
        return True
    except Exception:
        return False


def _sb_select(
    table: str,
    *,
    select: str = "*",
    eq_filters: Optional[Dict[str, str]] = None,
    order: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[dict]:
    if not _SUPABASE_URL or not _SUPABASE_KEY:
        return []

    import requests

    params: Dict[str, str] = {"select": select}
    if eq_filters:
        for k, v in eq_filters.items():
            if v is None:
                continue
            params[k] = f"eq.{v}"
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)

    headers = {
        "apikey": _SUPABASE_KEY,
        "Authorization": f"Bearer {_SUPABASE_KEY}",
        "Accept": "application/json",
    }

    url = f"{_SUPABASE_URL.rstrip('/')}/rest/v1/{table}"

    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _get_tables_for_ui(restaurant_id: str) -> List[str]:
    filters = {"restaurant_id": restaurant_id} if _looks_like_uuid(restaurant_id) else None
    rows = _sb_select(
        "tables",
        select="table_name",
        eq_filters=filters,
        order="table_name.asc",
        limit=500,
    )

    out: List[str] = []
    for r in rows:
        name = r.get("table_name")
        if name:
            out.append(str(name))
    return out


def _get_menu_from_supabase(restaurant_id: str) -> List[MenuItem]:
    # Nếu restaurant_id không phải UUID thì bỏ filter để vẫn lấy được dữ liệu thật.
    filters = {"restaurant_id": restaurant_id} if _looks_like_uuid(restaurant_id) else None

    rows = _sb_select(
        "menus",
        select="id,restaurant_id,food_name,category,price,is_available,description",
        eq_filters=filters,
        order="category.asc,food_name.asc",
        limit=500,
    )

    out: List[MenuItem] = []
    for r in rows:
        # Supabase numeric thường trả về string, ép về int an toàn
        raw_price = r.get("price", 0)
        try:
            price_int = int(float(raw_price))
        except Exception:
            price_int = 0

        out.append(
            MenuItem(
                id=str(r.get("id", "")),
                name=str(r.get("food_name", "")),
                category=str(r.get("category") or "Khác"),
                price=price_int,
                description=r.get("description"),
                available=bool(r.get("is_available", True)),
                image_url=None,
            )
        )

    return out

try:
    MENU.clear()
except Exception:
    pass

try:
    from functools import lru_cache

    _get_menu_from_supabase = lru_cache(maxsize=128)(_get_menu_from_supabase)
    _get_tables_for_ui = lru_cache(maxsize=128)(_get_tables_for_ui)
except Exception:
    pass
get_menu = _get_menu_from_supabase

