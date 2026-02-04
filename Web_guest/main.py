# main.py
import os
import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.status import HTTP_302_FOUND
from starlette.templating import Jinja2Templates

from postgrest.exceptions import APIError
from supabase_client import supabase
from qr_service import make_qr_png_advanced

APP_TITLE = "S2O • Scan2Order"
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-secret-change-me")
DEFAULT_BRANCH_ID = "main"

DEFAULT_TENANT_ID = os.getenv("DEFAULT_TENANT_ID")
DEFAULT_BRANCH_UUID = os.getenv("DEFAULT_BRANCH_UUID")

TABLE_ID_MODE = "uuid"

# ====== Default guest identity ======
DEFAULT_CUSTOMER_NAME = "Khách vãng lai"

app = FastAPI(title=APP_TITLE)
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET, same_site="lax")

TEMPLATE_DIR = os.getenv("TEMPLATE_DIR", "templates")
templates = Jinja2Templates(directory=TEMPLATE_DIR)

if os.path.isdir("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


# =========================
# AUTO STATUS TIMELINE
# =========================
# NEW -> CONFIRMED 5s
# CONFIRMED -> COOKING 10s  (tổng 15s)
# COOKING -> READY 15s      (tổng 30s)
# READY -> SERVED 20s       (tổng 50s)
_STATUS_MILESTONES = [
    (0, "NEW"),
    (5, "CONFIRMED"),
    (15, "COOKING"),
    (30, "READY"),
    (50, "SERVED"),
]
_TERMINAL_STATUSES = {"SERVED", "CANCELLED"}


# =========================
# Helpers
# =========================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def safe_int(x: Any, default: int = 0) -> int:
    try:
        return int(x)
    except Exception:
        return default

def money(v: Any) -> int:
    try:
        return int(round(float(v)))
    except Exception:
        return 0

def get_session_cart(request: Request) -> Dict[str, Dict[str, Any]]:
    cart = request.session.get("cart")
    if not isinstance(cart, dict):
        cart = {}
        request.session["cart"] = cart
    return cart

def cart_to_list(cart: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for item_id, v in cart.items():
        out.append({"item_id": item_id, "qty": int(v.get("qty", 0)), "note": v.get("note")})
    out.sort(key=lambda x: x["item_id"])
    return out

def pop_flash(request: Request) -> Optional[str]:
    msg = request.session.get("flash")
    if msg:
        request.session.pop("flash", None)
    return msg

def table_status_to_ui(st: str) -> str:
    s = (st or "").lower()
    if s in ("billing", "checkout", "paying"):
        return "billing"
    if s in ("occupied", "busy", "in_use"):
        return "occupied"
    return "empty"

def booking_status_to_steps(status: str) -> str:
    s = (status or "").upper()
    if s in ("NEW", "CONFIRMED", "COOKING", "READY", "SERVED", "CANCELLED"):
        return s
    if s in ("PENDING", "PEND", "WAIT"):
        return "NEW"
    if s in ("DONE", "COMPLETED"):
        return "SERVED"
    return "NEW"

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
)
def is_uuid(s: str) -> bool:
    return bool(s and _UUID_RE.match(s.strip()))


# =========================
# AUTO STATUS HELPERS
# =========================
def _parse_iso_dt(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

def desired_status_by_elapsed(elapsed_s: float) -> str:
    if elapsed_s < 0:
        return "NEW"
    cur = "NEW"
    for sec, st in _STATUS_MILESTONES:
        if elapsed_s >= sec:
            cur = st
        else:
            break
    return cur

def db_update_booking_status(booking_id: str, new_status: str) -> None:
    try:
        supabase.table("bookings").update({"status": new_status}).eq("id", booking_id).execute()
    except Exception as e:
        _raise_db_error(e, "Cannot update booking status")

def maybe_auto_advance_booking(b: Dict[str, Any]) -> Optional[str]:
    cur = (b.get("status") or "").upper() or "NEW"
    if cur in _TERMINAL_STATUSES:
        return None

    bt = b.get("booking_time") or b.get("created_at") or b.get("updated_at")
    start = _parse_iso_dt(bt) if isinstance(bt, str) else None
    if not start:
        return None

    now = datetime.now(timezone.utc)
    elapsed = (now - start).total_seconds()

    desired = booking_status_to_steps(desired_status_by_elapsed(elapsed))

    order_rank = {"NEW": 0, "CONFIRMED": 1, "COOKING": 2, "READY": 3, "SERVED": 4, "CANCELLED": -1}
    cur_rank = order_rank.get(booking_status_to_steps(cur), 0)
    des_rank = order_rank.get(desired, 0)

    if des_rank > cur_rank:
        db_update_booking_status(b.get("id"), desired)
        return desired

    return None


# =========================
# DB access (Supabase)
# =========================
_COL_MISSING_RE = re.compile(r'column "([^"]+)" .* does not exist', re.IGNORECASE)

def _raise_db_error(e: Exception, default_msg: str = "Database error"):
    if isinstance(e, APIError):
        detail = None
        try:
            detail = e.args[0]
        except Exception:
            detail = str(e)
        raise HTTPException(status_code=500, detail={"error": default_msg, "db": detail})
    raise HTTPException(status_code=500, detail={"error": default_msg, "exception": str(e)})

def db_list_tables(restaurant_id: str) -> List[Dict[str, Any]]:
    try:
        res = (
            supabase.table("tables")
            .select("*")
            .eq("restaurant_id", restaurant_id)  # ✅ quan trọng
            .order("table_name")
            .execute()
        )
        return res.data or []
    except Exception as e:
        _raise_db_error(e, "Cannot list tables")


def db_get_table_row_by_name(table_name: str) -> Optional[Dict[str, Any]]:
    try:
        res = (
            supabase.table("tables")
            .select("*")
            .eq("table_name", table_name)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        _raise_db_error(e, "Cannot get table row")

def db_get_first_table_with_restaurant() -> Optional[Dict[str, Any]]:
    try:
        res = (
            supabase.table("tables")
            .select("restaurant_id, id, table_name")
            .not_.is_("restaurant_id", "null")
            .order("table_name")
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        _raise_db_error(e, "Cannot get first table")

def db_get_first_table_any_restaurant() -> Optional[Dict[str, Any]]:
    try:
        res = (
            supabase.table("tables")
            .select("restaurant_id, id, table_name")
            .order("table_name")
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        _raise_db_error(e, "Cannot get first table")

def db_get_restaurant_name(restaurant_id: str) -> Optional[str]:
    try:
        res = (
            supabase.table("restaurants")
            .select("name")
            .eq("id", restaurant_id)
            .limit(1)
            .execute()
        )
        return res.data[0].get("name") if res.data else None
    except Exception:
        return None

def db_get_menu_items(restaurant_id: str, q: str, category: str) -> List[Dict[str, Any]]:
    try:
        query = supabase.table("menus").select("*").eq("restaurant_id", restaurant_id)
        if q:
            query = query.ilike("food_name", f"%{q}%")
        if category and category != "all":
            query = query.eq("category", category)
        query = (
            query
            .order("is_available", desc=True)
            .order("is_best_seller", desc=True)
            .order("food_name")
        )
        res = query.execute()
        return res.data or []
    except Exception as e:
        _raise_db_error(e, "Cannot list menu items")

def db_list_categories(restaurant_id: str) -> List[str]:
    try:
        res = supabase.table("menus").select("category").eq("restaurant_id", restaurant_id).execute()
        cats = []
        for r in (res.data or []):
            c = (r.get("category") or "").strip()
            if c:
                cats.append(c)
        seen = set()
        out = []
        for c in cats:
            if c not in seen:
                seen.add(c)
                out.append(c)
        return out
    except Exception as e:
        _raise_db_error(e, "Cannot list categories")

def db_get_branch_uuid_by_code_or_name(restaurant_id: str, branch_key: str) -> Optional[str]:
    if not branch_key:
        return None

    if is_uuid(branch_key):
        return branch_key

    if DEFAULT_BRANCH_UUID and branch_key == DEFAULT_BRANCH_ID:
        return DEFAULT_BRANCH_UUID

    def _safe_exec(fn):
        try:
            return fn()
        except APIError as e:
            detail = None
            try:
                detail = e.args[0] if e.args else None
            except Exception:
                detail = None

            msg = ""
            code = ""
            if isinstance(detail, dict):
                msg = str(detail.get("message") or "")
                code = str(detail.get("code") or "")
            if code == "42703" or ("does not exist" in msg.lower() and "column" in msg.lower()):
                return None
            raise

    try:
        res = _safe_exec(lambda: (
            supabase.table("branches")
            .select("id")
            .eq("restaurant_id", restaurant_id)
            .eq("code", branch_key)
            .limit(1)
            .execute()
        ))
        if res and res.data:
            return res.data[0].get("id")

        res = _safe_exec(lambda: (
            supabase.table("branches")
            .select("id")
            .eq("restaurant_id", restaurant_id)
            .eq("name", branch_key)
            .limit(1)
            .execute()
        ))
        if res and res.data:
            return res.data[0].get("id")

        return None
    except Exception as e:
        _raise_db_error(e, "Cannot resolve branch uuid")


# =========================
# People count (Hướng B -> lưu vào bookings type="visit")
# =========================
def _people_session_key(restaurant_id: str, table_uuid: str) -> str:
    return f"people_count::{restaurant_id}::{table_uuid}"

def db_get_latest_visit_for_table(restaurant_id: str, table_uuid: str) -> Optional[Dict[str, Any]]:
    try:
        res = (
            supabase.table("bookings")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .eq("table_id", table_uuid)
            .eq("type", "visit")
            .order("booking_time", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        _raise_db_error(e, "Cannot get latest visit booking")

def db_upsert_visit_people_count(restaurant_id: str, table_uuid: str, people_count: int) -> Dict[str, Any]:
    latest = db_get_latest_visit_for_table(restaurant_id, table_uuid)

    if latest and latest.get("id"):
        try:
            res = (
                supabase.table("bookings")
                .update({"people_count": people_count})
                .eq("id", latest["id"])
                .execute()
            )
            return res.data[0] if res.data else latest
        except Exception as e:
            _raise_db_error(e, "Cannot update people_count (visit booking)")

    payload = {
        "restaurant_id": restaurant_id,
        "table_id": table_uuid,
        "tenant_id": None,
        "user_id": None,
        "phone": None,  # khách vãng lai -> NULL
        "people_count": people_count,
        "booking_time": now_iso(),
        "status": "CONFIRMED",
        "type": "visit",  # ✅ không phải order
        "customer_name": DEFAULT_CUSTOMER_NAME,
    }

    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        res = supabase.table("bookings").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Insert visit booking failed")
        return res.data[0]
    except Exception as e:
        _raise_db_error(e, "Insert visit booking failed")


# =========================
# Bookings (orders)
# =========================
def db_insert_order_as_booking(
    restaurant_id: str,
    table_uuid: str,
    cart_lines: List[Dict[str, Any]],
    cart_total: int,
    people_count: Optional[int] = None,
) -> Dict[str, Any]:
    payload = {
        "restaurant_id": restaurant_id,
        "table_id": table_uuid,
        "tenant_id": None,
        "user_id": None,
        "phone": None,  # ✅ khách vãng lai -> NULL
        "people_count": people_count,
        "booking_time": now_iso(),
        "status": "NEW",
        "type": "order",
        "customer_name": DEFAULT_CUSTOMER_NAME,
        "order_payload": {"lines": cart_lines, "total": cart_total},  # ✅ JSON chỗ mới
    }

    # bỏ key None để hạn chế lỗi schema
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        res = supabase.table("bookings").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Insert booking/order failed")
        return res.data[0]
    except Exception as e:
        _raise_db_error(e, "Insert booking(order) failed")

def db_list_orders_for_table(restaurant_id: str, table_uuid: str) -> List[Dict[str, Any]]:
    try:
        res = (
            supabase.table("bookings")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .eq("table_id", table_uuid)
            .eq("type", "order")
            .order("booking_time", desc=True)
            .limit(50)
            .execute()
        )
        return res.data or []
    except Exception as e:
        _raise_db_error(e, "Cannot list bookings(order)")

def parse_booking_lines(b: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], int]:
    # ✅ ưu tiên order_payload (mới)
    obj = b.get("order_payload")

    # order_payload là jsonb -> dict
    if isinstance(obj, dict):
        lines = obj.get("lines") if isinstance(obj.get("lines"), list) else []
        total = obj.get("total", 0)
        return lines, money(total)

    # order_payload là text -> string JSON
    if isinstance(obj, str) and obj.strip():
        try:
            j = json.loads(obj)
            if isinstance(j, dict):
                lines = j.get("lines") if isinstance(j.get("lines"), list) else []
                total = j.get("total", 0)
                return lines, money(total)
        except Exception:
            pass

    # fallback cực cũ (nếu trước đây nhét JSON vào customer_name)
    raw = b.get("customer_name") or ""
    if isinstance(raw, str) and raw.strip():
        try:
            old = json.loads(raw)
            if isinstance(old, dict):
                lines = old.get("lines") if isinstance(old.get("lines"), list) else []
                total = old.get("total", 0)
                return lines, money(total)
        except Exception:
            pass

    return [], 0



# =========================
# Invoices
# =========================
def db_create_invoice(
    restaurant_id: str,
    table_uuid: str,
    sub_total: int,
    booking_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    customer_email: Optional[str] = None,
    bill_lines: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    if not tenant_id and DEFAULT_TENANT_ID:
        tenant_id = DEFAULT_TENANT_ID

    notes_value = "Guest requested bill"
    if bill_lines:
        try:
            notes_value = json.dumps(
                {"source": "guest", "restaurant_id": restaurant_id, "lines": bill_lines, "total": sub_total},
                ensure_ascii=False,
            )
        except Exception:
            pass

    payload = {
        "restaurant_id": restaurant_id,
        "restautant_id": restaurant_id,  # typo fallback

        "table_id": table_uuid,
        "booking_id": booking_id,
        "branch_id": branch_id,

        "customer_name": customer_name,
        "customer_nan": customer_name,

        "customer_phone": customer_phone,
        "customer_phc": customer_phone,

        "customer_email": customer_email,
        "customer_emi": customer_email,

        "sub_total": sub_total,
        "discount_amount": 0,
        "tax_amount": 0,
        "service_fee": 0,

        "status": "Draft",

        "payment_status": "unpaid",
        "payment_stati": "unpaid",

        "paid_amount": 0,
        "issued_at": now_iso(),
        "notes": notes_value,

        "tenant_id": tenant_id,
    }

    payload = {k: v for k, v in payload.items() if v is not None}

    def _try_insert_dynamic(p: Dict[str, Any]) -> Dict[str, Any]:
        for _ in range(20):
            try:
                res = supabase.table("invoices").insert(p).execute()
                if not res.data:
                    raise HTTPException(status_code=500, detail="Insert invoice failed (no data returned)")
                return res.data[0]

            except APIError as e:
                detail = None
                try:
                    detail = e.args[0] if e.args else None
                except Exception:
                    detail = None

                msg = ""
                code = ""
                if isinstance(detail, dict):
                    msg = str(detail.get("message") or "")
                    code = str(detail.get("code") or "")

                if code == "42703" or ("does not exist" in msg.lower() and "column" in msg.lower()):
                    m = _COL_MISSING_RE.search(msg)
                    if m:
                        missing_col = m.group(1)
                        if missing_col in p:
                            p.pop(missing_col, None)
                            continue

                    for k in ["tenant_id", "issued_at", "service_fee", "paid_amount", "discount_amount", "tax_amount"]:
                        if k in p:
                            p.pop(k, None)
                            break
                    continue

                _raise_db_error(e, "Insert invoice failed")

            except Exception as e:
                _raise_db_error(e, "Insert invoice failed")

        raise HTTPException(status_code=500, detail="Insert invoice failed after retries (schema mismatch?)")

    return _try_insert_dynamic(dict(payload))

def db_get_latest_invoice_for_table(table_uuid: str) -> Optional[Dict[str, Any]]:
    try:
        res = (
            supabase.table("invoices")
            .select("*")
            .eq("table_id", table_uuid)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        _raise_db_error(e, "Cannot get latest invoice")


# =========================
# Business helpers
# =========================
def build_menu_view_models(menu_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items = []
    for r in menu_rows:
        items.append(
            {
                "id": r.get("id"),
                "name": r.get("food_name"),
                "price": money(r.get("price")),
                "available": bool(r.get("is_available", True)),
                "category": r.get("category") or "",
                "description": r.get("description") or "",
                "image_url": r.get("image") or "",
            }
        )
    return items

def compute_cart_totals(
    cart: Dict[str, Dict[str, Any]],
    menu_rows: List[Dict[str, Any]],
) -> Tuple[int, int, Dict[str, Any]]:
    menu_map = {m.get("id"): m for m in menu_rows}
    total = 0
    qty = 0
    cart_map: Dict[str, Any] = {}
    for item_id, v in cart.items():
        q = safe_int(v.get("qty"), 0)
        if q <= 0:
            continue
        m = menu_map.get(item_id)
        price = money(m.get("price")) if m else 0
        total += price * q
        qty += q
        cart_map[item_id] = {"qty": q, "note": v.get("note")}
    return total, qty, cart_map

def build_bill_from_orders(orders: List[Dict[str, Any]], menu_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    menu_map = {m.get("id"): m for m in menu_rows}
    agg: Dict[Tuple[str, str], Dict[str, Any]] = {}
    total = 0
    qty = 0

    for b in orders:
        lines, _ = parse_booking_lines(b)
        for ln in lines:
            item_id = ln.get("item_id")
            q = safe_int(ln.get("qty"), 0)
            note = (ln.get("note") or "").strip()
            if q <= 0 or not item_id:
                continue
            m = menu_map.get(item_id, {})
            name = m.get("food_name") or "Unknown"
            unit = money(m.get("price"))
            key = (item_id, note)
            if key not in agg:
                agg[key] = {"name": name, "unit_price": unit, "qty": 0, "note": note}
            agg[key]["qty"] += q

    lines_out = []
    for _, v in agg.items():
        sub = money(v["unit_price"]) * safe_int(v["qty"], 0)
        lines_out.append(
            {"name": v["name"], "unit_price": money(v["unit_price"]), "qty": safe_int(v["qty"], 0), "subtotal": sub, "note": v.get("note") or ""}
        )
        total += sub
        qty += safe_int(v["qty"], 0)

    lines_out.sort(key=lambda x: (x["name"], x["note"]))
    return {"total": total, "qty": qty, "lines": lines_out}


# =========================
# Routes
# =========================
@app.get("/health")
def health():
    return {"ok": True, "time": now_iso()}

@app.get("/favicon.ico")
def favicon():
    return JSONResponse({"ok": True})

@app.get("/")
def home():
    first = db_get_first_table_with_restaurant()
    if not first:
        first = db_get_first_table_any_restaurant()

    if not first or not first.get("restaurant_id"):
        return HTMLResponse(
            "<h3>Thiếu dữ liệu restaurant_id</h3>"
            "<p>Bảng tables của bạn đang có nhiều row restaurant_id = NULL. "
            "Hãy đảm bảo bàn bạn muốn dùng có restaurant_id.</p>"
        )

    restaurant_id = first["restaurant_id"]
    table_name = first["table_name"] or "Bàn 1"

    return RedirectResponse(
        url=f"/g/{restaurant_id}/{DEFAULT_BRANCH_ID}/tables/{table_name}",
        status_code=HTTP_302_FOUND
    )

# Tạo QR
@app.get("/g/{restaurant_id}/{branch_id}/tables/{table_name}/qr.png")
def qr_png(request: Request, restaurant_id: str, branch_id: str, table_name: str):
    base = str(request.base_url).rstrip("/")
    share_url = f"{base}/g/{restaurant_id}/{branch_id}/tables/{table_name}"
    png = make_qr_png_advanced(share_url, box_size=10, border=2)
    return Response(content=png, media_type="image/png")

# Set people_count (Hướng B -> booking type="visit")
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/people/set")
def set_people(request: Request, restaurant_id: str, branch_id: str, table_name: str, people_count: int = Form(...)):
    tbl = db_get_table_row_by_name(table_name)
    if not tbl:
        raise HTTPException(status_code=404, detail=f"Table not found: {table_name}")

    real_restaurant_id = tbl.get("restaurant_id") or restaurant_id
    table_uuid = tbl.get("id")
    if not table_uuid:
        raise HTTPException(status_code=500, detail="Table id missing")

    pc = safe_int(people_count, 0)
    if pc <= 0 or pc > 50:
        request.session["flash"] = "Số người không hợp lệ."
        return RedirectResponse(
            url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}",
            status_code=HTTP_302_FOUND,
        )

    # lưu session theo bàn
    request.session[_people_session_key(real_restaurant_id, table_uuid)] = pc

    # upsert visit booking
    db_upsert_visit_people_count(real_restaurant_id, table_uuid, pc)

    request.session["flash"] = f"Đã lưu số người: {pc}"
    return RedirectResponse(
        url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}",
        status_code=HTTP_302_FOUND,
    )

@app.get("/g/{restaurant_id}/{branch_id}/tables/{table_name}", response_class=HTMLResponse)
def guest_menu(
    request: Request,
    restaurant_id: str,
    branch_id: str,
    table_name: str,
    q: str = "",
    category: str = "all",
):
    tbl = db_get_table_row_by_name(table_name)
    if not tbl:
        raise HTTPException(status_code=404, detail=f"Table not found: {table_name}")

    real_restaurant_id = tbl.get("restaurant_id") or restaurant_id
    table_uuid = tbl.get("id")
    if not table_uuid:
        raise HTTPException(status_code=500, detail="Table id missing")

    # redirect nếu restaurant_id trên URL sai
    if tbl.get("restaurant_id") and tbl.get("restaurant_id") != restaurant_id:
        return RedirectResponse(
            url=f"/g/{tbl.get('restaurant_id')}/{branch_id}/tables/{table_name}?q={q}&category={category}",
            status_code=HTTP_302_FOUND
        )

    menu_rows = db_get_menu_items(real_restaurant_id, q=q, category=category)
    categories = db_list_categories(real_restaurant_id)

    tbl_rows = db_list_tables(real_restaurant_id)
    tables = [t.get("table_name") for t in tbl_rows if t.get("table_name")]
    table_status = {
        t.get("table_name"): table_status_to_ui(t.get("status"))
        for t in tbl_rows
        if t.get("table_name")
    }

    cart = get_session_cart(request)
    cart_total, cart_qty, cart_map = compute_cart_totals(cart, menu_rows)

    orders_raw = db_list_orders_for_table(real_restaurant_id, table_uuid)

    # auto-advance status khi render trang
    for o in orders_raw:
        new_status = maybe_auto_advance_booking(o)
        if new_status:
            o["status"] = new_status

    orders_vm = []
    mm = {m.get("id"): m for m in menu_rows}
    for o in orders_raw:
        lines, stored_total = parse_booking_lines(o)
        total = stored_total
        if total <= 0 and lines:
            t = 0
            for ln in lines:
                it = mm.get(ln.get("item_id"))
                t += money(it.get("price") if it else 0) * safe_int(ln.get("qty"), 0)
            total = t

        orders_vm.append(
            {
                "id": o.get("id"),
                "status": {"value": booking_status_to_steps(o.get("status"))},
                "total": total,
            }
        )

    bill = build_bill_from_orders(orders_raw, menu_rows)

    latest_inv = db_get_latest_invoice_for_table(table_uuid)
    ps = (latest_inv.get("payment_status") or "").lower() if latest_inv else ""
    bill_requested = bool(latest_inv) and (ps in ("unpaid", "paid"))
    bill_paid = bool(latest_inv) and (ps == "paid")

    restaurant_name = db_get_restaurant_name(real_restaurant_id)

    # ====== People count modal logic (show if chưa chọn) ======
    people_key = _people_session_key(real_restaurant_id, table_uuid)
    people_count = request.session.get(people_key)
    show_people_modal = not isinstance(people_count, int) or people_count <= 0

    ctx = {
        "request": request,
        "flash": pop_flash(request),

        "restaurant_id": real_restaurant_id,
        "branch_id": branch_id,
        "restaurant_name": restaurant_name,
        "table_id": table_name,

        "q": q,
        "category": category,

        "menu": menu_rows,
        "items": build_menu_view_models(menu_rows),
        "categories": categories,

        "tables": tables,
        "table_status": table_status,

        "cart": cart_to_list(cart_map),
        "cart_map": cart_map,
        "cart_total": cart_total,
        "cart_qty": cart_qty,

        "orders": orders_vm,

        "bill_total": bill["total"],
        "bill_qty": bill["qty"],
        "bill_lines": bill["lines"],
        "bill_requested": bill_requested,
        "bill_paid": bill_paid,

        # ====== for popup on guest_menu.html ======
        "people_count": people_count if isinstance(people_count, int) else 0,
        "show_people_modal": show_people_modal,
    }
    return templates.TemplateResponse("guest_menu.html", ctx)


# =========================
# Cart ops
# =========================
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/cart/add")
def cart_add(request: Request, restaurant_id: str, branch_id: str, table_name: str, item_id: str = Form(...)):
    cart = get_session_cart(request)
    cur = cart.get(item_id, {"qty": 0, "note": ""})
    cur["qty"] = safe_int(cur.get("qty"), 0) + 1
    cart[item_id] = cur
    request.session["cart"] = cart
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_name}", status_code=HTTP_302_FOUND)

@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/cart/sub")
def cart_sub(request: Request, restaurant_id: str, branch_id: str, table_name: str, item_id: str = Form(...)):
    cart = get_session_cart(request)
    if item_id in cart:
        cur = cart[item_id]
        q = safe_int(cur.get("qty"), 0) - 1
        if q <= 0:
            cart.pop(item_id, None)
        else:
            cur["qty"] = q
            cart[item_id] = cur
    request.session["cart"] = cart
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_name}", status_code=HTTP_302_FOUND)

@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/cart/note")
def cart_note(request: Request, restaurant_id: str, branch_id: str, table_name: str, item_id: str = Form(...), note: str = Form("")):
    cart = get_session_cart(request)
    cur = cart.get(item_id, {"qty": 0, "note": ""})
    cur["note"] = (note or "").strip()
    cart[item_id] = cur
    request.session["cart"] = cart
    return RedirectResponse(
        url=f"/g/{restaurant_id}/{branch_id}/tables/{table_name}#orders-section",
        status_code=HTTP_302_FOUND,
    )

@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/cart/clear")
def cart_clear(request: Request, restaurant_id: str, branch_id: str, table_name: str):
    request.session["cart"] = {}
    request.session["flash"] = "Đã xoá giỏ hàng."
    return RedirectResponse(url=f"/g/{restaurant_id}/{branch_id}/tables/{table_name}", status_code=HTTP_302_FOUND)


# =========================
# Place order (BOOKINGS)
# =========================
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/order/place")
def place_order(request: Request, restaurant_id: str, branch_id: str, table_name: str):
    tbl = db_get_table_row_by_name(table_name)
    if not tbl:
        raise HTTPException(status_code=404, detail=f"Table not found: {table_name}")

    real_restaurant_id = tbl.get("restaurant_id") or restaurant_id
    table_uuid = tbl.get("id")
    if not table_uuid:
        raise HTTPException(status_code=500, detail="Table id missing")

    cart = get_session_cart(request)
    cart_list = cart_to_list(cart)
    if not cart_list:
        return RedirectResponse(url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}", status_code=HTTP_302_FOUND)

    menu_rows = db_get_menu_items(real_restaurant_id, q="", category="all")
    mm = {m.get("id"): m for m in menu_rows}
    cart_total = 0
    for ln in cart_list:
        it = mm.get(ln["item_id"])
        cart_total += money(it.get("price") if it else 0) * safe_int(ln["qty"], 0)

    # lấy people_count từ session (nếu có)
    people_key = _people_session_key(real_restaurant_id, table_uuid)
    pc = request.session.get(people_key)
    pc = pc if isinstance(pc, int) and pc > 0 else None

    _ = db_insert_order_as_booking(
        restaurant_id=real_restaurant_id,
        table_uuid=table_uuid,
        cart_lines=cart_list,
        cart_total=cart_total,
        people_count=pc,
    )

    request.session["cart"] = {}
    request.session["flash"] = "Đã đặt món thành công."
    return RedirectResponse(
        url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}#orders-section",
        status_code=HTTP_302_FOUND,
    )


# =========================
# Request bill (INVOICES ONLY)
# =========================
@app.post("/g/{restaurant_id}/{branch_id}/tables/{table_name}/bill/request")
def request_bill(request: Request, restaurant_id: str, branch_id: str, table_name: str):
    tbl = db_get_table_row_by_name(table_name)
    if not tbl:
        raise HTTPException(status_code=404, detail=f"Table not found: {table_name}")

    real_restaurant_id = tbl.get("restaurant_id") or restaurant_id
    table_uuid = tbl.get("id")
    if not table_uuid:
        raise HTTPException(status_code=500, detail="Table id missing")

    menu_rows = db_get_menu_items(real_restaurant_id, q="", category="all")
    orders_raw = db_list_orders_for_table(real_restaurant_id, table_uuid)
    bill = build_bill_from_orders(orders_raw, menu_rows)

    if bill["total"] <= 0:
        request.session["flash"] = "Bàn chưa có món để thanh toán."
        return RedirectResponse(
            url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}#bill-section",
            status_code=HTTP_302_FOUND,
        )

    latest_inv = db_get_latest_invoice_for_table(table_uuid)
    ps = (latest_inv.get("payment_status") or "").lower() if latest_inv else ""
    if latest_inv and ps == "unpaid":
        request.session["flash"] = "Bàn đã gọi thanh toán rồi. Vui lòng chờ thu ngân."
        return RedirectResponse(
            url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}#bill-section",
            status_code=HTTP_302_FOUND,
        )

    latest_booking_id = orders_raw[0].get("id") if orders_raw else None
    branch_uuid = db_get_branch_uuid_by_code_or_name(real_restaurant_id, branch_id)

    _inv = db_create_invoice(
        restaurant_id=real_restaurant_id,
        table_uuid=table_uuid,
        sub_total=bill["total"],
        booking_id=latest_booking_id,
        branch_id=branch_uuid,
        tenant_id=None,
        customer_name=None,
        customer_phone=None,
        customer_email=None,
        bill_lines=bill["lines"],
    )

    request.session["flash"] = "Đã tạo hóa đơn. Vui lòng chờ thu ngân."
    return RedirectResponse(
        url=f"/g/{real_restaurant_id}/{branch_id}/tables/{table_name}#bill-section",
        status_code=HTTP_302_FOUND,
    )


# =========================
# JSON endpoints
# =========================
@app.get("/g/{restaurant_id}/{branch_id}/tables/{table_name}/orders/json")
def orders_json(restaurant_id: str, branch_id: str, table_name: str):
    tbl = db_get_table_row_by_name(table_name)
    if not tbl:
        raise HTTPException(status_code=404, detail=f"Table not found: {table_name}")

    real_restaurant_id = tbl.get("restaurant_id") or restaurant_id
    table_uuid = tbl.get("id")
    if not table_uuid:
        raise HTTPException(status_code=500, detail="Table id missing")

    menu_rows = db_get_menu_items(real_restaurant_id, q="", category="all")
    orders_raw = db_list_orders_for_table(real_restaurant_id, table_uuid)

    # auto-advance status mỗi lần client poll
    for o in orders_raw:
        new_status = maybe_auto_advance_booking(o)
        if new_status:
            o["status"] = new_status

    mm = {m.get("id"): m for m in menu_rows}
    orders = []
    for o in orders_raw:
        lines, stored_total = parse_booking_lines(o)
        line_items = []

        total = stored_total
        if total <= 0 and lines:
            total_calc = 0
            for ln in lines:
                it = mm.get(ln.get("item_id"))
                total_calc += money(it.get("price") if it else 0) * safe_int(ln.get("qty"), 0)
            total = total_calc

        for ln in lines:
            it = mm.get(ln.get("item_id"), {})
            line_items.append(
                {
                    "name": it.get("food_name") or "Unknown",
                    "qty": safe_int(ln.get("qty"), 0),
                    "note": (ln.get("note") or "").strip(),
                }
            )

        orders.append(
            {
                "id": o.get("id"),
                "status": booking_status_to_steps(o.get("status")),
                "total": total,
                "updated_at": o.get("booking_time") or o.get("updated_at") or None,
                "lines": line_items,
            }
        )

    bill = build_bill_from_orders(orders_raw, menu_rows)

    latest_inv = db_get_latest_invoice_for_table(table_uuid)
    ps = (latest_inv.get("payment_status") or "").lower() if latest_inv else ""
    bill_requested = bool(latest_inv) and (ps in ("unpaid", "paid"))
    bill_paid = bool(latest_inv) and (ps == "paid")

    return JSONResponse(
        {
            "server_time": now_iso(),
            "orders": orders,
            "bill": {
                "total": bill["total"],
                "qty": bill["qty"],
                "lines": bill["lines"],
                "requested": bill_requested,
                "paid": bill_paid,
            },
        }
    )

@app.get("/g/{restaurant_id}/{branch_id}/tables/status/json")
def tables_status_json(restaurant_id: str, branch_id: str):
    # 1) lấy danh sách bàn đúng restaurant
    tbl_rows = db_list_tables(restaurant_id)

    # 2) bàn đang chờ thanh toán = có invoice unpaid
    try:
        inv = (
            supabase.table("invoices")
            .select("table_id,payment_status")
            .eq("restaurant_id", restaurant_id)
            .eq("payment_status", "unpaid")
            .execute()
        )
        billing_tables = {r.get("table_id") for r in (inv.data or []) if r.get("table_id")}
    except Exception:
        billing_tables = set()

    # 3) bàn đang có khách = có order chưa kết thúc
    # (NEW/CONFIRMED/COOKING/READY)
    try:
        bks = (
            supabase.table("bookings")
            .select("table_id,status,type")
            .eq("restaurant_id", restaurant_id)
            .eq("type", "order")
            .in_("status", ["NEW", "CONFIRMED", "COOKING", "READY"])
            .execute()
        )
        occupied_tables = {r.get("table_id") for r in (bks.data or []) if r.get("table_id")}
    except Exception:
        occupied_tables = set()

    # 4) build map table_name -> ui status
    mp = {}
    for t in tbl_rows:
        tid = t.get("id")
        name = t.get("table_name")
        if not name or not tid:
            continue

        if tid in billing_tables:
            mp[name] = "billing"     # đỏ = chờ thanh toán
        elif tid in occupied_tables:
            mp[name] = "occupied"    # vàng = đang có khách
        else:
            mp[name] = "empty"       # xám = trống

    return JSONResponse({"server_time": now_iso(), "tables": mp})
