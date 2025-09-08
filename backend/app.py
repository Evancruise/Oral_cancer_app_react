from flask import Flask, send_from_directory, session
from flask import Flask, request, session, jsonify, send_from_directory, send_file
from collections import defaultdict
import os, io, base64, uuid, time
import qrcode
import datetime
import jwt
import requests
import sqlite3
from flask_cors import CORS
from zoneinfo import ZoneInfo
from model_archive.func_db import init_db

from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
app.secret_key = os.getenv("FLASK_SECRET_KEY")  # session 需要
CORS(app, supports_credentials=True)

DB_PATH = os.environ.get("USER_ID", "user.db")
init_db(DB_PATH)
USER_ID = os.environ.get("USER_ID", "")
USERNAME = os.environ.get("USERNAME", "")
PASSWORD = os.environ.get("PASSWORD", "")
PASSWORD_ROOT = os.environ.get("PASSWORD_ROOT", "")
JWT_SECRET = os.environ.get("JWT_SECRET")
TIMEZONE = os.environ.get("TIMEZONE", "")
SOURCE_EMAIL_ADDRESS = os.environ.get("SOURCE_EMAIL_ADDRESS", "noreply@yourapp.com")
EMAIL_ADDRESS = os.environ.get("EMAIL_ADDRESS", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
new_patient_id = "0001"

UPLOAD_FOLDER = os.path.join(app.root_path, "tmp", "uploads")
RESULT_FOLDER = os.path.join(app.root_path, "tmp", "results")

active_tokens = {}

print("UPLOAD_FOLDER:", UPLOAD_FOLDER)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

def generate_jwt(user_id):
    payload = {
        'user_id': USER_ID,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def check_db_table():
    # 假設你的資料庫檔案是 records.db
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 查詢表格的 schema 資訊
    cursor.execute("PRAGMA table_info(records)")
    columns = cursor.fetchall()

    # 顯示表格欄位資訊
    print("欄位資訊：")
    print(f"{'cid':<3} {'name':<10} {'type':<10} {'notnull':<8} {'dflt_value':<20} {'pk':<3}")
    for col in columns:
        cid, name, col_type, notnull, dflt_value, pk = col
        print(f"{cid:<3} {name:<10} {col_type:<10} {notnull:<8} {str(dflt_value):<20} {pk:<3}")

    conn.close()

# Serve React
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/assets/guide/<path:filename>")
def guide_assets(filename):
    folder = os.path.join(app.root_path, "assets", "guide")
    return send_from_directory(folder, filename)

@app.route("/<path:path>")
def serve_static(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

@app.route("/current_username")
def get_username():
    if "username" not in session or ("cur_state" not in session or session["cur_state"] == "deactivated"):
        return jsonify({"username": None, "cur_state": "deactivated"})
    return jsonify({"username": session["username"], "cur_state": session["cur_state"]})

# API 範例
@app.route("/login_redirect", methods=['POST'])
def login_redirect():
    data = request.get_json()
    name = data.get("name")
    username = data.get("username")
    password = data.get("password")

    if name:
        if username == 'admin' and password == PASSWORD_ROOT:
            token = generate_jwt(username)  # 產生 JWT
            print("token:", token)

            new_session_id = str(uuid.uuid4())
            session["status"] = "login"
            session["token"] = token
            session["username"] = username
            session["password"] = password
            session["user_id"] = new_session_id

            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                "UPDATE users SET qr_session_id = ? WHERE name=?",
                (session["user_id"], name,)
            )
            
            session["name"] = name
            session["cur_state"] = "activated"
            conn.commit()
            conn.close()

            return {"status": "success", "message": "none", "redirect": "homepage"}
        elif password == session["password"]:
            new_session_id = str(uuid.uuid4())
            session["user_id"] = new_session_id

            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(
                "UPDATE users SET qr_session_id = ? WHERE name=?",
                (session["user_id"], name,)
            )

            session["name"] = name
            session["cur_state"] = "activated"
            conn.commit()
            conn.close()
            return {"status": "success", "message": "none", "redirect": "homepage"}        
    else:
        return {"status": "error", "message": "Name empty", "redirect": "homepage"} 
    
    return {"status": "error", "message": "帳號或密碼錯誤"}

@app.route("/login", methods=["GET"])
def login_api():
    # 產生 session_id
    session_id = str(uuid.uuid4())
    session["user_id"] = session_id
    session["status"] = "pending"
    session["cur_state"] = "deactivated"

    # 產生 QR Code (這裡只是示範用，把 session_id 編進 QR)
    qr_data = f"http://localhost:8080/qr-login/{session_id}"
    qr_img = qrcode.make(qr_data)

    buffer = io.BytesIO()
    qr_img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    # 回傳 JSON
    return jsonify({
        "qr": qr_base64,
        "session_id": session_id
    })

@app.route("/home_page")
def home_page():
    name = session["name"]
    username = session["username"]
    return {"name": name, "username": username}

def datetime_convert(stimestamp, display_style="date"):
    dt_naive = datetime.datetime.strptime(stimestamp, "%Y-%m-%d %H:%M:%S")
    dt_utc = dt_naive.replace(tzinfo=ZoneInfo("Asia/Taipei"))
    dt = dt_utc.astimezone(ZoneInfo(TIMEZONE))

    weekday_str = dt.strftime("%A")
    weekday_map = {
        'Monday': '一',
        'Tuesday': '二',
        'Wednesday': '三',
        'Thursday': '四',
        'Friday': '五',
        'Saturday': '六',
        'Sunday': '日',
    }
    chinese_weekday = weekday_map.get(weekday_str, '')

    if display_style == "date":
        datetime_str = dt.strftime("%Y-%m-%d")  # 精準到秒
        date_display = f"{datetime_str}（{chinese_weekday}）"
    elif display_style == "sec":
        datetime_str_prefix = dt.strftime("%Y-%m-%d")
        datetime_str_suffix = dt.strftime("%H:%M:%S")
        date_display = f"{datetime_str_prefix}（{chinese_weekday}）{datetime_str_suffix}"

    return date_display

def retrieve_priority(username):

    username = session["username"]

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE username=?", (username, ))
    row = cursor.fetchone()
    
    if row is None:
    # 沒有找到這個 user
        priority = 0   # 或者給個預設值，例如 0
    else:
        priority = row["priority"] if row["priority"] is not None else 0

    conn.commit()
    conn.close()

    return int(priority)

@app.route("/record", methods=["GET"])
def record():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    patient_id_dict = []
    grouped = defaultdict(list)

    cursor.execute("SELECT * FROM records ORDER BY last_timestamp DESC")
    rows = cursor.fetchall()

    username = session["username"]
    name = session["name"]

    for row in rows:
        start_date_display = datetime_convert(row['start_timestamp'], "sec")
        last_date_display = datetime_convert(row['last_timestamp'], "date")

        current_table = {
            'name': row['name'],
            'gender': row['gender'],
            'age': row['age'],
            'patient_id': row['patient_id'],
            'time': start_date_display,  # 原始 timestamp 可用於排序
            'last_edit_time': last_date_display,
            'status': row['status'],
            'notes': row['notes'],
            'pic1': row['img1'] or "/static/guide/1.png",
            'pic2': row['img2'] or "/static/guide/2.png",
            'pic3': row['img3'] or "/static/guide/3.png",
            'pic4': row['img4'] or "/static/guide/4.png",
            'pic5': row['img5'] or "/static/guide/5.png",
            'pic6': row['img6'] or "/static/guide/6.png",
            'pic7': row['img7'] or "/static/guide/7.png",
            'pic8': row['img8'] or "/static/guide/8.png",
            'pic1_r': row['img1_result'] or "/static/guide/1.png",
            'pic2_r': row['img2_result'] or "/static/guide/2.png",
            'pic3_r': row['img3_result'] or "/static/guide/3.png",
            'pic4_r': row['img4_result'] or "/static/guide/4.png",
            'pic5_r': row['img5_result'] or "/static/guide/5.png",
            'pic6_r': row['img6_result'] or "/static/guide/6.png",
            'pic7_r': row['img7_result'] or "/static/guide/7.png",
            'pic8_r': row['img8_result'] or "/static/guide/8.png"
        }

        grouped[last_date_display].append(current_table)
        patient_id_dict.append(row['patient_id'])
    
    cursor.execute("SELECT MAX(patient_id) FROM records")
    max_id_row = cursor.fetchone()
    max_id = int(max_id_row[0]) if max_id_row[0] else 0
    new_patient_id = f"{max_id+1:04d}"

    conn.commit()
    conn.close()

    return jsonify({"grouped_records": dict(grouped), 
                    "new_patient_id": new_patient_id, 
                    "user_id": session["user_id"], 
                    "all_patient_ids": patient_id_dict, 
                    "priority": retrieve_priority(username), 
                    "name":name})

@app.route("/modify_record", methods=["POST"])
def modify_record():

    form = request.get_json()
    action = form["action"]
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM records WHERE patient_id = ?", (form['patient_id'],))
    existing = cursor.fetchone()

    if action == "add":
        if existing:
            print("已存在這個 patient_id，請確認是否重複新增")
            return jsonify({"status": "failed", "message": "patient id existed", "redirect": "record"})
        
        cursor.execute("""
            INSERT INTO records (
                name, gender, age, patient_id, notes, start_timestamp, last_timestamp, status, progress
            )
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
        """, (form['name'], form['gender'], int(form['age']), form['patient_id'], form['notes'], "not_started", 0,))

    elif action == "edit":

        if not existing:
            print("已存在這個 patient_id，請確認是否重複新增")
            return jsonify({"status": "failed", "message": "patient id not existed", "redirect": "record"})

        cursor.execute("""
                UPDATE records
                SET name=?, gender=?, age=?, notes=?, last_timestamp=CURRENT_TIMESTAMP
                WHERE patient_id=?
            """, (form['name'], form['gender'], int(form['age']), form['notes'], form['patient_id'],))

    elif action == "remove":
        cursor.execute("DELETE FROM records WHERE patient_id = ?", (form['patient_id'],))     
        conn.commit()

        cursor.execute("SELECT * FROM records_gb WHERE patient_id = ?", (form['patient_id'],))
        row = cursor.fetchone()

        if row:
            return jsonify({"status": "failed", "message": "delete failed", "redirect": "record"})

    conn.commit()
    conn.close()

    check_db_table()

    return jsonify({"status": "ok", "redirect": "record", "action": action})

@app.route("/apply_change_password", methods=["POST"])
def apply_change_password():
    form = request.get_json()
    old_password = form["old_password"]
    new_password = form["new_password"]
    new_same_password = form["new_same_password"]

    if old_password != session["password"]:
        return jsonify({"status": "failed", "message": "舊密碼不正確，請再試一次"})

    if new_password != new_same_password:
        return jsonify({"status": "failed", "message": "新舊密碼不一致，請再試一次"})

    session["password"] = new_password
    return jsonify({"status": "ok", "message": ""})

@app.route("/apply_reset_password", methods=["POST"])
def apply_reset_password():
    form = request.get_json()

    new_password = form["new_password"]
    new_same_password = form["new_same_password"]

    if new_password != new_same_password:
        return jsonify({"status": "failed", "message": "password not the same"})
    
    session["password"] = new_password
    return jsonify({"status": "ok", "message": ""})

@app.route('/qr-login/<session_id>', methods=['GET', 'POST'])
def qr_login(session_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE qr_session_id=?", (session_id, ))
    user = cursor.fetchone()

    if not user:
        return "QR code 無效/已過期", 400
    
    user_id = user[0]
    session["user_id"] = user_id
    # socketio.emit("qr_bound", {"msg": "QR綁定完成"}, room=f"user_{user_id}")

    conn.commit()
    conn.close()

    return jsonify({"redirect": "/"})

def send_email_with_token(email, token):
    link = f"/verify-qr?token={token}"
    data = {
        "from": SOURCE_EMAIL_ADDRESS,
        "to": [EMAIL_ADDRESS],
        "subject": "QR Code Login Link",
        "html": f"<p>請點擊以下連結以完成綁定: </p><a href='{link}'>{link}</a>"
    }
    headers = {"Authorization": f"Bearer {RESEND_API_KEY}"}
    requests.post("https://api.resend.com/emails", json=data, headers=headers)
    # resend.Emails.send(data)

@app.route("/rebind-qr")
def rebind_qr():

    token = str(uuid.uuid4())
    expire_at = int(time.time()) + 30

    new_session_id = token

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET qr_session_id=?, expire_time=? where id=?
    """, (new_session_id, expire_at, session["user_id"], ))

    conn.commit()
    conn.close()

    img = qrcode.make(f"/verify-qr?token={token}")
    buffer = io.BytesIO()
    img.save(buffer)
    buffer.seek(0)

    send_email_with_token(EMAIL_ADDRESS, token)

    return send_file(buffer, mimetype="image/png")

@app.route("/verify-qr")
def verify_qr():
    token = request.args.get("token")
    now = int(time.time())

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * from users where id=?
    """, (session["user_id"], )) # qr_session_id, expire_time
    row = cursor.fetchone()

    if not row or token not in row:
        jsonify({"success": False, "error": "Invalid token"})
    if now > row[token]:
        return jsonify({"success": False, "error": "Token expired"})

    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "QR 驗證成功！"})

@app.route("/upload", methods=["POST"])
def upload_file():

    file = request.files["file"]
    code = request.form.get("code", "unknown")
    patient_id = request.form.get("patient_id", "00001")
    folder = os.path.join(UPLOAD_FOLDER, patient_id)

    if os.path.exists(folder):
        for filename in os.listdir(folder):
            print(filename, code)
            if filename.split("_")[0] == code:
                os.remove(os.path.join(folder, filename))
                break
    
    os.makedirs(folder, exist_ok=True)
    filename = secure_filename(f"{code}_{file.filename}")
    filepath = os.path.join(folder, filename)
    file.save(filepath)

    # 回傳可以直接存取的 URL
    return jsonify({
        "url": f"/uploads/{patient_id}/{filename}"
    })

@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route("/upload_img/<patient_id>/<path:filename>")
def serve_upload_img(patient_id, filename):
    return send_from_directory(UPLOAD_FOLDER + '/' + patient_id, filename)

@app.route("/upload_imgs/<patient_id>")
def read_upload_imgs(patient_id):

    folder = os.path.join(UPLOAD_FOLDER, patient_id)

    if not os.path.exists(folder):
        return jsonify({"exist": "no"})

    url_dict = []
    for file in os.listdir(folder):
        url_dict.append('/upload_img/' + patient_id + '/' + file)

    return jsonify({"exist": "yes", "url": url_dict})

@app.route("/retrieve_result_img/<patient_id>/<path:filename>")
def retrieve_result_img(patient_id, filename):
    return send_from_directory(RESULT_FOLDER + '/' + patient_id, filename)

@app.route("/retrieve_result_imgs/<patient_id>")
def retrieve_result_imgs(patient_id):

    folder = os.path.join(RESULT_FOLDER, patient_id)

    if not os.path.exists(folder):
        return jsonify({"exist": "no"})

    url_dict = []
    result_color = []
    for file in os.listdir(folder):
        url_dict.append('/retrieve_result_img/' + patient_id + '/' + file)
        result_color.append('green')

    return jsonify({"exist": "yes", "url": url_dict, "color": result_color})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

