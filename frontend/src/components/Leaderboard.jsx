import React from 'react';

export default function Leaderboard({ participants, currentUserId }) {
  return (
    <div className="table-container animate-fade">
      <table className="table-posiciones">
        <thead>
          <tr>
            <th style={{ width: '60px', textAlign: 'center' }}>Pos</th>
            <th>Participante</th>
            <th style={{ textAlign: 'center' }}>Predichos</th>
            <th style={{ textAlign: 'center' }}>Exactos (3pts)</th>
            <th style={{ textAlign: 'center' }}>Ganador/Empate (1pt)</th>
            <th style={{ textAlign: 'center', fontWeight: 'bold' }}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {participants.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Nadie se ha unido a esta sala todavía. ¡Invita a tus amigos!
              </td>
            </tr>
          ) : (
            participants.map((user, index) => {
              const pos = index + 1;
              let posClass = 'pos-other';
              if (pos === 1) posClass = 'pos-1';
              else if (pos === 2) posClass = 'pos-2';
              else if (pos === 3) posClass = 'pos-3';

              const isCurrentUser = user.id === currentUserId;

              return (
                <tr key={user.id} style={{ background: isCurrentUser ? 'rgba(6, 182, 212, 0.04)' : '' }}>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`pos-badge ${posClass}`}>{pos}</span>
                  </td>
                  <td>
                    <div className="user-name-cell">
                      {user.name}
                      {isCurrentUser && <span className="current-user-tag">Tú</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{user.predictedCount}</td>
                  <td style={{ textAlign: 'center', color: 'var(--primary)' }}>{user.exacts}</td>
                  <td style={{ textAlign: 'center', color: 'var(--secondary)' }}>{user.outcomes}</td>
                  <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '1.05rem' }}>
                    {user.points}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
