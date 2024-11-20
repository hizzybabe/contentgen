from flask import Flask, request, jsonify, render_template, redirect, url_for
from dotenv import load_dotenv
import os
import google.generativeai as genai
from flask_login import LoginManager, current_user, login_required, login_user, logout_user, UserMixin
from oauthlib.oauth2 import WebApplicationClient
import requests
import json
from config import *
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Required for session management

# Add this after app initialization
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1)

# User session management setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# OAuth2 client setup
client = WebApplicationClient(GOOGLE_CLIENT_ID)

# Add this at the top of your file, after imports
users = {}  # In-memory storage for users

# User class
class User(UserMixin):
    def __init__(self, id_, name, email):
        self.id = id_
        self.name = name
        self.email = email
        self.generations_today = 0
        self.last_generation_date = None
        users[id_] = self

    def can_generate(self):
        from datetime import datetime, timedelta
        today = datetime.now().date()
        
        # Reset counter if it's a new day
        if self.last_generation_date and self.last_generation_date != today:
            self.generations_today = 0
            
        return self.generations_today < 15

    def increment_generations(self):
        from datetime import datetime
        self.generations_today += 1
        self.last_generation_date = datetime.now().date()

    @staticmethod
    def get(user_id):
        # Here you would typically get the user from a database
        # For this example, we'll just return None if no user is found
        try:
            return User(user_id, "User Name", "user@example.com")
        except Exception:
            return None

    def __repr__(self):
        return f"User(id={self.id})"

# Flask-Login helper to retrieve a user from our db
@login_manager.user_loader
def load_user(user_id):
    # Here you would typically load the user from your database
    # This is a simplified example
    return User.get(user_id)

@app.route("/login")
def login():
    # Find out what URL to hit for Google login
    google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]

    # Use library to construct the request for login
    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri=url_for("callback", _external=True, _scheme='https'),
        scope=["openid", "email", "profile"],
    )
    return redirect(request_uri)

@app.route("/login/callback")
def callback():
    # Get authorization code Google sent back
    code = request.args.get("code")
    
    # Find out what URL to hit to get tokens
    google_provider_cfg = requests.get(GOOGLE_DISCOVERY_URL).json()
    token_endpoint = google_provider_cfg["token_endpoint"]

    # Prepare and send request to get tokens
    token_url, headers, body = client.prepare_token_request(
        token_endpoint,
        authorization_response=request.url,
        redirect_url=url_for("callback", _external=True, _scheme='https'),
        code=code
    )
    token_response = requests.post(
        token_url,
        headers=headers,
        data=body,
        auth=(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET),
    )

    # Parse the tokens
    client.parse_request_body_response(json.dumps(token_response.json()))

    # Get user info from Google
    userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
    uri, headers, body = client.add_token(userinfo_endpoint)
    userinfo_response = requests.get(uri, headers=headers, data=body)

    if userinfo_response.json().get("email_verified"):
        unique_id = userinfo_response.json()["sub"]
        users_email = userinfo_response.json()["email"]
        users_name = userinfo_response.json()["given_name"]
        
        # Create a user in your db with the information provided
        # by Google
        user = User(
            id_=unique_id, name=users_name, email=users_email
        )
        
        # Begin user session by logging the user in
        login_user(user)
        
        # Send user back to homepage
        return redirect(url_for("index"))
    else:
        return "User email not available or not verified by Google.", 400

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))

load_dotenv()  # Load environment variables from .env file
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("API key not found. Please check your environment variables.")

# Initialize the genai library with the API key
genai.configure(api_key=API_KEY)

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/generate-content", methods=["POST"])
@login_required
def generate_content():
    try:
        if not current_user.can_generate():
            return jsonify({
                "error": "Daily generation limit reached (15/day). Please try again tomorrow."
            }), 429

        data = request.get_json()
        
        # Add error handling for required fields
        if not data or 'prompt' not in data:
            return jsonify({"error": "Missing required fields"}), 400

        # Configure Gemini
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-pro')
        
        # Prepare the prompt
        prompt = f"""
        Tone: {data.get('tone', 'Professional')}
        Style: {data.get('style', 'Standard')}
        Word Count: {data.get('wordCount', '500')}
        Language: {data.get('language', 'English')}
        
        Brand Voice Example: {data.get('brandVoice', 'N/A')}
        
        Content Request: {data['prompt']}
        """
        
        # Generate content
        response = model.generate_content(prompt)
        
        # Update user's generation count
        current_user.increment_generations()
        
        return jsonify({
            "content": response.text,
            "remaining_generations": 15 - current_user.generations_today
        })
        
    except Exception as e:
        app.logger.error(f"Error generating content: {str(e)}")
        return jsonify({"error": f"Failed to generate content: {str(e)}"}), 500

def get_style_guidelines(style):
    guidelines = {
        "formal": "Use long, well-structured paragraphs with detailed explanations. Maintain a scholarly tone while avoiding academic citations.",
        "concise": "Use short, focused paragraphs. Include bullet points for key information. Prioritize clarity and brevity.",
        "outline": "Structure the content primarily with bullet points, numbered lists, or clear hierarchical sections. Minimal narrative text.",
        "conversational": "Write in a natural, speech-like manner. Use contractions and informal language where appropriate.",
        "technical": "Include detailed technical information and specialized terminology. Focus on accuracy and precision.",
        "creative": "Use rich, descriptive language with vivid imagery. Engage the reader's imagination.",
        "minimalist": "Use the fewest words possible while maintaining clarity. Focus on essential information only."
    }
    return guidelines.get(style, "Use a balanced, professional writing style.")

# Allow HTTP for OAuth2 (only in development)
if os.environ.get('FLASK_ENV') != 'production':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Add after app initialization
if os.environ.get('FLASK_ENV') == 'production':
    app.config.update(
        SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )

# Enable CORS for all routes
CORS(app, resources={
    r"/*": {
        "origins": ["https://content.theappshub.com", "http://content.theappshub.com"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # Heroku provides the PORT environment
    app.run(host='0.0.0.0', port=port)  # Run on 0.0.0.0 to allow external access
