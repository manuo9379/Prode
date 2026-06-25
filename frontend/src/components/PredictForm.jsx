import React, { useState, useEffect } from 'react';

// Mapa de banderas para hacer la interfaz muy visual y premium
const TEAM_FLAGS = {
  'Argentina': '🇦🇷',
  'Brasil': '🇧🇷',
  'Francia': '🇫🇷',
  'España': '🇪🇸',
  'Alemania': '🇩🇪',
  'Italia': '🇮🇹',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Países Bajos': '🇳🇱',
  'Portugal': '🇵🇹',
  'México': '🇲🇽',
  'Estados Unidos': '🇺🇸',
  'Canadá': '🇨🇦',
  'Croacia': '🇭🇷',
  'Albania': '🇦🇱',
  'Serbia': '🇷🇸',
  'Polonia': '🇵🇱',
  'Austria': '🇦🇹',
  'Bélgica': '🇧🇪',
  'Eslovaquia': '🇸🇰',
  'Turquía': '🇹🇷',
  'Georgia': '🇬🇪',
  'República Checa': '🇨🇿',
  'Chile': '🇨🇱',
  'Dinamarca': '🇩🇰',
  'Ucrania': '🇺🇦',
  'Rumania': '🇷🇴',
  'Perú': '🇵🇪',
  'Eslovenia': '🇸🇮',
  'Suiza': '🇨🇭',
  'Colombia': '🇨🇴',
  'Uruguay': '🇺🇾',
  'Marruecos': '🇲🇦',
  'Costa Rica': '🇨🇷',
  'Australia': '🇦🇺'
};

export function getFlag(teamName) {
  return TEAM_FLAGS[teamName] || '⚽';
}

export default function PredictForm({ matches, initialPredictions, onSavePredictions }) {
  const [localPredictions, setLocalPredictions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inicializar predicciones locales
  useEffect(() => {
    const formatted = {};
    matches.forEach(match => {
      const pred = initialPredictions[match.id];
      if (pred) {
        formatted[match.id] = {
          homeScore: pred.homeScore !== null ? pred.homeScore.toString() : '',
          awayScore: pred.awayScore !== null ? pred.awayScore.toString() : ''
        };
      } else {
        formatted[match.id] = { homeScore: '', awayScore: '' };
      }
    });
    setLocalPredictions(formatted);
    setHasChanges(false);
  }, [initialPredictions, matches]);

  const handleInputChange = (matchId, team, value) => {
    // Solo permitir números enteros o vacío
    if (value !== '' && !/^\d+$/.test(value)) return;

    setLocalPredictions(prev => {
      const updated = {
        ...prev,
        [matchId]: {
          ...prev[matchId],
          [team]: value
        }
      };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    // Convertir de strings de input a números o null antes de enviar al backend
    const cleanPredictions = {};
    Object.keys(localPredictions).forEach(matchId => {
      const pred = localPredictions[matchId];
      if (pred.homeScore !== '' && pred.awayScore !== '') {
        cleanPredictions[matchId] = {
          homeScore: parseInt(pred.homeScore),
          awayScore: parseInt(pred.awayScore)
        };
      } else {
        cleanPredictions[matchId] = { homeScore: null, awayScore: null };
      }
    });

    const success = await onSavePredictions(cleanPredictions);
    if (success) {
      setHasChanges(false);
    }
    setSaving(false);
  };

  // Agrupar partidos por fase/grupo
  const groupedMatches = {};
  matches.forEach(match => {
    const groupName = match.group || 'Otros';
    if (!groupedMatches[groupName]) {
      groupedMatches[groupName] = [];
    }
    groupedMatches[groupName].push(match);
  });

  // Calcular puntos obtenidos para un partido jugado
  const renderPointsBadge = (match, pred) => {
    if (match.status !== 'played' || !pred || pred.homeScore === null || pred.awayScore === null) {
      return null;
    }

    const predHome = parseInt(pred.homeScore);
    const predAway = parseInt(pred.awayScore);
    const actHome = match.homeScore;
    const actAway = match.awayScore;

    if (predHome === actHome && predAway === actAway) {
      return <span className="points-badge points-exact">🎯 +3 Pts (Exacto)</span>;
    }

    const predDiff = predHome - predAway;
    const actDiff = actHome - actAway;

    if ((predDiff > 0 && actDiff > 0) || (predDiff < 0 && actDiff < 0) || (predDiff === 0 && actDiff === 0)) {
      return <span className="points-badge points-outcome">👍 +1 Pt (Resultado)</span>;
    }

    return <span className="points-badge points-zero">❌ +0 Pts</span>;
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          * Completa tus pronósticos para los partidos pendientes. Se guardan al hacer clic en el botón.
        </p>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!hasChanges || saving}
          style={{ position: 'sticky', top: '10px', zIndex: 10, alignSelf: 'flex-start' }}
        >
          {saving ? 'Guardando...' : hasChanges ? '💾 Guardar Pronósticos' : '✅ Guardado'}
        </button>
      </div>

      {Object.keys(groupedMatches).map(groupName => (
        <div key={groupName} style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--secondary)', marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.4rem' }}>
            {groupName}
          </h3>

          <div>
            {groupedMatches[groupName].map(match => {
              const isPlayed = match.status === 'played';
              const pred = localPredictions[match.id] || { homeScore: '', awayScore: '' };
              const originalPred = initialPredictions[match.id];

              return (
                <div key={match.id} className="match-card">
                  {/* Equipo Local */}
                  <div className="match-team home">
                    <span>{match.homeTeam}</span>
                    <span className="team-flag">{getFlag(match.homeTeam)}</span>
                  </div>

                  {/* Centro: Marcadores / Inputs */}
                  <div className="match-center">
                    <span className="match-meta">{match.date} - {match.time}</span>
                    
                    {isPlayed ? (
                      // Partido Jugado: Read-only con marcador real arriba y pronóstico abajo
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                        <div className="match-score-display">
                          <span>{match.homeScore}</span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>-</span>
                          <span>{match.awayScore}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <span>Tu pronóstico:</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {originalPred ? `${originalPred.homeScore}-${originalPred.awayScore}` : '-'}
                          </span>
                        </div>
                        {renderPointsBadge(match, originalPred)}
                      </div>
                    ) : (
                      // Partido Pendiente: Inputs para pronosticar
                      <div className="prediction-inputs">
                        <input
                          type="text"
                          className="score-input"
                          value={pred.homeScore}
                          onChange={(e) => handleInputChange(match.id, 'homeScore', e.target.value)}
                          placeholder="-"
                          maxLength="2"
                        />
                        <span className="score-divider">:</span>
                        <input
                          type="text"
                          className="score-input"
                          value={pred.awayScore}
                          onChange={(e) => handleInputChange(match.id, 'awayScore', e.target.value)}
                          placeholder="-"
                          maxLength="2"
                        />
                      </div>
                    )}
                  </div>

                  {/* Equipo Visitante */}
                  <div className="match-team away">
                    <span className="team-flag">{getFlag(match.awayTeam)}</span>
                    <span>{match.awayTeam}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {hasChanges && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '2rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '220px', fontSize: '1rem', padding: '0.8rem' }}
          >
            {saving ? 'Guardando...' : '💾 Guardar Pronósticos'}
          </button>
        </div>
      )}
    </form>
  );
}
