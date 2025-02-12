from flask import Flask, render_template, request, redirect, url_for, session, flash
import sqlite3
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

# Database helper functions
def get_db_connection():
    try:
        conn = sqlite3.connect('database.db')
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"Database connection error: {e}")
        return None
        # Configure static file serving
        app.static_folder = 'static'
        app.static_url_path = '/static'
def close_db(conn):
    if conn is not None:
        conn.close()

# Login decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Route handlers
@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            flash('Please fill in all fields')
            return render_template('login.html')
        
        conn = get_db_connection()
        if conn:
            try:
                user = conn.execute(
                    'SELECT * FROM users WHERE userEmail = ?', 
                    (email,)
                ).fetchone()
                
                if user and password == user['userPassword']:
                    session['user_id'] = user['refid']
                    session['username'] = user['userName']
                    return redirect(url_for('dashboard'))
                
                flash('Invalid email or password')
            except sqlite3.Error as e:
                flash('An error occurred. Please try again.')
                print(f"Database error: {e}")
            finally:
                close_db(conn)
        else:
            flash('Service temporarily unavailable')
            
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        mobile = request.form.get('mobile', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if not all([username, email, mobile, password, confirm_password]):
            flash('Please fill in all fields')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('register.html')

        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                
                # Check if email exists
                existing_email = cursor.execute(
                    'SELECT 1 FROM users WHERE userEmail = ?', 
                    (email,)
                ).fetchone()
                
                if existing_email:
                    flash('Email already registered')
                    return render_template('register.html')

                # Check if mobile number exists
                existing_mobile = cursor.execute(
                    'SELECT 1 FROM users WHERE userMobileNum = ?', 
                    (mobile,)
                ).fetchone()
                
                if existing_mobile:
                    flash('Mobile number already registered')
                    return render_template('register.html')

                # Insert new user
                cursor.execute('''
                    INSERT INTO users (userName, userEmail, userMobileNum, userPassword)
                    VALUES (?, ?, ?, ?)
                ''', (username, email, mobile, password))
                
                conn.commit()
                flash('Registration successful! Please login.')
                return redirect(url_for('login'))
                    
            except sqlite3.Error as e:
                flash('Registration failed. Please try again.')
                print(f"Database error: {e}")
            finally:
                close_db(conn)
        else:
            flash('Service temporarily unavailable')
            
    return render_template('register.html')

@app.route('/dashboard')
@login_required
def dashboard():
    conn = get_db_connection()
    if conn:
        try:
            # Get featured tours for carousel
            featured_tours = conn.execute(
                'SELECT * FROM tours WHERE featured = 1'
            ).fetchall()
            
            # Get tours by category
            categories = ['Beach', 'Mountain', 'Adventure', 'Cultural']
            tours_by_category = {}
            
            for category in categories:
                tours = conn.execute(
                    'SELECT * FROM tours WHERE category = ?',
                    (category,)
                ).fetchall()
                # Convert tours to list of dicts and ensure image_url exists
                processed_tours = []
                for tour in tours:
                    tour_dict = dict(tour)
                    processed_tours.append(tour_dict)
                tours_by_category[category] = processed_tours
            
            return render_template('index.html', 
                                username=session.get('username'),
                                featured_tours=featured_tours,
                                tours_by_category=tours_by_category)
        except sqlite3.Error as e:
            print(f"Database error: {e}")
        finally:
            close_db(conn)
    
    return render_template('index.html', 
                         username=session.get('username'),
                         error="Failed to load tours",
                         featured_tours=[],
                         tours_by_category={})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    error_message = "The page you're looking for doesn't exist."
    if 'user_id' in session:
        return render_template('index.html', 
                             error=error_message, 
                             username=session.get('username'),
                             featured_tours=[],
                             tours_by_category={})
    return render_template('login.html', error=error_message)

@app.errorhandler(500)
def internal_error(error):
    error_message = "Something went wrong! Please try again later."
    if 'user_id' in session:
        return render_template('index.html', 
                             error=error_message, 
                             username=session.get('username'),
                             featured_tours=[],
                             tours_by_category={})
    return render_template('login.html', error=error_message)

if __name__ == '__main__':
    app.run(debug=True)