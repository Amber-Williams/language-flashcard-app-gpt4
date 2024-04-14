import pandas as pd
import sqlite3

conn = sqlite3.connect(
    database="./../api/src/ricotta/services/local.db",
    isolation_level=None,
    detect_types=sqlite3.PARSE_COLNAMES
)
db_df = pd.read_sql_query("SELECT * FROM cards", conn)
db_df.to_csv('cards.csv', index=False)
db_df = pd.read_sql_query("SELECT * FROM incorrect_options", conn)
db_df.to_csv('incorrect_options.csv', index=False)
