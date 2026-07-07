module.exports = async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Telegram Redirect Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b; --card-bg: rgba(15, 15, 23, 0.6); --border: rgba(255, 255, 255, 0.08);
      --primary: #8b5cf6; --primary-glow: rgba(139, 92, 246, 0.35); --success: #10b981;
      --warning: #f59e0b; --text: #f4f4f5; --text-muted: #a1a1aa;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(circle at 50% 0%, #1e1b4b 0%, transparent 50%), radial-gradient(circle at 0% 100%, #0f172a 0%, transparent 50%);
      background-attachment: fixed; font-family: 'Plus Jakarta Sans', sans-serif;
      color: var(--text); display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 2rem 1rem;
    }
    .container { max-width: 480px; width: 100%; text-align: center; }
    .card {
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: 2.5rem 2rem;
      backdrop-filter: blur(20px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #8b5cf6, #ec4899);
    }
    h1 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2rem; margin-bottom: 0.5rem; }
    p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
    
    .btn {
      display: inline-flex; align-items: center; justify-content: center; width: 100%;
      padding: 1rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer;
      background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border); transition: all 0.2s;
      margin-bottom: 1rem; text-decoration: none;
    }
    .btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
    
    .btn-primary {
      background: var(--primary); border: none; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
    }
    .btn-primary:hover { background: #7c3aed; }
    
    .btn-success {
      background: var(--success); border: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
    }
    .btn-success:hover { background: #059669; }

    .form-group { text-align: left; margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    input {
      width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px;
      padding: 0.85rem 1rem; color: #fff; font-size: 1rem; outline: none; transition: border-color 0.2s;
    }
    input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-glow); }
    
    .view { display: none; }
    .view.active { display: block; animation: fadeIn 0.3s ease; }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    
    .session-list { text-align: left; margin-bottom: 1.5rem; max-height: 200px; overflow-y: auto; }
    .session-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; }
    .session-item:hover { border-color: var(--primary); }
    .session-item.active-session { border-color: var(--success); background: rgba(16,185,129,0.1); }
    .delete-btn { background: #f43f5e; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
    
    .error { color: #f43f5e; font-size: 0.85rem; margin-top: 1rem; display: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Redirect Dashboard</h1>
      <p id="subtitle">Select your active session key below to use the redirector.</p>
      
      <!-- Manage Sessions View (Default now) -->
      <div id="view-sessions" class="view active">
        <a href="/api/go" class="btn btn-success" id="goBtn" style="display:none; margin-bottom: 2rem;">🚀 Redirect to Link</a>
        
        <h3 style="margin-bottom: 1rem;">Choose a Session Key</h3>
        <div class="session-list" id="sessionList">Loading...</div>
        <button class="btn btn-primary" onclick="showView('view-add')">+ Add New Key</button>
      </div>

      <!-- Add New Key (Login) View -->
      <div id="view-add" class="view">
        <div id="step1">
          <div class="form-group">
            <label>Session Name (e.g. My iPhone)</label>
            <input type="text" id="sessionName" placeholder="My Device" />
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <div style="display:flex; gap: 0.5rem;">
              <input type="text" id="phonePrefix" placeholder="+39" style="width: 80px;" />
              <input type="text" id="phoneNum" placeholder="1234567890" style="flex: 1;" />
            </div>
          </div>
          <button class="btn btn-primary" id="sendCodeBtn" onclick="sendCode()">Send Code via Telegram</button>
        </div>

        <div id="step2" style="display:none;">
          <div class="form-group">
            <label>Login Code</label>
            <input type="text" id="code" placeholder="12345" />
          </div>
          <div class="form-group">
            <label>2FA Password (leave empty if none)</label>
            <input type="password" id="password" placeholder="••••••••" />
          </div>
          <button class="btn btn-success" id="signInBtn" onclick="signIn()">Verify & Save Key</button>
        </div>

        <div id="errorMsg" class="error"></div>
        <button class="btn" style="margin-top:1rem;" onclick="resetAddView()">Cancel</button>
      </div>

    </div>
  </div>

  <script>
    let phoneCodeHash = "";
    let tempSession = "";
    let phoneNumber = "";
    let sessionName = "";

    // Utils
    function showView(id) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }
    function showError(msg) {
      const el = document.getElementById("errorMsg");
      el.innerText = msg; el.style.display = "block";
    }
    function hideError() { document.getElementById("errorMsg").style.display = "none"; }
    
    // Cookies
    function setCookie(name, value, days) {
      let expires = "";
      if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
    function getCookie(name) {
      let nameEQ = name + "=";
      let ca = document.cookie.split(';');
      for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
      }
      return null;
    }

    // Sessions Management
    async function loadSessions() {
      const listEl = document.getElementById("sessionList");
      listEl.innerHTML = "Loading...";
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        const activeCookie = getCookie("TG_ACTIVE_SESSION");

        if (activeCookie && data.sessions && data.sessions.includes(activeCookie)) {
          document.getElementById("goBtn").style.display = "flex";
        } else {
          document.getElementById("goBtn").style.display = "none";
        }

        if (!data.sessions || data.sessions.length === 0) {
          listEl.innerHTML = "<p style='color:var(--text-muted);'>No sessions found. Add a new key first.</p>";
          return;
        }

        listEl.innerHTML = "";
        data.sessions.forEach(s => {
          const div = document.createElement("div");
          const isActive = activeCookie === s;
          div.className = "session-item" + (isActive ? " active-session" : "");
          div.innerHTML = 
            '<span onclick="setActiveSession(\\'' + s + '\\')" style="flex-grow:1;">' +
              s + (isActive ? ' (Active)' : '') +
            '</span>' +
            '<button class="delete-btn" onclick="deleteSession(\\'' + s + '\\', event)">Delete</button>';
          listEl.appendChild(div);
        });
      } catch(e) {
        listEl.innerHTML = "Error loading sessions.";
      }
    }

    function setActiveSession(name) {
      setCookie("TG_ACTIVE_SESSION", name, 365);
      loadSessions();
    }

    async function deleteSession(name, e) {
      e.stopPropagation();
      if (!confirm("Delete session '" + name + "'?")) return;
      await fetch("/api/sessions?sessionName=" + encodeURIComponent(name), { method: "DELETE" });
      if (getCookie("TG_ACTIVE_SESSION") === name) setCookie("TG_ACTIVE_SESSION", "", -1);
      loadSessions();
    }

    // Auth Flow
    function resetAddView() {
      hideError();
      document.getElementById("step1").style.display = "block";
      document.getElementById("step2").style.display = "none";
      document.getElementById("phonePrefix").value = "";
      document.getElementById("phoneNum").value = "";
      document.getElementById("sessionName").value = "";
      document.getElementById("code").value = "";
      document.getElementById("password").value = "";
      document.getElementById("sendCodeBtn").disabled = false;
      document.getElementById("sendCodeBtn").innerText = "Send Code via Telegram";
      showView('view-sessions');
    }

    async function sendCode() {
      sessionName = document.getElementById("sessionName").value.trim();
      const prefix = document.getElementById("phonePrefix").value.trim();
      const num = document.getElementById("phoneNum").value.trim();
      
      phoneNumber = prefix + num;
      
      if (!sessionName) return showError("Please enter a Session Name.");
      if (!prefix || !num) return showError("Please enter a full phone number with prefix.");
      
      const btn = document.getElementById("sendCodeBtn");
      btn.disabled = true; btn.innerText = "Sending..."; hideError();

      try {
        const res = await fetch("/api/auth", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sendCode", phoneNumber })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send code");
        
        phoneCodeHash = data.phoneCodeHash;
        tempSession = data.tempSession;
        
        document.getElementById("step1").style.display = "none";
        document.getElementById("step2").style.display = "block";
      } catch (err) {
        showError(err.message);
        btn.disabled = false; btn.innerText = "Send Code via Telegram";
      }
    }

    async function signIn() {
      const code = document.getElementById("code").value.trim();
      const password = document.getElementById("password").value.trim();
      
      if (!code) return showError("Please enter the login code.");

      const btn = document.getElementById("signInBtn");
      btn.disabled = true; btn.innerText = "Verifying..."; hideError();

      try {
        const res = await fetch("/api/auth", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            action: "signIn", 
            sessionName, 
            phoneNumber, 
            phoneCodeHash, 
            phoneCode: code, 
            tempSession,
            password 
          })
        });
        const data = await res.json();
        
        if (!res.ok) {
          if (data.passwordRequired) {
            throw new Error("2FA Password is required to log in to this account.");
          }
          throw new Error(data.error || "Failed to verify code");
        }

        // Set as active session cookie
        setActiveSession(sessionName);
        resetAddView();
        showView('view-sessions');
        loadSessions();
      } catch (err) {
        showError(err.message);
        btn.disabled = false; btn.innerText = "Verify & Save Key";
      }
    }
    
    // Auto-load on start
    window.onload = () => {
      loadSessions();
    };
  </script>
</body>
</html>
  `);
  return res.end();
};
