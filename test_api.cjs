const fetch = require('node-fetch');
async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "prompt", text: "ciao", prompt: "correggi" })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
run();
