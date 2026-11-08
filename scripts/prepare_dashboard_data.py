"""Prepare dashboard data from the source datasets.

Reads the read-only source CSVs, recomputes every MVP metric with the formulas locked in
`docs/METRIC_DICTIONARY.md` (Bagian 0, decisions D1-D7), reconciles the result against the
benchmark anchors, and only then writes JSON.

Definition basis (decision D7 — "basis C"):
- revenue (net sales) = gross_sales - discount_amount            (merchandise net)
- profit              = revenue - product_cost                   (excludes tax)
- tax_amount          = pass-through liability, NOT revenue and NOT profit
- shipping_cost       = pass-through, NOT revenue and NOT profit
The values exactly as stored in the source file (`net_sales` = gross - discount + tax +
shipping, `profit` = net_sales - product_cost - shipping_cost) are reported separately under
`as_stored` for traceability only.

Behaviour:
- `data/source/` is never modified.
- If any anchor deviates beyond tolerance, the script prints a report and exits non-zero
  WITHOUT writing any output file.
- Outputs are written to `data/processed/` and copied byte-for-byte to `public/data/`.
- `order_items.csv` is intentionally NOT read (decision D5: product-level metrics excluded
  from the MVP until reconciliation is complete).

Review decisions carried by definitions_version "mvp-3" (docs/IMPLEMENTATION_BLUEPRINT.md Q1-Q5):
- Q1=B: combined aggregates (`filter-cubes.json`) so the global filter (period x segment x
  sales channel x order status) stays consistent instead of mixing unrelated totals.
- Q3=B: quarterly, weekday/weekend, and delivery-status breakdowns (`time-dimensions.json`).
- Q5=A: every business formula stays here; `dashboard-summary.json` gains a `derived` block.
- No new business metric is invented: all additions re-aggregate the same basis-C measures.

Review decisions carried by definitions_version "mvp-4" (approved option B, see
docs/IMPLEMENTATION_BLUEPRINT.md §16.4):
- `filter-cubes.json` gains four *panel* cubes (`day_type`, `delivery_status`,
  `discount_bracket`, `region`) so their panels follow the period range instead of always
  showing the whole dataset.
- Panel cubes are period x one dimension only. They never combine with a dimension filter
  (`segment`, `sales_channel`, `order_status`); that would need period x filter x panel cubes.
- `customers` is NOT carried on panel cubes: it is non-additive and no filtered panel uses it.

Review decisions carried by definitions_version "mvp-5" (global filter milestone):
- `filter-cubes.json` gains one *combined* cube: period x segment x sales_channel x order_status.
  The four combinable global filters (month range, customer segment, sales channel, order status)
  are therefore any sum of compatible rows - no second business formula is needed in the frontend.
- Additive measures only on the combined cube (`orders`, `net_sales`, `profit`). Non-additive
  measures (`customers`, `avg_transaction_margin_pct`) are NOT carried: they cannot be filtered
  for arbitrary combinations. Panels that need them stay whole-period.
- The single-dimension cubes and the panel cubes are unchanged, so existing payload consumers and
  reconciliations keep working; the combined cube must reproduce every marginal exactly.

Review decisions carried by definitions_version "mvp-6" (Sales & Profitability page):
- Every cube row additionally carries the two additive discount-side measures `gross_sales` and
  `discount_amount`, so the discount analysis (gross sales, discount amount, weighted discount
  rate = sum(discount) / sum(gross)) follows every global filter instead of falling back to
  whole-period constants. Both are plain sums; no business formula changes.
- The D7 identity `net_sales = gross_sales - discount_amount` is re-checked per row and globally.
- Non-additive measures remain excluded from the combined cube (unchanged from mvp-5).

Run:
    .venv/Scripts/python.exe scripts/prepare_dashboard_data.py
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_ROOT / "data" / "source"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"

DEFINITIONS_VERSION = "mvp-6"
MONEY_TOL = 0.01
PCT_TOL = 0.01
COUNT_TOL = 0

SALES_FILE = "ecommerce_sales_customer_analytics_150k.csv"
CUSTOMERS_FILE = "customer_master.csv"
PRODUCTS_FILE = "product_catalog.csv"

# Financial and margin columns must be float64. float32 summation loses several dollars and
# breaks reconciliation with the verified benchmarks (see docs/EDA_VALIDATION.md Bagian 12).
HEAVY_DTYPE = {
    "order_id": "str",
    "customer_id": "str",
    "gender": "category",
    "customer_segment": "category",
    "customer_type": "category",
    "customer_country": "category",
    "region": "category",
    "order_status": "category",
    "sales_channel": "category",
    "payment_method": "category",
    "payment_status": "category",
    "currency": "category",
    "shipping_method": "category",
    "warehouse": "category",
    "delivery_status": "category",
    "return_status": "category",
    "marketing_channel": "category",
    "customer_age": "int8",
    "quantity": "int16",
    "customer_order_count": "int16",
    "gross_sales": "float64",
    "discount_amount": "float64",
    "tax_amount": "float64",
    "shipping_cost": "float64",
    "net_sales": "float64",
    "product_cost": "float64",
    "profit": "float64",
    "profit_margin_percentage": "float64",
    "customer_lifetime_value": "float32",
    "customer_rating": "float32",
    "is_repeat_customer": "bool",
}

# Anchor table from docs/METRIC_DICTIONARY.md Bagian 12 and docs/EDA_VALIDATION.md Bagian 3/5.
# All money/percent anchors are on basis C (decision D7) unless the key says as_stored_*.
ANCHORS = {
    "revenue": (157143214.06, MONEY_TOL),
    "profit": (59232305.35, MONEY_TOL),
    "gross_sales": (189962560.88, MONEY_TOL),
    "discount_amount": (32819346.82, MONEY_TOL),
    "product_cost": (97910908.71, MONEY_TOL),
    "tax_collected": (16914090.41, MONEY_TOL),
    "shipping_billed": (3076959.27, MONEY_TOL),
    "as_stored_net_sales": (177134263.74, MONEY_TOL),
    "as_stored_profit": (76146395.76, MONEY_TOL),
    "orders": (138116, COUNT_TOL),
    "aggregate_margin_pct": (37.69, PCT_TOL),
    "avg_transaction_margin_pct": (41.16, PCT_TOL),
    "anomaly_orders": (12855, COUNT_TOL),
    "anomaly_revenue": (34665272.99, MONEY_TOL),
    "anomaly_profit": (7528760.49, MONEY_TOL),
    "anomaly_aggregate_margin_pct": (21.72, PCT_TOL),
    "counterfactual_gap_avg_txn_margin": (6738175.54, MONEY_TOL),
    "counterfactual_gap_aggregate_margin": (5537690.05, MONEY_TOL),
    "loss_orders": (2530, COUNT_TOL),
    "total_loss": (-426306.80, MONEY_TOL),
    "nov_dec_avg_transaction_margin_pct": (29.72, PCT_TOL),
    "jan_oct_aggregate_margin_pct": (41.61, PCT_TOL),
    "return_rate_pct": (6.85, PCT_TOL),
    "customer_level_repeat_rate_pct": (97.90, PCT_TOL),
    "high_margin_share_pct": (92.01, PCT_TOL),
    # mvp-3 additions (Q5=A derived block, all re-aggregations of basis-C measures).
    "profit_per_customer": (2377.76, MONEY_TOL),
    "orders_per_customer": (5.544, 0.001),
    "discount_rate_weighted_pct": (17.28, PCT_TOL),
    "discount_rate_row_mean_pct": (15.12, PCT_TOL),
    "discount_rate_row_median_pct": (12.75, PCT_TOL),
    "discount_rate_row_max_pct": (60.02, PCT_TOL),
    "weekend_order_share_pct": (28.55, PCT_TOL),
}

BRACKET_ANCHORS = {
    "0% (No Discount)": (51.30, 48.41),
    "1-10%": (48.06, 44.74),
    "11-20%": (43.11, 39.88),
    "21-30%": (35.61, 31.57),
    "30%+": (18.13, 15.17),
}
BRACKET_ORDER = list(BRACKET_ANCHORS)

SEGMENT_ANCHORS = {
    "Consumer": (56.65, 39.00),
    "Premium": (23.55, 35.37),
    "VIP": (9.51, 35.37),
    "Business": (10.28, 38.73),
}

ANNUAL_ANCHORS = {
    2021: (37.58, None),
    2022: (37.61, -1.14),
    2023: (37.64, 0.64),
    2024: (37.83, -0.22),
    2025: (37.80, -1.07),
}

QUARTER_ANCHORS = {
    "Q1": 42.71,
    "Q2": 42.96,
    "Q3": 39.08,
    "Q4": 30.22,
}

DAY_TYPE_ANCHORS = {
    "Weekday": (98686, 37.71),
    "Weekend": (39430, 37.65),
}

DELIVERY_ANCHORS = {
    "On Time": (86916, 62.93),
    "Delayed": (16886, 12.23),
    "Early": (9757, 7.06),
    "Cancelled": (24557, 17.78),
}

# Approved filter dimensions: period range + exactly one of these three at a time.
FILTER_CUBE_DEFS = (
    ("customer_segment", "segment"),
    ("sales_channel", "sales_channel"),
    ("order_status", "order_status"),
)

# Panel dimensions (mvp-4, approved option B): these cubes let a panel follow the period range.
# They intentionally do NOT combine with a filter dimension; see the module docstring.
PANEL_CUBE_DEFS = (
    ("day_type", "day_type"),
    ("delivery_status", "delivery_status"),
    ("discount_bracket", "discount_bracket"),
    ("region", "region"),
)

CUBE_DEFS = FILTER_CUBE_DEFS + PANEL_CUBE_DEFS

# Combined cube (mvp-5): the four combinable global filters share one cube, so any combination of
# month range + segment + sales channel + order status is a plain sum. Additive measures only.
COMBINED_CUBE_KEY = "combined"
COMBINED_CUBE_DEFS = (
    ("customer_segment", "segment"),
    ("sales_channel", "sales_channel"),
    ("order_status", "order_status"),
)

DECISIONS = {
    "margin_basis": "aggregate_primary",
    "avg_transaction_margin": "secondary",
    "net_sales_basis": "merchandise_gross_minus_discount",
    "tax_treatment": "pass_through",
    "shipping_treatment": "pass_through",
    "anomaly_operator": "inclusive",
    "repeat_customer_definition": "customer_with_more_than_one_order",
    "product_level_metrics": "excluded",
    "returns_treatment": "status_only_no_refund_amount",
    "excluded_metrics": ["clv", "romi"],
    # mvp-3 (review decisions Q1-Q5 in docs/IMPLEMENTATION_BLUEPRINT.md):
    "global_filters": ["period", "customer_segment", "sales_channel", "order_status"],
    "cross_filter_source": "filter-cubes.json (combined: period x segment x sales_channel x order_status)",
    # mvp-4 (approved option B): panels that only follow the period range.
    "filter_dimensions": ["segment", "sales_channel", "order_status"],
    "panel_dimensions": ["day_type", "delivery_status", "discount_bracket", "region"],
    # mvp-5: non-additive measures are never carried by the combined cube.
    # mvp-6: gross_sales and discount_amount (both additive) join the measure set, so the
    # discount analysis follows every global filter.
    "combined_cube_measures": [
        "orders",
        "net_sales",
        "profit",
        "gross_sales",
        "discount_amount",
    ],
    "non_additive_measures": ["customers", "avg_transaction_margin_pct"],
    "business_formulas_location": "python_prep_only",
    "export_format": "csv_current_view",
    "user_profile_in_header": "removed",
}

FILTER_CUBE_NOTES = [
    "Kubus gabungan (combined) berisi agregat periode (YYYY-MM) x segmen x sales_channel x "
    "order_status; inilah sumber semua kombinasi filter global. Filter bekerja dengan menjumlahkan "
    "baris yang dipilih.",
    "Kubus filter tunggal (segment, sales_channel, order_status) dipertahankan sebagai agregat "
    "periode x satu dimensi dan wajib sama persis dengan marginal kubus gabungan.",
    "Kubus panel (day_type, delivery_status, discount_bracket, region) hanya mengikuti rentang "
    "periode. Kubus ini tidak dapat digabungkan dengan filter dimensi; UI menyembunyikan panelnya "
    "saat filter dimensi aktif, bukan menampilkan angka tak terfilter.",
    "Ukuran aditif: orders, net_sales, profit, gross_sales, discount_amount. Margin dihitung "
    "ulang dari jumlah profit dan jumlah net_sales; tingkat diskon terbobot dihitung dari jumlah "
    "discount dan jumlah gross_sales (keduanya berbobot, bukan rata-rata persentase).",
    "Ukuran TIDAK aditif: avg_transaction_margin_pct (rerata baris) dan customers (pelanggan unik "
    "per bulan, hanya ada pada kubus filter tunggal). Jangan dijumlahkan atau dirata-ratakan, dan "
    "tidak ada di kubus gabungan.",
    "Semua pembilang berasal dari basis C; tidak ada metrik baru.",
]

TIME_DIMENSION_NOTES = [
    "quarters dan day_types digabung lintas tahun (Q1 = Jan-Mar pada 2021-2025).",
    "year_quarters memecah per tahun bila filter tahun dipakai.",
    "Margin keseluruhan adalah metrik utama; rata-rata margin transaksi adalah sekunder berlabel.",
    "delivery_status 'Cancelled' berarti tidak dikirim, bukan order dibatalkan.",
]

DERIVED_NOTES = {
    "profit_per_customer": "jumlah(profit) / pelanggan aktif (24.911 pelanggan yang muncul di transaksi, bukan 25.000 master)",
    "orders_per_customer": "jumlah(order) / pelanggan aktif (24.911)",
    "discount_rate_weighted_pct": "jumlah(discount_amount) / jumlah(gross_sales) x 100",
    "discount_rate_row_mean_pct": "rerata tingkat diskon per baris",
    "discount_rate_row_median_pct": "median tingkat diskon per baris",
    "discount_rate_row_max_pct": "tingkat diskon baris tertinggi",
    "loss_orders": "jumlah baris dengan profit < 0",
    "total_loss": "jumlah(profit) pada baris profit < 0 (ditampilkan sebagai nilai absolut berlabel kerugian)",
}

COUNTERFACTUAL_ASSUMPTIONS = [
    "Pesanan anomali dianggap bisa mencapai margin keseluruhan portofolio tanpa mengurangi omzet. Harga jual dan jumlah pesanan dianggap tetap.",
    "Perubahan permintaan, biaya tetap, perpindahan pelanggan ke produk lain, dan kesiapan operasional tidak dihitung. Simulasi hanya membandingkan margin.",
    "Hasilnya adalah gambaran besarnya peluang, bukan uang yang sudah hilang. Angka ini ilustratif: bukan prakiraan dan bukan target.",
    "Angka basis margin keseluruhan dipakai sebagai acuan. Angka basis rata-rata transaksi hanya pembanding, bukan angka utama.",
]

PASS_THROUGH_NOTE = (
    "Pajak dan ongkir tidak masuk revenue maupun profit; keduanya diteruskan (pass-through) "
    "dan dilaporkan terpisah. profit = net_sales - product_cost."
)


class ReconciliationError(RuntimeError):
    pass


def r2(value: float) -> float:
    return float(round(float(value), 2))


def r3(value: float) -> float:
    return float(round(float(value), 3))


def discount_bracket(rate: float) -> str:
    if rate == 0:
        return "0% (No Discount)"
    if rate <= 10:
        return "1-10%"
    if rate <= 20:
        return "11-20%"
    if rate <= 30:
        return "21-30%"
    return "30%+"


def load_sales() -> pd.DataFrame:
    df = pd.read_csv(SOURCE_DIR / SALES_FILE, dtype=HEAVY_DTYPE, parse_dates=["order_date"])
    df["order_year"] = df["order_date"].dt.year
    df["order_month"] = df["order_date"].dt.month
    df["order_quarter"] = df["order_date"].dt.quarter
    df["is_weekend"] = df["order_date"].dt.dayofweek >= 5
    df["day_type"] = np.where(df["is_weekend"], "Weekend", "Weekday")
    df["period"] = df["order_date"].dt.strftime("%Y-%m")
    df["discount_rate"] = np.where(
        df["gross_sales"] > 0,
        df["discount_amount"] / df["gross_sales"] * 100,
        0.0,
    ).astype("float64")
    # Decision D7: merchandise net sales and ex-tax profit.
    df["revenue"] = (df["gross_sales"] - df["discount_amount"]).astype("float64")
    df["profit_net"] = (df["revenue"] - df["product_cost"]).astype("float64")
    df["margin_net"] = np.where(
        df["revenue"] > 0,
        df["profit_net"] / df["revenue"] * 100,
        0.0,
    ).astype("float64")
    return df


def build_measures(part: pd.DataFrame) -> dict:
    """Aggregate basis-C measures for one subset.

    Margin is always recomputed from summed profit / summed net_sales (weighted), never as an
    average of percentages. `customers` and `avg_transaction_margin_pct` are carried for
    single-subset display only and are flagged as non-additive in the payload. Since mvp-6 the
    additive discount-side measures (`gross_sales`, `discount_amount`) are included too, so the
    weighted discount rate can be recomputed for any filtered subset.
    """
    m_rev = float(part["revenue"].sum())
    m_profit = float(part["profit_net"].sum())
    return {
        "orders": int(len(part)),
        "customers": int(part["customer_id"].nunique()),
        "net_sales": m_rev,
        "profit": m_profit,
        "gross_sales": float(part["gross_sales"].sum()),
        "discount_amount": float(part["discount_amount"].sum()),
        "avg_transaction_margin_pct": float(part["margin_net"].mean()),
        "aggregate_margin_pct": m_profit / m_rev * 100,
    }


def build_cube(
    df: pd.DataFrame, dim_column: str, dim_key: str, with_customers: bool = True
) -> tuple[list[dict], dict]:
    """Period x dimension cube, plus exact (unrounded) totals for reconciliation.

    `with_customers=False` is used for the mvp-4 panel cubes: the measure is non-additive and
    no panel that follows the period range displays it, so it is not shipped.
    """
    rows: list[dict] = []
    totals = {"orders": 0, "net_sales": 0.0, "profit": 0.0, "gross_sales": 0.0, "discount_amount": 0.0}
    grouped = df.groupby(["period", dim_column], observed=True, sort=True)
    for (period, value), part in grouped:
        measures = build_measures(part)
        totals["orders"] += measures["orders"]
        totals["net_sales"] += measures["net_sales"]
        totals["profit"] += measures["profit"]
        totals["gross_sales"] += measures["gross_sales"]
        totals["discount_amount"] += measures["discount_amount"]
        row = {
            dim_key: str(value),
            "period": str(period),
            "orders": measures["orders"],
            "net_sales": r2(measures["net_sales"]),
            "profit": r2(measures["profit"]),
            "gross_sales": r2(measures["gross_sales"]),
            "discount_amount": r2(measures["discount_amount"]),
            "avg_transaction_margin_pct": r2(measures["avg_transaction_margin_pct"]),
            "aggregate_margin_pct": r2(measures["aggregate_margin_pct"]),
        }
        if with_customers:
            row["customers"] = measures["customers"]
        rows.append(row)
    rows.sort(key=lambda row: (row["period"], row[dim_key]))
    return rows, totals


def build_combined_cube(df: pd.DataFrame) -> tuple[list[dict], dict]:
    """Period x segment x sales_channel x order_status cube (mvp-5, measures extended in mvp-6).

    Additive measures only: `orders`, `net_sales`, `profit`, `gross_sales`, `discount_amount`.
    Non-additive measures such as `customers` are deliberately absent, so no consumer can
    accidentally sum them. Cells without orders are not written (same convention as the
    discount-bracket panel cube).
    """
    columns = [column for column, _ in COMBINED_CUBE_DEFS]
    keys = [key for _, key in COMBINED_CUBE_DEFS]
    rows: list[dict] = []
    totals = {"orders": 0, "net_sales": 0.0, "profit": 0.0, "gross_sales": 0.0, "discount_amount": 0.0}
    grouped = df.groupby(["period", *columns], observed=True, sort=True)
    for (period, *values), part in grouped:
        orders = int(len(part))
        net_sales = float(part["revenue"].sum())
        profit = float(part["profit_net"].sum())
        gross_sales = float(part["gross_sales"].sum())
        discount_amount = float(part["discount_amount"].sum())
        totals["orders"] += orders
        totals["net_sales"] += net_sales
        totals["profit"] += profit
        totals["gross_sales"] += gross_sales
        totals["discount_amount"] += discount_amount
        row = {"period": str(period)}
        for key, value in zip(keys, values):
            row[key] = str(value)
        row["orders"] = orders
        row["net_sales"] = r2(net_sales)
        row["profit"] = r2(profit)
        row["gross_sales"] = r2(gross_sales)
        row["discount_amount"] = r2(discount_amount)
        rows.append(row)
    rows.sort(key=lambda row: tuple(row[key] for key in ("period", *keys)))
    return rows, totals


def main() -> None:
    for name in (SALES_FILE, CUSTOMERS_FILE, PRODUCTS_FILE):
        if not (SOURCE_DIR / name).exists():
            raise SystemExit(f"Missing source file: {SOURCE_DIR / name}")

    df = load_sales()
    customers = pd.read_csv(SOURCE_DIR / CUSTOMERS_FILE, usecols=["customer_id"])
    products = pd.read_csv(SOURCE_DIR / PRODUCTS_FILE, usecols=["product_id"])

    if (df["revenue"] <= 0).any():
        raise ReconciliationError("Non-positive revenue rows found; net sales basis is unsafe.")

    # --- anomaly rule (D2: inclusive, global thresholds) -----------------------------
    revenue_threshold = float(df["revenue"].quantile(0.75))
    margin_threshold = float(df["margin_net"].quantile(0.25))
    df["is_anomaly"] = (df["revenue"] >= revenue_threshold) & (df["margin_net"] <= margin_threshold)

    # --- aggregates ------------------------------------------------------------------
    revenue = float(df["revenue"].sum())
    profit = float(df["profit_net"].sum())
    gross = float(df["gross_sales"].sum())
    discount = float(df["discount_amount"].sum())
    aggregate_margin = profit / revenue * 100
    avg_txn_margin = float(df["margin_net"].mean())

    orders = int(len(df))
    customers_active = int(df["customer_id"].nunique())
    customers_master = int(len(customers))
    products_used = int(products["product_id"].nunique())

    status_counts = df["order_status"].value_counts()
    return_orders = int(status_counts.get("Returned", 0))
    cancelled_orders = int(status_counts.get("Cancelled", 0))
    undelivered = int((df["delivery_status"] == "Cancelled").sum())

    loss_mask = df["profit_net"] < 0
    loss_orders = int(loss_mask.sum())
    total_loss = float(df.loc[loss_mask, "profit_net"].sum())

    orders_per_customer = df.groupby("customer_id").size()
    repeat_rate = float((orders_per_customer > 1).mean() * 100)

    high_margin_share = float((df["margin_net"] > 20).mean() * 100)

    # --- anomaly summary -------------------------------------------------------------
    anom = df[df["is_anomaly"]]
    anom_revenue = float(anom["revenue"].sum())
    anom_profit = float(anom["profit_net"].sum())
    anom_avg_txn_margin = float(anom["margin_net"].mean())
    anom_aggregate_margin = anom_profit / anom_revenue * 100
    gap_avg_txn = anom_revenue * avg_txn_margin / 100 - anom_profit
    gap_aggregate = anom_revenue * aggregate_margin / 100 - anom_profit

    # --- discount brackets -----------------------------------------------------------
    df["discount_bracket"] = df["discount_rate"].map(discount_bracket)
    brackets = []
    for bracket in BRACKET_ORDER:
        part = df[df["discount_bracket"] == bracket]
        b_rev = float(part["revenue"].sum())
        b_profit = float(part["profit_net"].sum())
        brackets.append(
            {
                "bracket": bracket,
                "orders": int(len(part)),
                "net_sales": r2(b_rev),
                "profit": r2(b_profit),
                "avg_transaction_margin_pct": r2(part["margin_net"].mean()),
                "aggregate_margin_pct": r2(b_profit / b_rev * 100),
                "profit_per_order": r2(b_profit / len(part)),
                "loss_orders": int((part["profit_net"] < 0).sum()),
            }
        )

    # --- segments --------------------------------------------------------------------
    segments = []
    for segment, part in df.groupby("customer_segment", observed=True):
        s_rev = float(part["revenue"].sum())
        s_profit = float(part["profit_net"].sum())
        s_customers = int(part["customer_id"].nunique())
        weighted_discount = float(part["discount_amount"].sum() / part["gross_sales"].sum() * 100)
        segments.append(
            {
                "segment": str(segment),
                "orders": int(len(part)),
                "customers": s_customers,
                "net_sales": r2(s_rev),
                "profit": r2(s_profit),
                "avg_transaction_margin_pct": r2(part["margin_net"].mean()),
                "aggregate_margin_pct": r2(s_profit / s_rev * 100),
                "profit_share_pct": r2(s_profit / profit * 100),
                "profit_per_customer": r2(s_profit / s_customers),
                "orders_per_customer": r2(len(part) / s_customers),
                "avg_discount_rate_row_mean_pct": r2(part["discount_rate"].mean()),
                "avg_discount_rate_weighted_pct": r2(weighted_discount),
            }
        )
    segments.sort(key=lambda row: row["profit"], reverse=True)

    # --- anomaly by dimension --------------------------------------------------------
    dimensions: dict[str, list[dict]] = {}
    for column in ("sales_channel", "region", "marketing_channel"):
        rows = []
        for value, part in df.groupby(column, observed=True):
            flagged = int(part["is_anomaly"].sum())
            rows.append(
                {
                    "value": str(value),
                    "orders": int(len(part)),
                    "anomalies": flagged,
                    "anomaly_rate_pct": r2(flagged / len(part) * 100),
                }
            )
        rows.sort(key=lambda row: row["anomaly_rate_pct"], reverse=True)
        dimensions[column] = rows

    # --- status mix margins ----------------------------------------------------------
    status_margins = {}
    for status, part in df.groupby("order_status", observed=True):
        status_margins[str(status)] = {
            "orders": int(len(part)),
            "net_sales": r2(part["revenue"].sum()),
            "profit": r2(part["profit_net"].sum()),
            "aggregate_margin_pct": r2(part["profit_net"].sum() / part["revenue"].sum() * 100),
        }

    # --- monthly ---------------------------------------------------------------------
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    months = []
    monthly_grouped = df.groupby("order_month", observed=True)
    for month in range(1, 13):
        part = monthly_grouped.get_group(month)
        m_rev = float(part["revenue"].sum())
        m_profit = float(part["profit_net"].sum())
        months.append(
            {
                "period": f"{month:02d}",
                "month_name": month_names[month - 1],
                "orders": int(len(part)),
                "net_sales": r2(m_rev),
                "profit": r2(m_profit),
                "avg_transaction_margin_pct": r2(part["margin_net"].mean()),
                "aggregate_margin_pct": r2(m_profit / m_rev * 100),
            }
        )

    months_by_year = []
    for (year, month), part in df.groupby(["order_year", "order_month"], observed=True):
        ym_rev = float(part["revenue"].sum())
        ym_profit = float(part["profit_net"].sum())
        months_by_year.append(
            {
                "period": f"{int(year)}-{int(month):02d}",
                "orders": int(len(part)),
                "net_sales": r2(ym_rev),
                "profit": r2(ym_profit),
                "avg_transaction_margin_pct": r2(part["margin_net"].mean()),
                "aggregate_margin_pct": r2(ym_profit / ym_rev * 100),
            }
        )
    months_by_year.sort(key=lambda row: row["period"])

    # --- combined aggregates for the global filter (Q1=B) ----------------------------
    # period (YYYY-MM) x dimension, so a filtered view is always a sum of compatible rows.
    cubes: dict[str, list[dict]] = {}
    cube_totals: dict[str, dict] = {}
    filter_keys = {key for _, key in FILTER_CUBE_DEFS}
    for column, key in CUBE_DEFS:
        rows, totals = build_cube(df, column, key, with_customers=key in filter_keys)
        cubes[key] = rows
        cube_totals[key] = totals

    # mvp-5: all four combinable filters (month range, segment, sales_channel, order_status) share
    # one cube; the single-dimension cubes are its marginals and are verified against it below.
    combined_rows, combined_totals = build_combined_cube(df)

    # --- time dimensions (Q3=B) ------------------------------------------------------
    quarters = []
    for quarter in range(1, 5):
        part = df[df["order_quarter"] == quarter]
        measures = build_measures(part)
        quarters.append(
            {
                "quarter": f"Q{quarter}",
                "orders": measures["orders"],
                "net_sales": r2(measures["net_sales"]),
                "profit": r2(measures["profit"]),
                "avg_transaction_margin_pct": r2(measures["avg_transaction_margin_pct"]),
                "aggregate_margin_pct": r2(measures["aggregate_margin_pct"]),
            }
        )

    year_quarters = []
    for (year, quarter), part in df.groupby(["order_year", "order_quarter"], observed=True):
        measures = build_measures(part)
        year_quarters.append(
            {
                "period": f"{int(year)}-Q{int(quarter)}",
                "year": int(year),
                "quarter": f"Q{int(quarter)}",
                "orders": measures["orders"],
                "net_sales": r2(measures["net_sales"]),
                "profit": r2(measures["profit"]),
                "avg_transaction_margin_pct": r2(measures["avg_transaction_margin_pct"]),
                "aggregate_margin_pct": r2(measures["aggregate_margin_pct"]),
            }
        )
    year_quarters.sort(key=lambda row: row["period"])

    day_types = []
    for is_weekend, label in ((False, "Weekday"), (True, "Weekend")):
        part = df[df["is_weekend"] == is_weekend]
        measures = build_measures(part)
        day_types.append(
            {
                "day_type": label,
                "orders": measures["orders"],
                "order_share_pct": r2(measures["orders"] / orders * 100),
                "net_sales": r2(measures["net_sales"]),
                "profit": r2(measures["profit"]),
                "avg_transaction_margin_pct": r2(measures["avg_transaction_margin_pct"]),
                "aggregate_margin_pct": r2(measures["aggregate_margin_pct"]),
            }
        )

    delivery_rows = []
    for value, part in df.groupby("delivery_status", observed=True):
        delivery_rows.append(
            {
                "value": str(value),
                "orders": int(len(part)),
                "share_pct": r2(len(part) / orders * 100),
            }
        )
    delivery_rows.sort(key=lambda row: row["orders"], reverse=True)

    # --- derived totals (Q5=A: every business formula stays in Python) ---------------
    gross_total = float(df["gross_sales"].sum())
    discount_total = float(df["discount_amount"].sum())
    derived = {
        "profit_per_customer": r2(profit / customers_active),
        "orders_per_customer": r3(orders / customers_active),
        "discount_rate_weighted_pct": r2(discount_total / gross_total * 100),
        "discount_rate_row_mean_pct": r2(df["discount_rate"].mean()),
        "discount_rate_row_median_pct": r2(df["discount_rate"].median()),
        "discount_rate_row_max_pct": r2(df["discount_rate"].max()),
        "loss_orders": loss_orders,
        "total_loss": r2(total_loss),
    }

    # --- annual ----------------------------------------------------------------------
    years = []
    for year, part in df.groupby("order_year", observed=True):
        y_rev = float(part["revenue"].sum())
        y_profit = float(part["profit_net"].sum())
        years.append(
            {
                "year": int(year),
                "orders": int(len(part)),
                "customers": int(part["customer_id"].nunique()),
                "net_sales": r2(y_rev),
                "profit": r2(y_profit),
                "avg_transaction_margin_pct": r2(part["margin_net"].mean()),
                "aggregate_margin_pct": r2(y_profit / y_rev * 100),
            }
        )
    years.sort(key=lambda row: row["year"])
    for index, row in enumerate(years):
        if index == 0:
            row["revenue_yoy_pct"] = None
            row["profit_yoy_pct"] = None
            continue
        prev = years[index - 1]
        row["revenue_yoy_pct"] = r2((row["net_sales"] - prev["net_sales"]) / prev["net_sales"] * 100)
        row["profit_yoy_pct"] = r2((row["profit"] - prev["profit"]) / prev["profit"] * 100)

    # --- reconciliation --------------------------------------------------------------
    nov_dec = df[df["order_month"].isin([11, 12])]
    jan_oct = df[~df["order_month"].isin([11, 12])]
    nov_dec_margin = float(nov_dec["margin_net"].mean())
    jan_oct_aggregate = float(jan_oct["profit_net"].sum() / jan_oct["revenue"].sum() * 100)

    checks = [
        ("revenue", revenue),
        ("profit", profit),
        ("gross_sales", float(df["gross_sales"].sum())),
        ("discount_amount", float(df["discount_amount"].sum())),
        ("product_cost", float(df["product_cost"].sum())),
        ("tax_collected", float(df["tax_amount"].sum())),
        ("shipping_billed", float(df["shipping_cost"].sum())),
        ("as_stored_net_sales", float(df["net_sales"].sum())),
        ("as_stored_profit", float(df["profit"].sum())),
        ("orders", orders),
        ("aggregate_margin_pct", aggregate_margin),
        ("avg_transaction_margin_pct", avg_txn_margin),
        ("anomaly_orders", int(df["is_anomaly"].sum())),
        ("anomaly_revenue", anom_revenue),
        ("anomaly_profit", anom_profit),
        ("anomaly_aggregate_margin_pct", anom_aggregate_margin),
        ("counterfactual_gap_avg_txn_margin", gap_avg_txn),
        ("counterfactual_gap_aggregate_margin", gap_aggregate),
        ("loss_orders", loss_orders),
        ("total_loss", total_loss),
        ("nov_dec_avg_transaction_margin_pct", nov_dec_margin),
        ("jan_oct_aggregate_margin_pct", jan_oct_aggregate),
        ("return_rate_pct", return_orders / orders * 100),
        ("customer_level_repeat_rate_pct", repeat_rate),
        ("high_margin_share_pct", high_margin_share),
        # mvp-3 (Q5=A)
        ("profit_per_customer", derived["profit_per_customer"]),
        ("orders_per_customer", derived["orders_per_customer"]),
        ("discount_rate_weighted_pct", derived["discount_rate_weighted_pct"]),
        ("discount_rate_row_mean_pct", derived["discount_rate_row_mean_pct"]),
        ("discount_rate_row_median_pct", derived["discount_rate_row_median_pct"]),
        ("discount_rate_row_max_pct", derived["discount_rate_row_max_pct"]),
        ("weekend_order_share_pct", day_types[1]["order_share_pct"]),
    ]

    failures: list[str] = []
    lines: list[str] = []
    for name, actual in checks:
        expected, tol = ANCHORS[name]
        ok = abs(actual - expected) <= tol
        lines.append(
            f"  [{'OK ' if ok else 'FAIL'}] {name:<38} actual={actual:>18,.2f} "
            f"expected={expected:>18,.2f} tol={tol}"
        )
        if not ok:
            failures.append(name)

    for bracket in brackets:
        avg_expected, agg_expected = BRACKET_ANCHORS[bracket["bracket"]]
        for key, expected in (
            ("avg_transaction_margin_pct", avg_expected),
            ("aggregate_margin_pct", agg_expected),
        ):
            actual = bracket[key]
            ok = abs(actual - expected) <= PCT_TOL
            lines.append(
                f"  [{'OK ' if ok else 'FAIL'}] bracket {bracket['bracket']:<18} {key:<28} "
                f"actual={actual:>10,.2f} expected={expected:>10,.2f}"
            )
            if not ok:
                failures.append(f"bracket::{bracket['bracket']}::{key}")

    for segment in segments:
        share_expected, agg_expected = SEGMENT_ANCHORS[segment["segment"]]
        for key, expected in (
            ("profit_share_pct", share_expected),
            ("aggregate_margin_pct", agg_expected),
        ):
            actual = segment[key]
            ok = abs(actual - expected) <= PCT_TOL
            lines.append(
                f"  [{'OK ' if ok else 'FAIL'}] segment {segment['segment']:<10} {key:<24} "
                f"actual={actual:>10,.2f} expected={expected:>10,.2f}"
            )
            if not ok:
                failures.append(f"segment::{segment['segment']}::{key}")

    for row in years:
        agg_expected, rev_yoy_expected = ANNUAL_ANCHORS[row["year"]]
        actual = row["aggregate_margin_pct"]
        ok = abs(actual - agg_expected) <= PCT_TOL
        lines.append(
            f"  [{'OK ' if ok else 'FAIL'}] year {row['year']} aggregate_margin_pct        "
            f"actual={actual:>10,.2f} expected={agg_expected:>10,.2f}"
        )
        if not ok:
            failures.append(f"year::{row['year']}::aggregate_margin_pct")
        if rev_yoy_expected is not None:
            actual_yoy = row["revenue_yoy_pct"]
            ok_yoy = abs(actual_yoy - rev_yoy_expected) <= PCT_TOL
            lines.append(
                f"  [{'OK ' if ok_yoy else 'FAIL'}] year {row['year']} revenue_yoy_pct           "
                f"actual={actual_yoy:>10,.2f} expected={rev_yoy_expected:>10,.2f}"
            )
            if not ok_yoy:
                failures.append(f"year::{row['year']}::revenue_yoy_pct")

    for row in quarters:
        expected = QUARTER_ANCHORS[row["quarter"]]
        actual = row["aggregate_margin_pct"]
        ok = abs(actual - expected) <= PCT_TOL
        lines.append(
            f"  [{'OK ' if ok else 'FAIL'}] quarter {row['quarter']:<4} aggregate_margin_pct      "
            f"actual={actual:>10,.2f} expected={expected:>10,.2f}"
        )
        if not ok:
            failures.append(f"quarter::{row['quarter']}::aggregate_margin_pct")

    for row in day_types:
        orders_expected, margin_expected = DAY_TYPE_ANCHORS[row["day_type"]]
        for key, expected, tol in (
            ("orders", orders_expected, COUNT_TOL),
            ("aggregate_margin_pct", margin_expected, PCT_TOL),
        ):
            actual = row[key]
            ok = abs(actual - expected) <= tol
            lines.append(
                f"  [{'OK ' if ok else 'FAIL'}] day_type {row['day_type']:<8} {key:<22} "
                f"actual={actual:>10,.2f} expected={expected:>10,.2f}"
            )
            if not ok:
                failures.append(f"day_type::{row['day_type']}::{key}")

    for row in delivery_rows:
        orders_expected, share_expected = DELIVERY_ANCHORS[row["value"]]
        for key, expected in (("orders", orders_expected), ("share_pct", share_expected)):
            actual = row[key]
            ok = abs(actual - expected) <= (COUNT_TOL if key == "orders" else PCT_TOL)
            lines.append(
                f"  [{'OK ' if ok else 'FAIL'}] delivery {row['value']:<9} {key:<14} "
                f"actual={actual:>10,.2f} expected={expected:>10,.2f}"
            )
            if not ok:
                failures.append(f"delivery::{row['value']}::{key}")

    for key, totals in cube_totals.items():
        for name, expected, tol in (
            ("orders", orders, COUNT_TOL),
            ("net_sales", revenue, MONEY_TOL),
            ("profit", profit, MONEY_TOL),
            ("gross_sales", gross, MONEY_TOL),
            ("discount_amount", discount, MONEY_TOL),
        ):
            actual = totals[name]
            ok = abs(actual - expected) <= tol
            lines.append(
                f"  [{'OK ' if ok else 'FAIL'}] cube {key:<19} {name:<16} "
                f"actual={actual:>18,.2f} expected={expected:>18,.2f}"
            )
            if not ok:
                failures.append(f"cube::{key}::{name}")

    # mvp-4: each panel cube must also reproduce the global per-value order counts that the
    # existing panels (time-dimensions.json, discount-brackets.json, anomaly-by-dimension.json)
    # already display, so the filtered and unfiltered views cannot disagree.
    panel_value_orders: dict[str, dict[str, int]] = {
        "day_type": {str(row["day_type"]): row["orders"] for row in day_types},
        "delivery_status": {str(row["value"]): row["orders"] for row in delivery_rows},
        "discount_bracket": {str(row["bracket"]): row["orders"] for row in brackets},
        "region": {str(row["value"]): row["orders"] for row in dimensions["region"]},
    }
    for _, key in PANEL_CUBE_DEFS:
        per_value: dict[str, int] = {}
        for row in cubes[key]:
            per_value[row[key]] = per_value.get(row[key], 0) + row["orders"]
        for value, expected in panel_value_orders[key].items():
            actual = per_value.get(value, 0)
            ok = abs(actual - expected) <= COUNT_TOL
            lines.append(
                f"  [{'OK ' if ok else 'FAIL'}] panel {key:<17} {value:<12} orders        "
                f"actual={actual:>12,.0f} expected={expected:>12,.0f}"
            )
            if not ok:
                failures.append(f"panel::{key}::{value}::orders")

    # mvp-5: the combined cube must reproduce the official totals and every marginal
    # (period x one dimension) of the single-dimension cubes and the monthly rows, so the
    # combinable global filters can never disagree with the trends or the panel cubes.
    for name, expected, tol in (
        ("orders", orders, COUNT_TOL),
        ("net_sales", revenue, MONEY_TOL),
        ("profit", profit, MONEY_TOL),
        ("gross_sales", gross, MONEY_TOL),
        ("discount_amount", discount, MONEY_TOL),
    ):
        actual = combined_totals[name]
        ok = abs(actual - expected) <= tol
        lines.append(
            f"  [{'OK ' if ok else 'FAIL'}] cube combined           {name:<16} "
            f"actual={actual:>18,.2f} expected={expected:>18,.2f}"
        )
        if not ok:
            failures.append(f"cube::combined::{name}")

    # mvp-6: the D7 identity `net_sales = gross_sales - discount_amount` must hold per cube row
    # (rounded to cents) and globally, so the two new additive measures stay auditable.
    identity_mismatch = 0
    for rows in (combined_rows, *cubes.values()):
        for row in rows:
            if abs(row["net_sales"] - (row["gross_sales"] - row["discount_amount"])) > 0.03:
                identity_mismatch += 1
    identity_gap = abs((gross - discount) - revenue)
    ok = identity_mismatch == 0 and identity_gap <= MONEY_TOL
    lines.append(
        f"  [{'OK ' if ok else 'FAIL'}] D7 identity net=gross-discount  "
        f"row_mismatch={identity_mismatch} global_gap={identity_gap:.4f}"
    )
    if not ok:
        failures.append("cubes::d7_identity")

    def combined_marginal(keys: tuple[str, ...]) -> dict[tuple, dict]:
        buckets: dict[tuple, dict] = {}
        for row in combined_rows:
            bucket = buckets.setdefault(
                tuple(row[key] for key in keys),
                {
                    "orders": 0,
                    "net_sales": 0.0,
                    "profit": 0.0,
                    "gross_sales": 0.0,
                    "discount_amount": 0.0,
                },
            )
            bucket["orders"] += row["orders"]
            bucket["net_sales"] += row["net_sales"]
            bucket["profit"] += row["profit"]
            bucket["gross_sales"] += row["gross_sales"]
            bucket["discount_amount"] += row["discount_amount"]
        return buckets

    # The month rows (months_by_year) carry only orders/net_sales/profit, so the month marginal
    # compares those three; the three single-dimension cubes carry all five additive measures.
    marginal_specs = (
        (("period",), {(row["period"],): row for row in months_by_year}, "month"),
        (
            ("period", "segment"),
            {(row["period"], str(row["segment"])): row for row in cubes["segment"]},
            "segment",
        ),
        (
            ("period", "sales_channel"),
            {(row["period"], str(row["sales_channel"])): row for row in cubes["sales_channel"]},
            "sales_channel",
        ),
        (
            ("period", "order_status"),
            {(row["period"], str(row["order_status"])): row for row in cubes["order_status"]},
            "order_status",
        ),
    )
    for keys, expected_rows, label in marginal_specs:
        buckets = combined_marginal(keys)
        missing = set(expected_rows) - set(buckets)
        extra = set(buckets) - set(expected_rows)
        if missing or extra:
            lines.append(
                f"  [FAIL] combined marginal {label:<13} key mismatch "
                f"missing={len(missing)} extra={len(extra)}"
            )
            failures.append(f"combined::{label}::keys")
            continue
        money_fields = ["net_sales", "profit"]
        if label != "month":
            money_fields += ["gross_sales", "discount_amount"]
        order_mismatch = 0
        worst_money_gap = 0.0
        for key, row in expected_rows.items():
            bucket = buckets[key]
            if bucket["orders"] != int(row["orders"]):
                order_mismatch += 1
            for field in money_fields:
                worst_money_gap = max(
                    worst_money_gap,
                    abs(bucket[field] - float(row[field])),
                )
        ok = order_mismatch == 0 and worst_money_gap <= MONEY_TOL
        lines.append(
            f"  [{'OK ' if ok else 'FAIL'}] combined marginal {label:<13} cells={len(expected_rows):<5} "
            f"order_mismatch={order_mismatch} worst_money_gap={worst_money_gap:.4f}"
        )
        if not ok:
            failures.append(f"combined::{label}")

    print("Reconciliation against verified anchors (basis C / D7):")
    print("\n".join(lines))

    if failures:
        raise ReconciliationError("Reconciliation failed for: " + ", ".join(failures))

    # --- payloads --------------------------------------------------------------------
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    summary = {
        "definitions_version": DEFINITIONS_VERSION,
        "generated_at": generated_at,
        "source_rows": orders,
        "date_min": df["order_date"].min().strftime("%Y-%m-%d"),
        "date_max": df["order_date"].max().strftime("%Y-%m-%d"),
        "net_sales_basis": "merchandise_gross_minus_discount",
        "totals": {
            "gross_sales": r2(df["gross_sales"].sum()),
            "discount_amount": r2(df["discount_amount"].sum()),
            "net_sales": r2(revenue),
            "product_cost": r2(df["product_cost"].sum()),
            "profit": r2(profit),
            "orders": orders,
            "customers_active": customers_active,
            "customers_master": customers_master,
            "products_used": products_used,
        },
        "margins": {
            "aggregate_margin_pct": r2(aggregate_margin),
            "avg_transaction_margin_pct": r2(avg_txn_margin),
            "primary_basis": "aggregate",
            "net_sales_basis": "merchandise_gross_minus_discount",
        },
        "pass_through": {
            "note": PASS_THROUGH_NOTE,
            "tax_collected": r2(df["tax_amount"].sum()),
            "shipping_billed": r2(df["shipping_cost"].sum()),
        },
        "as_stored": {
            "note": (
                "Nilai apa adanya dari file sumber (net_sales = gross - discount + tax + "
                "shipping; profit = net_sales - product_cost - shipping_cost). Hanya untuk "
                "rekonsiliasi, bukan KPI."
            ),
            "net_sales": r2(df["net_sales"].sum()),
            "profit": r2(df["profit"].sum()),
            "aggregate_margin_pct": r2(df["profit"].sum() / df["net_sales"].sum() * 100),
        },
        "kpis": {
            "avg_order_value": r2(revenue / orders),
            "mean_rating": r3(df["customer_rating"].mean()),
            "repeat_customer_rate_customer_level_pct": r2(repeat_rate),
            "high_margin_transaction_share_pct": r2(high_margin_share),
        },
        # mvp-3 (Q5=A): validated metrics that used to be missing from the payload. Every
        # formula stays here; the frontend only displays these values.
        "derived": {
            "note": "Semua rumus bisnis dihitung di skrip ini, bukan di frontend.",
            **derived,
            "definitions": DERIVED_NOTES,
        },
        "status_mix": {
            "completed": int(status_counts.get("Completed", 0)),
            "pending": int(status_counts.get("Pending", 0)),
            "returned": return_orders,
            "cancelled": cancelled_orders,
        },
        "status_margins": status_margins,
        "return_rate_pct": r2(return_orders / orders * 100),
        "cancellation_rate_pct": r2(cancelled_orders / orders * 100),
        "undelivered_rate_pct": r2(undelivered / orders * 100),
    }

    monthly_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "months": months,
        "months_by_year": months_by_year,
    }

    filter_cubes_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "note": (
            "Kubus gabungan period (YYYY-MM) x segment x sales_channel x order_status adalah "
            "sumber semua kombinasi filter global; kubus filter tunggal adalah marginalnya. Filter "
            "bekerja dengan menjumlahkan baris yang dipilih; margin dihitung ulang berbobot dari "
            "jumlah profit dan jumlah net_sales, dan tingkat diskon terbobot dari jumlah discount "
            "dibagi jumlah gross_sales (mvp-6)."
        ),
        "dimensions": [key for _, key in FILTER_CUBE_DEFS],
        "combined_dimensions": [key for _, key in COMBINED_CUBE_DEFS],
        "panel_dimensions": [key for _, key in PANEL_CUBE_DEFS],
        "non_additive_measures": ["customers", "avg_transaction_margin_pct"],
        "notes": FILTER_CUBE_NOTES,
        "cubes": {COMBINED_CUBE_KEY: combined_rows, **cubes},
    }

    time_dimensions_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "quarters": quarters,
        "year_quarters": year_quarters,
        "day_types": day_types,
        "delivery_status": delivery_rows,
        "notes": TIME_DIMENSION_NOTES,
    }

    brackets_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "brackets": brackets,
    }

    segment_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "segments": segments,
    }

    anomaly_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "rule": {
            "percentile_revenue": 0.75,
            "percentile_margin": 0.25,
            "operator": "inclusive",
            "revenue_threshold": r2(revenue_threshold),
            "margin_threshold_pct": r2(margin_threshold),
            "thresholds_scope": "global",
            "revenue_column": "net_sales (basis C)",
            "margin_column": "profit / net_sales (basis C)",
        },
        "summary": {
            "orders": int(df["is_anomaly"].sum()),
            "order_share_pct": r2(df["is_anomaly"].mean() * 100),
            "net_sales": r2(anom_revenue),
            "profit": r2(anom_profit),
            "avg_transaction_margin_pct": r2(anom_avg_txn_margin),
            "aggregate_margin_pct": r2(anom_aggregate_margin),
            "counterfactual_gap_avg_txn_margin": r2(gap_avg_txn),
            "counterfactual_gap_aggregate_margin": r2(gap_aggregate),
            "assumptions": COUNTERFACTUAL_ASSUMPTIONS,
        },
        "dimensions": dimensions,
    }

    annual_payload = {
        "definitions_version": DEFINITIONS_VERSION,
        "years": years,
    }

    metadata = {
        "dataset_version": "ecommerce-sales-2021-2025",
        "source_files": [SALES_FILE, CUSTOMERS_FILE, PRODUCTS_FILE],
        "excluded_source_files": ["order_items.csv", "dataset_statistics.csv"],
        "row_count": orders,
        "date_range": {"min": summary["date_min"], "max": summary["date_max"]},
        "definitions_version": DEFINITIONS_VERSION,
        "decisions": DECISIONS,
        "derived_columns": {
            "net_sales": "gross_sales - discount_amount",
            "profit": "net_sales - product_cost",
            "profit_margin_pct": "profit / net_sales * 100",
            "discount_rate": "discount_amount / gross_sales * 100 (0 when gross_sales = 0)",
            "order_quarter": "order_date quarter (1-4)",
            "is_weekend": "order_date weekday index >= 5",
            "day_type": "is_weekend ? 'Weekend' : 'Weekday'",
            "period": "order_date as YYYY-MM",
        },
        "generated_at": generated_at,
        "tolerances": {"money_abs": MONEY_TOL, "pct_abs": PCT_TOL, "count_abs": COUNT_TOL},
    }

    payloads = {
        "dashboard-summary.json": summary,
        "monthly-performance.json": monthly_payload,
        "discount-brackets.json": brackets_payload,
        "segment-performance.json": segment_payload,
        "anomaly-by-dimension.json": anomaly_payload,
        "annual-performance.json": annual_payload,
        "time-dimensions.json": time_dimensions_payload,
        "filter-cubes.json": filter_cubes_payload,
        "metadata.json": metadata,
    }

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    for name, payload in payloads.items():
        text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        for target_dir in (PROCESSED_DIR, PUBLIC_DATA_DIR):
            (target_dir / name).write_text(text, encoding="utf-8")

    print()
    print(f"Wrote {len(payloads)} files to {PROCESSED_DIR} and {PUBLIC_DATA_DIR}")
    print(
        f"  net_sales={revenue:,.2f}  profit={profit:,.2f}  "
        f"aggregate_margin={aggregate_margin:.2f}%"
    )
    print(
        f"  pass-through: tax={df['tax_amount'].sum():,.2f}  "
        f"shipping={df['shipping_cost'].sum():,.2f}"
    )


if __name__ == "__main__":
    try:
        main()
    except ReconciliationError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        print("No output files were written.", file=sys.stderr)
        sys.exit(1)
