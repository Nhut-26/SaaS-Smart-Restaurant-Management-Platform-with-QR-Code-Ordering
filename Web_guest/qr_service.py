from io import BytesIO
import qrcode
from qrcode.constants import ERROR_CORRECT_M
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_Q, ERROR_CORRECT_H

def make_qr_png_advanced(
    data: str,
    *,
    box_size: int = 8,
    border: int = 2,
    error_correction: int = ERROR_CORRECT_M,
    optimize: int = 20,
) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=error_correction,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data, optimize=optimize)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def make_qr_png(data: str, *, box_size: int = 8, border: int = 2) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
