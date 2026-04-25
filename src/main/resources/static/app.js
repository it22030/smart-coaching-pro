/* ============================================================
   Smart Coaching — app.js
   All application logic. Communicates with the Spring Boot
   REST API at /api
   ============================================================ */

const API = '/api';

// JWT token stored in memory (cleared on page refresh for security)
let authToken = sessionStorage.getItem('sc_token') || null;
let currentUser = JSON.parse(sessionStorage.getItem('sc_user') || 'null');

let pendingEnrollCourseId = null;
let editMarksContext = null;

/* ============================================================
   HTTP HELPERS
   ============================================================ */
function authHeaders() {
    const h = { 'Authorization': `Bearer ${authToken}` };
    if (currentUser && currentUser.email) h['X-User-Email'] = currentUser.email;
    return h;
}

async function apiGet(path) {
    const res = await fetch(`${API}${path}`, {
        headers: authHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    // Some endpoints return 204 No Content
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function apiPut(path, body) {
    const res = await fetch(`${API}${path}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function apiDelete(path) {
    const res = await fetch(`${API}${path}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
}

/* ============================================================
   UTILITY
   ============================================================ */
function format12Hour(time24) {
    if (!time24) return '';
    let [hour, minute] = time24.split(':');
    let h = parseInt(hour, 10);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function showToast(msg, type = 'info') {
    let toast = document.getElementById('authMsg');
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#c44536' : '#1f6392';
    setTimeout(() => toast.style.display = 'none', 3000);
}

/* ============================================================
   AUTH
   ============================================================ */
document.getElementById('doLoginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const pass  = document.getElementById('loginPassword').value;
    try {
        const data = await apiPost('/auth/login', { email, password: pass });
        authToken   = data.token;
        currentUser = data.user;
        sessionStorage.setItem('sc_token', authToken);
        sessionStorage.setItem('sc_user',  JSON.stringify(currentUser));
        renderDashboard();
    } catch (e) {
        showToast('Invalid credentials', 'error');
    }
};

document.getElementById('logoutBtn').onclick = () => {
    sessionStorage.clear();
    location.reload();
};

document.getElementById('regRole').addEventListener('change', function () {
    const isStudent = this.value === 'student';
    document.getElementById('regRoll').style.display      = isStudent ? 'block' : 'none';
    document.getElementById('regRollLabel').style.display = isStudent ? 'block' : 'none';
    document.getElementById('regBatch').style.display     = isStudent ? 'block' : 'none';
    document.getElementById('regBatchLabel').style.display= isStudent ? 'block' : 'none';
    if (isStudent) populateBatchSelect('regBatch');
});

async function populateBatchSelect(selectId, selectedId = '') {
    const batches = await apiGet('/batches');
    const sel = document.getElementById(selectId);
    sel.innerHTML = `<option value="">-- Select Batch --</option>` +
        batches.map(b => `<option value="${b.id}" ${b.id == selectedId ? 'selected' : ''}>${b.name}</option>`).join('');
}

document.getElementById('doRegBtn').onclick = async () => {
    const name  = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const pass  = document.getElementById('regPassword').value;
    const role  = document.getElementById('regRole').value;
    let batchId = null, rollNo = null;
    if (role === 'student') {
        batchId = document.getElementById('regBatch').value;
        rollNo  = document.getElementById('regRoll').value.trim();
        if (!batchId) return showToast('Select batch for student', 'error');
        if (!rollNo)  return showToast('Roll/ID required for student', 'error');
    }
    if (!name || !email || !pass) return showToast('All fields required', 'error');
    try {
        await apiPost('/auth/register', { name, email, phone, password: pass, role, batchId, rollNo });
        showToast('Registration successful! Please login.');
        document.getElementById('regDiv').style.display   = 'none';
        document.getElementById('loginDiv').style.display = 'block';
    } catch (e) {
        showToast(e.message || 'Registration failed', 'error');
    }
};

document.getElementById('showRegLink').onclick = e => {
    e.preventDefault();
    document.getElementById('loginDiv').style.display = 'none';
    document.getElementById('regDiv').style.display   = 'block';
    document.getElementById('regRole').dispatchEvent(new Event('change'));
};

document.getElementById('backLoginLink').onclick = e => {
    e.preventDefault();
    document.getElementById('regDiv').style.display   = 'none';
    document.getElementById('loginDiv').style.display = 'block';
};

document.getElementById('logoutBtn').onclick = () => {
    authToken   = null;
    currentUser = null;
    sessionStorage.removeItem('sc_token');
    sessionStorage.removeItem('sc_user');
    document.getElementById('dashboardArea').style.display  = 'none';
    document.getElementById('authContainer').style.display  = 'block';
    document.getElementById('logoutBtn').style.display      = 'none';
};

/* ============================================================
   DASHBOARD BOOTSTRAP
   ============================================================ */
async function renderDashboard() {
    if (!currentUser) return;
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboardArea').style.display = 'block';
    document.getElementById('logoutBtn').style.display     = 'block';

    let batchName = '';
    if (currentUser.role === 'student' && currentUser.batchId) {
        try {
            const batches = await apiGet('/batches');
            const b = batches.find(b => b.id == currentUser.batchId);
            batchName = ` (Batch: ${b?.name || 'N/A'})`;
        } catch (_) {}
    }
    document.getElementById('dashHeader').innerHTML =
        `<h3>👋 Welcome ${escapeHtml(currentUser.name)} (${currentUser.role})${batchName}</h3>`;

    if (currentUser.role === 'student')      buildStudentUI();
    else if (currentUser.role === 'teacher') buildTeacherUI();
    else                                     buildAdminUI();
}

// Auto-login if token is already in sessionStorage
if (authToken && currentUser) {
    renderDashboard();
}

/* ============================================================
   TIMETABLE RENDER
   ============================================================ */
/* ============================================================
   TIMETABLE RENDER
   ============================================================ */
function renderTimetable(routines, periods) {
    if (!periods || !periods.length) return '<p>⏰ No time periods created yet.</p>';
    
    // Sort periods by start time to ensure correct column ordering
    const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const daysOrder = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    let html = `<div class="timetable"><table border="1"><thead><tr><th>Day / Period</th>`;
    sortedPeriods.forEach(p => {
        html += `<th>${escapeHtml(p.label)}<br><span style="font-size:0.7rem;">${format12Hour(p.startTime)} - ${format12Hour(p.endTime)}</span></th>`;
    });
    html += `</tr></thead><tbody>`;

    daysOrder.forEach(day => {
        const dayRoutines = routines.filter(r => r.day === day);
        
        const validRoutines = [];
        dayRoutines.forEach(r => {
            const startIdx = sortedPeriods.findIndex(p => p.id == r.startPeriodId);
            const endIdx   = sortedPeriods.findIndex(p => p.id == r.endPeriodId);
            if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
                validRoutines.push({ ...r, startIdx, endIdx, colspan: endIdx - startIdx + 1 });
            }
        });

        if (validRoutines.length === 0) {
            html += `<tr><td style="background:#f1f5f9; font-weight:bold;">${day}</td>`;
            for (let i = 0; i < sortedPeriods.length; i++) html += `<td>—</td>`;
            html += `</tr>`;
            return;
        }

        // Separate routines into lanes to handle overlaps (multiple batches at the same time)
        const lanes = [];
        validRoutines.forEach(r => {
            let placed = false;
            for (let i = 0; i < lanes.length; i++) {
                let hasOverlap = false;
                for (let j = r.startIdx; j <= r.endIdx; j++) {
                    if (lanes[i][j]) {
                        hasOverlap = true;
                        break;
                    }
                }
                if (!hasOverlap) {
                    lanes[i][r.startIdx] = r;
                    for (let j = r.startIdx + 1; j <= r.endIdx; j++) lanes[i][j] = { merged: true };
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const newLane = Array(sortedPeriods.length).fill(null);
                newLane[r.startIdx] = r;
                for (let j = r.startIdx + 1; j <= r.endIdx; j++) newLane[j] = { merged: true };
                lanes.push(newLane);
            }
        });

        lanes.forEach((lane, laneIdx) => {
            html += `<tr>`;
            if (laneIdx === 0) {
                html += `<td rowspan="${lanes.length}" style="background:#f1f5f9; font-weight:bold; vertical-align:middle;">${day}</td>`;
            }
            for (let i = 0; i < sortedPeriods.length; i++) {
                const cell = lane[i];
                if (!cell) {
                    html += `<td>—</td>`;
                } else if (cell.merged) {
                    continue; // Skip because this is covered by a colspan
                } else {
                    html += `<td colspan="${cell.colspan}" style="vertical-align:top; background:#fff;">
                        <div class="class-info" style="padding:4px;">
                            <div class="subject-name" style="color:#1f6392; font-weight:bold;">${escapeHtml(cell.subjectName || '?')}</div>
                            <div style="font-size:0.85rem;">${escapeHtml(cell.courseName || '')} (${escapeHtml(cell.batchName || '')})</div>
                            <div style="font-size:0.85rem; color:#5a6e7c;">${escapeHtml(cell.teacherName || '')}</div>
                            <div style="font-size:0.85rem; color:#c44536; font-weight:500;">Room: ${escapeHtml(cell.room || '')}</div>
                        </div>
                    </td>`;
                }
            }
            html += `</tr>`;
        });
    });

    html += `</tbody></table></div>`;
    return html;
}

/* ============================================================
   PRIVATE MESSAGES
   ============================================================ */
async function renderMessagesUI() {
    const data = await apiGet('/messages');
    const inbox = data.inbox || [];
    const sent  = data.sent  || [];
    let html = `<div class="two-columns">
        <div class="column"><div class="card"><h3>📥 Received</h3>`;
    if (!inbox.length) html += '<p>No messages.</p>';
    inbox.forEach(msg => {
        html += `<div class="msg-item" style="background:${!msg.read ? '#eef6ff' : '#f9fafb'}">
            <div>${escapeHtml(msg.content)}</div>
            <div class="msg-meta">From: ${escapeHtml(msg.senderName || 'Unknown')} | ${new Date(msg.timestamp).toLocaleString()}</div>
            <button onclick="markMsgReadAndRefresh(${msg.id})" style="margin-top:6px; background:#eef2f7; color:#1f6392; padding:4px 12px;">Mark read</button>
        </div>`;
    });
    html += `</div></div><div class="column"><div class="card"><h3>📤 Sent</h3>`;
    if (!sent.length) html += '<p>No sent messages.</p>';
    sent.forEach(msg => {
        html += `<div class="msg-item">
            <div>${escapeHtml(msg.content)}</div>
            <div class="msg-meta">To: ${escapeHtml(msg.receiverName || 'Unknown')} | ${new Date(msg.timestamp).toLocaleString()}</div>
        </div>`;
    });
    html += `</div></div></div>`;
    return html;
}

function renderComposeForm(recipientOptionsHtml) {
    return `<div class="card"><h3>✉️ Send Private Message</h3>
        <label>Recipient</label>
        <select id="msgRecipient">${recipientOptionsHtml}</select>
        <label>Message</label>
        <textarea id="msgContent" rows="3" placeholder="Type your message..."></textarea>
        <button onclick="sendNewMessage()">Send</button>
    </div>`;
}

window.sendNewMessage = async () => {
    const receiverId = document.getElementById('msgRecipient').value;
    const content    = document.getElementById('msgContent').value;
    if (!receiverId || !content) return showToast('Select recipient and write message', 'error');
    try {
        await apiPost('/messages', { receiverId, content });
        showToast('Private message sent');
        document.getElementById('msgContent').value = '';
        if (currentUser.role === 'admin')        loadAdminContent('privatemessages');
        else if (currentUser.role === 'teacher') loadTeacherContent('privatemessages');
        else                                     loadStudentContent('privatemessages');
    } catch (e) { showToast('Error sending message', 'error'); }
};

window.markMsgReadAndRefresh = async (id) => {
    try { await apiPut(`/messages/${id}/read`, {}); } catch (_) {}
    if (currentUser.role === 'admin')        loadAdminContent('privatemessages');
    else if (currentUser.role === 'teacher') loadTeacherContent('privatemessages');
    else                                     loadStudentContent('privatemessages');
};

/* ============================================================
   NOTICES
   ============================================================ */
async function loadCombinedNotices() {
    const cont = document.getElementById('dynamicContent');
    const canSend = (currentUser.role === 'admin' || currentUser.role === 'teacher');
    let batches = [], teachers = [];
    try { batches  = await apiGet('/batches'); } catch (_) {}
    try { teachers = await apiGet('/users?role=teacher'); } catch (_) {}

    let html = `<div class="card"><h3>📢 Notices</h3>`;
    if (canSend) {
        html += `<div style="background:#f0f7ff; padding:16px; border-radius:20px; margin-bottom:24px;">
            <h4>Send New Notice</h4>
            <label>Notice Content</label>
            <textarea id="noticeContent" rows="2" placeholder="Write notice content..."></textarea>
            <label>Target Role</label>
            <select id="noticeTargetRole">
                <option value="student">Students (batch-specific)</option>
                <option value="teacher">All Teachers</option>
                <option value="specific_teacher">Specific Teacher</option>
                <option value="all">All</option>
                <option value="admin">Admin only</option>
            </select>
            <label>Batch</label>
            <select id="noticeTargetBatch">
                <option value="all">All Batches</option>
                ${batches.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}
            </select>
            <label id="teacherSelectLabel" style="display:none;">Select Teacher</label>
            <select id="noticeTargetTeacher" style="display:none;">
                <option value="">-- Select Teacher --</option>
                ${teachers.filter(t => t.id != currentUser.id).map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
            <button onclick="submitCombinedNotice()" style="margin-top:12px;">Send Notice</button>
        </div>`;
    }

    let received = [], sent = [];
    try {
        const noticeData = await apiGet('/notices');
        received = noticeData.received || [];
        sent     = noticeData.sent     || [];
    } catch (_) {}

    // Mark all as read
    try { await apiPut('/notices/mark-read', {}); } catch (_) {}

    html += `<div class="two-columns">
        <div class="column"><div class="card" style="margin-bottom:0;"><h3>📥 Received Notices</h3>`;
    if (!received.length) html += '<p>No notices received.</p>';
    received.forEach(n => {
        html += `<div class="notice-item ${!n.read ? 'unread' : ''}">
            <div>${escapeHtml(n.content)}</div>
            <div class="notice-meta">By: ${escapeHtml(n.postedByName || 'Unknown')} | ${new Date(n.createdAt).toLocaleString()}</div>
        </div>`;
    });
    html += `</div></div><div class="column"><div class="card" style="margin-bottom:0;"><h3>📤 Notices You Sent</h3>`;
    if (!sent.length) html += '<p>No notices sent.</p>';
    sent.forEach(n => {
        html += `<div class="notice-item">
            <div>${escapeHtml(n.content)}</div>
            <div class="notice-meta">To: ${escapeHtml(n.targetRole)} | ${new Date(n.createdAt).toLocaleString()}</div>
        </div>`;
    });
    html += `</div></div></div></div>`;
    cont.innerHTML = html;

    updateNoticeBadge();
    const roleSelect = document.getElementById('noticeTargetRole');
    if (roleSelect) {
        roleSelect.onchange = () => {
            const show = roleSelect.value === 'specific_teacher';
            document.getElementById('noticeTargetTeacher').style.display = show ? 'block' : 'none';
            document.getElementById('teacherSelectLabel').style.display  = show ? 'block' : 'none';
        };
    }
}

window.submitCombinedNotice = async () => {
    const content    = document.getElementById('noticeContent').value;
    const targetRole = document.getElementById('noticeTargetRole').value;
    const targetBatchId = document.getElementById('noticeTargetBatch').value;
    let targetTeacherId = null;
    if (targetRole === 'specific_teacher') {
        targetTeacherId = document.getElementById('noticeTargetTeacher').value;
        if (!targetTeacherId) return showToast('Select a teacher', 'error');
    }
    if (!content) return showToast('Notice content required', 'error');
    try {
        await apiPost('/notices', { content, targetRole, targetBatchId, targetTeacherId });
        showToast('Notice sent successfully');
        loadCombinedNotices();
    } catch (e) { showToast('Error sending notice', 'error'); }
};

async function updateNoticeBadge() {
    try {
        const data = await apiGet('/notices/unread-count');
        const count = data.count || 0;
        const btn = document.querySelector('.nav-btn[data-tab="notices"]');
        if (btn) {
            const old = btn.querySelector('.badge');
            if (old) old.remove();
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.innerText = count;
                btn.appendChild(badge);
            }
        }
    } catch (_) {}
}

/* ============================================================
   PAYMENT MODAL
   ============================================================ */
async function showPaymentModal(courseId) {
    const courses = await apiGet('/courses');
    const course  = courses.find(c => c.id == courseId);
    if (!course) return;
    if (course.fee === 0) { completeEnrollment(courseId); return; }
    pendingEnrollCourseId = courseId;
    document.getElementById('paymentCourseInfo').innerHTML = `<strong>${escapeHtml(course.name)}</strong>`;
    document.getElementById('paymentAmount').innerText = course.fee;
    document.getElementById('paymentReference').value  = '';
    document.getElementById('paymentModal').style.display = 'flex';
}

async function completeEnrollment(courseId) {
    try {
        await apiPost('/enrollments', { courseId });
        showToast('Enrolled successfully!');
        loadStudentContent('mycourses');
    } catch (e) {
        showToast(e.message || 'Enrollment failed', 'error');
    }
}

document.getElementById('confirmPaymentBtn').onclick = async () => {
    const ref = document.getElementById('paymentReference').value.trim();
    if (!ref) return showToast('Please enter transaction ID/reference', 'error');
    const method = document.getElementById('paymentMethod').value;
    try {
        await apiPost('/payments', {
            courseId: pendingEnrollCourseId,
            reference: ref,
            method: method
        });
        completeEnrollment(pendingEnrollCourseId);
        document.getElementById('paymentModal').style.display = 'none';
        pendingEnrollCourseId = null;
    } catch (e) { showToast('Payment failed', 'error'); }
};

document.getElementById('cancelPaymentBtn').onclick = () => {
    document.getElementById('paymentModal').style.display = 'none';
    pendingEnrollCourseId = null;
};

window.onclick = function (event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) modal.style.display = 'none';
};

/* ============================================================
   CHANGE PASSWORD MODAL
   ============================================================ */
function showChangePasswordModal() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value     = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('changePasswordModal').style.display = 'flex';
}

document.getElementById('confirmChangePasswordBtn').onclick = async () => {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confPass= document.getElementById('confirmPassword').value;
    if (newPass !== confPass) return showToast('New passwords do not match', 'error');
    if (newPass.length < 4)  return showToast('Password must be at least 4 characters', 'error');
    try {
        await apiPut(`/users/${currentUser.id}/password`, { currentPassword: current, newPassword: newPass });
        showToast('Password changed successfully');
        document.getElementById('changePasswordModal').style.display = 'none';
    } catch (e) { showToast(e.message || 'Password change failed', 'error'); }
};

document.getElementById('cancelChangePasswordBtn').onclick = () => {
    document.getElementById('changePasswordModal').style.display = 'none';
};

/* ============================================================
   STUDENT UI
   ============================================================ */
function buildStudentUI() {
    const nav = document.getElementById('dynamicNav');
    nav.innerHTML = `
        <button class="nav-btn" data-tab="mycourses">My Courses</button>
        <button class="nav-btn" data-tab="enroll">Enroll</button>
        <button class="nav-btn" data-tab="routine">Routine</button>
        <button class="nav-btn" data-tab="results">Results</button>
        <button class="nav-btn" data-tab="attendance">Attendance</button>
        <button class="nav-btn" data-tab="notices">Notices</button>
        <button class="nav-btn" data-tab="privatemessages">📩 Private Msg</button>
        <button class="nav-btn" data-tab="profile">Profile</button>`;
    document.querySelectorAll('.nav-btn').forEach(btn =>
        btn.addEventListener('click', () => loadStudentContent(btn.dataset.tab)));
    loadStudentContent('mycourses');
    updateNoticeBadge();
}

async function loadStudentContent(tab) {
    const cont = document.getElementById('dynamicContent');
    setActiveTab(tab);
    try {
        if (tab === 'mycourses') {
            const courses = await apiGet(`/enrollments/my-courses`);
            cont.innerHTML = `<div class="card"><h3>📖 My Courses</h3>
                ${courses.map(c => `<div><b>${escapeHtml(c.name)}</b> — Fee: ${c.fee} Tk</div>`).join('') || '<p>No courses enrolled.</p>'}
            </div>`;

        } else if (tab === 'enroll') {
            const available = await apiGet(`/enrollments/available`);
            cont.innerHTML = `<div class="card"><h3>➕ Available Courses</h3>
                ${available.map(c => `<div class="flex-row">
                    <span><b>${escapeHtml(c.name)}</b> (${c.fee} Tk)</span>
                    <button onclick="showPaymentModal(${c.id})">Enroll</button>
                </div>`).join('') || '<p>No new courses.</p>'}
            </div>`;

        } else if (tab === 'routine') {
            const data = await apiGet('/routines/my');
            cont.innerHTML = `<div class="card"><h3>🗓️ Class Routine</h3>${renderTimetable(data.routines, data.periods)}</div>`;

        } else if (tab === 'results') {
            const marks = await apiGet(`/marks/student/${currentUser.id}`);
            const bySubject = {};
            marks.forEach(m => {
                const key = `${m.courseId}|${m.subjectId}`;
                if (!bySubject[key]) bySubject[key] = { courseName: m.courseName, subjectName: m.subjectName, marks: [] };
                bySubject[key].marks.push(m);
            });
            let html = `<div class="card"><h3>🏆 Results (Roll: ${escapeHtml(currentUser.rollNo || 'N/A')})</h3>`;
            for (const key in bySubject) {
                const sub = bySubject[key];
                html += `<div class="subj-table"><h4>📘 ${escapeHtml(sub.subjectName)} (${escapeHtml(sub.courseName)})</h4>
                    <table border="1"><thead><tr><th>Exam</th><th>Obtained</th><th>Total</th><th>%</th></tr></thead><tbody>`;
                sub.marks.forEach(m => {
                    html += `<tr><td>${escapeHtml(m.examName)}</td><td>${m.obtained}</td><td>${m.total}</td><td>${((m.obtained/m.total)*100).toFixed(1)}%</td></tr>`;
                });
                html += `</tbody></table></div>`;
            }
            if (!Object.keys(bySubject).length) html += '<p>No marks uploaded.</p>';
            html += `</div>`;
            cont.innerHTML = html;

        } else if (tab === 'attendance') {
            const att = await apiGet(`/attendance/student/${currentUser.id}`);
            const bySubject = {};
            att.forEach(a => {
                const key = `${a.courseId}|${a.subjectId}`;
                if (!bySubject[key]) bySubject[key] = { courseName: a.courseName, subjectName: a.subjectName, present: 0, total: 0, records: [] };
                bySubject[key].total++;
                if (a.status === 'present') bySubject[key].present++;
                bySubject[key].records.push(a);
            });
            let html = `<div class="card"><h3>📋 Attendance (Roll: ${escapeHtml(currentUser.rollNo || 'N/A')})</h3>`;
            for (const key in bySubject) {
                const sub = bySubject[key];
                const pct = sub.total ? ((sub.present/sub.total)*100).toFixed(1) : 0;
                html += `<div class="subj-table"><h4>📘 ${escapeHtml(sub.subjectName)} (${escapeHtml(sub.courseName)})</h4>
                    <p>Attendance: ${sub.present}/${sub.total} (${pct}%)</p>
                    <table border="1"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>`;
                sub.records.forEach(r => {
                    html += `<tr><td>${new Date(r.date).toLocaleDateString()}</td><td>${r.status}</td></tr>`;
                });
                html += `</tbody></table></div>`;
            }
            if (!Object.keys(bySubject).length) html += '<p>No attendance records.</p>';
            html += `</div>`;
            cont.innerHTML = html;

        } else if (tab === 'notices') {
            await loadCombinedNotices();
        } else if (tab === 'privatemessages') {
            const users = await apiGet('/users?role=teacher,admin');
            const opts = `<option value="">-- Select Recipient --</option>` +
                users.filter(u => u.id != currentUser.id).map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${u.role})</option>`).join('');
            const msgHtml = await renderMessagesUI();
            cont.innerHTML = msgHtml + renderComposeForm(opts);
        } else if (tab === 'profile') {
            cont.innerHTML = `<div class="card"><h3>👤 My Profile</h3>
                <label>Name</label><input id="stuName" value="${escapeHtml(currentUser.name)}">
                <label>Email</label><input id="stuEmail" value="${escapeHtml(currentUser.email)}">
                <label>Phone</label><input id="stuPhone" value="${escapeHtml(currentUser.phone||'')}">
                <p><strong>Roll/ID:</strong> ${escapeHtml(currentUser.rollNo || 'Not assigned')}</p>
                <button onclick="updateStudentProfile()">Update Profile</button>
                <button onclick="showChangePasswordModal()" style="margin-top:10px; background:#f9a826; color:#1e4663;">Change Password</button>
            </div>`;
        }
    } catch (e) {
        cont.innerHTML = `<div class="card"><p style="color:#c44536;">⚠️ Error loading content: ${e.message}</p></div>`;
    }
}

window.updateStudentProfile = async () => {
    try {
        const updated = await apiPut(`/users/${currentUser.id}`, {
            name:  document.getElementById('stuName').value,
            email: document.getElementById('stuEmail').value,
            phone: document.getElementById('stuPhone').value
        });
        currentUser = { ...currentUser, ...updated };
        sessionStorage.setItem('sc_user', JSON.stringify(currentUser));
        showToast('Profile updated');
        renderDashboard();
    } catch (e) { showToast('Update failed', 'error'); }
};

/* ============================================================
   TEACHER UI
   ============================================================ */
function buildTeacherUI() {
    const nav = document.getElementById('dynamicNav');
    nav.innerHTML = `
        <button class="nav-btn" data-tab="subjects">My Subjects</button>
        <button class="nav-btn" data-tab="routine">My Routine</button>
        <button class="nav-btn" data-tab="uploadmarks">📊 Upload Marks</button>
        <button class="nav-btn" data-tab="marksheet">📋 Mark Sheet</button>
        <button class="nav-btn" data-tab="markattendance">✅ Mark Attendance</button>
        <button class="nav-btn" data-tab="viewattendance">📋 View Attendance</button>
        <button class="nav-btn" data-tab="notices">Notices</button>
        <button class="nav-btn" data-tab="privatemessages">📩 Private Msg</button>
        <button class="nav-btn" data-tab="profile">Profile</button>`;
    document.querySelectorAll('.nav-btn').forEach(btn =>
        btn.addEventListener('click', () => loadTeacherContent(btn.dataset.tab)));
    loadTeacherContent('subjects');
    updateNoticeBadge();
}

async function renderSubjectSelector(action) {
    const subjects = await apiGet('/subjects/my');
    if (!subjects.length) return '<p>No subjects assigned to you.</p>';
    let html = `<div class="two-columns">`;
    subjects.forEach(sub => {
        html += `<div class="column">
            <div class="subject-card"
                onclick="selectSubjectForAction(${sub.courseId},'${escapeHtml(sub.subjectId)}','${escapeHtml(sub.subjectName)}','${escapeHtml(sub.courseName)}','${escapeHtml(sub.batchName)}')">
                <strong>${escapeHtml(sub.subjectName)}</strong><br>
                Course: ${escapeHtml(sub.courseName)}<br>
                Batch: ${escapeHtml(sub.batchName)}
            </div>
        </div>`;
    });
    return html + `</div>`;
}

window.selectSubjectForAction = (courseId, subjectId, subjectName, courseName, batchName) => {
    window.selectedSubject = { courseId, subjectId, subjectName, courseName, batchName };
    const activeTab = document.querySelector('.nav-btn.active')?.dataset.tab || 'uploadmarks';
    if (activeTab === 'uploadmarks')      showUploadMarksUI();
    else if (activeTab === 'marksheet')   showMarkSheetUI();
    else if (activeTab === 'markattendance') showMarkAttendanceUI();
    else if (activeTab === 'viewattendance') showViewAttendanceUI();
};

async function showUploadMarksUI() {
    const sub = window.selectedSubject;
    if (!sub) {
        const sel = await renderSubjectSelector('uploadmarks');
        document.getElementById('dynamicContent').innerHTML =
            `<div class="card"><h3>Upload Marks</h3>${sel}</div>`;
        return;
    }
    const students = await apiGet(`/users/students-for-course/${sub.courseId}`);
    document.getElementById('dynamicContent').innerHTML = `
        <div class="card"><h3>📊 Upload Marks: ${escapeHtml(sub.subjectName)} (${escapeHtml(sub.courseName)} - ${escapeHtml(sub.batchName)})</h3>
            <label>Exam Name</label><input id="examName" placeholder="e.g., CT-1, Assignment">
            <label>Total Marks</label><input id="totalMarks" type="number" step="0.01">
            <div id="studentMarksList">
                ${students.map(s => `<div class="flex-row">
                    <strong>${escapeHtml(s.rollNo)} - ${escapeHtml(s.name)}</strong>
                    <input type="number" step="0.01" placeholder="Obtained" id="mark_${s.id}">
                </div>`).join('')}
            </div>
            <button onclick="uploadMarks()">Upload Marks</button>
            <button onclick="loadTeacherContent('uploadmarks')" style="margin-left:10px; background:#6c757d;">← Back</button>
        </div>`;
}

window.uploadMarks = async () => {
    const sub   = window.selectedSubject;
    const examName   = document.getElementById('examName').value.trim();
    const totalMarks = parseFloat(document.getElementById('totalMarks').value);
    if (!examName || isNaN(totalMarks) || totalMarks <= 0)
        return showToast('Exam name and valid total marks required', 'error');
    const students = await apiGet(`/users/students-for-course/${sub.courseId}`);
    const entries = [];
    students.forEach(s => {
        const obtained = parseFloat(document.getElementById(`mark_${s.id}`)?.value);
        if (!isNaN(obtained) && obtained >= 0)
            entries.push({ studentId: s.id, courseId: sub.courseId, subjectId: sub.subjectId, examName, obtained, total: totalMarks });
    });
    try {
        await apiPost('/marks/bulk', entries);
        showToast('Marks uploaded successfully');
        loadTeacherContent('uploadmarks');
    } catch (e) { showToast('Upload failed', 'error'); }
};

async function showMarkSheetUI() {
    const sub = window.selectedSubject;
    if (!sub) {
        const sel = await renderSubjectSelector('marksheet');
        document.getElementById('dynamicContent').innerHTML =
            `<div class="card"><h3>Mark Sheet</h3>${sel}</div>`;
        return;
    }
    const [students, allMarks, allAttendance, configData] = await Promise.all([
        apiGet(`/users/students-for-course/${sub.courseId}`),
        apiGet(`/marks?courseId=${sub.courseId}&subjectId=${sub.subjectId}`),
        apiGet(`/attendance?courseId=${sub.courseId}&subjectId=${sub.subjectId}`),
        apiGet(`/marks/config/${sub.courseId}/${sub.subjectId}`).catch(() => ({}))
    ]);
    const allExamNames = [...new Set(allMarks.map(m => m.examName))];
    const subConfig = {
        attendanceTotal: configData.attendanceTotal ?? 0,
        ctExamNames:     configData.ctExamNames     ?? allExamNames.filter(n => n.toUpperCase().includes('CT')),
        bestCtCount:     configData.bestCtCount     ?? 1,
        assignmentTotal: configData.assignmentTotal ?? 0
    };

    let html = `<div class="config-panel">
        <h4>⚙️ Mark Sheet Configuration</h4>
        <div class="flex-row">
            <div style="flex:1"><label>Attendance Total</label><input type="number" id="attTotal" value="${subConfig.attendanceTotal}" step="0.01"></div>
            <div style="flex:1"><label>Best CT Count</label><input type="number" id="bestCtCount" value="${subConfig.bestCtCount}" min="1"></div>
            <div style="flex:1"><label>Regular Assessment</label><input type="number" id="assignTotal" value="${subConfig.assignmentTotal}" step="0.01"></div>
        </div>
        <label>CT Exams (hold Ctrl/Cmd for multi)</label>
        <select id="ctExamSelect" multiple size="3">
            ${allExamNames.map(en => `<option value="${en}" ${subConfig.ctExamNames.includes(en) ? 'selected' : ''}>${escapeHtml(en)}</option>`).join('')}
        </select>
        <button onclick="saveMarkSheetConfig('${sub.courseId}','${sub.subjectId}')" style="margin-top:10px;">Save Config & Refresh</button>
    </div>`;

    html += `<div style="overflow-x:auto;"><table class="mark-sheet-table"><thead><tr>
        <th>SL</th><th>Roll/ID</th><th>Name</th>
        <th>Attendance (${subConfig.attendanceTotal})</th>
        ${subConfig.ctExamNames.map(ct => `<th>${escapeHtml(ct)}<br><button onclick="deleteExamAllStudents('${sub.courseId}','${sub.subjectId}','${ct}')" style="background:#c44536; font-size:0.7rem; padding:2px 8px; margin-top:4px;">🗑️ Delete Exam</button></th>`).join('')}
        <th>CT Avg (Best ${subConfig.bestCtCount})</th>
        <th>Regular Assess. (${subConfig.assignmentTotal})<br><button onclick="deleteExamAllStudents('${sub.courseId}','${sub.subjectId}','Regular Assessment')" style="background:#c44536; font-size:0.7rem; padding:2px 8px; margin-top:4px;">🗑️ Delete Exam</button></th>
        <th>Total</th><th>Action</th>
    </tr></thead><tbody>`;

    students.forEach((s, idx) => {
        const sAtt        = allAttendance.filter(a => a.studentId == s.id);
        const present     = sAtt.filter(r => r.status === 'present').length;
        const attMarks    = sAtt.length ? (present / sAtt.length) * subConfig.attendanceTotal : 0;
        const ctMarks     = subConfig.ctExamNames.map(ct => {
            const m = allMarks.find(m => m.studentId == s.id && m.examName === ct);
            return m ? m.obtained : 0;
        });
        const bestCt      = Math.min(subConfig.bestCtCount, ctMarks.length);
        const ctAvg       = bestCt > 0 ? [...ctMarks].sort((a,b)=>b-a).slice(0,bestCt).reduce((a,b)=>a+b,0)/bestCt : 0;
        const assignMark  = allMarks.find(m => m.studentId == s.id && m.examName === 'Regular Assessment');
        const assignVal   = assignMark ? assignMark.obtained : 0;
        const total       = attMarks + ctAvg + assignVal;

        html += `<tr>
            <td>${idx+1}</td><td>${escapeHtml(s.rollNo||'N/A')}</td><td>${escapeHtml(s.name)}</td>
            <td>${attMarks.toFixed(1)}</td>
            ${ctMarks.map(m => `<td>${m}</td>`).join('')}
            <td>${ctAvg.toFixed(1)}</td>
            <td><input type="number" step="0.01" value="${assignVal}" class="assignment-input" data-student="${s.id}" style="width:80px;"></td>
            <td class="total-cell" id="total_${s.id}">${total.toFixed(1)}</td>
            <td><button onclick="openEditMarksModal('${sub.courseId}','${sub.subjectId}',${s.id})">Edit Marks</button></td>
        </tr>`;
    });
    html += `</tbody></table>
    <button onclick="saveAllAssignments('${sub.courseId}','${sub.subjectId}')" style="margin-top:15px;">💾 Save All Marks</button>
    </div>`;
    document.getElementById('dynamicContent').innerHTML = html;

    document.querySelectorAll('.assignment-input').forEach(inp => {
        inp.addEventListener('input', function() {
            const sid   = this.dataset.student;
            const cells = this.closest('tr').querySelectorAll('td');
            const att   = parseFloat(cells[3].innerText) || 0;
            const ct    = parseFloat(cells[3 + subConfig.ctExamNames.length + 1].innerText) || 0;
            document.getElementById(`total_${sid}`).innerText = (att + ct + (parseFloat(this.value)||0)).toFixed(1);
        });
    });
}

window.deleteExamAllStudents = async (courseId, subjectId, examName) => {
    if (!confirm(`Delete ALL marks for "${examName}" from all students?`)) return;
    try {
        await apiDelete(`/marks/exam?courseId=${courseId}&subjectId=${subjectId}&examName=${encodeURIComponent(examName)}`);
        showToast(`"${examName}" deleted for all students`);
        showMarkSheetUI();
    } catch(e) { showToast('Delete failed', 'error'); }
};

window.saveMarkSheetConfig = async (courseId, subjectId) => {
    const attTotal  = parseFloat(document.getElementById('attTotal').value);
    const bestCt    = parseInt(document.getElementById('bestCtCount').value);
    const assignTot = parseFloat(document.getElementById('assignTotal').value);
    const ctExamNames = Array.from(document.getElementById('ctExamSelect').selectedOptions).map(o => o.value);
    try {
        await apiPost(`/marks/config`, { courseId, subjectId, attendanceTotal: attTotal, bestCtCount: bestCt, assignmentTotal: assignTot, ctExamNames });
        showToast('Configuration saved');
        showMarkSheetUI();
    } catch (e) { showToast('Save failed', 'error'); }
};

window.saveAllAssignments = async (courseId, subjectId) => {
    const inputs  = document.querySelectorAll('.assignment-input');
    const assignTotal = parseFloat(document.getElementById('assignTotal').value) || 20;
    const entries = [];
    inputs.forEach(inp => {
        entries.push({ studentId: inp.dataset.student, courseId, subjectId, examName: 'Regular Assessment', obtained: parseFloat(inp.value)||0, total: assignTotal });
    });
    try {
        await apiPost('/marks/bulk-assignment', entries);
        showToast('Assignment marks saved');
        showMarkSheetUI();
    } catch (e) { showToast('Save failed', 'error'); }
};

window.openEditMarksModal = async (courseId, subjectId, studentId) => {
    editMarksContext = { courseId, subjectId, studentId };
    const marks   = await apiGet(`/marks?courseId=${courseId}&subjectId=${subjectId}&studentId=${studentId}`);
    const student = await apiGet(`/users/${studentId}`);
    let html = `<div style="max-height:300px; overflow-y:auto;">`;
    marks.forEach(m => {
        html += `<div class="flex-row">
            <strong>${escapeHtml(m.examName)}</strong>
            <input type="number" step="0.01" value="${m.obtained}" id="edit_mark_${m.id}" style="width:80px;">
            <span>/ ${m.total}</span>
            <button onclick="deleteSingleMark(${m.id})" style="background:#c44536; padding:2px 8px; margin-left:10px;">🗑️</button>
        </div>`;
    });
    html += `</div>`;
    document.getElementById('editMarksList').innerHTML = html;
    document.getElementById('editExamInfo').innerHTML = `Editing marks for ${escapeHtml(student.name)} (${escapeHtml(student.rollNo)})`;
    document.getElementById('editMarksModal').style.display = 'flex';
    window._editMarks = marks;
};

window.deleteSingleMark = async (markId) => {
    if (!confirm('Delete this mark?')) return;
    try {
        await apiDelete(`/marks/${markId}`);
        showToast('Mark deleted');
        const { courseId, subjectId, studentId } = editMarksContext;
        openEditMarksModal(courseId, subjectId, studentId);
        showMarkSheetUI();
    } catch (e) {
        showToast('Failed to delete', 'error');
    }
};

document.getElementById('saveMarksEditBtn').onclick = async () => {
    if (!editMarksContext || !window._editMarks) return;
    const updates = window._editMarks.map(m => ({
        id: m.id,
        obtained: parseFloat(document.getElementById(`edit_mark_${m.id}`)?.value) ?? m.obtained
    }));
    try {
        await apiPut('/marks/bulk-edit', updates);
        showToast('Marks updated');
        document.getElementById('editMarksModal').style.display = 'none';
        showMarkSheetUI();
    } catch (e) { showToast('Update failed', 'error'); }
};

document.getElementById('cancelMarksEditBtn').onclick = () => {
    document.getElementById('editMarksModal').style.display = 'none';
};

async function showMarkAttendanceUI() {
    const sub = window.selectedSubject;
    if (!sub) {
        const sel = await renderSubjectSelector('markattendance');
        document.getElementById('dynamicContent').innerHTML =
            `<div class="card"><h3>Mark Attendance</h3>${sel}</div>`;
        return;
    }
    const students = await apiGet(`/users/students-for-course/${sub.courseId}`);
    document.getElementById('dynamicContent').innerHTML = `
        <div class="card"><h3>✅ Mark Attendance: ${escapeHtml(sub.subjectName)} (${escapeHtml(sub.courseName)} - ${escapeHtml(sub.batchName)})</h3>
            <label>Date</label><input type="date" id="attDate">
            <div class="flex-row">
                <button onclick="setAllPresent()">All Present</button>
                <button onclick="setAllAbsent()">All Absent</button>
            </div>
            <table class="attendance-table">
                <thead><tr><th>SL</th><th>Roll/ID</th><th>Name</th><th>Present</th><th>Absent</th><th>Late</th></tr></thead>
                <tbody>
                    ${students.map((s,idx) => `<tr>
                        <td>${idx+1}</td><td>${escapeHtml(s.rollNo||'N/A')}</td><td>${escapeHtml(s.name)}</td>
                        <td><input type="radio" name="att_${s.id}" value="present"></td>
                        <td><input type="radio" name="att_${s.id}" value="absent"></td>
                        <td><input type="radio" name="att_${s.id}" value="late"></td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <button onclick="submitAttendance()">Save Attendance</button>
            <button onclick="loadTeacherContent('markattendance')" style="margin-left:10px; background:#6c757d;">← Back</button>
        </div>`;
    window.setAllPresent = () => students.forEach(s => document.querySelector(`input[name="att_${s.id}"][value="present"]`).checked = true);
    window.setAllAbsent  = () => students.forEach(s => document.querySelector(`input[name="att_${s.id}"][value="absent"]`).checked  = true);
}

window.submitAttendance = async () => {
    const sub  = window.selectedSubject;
    const date = document.getElementById('attDate').value;
    if (!date) return showToast('Select date', 'error');
    const students = await apiGet(`/users/students-for-course/${sub.courseId}`);
    const entries = [];
    students.forEach(s => {
        const sel = document.querySelector(`input[name="att_${s.id}"]:checked`);
        if (sel) entries.push({ studentId: s.id, courseId: sub.courseId, subjectId: sub.subjectId, date, status: sel.value });
    });
    try {
        await apiPost('/attendance/bulk', entries);
        showToast('Attendance saved');
        loadTeacherContent('markattendance');
    } catch (e) { showToast('Save failed', 'error'); }
};

async function showViewAttendanceUI() {
    const sub = window.selectedSubject;
    if (!sub) {
        const sel = await renderSubjectSelector('viewattendance');
        document.getElementById('dynamicContent').innerHTML =
            `<div class="card"><h3>View Attendance</h3>${sel}</div>`;
        return;
    }
    const [students, allAtt] = await Promise.all([
        apiGet(`/users/students-for-course/${sub.courseId}`),
        apiGet(`/attendance?courseId=${sub.courseId}&subjectId=${sub.subjectId}`)
    ]);
    let html = `<div class="card"><h3>📋 Attendance Records: ${escapeHtml(sub.subjectName)}</h3>`;
    for (const s of students) {
        const records = allAtt.filter(a => a.studentId == s.id).sort((a,b) => new Date(b.date)-new Date(a.date));
        if (!records.length) continue;
        const present = records.filter(r => r.status==='present').length;
        const absent  = records.filter(r => r.status==='absent').length;
        const late    = records.filter(r => r.status==='late').length;
        const total   = records.length;
        html += `<h4>${escapeHtml(s.rollNo)} — ${escapeHtml(s.name)}</h4>
            <p><strong>Present:</strong>${present} | <strong>Absent:</strong>${absent} | <strong>Late:</strong>${late} | <strong>Total:</strong>${total} (${total?(present/total*100).toFixed(1):0}%)</p>
            <table class="attendance-table"><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>
            ${records.map(r => `<tr><td>${new Date(r.date).toLocaleDateString()}</td><td>${r.status}</td></tr>`).join('')}
            </tbody></table><br>`;
    }
    html += `<button onclick="loadTeacherContent('viewattendance')" style="margin-top:12px;">← Back</button></div>`;
    document.getElementById('dynamicContent').innerHTML = html;
}

async function loadTeacherContent(tab) {
    const cont = document.getElementById('dynamicContent');
    setActiveTab(tab);
    try {
        if (tab === 'subjects') {
            const subjects = await apiGet('/subjects/my');
            let html = `<div class="card"><h3>📚 My Subjects</h3><div class="two-columns">`;
            if (!subjects.length) html += '<p>No subjects assigned.</p>';
            subjects.forEach(sub => {
                html += `<div class="column"><div class="subject-card">
                    <strong>${escapeHtml(sub.subjectName)}</strong><br>
                    Course: ${escapeHtml(sub.courseName)}<br>
                    Batch: ${escapeHtml(sub.batchName)}
                </div></div>`;
            });
            html += `</div></div>`;
            cont.innerHTML = html;
        } else if (tab === 'routine') {
            const data = await apiGet('/routines/my');
            cont.innerHTML = `<div class="card"><h3>🗓️ My Teaching Routine</h3>${renderTimetable(data.routines, data.periods)}</div>`;
        } else if (tab === 'uploadmarks') {
            window.selectedSubject = null;
            const sel = await renderSubjectSelector('uploadmarks');
            cont.innerHTML = `<div class="card"><h3>📊 Upload Marks — Select Subject</h3>${sel}</div>`;
        } else if (tab === 'marksheet') {
            window.selectedSubject = null;
            const sel = await renderSubjectSelector('marksheet');
            cont.innerHTML = `<div class="card"><h3>📋 Mark Sheet — Select Subject</h3>${sel}</div>`;
        } else if (tab === 'markattendance') {
            window.selectedSubject = null;
            const sel = await renderSubjectSelector('markattendance');
            cont.innerHTML = `<div class="card"><h3>✅ Mark Attendance — Select Subject</h3>${sel}</div>`;
        } else if (tab === 'viewattendance') {
            window.selectedSubject = null;
            const sel = await renderSubjectSelector('viewattendance');
            cont.innerHTML = `<div class="card"><h3>📋 View Attendance — Select Subject</h3>${sel}</div>`;
        } else if (tab === 'notices') {
            await loadCombinedNotices();
        } else if (tab === 'privatemessages') {
            const users = await apiGet('/users?role=student,admin');
            const opts = `<option value="">-- Select Recipient --</option>` +
                users.filter(u=>u.id!=currentUser.id).map(u=>`<option value="${u.id}">${escapeHtml(u.name)} (${u.role})</option>`).join('');
            const msgHtml = await renderMessagesUI();
            cont.innerHTML = msgHtml + renderComposeForm(opts);
        } else if (tab === 'profile') {
            cont.innerHTML = `<div class="card"><h3>👤 My Profile</h3>
                <label>Name</label><input id="teacherName" value="${escapeHtml(currentUser.name)}">
                <label>Email</label><input id="teacherEmail" value="${escapeHtml(currentUser.email)}">
                <label>Phone</label><input id="teacherPhone" value="${escapeHtml(currentUser.phone||'')}">
                <button onclick="updateTeacherProfile()">Update Profile</button>
                <button onclick="showChangePasswordModal()" style="margin-top:10px; background:#f9a826; color:#1e4663;">Change Password</button>
            </div>`;
        }
    } catch (e) {
        cont.innerHTML = `<div class="card"><p style="color:#c44536;">⚠️ ${e.message}</p></div>`;
    }
}

window.updateTeacherProfile = async () => {
    try {
        const updated = await apiPut(`/users/${currentUser.id}`, {
            name:  document.getElementById('teacherName').value,
            email: document.getElementById('teacherEmail').value,
            phone: document.getElementById('teacherPhone').value
        });
        currentUser = { ...currentUser, ...updated };
        sessionStorage.setItem('sc_user', JSON.stringify(currentUser));
        showToast('Profile updated');
        renderDashboard();
    } catch (e) { showToast('Update failed', 'error'); }
};

/* ============================================================
   ADMIN UI
   ============================================================ */
function buildAdminUI() {
    const nav = document.getElementById('dynamicNav');
    nav.innerHTML = `
        <button class="nav-btn" data-tab="courses">📚 Courses</button>
        <button class="nav-btn" data-tab="routine">🗓️ Routine</button>
        <button class="nav-btn" data-tab="batches">🏷️ Batches</button>
        <button class="nav-btn" data-tab="students">Students</button>
        <button class="nav-btn" data-tab="teachers">Teachers</button>
        <button class="nav-btn" data-tab="notices">Notices</button>
        <button class="nav-btn" data-tab="payments">Payments</button>
        <button class="nav-btn" data-tab="privatemessages">📩 Private Msg</button>
        <button class="nav-btn" data-tab="profile">Profile</button>`;
    document.querySelectorAll('.nav-btn').forEach(btn =>
        btn.addEventListener('click', () => loadAdminContent(btn.dataset.tab)));
    loadAdminContent('courses');
    updateNoticeBadge();
}

async function loadAdminContent(tab) {
    const cont = document.getElementById('dynamicContent');
    setActiveTab(tab);
    try {
        if (tab === 'courses') {
            const [courses, batches, teachers] = await Promise.all([
                apiGet('/courses'), apiGet('/batches'), apiGet('/users?role=teacher')
            ]);
            let html = `<div class="card"><h3>📚 Courses & Subjects</h3>`;
            courses.forEach(c => {
                const bName = batches.find(b=>b.id==c.batchId)?.name || 'N/A';
                html += `<div style="border:1px solid #eef2f7; border-radius:20px; padding:12px; margin-bottom:12px;">
                    <b>${escapeHtml(c.name)}</b> (Fee:${c.fee}) Batch:${escapeHtml(bName)}<br>
                    <strong>Subjects:</strong>
                    ${c.subjects.map(s=>`<span style="background:#eef2f7; padding:4px 12px; border-radius:40px; margin:2px;">
                        ${escapeHtml(s.name)} (${teachers.find(t=>t.id==s.teacherId)?.name||'No teacher'})
                        <button onclick="deleteSubject(${c.id},${s.id})" style="background:#c44536; padding:2px 8px;">✖</button>
                    </span>`).join(' ')}<br>
                    <button onclick="showAddSubjectForm(${c.id})">+ Add Subject</button>
                    <button onclick="deleteCourse(${c.id})" style="background:#c44536;">Delete Course</button>
                    <div id="addSubj-${c.id}" style="display:none; margin-top:10px;">
                        <label>Subject Name</label><input id="newSubjName-${c.id}" placeholder="Subject">
                        <label>Teacher</label>
                        <select id="newSubjTeacher-${c.id}">
                            ${teachers.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
                        </select>
                        <button onclick="addSubjectToCourse(${c.id})">Add Subject</button>
                    </div>
                </div>`;
            });
            html += `<hr><h4>Create New Course</h4>
                <div class="flex-row">
                    <div style="flex:1"><label>Course Name</label><input id="newCourseName"></div>
                    <div style="flex:1"><label>Fee (Tk)</label><input id="newCourseFee" type="number"></div>
                    <div style="flex:1"><label>Batch</label>
                        <select id="newCourseBatch">${batches.map(b=>`<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}</select>
                    </div>
                    <button onclick="createCourse()" style="align-self:flex-end;">Create</button>
                </div>
            </div>`;
            cont.innerHTML = html;

            window.showAddSubjectForm = id => {
                const d = document.getElementById(`addSubj-${id}`);
                if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
            };
            window.addSubjectToCourse = async id => {
                const name = document.getElementById(`newSubjName-${id}`).value;
                const tid  = document.getElementById(`newSubjTeacher-${id}`).value;
                if (!name || !tid) return showToast('Subject name and teacher required', 'error');
                try { await apiPost(`/courses/${id}/subjects`, { name, teacherId: tid }); loadAdminContent('courses'); }
                catch (e) { showToast('Failed', 'error'); }
            };
            window.deleteSubject = async (cid, sid) => {
                try { await apiDelete(`/subjects/${sid}`); loadAdminContent('courses'); }
                catch (e) { showToast('Failed', 'error'); }
            };
            window.createCourse = async () => {
                const name = document.getElementById('newCourseName').value;
                const fee  = parseInt(document.getElementById('newCourseFee').value);
                const bid  = document.getElementById('newCourseBatch').value;
                if (!name || isNaN(fee)) return showToast('Valid name and fee required', 'error');
                try { await apiPost('/courses', { name, fee, batchId: bid }); loadAdminContent('courses'); }
                catch (e) { showToast('Failed', 'error'); }
            };
            window.deleteCourse = async id => {
                if (!confirm('⚠️ Delete this course and all related data?')) return;
                try { await apiDelete(`/courses/${id}`); loadAdminContent('courses'); }
                catch (e) { showToast('Failed', 'error'); }
            };

        } else if (tab === 'routine') {
            const [courses, periods, routines] = await Promise.all([
                apiGet('/courses'), apiGet('/periods'), apiGet('/routines')
            ]);
            cont.innerHTML = `
                <div class="card"><h3>⏰ Time Periods</h3>
                    <div class="flex-row">
                        <div style="flex:1"><label>Label</label><input id="periodLabel" placeholder="1st Period"></div>
                        <div style="flex:1"><label>Start</label><input type="time" id="periodStart"></div>
                        <div style="flex:1"><label>End</label><input type="time" id="periodEnd"></div>
                        <button onclick="addPeriod()">Add Period</button>
                    </div>
                    <div id="periodsList"></div>
                </div>
                <div class="card"><h3>📅 Assign Class (Multi‑period)</h3>
                    <div class="flex-row">
                        <div style="flex:1"><label>Course</label>
                            <select id="routineCourse">
                                <option value="">-- Course --</option>
                                ${courses.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex:1"><label>Subject</label>
                            <select id="routineSubject" disabled><option>-- Select course first --</option></select>
                        </div>
                    </div>
                    <div class="flex-row">
                        <div style="flex:1"><label>Day</label>
                            <select id="routineDay">
                                ${["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"].map(d=>`<option>${d}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex:1"><label>Start Period</label>
                            <select id="startPeriod">
                                <option value="">-- Select --</option>
                                ${periods.map(p=>`<option value="${p.id}">${escapeHtml(p.label)}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex:1"><label>End Period</label>
                            <select id="endPeriod">
                                <option value="">-- Select --</option>
                                ${periods.map(p=>`<option value="${p.id}">${escapeHtml(p.label)}</option>`).join('')}
                            </select>
                        </div>
                        <div style="flex:1"><label>Room</label><input id="roomNo" placeholder="Room number"></div>
                        <button onclick="addRoutine()">Add Routine</button>
                    </div>
                    <div id="routineListAdmin"></div>
                    <div id="timetablePreview"></div>
                </div>`;

            renderPeriodsListAdmin(periods);
            renderRoutineListAdmin(routines, courses, periods);

            const courseSelect = document.getElementById('routineCourse');
            courseSelect.addEventListener('change', async function() {
                const cid    = this.value;
                const subSel = document.getElementById('routineSubject');
                if (!cid) { subSel.innerHTML='<option>-- Select course first --</option>'; subSel.disabled=true; return; }
                const course = courses.find(c=>c.id==cid);
                if (course?.subjects?.length) {
                    subSel.innerHTML = course.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
                    subSel.disabled = false;
                } else { subSel.innerHTML='<option>No subjects</option>'; subSel.disabled=true; }
            });

            const lastCourse = sessionStorage.getItem('lastSelectedCourseId');
            if (lastCourse) {
                courseSelect.value = lastCourse;
                courseSelect.dispatchEvent(new Event('change'));
            }

            window.addPeriod = async () => {
                const label = document.getElementById('periodLabel').value;
                const start = document.getElementById('periodStart').value;
                const end   = document.getElementById('periodEnd').value;
                const order = 0;
                if (!label || !start || !end) return showToast('All period fields required', 'error');
                try { await apiPost('/periods', { label, startTime: start, endTime: end, orderIndex: order }); loadAdminContent('routine'); }
                catch (e) { showToast('Failed', 'error'); }
            };
            window.deletePeriod = async id => {
                try { await apiDelete(`/periods/${id}`); loadAdminContent('routine'); }
                catch (e) { showToast('Failed', 'error'); }
            };
            window.addRoutine = async () => {
                const payload = {
                    courseId:      document.getElementById('routineCourse').value,
                    subjectId:     document.getElementById('routineSubject').value,
                    day:           document.getElementById('routineDay').value,
                    startPeriodId: document.getElementById('startPeriod').value,
                    endPeriodId:   document.getElementById('endPeriod').value,
                    room:          document.getElementById('roomNo').value || 'TBA'
                };
                if (!payload.courseId || !payload.subjectId || !payload.startPeriodId || !payload.endPeriodId)
                    return showToast('Fill all fields', 'error');
                try {
                    await apiPost('/routines', payload);
                    sessionStorage.setItem('lastSelectedCourseId', payload.courseId);
                    showToast('Routine added');
                    loadAdminContent('routine');
                } catch (e) { showToast(e.message || 'Conflict or error', 'error'); }
            };
            window.deleteRoutine = async id => {
                try { await apiDelete(`/routines/${id}`); loadAdminContent('routine'); }
                catch (e) { showToast('Failed', 'error'); }
            };

        } else if (tab === 'batches') {
            const batches = await apiGet('/batches');
            cont.innerHTML = `<div class="card"><h3>🏷️ Batches</h3>
                ${batches.map(b=>`<div class="flex-row">
                    <b>${escapeHtml(b.name)}</b>
                    <button onclick="deleteBatch(${b.id})" style="background:#c44536;">Delete</button>
                </div>`).join('')}
                <hr><label>New Batch Name</label><input id="newBatchName">
                <button onclick="addBatch()">Add Batch</button>
            </div>`;
            window.addBatch = async () => {
                const name = document.getElementById('newBatchName').value;
                if (!name) return showToast('Batch name required', 'error');
                try { await apiPost('/batches', { name }); loadAdminContent('batches'); }
                catch (e) { showToast('Failed', 'error'); }
            };
            window.deleteBatch = async id => {
                try { await apiDelete(`/batches/${id}`); loadAdminContent('batches'); }
                catch (e) { showToast('Failed', 'error'); }
            };

        } else if (tab === 'students') {
            const [batches] = await Promise.all([apiGet('/batches')]);
            let html = `<div class="card"><h3>Students by Batch</h3>
                <div id="batchButtonsContainer">
                    ${batches.map(b=>`<button class="batch-btn" data-batch-id="${b.id}">${escapeHtml(b.name)}</button>`).join('')}
                </div>
                <div id="batchStudentsList"></div><hr>
                <h4>Add New Student</h4>
                <div class="flex-row">
                    <div><label>Name</label><input id="newStName"></div>
                    <div><label>Email</label><input id="newStEmail"></div>
                    <div><label>Phone</label><input id="newStPhone"></div>
                    <div><label>Password</label><input id="newStPass"></div>
                    <div><label>Roll/ID</label><input id="newStRoll"></div>
                    <div><label>Batch</label>
                        <select id="newStBatch">${batches.map(b=>`<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}</select>
                    </div>
                    <button onclick="addStudent()">Add Student</button>
                </div>
            </div>`;
            cont.innerHTML = html;

            document.querySelectorAll('.batch-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const batchId = btn.getAttribute('data-batch-id');
                    const students = await apiGet(`/users?role=student&batchId=${batchId}`);
                    const listDiv  = document.getElementById('batchStudentsList');
                    if (!students.length) { listDiv.innerHTML='<p>No students in this batch.</p>'; return; }
                    listDiv.innerHTML = `<table class="attendance-table">
                        <thead><tr><th>Roll/ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
                        <tbody>${students.map(s=>`<tr>
                            <td>${escapeHtml(s.rollNo||'N/A')}</td><td>${escapeHtml(s.name)}</td>
                            <td>${escapeHtml(s.email)}</td><td>${escapeHtml(s.phone||'')}</td>
                            <td>
                                <button onclick="openEditUserModal(${s.id},'student')">Edit</button>
                                <button onclick="deleteUser(${s.id})" style="background:#c44536;">Remove</button>
                            </td>
                        </tr>`).join('')}</tbody>
                    </table>`;
                });
            });

            window.addStudent = async () => {
                try {
                    await apiPost('/users', {
                        name:   document.getElementById('newStName').value,
                        email:  document.getElementById('newStEmail').value,
                        phone:  document.getElementById('newStPhone').value,
                        password: document.getElementById('newStPass').value,
                        rollNo: document.getElementById('newStRoll').value,
                        batchId:  document.getElementById('newStBatch').value,
                        role: 'student'
                    });
                    showToast('Student added');
                    loadAdminContent('students');
                } catch (e) { showToast(e.message || 'Failed', 'error'); }
            };
            window.deleteUser = async uid => {
                try { await apiDelete(`/users/${uid}`); loadAdminContent(document.querySelector('.nav-btn.active')?.dataset.tab || 'students'); }
                catch (e) { showToast('Failed', 'error'); }
            };

        } else if (tab === 'teachers') {
            const teachers = await apiGet('/users?role=teacher');
            cont.innerHTML = `<div class="card"><h3>Teachers</h3>
                <table class="attendance-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
                    <tbody>${teachers.map(t=>`<tr>
                        <td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.email)}</td><td>${escapeHtml(t.phone||'')}</td>
                        <td>
                            <button onclick="openEditUserModal(${t.id},'teacher')">Edit</button>
                            <button onclick="deleteUser(${t.id})" style="background:#c44536;">Remove</button>
                        </td>
                    </tr>`).join('')}</tbody>
                </table>
                <hr><h4>Add New Teacher</h4>
                <div class="flex-row">
                    <div><label>Name</label><input id="newTName"></div>
                    <div><label>Email</label><input id="newTEmail"></div>
                    <div><label>Phone</label><input id="newTPhone"></div>
                    <div><label>Password</label><input id="newTPass"></div>
                    <button onclick="addTeacher()">Add Teacher</button>
                </div>
            </div>`;
            window.addTeacher = async () => {
                try {
                    await apiPost('/users', {
                        name:   document.getElementById('newTName').value,
                        email:  document.getElementById('newTEmail').value,
                        phone:  document.getElementById('newTPhone').value,
                        password: document.getElementById('newTPass').value,
                        role: 'teacher'
                    });
                    showToast('Teacher added');
                    loadAdminContent('teachers');
                } catch (e) { showToast(e.message || 'Failed', 'error'); }
            };
            window.deleteUser = async uid => {
                try { await apiDelete(`/users/${uid}`); loadAdminContent('teachers'); }
                catch (e) { showToast('Failed', 'error'); }
            };

        } else if (tab === 'notices') {
            await loadCombinedNotices();
        } else if (tab === 'payments') {
            const pays = await apiGet('/payments');
            cont.innerHTML = `<div class="card"><h3>💰 Payment Records</h3>
                ${pays.map(p=>`<div>${escapeHtml(p.studentRoll||'')} - ${escapeHtml(p.studentName||'')} paid ${p.amount} Tk for ${escapeHtml(p.courseName||'')} — ${escapeHtml(p.description||'')} (Ref: ${escapeHtml(p.reference)})</div>`).join('') || '<p>No payments.</p>'}
            </div>`;
        } else if (tab === 'privatemessages') {
            const users = await apiGet('/users');
            const opts  = `<option value="">-- Send Private Message --</option>` +
                users.filter(u=>u.id!=currentUser.id).map(u=>`<option value="${u.id}">${escapeHtml(u.name)} (${u.role})</option>`).join('');
            const msgHtml = await renderMessagesUI();
            cont.innerHTML = msgHtml + renderComposeForm(opts);
        } else if (tab === 'profile') {
            cont.innerHTML = `<div class="card"><h3>👤 Admin Profile</h3>
                <label>Name</label><input id="adminName" value="${escapeHtml(currentUser.name)}">
                <label>Email</label><input id="adminEmail" value="${escapeHtml(currentUser.email)}">
                <label>Phone</label><input id="adminPhone" value="${escapeHtml(currentUser.phone||'')}">
                <button onclick="updateAdminProfile()">Update Profile</button>
                <button onclick="showChangePasswordModal()" style="margin-top:10px; background:#f9a826; color:#1e4663;">Change Password</button>
            </div>`;
        }
    } catch (e) {
        cont.innerHTML = `<div class="card"><p style="color:#c44536;">⚠️ ${e.message}</p></div>`;
    }
}

window.updateAdminProfile = async () => {
    try {
        const updated = await apiPut(`/users/${currentUser.id}`, {
            name:  document.getElementById('adminName').value,
            email: document.getElementById('adminEmail').value,
            phone: document.getElementById('adminPhone').value
        });
        currentUser = { ...currentUser, ...updated };
        sessionStorage.setItem('sc_user', JSON.stringify(currentUser));
        showToast('Profile updated');
        renderDashboard();
    } catch (e) { showToast('Update failed', 'error'); }
};

/* ---- Edit User Modal (Admin) ---- */
window.openEditUserModal = async (userId, role) => {
    const user = await apiGet(`/users/${userId}`);
    document.getElementById('editUserId').value  = userId;
    document.getElementById('editName').value    = user.name;
    document.getElementById('editEmail').value   = user.email;
    document.getElementById('editPhone').value   = user.phone || '';
    const sf = document.getElementById('editStudentFields');
    if (role === 'student') {
        sf.style.display = 'block';
        document.getElementById('editRoll').value = user.rollNo || '';
        document.getElementById('editUserTitle').innerText = 'Edit Student';
        await populateBatchSelect('editBatch', user.batchId);
    } else {
        sf.style.display = 'none';
        document.getElementById('editUserTitle').innerText = 'Edit Teacher';
    }
    document.getElementById('editUserModal').style.display = 'flex';
};

document.getElementById('saveUserEditBtn').onclick = async () => {
    const userId = document.getElementById('editUserId').value;
    const payload = {
        name:  document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value
    };
    const sf = document.getElementById('editStudentFields');
    if (sf.style.display !== 'none') {
        payload.rollNo  = document.getElementById('editRoll').value;
        payload.batchId = document.getElementById('editBatch').value;
    }
    try {
        await apiPut(`/users/${userId}`, payload);
        showToast('User updated');
        document.getElementById('editUserModal').style.display = 'none';
        const activeTab = document.querySelector('.nav-btn.active')?.dataset.tab;
        if (activeTab) loadAdminContent(activeTab);
    } catch (e) { showToast(e.message || 'Update failed', 'error'); }
};

document.getElementById('cancelUserEditBtn').onclick = () => {
    document.getElementById('editUserModal').style.display = 'none';
};

/* ---- Admin helper renderers ---- */
function renderPeriodsListAdmin(periods) {
    const container = document.getElementById('periodsList');
    if (!container) return;
    if (!periods.length) { container.innerHTML = '<p>No periods. Add periods above.</p>'; return; }
    container.innerHTML = `<div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${periods.map(p=>`<div style="background:#eef2f7; border-radius:40px; padding:6px 14px;">
            <strong>${escapeHtml(p.label)}</strong> ${format12Hour(p.startTime)} - ${format12Hour(p.endTime)}
            <button onclick="deletePeriod(${p.id})" style="background:#c44536; padding:4px 12px;">🗑️</button>
        </div>`).join('')}
    </div>`;
}

function renderRoutineListAdmin(routines, courses, periods) {
    const container = document.getElementById('routineListAdmin');
    const preview   = document.getElementById('timetablePreview');
    if (!container) return;
    let html = `<table border="1"><thead><tr><th>Course</th><th>Subject</th><th>Teacher</th><th>Day</th><th>Period Range</th><th>Room</th><th>Action</th></tr></thead><tbody>`;
    routines.forEach(r => {
        html += `<tr>
            <td>${escapeHtml(r.courseName||'')}</td><td>${escapeHtml(r.subjectName||'')}</td>
            <td>${escapeHtml(r.teacherName||'')}</td><td>${r.day}</td>
            <td>${escapeHtml(r.startPeriodLabel||'')} - ${escapeHtml(r.endPeriodLabel||'')}</td>
            <td>${escapeHtml(r.room||'')}</td>
            <td><button onclick="deleteRoutine(${r.id})">Delete</button></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
    if (preview) preview.innerHTML = renderTimetable(routines, periods);
}

/* ---- Active tab helper ---- */
function setActiveTab(tab) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
}
