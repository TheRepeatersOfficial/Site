// Authentication Functions
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        // Check authentication state
        firebase.auth().onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI();
            
            // Check admin status
            if (user) {
                this.checkAdminStatus(user.uid);
            }
        });
    }
    
    updateUI() {
        const userAuth = document.getElementById('userAuth');
        const userMenu = document.getElementById('userMenu');
        
        if (!userAuth && !userMenu) return;
        
        if (this.currentUser) {
            // User is logged in
            if (userAuth) userAuth.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'block';
                document.getElementById('userName').innerHTML = `
                    <i class="fas fa-user-circle"></i> ${this.currentUser.displayName || this.currentUser.email}
                `;
            }
        } else {
            // User is not logged in
            if (userAuth) {
                userAuth.style.display = 'block';
                userAuth.innerHTML = `
                    <a href="login.html" class="btn btn-outline">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                `;
            }
            if (userMenu) userMenu.style.display = 'none';
        }
    }
    
    checkAdminStatus(userId) {
        db.collection('users').doc(userId).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    if (userData.role === 'admin') {
                        const adminLink = document.getElementById('adminLink');
                        if (adminLink) {
                            adminLink.style.display = 'block';
                        }
                    }
                }
            })
            .catch((error) => {
                console.error('Error checking admin status:', error);
            });
    }
    
    logout() {
        firebase.auth().signOut()
            .then(() => {
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Logout error:', error);
                alert('Logout failed: ' + error.message);
            });
    }
}

// Initialize Auth Manager
const authManager = new AuthManager();

// Logout function (attached to logout button if exists)
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authManager.logout();
        });
    }
});
