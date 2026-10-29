// Link CSV dei fogli (pubblicati sul web)
const URL_EXTRA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJxyF8o1r1sfCJ_09WYwLJ-wOueTSdbtSPvcBwSEIM48gcy7Qo-xQe_Qi2uDX-YLlbb49hzgxR1n7L/pub?gid=1395264512&single=true&output=csv";
const URL_STAGE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJxyF8o1r1sfCJ_09WYwLJ-wOueTSdbtSPvcBwSEIM48gcy7Qo-xQe_Qi2uDX-YLlbb49hzgxR1n7L/pub?gid=401235781&single=true&output=csv";
const URL_HOME = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJxyF8o1r1sfCJ_09WYwLJ-wOueTSdbtSPvcBwSEIM48gcy7Qo-xQe_Qi2uDX-YLlbb49hzgxR1n7L/pub?gid=0&single=true&output=csv";
const URL_CV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJxyF8o1r1sfCJ_09WYwLJ-wOueTSdbtSPvcBwSEIM48gcy7Qo-xQe_Qi2uDX-YLlbb49hzgxR1n7L/pub?gid=124213044&single=true&output=csv";
// ---------- FUNZIONI RIUTILIZZABILI (valgono per ogni pagina) ----------

// Scarica il CSV e lo trasforma in una lista di oggetti
async function leggiFoglio(url) {
  const risposta = await fetch(url);
  if (!risposta.ok) {
    throw new Error("Errore nel download: " + risposta.status);
  }
  const testo = await risposta.text();
  return csvInOggetti(testo);
}

// Trasforma il testo CSV in oggetti: la prima riga contiene i nomi delle colonne
function csvInOggetti(testo) {
  const righe = [];
  let riga = [];
  let cella = "";
  let traVirgolette = false;

  // Leggo il testo un carattere alla volta
  for (const c of testo) {
    if (c === '"') {
      traVirgolette = !traVirgolette;      // entro/esco da un testo tra virgolette
    } else if (c === "," && !traVirgolette) {
      riga.push(cella);                    // fine cella
      cella = "";
    } else if (c === "\n" && !traVirgolette) {
      riga.push(cella);                    // fine riga
      righe.push(riga);
      riga = [];
      cella = "";
    } else if (c !== "\r") {
      cella += c;                          // carattere normale
    }
  }
  riga.push(cella);                        // ultima riga
  righe.push(riga);

  const intestazioni = righe[0].map(nome => nome.trim());
  const oggetti = [];
  for (let i = 1; i < righe.length; i++) {
    const oggetto = {};
    intestazioni.forEach((nome, posizione) => {
      oggetto[nome] = (righe[i][posizione] || "").trim();
    });
    oggetti.push(oggetto);
  }
  return oggetti;
}

// Mostra un messaggio d'errore al posto della pagina vuota
function mostraErrore(messaggio) {
  const box = document.getElementById("messaggio-errore");
  box.textContent = messaggio;
  box.hidden = false;
}

// Aggiunge alla card un pulsante che mostra o nasconde i dettagli
function rendiCliccabile(card, dettagli) {
  dettagli.className = "dettagli";

  // Pulsante "Guardare di più"
  const bottone = document.createElement("button");
  bottone.type = "button";
  bottone.className = "guarda";
  bottone.textContent = "Guardare di più";

  card.append(bottone, dettagli);

  // Solo il click sul pulsante apre o chiude i dettagli
  bottone.addEventListener("click", () => {
    const aperta = card.classList.toggle("aperta");
    bottone.textContent = aperta ? "Mostra meno" : "Guardare di più";
  });
}

// ---------- RENDERING DELLA HOME ----------

function mostraHome(dati) {
  // Presentazione: una sola riga
  const pres = dati.find(r => r.sezione === "presentazione");
  if (pres) {
    document.getElementById("nome").textContent = pres.titolo;
    document.getElementById("qualifica").textContent = pres.sottotitolo;
    document.getElementById("testo").textContent = pres.testo;
    document.getElementById("foto").src = "img/" + pres.immagine;
  }

  // Passioni: una card per ogni riga
  const contenitorePassioni = document.getElementById("lista-passioni");
  dati.filter(r => r.sezione === "passione").forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = "img/" + p.immagine;
    img.alt = p.titolo;

    const titolo = document.createElement("h3");
    titolo.textContent = p.titolo;

        const descrizione = document.createElement("p");
    descrizione.textContent = p.testo;

    // La descrizione va nei dettagli, nascosti finché non si clicca
    const dettagli = document.createElement("div");
    dettagli.appendChild(descrizione);

    card.append(img, titolo);
    rendiCliccabile(card, dettagli);
    contenitorePassioni.appendChild(card);
  });

  // Competenze: una barra per ogni riga (livello da 0 a 100)
  const contenitoreCompetenze = document.getElementById("lista-competenze");
  dati.filter(r => r.sezione === "competenza").forEach(c => {
    const blocco = document.createElement("div");
    blocco.className = "competenza";

    const nome = document.createElement("p");
    nome.textContent = c.titolo + " (" + c.livello + "%)";

    const barra = document.createElement("div");
    barra.className = "barra";

    const piena = document.createElement("div");
    piena.className = "barra-piena";
    piena.style.width = c.livello + "%";   // la lunghezza dipende dal livello

    barra.appendChild(piena);
    blocco.append(nome, barra);
    contenitoreCompetenze.appendChild(blocco);
  });
}

// ---------- RENDERING DEL CV ----------

// Aggiunge un elemento al contenitore, solo se il testo non è vuoto
function aggiungiTesto(contenitore, tag, testo, classe) {
  if (testo === "") return;               // cella vuota: non mostro nulla
  const elemento = document.createElement(tag);
  elemento.textContent = testo;
  if (classe) elemento.className = classe;
  contenitore.appendChild(elemento);
}

// Informazioni personali: "nome informazione: valore"
function mostraDati(righe) {
  const contenitore = document.getElementById("lista-dati");
  righe.forEach(r => {
    if (r.titolo === "" || r.testo === "") return;   // salto le righe incomplete
    const p = document.createElement("p");
    const etichetta = document.createElement("strong");
    etichetta.textContent = r.titolo + ": ";
    p.appendChild(etichetta);
    p.append(r.testo);                    // append con una stringa inserisce solo testo
    contenitore.appendChild(p);
  });
}

// Istruzione ed esperienze hanno gli stessi campi: una funzione sola
function mostraVoci(righe, idContenitore) {
  const contenitore = document.getElementById(idContenitore);
  righe.forEach(r => {
    const voce = document.createElement("div");
    voce.className = "voce";
    aggiungiTesto(voce, "h3", r.titolo);
    aggiungiTesto(voce, "p", r.sottotitolo, "sottotitolo");
    aggiungiTesto(voce, "p", r.periodo, "periodo");
    aggiungiTesto(voce, "p", r.testo);
    contenitore.appendChild(voce);
  });
}

function mostraCV(dati) {
  mostraDati(dati.filter(r => r.sezione === "dati"));
  mostraVoci(dati.filter(r => r.sezione === "istruzione"), "lista-istruzione");
  mostraVoci(dati.filter(r => r.sezione === "esperienza"), "lista-esperienza");
}

// ---------- RENDERING DELLA PAGINA STAGE ----------

// Aggiunge "Etichetta: valore" alla card, solo se il valore non è vuoto
function aggiungiRiga(contenitore, etichetta, valore) {
  if (valore === "") return;
  const p = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = etichetta + ": ";
  p.appendChild(strong);
  p.append(valore);                       // inserisce solo testo
  contenitore.appendChild(p);
}

function mostraStage(righe) {
  const contenitore = document.getElementById("lista-stage");

  righe.forEach(r => {
    // Salto le righe completamente vuote
    if (Object.values(r).every(valore => valore === "")) return;

    // Blocco di uno stage
    const blocco = document.createElement("div");
    blocco.className = "stage";

    // --- Card ---
    const card = document.createElement("div");
    card.className = "card";

    // Immagine: solo se la cella non è vuota
    if (r.immagine !== "") {
      const img = document.createElement("img");
      img.src = "img/" + r.immagine;
      img.alt = r.azienda;
      card.appendChild(img);
    }

    // Nome dell'azienda come titolo
    aggiungiTesto(card, "h3", r.azienda);

        // Luogo, settore e attività: nascosti finché non si clicca
    const dettagli = document.createElement("div");
    aggiungiRiga(dettagli, "Luogo", r.luogo);
    aggiungiRiga(dettagli, "Settore", r.settore);

    // Elenco puntato: divido le attività dove c'è il punto e virgola
    if (r.attivita !== "") {
      aggiungiTesto(dettagli, "h4", "Di cosa si occupa");
      const elenco = document.createElement("ul");
      r.attivita.split(";").forEach(voce => {
        const testo = voce.trim();        // tolgo gli spazi in più
        if (testo === "") return;         // salto le voci vuote
        const li = document.createElement("li");
        li.textContent = testo;
        elenco.appendChild(li);
      });
      dettagli.appendChild(elenco);
    }

        // Se non c'è nessun dettaglio, la card resta normale
    if (dettagli.children.length > 0) {
      rendiCliccabile(card, dettagli);
    }

    blocco.appendChild(card);       // <-- questa riga va rimessa

    // --- Relazione sotto la card ---

    // --- Relazione sotto la card ---
    if (r.relazione !== "") {
      aggiungiTesto(blocco, "h3", "Relazione");
      aggiungiTesto(blocco, "p", r.relazione, "relazione");
    }

    contenitore.appendChild(blocco);
  });
}

// ---------- RENDERING DELLA PAGINA EXTRA ----------

// Scrive un testo in un elemento già presente nella pagina e lo mostra, solo se il testo non è vuoto
function mostraTestoSeEsiste(id, testo) {
  if (testo === "") return;               // cella vuota: non mostro nulla
  const elemento = document.getElementById(id);
  elemento.textContent = testo;
  elemento.hidden = false;
}

// Il link è valido solo se inizia con http:// o https://
function linkValido(link) {
  const minuscolo = link.toLowerCase();
  return minuscolo.startsWith("https://") || minuscolo.startsWith("http://");
}

function mostraExtra(dati) {
  // Riga "pagina": titolo grande e introduzione
  const pagina = dati.find(r => r.sezione === "pagina");
  if (pagina) {
    mostraTestoSeEsiste("titolo-pagina", pagina.titolo);
    mostraTestoSeEsiste("intro-pagina", pagina.descrizione);
  }

  // Righe "scheda": una card per ogni riga
  const contenitore = document.getElementById("lista-extra");
  dati.filter(r => r.sezione === "scheda").forEach(s => {
    const card = document.createElement("div");
    card.className = "card scheda";

    // Immagine: solo se la cella non è vuota
    if (s.immagine !== "") {
      const img = document.createElement("img");
      img.src = "img/" + s.immagine;
      img.alt = s.titolo;
      card.appendChild(img);
    }

    // Categoria (etichetta), titolo e descrizione: solo se non vuoti
    // Categoria (etichetta) e titolo: sempre visibili
    aggiungiTesto(card, "span", s.categoria, "etichetta");
    aggiungiTesto(card, "h3", s.titolo);

    // Descrizione: nascosta finché non si clicca (solo se c'è)
    if (s.descrizione !== "") {
      const dettagli = document.createElement("div");
      aggiungiTesto(dettagli, "p", s.descrizione);
      rendiCliccabile(card, dettagli);
    }

    // Pulsante "Apri": solo se il link è valido, si apre in una nuova scheda
    if (linkValido(s.link)) {
      const pulsante = document.createElement("a");
      pulsante.href = s.link;
      pulsante.textContent = "Apri";
      pulsante.className = "pulsante";
      pulsante.target = "_blank";
      pulsante.rel = "noopener noreferrer";
      card.appendChild(pulsante);
    }

    contenitore.appendChild(card);
  });
}

// ---------- AVVIO ----------

async function avvia() {
  try {
    // Capisco in che pagina sono guardando quali elementi esistono
    if (document.getElementById("presentazione")) {
      mostraHome(await leggiFoglio(URL_HOME));
    } else if (document.getElementById("lista-dati")) {
      mostraCV(await leggiFoglio(URL_CV));
    } else if (document.getElementById("lista-stage")) {
      mostraStage(await leggiFoglio(URL_STAGE));
    }
      else if (document.getElementById("lista-extra")) {
      mostraExtra(await leggiFoglio(URL_EXTRA));
    }
  } catch (errore) {
    mostraErrore("Non riesco a caricare i contenuti. Controlla che il foglio sia pubblicato.");
    console.error(errore);
  }
}

avvia();
