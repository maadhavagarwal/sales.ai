import sqlite3


def store_data(df):

    # Remove duplicate columns
    df = df.loc[:, ~df.columns.duplicated()]

    conn = sqlite3.connect("business_data.db")

    df.to_sql("transactions", conn, if_exists="replace", index=False)

    conn.close()