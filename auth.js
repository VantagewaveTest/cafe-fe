// Authentication & Role Management Utility
const AUTH_KEY = 'cafe_auth_user';

function getCurrentUser() {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('cafe_cart');
  window.location.href = 'index.html';
}

function requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = 'index.html';
  }
}

// Update header navigation based on auth status
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const navContainers = document.querySelectorAll('nav');
  
  navContainers.forEach(nav => {
    // If user is logged in, show role badge & logout button
    if (user) {
      // Find or append user info
      let userBadge = nav.querySelector('#user-nav-badge');
      if (!userBadge) {
        userBadge = document.createElement('div');
        userBadge.id = 'user-nav-badge';
        userBadge.className = 'inline-flex items-center gap-3 ml-4 text-xs font-semibold';
        
        const roleEmoji = user.role === 'customer' ? '👤' : user.role === 'chef' ? '👨‍🍳' : '🛎️';
        const dashboardLink = user.role === 'chef' ? 'chef.html' : user.role === 'waiter' ? 'waiter.html' : 'menu.html';
        
        userBadge.innerHTML = `
          <span class="bg-amber-800 text-amber-100 px-2.5 py-1 rounded-lg border border-amber-700">${roleEmoji} ${user.name} (${user.role.toUpperCase()})</span>
          <a href="${dashboardLink}" class="hover:text-amber-300 transition">Dashboard</a>
          <button onclick="logoutUser()" class="bg-red-800/80 hover:bg-red-800 text-white px-2.5 py-1 rounded transition">Logout</button>
        `;
        nav.appendChild(userBadge);
      }
    } else {
      // Show login button if not present
      let loginBtn = nav.querySelector('#login-nav-btn');
      if (!loginBtn && window.location.pathname.indexOf('index.html') === -1) {
        loginBtn = document.createElement('a');
        loginBtn.id = 'login-nav-btn';
        loginBtn.href = 'index.html';
        loginBtn.className = 'bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition ml-3';
        loginBtn.textContent = 'Login / Portal';
        nav.appendChild(loginBtn);
      }
    }
  });
});
