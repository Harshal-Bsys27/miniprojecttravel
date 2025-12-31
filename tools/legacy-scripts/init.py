import sqlite3

def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()

    # Create users table with auto-incrementing refid
    c.execute('''
    CREATE TABLE IF NOT EXISTS users (
        refid INTEGER PRIMARY KEY AUTOINCREMENT,
        userName TEXT NOT NULL,
        userEmail TEXT NOT NULL UNIQUE,
        userMobileNum TEXT UNIQUE,
        userPassword TEXT NOT NULL
    )
    ''')

    # Insert test user
    try:
        c.execute('''
        INSERT INTO users (userName, userEmail, userMobileNum, userPassword)
        VALUES (?, ?, ?, ?)
        ''', ('Test User', 'test@example.com', '1234567890', 'password123'))
    except sqlite3.IntegrityError:
        print("Test user already exists")

    conn.commit()
    conn.close()
    print("Database initialized successfully!")

if __name__ == '__main__':
    init_db()