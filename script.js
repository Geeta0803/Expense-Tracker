// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCCycyipl_k07hhT8qp6qgu1mafwBZI_PI",
  authDomain: "expense-tracker-app-5d84d.firebaseapp.com",
  projectId: "expense-tracker-app-5d84d",
  storageBucket: "expense-tracker-app-5d84d.firebasestorage.app",
  messagingSenderId: "972426394937",
  appId: "1:972426394937:web:c4b0d815506be50990fce8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Signup
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert("✅ Signup Successful!");
      document.getElementById("email").value = "";
      document.getElementById("password").value = "";})
    .catch(error => alert("❌ Signup Error: " + error.message));
}

// Login
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("✅ Login Successful!");
      document.getElementById("email").value = "";
      document.getElementById("password").value = "";})
    .catch(error => alert("❌ Login Error: " + error.message));
}

// Logout
function logout() {
  auth.signOut().then(() => alert("Logged out!"));
}

// Track auth state
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("welcome").style.display = "block";
    document.getElementById("user-email").textContent = user.email;
    loadExpenses();
  } else {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("welcome").style.display = "none";
  }
});

// Add Expense
function addExpense() {
  const title = document.getElementById("title").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value.trim();
  const date = document.getElementById("date").value;
  const status = document.getElementById("status").value;
  const user = auth.currentUser;

  if (!title || isNaN(amount) || !category || !date) {
    alert("Please fill all fields correctly.");
  }

  if (!user) {
    alert("Please login to add expenses.");
    return;
  }

  db.collection("expenses").add({
    title,
    amount,
    category,
    date,
    status,
    userId: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    alert("✅ Expense Added!");
    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("category").value = "";
    document.getElementById("date").value = "";
    document.getElementById("status").value = "Unpaid";
    loadExpenses();
  })
  .catch(error => alert("❌ Failed to add: " + error.message));
}

// Load Expenses with Delete Button
function loadExpenses() {
  const user = auth.currentUser;
  if (!user) return;

  const list = document.getElementById("expense-list");
  list.innerHTML = "";

  db.collection("expenses")
    .where("userId", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get()
    .then(snapshot => {
      const allExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      allExpenses.forEach(data => {
        const li = document.createElement("li");
        li.textContent = `${data.date} - ${data.title} - ₹${data.amount} [${data.category}] - ${data.status}`;

        const delIcon = document.createElement("span");
delIcon.innerHTML = "🗑️";
delIcon.style.cursor = "pointer";
delIcon.style.marginLeft = "15px";
delIcon.title = "Delete";
delIcon.onclick = () => deleteExpense(data.id);

        delIcon.onclick = () => deleteExpense(data.id);

        li.appendChild(delIcon);
        list.appendChild(li);
      });

      loadReminders(allExpenses);
      loadDailySummary(allExpenses);
    })
    .catch(error => alert("❌ Error loading: " + error.message));
}

// Delete Expense
function deleteExpense(id) {
  if (confirm("Are you sure you want to delete this expense?")) {
    db.collection("expenses").doc(id).delete()
      .then(() => {
        alert("🗑️ Expense deleted");
        loadExpenses();
      })
      .catch(error => alert("❌ Failed to delete: " + error.message));
  }
}

// Mark as Paid
function updateExpenseStatus(id, newStatus) {
  db.collection("expenses").doc(id).update({ status: newStatus })
    .then(() => {
      alert(`Status updated to ${newStatus}`);
      loadExpenses();
    })
    .catch(error => alert("Error updating status: " + error.message));
}

// Bill Reminders
function loadReminders(expenses) {
  const reminderList = document.getElementById("reminder-list");
  reminderList.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  expenses.forEach(exp => {
    if (!exp.date || exp.status === "Paid") return;

    const expDate = new Date(exp.date);
    expDate.setHours(0, 0, 0, 0);

    const li = document.createElement("li");

    if (expDate > today) {
      const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      li.textContent = `${exp.title} due in ${daysLeft} days (${exp.date})`;
      li.style.color = "orange";
    } else {
      const overdueDays = Math.ceil((today - expDate) / (1000 * 60 * 60 * 24));
      li.textContent = `⚠️ ${exp.title} is overdue by ${overdueDays} days (${exp.date})`;
      li.style.color = "red";
    }

    const markPaidBtn = document.createElement("button");
    markPaidBtn.textContent = "✅ Mark as Paid";
    markPaidBtn.style.marginLeft = "10px";
    markPaidBtn.onclick = () => updateExpenseStatus(exp.id, "Paid");

    li.appendChild(markPaidBtn);
    reminderList.appendChild(li);
  });
}

// Daily Summary with Paid/Due Status
function loadDailySummary(expenses) {
  const summaryListEl = document.getElementById("daily-summary");
  summaryListEl.innerHTML = "";

  const summaryMap = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  expenses.forEach(exp => {
    if (!exp.date || isNaN(exp.amount)) return;

    const dateKey = exp.date;
    const expDate = new Date(exp.date);
    expDate.setHours(0, 0, 0, 0);

    if (!summaryMap[dateKey]) {
      summaryMap[dateKey] = { total: 0, anyUnpaid: false, date: expDate };
    }

    summaryMap[dateKey].total += exp.amount;

    if (exp.status === "Unpaid") {
      summaryMap[dateKey].anyUnpaid = true;
    }
  });

  for (let date in summaryMap) {
    const { total, anyUnpaid, date: expenseDate } = summaryMap[date];
    const li = document.createElement("li");

    let status = "";
    if (!anyUnpaid) {
      status = "✅ Paid/Processed";
      li.classList.add("paid");
    } else if (expenseDate <= today) {
      status = "⚠️ Unpaid (Due)";
      li.classList.add("red");
    } else {
      const daysLeft = Math.ceil((expenseDate - today) / (1000 * 60 * 60 * 24));
      status = `🕓 ${daysLeft} days left`;
      li.classList.add("red");
    }

    li.textContent = `${date} → ₹${total.toFixed(2)} (${status})`;
    summaryListEl.appendChild(li);
  }
}

window.addEventListener("beforeunload", () => {
  auth.signOut();
});





