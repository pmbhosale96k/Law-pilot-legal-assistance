import os
import pickle
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from datetime import datetime
import re

# ------------------- Load environment variables -------------------
load_dotenv()

# ------------------- Flask app setup -------------------
app = Flask(__name__) # Corrected app name to __name__
app.secret_key = os.getenv("FLASK_SECRET_KEY", "defaultsecret")
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit
app.config['SESSION_COOKIE_NAME'] = 'lawpilot_session'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # True only if HTTPS

CORS(app)

# ------------------- Load ML model & connect MongoDB -------------------
try:
    with open("multilabel_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)
    with open("multilabel_binarizer.pkl", "rb") as f:
        multilabel_binarizer = pickle.load(f)

    client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
    db = client["lawpilot"]
    users_collection = db["users"]
    lawyers_collection = db["lawyers"]
    bns_collection = db["bnssections"]
    history_cases = db["historycases"]
    # 💡 NEW COLLECTION: For lawyer connection requests
    lawyer_requests_collection = db["lawyerrequests"] 

    client.admin.command("ping")
    print("✅ Model and MongoDB connected successfully!")

except Exception as e:
    print(f"❌ Error loading models or connecting to MongoDB: {e}")
    model = vectorizer = multilabel_binarizer = None
    users_collection = bns_collection = None
    lawyer_requests_collection = None # Ensure it's set to None on failure


# ------------------- Routes -------------------
@app.route('/')
def main():
    if 'username' not in session:
        return redirect(url_for('login'))

    # Fetch user history cases from MongoDB
    user_email = session['email']
    cases_cursor = history_cases.find({"email": user_email}).sort("timestamp", -1)
    cases = []

    for idx, c in enumerate(cases_cursor, start=1):
        # Join all predicted sections into a single string
        predicted_sections = ", ".join(c.get("predicted_sections", [])) or "No prediction"

        # Optional: Include timestamp formatted nicely
        timestamp = c.get("timestamp")
        timestamp_str = timestamp.strftime("%d/%m/%Y, %I:%M %p") if timestamp else "Unknown time"

        cases.append({
            "id": idx,
            "title": f"{timestamp_str} - {c.get('query', 'N/A')}",
            "status": predicted_sections
        })

    return render_template(
        'dashboard.html',
        user_name=session.get('username', 'User'),
        user_type=session.get('user_type', 'user'),
        cases=cases,
    )


# ------------------- Signup for Users -------------------
@app.route('/signup', methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        fullname = request.form.get("fullname")
        email = request.form.get("email")
        password = request.form.get("password")

        if not fullname or not email or not password:
            return render_template('signuppy.html', error="Please fill in all fields")

        if users_collection.find_one({"email": email}):
            return render_template('signuppy.html', error="Email already registered")

        hashed_password = generate_password_hash(password)
        users_collection.insert_one({
            "fullname": fullname,
            "email": email,
            "password": hashed_password
        })

        return redirect(url_for('login'))

    return render_template('signuppy.html')


# ------------------- Login for Users -------------------
@app.route('/login', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")

        if not email or not password:
            return render_template('indexpy.html', error="Please enter email and password")

        user = users_collection.find_one({"email": email})

        if not user:
            return render_template('indexpy.html', error="Email does not exist")

        if not check_password_hash(user["password"], password):
            return render_template('indexpy.html', error="Incorrect password")

        session.clear()
        session['username'] = user["fullname"]
        session['email'] = user["email"]
        session['user_type'] = "user"  # <-- add this

        return redirect(url_for('main'))

    return render_template('indexpy.html')


# ------------------- Lawyer Signup -------------------
@app.route("/lawyer/signup", methods=["GET", "POST"])
def lawyer_signup():
    if request.method == "POST":
        name = request.form.get("name")
        username = request.form.get("username")
        email = request.form.get("email") # 💡 CRITICAL: Fetch the email input
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        expertise = request.form.get("expertise")

        # 💡 Updated Validation
        if not name or not username or not password or not confirm_password or not expertise or not email: 
            return render_template("lawyer_signup.html", error="Please fill in all fields")

        if password != confirm_password:
            return render_template("lawyer_signup.html", error="Passwords do not match")

        # Check for unique username and email (optional: check both)
        if lawyers_collection.find_one({"username": username}) or lawyers_collection.find_one({"email": email}):
             return render_template("lawyer_signup.html", error="Username or Email already exists")


        hashed_password = generate_password_hash(password)

        # 💡 CRITICAL: Save the email in the lawyers collection
        lawyers_collection.insert_one({
            "name": name,
            "username": username,
            "email": email, 
            "password": hashed_password,
            "expertise": expertise
        })

        return redirect(url_for("lawyer_login"))

    return render_template("lawyer_signup.html")


# ------------------- Lawyer Login -------------------
@app.route("/lawyer/login", methods=["GET", "POST"])
def lawyer_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if not username or not password:
            return render_template("lawyer_login.html", error="Please enter username and password")

        lawyer = lawyers_collection.find_one({"username": username})
        if not lawyer:
            return render_template("lawyer_login.html", error="Username does not exist")

        if not check_password_hash(lawyer["password"], password):
            return render_template("lawyer_login.html", error="Incorrect password")

        session.clear()
        session["lawyer_username"] = lawyer["username"]
        session["lawyer_name"] = lawyer["name"]
        session["lawyer_expertise"] = lawyer["expertise"]
        session["lawyer_email"] = lawyer.get("email") # 💡 CRITICAL: Save the lawyer's email to the session

        return redirect(url_for("lawyer_dashboard"))

    return render_template("lawyer_login.html")


# ------------------- API to Send Connection Request to Lawyer -------------------
@app.route('/api/request-connect', methods=['POST'])
def api_request_connect():
    # 1. Check User Session
    if 'email' not in session or session.get('user_type') != 'user':
        return jsonify({"error": "Unauthorized. Please log in as a user."}), 401

    data = request.get_json()
    lawyer_email = data.get('lawyer_email')
    lawyer_name = data.get('lawyer_name')
    user_email = session['email']
    user_name = session['username']

    if not lawyer_email:
        return jsonify({"error": "No lawyer email provided"}), 400

    # 2. Fetch the user's LATEST case query for the lawyer's context
    latest_case = history_cases.find_one(
        {"email": user_email},
        sort=[("timestamp", -1)]
    )

    case_summary = "No previous case history."
    if latest_case and latest_case.get('query'):
        # Take the user's query and the predicted sections
        query = latest_case['query']
        sections = ", ".join(latest_case.get("predicted_sections", []))
        # Limit query to 100 chars for summary
        case_summary = f"Latest Query: {query[:100]}... | Predicted Areas: {sections}"


    # 3. Save the Request to the new collection
    try:
        lawyer_requests_collection.insert_one({
            "lawyer_email": lawyer_email,
            "lawyer_name": lawyer_name,
            "user_email": user_email,
            "user_name": user_name,
            "request_date": datetime.now(),
            "case_summary": case_summary,
            "status": "pending"
        })
    except Exception as e:
        print(f"Error saving request to DB: {e}")
        return jsonify({"error": "Failed to save request to database."}), 500

    return jsonify({"message": "Connection request sent successfully!"}), 200


# ------------------- Lawyer Dashboard -------------------
@app.route("/lawyer/dashboard")
def lawyer_dashboard():
    if "lawyer_username" not in session:
        return redirect(url_for("lawyer_login"))
        
    lawyer_email = session.get("lawyer_email")
    
    pending_requests = []
    if lawyer_email and lawyer_requests_collection:
        # Fetch pending requests for this lawyer using their email
        requests_cursor = lawyer_requests_collection.find({"lawyer_email": lawyer_email, "status": "pending"}).sort("request_date", -1)
        for req in requests_cursor:
            req['request_date_str'] = req['request_date'].strftime("%b %d, %Y")
            # We need the user's name, case summary, and date
            pending_requests.append({
                'id': str(req['_id']),
                'user_name': req['user_name'],
                'case_type': req['case_summary'], # Using the case summary for the 'case_type' column
                'request_date': req['request_date_str']
            })

    return render_template("lawyer_dashboard.html",
                           lawyer_name=session["lawyer_name"],
                           expertise=session["lawyer_expertise"],
                           # Pass the dynamic requests data to the template
                           pending_requests=pending_requests)


# ------------------- Find Lawyers -------------------
@app.route('/find-lawyer')
def find_lawyer():
    if 'username' not in session:
        return redirect(url_for('login'))

    lawyers = []
    try:
        # Fetches name, expertise, and email for display
        lawyers = list(lawyers_collection.find({}, {"_id": 0, "name": 1, "expertise": 1, "email": 1}))
        print(f"✅ Found {len(lawyers)} lawyers.") 
    except Exception as e:
        print(f"❌ Error fetching lawyers: {e}")

    return render_template('find_lawyer.html', lawyers=lawyers) 

# ------------------- API to Fetch Lawyers (for JS/Search) -------------------
@app.route('/api/lawyers', methods=['GET'])
def api_get_lawyers():
    # Check for login status (optional but recommended for an API)
    if 'username' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    search_query = request.args.get('query', '').strip()
    
    # Base query
    mongo_query = {} 

    if search_query:
        # Create a case-insensitive regex for searching name OR expertise
        regex = re.compile(re.escape(search_query), re.IGNORECASE)
        mongo_query = {
            "$or": [
                {"name": {"$regex": regex}},
                {"expertise": {"$regex": regex}}
            ]
        }
    
    lawyers = []
    try:
        # Fetch only necessary fields: name, expertise, email (excluding _id)
        lawyers = list(lawyers_collection.find(mongo_query, {"_id": 0, "name": 1, "expertise": 1, "email": 1}))
    except Exception as e:
        print(f"❌ Error fetching lawyers from API: {e}")
        return jsonify({"error": "Database error"}), 500

    # Return the list of lawyers as JSON
    return jsonify({"lawyers": lawyers})
# ------------------- Logout -------------------
@app.route('/logout', methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for('login'))


# ------------------- Chat using ML model (with history saving) -------------------
@app.route('/chat', methods=['POST'])
def chat():
    if model is None or vectorizer is None or multilabel_binarizer is None or bns_collection is None:
        return jsonify({'response': 'Error: Model or database not configured correctly.'}), 500

    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    try:
        # ✅ Predict BNS sections
        vectorized_message = vectorizer.transform([user_message])
        predicted_binary_matrix = model.predict(vectorized_message)
        predicted_section_codes = multilabel_binarizer.inverse_transform(predicted_binary_matrix)[0]

        if len(predicted_section_codes) == 0:
            ai_response = "तुमच्या परिस्थितीसाठी कोणतीही विशिष्ट कायदेशीर कलम सापडली नाहीत."
            predicted_summary = []
        else:
            predictions_html = []
            predicted_summary = []

            for sec_code in predicted_section_codes:
                match = re.match(r'(\d+)', sec_code)
                base_number = match.group(1) if match else sec_code

                regex = f"^BNS {base_number}"
                doc = bns_collection.find_one({"section": {"$regex": regex}})
                explanation = doc.get("explanation", "स्पष्टीकरण आढळले नाही.") if doc else "स्पष्टीकरण आढळले नाही."
                section_display = doc.get("section", sec_code) if doc else sec_code

                predictions_html.append(f"<b>कलम: {section_display}</b><br>{explanation}")
                predicted_summary.append(f"{section_display}: {explanation[:80]}...")

            ai_response = "<br><br>".join(predictions_html)

        # ✅ Save user query automatically to historycases
        if 'email' in session:
            history_cases.insert_one({
                "email": session['email'],
                "query": user_message,
                "predicted_sections": predicted_summary,
                "response": ai_response,
                "timestamp": datetime.now()
            })

    except Exception as e:
        print(f"An error occurred during prediction: {e}")
        ai_response = "क्षमस्व, तुमच्या विनंतीवर प्रक्रिया करताना एक त्रुटी आली."

    return jsonify({'response': ai_response})


# ------------------- Fetch user case history -------------------
@app.route('/history', methods=['GET'])
def history():
    if 'email' not in session:
        return jsonify({'history': []})

    user_email = session['email']
    cases = list(history_cases.find({"email": user_email}).sort("timestamp", -1))

    for c in cases:
        c['_id'] = str(c['_id'])
        c['timestamp'] = c['timestamp'].strftime("%Y-%m-%d %H:%M:%S")

    # Return in the same format JS expects
    history_data = []
    for c in cases:
        history_data.append({
            'query': c.get('query', 'N/A'),
            'response': c.get('response', 'N/A'),
            'timestamp': c['timestamp']
        })

    return jsonify({'history': history_data})


# ------------------- File Upload -------------------
@app.route('/upload', methods=["POST"])
def upload_files():
    if 'files' not in request.files:
        return redirect(request.url)

    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return redirect(request.url)

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'docx'}
    saved_files = []

    for file in files:
        if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            saved_files.append(filename)

    print(f"Uploaded {len(saved_files)} files.")
    return redirect(url_for('main'))


# ------------------- Run Flask -------------------
if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)