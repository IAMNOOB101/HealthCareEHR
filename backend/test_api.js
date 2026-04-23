const test = async () => {
    try {
        const login = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });
        const loginRes = await login.json();
        const token = loginRes.data.token;
        const pts = await fetch('http://localhost:5000/api/patients?page=1&limit=50', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await pts.json();
        console.log("Success! Fetched:", body);
    } catch (e) {
        console.log("ERROR:", e.message);
    }
};
test();
