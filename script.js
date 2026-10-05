// ========== DATOS ==========
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

// Empieza vacío - tu papá agrega las cuentas
let accounts = [];
let paidStatus = {}; // { "accountId-year-month": true }
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let calendarYear = currentYear;
let calendarMonth = currentMonth;

// ========== LOCAL STORAGE ==========
function loadData() {
  const savedAccounts = localStorage.getItem("cuentas_accounts");
  const savedPaid = localStorage.getItem("cuentas_paid");
  
  if (savedAccounts) {
    accounts = JSON.parse(savedAccounts);
  }
  
  if (savedPaid) {
    paidStatus = JSON.parse(savedPaid);
  }
}

function saveAccounts() {
  localStorage.setItem("cuentas_accounts", JSON.stringify(accounts));
}

function savePaid() {
  localStorage.setItem("cuentas_paid", JSON.stringify(paidStatus));
}

// ========== HELPERS ==========
function getKey(accountId, year, month) {
  return `${accountId}-${year}-${month}`;
}

function isPaid(accountId, year, month) {
  return !!paidStatus[getKey(accountId, year, month)];
}

function togglePaid(accountId, year, month) {
  const key = getKey(accountId, year, month);
  paidStatus[key] = !paidStatus[key];
  savePaid();
  renderAll();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // 0 = Domingo → convertir a 0 = Lunes
  let day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function daysUntilDue(account) {
  const today = new Date();
  today.setHours(0,0,0,0);
  let due = new Date(today.getFullYear(), today.getMonth(), account.day);
  
  // Si el día de vencimiento ya pasó este mes, miramos el próximo mes
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, account.day);
  }
  
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diff;
}

// ========== RENDER TABLA ==========
function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (accounts.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 13;
    td.className = "empty-state";
    td.innerHTML = `Todavía no hay cuentas.<br>Tocá el botón <strong>+ Nueva cuenta</strong> para agregar la primera.`;
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();

  accounts.forEach(acc => {
    const tr = document.createElement("tr");
    
    // Nombre + monto + botón borrar
    const tdName = document.createElement("td");
    tdName.innerHTML = `
      <div class="account-name-row">
        <div>
          ${acc.name}
          <span class="amount">Día ${acc.day}${acc.amount > 0 ? " · $" + acc.amount : ""}</span>
        </div>
        <button class="delete-btn" onclick="event.stopPropagation(); deleteAccount(${acc.id})" title="Eliminar cuenta">Eliminar</button>
      </div>
    `;
    tr.appendChild(tdName);

    for (let m = 0; m < 12; m++) {
      const td = document.createElement("td");
      td.className = "cell";
      
      const paid = isPaid(acc.id, thisYear, m);
      
      if (paid) {
        td.classList.add("paid");
        td.textContent = "✓";
      } else {
        // Solo avisar si es el mes actual
        if (m === thisMonth) {
          const daysLeft = daysUntilDue(acc);
          if (daysLeft <= 3) {
            td.classList.add("danger");
            td.textContent = "¡Ya!";
          } else if (daysLeft <= 7) {
            td.classList.add("warning");
            td.textContent = daysLeft + "d";
          } else {
            td.textContent = "—";
          }
        } else if (m < thisMonth) {
          td.textContent = "—";
          td.style.opacity = "0.4";
        } else {
          td.textContent = "—";
        }
      }

      td.onclick = () => togglePaid(acc.id, thisYear, m);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });
}

// ========== RENDER CALENDARIO ==========
function renderCalendar() {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  document.getElementById("monthLabel").textContent = 
    `${MONTH_NAMES[calendarMonth]} ${calendarYear}`;

  // Nombres de días
  DAY_NAMES.forEach(d => {
    const el = document.createElement("div");
    el.className = "day-name";
    el.textContent = d;
    cal.appendChild(el);
  });

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfWeek(calendarYear, calendarMonth);
  const today = new Date();

  // Celdas vacías al inicio
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    cal.appendChild(empty);
  }

  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    // ¿Es hoy?
    if (d === today.getDate() && 
        calendarMonth === today.getMonth() && 
        calendarYear === today.getFullYear()) {
      dayEl.classList.add("today");
    }

    // Cuentas que vencen este día
    const dues = accounts.filter(a => a.day === d);
    if (dues.length > 0) {
      dayEl.classList.add("has-due");
    }

    dayEl.innerHTML = `<div class="day-number">${d}</div>`;

    dues.forEach(acc => {
      const paid = isPaid(acc.id, calendarYear, calendarMonth);
      const item = document.createElement("div");
      item.className = "due-item" + (paid ? " paid" : "");
      item.textContent = acc.name + (paid ? " ✓" : "");
      dayEl.appendChild(item);
    });

    cal.appendChild(dayEl);
  }
}

// ========== RENDER ALERTAS ==========
function renderAlerts() {
  const list = document.getElementById("alertsList");
  list.innerHTML = "";

  if (accounts.length === 0) {
    list.innerHTML = `<div class="alert-item ok">Todavía no hay cuentas cargadas. Agregá la primera con el botón <strong>+ Nueva cuenta</strong>.</div>`;
    return;
  }

  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();

  const pending = [];

  accounts.forEach(acc => {
    if (!isPaid(acc.id, thisYear, thisMonth)) {
      const days = daysUntilDue(acc);
      if (days <= 10) {
        pending.push({ acc, days });
      }
    }
  });

  pending.sort((a, b) => a.days - b.days);

  if (pending.length === 0) {
    list.innerHTML = `<div class="alert-item ok">✅ No hay vencimientos cercanos. ¡Todo al día!</div>`;
    return;
  }

  pending.forEach(({ acc, days }) => {
    const div = document.createElement("div");
    let cls = "warning";
    let msg = "";

    if (days < 0) {
      cls = "danger";
      msg = `⚠️ <strong>${acc.name}</strong> venció hace ${Math.abs(days)} día(s)`;
    } else if (days === 0) {
      cls = "danger";
      msg = `🔴 <strong>${acc.name}</strong> vence HOY`;
    } else if (days <= 3) {
      cls = "danger";
      msg = `🟠 <strong>${acc.name}</strong> vence en ${days} día(s)`;
    } else {
      msg = `🟡 <strong>${acc.name}</strong> vence en ${days} días`;
    }

    if (acc.amount > 0) msg += ` · $${acc.amount}`;

    div.className = `alert-item ${cls}`;
    div.innerHTML = msg;
    list.appendChild(div);
  });
}

// ========== NAVEGACIÓN ==========
function changeMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  } else if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }
  renderCalendar();
}

// ========== MODAL ==========
function openModal() {
  document.getElementById("modal").classList.add("show");
  document.getElementById("newName").value = "";
  document.getElementById("newDay").value = "";
  document.getElementById("newAmount").value = "";
  document.getElementById("newName").focus();
}

function closeModal() {
  document.getElementById("modal").classList.remove("show");
}

function addAccount() {
  const name = document.getElementById("newName").value.trim();
  const day = parseInt(document.getElementById("newDay").value);
  const amount = parseFloat(document.getElementById("newAmount").value) || 0;

  if (!name) {
    alert("Poné un nombre para la cuenta");
    return;
  }
  if (isNaN(day) || day < 1 || day > 31) {
    alert("El día debe ser entre 1 y 31");
    return;
  }

  const newId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
  accounts.push({ id: newId, name, day, amount });
  saveAccounts();
  closeModal();
  renderAll();
}

function deleteAccount(id) {
  if (confirm("¿Seguro que querés eliminar esta cuenta?")) {
    accounts = accounts.filter(a => a.id !== id);
    // Limpiar estados de pago de esa cuenta
    Object.keys(paidStatus).forEach(key => {
      if (key.startsWith(id + "-")) delete paidStatus[key];
    });
    saveAccounts();
    savePaid();
    renderAll();
  }
}

// ========== RENDER TODO ==========
function renderAll() {
  renderTable();
  renderCalendar();
  renderAlerts();
}

// ========== INICIO ==========
loadData();
renderAll();

// Cerrar modal con Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

// Cerrar modal haciendo clic fuera
document.getElementById("modal").addEventListener("click", e => {
  if (e.target.id === "modal") closeModal();
});

// Registrar Service Worker (para que funcione como app offline)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("App lista para usar offline"))
      .catch(err => console.log("Service Worker no registrado:", err));
  });
}
