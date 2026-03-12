# currency.py — Central currency formatting for all backend output
# The default symbol is Rs. (Indian Rupee). It can be overridden per-request.

DEFAULT_CURRENCY_SYMBOL = "Rs."


def fmt(val: float, symbol: str = DEFAULT_CURRENCY_SYMBOL) -> str:
    """Format a numeric value as a currency string (e.g. Rs.1.25M, Rs.34.5K)."""
    if val is None:
        return "N/A"
    try:
        val = float(val)
    except (TypeError, ValueError):
        return str(val)

    if abs(val) >= 1_000_000_000:
        return f"{symbol}{val / 1_000_000_000:,.2f}B"
    if abs(val) >= 1_000_000:
        return f"{symbol}{val / 1_000_000:,.2f}M"
    if abs(val) >= 1_000:
        return f"{symbol}{val / 1_000:,.1f}K"
    return f"{symbol}{val:,.2f}"


def fmt_plain(val: float) -> str:
    """Format a number without a currency symbol (for text that already adds context)."""
    if val is None:
        return "N/A"
    try:
        val = float(val)
    except (TypeError, ValueError):
        return str(val)
    return f"{val:,.2f}"
