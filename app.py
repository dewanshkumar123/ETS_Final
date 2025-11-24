from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import json
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = "change_this_to_a_random_secret_key"  # for sessions


USERS_FILE = "users.json"
LECTURES_FILE = "lectures.json"


def load_json(path, default):
  if not os.path.exists(path):
    with open(path, "w") as f:
      json.dump(default, f, indent=2)
  with open(path, "r") as f:
    return json.load(f)


def save_json(path, data):
  with open(path, "w") as f:
    json.dump(data, f, indent=2)


def login_required(f):
  @wraps(f)
  def decorated_function(*args, **kwargs):
    if "username" not in session:
      return redirect(url_for("login"))
    return f(*args, **kwargs)
  return decorated_function


@app.route("/")
def index():
  user = session.get("username")
  role = session.get("role")
  return render_template("index.html", user=user, role=role)


@app.route("/signup", methods=["GET", "POST"])
def signup():
  if request.method == "POST":
    username = request.form.get("username").strip()
    password = request.form.get("password")
    role = request.form.get("role")

    if not username or not password or role not in ["student", "teacher"]:
      flash("All fields are required.", "error")
      return redirect(url_for("signup"))

    data = load_json(USERS_FILE, {"users": []})
    users = data["users"]

    if any(u["username"] == username for u in users):
      flash("Username already exists.", "error")
      return redirect(url_for("signup"))

    password_hash = generate_password_hash(password)
    users.append({"username": username, "password_hash": password_hash, "role": role})
    save_json(USERS_FILE, data)

    flash("Account created. Please log in.", "success")
    return redirect(url_for("login"))

  return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
  if request.method == "POST":
    username = request.form.get("username").strip()
    password = request.form.get("password")

    data = load_json(USERS_FILE, {"users": []})
    user = next((u for u in data["users"] if u["username"] == username), None)

    if user and check_password_hash(user["password_hash"], password):
      session["username"] = user["username"]
      session["role"] = user["role"]
      flash("Logged in successfully.", "success")
      return redirect(url_for("dashboard"))
    else:
      flash("Invalid username or password.", "error")
      return redirect(url_for("login"))

  return render_template("login.html")


@app.route("/logout")
def logout():
  session.clear()
  flash("Logged out.", "info")
  return redirect(url_for("index"))


@app.route("/dashboard")
@login_required
def dashboard():
  lectures_data = load_json(LECTURES_FILE, {"lectures": []})
  lectures = lectures_data["lectures"]

  role = session.get("role")
  username = session.get("username")

  if role == "teacher":
    # Show lectures created by this teacher
    my_lectures = [lec for lec in lectures if lec["created_by"] == username]
    return render_template("dashboard.html", role=role, lectures=my_lectures)

  # student view: show all lectures for now
  return render_template("dashboard.html", role=role, lectures=lectures)


@app.route("/create_lecture", methods=["POST"])
@login_required
def create_lecture():
  if session.get("role") != "teacher":
    flash("Only teachers can create lectures.", "error")
    return redirect(url_for("dashboard"))

  title = request.form.get("title").strip()
  transcript = request.form.get("transcript").strip()
  course = request.form.get("course", "").strip()  # NEW

  if not title or not transcript or not course:    # CHANGED
    flash("Title, course, and transcript are required.", "error")
    return redirect(url_for("dashboard"))

  data = load_json(LECTURES_FILE, {"lectures": []})
  lectures = data["lectures"]

  new_id = 1
  if lectures:
    new_id = max(lec["id"] for lec in lectures) + 1

  notes = generate_notes_from_transcript(transcript)

  lecture = {
    "id": new_id,
    "title": title,
    "course": course,                 # NEW FIELD
    "transcript": transcript,
    "notes": notes,
    "created_by": session.get("username")
  }

  lectures.append(lecture)
  save_json(LECTURES_FILE, data)

  flash("Lecture created and notes generated.", "success")
  return redirect(url_for("dashboard"))



def generate_notes_from_transcript(transcript):
  """
  Very simple placeholder.
  Splits transcript into bullet points by sentences.
  In real system, this would call your AI model.
  """
  sentences = [s.strip() for s in transcript.replace("\n", " ").split(".") if s.strip()]
  notes_lines = []
  notes_lines.append("# Key Points")
  for s in sentences:
    notes_lines.append(f"- {s}")
  notes = "\n".join(notes_lines)
  return notes


@app.route("/lecture/<int:lecture_id>")
@login_required
def lecture_view(lecture_id):
  data = load_json(LECTURES_FILE, {"lectures": []})
  lecture = next((lec for lec in data["lectures"] if lec["id"] == lecture_id), None)
  if not lecture:
    flash("Lecture not found.", "error")
    return redirect(url_for("dashboard"))

  return render_template("lecture.html", lecture=lecture)



@app.route("/api/chat/<int:lecture_id>", methods=["POST"])
@login_required
def chat_api(lecture_id):
  """
  Simple chatbot stub.
  Uses lecture notes and transcript and returns a basic response.
  You can later replace logic with a real AI model.
  """
  question = request.json.get("question", "").strip()
  if not question:
    return jsonify({"answer": "Please ask a question."})

  data = load_json(LECTURES_FILE, {"lectures": []})
  lecture = next((lec for lec in data["lectures"] if lec["id"] == lecture_id), None)
  if not lecture:
    return jsonify({"answer": "Lecture not found."})

  # Very basic placeholder logic
  answer = (
    "This is a prototype answer. "
    "In the real system this would use the lecture transcript and notes "
    "to generate a detailed explanation.\n\n"
    "Lecture title: "
    + lecture["title"]
  )

  return jsonify({"answer": answer})


if __name__ == "__main__":
  app.run(debug=True)
