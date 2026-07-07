module.exports = async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Redirect Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #ffffff;
      color: #000000;
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    .app-container {
      width: 100%;
      max-width: 480px;
      padding: 3rem 1.5rem 7rem 1.5rem;
      box-sizing: border-box;
    }
    .header {
      margin-bottom: 2.5rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.04em;
      margin: 0 0 0.25rem 0;
    }
    p.subtitle {
      color: #666666;
      font-size: 0.95rem;
      margin: 0;
    }
    
    .form-group { margin-bottom: 1.25rem; display: flex; flex-direction: column; }
    .form-group label {
      font-size: 0.75rem; font-weight: 600; color: #888;
      margin-bottom: 0.5rem; margin-left: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;
    }
    input {
      border: 1px solid #e5e5e5; background: #fafafa; border-radius: 9999px;
      padding: 1rem 1.25rem; font-size: 1rem; color: #000; outline: none;
      transition: all 0.2s ease; font-family: inherit;
    }
    input::placeholder { color: #aaa; }
    input:focus { border-color: #000; background: #fff; box-shadow: 0 0 0 4px rgba(0,0,0,0.04); }
    
    .btn {
      background: #000; color: #fff; border: none; border-radius: 9999px;
      padding: 1rem 2rem; font-size: 1rem; font-weight: 600; cursor: pointer;
      transition: transform 0.2s, background 0.2s; width: 100%;
      display: flex; justify-content: center; align-items: center; text-decoration: none;
    }
    .btn:active { transform: scale(0.97); }
    .btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
    
    .session-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .session-item {
      border: 1px solid #eaeaea; border-radius: 24px; padding: 1rem 1.25rem;
      display: flex; justify-content: space-between; align-items: center;
      cursor: pointer; transition: all 0.2s; background: #fff;
    }
    .session-item:active { transform: scale(0.98); }
    .session-item.active-session { border: 2px solid #000; padding: calc(1rem - 1px) calc(1.25rem - 1px); background: #fafafa; }
    
    .session-info { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.95rem;}
    .badge { background: #000; color: #fff; font-size: 0.65rem; padding: 0.25rem 0.5rem; border-radius: 99px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-left: 0.5rem;}
    
    .delete-btn {
      background: #f9f9f9; color: #999; border: none; border-radius: 999px;
      width: 32px; height: 32px; display: flex; justify-content: center; align-items: center;
      cursor: pointer; transition: all 0.2s;
    }
    .delete-btn:hover { background: #fee2e2; color: #ef4444; }
    
    .dock-wrapper {
      position: fixed; bottom: 2rem; left: 0; right: 0;
      display: flex; justify-content: center; pointer-events: none; z-index: 100;
    }
    .dock {
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(0,0,0,0.08); border-radius: 9999px; display: flex; padding: 0.4rem; gap: 0.25rem;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08); pointer-events: auto;
    }
    .dock-btn {
      background: transparent; border: none; padding: 0.75rem 1.5rem; border-radius: 9999px;
      font-size: 0.9rem; font-weight: 600; color: #888; cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; gap: 0.5rem; font-family: inherit;
    }
    .dock-btn.active { background: #000; color: #fff; }
    
    .view { display: none; animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .view.active { display: block; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    
    .error-msg { color: #ef4444; font-size: 0.85rem; font-weight: 500; margin-top: 1rem; text-align: center; display: none; background: #fee2e2; padding: 0.75rem; border-radius: 12px;}
    
    .empty-state { text-align: center; color: #999; padding: 2rem 0; font-size: 0.95rem;}
  </style>
</head>
<body>
  <div class="app-container">
    <div class="header">
      <h1>Dashboard</h1>
      <p class="subtitle">Manage your redirect engine sessions.</p>
    </div>
    
    <!-- Sessions View -->
    <div id="view-sessions" class="view active">
      <div id="activeRedirectContainer" style="display:none; margin-bottom: 2.5rem;">
        <a href="/api/go" class="btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Redirect to Link
        </a>
      </div>
      
      <h2 style="font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0.5rem; letter-spacing: -0.02em;">Your Keys</h2>
      <div class="session-list" id="sessionList">
        <div class="empty-state">Loading...</div>
      </div>
    </div>

    <!-- Add Key View -->
    <div id="view-add" class="view">
      <div id="step1">
        <div class="form-group">
          <label>Session Name</label>
          <input type="text" id="sessionName" placeholder="e.g. My Phone" />
        </div>
        <div class="form-group">
          <label>Dashboard Password</label>
          <input type="password" id="customPassword" placeholder="Optional lock" />
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <div style="display:flex; gap: 0.5rem;">
            <input type="text" id="phonePrefix" placeholder="+39" style="width: 80px;" />
            <input type="text" id="phoneNum" placeholder="1234567890" style="flex: 1;" />
          </div>
        </div>
        <button class="btn" id="sendCodeBtn" style="margin-top: 0.5rem;" onclick="sendCode()">Send Code via Telegram</button>
      </div>

      <div id="step2" style="display:none;">
        <div class="form-group">
          <label>Login Code</label>
          <input type="text" id="code" placeholder="12345" />
        </div>
        <div class="form-group">
          <label>2FA Password</label>
          <input type="password" id="password" placeholder="Leave empty if none" />
        </div>
        <button class="btn" id="signInBtn" style="margin-top: 0.5rem;" onclick="signIn()">Verify & Save</button>
      </div>

      <div id="errorMsg" class="error-msg"></div>
    </div>
  </div>

  <div class="dock-wrapper">
    <div class="dock">
      <button class="dock-btn active" id="tab-sessions" onclick="switchTab('sessions')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
        Keys
      </button>
      <button class="dock-btn" id="tab-add" onclick="switchTab('add')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Key
      </button>
    </div>
  </div>

  <script>
    let phoneCodeHash = "";
    let tempSession = "";
    let phoneNumber = "";
    let sessionName = "";

    function switchTab(tab) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('view-' + tab).classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
      hideError();
    }

    function showError(msg) {
      const el = document.getElementById("errorMsg");
      el.innerText = msg; el.style.display = "block";
    }
    function hideError() { document.getElementById("errorMsg").style.display = "none"; }
    
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

    async function loadSessions() {
      const listEl = document.getElementById("sessionList");
      try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        const activeCookie = getCookie("TG_ACTIVE_SESSION");

        if (activeCookie && data.sessions && data.sessions.some(s => s.name === activeCookie)) {
          document.getElementById("activeRedirectContainer").style.display = "block";
        } else {
          document.getElementById("activeRedirectContainer").style.display = "none";
        }

        if (!data.sessions || data.sessions.length === 0) {
          listEl.innerHTML = "<div class='empty-state'>No keys found. Add one below.</div>";
          return;
        }

        listEl.innerHTML = "";
        data.sessions.forEach(s => {
          const div = document.createElement("div");
          const isActive = activeCookie === s.name;
          div.className = "session-item" + (isActive ? " active-session" : "");
          
          div.innerHTML = 
            '<div class="session-info" onclick="setActiveSession(\\'' + s.name + '\\', ' + s.hasPassword + ')" style="flex-grow:1;">' +
              (s.hasPassword ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> ' : '') + 
              s.name + 
              (isActive ? '<span class="badge">Active</span>' : '') +
            '</div>' +
            '<button class="delete-btn" onclick="deleteSession(\\'' + s.name + '\\', event)">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>';
          listEl.appendChild(div);
        });
      } catch(e) {
        listEl.innerHTML = "<div class='empty-state'>Error loading sessions.</div>";
      }
    }

    function setActiveSession(name, hasPassword) {
      if (hasPassword) {
        const pwd = prompt("This session is locked. Enter password:");
        if (pwd === null) return;
        setCookie("TG_SESSION_PASSWORD", pwd, 365);
      } else {
        setCookie("TG_SESSION_PASSWORD", "", -1);
      }
      setCookie("TG_ACTIVE_SESSION", name, 365);
      loadSessions();
    }

    async function deleteSession(name, e) {
      e.stopPropagation();
      if (!confirm("Delete key '" + name + "'?")) return;
      await fetch("/api/sessions?sessionName=" + encodeURIComponent(name), { method: "DELETE" });
      if (getCookie("TG_ACTIVE_SESSION") === name) setCookie("TG_ACTIVE_SESSION", "", -1);
      loadSessions();
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
      const customPassword = document.getElementById("customPassword").value.trim();
      
      if (!code) return showError("Please enter the login code.");

      const btn = document.getElementById("signInBtn");
      btn.disabled = true; btn.innerText = "Verifying..."; hideError();

      try {
        const res = await fetch("/api/auth", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            action: "signIn", sessionName, phoneNumber, phoneCodeHash, 
            phoneCode: code, tempSession, password, customPassword
          })
        });
        const data = await res.json();
        
        if (!res.ok) {
          if (data.passwordRequired) throw new Error("2FA Password is required for this account.");
          throw new Error(data.error || "Failed to verify code");
        }

        if (customPassword) setCookie("TG_SESSION_PASSWORD", customPassword, 365);
        else setCookie("TG_SESSION_PASSWORD", "", -1);
        setCookie("TG_ACTIVE_SESSION", sessionName, 365);
        
        // Reset form
        document.getElementById("step1").style.display = "block";
        document.getElementById("step2").style.display = "none";
        document.getElementById("phonePrefix").value = "";
        document.getElementById("phoneNum").value = "";
        document.getElementById("sessionName").value = "";
        document.getElementById("customPassword").value = "";
        document.getElementById("code").value = "";
        document.getElementById("password").value = "";
        document.getElementById("sendCodeBtn").disabled = false;
        document.getElementById("sendCodeBtn").innerText = "Send Code via Telegram";
        
        switchTab('sessions');
        loadSessions();
      } catch (err) {
        showError(err.message);
        btn.disabled = false; btn.innerText = "Verify & Save";
      }
    }
    
    window.onload = loadSessions;
  </script>
</body>
</html>
  `);
  return res.end();
};
