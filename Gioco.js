// gioco.js - Tappa 1: legge il foglio e disegna il livello (il giocatore non si muove ancora)

// ---------- DATI DEL FOGLIO ----------

// Stesso foglio pubblicato del resto del sito: l'ID NON va cambiato
const ID_FOGLIO = "2PACX-1vQJxyF8o1r1sfCJ_09WYwLJ-wOueTSdbtSPvcBwSEIM48gcy7Qo-xQe_Qi2uDX-YLlbb49hzgxR1n7L";

// Ogni tab ha un suo numero "gid": lo trovi nel link CSV del tab (...pub?gid=NUMERO&single=true...)
const GID_GIOCO = "INSERISCI_QUI_IL_GID_DEL_TAB_GIOCO";
const GID_LIVELLO = "INSERISCI_QUI_IL_GID_DEL_TAB_LIVELLO";

// ---------- MISURE E VALORI DI RISERVA ----------

const CASELLA = 32;          // lato di una casella, in pixel
const GIOCATORE_LARGO = 22;  // misure del giocatore, in pixel
const GIOCATORE_ALTO = 28;

// Se nel foglio manca un'impostazione (o è vuota) si usa questo valore
const RISERVA = {
  titolo: "Il mio gioco",
  istruzioni: "Frecce per muoverti, spazio per saltare. Raccogli le monete e arriva alla bandiera!",
  sfondo: "#87CEEB",
  giocatore: "#E63946",
  piattaforme: "#6B4F2A",
  monete: "#FFC300",
  ostacoli: "#555555",
  bandiera: "#2A9D8F",
  velocita: 4,
  salto: 12,
  gravita: 6,
  vite: 3,
  personaggio: ""
};

// Quali impostazioni sono colori e quali sono numeri (le altre sono testi)
const IMPOSTAZIONI_COLORE = ["sfondo", "giocatore", "piattaforme", "monete", "ostacoli", "bandiera"];
const IMPOSTAZIONI_NUMERO = ["velocita", "salto", "gravita", "vite"];

const canvas = document.getElementById("gioco");
const ctx = canvas.getContext("2d");

// ---------- LETTURA DEL FOGLIO ----------

// Costruisce l'indirizzo CSV di un tab
function indirizzoFoglio(gid) {
  return "https://docs.google.com/spreadsheets/d/e/" + ID_FOGLIO +
    "/pub?gid=" + gid + "&single=true&output=csv&headers=1";
}

// Scarica un tab con PapaParse e restituisce le righe.
// conIntestazioni = true: ogni riga è un oggetto (la prima riga del foglio contiene i nomi)
// conIntestazioni = false: ogni riga è una lista di celle (nessuna intestazione)
function leggiTab(gid, conIntestazioni) {
  return new Promise((risolvi, rifiuta) => {
    Papa.parse(indirizzoFoglio(gid), {
      download: true,
      header: conIntestazioni,
      skipEmptyLines: conIntestazioni,                       // nel livello le righe vuote contano
      transformHeader: nome => nome.trim().toLowerCase(),    // "Valore " diventa "valore"
      complete: risultato => risolvi(risultato.data),
      error: errore => rifiuta(errore)
    });
  });
}

// ---------- IMPOSTAZIONI ----------

// Trasforma le righe del tab "Gioco" in un oggetto con tutte le impostazioni
function leggiImpostazioni(righe) {
  const impostazioni = Object.assign({}, RISERVA);   // parto da una copia dei valori di riserva

  righe.forEach(riga => {
    const nome = (riga.impostazione || "").trim().toLowerCase();
    const valore = (riga.valore || "").trim();

    // Impostazione sconosciuta o valore vuoto: resta il valore di riserva
    if (!RISERVA.hasOwnProperty(nome) || valore === "") return;

    if (IMPOSTAZIONI_COLORE.includes(nome)) {
      // Accetto solo colori validi (nome inglese o codice come #87CEEB)
      if (CSS.supports("color", valore)) impostazioni[nome] = valore;
    } else if (IMPOSTAZIONI_NUMERO.includes(nome)) {
      const numero = Number(valore.replace(",", "."));
      if (Number.isFinite(numero) && numero > 0) impostazioni[nome] = numero;
    } else {
      impostazioni[nome] = valore;                   // testi: titolo, istruzioni, personaggio
    }
  });

  impostazioni.vite = Math.round(impostazioni.vite); // le vite sono un numero intero
  return impostazioni;
}

// Scrive titolo e istruzioni nella pagina (textContent: il testo non viene mai letto come HTML)
function mostraTesti(impostazioni) {
  document.getElementById("titolo-gioco").textContent = impostazioni.titolo;
  document.getElementById("istruzioni-gioco").textContent = impostazioni.istruzioni;
  document.title = impostazioni.titolo + " - Sito personale";
}

// ---------- LIVELLO ----------

// Una cella del foglio diventa un solo carattere: # o ^ p f, oppure spazio (vuoto)
function leggiCasella(testo) {
  const carattere = (testo || "").replace(/\s/g, "").toLowerCase();   // tolgo gli spazi e uso le minuscole
  if (carattere.length === 1 && "#o^pf".includes(carattere)) return carattere;
  return " ";                                                          // qualsiasi altra cosa = vuoto
}

// Cerca la P. Se non c'è, mette il giocatore sulla prima casella libera appoggiata a terra
function trovaPartenza(griglia, righe, colonne) {
  for (let r = 0; r < righe; r++) {
    for (let c = 0; c < colonne; c++) {
      if (griglia[r][c] === "p") return { colonna: c, riga: r, trovata: true };
    }
  }
  for (let r = righe - 2; r >= 1; r--) {
    for (let c = 1; c < colonne - 1; c++) {
      if (griglia[r][c] === " " && griglia[r + 1][c] === "#") return { colonna: c, riga: r, trovata: false };
    }
  }
  return { colonna: 1, riga: 1, trovata: false };
}

// Trasforma le righe del tab "Livello" in una griglia di caratteri
function leggiLivello(righeFoglio) {
  // L'ultima riga può essere solo un "a capo" finale: la tolgo
  while (righeFoglio.length > 0 && righeFoglio[righeFoglio.length - 1].length === 1 &&
         righeFoglio[righeFoglio.length - 1][0].trim() === "") {
    righeFoglio.pop();
  }
  if (righeFoglio.length === 0) return null;

  const righe = righeFoglio.length;
  const colonne = Math.max(...righeFoglio.map(riga => riga.length));   // la riga più lunga decide

  // Riempio la griglia (le celle che mancano sono spazi vuoti)
  const griglia = [];
  for (let r = 0; r < righe; r++) {
    const riga = [];
    for (let c = 0; c < colonne; c++) {
      riga.push(leggiCasella(righeFoglio[r][c]));
    }
    griglia.push(riga);
  }

  // Il bordo del livello è sempre solido, anche se nel foglio manca qualche #
  for (let r = 0; r < righe; r++) {
    for (let c = 0; c < colonne; c++) {
      if (r === 0 || r === righe - 1 || c === 0 || c === colonne - 1) griglia[r][c] = "#";
    }
  }

  const partenza = trovaPartenza(griglia, righe, colonne);
  return { griglia: griglia, righe: righe, colonne: colonne, partenza: partenza };
}

// ---------- DISEGNO ----------

// Carica l'immagine del personaggio (cartella img/). Se non si carica, restituisce null
function caricaImmagine(nomeFile) {
  return new Promise(risolvi => {
    // Accetto solo un nome di file semplice, senza cartelle
    if (nomeFile === "" || /[\\/]/.test(nomeFile) || nomeFile.includes("..")) {
      risolvi(null);
      return;
    }
    const immagine = new Image();
    immagine.onload = () => risolvi(immagine);
    immagine.onerror = () => risolvi(null);
    immagine.src = "img/" + encodeURIComponent(nomeFile);
  });
}

// Disegna una casella nella posizione x, y (in pixel)
function disegnaCasella(carattere, x, y, impostazioni) {
  if (carattere === "#") {
    // Piattaforma o muro
    ctx.fillStyle = impostazioni.piattaforme;
    ctx.fillRect(x, y, CASELLA, CASELLA);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.strokeRect(x + 0.5, y + 0.5, CASELLA - 1, CASELLA - 1);
  } else if (carattere === "o") {
    // Moneta: un cerchio
    ctx.fillStyle = impostazioni.monete;
    ctx.beginPath();
    ctx.arc(x + CASELLA / 2, y + CASELLA / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.stroke();
  } else if (carattere === "^") {
    // Ostacolo: un triangolo appoggiato sul fondo della casella
    ctx.fillStyle = impostazioni.ostacoli;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + CASELLA);
    ctx.lineTo(x + CASELLA / 2, y + 6);
    ctx.lineTo(x + CASELLA - 2, y + CASELLA);
    ctx.closePath();
    ctx.fill();
  } else if (carattere === "f") {
    // Bandiera di arrivo: un'asta e un triangolo
    ctx.fillStyle = "#333333";
    ctx.fillRect(x + 8, y + 2, 3, CASELLA - 2);
    ctx.fillStyle = impostazioni.bandiera;
    ctx.beginPath();
    ctx.moveTo(x + 11, y + 3);
    ctx.lineTo(x + 28, y + 10);
    ctx.lineTo(x + 11, y + 17);
    ctx.closePath();
    ctx.fill();
  }
}

// Disegna il giocatore appoggiato sul fondo della casella P (immagine o rettangolo)
function disegnaGiocatore(partenza, impostazioni, immagine) {
  const x = partenza.colonna * CASELLA + (CASELLA - GIOCATORE_LARGO) / 2;   // al centro della casella
  const y = partenza.riga * CASELLA + (CASELLA - GIOCATORE_ALTO);           // sul fondo della casella

  if (immagine) {
    ctx.drawImage(immagine, x, y, GIOCATORE_LARGO, GIOCATORE_ALTO);
  } else {
    ctx.fillStyle = impostazioni.giocatore;
    ctx.fillRect(x, y, GIOCATORE_LARGO, GIOCATORE_ALTO);
  }
}

// Disegna tutto il livello: sfondo, caselle e giocatore
function disegnaLivello(livello, impostazioni, immagine) {
  // La misura del canvas dipende dalla griglia
  canvas.width = livello.colonne * CASELLA;
  canvas.height = livello.righe * CASELLA;

  ctx.fillStyle = impostazioni.sfondo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < livello.righe; r++) {
    for (let c = 0; c < livello.colonne; c++) {
      disegnaCasella(livello.griglia[r][c], c * CASELLA, r * CASELLA, impostazioni);
    }
  }

  disegnaGiocatore(livello.partenza, impostazioni, immagine);
}

// ---------- MESSAGGI ----------

function mostraStato(testo) {
  document.getElementById("stato").textContent = testo;
}

// ---------- AVVIO ----------

async function avvia() {
  if (typeof Papa === "undefined") {
    mostraStato("PapaParse non si è caricato: controlla la connessione a internet.");
    return;
  }
  if (GID_GIOCO.startsWith("INSERISCI") || GID_LIVELLO.startsWith("INSERISCI")) {
    mostraStato("Scrivi in gioco.js il gid dei tab Gioco e Livello (lo trovi nel link CSV di ogni tab).");
    return;
  }

  try {
    // 1. Tab "Gioco": impostazioni, titolo e istruzioni
    const impostazioni = leggiImpostazioni(await leggiTab(GID_GIOCO, true));
    mostraTesti(impostazioni);

    // 2. Tab "Livello": la griglia
    const livello = leggiLivello(await leggiTab(GID_LIVELLO, false));
    if (livello === null) {
      mostraStato("Il tab Livello è vuoto: disegna la griglia nel foglio.");
      return;
    }

    // 3. Immagine del personaggio (facoltativa) e disegno
    const immagine = await caricaImmagine(impostazioni.personaggio);
    disegnaLivello(livello, impostazioni, immagine);

    // 4. Messaggio finale
    let messaggio = "Livello caricato: " + livello.colonne + " x " + livello.righe +
      " caselle. Vite: " + impostazioni.vite + ".";
    if (impostazioni.personaggio !== "" && immagine === null) {
      messaggio += " Immagine del personaggio non trovata: uso il rettangolo.";
    }
    if (!livello.partenza.trovata) {
      messaggio += " Nel livello non c'è la P: ho messo io il giocatore.";
    }
    mostraStato(messaggio);
  } catch (errore) {
    mostraStato("Non riesco a caricare il gioco. Controlla che il foglio sia pubblicato e che i gid siano giusti.");
    console.error(errore);
  }
}

avvia();