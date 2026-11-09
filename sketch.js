let table; // Oggetto p5.Table che conterrà le righe del dataset CSV

// Dimensioni base per organizzare la griglia
const cellWidth = 140; // Larghezza di ogni colonna
const cellHeight = 175; // Altezza di ogni riga
const minPadding = 30; // Margine minimo dai bordi della pagina
const topPadding = 25; // Spazio prima della prima riga dei fiumi

let hoveredRiver = null; // Variabile per memorizzare il fiume attivo al passaggio del mouse

// Caricamento del dataset 
function preload() {
  table = loadTable('rivers_world - Data.csv', 'csv', 'header');
}

// Impostazione del canvas e proporzioni
function setup() {
  angleMode(DEGREES); // Angoli in gradi 

  // Numeri di colonne nella larghezza della finestra
  let cols = max(1, floor((windowWidth - 2 * minPadding) / cellWidth));
  // Numero totale di righe dividendo il numero di fiumi per le colonne
  let rows = ceil(table.getRowCount() / cols);
  // Altezza necessaria al canvas per attivare lo scroll
  let totalHeight = topPadding + rows * cellHeight + 60;

  let cnv = createCanvas(windowWidth, totalHeight); // Creazione del canvas 
  cnv.parent('canvas-container'); // Lo posiziona sotto la testata html
}

// GLIFI
function drawRiverGlyph(dischargeVal, areaVal, tribCount, rColor, isHovered, isDimmed) {
  push(); // Isola gli stili grafici del singolo glifo
  noFill(); // linea continua senza riempimento

  const maxAngle = 2.5 * 360; // 2.5 giri fissi (900°)

  // AREA BACINO rappresentata dal raggio esterno della spirale
  let maxRadius = map(sqrt(areaVal), sqrt(1000), sqrt(7050000), 13, 32, true);

  // PORTATA rappresentata dallo spessore della linea con scala logaritmica
  let strokeW = map(log(max(dischargeVal, 100)), log(100), log(210000), 1.5, 5.0, true);

  // AFFLUENTI rappresentata dal numero di increspature lungo la spirale
  let waveFreq = floor(map(log(max(tribCount, 1)), log(1), log(1100), 2, 10, true));
  let waveAmp = 1.1; // Ampiezza fissa: non si deforma ne si ingrossa al passaggio del cursore

  // Evidenziazione: 255 = luminoso se puntato, 45 = attenuato se un altro è attivo, 220 = standard se nessuno è attivo
  let alphaVal = isHovered ? 255 : (isDimmed ? 45 : 220);

  stroke(red(rColor), green(rColor), blue(rColor), alphaVal); // Colori
  strokeWeight(strokeW); // Spessore sempre uguale
  strokeCap(ROUND); // Estremita tonde
  strokeJoin(ROUND); // Raccordi tondi

  // Disegna la spirale punto per punto calcolando raggio e angolo
  beginShape();
  for (let a = 0; a <= maxAngle; a += 5) { // Un punto ogni 5 gradi
    let t = a / maxAngle; // Valore da 0 (centro) a 1 (fine)
    let baseR = t * maxRadius; // Raggio che si allarga gradualmente
    let ripple = sin(a * waveFreq) * (waveAmp * t); // Ondulazione degli affluenti
    let finalR = max(0, baseR + ripple); // Raggio con onda sommata

    // Converte coordinate in cartesiane (x, y)
    vertex(cos(a) * finalR, sin(a) * finalR);
  }
  endShape();

  pop(); // Ripristina impostazioni grafiche
}

// GRIGLIA
function drawGrid() {
  let cols = max(1, floor((width - 2 * minPadding) / cellWidth)); // Quante colonne stanno nella finestra
  let startX = (width - (cols * cellWidth)) / 2; // Margine per centrare la griglia 

  // Scala cromatica per la temperatura dell'acqua
  let cCold = color(64, 196, 255);  // Azzurro per acque fredde 
  let cMild = color(255, 209, 102); // Giallo per acque medie 
  let cWarm = color(239, 71, 111);  // Rosso per acque calde 

  // 1. Quale fiume stiamo toccando con il mouse
  hoveredRiver = null; // Non tocco nessun fiume
  for (let i = 0; i < table.getRowCount(); i++) { // Controllo uno per uno di tutti i 100 fiumi
    let col = i % cols; // In quale colonna si trova questo fiume
    let rowIdx = floor(i / cols); // In quale riga si trova
    let x = startX + col * cellWidth + cellWidth / 2; // Coordinata orizzontale della cella
    let y = topPadding + rowIdx * cellHeight + cellHeight / 2; // Coordinata verticale della cella
    let glyphY = y - 35; // Centro esatto della spirale

    if (dist(mouseX, mouseY, x, glyphY) < 40) {
      hoveredRiver = table.getRow(i).obj; // Se il mouse è a meno di 40px dal centro della spirale sto toccando questo fiume
      break; // Ne posso toccare solo uno alla volta
    }
  }

  // 2. Disegno di tutti i fiumi sullo schermo 
  let colCount = 0; // Parto dalla prima colonna a sinistra 
  let rowCount = 0; // Parto dalla prima riga in alto 

  for (let i = 0; i < table.getRowCount(); i++) { // Ripasso tutti i fiumi per disegnarli
    let row = table.getRow(i).obj; // Prendo i dati del fiume che sto disegnando 

    // Trasforma i testi del file CSV in numeri 
    let discharge = Number(row["discharge"]); // La portata dell'acqua
    let area = Number(row["area"]); // La grandezza del bacino
    let tribs = Number(row["tributaries"]); // Il numero di affluenti
    let avgTemp = Number(row["avg_temp"]); // La temperatura media
    let name = row["name"]; // Il nome del fiume

    // Trasformiamo la temperatura in un valore da 0 a 1 per scegliere il colore
    let tNorm = map(avgTemp, -8, 28, 0, 1, true);
    let riverCol;
    if (tNorm < 0.5) {
      riverCol = lerpColor(cCold, cMild, tNorm * 2); // Se fa freddo sfumiamo da azzurro a giallo
    } else {
      riverCol = lerpColor(cMild, cWarm, (tNorm - 0.5) * 2); // Se fa caldo sfumiamo da giallo a rosso
    }

    // Calcoliamo dove posizionare questo singolo fiume sullo schermo
    let x = startX + colCount * cellWidth + cellWidth / 2; // Centro orizzontale della cella
    let y = topPadding + rowCount * cellHeight + cellHeight / 2; // Centro verticale della cella
    let glyphY = y - 35; // Centro della spirale (un po' più in alto del testo)

    // HOVER
    let isCurrentHover = (hoveredRiver !== null && hoveredRiver.id === row.id); // Il fiume su cui sto passando
    let isDimmed = (hoveredRiver !== null && hoveredRiver.id !== row.id); // oscurazione di tutti quando passo su un altro fiume

    // DISEGNO SPIRALE
    push(); // Salvo posizione attuale del disegno
    translate(x, glyphY); // Mi sposto al centro della cella dove andrà la spirale
    drawRiverGlyph(discharge, area, tribs, riverCol, isCurrentHover, isDimmed); // Disegno spirale
    pop(); // Torno a posizione originale dello schermo

    // NOME DEL FIUME
    push(); // Salvo impostazioni grafiche testo
    textAlign(CENTER, TOP); // Testo allineato al centro
    rectMode(CENTER); // Box testo centrato rispetto alla cella
    textSize(8.0); // Dimensione testo
    textLeading(10.0); // Distanza tra una riga e l'altra del nome
    fill(isCurrentHover ? 255 : (isDimmed ? 65 : 160)); // Bianco se toccato, grigio scuro se altri fiumi sono toccati, grigio normale di base
    noStroke(); // Tolgo contorno nero alle lettere

    // Spazio dopo i trattini così i nomi lunghi vanno a capo senza tagliarsi a metà
    let formattedName = name.split('–').join('– ').split('-').join('- ');
    text(formattedName, x, y + 25, 100, 40); // Nome dentro un riquadro largo 100 e alto 40
    pop(); // Ripristiniamo le impostazioni grafiche

    colCount++; // Colonna successiva a destra
    if (colCount >= cols) { // Se arrivo in fondo a riga destra
      colCount = 0; // torno a prima colonna a sinistra
      rowCount++; // e scendo a riga sotto
    }
  }

  aggiornaBarraHTML(); // aggiorna la barra delle scritte in alto
}

// DATI DEL FIUME nella barra in alto 
function aggiornaBarraHTML() {
  let barra = document.getElementById('status-bar'); // costruz barra nella pagina 
  if (!barra) return; 

  if (hoveredRiver) { // Se hover su fiume:
    barra.classList.add('active'); // Bordo azzurro della barra
    // Dettagli del fiume nella barra
    barra.innerHTML = `
      <strong style="color:#fff; margin-right:12px;">▶ ${hoveredRiver.name}</strong>
      <span>${hoveredRiver.continent} | 
      <strong>Lunghezza:</strong> ${Number(hoveredRiver.length).toLocaleString()} km | 
      <strong>Portata:</strong> ${Number(hoveredRiver.discharge).toLocaleString()} m³/s | 
      <strong>Bacino:</strong> ${Number(hoveredRiver.area).toLocaleString()} km² | 
      <strong>Temperatura:</strong> ${hoveredRiver.avg_temp}°C</span>
    `;
  } else { // Senza hover:
    barra.classList.remove('active'); // Bordo grigio della barra
    // Ricompare frase iniziale di spiegazione
    barra.innerHTML = "Passa su una spirale con il cursore per esaminare i dati riguardanti il fiume.";
  }
}

// LOOP
function draw() {
  background(11, 15, 25);
  drawGrid();
}