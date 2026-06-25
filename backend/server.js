import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'db.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper para leer la base de datos
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error leyendo la base de datos, usando valores por defecto:', error);
    return { matches: [], rooms: {} };
  }
}

// Helper para guardar la base de datos
async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error escribiendo en la base de datos:', error);
  }
}

// Generador de IDs simples
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Calcular puntos de una predicción individual
function calculatePoints(prediction, actual) {
  if (!prediction || actual.homeScore === null || actual.awayScore === null) {
    return { points: 0, isExact: false, isOutcome: false };
  }

  const predHome = parseInt(prediction.homeScore);
  const predAway = parseInt(prediction.awayScore);
  const actHome = parseInt(actual.homeScore);
  const actAway = parseInt(actual.awayScore);

  if (isNaN(predHome) || isNaN(predAway) || isNaN(actHome) || isNaN(actAway)) {
    return { points: 0, isExact: false, isOutcome: false };
  }

  // Acierto exacto: 3 puntos
  if (predHome === actHome && predAway === actAway) {
    return { points: 3, isExact: true, isOutcome: false };
  }

  // Acierto de resultado (Ganador o Empate): 1 punto
  const predDiff = predHome - predAway;
  const actDiff = actHome - actAway;

  if ((predDiff > 0 && actDiff > 0) || (predDiff < 0 && actDiff < 0) || (predDiff === 0 && actDiff === 0)) {
    return { points: 1, isExact: false, isOutcome: true };
  }

  return { points: 0, isExact: false, isOutcome: false };
}

// Generar predicciones simuladas para autocompletar salas
function generateSimulatedPredictions(matches, accuracyFactor) {
  const predictions = {};
  matches.forEach(match => {
    const isPlayed = match.status === 'played';
    let home, away;
    if (isPlayed) {
      const realHome = match.homeScore;
      const realAway = match.awayScore;
      
      const rand = Math.random();
      if (rand < accuracyFactor * 0.4) {
        home = realHome;
        away = realAway;
      } else if (rand < accuracyFactor * 0.8) {
        if (realHome > realAway) {
          home = realHome + Math.floor(Math.random() * 2) + 1;
          away = realAway;
        } else if (realHome < realAway) {
          home = realHome;
          away = realAway + Math.floor(Math.random() * 2) + 1;
        } else {
          home = realHome + 1;
          away = realAway + 1;
        }
      } else {
        if (realHome > realAway) {
          home = realAway;
          away = realHome + 1;
        } else if (realHome < realAway) {
          home = realAway + 1;
          away = realHome;
        } else {
          home = realHome + 2;
          away = realAway;
        }
      }
    } else {
      home = Math.floor(Math.random() * 3);
      away = Math.floor(Math.random() * 3);
    }
    predictions[match.id] = { homeScore: home, awayScore: away };
  });
  return predictions;
}

// --- Endpoints de la API ---

// 1. Obtener todos los partidos
app.get('/api/matches', async (req, res) => {
  const db = await readDB();
  res.json(db.matches);
});

// 2. Crear una nueva sala
app.post('/api/rooms', async (req, res) => {
  const { name, creatorName } = req.body;
  if (!name || !creatorName) {
    return res.status(400).json({ error: 'Nombre de sala y nombre de creador son requeridos' });
  }

  const db = await readDB();
  const roomId = generateId();
  const adminId = `user-${generateId()}`;

  const simulatedNames = [
    { name: 'Cristiano R.', accuracy: 0.72 },
    { name: 'Neymar Jr.', accuracy: 0.62 },
    { name: 'Kylian M.', accuracy: 0.68 },
    { name: 'Erling H.', accuracy: 0.48 },
    { name: 'Luka M.', accuracy: 0.64 },
    { name: 'Harry K.', accuracy: 0.54 },
    { name: 'Robert L.', accuracy: 0.42 }
  ];

  const simulatedParticipants = simulatedNames.map((sim, idx) => {
    return {
      id: `sim-${idx}-${generateId()}`,
      name: sim.name,
      predictions: generateSimulatedPredictions(db.matches, sim.accuracy)
    };
  });

  const newRoom = {
    id: roomId,
    name: name,
    adminId: adminId,
    participants: [
      {
        id: adminId,
        name: creatorName,
        predictions: {}
      },
      ...simulatedParticipants
    ]
  };

  db.rooms[roomId] = newRoom;
  await writeDB(db);

  res.status(201).json({
    roomId,
    userId: adminId,
    roomName: name
  });
});

// 3. Obtener los detalles de una sala (con posiciones calculadas y privacidad)
app.get('/api/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const requestUserId = req.query.userId || req.headers['x-user-id'];

  const db = await readDB();
  const room = db.rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }

  const matchesMap = {};
  db.matches.forEach(m => { matchesMap[m.id] = m; });

  // Calcular tabla de posiciones y formatear participantes
  const participantsWithScores = room.participants.map(participant => {
    let points = 0;
    let exacts = 0;
    let outcomes = 0;
    let predictedCount = 0;

    // Calcular puntos basados en partidos jugados
    Object.keys(participant.predictions).forEach(matchId => {
      const match = matchesMap[matchId];
      if (match && match.status === 'played') {
        const result = calculatePoints(participant.predictions[matchId], match);
        points += result.points;
        if (result.isExact) exacts++;
        if (result.isOutcome) outcomes++;
        predictedCount++;
      }
    });

    // Privacidad: Ocultar predicciones de partidos pendientes de otros usuarios
    const filteredPredictions = {};
    Object.keys(participant.predictions).forEach(matchId => {
      const match = matchesMap[matchId];
      if (match) {
        // Se muestran las predicciones si el partido ya se jugó O si es el propio usuario
        if (match.status === 'played' || participant.id === requestUserId) {
          filteredPredictions[matchId] = participant.predictions[matchId];
        } else {
          // Marcador de partido bloqueado/privado
          filteredPredictions[matchId] = { hidden: true };
        }
      }
    });

    return {
      id: participant.id,
      name: participant.name,
      predictions: filteredPredictions,
      points,
      exacts,
      outcomes,
      predictedCount
    };
  });

  // Ordenar participantes: puntos desc, luego exactos desc, luego resultados correctos desc, luego alfabético
  participantsWithScores.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exacts !== a.exacts) return b.exacts - a.exacts;
    if (b.outcomes !== a.outcomes) return b.outcomes - a.outcomes;
    return a.name.localeCompare(b.name);
  });

  res.json({
    id: room.id,
    name: room.name,
    adminId: room.adminId,
    participants: participantsWithScores
  });
});

// 4. Unirse a una sala existente
app.post('/api/rooms/:roomId/join', async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nombre es requerido para unirse' });
  }

  const db = await readDB();
  const room = db.rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }

  // Verificar si ya existe un participante con el mismo nombre en la sala
  const exists = room.participants.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Ya hay un participante con ese nombre en esta sala. Usa otro o agrega un apellido.' });
  }

  const userId = `user-${generateId()}`;
  const newParticipant = {
    id: userId,
    name: name.trim(),
    predictions: {}
  };

  room.participants.push(newParticipant);
  await writeDB(db);

  res.status(200).json({
    userId,
    name: newParticipant.name
  });
});

// 5. Guardar predicciones de un usuario
app.post('/api/rooms/:roomId/users/:userId/predictions', async (req, res) => {
  const { roomId, userId } = req.params;
  const { predictions } = req.body; // Formato: { "matchId": { homeScore: 2, awayScore: 1 }, ... }

  if (!predictions) {
    return res.status(400).json({ error: 'Predicciones no provistas' });
  }

  const db = await readDB();
  const room = db.rooms[roomId];

  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }

  const participant = room.participants.find(p => p.id === userId);
  if (!participant) {
    return res.status(404).json({ error: 'Usuario no encontrado en la sala' });
  }

  const matchesMap = {};
  db.matches.forEach(m => { matchesMap[m.id] = m; });

  // Validar y guardar solo predicciones de partidos no finalizados
  Object.keys(predictions).forEach(matchId => {
    const match = matchesMap[matchId];
    if (match) {
      if (match.status !== 'played') {
        const homeScore = predictions[matchId].homeScore;
        const awayScore = predictions[matchId].awayScore;

        // Validar que sean números válidos o vacíos
        if (homeScore === '' || awayScore === '' || homeScore === null || awayScore === null) {
          delete participant.predictions[matchId];
        } else {
          const h = parseInt(homeScore);
          const a = parseInt(awayScore);
          if (!isNaN(h) && !isNaN(a)) {
            participant.predictions[matchId] = { homeScore: h, awayScore: a };
          }
        }
      }
    }
  });

  await writeDB(db);
  res.json({ success: true, predictions: participant.predictions });
});

// 6. Actualizar el resultado real de un partido (Admin)
app.post('/api/admin/matches/:matchId', async (req, res) => {
  const { matchId } = req.params;
  const { homeScore, awayScore, status } = req.body;

  const db = await readDB();
  const matchIndex = db.matches.findIndex(m => m.id === matchId);

  if (matchIndex === -1) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  const match = db.matches[matchIndex];

  if (status === 'played') {
    if (homeScore === undefined || awayScore === undefined || homeScore === null || awayScore === null) {
      return res.status(400).json({ error: 'Marcador requerido para marcar como jugado' });
    }
    match.homeScore = parseInt(homeScore);
    match.awayScore = parseInt(awayScore);
    match.status = 'played';
  } else {
    match.homeScore = null;
    match.awayScore = null;
    match.status = 'pending';
  }

  await writeDB(db);
  res.json({ success: true, match });
});

// 7. Obtener estadísticas del torneo (goleadores y tarjetas)
app.get('/api/stats', async (req, res) => {
  const db = await readDB();
  res.json({
    goalscorers: db.goalscorers || [],
    cards: db.cards || []
  });
});

// Servir archivos estáticos del frontend en producción (carpeta public)
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// Fallback para ruteo SPA: cualquier otra ruta devuelve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Ruta de API no encontrada' });
  }
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor de Prode corriendo en http://localhost:${PORT}`);
});
