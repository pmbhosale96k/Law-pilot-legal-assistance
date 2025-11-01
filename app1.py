import os
import pickle
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# ------------------- Load environment variables -------------------
load_dotenv()

# ------------------- Flask app setup -------------------
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "defaultsecret")
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit

# Optional: cookie settings
# Ensure cookies work locally
app.config['SESSION_COOKIE_NAME'] = 'lawpilot_session'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # True only if using HTTPS

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
    # \aefwefwe ............
    lawyers_collection = db["lawyers"]     
    bns_collection = db["bnssections"]

    client.admin.command("ping")
    print("✅ Model and MongoDB connected successfully!")

except Exception as e:
    print(f"❌ Error loading models or connecting to MongoDB: {e}")
    model = vectorizer = multilabel_binarizer = None
    users_collection = bns_collection = None

# ------------------- Routes -------------------
@app.route('/')
def main():
    print("SESSION at / :", dict(session))
    if 'username' not in session:
        print("No session, redirecting to login")
        return redirect(url_for('login'))
    print("Session found, rendering dashboard for:", session['username'])
    return render_template('dashboard.html', username=session['username'])



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

# ------------------- Login for Users  -------------------
@app.route('/login', methods=["GET", "POST"])
def login():
    print("Login accessed. Method:", request.method)
    
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        print("POST Data:", email, password)

        if not email or not password:
            return render_template('indexpy.html', error="Please enter email and password")

        user = users_collection.find_one({"email": email})
        print("User from DB:", user)

        if not user:
            return render_template('indexpy.html', error="Email does not exist")

        if not check_password_hash(user["password"], password):
            return render_template('indexpy.html', error="Incorrect password")

        # Corrected session
        session.clear()  
        session['username'] = user["fullname"]
        session['email'] = user["email"]  # keep only this

        print("Session after login:", dict(session))
        return redirect(url_for('main'))

    return render_template('indexpy.html')

# ------------------- Lawyer Signup -------------------
@app.route("/lawyer/signup", methods=["GET", "POST"])
def lawyer_signup():
    if request.method == "POST":
        name = request.form.get("name")
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        expertise = request.form.get("expertise")

        if not name or not username or not password or not confirm_password or not expertise:
            return render_template("lawyer_signup.html", error="Please fill in all fields")

        if password != confirm_password:
            return render_template("lawyer_signup.html", error="Passwords do not match")

        if lawyers_collection.find_one({"username": username}):
            return render_template("lawyer_signup.html", error="Username already exists")

        hashed_password = generate_password_hash(password)

        lawyers_collection.insert_one({
            "name": name,
            "username": username,
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

        return redirect(url_for("lawyer_dashboard"))

    return render_template("lawyer_login.html")



# ------------------- Lawyer Dashboard -------------------
@app.route("/lawyer/dashboard")
def lawyer_dashboard():
    if "lawyer_username" not in session:
        return redirect(url_for("lawyer_login"))
    return render_template("lawyer_dashboard.html", 
                           lawyer_name=session["lawyer_name"], 
                           expertise=session["lawyer_expertise"])





# ------------------- Logout -------------------
@app.route('/logout', methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for('login'))

# ------------------- Chat using ML model -------------------
@app.route('/chat', methods=['POST'])
def chat():
    if model is None or vectorizer is None or multilabel_binarizer is None or bns_collection is None:
        return jsonify({'response': 'Error: The model or database is not configured correctly on the server.'}), 500

    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    try:
        vectorized_message = vectorizer.transform([user_message])
        predicted_binary_matrix = model.predict(vectorized_message)
        predicted_section_codes = multilabel_binarizer.inverse_transform(predicted_binary_matrix)[0]

        if len(predicted_section_codes) == 0:
            ai_response = "तुमच्या परिस्थितीसाठी कोणतीही विशिष्ट कायदेशीर कलम सापडली नाहीत."
        else:
            predictions_html = []
            import re
            for sec_code in predicted_section_codes:
                match = re.match(r'(\d+)', sec_code)
                base_number = match.group(1) if match else sec_code

                regex = f"^BNS {base_number}"  
                doc = bns_collection.find_one({"section": {"$regex": regex}})
                explanation = doc["explanation"] if doc and "explanation" in doc else "स्पष्टीकरण आढळले नाही."
                section_display = doc["section"] if doc and "section" in doc else sec_code

                predictions_html.append(f"<b>कलम: {section_display}</b><br>{explanation}")

            ai_response = "<br><br>".join(predictions_html)

    except Exception as e:
        print(f"An error occurred during prediction: {e}")
        ai_response = "क्षमस्व, तुमच्या विनंतीवर प्रक्रिया करताना एक त्रुटी आली."

    return jsonify({'response': ai_response})


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
if __name__ == "__main__":
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
