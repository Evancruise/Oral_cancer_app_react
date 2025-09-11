from flask import Flask, send_from_directory, session
from flask import Flask, request, session, jsonify, send_from_directory, send_file
from model_archive.utils_func import delete_files_in_folder, move_files_in_folders
from collections import defaultdict
import os, io, base64, uuid, time, re
import qrcode
import datetime
from datetime import date
import jwt
import requests
import sqlite3
from flask_cors import CORS
from zoneinfo import ZoneInfo
import pandas as pd
from functools import wraps
from model_archive.func_db import init_db

from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="/")
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "1234")  # session 需要
# CORS(app, supports_credentials=True)
CORS(app)

DB_PATH = os.environ.get("USER_ID", "user.db")
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
user_login_status = {}

UPLOAD_FOLDER = os.path.join(app.root_path, "tmp", "uploads")
RESULT_FOLDER = os.path.join(app.root_path, "tmp", "results")

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

# 登入頁面
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
        elif is_valid_email(username) and "password" in session and password == session["password"]:
            token = generate_jwt(username)

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
        else:
            return {"status": "failed", "message": "format error", "redirect": "homepage"} 
    elif not name:
        return {"status": "error", "message": "Name empty", "redirect": "homepage"} 
    
    return {"status": "error", "message": "Wrong username/pwd"}

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

@app.route("/logout")
def logout():
    del user_login_status[session["username"]]
    session["status"] = "not login"
    return jsonify({"redirect": "/"})

def refresh_timer(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        name = session["username"]
        if name in user_login_status:
            del user_login_status[name]
            print(f"[refresh_timer] 更新 {name} 的時間")
        return f(*args, **kwargs)
    return wrapper

@app.route("/countdown_time")
def countdown_time():
    # 假設這個時間是從 DB 或記憶體算出來的
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT expire_time FROM sys_settings WHERE id=1
    """)
    row = cursor.fetchone()

    conn.commit()
    conn.close()

    if "username" not in session:
        return jsonify({"remaining_time": 0, "is_expired": True, "is_valid": False})

    name=session["username"]

    # 第一次觸發，紀錄開始時間
    if name not in user_login_status:
        user_login_status[name] = int(time.time())

    if row:
        expire_time = row[0]
        now = int(time.time())

        if user_login_status[name] != None:
            elapsed = now - user_login_status[name] # COUNTDOWN_START = int(time.time())
        else:
            elapsed = now

        remaining_time = expire_time - elapsed
    else:
        del user_login_status[name]
        return jsonify({"remaining_time": remaining_time, "is_expired": True, "is_valid": False})

    if remaining_time <= 0:
        user_login_status[name] = None
        del user_login_status[name]
        return jsonify({"remaining_time": remaining_time, "is_expired": True, "is_valid": True})
    
    return jsonify({"remaining_time": remaining_time, "is_expired": False, "is_valid": True})

# 登入首頁頁面
@app.route("/home_page")
@refresh_timer
def home_page():
    name = session["name"]
    username = session["username"]
    return {"name": name, "username": username}

# 個人病歷紀錄頁面
@app.route("/record", methods=["GET"])
@refresh_timer
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

    print("modify_record entry point", flush=True)

    form = request.get_json()
    action = form["action"]
    imgs_list = form["all_imgs"]

    print("imgs_list:", imgs_list, ", length:", len(imgs_list), flush=True)
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM records WHERE patient_id = ?", (form['patient_id'],))
    existing = cursor.fetchone()

    if action == "add":
        if existing:
            print("已存在這個 patient_id，請確認是否重複新增")
            return jsonify({"status": "failed", "message": "patient id existed", "redirect": "record"})
        
        if "notes" in form:
            cursor.execute("""
                INSERT INTO records (
                    name, gender, age, patient_id, notes, start_timestamp, last_timestamp, status, progress
                )
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
            """, (form['name'], form['gender'], int(form['age']), form['patient_id'], form['notes'], "not_started", 0,))
            conn.commit()
        else:
            cursor.execute("""
                INSERT INTO records (
                    name, gender, age, patient_id, start_timestamp, last_timestamp, status, progress
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
            """, (form['name'], form['gender'], int(form['age']), form['patient_id'], "not_started", 0,))
            conn.commit()

    elif action == "edit":

        if not existing:
            print("已存在這個 patient_id，請確認是否重複新增")
            return jsonify({"status": "failed", "message": "patient id not existed", "redirect": "record"})

        if "notes" in form:
            cursor.execute("""
                UPDATE records
                SET name=?, gender=?, age=?, notes=?, last_timestamp=CURRENT_TIMESTAMP
                WHERE patient_id=?
            """, (form['name'], form['gender'], int(form['age']), form['notes'], form['patient_id'],))
            conn.commit()
        else:
            cursor.execute("""
                UPDATE records
                SET name=?, gender=?, age=?, last_timestamp=CURRENT_TIMESTAMP
                WHERE patient_id=?
            """, (form['name'], form['gender'], int(form['age']), form['patient_id'],))
            conn.commit()

    elif action == "remove":

        print("action: remove from records db and insert into records_gb...", flush=True)

        cursor.execute("""
            INSERT INTO records_gb (
                name, gender, age, patient_id, result, notes, status, progress, message, start_timestamp, last_timestamp,
                img1, img2, img3, img4, img5, img6, img7, img8,
                img1_result, img2_result, img3_result, img4_result, img5_result, img6_result, img7_result, img8_result
            )
            SELECT
                name, gender, age, patient_id, result, notes, status, progress, message, start_timestamp, last_timestamp,
                img1, img2, img3, img4, img5, img6, img7, img8,
                img1_result, img2_result, img3_result, img4_result, img5_result, img6_result, img7_result, img8_result
            FROM records
            WHERE patient_id = ?;
        """, (form['patient_id'], ))
        
        conn.commit()

        cursor.execute("DELETE FROM records WHERE patient_id = ?", (form['patient_id'],))
        conn.commit()

        cursor.execute("SELECT * FROM records WHERE patient_id = ?", (form['patient_id'],))
        rows = cursor.fetchall()

        if rows:
            return jsonify({"status": "failed", "message": "delete failed", "redirect": "record"})

        cursor.execute("SELECT * FROM records_gb WHERE patient_id = ?", (form['patient_id'],))
        rows = cursor.fetchall()
        print("rows (record_gb):", rows, flush=True)

    print("len(imgs_list):", len(imgs_list), flush=True)
    if len(imgs_list) == 8:
        print("update records imgs list", flush=True)
        cursor.execute("""
            UPDATE records
            SET img1=?, img2=?, img3=?, img4=?, img5=?, img6=?, img7=?, img8=?
            WHERE patient_id=?
        """, (imgs_list['img1'], imgs_list['img2'], imgs_list['img3'], imgs_list['img4'], 
              imgs_list['img5'], imgs_list['img6'], imgs_list['img7'], imgs_list['img8'], form['patient_id'], ))
        conn.commit()

        # 模擬測試結果圖
        cursor.execute("""
            UPDATE records
            SET img1_result=?, img2_result=?, img3_result=?, img4_result=?, img5_result=?, img6_result=?, img7_result=?, img8_result=?
            WHERE patient_id=?
        """, (imgs_list['img1'], imgs_list['img2'], imgs_list['img3'], imgs_list['img4'], 
              imgs_list['img5'], imgs_list['img6'], imgs_list['img7'], imgs_list['img8'], form['patient_id'], ))
        conn.commit()

    conn.close()

    check_db_table()

    return jsonify({"status": "ok", "redirect": "record", "action": action})

# 病歷紀錄管理頁面
@app.route("/all_record")
@refresh_timer
def all_record():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM records ORDER BY last_timestamp DESC")
    rows = cursor.fetchall()

    record_dict = defaultdict(list)

    for row in rows:
        
        current_table = {
            'case': row['patient_id'],
            'created': row['start_timestamp'],
            'uploaded': row['last_timestamp'],
            'user': row['name'],
            'status': row['status'],
            'notes': row['notes'],
            'category': "green",
            'count': sum([1 for i in range(8) if row['img' + str(i+1) + '_result']]),
            'img_names': [row['img' + str(i+1) + '_result'] for i in range(8)]
        }

        print(current_table, flush=True)

        record_dict[row['start_timestamp']] = current_table
    
    conn.commit()
    conn.close()

    today = date.today()
    today_timestamp = today.strftime("%Y/%m/%d")

    # render_template("liff_all_records.html", grouped_records=history_list, priority=retrieve_priority(username), today_date=today_timestamp + "~" + today_timestamp)
    return jsonify({"grouped_records": record_dict, "default_date": today_timestamp + "~" + today_timestamp})

@app.route("/export_data", methods=["POST"])
@refresh_timer
def export_data():
    records = request.json  # React 傳進來的 data
    for item in records:
        item["img_names"] = ", ".join([i for i in item["img_names"] if i])

    df = pd.DataFrame(records)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Records")
    output.seek(0)

    return send_file(
        output,
        as_attachment=True,
        download_name="records.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# 帳號管理與系統設定頁面
@app.route("/all_account")
@refresh_timer
def all_account():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()

    print("rows:", rows, flush=True)

    account_dict = defaultdict(list)
    for row in rows:
        print("row:", row, flush=True)

        if row['priority'] == 1:
            role = "system manager"
        elif row['priority'] == 0:
            role = "resource manager"
        else:
            role = "tester"

        current_table = {
            "account": row['username'],
            "name": row['name'],
            "password": row['password'],
            "unit": row["unit"],
            "role": role,
            "status": row["status"] if row["status"] else "deactivated",
            "note": row["note"]
        }

        account_dict[row["create_timestamp"]] = current_table
    
    conn.commit()
    conn.close()

    print("account_dict:", dict(account_dict), flush=True)
    return jsonify({"all_account_dict": dict(account_dict)})

@app.route("/apply_change_account", methods=["POST"])
def apply_change_account():
    data = request.get_json()
    action = data.get("action")
    username = data.get("account")
    name = data.get("name")
    password = data.get("password")
    unit = data.get("unit")
    role = data.get("role")
    status = data.get("status")
    note = data.get("note")

    print("action:", action, flush=True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE name=?", (name, ))
    row = cursor.fetchone()

    priority = -1

    if action == "add":

        if not row:
            if role == "system manager":
                priority = 1
            elif role == "resource manager":
                priority = 0
            else:
                priority = -1

            cursor.execute("""
            INSERT INTO users (
                    username, name, password, unit, priority, status, note
                ) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (username, name, password, unit, priority, status, note, ))
            conn.commit()
        else:
            conn.close()
            jsonify({"status": "failed", "action": action})

    elif action == "save":

        if role == "system manager":
            priority = 1
        elif role == "resource manager":
            priority = 0
        else:
            priority = -1

        if row:
            cursor.execute("""
                UPDATE users SET username = ?, password = ?, unit = ?, priority = ?, status = ?, note = ? WHERE name=?
                """, (username, password, unit, priority, status, note, name,))
            conn.commit()
        else:
            conn.close()
            return jsonify({"status": "failed", "action": action})
        
    elif action == "delete":
        cursor.execute("SELECT * FROM users WHERE name=?", (name, ))
        row = cursor.fetchone()
        print("name:", name, flush=True)

        if row:
            cursor.execute("DELETE FROM users WHERE name=?", (name,))
            conn.commit()
        else:
            conn.close()
            return jsonify({"status": "failed", "action": action})
    
    conn.close()
    return jsonify({"status": "ok", "action": action})

@app.route("/system_settings")
def system_settings():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM sys_settings WHERE id=1
    """)
    row = cursor.fetchone()

    print("row:", row, flush=True)

    if row:
        expire_time = row["expire_time"]
    else:
        expire_time = 600
    
    conn.commit()
    conn.close()

    return jsonify({"expire_time": expire_time})

@app.route("/apply_system_settings", methods=["POST"])
def apply_system_settings():
    data = request.get_json()
    expire_time = data.get("expireTime")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("expire_time:", expire_time, flush=True)

    cursor.execute("""
        UPDATE sys_settings SET expire_time=? WHERE id=1
    """, (expire_time, ))

    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/reset")
def reset():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("reset begin", flush=True)
    cursor.execute('''
        DROP TABLE IF EXISTS sys_settings;
    ''')
    conn.commit()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sys_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expire_time INTEGER DEFAULT 600
        )
    ''')
    conn.commit()

    cursor.execute("""
        INSERT INTO sys_settings (id, expire_time) VALUES (1, 600)
    """)

    conn.commit()
    conn.close()

    return jsonify({"status": "ok"})

# 垃圾桶頁面
@app.route('/all_discard_record')
@refresh_timer
def all_discard_record():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM records_gb ORDER BY last_timestamp DESC")
    rows = cursor.fetchall()

    conn.commit()
    conn.close()

    grouped = defaultdict(list)

    for row in rows:
        start_date_display = datetime_convert(row['start_timestamp'], "sec")
        last_date_display = datetime_convert(row['last_timestamp'], "date")

        current_table = {
            'name': session['name'],
            'gender': row['gender'],
            'age': row['age'],
            'patient_id': row['patient_id'],
            'time': start_date_display,  # 原始 timestamp 可用於排序
            'last_edit_time': last_date_display,
            'notes': row['notes'],
            'icon': 'camera',
            'bg_class': '',
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
    
    print("dict(grouped):", dict(grouped), flush=True)

    return jsonify({"discard_grouped_records": dict(grouped)})

@app.route("/revert_delete_record", methods=["POST"])
def revert_delete_record():

    form = request.get_json()
    action = form.get("action")
    patient_id = form.get("patient_id")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # cursor.execute("DELETE FROM records WHERE patient_id = ?", (patient_id,))
    # conn.commit()
    if action == "revert":
        cursor.execute("""
            INSERT INTO records (
                name, gender, age, patient_id, result, notes, status, progress, message, start_timestamp, last_timestamp, 
                img1, img2, img3, img4, img5, img6, img7, img8,
                img1_result, img2_result, img3_result, img4_result, img5_result, img6_result, img7_result, img8_result
            )
            SELECT
                name, gender, age, patient_id, result, notes, status, progress, message, start_timestamp, last_timestamp,
                img1, img2, img3, img4, img5, img6, img7, img8,
                img1_result, img2_result, img3_result, img4_result, img5_result, img6_result, img7_result, img8_result
            FROM records_gb
            WHERE patient_id = ?;
        """, (patient_id, ))

        conn.commit()

        cursor.execute("SELECT * FROM records WHERE patient_id = ?", (patient_id,))
        conn.commit()
        row = cursor.fetchone()

        cursor.execute("DELETE FROM records_gb WHERE patient_id = ?", (patient_id,))
        conn.commit()

        cursor.execute("SELECT * FROM records_gb WHERE patient_id = ?", (patient_id,))
        conn.commit()
        row_gb = cursor.fetchone()

        conn.close()

        if row and not row_gb:
            return jsonify({"status": "ok", "action": action})
        else:
            return jsonify({"status": "failed", "message": "resume failed", "action": action})

    elif action == "delete_confirm":

        cursor.execute("DELETE FROM records WHERE patient_id = ?", (patient_id,))
        conn.commit()

        cursor.execute("DELETE FROM records_gb WHERE patient_id = ?", (patient_id,))
        conn.commit()

        cursor.execute("SELECT * FROM records_gb WHERE patient_id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()

        delete_files_in_folder(f"{UPLOAD_FOLDER}/{patient_id}")

        if row:
            return jsonify({"status": "failed", "message": "delete failed", "action": action})
        else:
            return jsonify({"status": "ok", "action": action})
        
# 快速密碼變更頁面
@app.route("/apply_change_password", methods=["POST"])
@refresh_timer
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

# 重設密碼頁面
@app.route("/apply_reset_password", methods=["POST"])
def apply_reset_password():
    form = request.get_json()

    new_password = form["new_password"]
    new_same_password = form["new_same_password"]

    if new_password != new_same_password:
        return jsonify({"status": "failed", "message": "password not the same"})
    
    session["password"] = new_password
    return jsonify({"status": "ok", "message": ""})

# 重新綁定頁面
@app.route("/rebind-qr")
@refresh_timer
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

# 其他基本路由
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

@app.route("/upload", methods=["POST"])
@refresh_timer
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

def is_valid_email(email: str) -> bool:
    """
    判斷字串是否為有效的 email 格式
    :param email: 要檢查的字串
    :return: True (符合 email 格式), False (不符合)
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

