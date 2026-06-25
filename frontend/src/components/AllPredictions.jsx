import React from 'react';
import { getFlag } from './PredictForm';

export default function AllPredictions({ matches, participants, currentUserId }) {
  // Obtener nombre corto para el header (ej. "Arg vs Per")
  const getMatchShortName = (match) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.2rem', fontSize: '1.1rem' }}>
          <span>{getFlag(match.homeTeam)}</span>
          <span style={{ fontSize: '0.75rem', alignSelf: 'center', opacity: 0.5 }}>vs</span>
          <span>{getFlag(match.awayTeam)}</span>
        </div>
        <span style={{ fontWeight: '500', opacity: 0.8 }}>
          {match.homeTeam.substring(0, 3).toUpperCase()}-{match.awayTeam.substring(0, 3).toUpperCase()}
        </span>
      </div>
    );
  };

  // Determinar color de celda según puntos
  const getCellClassName = (match, pred) => {
    if (match.status !== 'played' || !pred || pred.homeScore === null || pred.awayScore === null) {
      return '';
    }

    const predHome = parseInt(pred.homeScore);
    const predAway = parseInt(pred.awayScore);
    const actHome = match.homeScore;
    const actAway = match.awayScore;

    if (predHome === actHome && predAway === actAway) {
      return 'exact-cell'; // Se le darán estilos en inline-styles o CSS
    }

    const predDiff = predHome - predAway;
    const actDiff = actHome - actAway;

    if ((predDiff > 0 && actDiff > 0) || (predDiff < 0 && actDiff < 0) || (predDiff === 0 && actDiff === 0)) {
      return 'outcome-cell';
    }

    return 'incorrect-cell';
  };

  const getCellStyles = (match, pred) => {
    if (match.status !== 'played' || !pred || pred.homeScore === null || pred.awayScore === null) {
      return {};
    }

    const predHome = parseInt(pred.homeScore);
    const predAway = parseInt(pred.awayScore);
    const actHome = match.homeScore;
    const actAway = match.awayScore;

    if (predHome === actHome && predAway === actAway) {
      return { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)', border: '1px solid rgba(16, 185, 129, 0.25)' };
    }

    const predDiff = predHome - predAway;
    const actDiff = actHome - actAway;

    if ((predDiff > 0 && actDiff > 0) || (predDiff < 0 && actDiff < 0) || (predDiff === 0 && actDiff === 0)) {
      return { background: 'rgba(59, 130, 246, 0.15)', color: 'var(--info)', border: '1px solid rgba(59, 130, 246, 0.25)' };
    }

    return { background: 'rgba(239, 68, 68, 0.05)', color: 'rgba(239, 68, 68, 0.7)', border: '1px solid rgba(239, 68, 68, 0.15)' };
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.4)' }}></span>
          <span>Acierto Exacto (3 pts)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.4)' }}></span>
          <span>Acierto Resultado (1 pt)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}></span>
          <span>Fallo (0 pts)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>🔒 Pronósticos de futuros partidos ocultos hasta su inicio.</span>
        </div>
      </div>

      <div className="matrix-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="user-th" style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 5, borderRight: '1px solid var(--card-border)', minWidth: '150px' }}>
                Participante
              </th>
              {matches.map(match => (
                <th key={match.id} title={`${match.homeTeam} vs ${match.awayTeam} (${match.group})`}>
                  {getMatchShortName(match)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map(user => {
              const isCurrentUser = user.id === currentUserId;

              return (
                <tr key={user.id} style={{ background: isCurrentUser ? 'rgba(6, 182, 212, 0.04)' : '' }}>
                  <td className="user-td" style={{ position: 'sticky', left: 0, background: isCurrentUser ? '#151e2f' : '#101624', zIndex: 4, borderRight: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {user.name}
                      {isCurrentUser && <span className="current-user-tag" style={{ scale: '0.9' }}>Tú</span>}
                    </div>
                  </td>
                  {matches.map(match => {
                    const pred = user.predictions[match.id];
                    const isHidden = pred && pred.hidden;

                    let content = '-';
                    let styles = {};

                    if (isHidden) {
                      content = <span className="pred-cell-locked">🔒</span>;
                    } else if (pred && pred.homeScore !== null && pred.awayScore !== null) {
                      content = `${pred.homeScore} - ${pred.awayScore}`;
                      styles = getCellStyles(match, pred);
                    }

                    return (
                      <td key={match.id}>
                        <span 
                          className="pred-cell-val" 
                          style={{ 
                            ...styles,
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.45rem',
                          }}
                        >
                          {content}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
