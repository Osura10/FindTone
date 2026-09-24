import os
import psycopg
from psycopg.rows import dict_row

def get_connection():
    db_uri = os.getenv("DATABASE_URI")
    if not db_uri:
        raise ValueError("DATABASE_URI is not set in environment.")
    return psycopg.connect(db_uri, row_factory=dict_row)

def fetch_one(sql: str, params: tuple | dict = None) -> dict | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()

def fetch_all(sql: str, params: tuple | dict = None) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
