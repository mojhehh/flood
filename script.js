import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const botinfo = { connected: false, fbdb: null, liveApp: null };

function updateStatus(text) {
  document.getElementById("status").innerText = "Status: " + text;
}
function errorBar(msg) { alert(msg); }

document.getElementById("connectBtn").addEventListener("click", async () => {
  const platform = document.getElementById("platform").value;
  const gameid = document.getElementById("gameid").value.trim();
  const baseName = document.getElementById("name").value.trim();
  const amount = parseInt(document.getElementById("amount").value);

  if (!gameid || !baseName || isNaN(amount) || amount < 1) {
    alert("Enter valid game ID/PIN, name, and number of bots!");
    return;
  }

  updateStatus(`Connecting ${amount} bots to ${platform}...`);

  const promises = [];
  for (let i = 1; i <= amount; i++) {
    const playerName = `${baseName}${i}`;
    if (platform === "blooket") promises.push(connectBlooket(gameid, playerName));
    if (platform === "kahoot") promises.push(connectKahoot(gameid, playerName));
  }

  await Promise.all(promises);
  updateStatus(`All ${amount} bots connected to ${platform}!`);
});

// ----------------- Blooket -----------------
async function connectBlooket(gid, name) {
  const body = await fetch("join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: gid, name })
  }).then(r => r.json());

  if (body.success) {
    const liveApp = initializeApp({
      apiKey: "AIzaSyCA-cTOnX19f6LFnDVVsHXya3k6ByP_MnU",
      authDomain: "blooket-2020.firebaseapp.com",
      projectId: "blooket-2020",
      storageBucket: "blooket-2020.appspot.com",
      messagingSenderId: "741533559105",
      appId: "1:741533559105:web:b8cbb10e6123f2913519c0",
      measurementId: "G-S3H5NGN10Z",
      databaseURL: body.fbShardURL
    }, Date.now().toString() + "-" + name);

    const auth = getAuth(liveApp);
    await signInWithCustomToken(auth, body.fbToken);
    const db = getDatabase(liveApp);
    await set(ref(db, `${gid}/c/${name}`), { b: "Rainbow Astronaut", rt: true });
    console.log(`Blooket bot joined: ${name}`);
  } else console.error("Blooket join failed:", body.msg);
}

// ----------------- Kahoot -----------------
async function connectKahoot(pin, name) {
  return new Promise((resolve, reject) => {
    // Connect to Kahoot WebSocket server
    const ws = new WebSocket("wss://kahoot.it/cometd/");

    ws.onopen = () => {
      // Send join handshake (private test game)
      const joinPayload = {
        channel: `/service/controller?gameid=${pin}`,
        clientId: Math.random().toString(36).substring(2),
        data: {
          type: "join",
          nickname: name,
          gameid: pin
        }
      };
      ws.send(JSON.stringify(joinPayload));
      console.log(`Kahoot bot joined: ${name}`);
      resolve(ws);
    };

    ws.onerror = (err) => {
      console.error(`Kahoot bot ${name} error:`, err);
      resolve(null);
    };
  });
}
