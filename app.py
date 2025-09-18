# --- ML & DB IMPORTS ---
import pickle
import numpy as np
from pymongo import MongoClient
import os

# --- FLASK IMPORTS ---
from flask import Flask, render_template, request, redirect, url_for, jsonify

from werkzeug.utils import secure_filename

# --- Flask App Setup ---
app = Flask(__name__)
app.secret_key = "abc"
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB limit

# --- Load Model and Connect to MongoDB ---
try:
    # Load ML model files
    with open("multilabel_model.pkl", "rb") as f:
        model = pickle.load(f)
    with open("vectorizer.pkl", "rb") as f:
        vectorizer = pickle.load(f)
    with open("multilabel_binarizer.pkl", "rb") as f:
        multilabel_binarizer = pickle.load(f)

    # MongoDB connection
    client = MongoClient("mongodb://localhost:27017/")
    db = client["lawpilot"]
    collection = db["bnssections"]

    # Check DB connection
    client.admin.command('ping')
    print("✅ Model and MongoDB connected successfully!")

except Exception as e:
    print(f"❌ Error loading models or connecting to MongoDB: {e}")
    model = vectorizer = multilabel_binarizer = collection = None


# --- Routes ---

@app.route('/')
def main():
    """Landing page that shows dashboard."""
    return render_template('dashboard.html')


# --- LOGIN ROUTE (Supports POST) ---
@app.route('/login', methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # ✅ Replace this with real DB check later
        if username == "admin" and password == "1234":
            session['username'] = username    # <-- save username in session
            session['user_type'] = 'user'     # optional: save type/role
            return redirect(url_for("main"))
        else:
            return render_template('indexpy.html', error="Invalid username or password")

    return render_template('indexpy.html')


# --- SIGNUP ROUTE (Supports POST) ---
@app.route('/signup', methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        # ✅ Just redirect to login after signup for now
        return redirect(url_for("login"))

    return render_template('signuppy.html')  # <-- using signuppy.html


# --- CHAT ROUTE ---
@app.route('/chat', methods=['POST'])
def chat():
    if model is None or vectorizer is None or multilabel_binarizer is None or collection is None:
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
                # Extract only the starting digits, ignore any parentheses
                match = re.match(r'(\d+)', sec_code)
                base_number = match.group(1) if match else sec_code

                # Match any section that starts with this number
                regex = f"^BNS {base_number}"  

                doc = collection.find_one({"section": {"$regex": regex}})
                explanation = doc["explanation"] if doc and "explanation" in doc else "स्पष्टीकरण आढळले नाही."
                section_display = doc["section"] if doc and "section" in doc else sec_code

                predictions_html.append(f"<b>कलम: {section_display}</b><br>{explanation}")

            ai_response = "<br><br>".join(predictions_html)

    except Exception as e:
        print(f"An error occurred during prediction: {e}")
        ai_response = "क्षमस्व, तुमच्या विनंतीवर प्रक्रिया करताना एक त्रुटी आली."

    return jsonify({'response': ai_response})



# --- FILE UPLOAD ROUTE ---
@app.route('/upload', methods=['POST'])
def upload_files():
    """Handles file uploads."""
    if 'files' not in request.files:
        return redirect(request.url)

    files = request.files.getlist('files')

    if not files or files[0].filename == '':
        return redirect(request.url)

    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'docx'}

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    saved_files = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            saved_files.append(filename)

    print(f"Uploaded {len(saved_files)} files successfully.")
    return redirect(url_for('main'))

@app.route('/logout', methods=['POST'])
def logout():
    """
    Logs the user out by clearing the session and redirecting to login page.
    """
    from flask import session
    session.clear()                     # Clear all session data
    return redirect(url_for('login'))


# --- Run Flask App ---
if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True)
