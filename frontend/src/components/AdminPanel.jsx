import React, { useState } from 'react';
import { getFlag } from './PredictForm';

export default function AdminPanel({ matches, onUpdateMatch }) {
  const [scores, setScores] = useState({});
  const [savingId, setSavingId] = useState(null);

  const handleScoreChange = (matchId, team, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
  };

  const handleSave = async (match, isReset = false) => {
    setSavingId(match.id);
    let payload = {};

    if (isReset) {
      payload = {
        homeScore: null,
        awayScore: null,
        status: 'pending'
      };
    } else {
      const matchScore = scores[match.id];
      const homeScore = matchScore?.homeScore !== undefined ? matchScore.homeScore : (match.homeScore !== null ? match.homeScore.toString() : '');
      const awayScore = matchScore?.awayScore !== undefined ? matchScore.awayScore : (match.awayScore !== null ? match.awayScore.toString() : '');

      if (homeScore === '' || awayScore === '') {
        alert('Por favor completa ambos marcadores antes de guardar.');
        setSavingId(null);
        return;
      }

      payload = {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: 'played'
      };
    }

    const success = await onUpdateMatch(match.id, payload);
    if (success && !isReset) {
      // Limpiar input local
      setScores(prev => {
        const copy = { ...prev };
        delete copy[match.id];
        return copy;
      });
    }
    setSavingId(null);
  };

  return (
    <div className="card animate-fade">
      <div className="card-title">
        <span>⚙️</span> Panel de Administración
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Como creador de la sala, puedes simular o cargar los resultados reales del Mundial 2026 aquí.
        Al guardar, todos los puntos de la sala se recalcularán de forma inmediata.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {matches.map(match => {
          const matchScore = scores[match.id] || {};
          const homeVal = matchScore.homeScore !== undefined ? matchScore.homeScore : (match.homeScore !== null ? match.homeScore.toString() : '');
          const awayVal = matchScore.awayScore !== undefined ? matchScore.awayScore : (match.awayScore !== null ? match.awayScore.toString() : '');
          const isPlayed = match.status === 'played';

          return (
            <div 
              key={match.id} 
              className="match-card"
              style={{ 
                gridTemplateColumns: '1.2fr 180px 1.2fr 180px',
                borderLeft: isPlayed ? '4px solid var(--primary)' : '4px solid var(--text-dark)'
              }}
            >
              {/* Equipo Local */}
              <div className="match-team home">
                <span>{match.homeTeam}</span>
                <span className="team-flag">{getFlag(match.homeTeam)}</span>
              </div>

              {/* Inputs de goles reales */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="score-input"
                  value={homeVal}
                  onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
                  placeholder="-"
                  maxLength="2"
                  disabled={isPlayed}
                  style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}
                />
                <span className="score-divider">:</span>
                <input
                  type="text"
                  className="score-input"
                  value={awayVal}
                  onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
                  placeholder="-"
                  maxLength="2"
                  disabled={isPlayed}
                  style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}
                />
              </div>

              {/* Equipo Visitante */}
              <div className="match-team away">
                <span className="team-flag">{getFlag(match.awayTeam)}</span>
                <span>{match.awayTeam}</span>
              </div>

              {/* Acciones del Admin */}
              <div className="admin-actions">
                {isPlayed ? (
                  <button
                    onClick={() => handleSave(match, true)}
                    className="btn btn-secondary btn-danger"
                    disabled={savingId === match.id}
                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                  >
                    {savingId === match.id ? 'Cargando...' : '🔄 Resetear'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSave(match, false)}
                    className="btn btn-primary"
                    disabled={savingId === match.id}
                    style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                  >
                    {savingId === match.id ? 'Guardando...' : '💾 Cargar Real'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
