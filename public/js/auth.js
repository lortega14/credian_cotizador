document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const alertBox = document.getElementById('alert-box');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                // Disable button and clear old alerts
                submitBtn.disabled = true;
                submitBtn.textContent = 'Verificando...';
                alertBox.classList.add('hidden');
                
                const response = await window.api.login(email, password);
                
                // Save email for next time
                localStorage.setItem('lastEmail', email);
                
                // Redirect based on role
                if (response.user.role === 'ADMIN') {
                    window.location.replace('admin.html');
                } else {
                    window.location.replace('company.html');
                }
                
            } catch (error) {
                // Show error
                alertBox.textContent = error.message;
                alertBox.classList.remove('hidden');
                alertBox.classList.add('alert-error');
                
                // Reset form button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ingresar';
            }
        });
    }

    // Toggle Password Visibility
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Swap SVG icon
            if (type === 'text') {
                togglePassword.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            } else {
                togglePassword.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            }
        });
    }

    // Logout functionality (attach to any logout button)
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.api.logout();
                // Replace state to avoid going back to dashboard without login
                window.location.replace('index.html');
            } catch (err) {
                console.error('Error logging out:', err);
                // Fallback replace
                window.location.replace('index.html');
            }
        });
    });
});

// Protect routes helper
async function requireAuth(expectedRole = null) {
    const user = await window.api.getMe();
    
    if (!user) {
        window.location.replace('index.html');
        return null;
    }

    if (expectedRole && user.role !== expectedRole) {
        // Not authorized for this page
        if (user.role === 'ADMIN') {
            window.location.replace('admin.html');
        } else {
            window.location.replace('company.html');
        }
        return null;
    }

    return user;
}

window.requireAuth = requireAuth;
